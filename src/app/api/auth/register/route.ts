import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, workspaceName } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Email, password, and name are required." } },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "User with this email already exists." } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        workspaces: {
          create: {
            name: workspaceName || `${name}'s Workspace`,
            slug: `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`,
          },
        },
      },
      include: {
        workspaces: true,
      },
    });

    const workspace = user.workspaces[0];
    await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    // Set auth cookie
    cookies().set("ef_auth_token", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        workspace: { id: workspace.id, name: workspace.name },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
