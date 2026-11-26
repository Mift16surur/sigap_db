import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getDb,
  resolveRequestUser,
  saveDb,
  verifyRolePermission,
} from "@/lib/store";
import {
  Admission,
  HppScreening,
  LabResult,
  Patient,
  PeScreening,
  PeSymptomRecord,
} from "@/lib/types";

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { userId } = resolveRequestUser(req, db);
    const perm = verifyRolePermission(db, userId, "ADMISSION_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date().toISOString();

    // 0a. Aksi Selesai / Pulang Pasien (Discharge Admission)
    if (body.action === "DISCHARGE_ADMISSION" || body.action === "COMPLETE_ADMISSION") {
      const adm = db.admissions.find((a) => a.admission_id === body.admission_id);
      if (!adm) {
        return NextResponse.json({ ok: false, error: "Admisi tidak ditemukan" }, { status: 404 });
      }
      adm.status = "CLOSED";
      adm.discharge_at = now;
      adm.discharge_summary =
        body.discharge_summary ||
        "Pasien telah menyelesaikan perawatan obstetri dan dinyatakan pulang / rawat jalan lanjutan.";

      appendAuditLog(db, {
        userId,
        entity: "admissions",
        entityId: adm.admission_id,
        action: "UPDATE",
        changeSummary: `Menyelesaikan rawat inap / memulangkan pasien (${adm.admission_code}).`,
      });
      saveDb(db);
      return NextResponse.json({
        ok: true,
        admission: adm,
        message: "Status pasien berhasil diubah menjadi Selesai / Pulang.",
      });
    }

    // 0b. Aksi Buka Kembali Admisi (Reopen Admission)
    if (body.action === "REOPEN_ADMISSION") {
      const adm = db.admissions.find((a) => a.admission_id === body.admission_id);
      if (!adm) {
        return NextResponse.json({ ok: false, error: "Admisi tidak ditemukan" }, { status: 404 });
      }
      adm.status = "ACTIVE";
      delete adm.discharge_at;
      delete adm.discharge_summary;

      appendAuditLog(db, {
        userId,
        entity: "admissions",
        entityId: adm.admission_id,
        action: "UPDATE",
        changeSummary: `Membatalkan kepulangan / mengaktifkan kembali episode admisi (${adm.admission_code}).`,
      });
      saveDb(db);
      return NextResponse.json({
        ok: true,
        admission: adm,
        message: "Episode admisi berhasil diaktifkan kembali.",
      });
    }

    // 0b. Aksi Ubah Status Rawat / Pindah Unit
    if (body.action === "UPDATE_UNIT_STATUS") {
      const adm = db.admissions.find((a) => a.admission_id === body.admission_id);
      if (!adm) {
        return NextResponse.json({ ok: false, error: "Admisi tidak ditemukan" }, { status: 404 });
      }
      if (body.unit_id) adm.unit_id = body.unit_id;
      if (body.jenis_admisi) adm.jenis_admisi = body.jenis_admisi;
      if (body.status) adm.status = body.status;

      appendAuditLog(db, {
        userId,
        entity: "admissions",
        entityId: adm.admission_id,
        action: "UPDATE",
        changeSummary: `Memperbarui status rawat admisi ${adm.admission_code} (Unit: ${adm.unit_id}).`,
      });
      saveDb(db);
      return NextResponse.json({
        ok: true,
        admission: adm,
        message: "Status rawat pasien berhasil diperbarui.",
      });
    }

    // 0c. Aksi Edit / Perbarui Data Pendaftaran Admisi
    if (body.action === "UPDATE_ADMISSION") {
      const adm = db.admissions.find((a) => a.admission_id === body.admission_id);
      if (!adm) {
        return NextResponse.json({ ok: false, error: "Admisi tidak ditemukan" }, { status: 404 });
      }
      if (body.unit_id) {
        adm.unit_id = body.unit_id;
        const unitObj = db.units?.find((u) => u.unit_id === body.unit_id);
        if (unitObj) adm.unit_name = unitObj.name;
      }
      if (body.diagnosa_rujukan !== undefined) adm.diagnosa_rujukan = body.diagnosa_rujukan;
      if (body.keluhan_utama !== undefined) adm.keluhan_utama = body.keluhan_utama;
      if (body.asal_rujukan !== undefined) adm.asal_rujukan = body.asal_rujukan;
      if (body.referral_facility_name !== undefined) adm.referral_facility_name = body.referral_facility_name;
      if (body.nomor_rujukan !== undefined) adm.nomor_rujukan = body.nomor_rujukan;
      if (body.receiving_midwife_name !== undefined) adm.receiving_midwife_name = body.receiving_midwife_name;
      if (body.attending_doctor_name !== undefined) adm.attending_doctor_name = body.attending_doctor_name;
      if (body.attending_doctor_id !== undefined) adm.attending_doctor_id = body.attending_doctor_id;
      if (body.obstetric_history) {
        adm.obstetric_history = {
          ...adm.obstetric_history,
          ...body.obstetric_history,
        };
      }
      if (body.penjamin !== undefined) adm.penjamin = body.penjamin;

      appendAuditLog(db, {
        userId,
        entity: "admissions",
        entityId: adm.admission_id,
        action: "UPDATE",
        changeSummary: `Memperbarui data pendaftaran admisi ${adm.admission_code}.`,
      });
      saveDb(db);
      return NextResponse.json({
        ok: true,
        admission: adm,
        message: "Data pendaftaran admisi berhasil diperbarui.",
      });
    }

    // 0d. Aksi Hapus / Batal Pendaftaran Admisi
    if (body.action === "DELETE_ADMISSION" || body.action === "CANCEL_ADMISSION") {
      const admIndex = db.admissions.findIndex((a) => a.admission_id === body.admission_id);
      if (admIndex === -1) {
        return NextResponse.json({ ok: false, error: "Admisi tidak ditemukan" }, { status: 404 });
      }
      const targetAdm = db.admissions[admIndex];
      db.admissions.splice(admIndex, 1);

      // Bersihkan data relasi terkait admisi yang dibatalkan
      db.pe_screenings = (db.pe_screenings || []).filter((s) => s.admission_id !== targetAdm.admission_id);
      db.hpp_screenings = (db.hpp_screenings || []).filter((s) => s.admission_id !== targetAdm.admission_id);
      db.screening_results = (db.screening_results || []).filter((r) => r.admission_id !== targetAdm.admission_id);
      db.screening_risk_details = (db.screening_risk_details || []).filter((d) => d.admission_id !== targetAdm.admission_id);
      db.clinical_actions = (db.clinical_actions || []).filter((a) => a.admission_id !== targetAdm.admission_id);
      db.alerts = (db.alerts || []).filter((al) => al.admission_id !== targetAdm.admission_id);
      db.bp_measurements = (db.bp_measurements || []).filter((b) => b.admission_id !== targetAdm.admission_id);
      db.blood_loss_records = (db.blood_loss_records || []).filter((bl) => bl.admission_id !== targetAdm.admission_id);

      appendAuditLog(db, {
        userId,
        entity: "admissions",
        entityId: targetAdm.admission_id,
        action: "DELETE",
        changeSummary: `Membatalkan / menghapus pendaftaran admisi ${targetAdm.admission_code}.`,
      });
      saveDb(db);
      return NextResponse.json({
        ok: true,
        deleted_id: targetAdm.admission_id,
        message: `Pendaftaran admisi ${targetAdm.admission_code} berhasil dibatalkan / dihapus.`,
      });
    }

  // 1. Buat atau gunakan pasien yang sudah ada (FR-03)
  let patient: Patient | undefined = db.patients.find(
    (p) => p.patient_id === body.patient_id || (body.mrn && p.mrn === body.mrn)
  );

  if (!patient) {
    const seq = db.patients.length + 1;
    const isAnon = Boolean(
      body.is_anonymous_mode ?? db.system_settings.default_anonymous_mode
    );
    const code = `SGP-2026-00${seq}`;
    patient = {
      patient_id: `pat-${Date.now()}`,
      patient_code: code,
      mrn: body.mrn || `RM-${483000 + seq}`,
      full_name: isAnon
        ? `Pasien Anonim (${code})`
        : body.full_name || `Ny. Pasien Simulasi ${seq}`,
      is_anonymous_mode: isAnon,
      tanggal_lahir: body.tanggal_lahir || "1995-05-10",
      age_years: Number(body.age_years || 30),
      nik_masked: "3273**********99",
      alamat_singkat: body.alamat_singkat || "Kota Bandung",
      kontak_darurat: body.kontak_darurat || "-",
      created_at: now,
    };
    db.patients.unshift(patient);
  }

  // 2. Buat Episode Admisi baru (FR-04, FR-05)
  const admSeq = db.admissions.length + 1;
  const newAdmission: Admission = {
    admission_id: `adm-${Date.now()}`,
    patient_id: patient.patient_id,
    admission_code: `ADM-20261109-00${admSeq}`,
    admission_date: now,
    usia_kehamilan_minggu: Number(body.usia_kehamilan_minggu ?? 38),
    usia_kehamilan_hari: Number(body.usia_kehamilan_hari ?? 0),
    jenis_admisi: body.jenis_admisi || "ADM_INPARTU",
    asal_rujukan: body.asal_rujukan || "Datang Sendiri",
    referral_facility_id: body.referral_facility_id || undefined,
    referral_facility_name: body.referral_facility_name || undefined,
    nomor_rujukan: body.nomor_rujukan || undefined,
    diagnosa_rujukan: body.diagnosa_rujukan || undefined,
    penjamin: body.penjamin || "BPJS Kesehatan (PBI)",
    unit_id: body.unit_id || "unit-vk",
    unit_name: body.unit_name || undefined,
    status: "ACTIVE",
    keluhan_utama: body.keluhan_utama || "Kenceng-kenceng teratur",
    obstetric_history: {
      gravida: Number(body.gravida ?? 1),
      para: Number(body.para ?? 0),
      abortus: Number(body.abortus ?? 0),
      living_children: Number(body.living_children ?? 0),
      is_primigravida: Number(body.gravida ?? 1) === 1,
      riwayat_pe_sebelumnya:
        Number(body.gravida ?? 1) === 1
          ? "TIDAK_RELEVAN"
          : body.riwayat_pe_sebelumnya || "TIDAK",
      riwayat_eklamsia_sebelumnya:
        Number(body.gravida ?? 1) === 1
          ? "TIDAK_RELEVAN"
          : body.riwayat_eklamsia_sebelumnya || "TIDAK",
      riwayat_hpp_sebelumnya:
        Number(body.gravida ?? 1) === 1
          ? "TIDAK_RELEVAN"
          : body.riwayat_hpp_sebelumnya || "TIDAK",
      riwayat_sc_jumlah: Number(body.riwayat_sc_jumlah ?? 0),
      interval_kehamilan_tahun: Number(body.interval_kehamilan_tahun ?? 0),
      kehamilan_ganda: body.kehamilan_ganda || "TIDAK",
      hipertensi_kronis: body.hipertensi_kronis || "TIDAK",
      diabetes_melitus: body.diabetes_melitus || "TIDAK",
      penyakit_ginjal: body.penyakit_ginjal || "TIDAK",
      penyakit_autoimun_sle_aps: body.penyakit_autoimun_sle_aps || "TIDAK",
      obesitas_imt_lebih_30:
        Number(body.imt_nilai ?? 24) >= 30 ? "YA" : "TIDAK",
      imt_nilai: Number(body.imt_nilai ?? 24),
      catatan_komorbid: body.catatan_komorbid || "",
    },
    created_by: userId,
    attending_doctor_id: body.attending_doctor_id || "usr-dokter",
    attending_doctor_name: body.attending_doctor_name || "dr. Spesialis Kandungan, Sp.OG",
    receiving_midwife_id: body.receiving_midwife_id || "usr-bidan",
    receiving_midwife_name: body.receiving_midwife_name || "Bd. Pelaksana VK, S.Tr.Keb",
    created_at: now,
    updated_at: now,
  };
  db.admissions.unshift(newAdmission);

  // 3. Inisialisasi wadah Skrining PE & Skrining HPP dengan status NOT_STARTED / IN_PROGRESS
  //    dan semua gejala/lab berstatus BELUM_DIPERIKSA / BELUM_TERSEDIA (FR-09, Bab 6: Anti-Asumsi Normal!)
  const peScreening: PeScreening = {
    pe_screening_id: `pe-scr-${Date.now()}`,
    admission_id: newAdmission.admission_id,
    screening_time: now,
    started_at: now,
    status: "IN_PROGRESS",
    assessor_id: userId,
    kejang_eklamsia: "BELUM_DIPERIKSA",
    kesadaran_menurun_gcs_rendah: "BELUM_DIPERIKSA",
    edema_paru_sesak_berat: "BELUM_DIPERIKSA",
    oliguria_produksi_urin_rendah: "BELUM_DIPERIKSA",
    clinical_notes: "",
    updated_at: now,
  };
  db.pe_screenings.unshift(peScreening);

  const defaultSymptoms: PeSymptomRecord[] = [
    {
      pe_symptom_id: `sym-${Date.now()}-1`,
      pe_screening_id: peScreening.pe_screening_id,
      symptom_code: "SYM_HEADACHE",
      symptom_label: "Nyeri Kepala Hebat Menetap (Tidak Membaik dengan Analgetik)",
      is_severe_feature: true,
      response: "BELUM_DIPERIKSA",
      assessed_at: now,
    },
    {
      pe_symptom_id: `sym-${Date.now()}-2`,
      pe_screening_id: peScreening.pe_screening_id,
      symptom_code: "SYM_VISUAL",
      symptom_label: "Gangguan Penglihatan (Pandangan Kabur / Skotoma / Fotofobia)",
      is_severe_feature: true,
      response: "BELUM_DIPERIKSA",
      assessed_at: now,
    },
    {
      pe_symptom_id: `sym-${Date.now()}-3`,
      pe_screening_id: peScreening.pe_screening_id,
      symptom_code: "SYM_EPIGASTRIC",
      symptom_label: "Nyeri Epigastrium / Kuadran Kanan Atas Hebat",
      is_severe_feature: true,
      response: "BELUM_DIPERIKSA",
      assessed_at: now,
    },
    {
      pe_symptom_id: `sym-${Date.now()}-4`,
      pe_screening_id: peScreening.pe_screening_id,
      symptom_code: "SYM_NAUSEA_VOMIT",
      symptom_label: "Mual Muntah Hebat / Edema Wajah-Ekstremitas Mendadak",
      is_severe_feature: false,
      response: "BELUM_DIPERIKSA",
      assessed_at: now,
    },
  ];
  db.pe_symptoms.push(...defaultSymptoms);

  const defaultLabs: LabResult[] = [
    {
      lab_id: `lab-${Date.now()}-1`,
      admission_id: newAdmission.admission_id,
      test_code: "PROTEIN_URIN_DIPSTICK",
      test_name: "Protein Urin Dipstick",
      result_status: "BELUM_TERSEDIA",
      unit: "kualitatif",
      reference_range: "Negatif",
      recorded_by: userId,
    },
    {
      lab_id: `lab-${Date.now()}-2`,
      admission_id: newAdmission.admission_id,
      test_code: "HEMOGLOBIN",
      test_name: "Hemoglobin (Hb)",
      result_status: "BELUM_TERSEDIA",
      unit: "g/dL",
      reference_range: "11.0 - 14.0 g/dL",
      recorded_by: userId,
    },
    {
      lab_id: `lab-${Date.now()}-3`,
      admission_id: newAdmission.admission_id,
      test_code: "TROMBOSIT",
      test_name: "Hitung Trombosit",
      result_status: "BELUM_TERSEDIA",
      unit: "/uL",
      reference_range: "150.000 - 400.000 /uL",
      recorded_by: userId,
    },
    {
      lab_id: `lab-${Date.now()}-4`,
      admission_id: newAdmission.admission_id,
      test_code: "SGOT_AST",
      test_name: "SGOT (AST)",
      result_status: "BELUM_TERSEDIA",
      unit: "U/L",
      reference_range: "< 35 U/L",
      recorded_by: userId,
    },
    {
      lab_id: `lab-${Date.now()}-5`,
      admission_id: newAdmission.admission_id,
      test_code: "KREATININ_SERUM",
      test_name: "Kreatinin Serum",
      result_status: "BELUM_TERSEDIA",
      unit: "mg/dL",
      reference_range: "0.5 - 1.1 mg/dL",
      recorded_by: userId,
    },
  ];
  db.lab_results.push(...defaultLabs);

  const hppScreening: HppScreening = {
    hpp_screening_id: `hpp-scr-${Date.now()}`,
    admission_id: newAdmission.admission_id,
    screening_time: now,
    started_at: now,
    status: "IN_PROGRESS",
    assessor_id: userId,
    perdarahan_aktif_saat_admisi: "BELUM_DIPERIKSA",
    syok_hemodinamik_instabil: "BELUM_DIPERIKSA",
    rencana_metode_persalinan: "BELUM_DITENTUKAN",
    clinical_notes: "",
    updated_at: now,
  };
  db.hpp_screenings.unshift(hppScreening);

  appendAuditLog(db, {
    userId,
    entity: "admissions",
    entityId: newAdmission.admission_id,
    action: "CREATE",
    changeSummary: `Membuat Episode Admisi baru ${newAdmission.admission_code} untuk pasien ${patient.full_name} (${patient.mrn}, UK ${newAdmission.usia_kehamilan_minggu} mgg ${newAdmission.usia_kehamilan_hari} hr).`,
  });

  saveDb(db);

  return NextResponse.json({
    ok: true,
    patient,
    admission: newAdmission,
    pe_screening: peScreening,
    hpp_screening: hppScreening,
  });
  } catch (err: any) {
    console.error("POST /api/v1/admissions error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Terjadi kesalahan internal saat membuat episode admisi.",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

