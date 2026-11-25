/**
 * SIGAP — Persistent & Vercel-Compatible Data Store
 * Menyimpan state secara lokal di file JSON (saat development/self-hosted)
 * dan fallback ke memory/tmp ketika dijalankan pada Vercel Serverless Read-Only FS.
 */

import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { initialSigapDatabase } from "./seed-data";
import {
  AuditLog,
  DEFAULT_CLINICAL_SCREENING_CRITERIA,
  SigapDatabase,
  User,
  UserRole,
} from "./types";

function resolveDataFilePath(): string {
  const p1 = path.join(process.cwd(), "sigap-db.json");
  const p2 = path.join(process.cwd(), "backend", "sigap-db.json");
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  if (fs.existsSync(path.join(process.cwd(), "backend"))) {
    return p2;
  }
  return p1;
}

const DATA_FILE_PATH = resolveDataFilePath();

declare global {
  // eslint-disable-next-line no-var
  var __SIGAP_MEM_DB__: SigapDatabase | undefined;
  // eslint-disable-next-line no-var
  var __SIGAP_CLEAN_VER__: string | undefined;
}

const CLEAN_DB_SCHEMA_VERSION = "clean-empty-v2";

export function getDb(): SigapDatabase {
  if (
    global.__SIGAP_MEM_DB__ &&
    global.__SIGAP_CLEAN_VER__ === CLEAN_DB_SCHEMA_VERSION
  ) {
    return global.__SIGAP_MEM_DB__;
  }

  const filePath = resolveDataFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as SigapDatabase;
      const hasLegacyDummy =
        parsed.patients?.some((p) => p.patient_id === "pat-001") ||
        parsed.admissions?.some((a) => a.admission_id === "adm-2026-001") ||
        parsed.master_catalog?.doctors?.some((d) => d.doctor_id === "doc-01");

      if (!hasLegacyDummy) {
        if (!parsed.master_catalog) {
          parsed.master_catalog = JSON.parse(
            JSON.stringify(initialSigapDatabase.master_catalog)
          );
        }
        if (
          !Array.isArray(parsed.master_catalog.clinical_screening_criteria) ||
          parsed.master_catalog.clinical_screening_criteria.length === 0
        ) {
          parsed.master_catalog.clinical_screening_criteria = JSON.parse(
            JSON.stringify(DEFAULT_CLINICAL_SCREENING_CRITERIA)
          );
        }
        if (!Array.isArray(parsed.patients)) parsed.patients = [];
        if (!Array.isArray(parsed.admissions)) parsed.admissions = [];
        if (!Array.isArray(parsed.audit_logs)) parsed.audit_logs = [];
        if (!parsed.system_settings) {
          parsed.system_settings = JSON.parse(
            JSON.stringify(initialSigapDatabase.system_settings)
          );
        }
        global.__SIGAP_MEM_DB__ = parsed;
        global.__SIGAP_CLEAN_VER__ = CLEAN_DB_SCHEMA_VERSION;
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }

  const cloned = JSON.parse(JSON.stringify(initialSigapDatabase)) as SigapDatabase;
  global.__SIGAP_MEM_DB__ = cloned;
  global.__SIGAP_CLEAN_VER__ = CLEAN_DB_SCHEMA_VERSION;
  saveDb(cloned);
  return cloned;
}

export const loadDb = getDb;

export function saveDb(db: SigapDatabase): void {
  global.__SIGAP_MEM_DB__ = db;
  const filePath = resolveDataFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // Di lingkungan Vercel Serverless, filesystem utama bersifat read-only;
    // penyimpanan di global memory tetap berjalan selama instance hidup.
  }
}

export function resetDbToSeed(): SigapDatabase {
  const cloned = JSON.parse(JSON.stringify(initialSigapDatabase)) as SigapDatabase;
  saveDb(cloned);
  return cloned;
}

export function appendAuditLog(
  db: SigapDatabase,
  params: {
    userId: string;
    entity: string;
    entityId: string;
    action: AuditLog["action"];
    changeSummary: string;
    protocolVersionRef?: string;
  }
): AuditLog {
  if (!Array.isArray(db.audit_logs)) {
    db.audit_logs = [];
  }
  const cleanId = (params.userId || "").trim().toLowerCase();
  const user: User =
    db.users.find(
      (u) =>
        u.user_id.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId
    ) ||
    db.users[0] || {
      user_id: "usr-admin",
      role_id: "ADMIN_RS",
      unit_id: "unit-vk",
      username: "admin",
      full_name: "Administrator SIGAP",
      title_credentials: "Admin RS",
      password_hash: "",
      active_status: true,
      created_at: new Date().toISOString(),
    };

  const entry: AuditLog = {
    audit_id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_id: user.user_id,
    user_name: user.full_name,
    user_role: user.role_id,
    entity: params.entity,
    entity_id: params.entityId,
    action: params.action,
    timestamp: new Date().toISOString(),
    change_summary: params.changeSummary,
    protocol_version_ref: params.protocolVersionRef,
  };
  db.audit_logs.unshift(entry);
  return entry;
}

/**
 * Validasi Kewenangan RBAC (SRS Bab 3 & NFR-02)
 * CATATAN PENTING BAB 3: Admin TI tidak otomatis berwenang mengubah aturan klinis.
 */
export function verifyRolePermission(
  db: SigapDatabase,
  userId: string,
  requiredPermission: string
): { allowed: boolean; user: User; reason?: string } {
  const cleanId = (userId || "").trim().toLowerCase();
  const user =
    db.users.find(
      (u) =>
        u.user_id.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId
    ) ||
    db.users[0] || {
      user_id: "usr-bidan",
      role_id: "BIDAN_PERAWAT",
      unit_id: "unit-vk",
      username: "bidan",
      full_name: "Bd. Pelaksana VK",
      title_credentials: "Bidan VK",
      password_hash: "",
      active_status: true,
      created_at: new Date().toISOString(),
    };

  const roleDef = db.roles.find((r) => r.role_id === user.role_id);

  if (!user.active_status) {
    return {
      allowed: false,
      user,
      reason: "Akun pengguna tidak aktif.",
    };
  }

  if (
    (requiredPermission === "PROTOCOL_WRITE" ||
      requiredPermission === "PROTOCOL_APPROVE") &&
    user.role_id !== "VALIDATOR_KLINIS"
  ) {
    appendAuditLog(db, {
      userId: user.user_id,
      entity: "clinical_protocols",
      entityId: "RBAC-GUARD",
      action: "BLOCKED_UNAUTHORIZED_ACTION",
      changeSummary: `Upaya perubahan aturan klinis oleh role ${user.role_id} (${user.full_name}) ditolak sistem sesuai SRS Bab 3 (hanya Validator Klinis yang berwenang).`,
    });
    saveDb(db);
    return {
      allowed: false,
      user,
      reason:
        "AKSES DITOLAK (SRS Bab 3): Perubahan tabel keputusan/aturan klinis hanya dapat dilakukan dan disetujui oleh Validator Klinis (Dokter Sp.OG / Bidan Senior). Admin TI atau role lain tidak berwenang mengubah aturan klinis.",
    };
  }

  // Khusus penulisan master pasien & admisi: izinkan BIDAN_PERAWAT, DOKTER, dan ADMIN_RS
  if (
    requiredPermission === "PATIENT_WRITE" ||
    requiredPermission === "PATIENT_READ" ||
    requiredPermission === "ADMISSION_WRITE" ||
    requiredPermission === "ADMISSION_READ"
  ) {
    if (
      user.role_id === "BIDAN_PERAWAT" ||
      user.role_id === "DOKTER" ||
      user.role_id === "ADMIN_RS"
    ) {
      return { allowed: true, user };
    }
  }

  const allowed = roleDef?.permissions.includes(requiredPermission) ?? false;
  if (!allowed) {
    return {
      allowed: false,
      user,
      reason: `Role ${user.role_id} (${roleDef?.name || user.role_id}) tidak memiliki kewenangan '${requiredPermission}'.`,
    };
  }

  return { allowed: true, user };
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "sigap_hospital_superapps_secret_jwt_key_2026_kemenkes";

export function resolveRequestUser(
  req: Request,
  db: SigapDatabase
): { userId: string; role: UserRole; user: User } {
  let targetId = "";

  // 1. Ekstrak dari Header Authorization Bearer JWT
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
      if (decoded && (decoded.userId || decoded.sub)) {
        targetId = String(decoded.userId || decoded.sub).trim().toLowerCase();
      }
    } catch {
      // Token tidak valid atau kedaluwarsa
    }
  }

  // 2. Fallback ke header x-user-id
  if (!targetId) {
    targetId = (req.headers.get("x-user-id") || "").trim().toLowerCase();
  }

  const user =
    db.users.find(
      (u) =>
        u.user_id.toLowerCase() === targetId ||
        u.username.toLowerCase() === targetId
    ) ||
    db.users[0] || {
      user_id: "usr-admin",
      role_id: "ADMIN_RS",
      unit_id: "unit-vk",
      username: "admin",
      full_name: "Administrator SIGAP",
      title_credentials: "Admin RS",
      password_hash: "",
      active_status: true,
      created_at: new Date().toISOString(),
    };
  return {
    userId: user.user_id,
    role: user.role_id,
    user,
  };
}

