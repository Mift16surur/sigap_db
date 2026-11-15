/**
 * SIGAP PostgreSQL Data Migration & Password Encryption Script
 * Migrates existing sigap-db.json data into PostgreSQL database via Prisma ORM
 * and converts plain-text/simulated passwords into strong Bcrypt hashes.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("=== MEMULAI MIGRASI DATA SIGAP KE POSTGRESQL ===");

  const jsonPath = path.join(__dirname, "..", "sigap-db.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File sigap-db.json tidak ditemukan di: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const db = JSON.parse(raw);

  // 1. Migrasi Roles
  console.log(`\n[1/7] Migrasi Roles (${db.roles?.length || 0} data)...`);
  for (const r of db.roles || []) {
    await prisma.role.upsert({
      where: { role_id: r.role_id },
      update: {
        name: r.name,
        description: r.description || null,
        permissions: r.permissions || [],
      },
      create: {
        role_id: r.role_id,
        name: r.name,
        description: r.description || null,
        permissions: r.permissions || [],
      },
    });
  }
  console.log("✓ Roles berhasil dimigrasi.");

  // 2. Migrasi Hospital Units
  console.log(`\n[2/7] Migrasi Hospital Units (${db.units?.length || 0} data)...`);
  for (const u of db.units || []) {
    await prisma.hospitalUnit.upsert({
      where: { unit_id: u.unit_id },
      update: {
        code: u.code,
        name: u.name,
        type: u.type,
        active_status: u.active_status !== false,
      },
      create: {
        unit_id: u.unit_id,
        code: u.code,
        name: u.name,
        type: u.type,
        active_status: u.active_status !== false,
      },
    });
  }
  console.log("✓ Hospital Units berhasil dimigrasi.");

  // 3. Migrasi Users dengan Hashing Bcrypt
  console.log(`\n[3/7] Migrasi Users & Enkripsi Bcrypt (${db.users?.length || 0} data)...`);
  const saltRounds = 10;
  for (const u of db.users || []) {
    // Ambil plain password
    let plainPass = "sigap2026";
    if (u.password_hash) {
      if (u.password_hash.startsWith("pass:")) {
        plainPass = u.password_hash.slice(5);
      } else if (u.password_hash.startsWith("$2a$") || u.password_hash.startsWith("$2b$")) {
        // Sudah berformat bcrypt
        plainPass = "";
      } else {
        plainPass = u.password_hash;
      }
    }

    let secureHash = u.password_hash;
    if (plainPass) {
      secureHash = await bcrypt.hash(plainPass, saltRounds);
    }

    await prisma.user.upsert({
      where: { user_id: u.user_id },
      update: {
        username: u.username,
        full_name: u.full_name,
        title_credentials: u.title_credentials || null,
        role_id: u.role_id,
        unit_id: u.unit_id || null,
        password_hash: secureHash,
        active_status: u.active_status !== false,
        created_at: u.created_at ? new Date(u.created_at) : new Date(),
      },
      create: {
        user_id: u.user_id,
        username: u.username,
        full_name: u.full_name,
        title_credentials: u.title_credentials || null,
        role_id: u.role_id,
        unit_id: u.unit_id || null,
        password_hash: secureHash,
        active_status: u.active_status !== false,
        created_at: u.created_at ? new Date(u.created_at) : new Date(),
      },
    });

    // Simpan juga hash bcrypt ke file json agar sinkron
    u.password_hash = secureHash;
    console.log(`  - Akun @${u.username} (${u.full_name}): Password terenkripsi Bcrypt.`);
  }
  fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2), "utf-8");
  console.log("✓ Users & Password Bcrypt berhasil dimigrasi.");

  // 4. Migrasi Patients
  console.log(`\n[4/7] Migrasi Patients (${db.patients?.length || 0} data)...`);
  for (const p of db.patients || []) {
    await prisma.patient.upsert({
      where: { patient_id: p.patient_id },
      update: {
        patient_code: p.patient_code || p.patient_id,
        mrn: p.mrn,
        full_name: p.full_name,
        is_anonymous_mode: Boolean(p.is_anonymous_mode),
        tanggal_lahir: p.tanggal_lahir ? new Date(p.tanggal_lahir) : null,
        age_years: p.age_years || 25,
        nik_masked: p.nik_masked || null,
        alamat_singkat: p.alamat_singkat || null,
        kontak_darurat: p.kontak_darurat || null,
        created_at: p.created_at ? new Date(p.created_at) : new Date(),
      },
      create: {
        patient_id: p.patient_id,
        patient_code: p.patient_code || p.patient_id,
        mrn: p.mrn,
        full_name: p.full_name,
        is_anonymous_mode: Boolean(p.is_anonymous_mode),
        tanggal_lahir: p.tanggal_lahir ? new Date(p.tanggal_lahir) : null,
        age_years: p.age_years || 25,
        nik_masked: p.nik_masked || null,
        alamat_singkat: p.alamat_singkat || null,
        kontak_darurat: p.kontak_darurat || null,
        created_at: p.created_at ? new Date(p.created_at) : new Date(),
      },
    });
  }
  console.log("✓ Patients berhasil dimigrasi.");

  // 5. Migrasi Admissions
  console.log(`\n[5/7] Migrasi Admissions (${db.admissions?.length || 0} data)...`);
  for (const a of db.admissions || []) {
    // Pastikan patient ada
    const patientExists = await prisma.patient.findUnique({ where: { patient_id: a.patient_id } });
    if (!patientExists) {
      console.warn(`  ! Skip admission ${a.admission_id}: patient ${a.patient_id} tidak ditemukan.`);
      continue;
    }

    await prisma.admission.upsert({
      where: { admission_id: a.admission_id },
      update: {
        patient_id: a.patient_id,
        admission_code: a.admission_code || a.admission_id,
        admission_date: a.admission_date ? new Date(a.admission_date) : new Date(),
        usia_kehamilan_minggu: a.usia_kehamilan_minggu || 0,
        usia_kehamilan_hari: a.usia_kehamilan_hari || 0,
        jenis_admisi: a.jenis_admisi || "ADM_INPARTU",
        asal_rujukan: a.asal_rujukan || null,
        unit_id: a.unit_id || null,
        status: a.status || "ACTIVE",
        keluhan_utama: a.keluhan_utama || null,
        obstetric_history: a.obstetric_history || {},
        created_by: a.created_by || null,
        attending_doctor_id: a.attending_doctor_id || null,
        attending_doctor_name: a.attending_doctor_name || null,
        receiving_midwife_id: a.receiving_midwife_id || null,
        receiving_midwife_name: a.receiving_midwife_name || null,
        created_at: a.created_at ? new Date(a.created_at) : new Date(),
        updated_at: a.updated_at ? new Date(a.updated_at) : new Date(),
      },
      create: {
        admission_id: a.admission_id,
        patient_id: a.patient_id,
        admission_code: a.admission_code || a.admission_id,
        admission_date: a.admission_date ? new Date(a.admission_date) : new Date(),
        usia_kehamilan_minggu: a.usia_kehamilan_minggu || 0,
        usia_kehamilan_hari: a.usia_kehamilan_hari || 0,
        jenis_admisi: a.jenis_admisi || "ADM_INPARTU",
        asal_rujukan: a.asal_rujukan || null,
        unit_id: a.unit_id || null,
        status: a.status || "ACTIVE",
        keluhan_utama: a.keluhan_utama || null,
        obstetric_history: a.obstetric_history || {},
        created_by: a.created_by || null,
        attending_doctor_id: a.attending_doctor_id || null,
        attending_doctor_name: a.attending_doctor_name || null,
        receiving_midwife_id: a.receiving_midwife_id || null,
        receiving_midwife_name: a.receiving_midwife_name || null,
        created_at: a.created_at ? new Date(a.created_at) : new Date(),
        updated_at: a.updated_at ? new Date(a.updated_at) : new Date(),
      },
    });
  }
  console.log("✓ Admissions berhasil dimigrasi.");

  // 6. Migrasi Skrining PE & HPP
  console.log(`\n[6/7] Migrasi Skrining PE & HPP...`);
  let peCount = 0;
  for (const pe of db.pe_screenings || []) {
    const adm = await prisma.admission.findUnique({ where: { admission_id: pe.admission_id } });
    if (!adm) continue;
    await prisma.peScreening.upsert({
      where: { pe_screening_id: pe.pe_screening_id },
      update: {
        admission_id: pe.admission_id,
        screening_time: pe.screening_time ? new Date(pe.screening_time) : new Date(),
        status: pe.status || "COMPLETED",
        assessor_id: pe.assessor_id || null,
        result_category: pe.result_category || null,
        result_summary: pe.result_summary || null,
        clinical_notes: pe.clinical_notes || null,
      },
      create: {
        pe_screening_id: pe.pe_screening_id,
        admission_id: pe.admission_id,
        screening_time: pe.screening_time ? new Date(pe.screening_time) : new Date(),
        status: pe.status || "COMPLETED",
        assessor_id: pe.assessor_id || null,
        result_category: pe.result_category || null,
        result_summary: pe.result_summary || null,
        clinical_notes: pe.clinical_notes || null,
      },
    });
    peCount++;
  }

  let hppCount = 0;
  for (const hpp of db.hpp_screenings || []) {
    const adm = await prisma.admission.findUnique({ where: { admission_id: hpp.admission_id } });
    if (!adm) continue;
    await prisma.hppScreening.upsert({
      where: { hpp_screening_id: hpp.hpp_screening_id },
      update: {
        admission_id: hpp.admission_id,
        screening_time: hpp.screening_time ? new Date(hpp.screening_time) : new Date(),
        status: hpp.status || "COMPLETED",
        assessor_id: hpp.assessor_id || null,
        result_category: hpp.result_category || null,
        result_summary: hpp.result_summary || null,
        clinical_notes: hpp.clinical_notes || null,
      },
      create: {
        hpp_screening_id: hpp.hpp_screening_id,
        admission_id: hpp.admission_id,
        screening_time: hpp.screening_time ? new Date(hpp.screening_time) : new Date(),
        status: hpp.status || "COMPLETED",
        assessor_id: hpp.assessor_id || null,
        result_category: hpp.result_category || null,
        result_summary: hpp.result_summary || null,
        clinical_notes: hpp.clinical_notes || null,
      },
    });
    hppCount++;
  }
  console.log(`✓ Skrining berhasil dimigrasi (PE: ${peCount}, HPP: ${hppCount}).`);

  // 7. Migrasi Audit Logs
  console.log(`\n[7/7] Migrasi Audit Logs (${db.audit_logs?.length || 0} data)...`);
  let auditCount = 0;
  for (const log of db.audit_logs || []) {
    await prisma.auditLog.upsert({
      where: { audit_id: log.audit_id },
      update: {
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        user_id: log.user_id,
        user_name: log.user_name || null,
        user_role: log.user_role || null,
        entity: log.entity,
        entity_id: log.entity_id,
        action: log.action,
        change_summary: log.change_summary,
        protocol_version_ref: log.protocol_version_ref || null,
      },
      create: {
        audit_id: log.audit_id,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        user_id: log.user_id,
        user_name: log.user_name || null,
        user_role: log.user_role || null,
        entity: log.entity,
        entity_id: log.entity_id,
        action: log.action,
        change_summary: log.change_summary,
        protocol_version_ref: log.protocol_version_ref || null,
      },
    });
    auditCount++;
  }
  console.log(`✓ ${auditCount} Audit Logs berhasil disimpan ke PostgreSQL.`);

  console.log("\n=======================================================");
  console.log("MIGRASI POSTGRESQL & ENKRIPSI BCRYPT BERHASIL 100%!");
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat migrasi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
