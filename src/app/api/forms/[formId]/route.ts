import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateFormSchema } from "@/lib/validation/schemas";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";

export async function GET(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const schema = await getFormRuntimeSchema(params.formId);
    if (!schema) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    if (schema.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "No workspace access" } }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: schema });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const form = await db.form.findUnique({ where: { id: params.formId } });
    if (!form || form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateFormSchema.parse(body);

    const updated = await db.form.update({
      where: { id: params.formId },
      data: parsed,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const form = await db.form.findUnique({ where: { id: params.formId } });
    if (!form || form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    await db.form.delete({ where: { id: params.formId } });
    return NextResponse.json({ success: true, message: "Form deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
