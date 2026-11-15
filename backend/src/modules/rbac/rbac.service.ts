import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { UserRole } from "@/lib/types";

export class RbacService {
  /**
   * Mengambil data lengkap 3 Kolom RBAC: Daftar User, Role Catalog, dan Struktur App Menu
   */
  async getRbacOverview() {
    const db = loadDb();
    return {
      users: db.users,
      roles: db.roles,
      units: db.units,
    };
  }

  /**
   * Update Role seorang Pengguna (Kolom 2)
   */
  async updateUserRole(adminUserId: string, targetUserId: string, newRoleId: UserRole) {
    const db = loadDb();
    const target = db.users.find((u) => u.user_id === targetUserId);
    if (!target) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    const oldRole = target.role_id;
    target.role_id = newRoleId;

    appendAuditLog(db, {
      userId: adminUserId,
      entity: "users",
      entityId: target.user_id,
      action: "UPDATE",
      changeSummary: `Role akun @${target.username} diubah: ${oldRole} -> ${newRoleId}.`,
    });
    saveDb(db);

    return target;
  }

  /**
   * Update Izin Menu untuk Role Tertentu (Kolom 3)
   */
  async updateRolePermissions(adminUserId: string, roleId: string, permissions: string[]) {
    const db = loadDb();
    const role = db.roles.find((r) => r.role_id === roleId);
    if (!role) {
      throw new Error("Role tidak ditemukan.");
    }

    role.permissions = permissions;
    appendAuditLog(db, {
      userId: adminUserId,
      entity: "roles",
      entityId: role.role_id,
      action: "UPDATE",
      changeSummary: `Memperbarui hak akses menu untuk role ${role.name} (${role.role_id}).`,
    });
    saveDb(db);

    return role;
  }
}

export const rbacService = new RbacService();

