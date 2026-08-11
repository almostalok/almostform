import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateQuestionSchema } from "@/lib/validation/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const question = await db.question.findUnique({
      where: { id: params.questionId },
      include: { scene: { include: { formVersion: { include: { form: true } } } } },
    });

    if (!question || question.scene.formVersion.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Question not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateQuestionSchema.parse(body);

    const updated = await db.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: params.questionId },
        data: {
          label: parsed.label,
          description: parsed.description,
          required: parsed.required,
          position: parsed.position,
          validationJson: parsed.validation ? JSON.stringify(parsed.validation) : undefined,
          evaluationConfigJson: parsed.evaluationConfig ? JSON.stringify(parsed.evaluationConfig) : undefined,
        },
      });

      if (parsed.options) {
        await tx.questionOption.deleteMany({ where: { questionId: params.questionId } });
        if (parsed.options.length > 0) {
          await tx.questionOption.createMany({
            data: parsed.options.map((opt, idx) => ({
              questionId: params.questionId,
              label: opt.label,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, "_"),
              position: opt.position !== undefined ? opt.position : idx,
            })),
          });
        }
      }

      return tx.question.findUnique({
        where: { id: params.questionId },
        include: { options: true },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const question = await db.question.findUnique({
      where: { id: params.questionId },
      include: { scene: { include: { formVersion: { include: { form: true } } } } },
    });

    if (!question || question.scene.formVersion.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Question not found" } }, { status: 404 });
    }

    await db.question.delete({ where: { id: params.questionId } });
    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
