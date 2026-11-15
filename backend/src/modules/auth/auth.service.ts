import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { User, UserRole } from "@/lib/types";

export class AuthService {
  /**
   * Login user dengan dukungan alias admin
   */
  async login(username: string, password?: string, isAdminPortal?: boolean) {
    const db = loadDb();
    const rawUsername = String(username || "").trim().toLowerCase();

    // Mapping alias username untuk kemudahan
    const USERNAME_ALIASES: Record<string, string> = {
      "admin.mutu": "admin.rs",
      "admin.rs": "admin.rs",
      "admin.ti": "admin.ti",
      "admin.it": "admin.ti",
      "admin": "admin.rs",
      "administrator": "admin.ti",
      "dr.sari": "dr.sari",
      "bidan.ratna": "bidan.ratna",
      "validator.hendra": "validator.hendra",
      "tri.ambar": "tri.ambar",
      "budhi.herutomo": "budhi.herutomo",
    };

    const resolvedUsername = USERNAME_ALIASES[rawUsername] || rawUsername;
    const user = db.users.find((u) => u.username.toLowerCase() === resolvedUsername);

    if (!user) {
      throw new Error("Akun pengguna tidak ditemukan. Periksa kembali username yang Anda masukkan.");
    }

    if (isAdminPortal && user.role_id !== "ADMIN_RS" && user.role_id !== "ADMIN_TI") {
      throw new Error("AKSES DITOLAK: Portal ini khusus untuk Administrator (Admin RS & Admin TI).");
    }

    if (!user.active_status) {
      throw new Error("AKSES DITOLAK: Akun Anda sedang berstatus NONAKTIF. Hubungi Administrator.");
    }

    // Validasi Password simulasi
    const allowedPasswords = ["sigap2026", "admin2026", "admin", "admin123"];
    if (user.password_hash.startsWith("pass:")) {
      allowedPasswords.push(user.password_hash.slice(5));
    }

    if (password && !allowedPasswords.includes(password)) {
      throw new Error("Kata sandi (password) tidak sesuai. Silakan periksa kembali.");
    }

    const token = `sigap-jwt-${user.user_id}-${Date.now()}`;
    const roleDef = db.roles.find((r) => r.role_id === user.role_id);
    const unit = db.units.find((un) => un.unit_id === user.unit_id);

    appendAuditLog(db, {
      userId: user.user_id,
      entity: "users",
      entityId: user.user_id,
      action: "CREATE",
      changeSummary: `Login berhasil: ${user.full_name} (@${user.username}) masuk sebagai role ${user.role_id}.`,
    });
    saveDb(db);

    return {
      token,
      user,
      role: roleDef,
      unit,
      permissions: roleDef?.permissions || [],
    };
  }

  /**
   * Tambah Akun Pengguna Baru
   */
  async createUser(creatorId: string, payload: {
    username: string;
    full_name: string;
    role_id: UserRole;
    unit_id?: string;
    title_credentials?: string;
    password?: string;
  }) {
    const db = loadDb();
    const username = payload.username.trim().toLowerCase();

    if (db.users.some((u) => u.username.toLowerCase() === username)) {
      throw new Error(`Username '${username}' sudah digunakan oleh pengguna lain.`);
    }

    const newUser: User = {
      user_id: `usr-${Date.now()}`,
      role_id: payload.role_id,
      unit_id: payload.unit_id || "unit-vk",
      username,
      full_name: payload.full_name.trim(),
      title_credentials: payload.title_credentials || "Tenaga Kesehatan",
      password_hash: `pass:${payload.password || "sigap2026"}`,
      active_status: true,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    appendAuditLog(db, {
      userId: creatorId,
      entity: "users",
      entityId: newUser.user_id,
      action: "CREATE",
      changeSummary: `Menambahkan akun baru @${newUser.username} (${newUser.full_name}) dengan role ${newUser.role_id}.`,
    });
    saveDb(db);

    return newUser;
  }
}

export const authService = new AuthService();

