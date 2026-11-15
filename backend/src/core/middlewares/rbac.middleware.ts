import { loadDb } from "@/lib/store";
import { ForbiddenError } from "@/core/errors/app-error";

/**
 * Middleware untuk validasi hak akses RBAC (Role & Permission)
 */
export function checkPermission(userId: string, requiredPermission: string) {
  const db = loadDb();
  const user = db.users.find((u) => u.user_id === userId);
  if (!user) {
    throw new ForbiddenError("Pengguna tidak ditemukan dalam sistem.");
  }

  // Admin RS dan Admin TI memiliki wewenang penuh
  if (user.role_id === "ADMIN_RS" || user.role_id === "ADMIN_TI") {
    return true;
  }

  const role = db.roles.find((r) => r.role_id === user.role_id);
  const permissions = role?.permissions || [];

  if (!permissions.includes(requiredPermission)) {
    throw new ForbiddenError(
      `Role ${user.role_id} tidak memiliki izin '${requiredPermission}' untuk aksi ini.`
    );
  }

  return true;
}

