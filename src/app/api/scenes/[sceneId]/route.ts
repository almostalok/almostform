import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateSceneSchema } from "@/lib/validation/schemas";

export async function PATCH(
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
      include: { formVersion: { include: { form: true } } },
    });

    if (!scene || scene.formVersion.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Scene not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSceneSchema.parse(body);

    const updated = await db.scene.update({
      where: { id: params.sceneId },
      data: parsed,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}

export async function DELETE(
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
      include: { formVersion: { include: { form: true } } },
    });

    if (!scene || scene.formVersion.form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Scene not found" } }, { status: 404 });
    }

    await db.scene.delete({ where: { id: params.sceneId } });
    return NextResponse.json({ success: true, message: "Scene deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
