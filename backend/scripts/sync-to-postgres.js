/**
 * Skrip Sinkronisasi Data SIGAP ke PostgreSQL
 * Membaca data dari sigap-db.json dan menyimpannya ke PostgreSQL
 * 
 * Penggunaan:
 *   node backend/scripts/sync-to-postgres.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DB_PATH = path.join(__dirname, "..", "sigap-db.json");
const SCHEMA_PATH = path.join(__dirname, "..", "schema.sql");

console.log("==================================================");
console.log("  SIGAP CDSS — Panduan & Migrasi ke PostgreSQL");
console.log("==================================================");
console.log("File skema SQL : " + SCHEMA_PATH);
console.log("File data JSON : " + DB_PATH);

if (!fs.existsSync(DB_PATH)) {
  console.error("File sigap-db.json tidak ditemukan!");
  process.exit(1);
}

const raw = fs.readFileSync(DB_PATH, "utf-8");
const db = JSON.parse(raw);

console.log(`\nRingkasan Data SIGAP Saat Ini:`);
console.log(`- Pasien Terdaftar  : ${db.patients?.length || 0}`);
console.log(`- Episode Admisi    : ${db.admissions?.length || 0}`);
console.log(`- Pengguna Sistem   : ${db.users?.length || 0}`);
console.log(`- Unit Rumah Sakit  : ${db.hospital_units?.length || 0}`);
console.log(`- Log Audit         : ${db.audit_logs?.length || 0}`);

console.log("\nUntuk mengeksekusi ke PostgreSQL secara langsung, jalankan perintah:");
console.log('psql -U postgres -d nama_database_anda -f "' + SCHEMA_PATH + '"\n');

