import { NextResponse } from "next/server";
import { getFormRuntimeSchema } from "@/lib/form-engine/schema-converter";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const schema = await getFormRuntimeSchema(params.slug);

    if (!schema) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Form not found" } },
        { status: 404 }
      );
    }

    if (schema.metadata.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: { code: "FORM_NOT_PUBLISHED", message: "This form is not currently published." } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: schema });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
