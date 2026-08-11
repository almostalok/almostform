import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createSceneSchema } from "@/lib/validation/schemas";

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
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!form || form.workspaceId !== user.workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Form not found" } }, { status: 404 });
    }

    const activeVersion = form.versions[0];
    if (!activeVersion) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "No form version found" } }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createSceneSchema.parse(body);

    const existingScenes = await db.scene.findMany({
      where: { formVersionId: activeVersion.id },
      orderBy: { position: "asc" },
    });

    const position = parsed.position !== undefined ? parsed.position : existingScenes.length;

    const scene = await db.scene.create({
      data: {
        formVersionId: activeVersion.id,
        position,
        type: parsed.type,
        title: parsed.title || "New Scene",
        description: parsed.description,
      },
    });

    return NextResponse.json({ success: true, data: scene });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
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

    const body = await req.json();
    const { sceneOrders } = body as { sceneOrders: { id: string; position: number }[] };

    if (!Array.isArray(sceneOrders)) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "sceneOrders array required" } }, { status: 400 });
    }

    await db.$transaction(
      sceneOrders.map((item) =>
        db.scene.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );

    return NextResponse.json({ success: true, message: "Scenes reordered successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
