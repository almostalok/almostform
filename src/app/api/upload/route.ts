import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/storage/upload";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No file provided" } },
        { status: 400 }
      );
    }

    const savedFile = await saveUploadedFile(file, "respondent");

    return NextResponse.json({ success: true, data: savedFile });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: error.message } },
      { status: 400 }
    );
  }
}
