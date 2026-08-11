import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";

export async function POST(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const currentSchema = await getFormRuntimeSchema(params.formId);
    if (!currentSchema) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    if (currentSchema.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "No workspace access" } }, { status: 403 });
    }

    // Publish Validation checks (Section 59)
    const validationErrors: string[] = [];

    const questionScenes = currentSchema.scenes.filter((s) => s.type === "QUESTION");
    if (questionScenes.length === 0) {
      validationErrors.push("Form must have at least one question scene.");
    }

    let totalWeight = 0;
    let hasScorableQuestions = false;

    for (const scene of currentSchema.scenes) {
      for (const q of scene.questions) {
        if (!q.label || q.label.trim() === "") {
          validationErrors.push(`Question in scene "${scene.content.title || scene.position}" has an empty label.`);
        }

        if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
          if (!q.options || q.options.length === 0) {
            validationErrors.push(`Choice question "${q.label}" must have at least one option.`);
          }
        }

        if (q.evaluationConfig && q.evaluationConfig.enabled) {
          hasScorableQuestions = true;
          totalWeight += q.evaluationConfig.weight || 0;
        }
      }
    }

    if (currentSchema.metadata.type === "HIRING" && hasScorableQuestions) {
      if (Math.abs(totalWeight - 100) > 0.1) {
        validationErrors.push(`Hiring form scoring evaluation weights must sum to exactly 100% (Current sum: ${totalWeight}%).`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PUBLISH_VALIDATION_FAILED",
            message: "Form cannot be published due to validation errors.",
            details: validationErrors,
          },
        },
        { status: 400 }
      );
    }

    // Create Immutable Version Snapshot
    const form = await db.form.findUnique({ where: { id: params.formId } });
    const latestVersion = await db.formVersion.findFirst({
      where: { formId: params.formId },
      orderBy: { versionNumber: "desc" },
    });

    const nextVersionNum = (latestVersion?.versionNumber || 0) + 1;

    const publishedSchema = {
      ...currentSchema,
      versionNumber: nextVersionNum,
      metadata: {
        ...currentSchema.metadata,
        status: "PUBLISHED" as const,
      },
      settings: {
        responseCollectionEnabled: true,
      },
    };

    const publishedVersion = await db.$transaction(async (tx) => {
      const newVer = await tx.formVersion.create({
        data: {
          formId: params.formId,
          versionNumber: nextVersionNum,
          schemaJson: JSON.stringify(publishedSchema),
        },
      });

      await tx.form.update({
        where: { id: params.formId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          currentVersionId: newVer.id,
        },
      });

      return newVer;
    });

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/f/${currentSchema.metadata.slug}`;

    return NextResponse.json({
      success: true,
      data: {
        versionId: publishedVersion.id,
        versionNumber: publishedVersion.versionNumber,
        status: "PUBLISHED",
        publicUrl,
        slug: currentSchema.metadata.slug,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
