import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ef_auth_token")?.value;

    if (token) {
      const user = await db.user.findFirst({
        where: { id: token },
        include: {
          workspaces: true,
          workspaceMembers: { include: { workspace: true } },
        },
      });

      if (user) {
        const workspace = user.workspaces[0] || user.workspaceMembers[0]?.workspace;
        if (workspace) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
          };
        }
      }
    }

    // Fallback for development / seed creator
    const defaultUser = await db.user.findFirst({
      include: { workspaces: true },
    });

    if (defaultUser && defaultUser.workspaces.length > 0) {
      return {
        id: defaultUser.id,
        email: defaultUser.email,
        name: defaultUser.name,
        workspaceId: defaultUser.workspaces[0].id,
        workspaceName: defaultUser.workspaces[0].name,
      };
    }

    return null;
  } catch (error) {
    console.error("Auth session error:", error);
    return null;
  }
}

export async function requireWorkspaceAccess(workspaceId: string): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }
  if (user.workspaceId !== workspaceId) {
    throw new Error("FORBIDDEN: You do not have access to this workspace.");
  }
  return user;
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}
