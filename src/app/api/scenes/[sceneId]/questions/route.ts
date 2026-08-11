import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createQuestionSchema } from "@/lib/validation/schemas";

export async function POST(
  req: Request,
  { params }: { params: { sceneId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const scene = await db.scene.findUnique({
      where: { id: params.sceneId },
      include: {
        formVersion: { include: { form: true } },
        questions: true,
      },
    });

    if (!scene || scene.formVersion.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Scene not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createQuestionSchema.parse(body);

    const position = parsed.position !== undefined ? parsed.position : scene.questions.length;

    const question = await db.$transaction(async (tx) => {
      const createdQ = await tx.question.create({
        data: {
          sceneId: params.sceneId,
          position,
          type: parsed.type,
          label: parsed.label,
          description: parsed.description,
          required: parsed.required,
          validationJson: parsed.validation ? JSON.stringify(parsed.validation) : null,
          evaluationConfigJson: parsed.evaluationConfig ? JSON.stringify(parsed.evaluationConfig) : null,
        },
      });

      if (parsed.options && parsed.options.length > 0) {
        await tx.questionOption.createMany({
          data: parsed.options.map((opt, idx) => ({
            questionId: createdQ.id,
            label: opt.label,
            value: opt.value || opt.label.toLowerCase().replace(/\s+/g, "_"),
            position: opt.position !== undefined ? opt.position : idx,
          })),
        });
      }

      return tx.question.findUnique({
        where: { id: createdQ.id },
        include: { options: true },
      });
    });

    return NextResponse.json({ success: true, data: question });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
