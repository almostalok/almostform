import fs from "fs";
import path from "path";
import { FILE_LIMITS } from "@/lib/constants";
import { FileAnswerValue } from "@/types/form-schema";

export async function saveUploadedFile(
  file: File,
  customPrefix: string = "upload"
): Promise<FileAnswerValue> {
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds the limit of ${FILE_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  const fileId = `${customPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ext = path.extname(file.name) || ".bin";
  const fileName = `${fileId}${ext}`;

  // Use local public uploads folder for local $0 development
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const publicUrl = `/uploads/${fileName}`;

  return {
    fileId,
    storagePath: `uploads/${fileName}`,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    url: publicUrl,
  };
}
