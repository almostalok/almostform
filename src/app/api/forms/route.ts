import { NextResponse } from "next/server";
import { getCurrentUser, requireWorkspaceAccess } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createFormSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const forms = await db.form.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: forms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createFormSchema.parse(body);

    const slug = parsed.slug || `${parsed.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}-${Math.random().toString(36).substring(2, 8)}`;

    const form = await db.$transaction(async (tx) => {
      const createdForm = await tx.form.create({
        data: {
          workspaceId: user.workspaceId,
          title: parsed.title,
          description: parsed.description,
          type: parsed.type,
          slug,
          status: "DRAFT",
        },
      });

      const initialVersion = await tx.formVersion.create({
        data: {
          formId: createdForm.id,
          versionNumber: 1,
          schemaJson: "",
        },
      });

      // Default Intro Scene
      await tx.scene.create({
        data: {
          formVersionId: initialVersion.id,
          position: 0,
          type: "INTRO",
          title: parsed.title,
          description: parsed.description || "Welcome! Please take a few moments to complete this form.",
        },
      });

      // Default Question Scene
      await tx.scene.create({
        data: {
          formVersionId: initialVersion.id,
          position: 1,
          type: "QUESTION",
          title: "Personal Information",
          description: "Please share your basic contact details.",
        },
      });

      // Default Ending Scene
      await tx.scene.create({
        data: {
          formVersionId: initialVersion.id,
          position: 2,
          type: "ENDING",
          title: "Thank You!",
          description: "Your submission has been recorded.",
        },
      });

      await tx.form.update({
        where: { id: createdForm.id },
        data: { currentVersionId: initialVersion.id },
      });

      return createdForm;
    });

    return NextResponse.json({ success: true, data: form });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
