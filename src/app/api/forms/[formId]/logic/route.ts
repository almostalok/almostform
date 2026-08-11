import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createLogicRuleSchema } from "@/lib/validation/schemas";

export async function POST(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const form = await db.form.findUnique({
      where: { id: params.formId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if (!form || form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    const activeVersion = form.versions[0];

    const body = await req.json();
    const parsed = createLogicRuleSchema.parse(body);

    const rule = await db.logicRule.create({
      data: {
        formVersionId: activeVersion.id,
        sourceQuestionId: parsed.sourceQuestionId,
        operator: parsed.operator,
        comparisonValue: parsed.comparisonValue,
        action: parsed.action,
        targetSceneId: parsed.targetSceneId,
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const url = new URL(req.url);
    const ruleId = url.searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "ruleId is required" } }, { status: 400 });
    }

    await db.logicRule.delete({ where: { id: ruleId } });
    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
