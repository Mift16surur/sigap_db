import { NextRequest } from "next/server";
import { loadDb } from "@/lib/store";
import { UnauthorizedError } from "@/core/errors/app-error";

export interface AuthenticatedUser {
  userId: string;
  roleId: string;
  username: string;
}

/**
 * Middleware untuk validasi header / token request
 */
export function verifyAuthHeader(req: NextRequest): AuthenticatedUser {
  const userId = req.headers.get("x-user-id");
  const authHeader = req.headers.get("authorization");

  const db = loadDb();

  // Mode 1: Berdasarkan x-user-id
  if (userId) {
    const user = db.users.find((u) => u.user_id === userId);
    if (user && user.active_status) {
      return { userId: user.user_id, roleId: user.role_id, username: user.username };
    }
  }

  // Mode 2: Berdasarkan Bearer Token simulasi
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const matchedUser = db.users.find((u) => `sim-token-${u.user_id}` === token || token === "admin-token");
    if (matchedUser) {
      return { userId: matchedUser.user_id, roleId: matchedUser.role_id, username: matchedUser.username };
    }
  }

  // Default fallback untuk lingkungan development simulasi
  const defaultUser = db.users[0];
  return {
    userId: defaultUser?.user_id || "usr-admin-rs",
    roleId: defaultUser?.role_id || "ADMIN_RS",
    username: defaultUser?.username || "admin.rs",
  };
}

