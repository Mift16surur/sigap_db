import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getDb,
  getDbAsync,
  resolveRequestUser,
  saveDb,
  saveDbAsync,
  verifyRolePermission,
} from "@/lib/store";
import { Patient } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const db = await getDbAsync();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const enrichedPatients = db.patients.map((p) => {
    const patientAdmissions = db.admissions
      .filter((a) => a.patient_id === p.patient_id)
      .sort(
        (a, b) =>
          new Date(b.admission_date).getTime() -
          new Date(a.admission_date).getTime()
      );
    return {
      ...p,
      admissions_count: patientAdmissions.length,
      latest_admission: patientAdmissions[0] || null,
      admissions: patientAdmissions,
    };
  });

  const filtered = q
    ? enrichedPatients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.patient_code.toLowerCase().includes(q) ||
          (p.nik_masked || "").toLowerCase().includes(q)
      )
    : enrichedPatients;

  return NextResponse.json({
    ok: true,
    patients: filtered,
  });
}

export async function POST(req: Request) {
  try {
    const db = await getDbAsync();
    const { userId } = resolveRequestUser(req, db);
    const perm = verifyRolePermission(db, userId, "PATIENT_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date().toISOString();

    // Cek duplikasi No. RM (MRN) bila diisi
    if (body.mrn) {
      const existingMrn = db.patients.find(
        (p) => p.mrn.toLowerCase() === String(body.mrn).trim().toLowerCase()
      );
      if (existingMrn) {
        return NextResponse.json(
          {
            ok: false,
            error: `Nomor Rekam Medis (${body.mrn}) sudah terdaftar atas nama ${existingMrn.full_name} (${existingMrn.patient_code}). Silakan pilih pasien tersebut untuk membuat Episode Admisi baru.`,
          },
          { status: 409 }
        );
      }
    }

    const seq = (db.patients?.length || 0) + 1;
    const code = `SGP-2026-${String(seq).padStart(3, "0")}`;
    const isAnon = Boolean(
      body.is_anonymous_mode ??
        body.is_anonymous ??
        db.system_settings?.default_anonymous_mode ??
        false
    );

    // Hitung usia otomatis dari tanggal lahir jika tersedia
    const birthDateInput = String(body.tanggal_lahir || body.birth_date || "").trim();
    let calculatedAge = Number(body.age_years || 0);
    if (birthDateInput) {
      const birthYear = new Date(birthDateInput).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && currentYear > birthYear) {
        calculatedAge = currentYear - birthYear;
      }
    }
    if (!calculatedAge) calculatedAge = 28;

    const newPatient: Patient = {
      patient_id: `pat-${Date.now()}`,
      patient_code: code,
      mrn: body.mrn ? String(body.mrn).trim() : `RM-${483000 + seq}`,
      full_name: isAnon
        ? `Pasien Anonim (${code})`
        : String(body.full_name || `Ny. Pasien ${seq}`).trim(),
      is_anonymous_mode: isAnon,
      tanggal_lahir: birthDateInput || "1996-05-15",
      age_years: calculatedAge,
      gender: body.gender || "PEREMPUAN",
      golongan_darah: body.golongan_darah || "O+",
      nik_masked: String(body.nik_masked || body.nik || "3302**********01").trim(),
      alamat_singkat: String(body.alamat_singkat || body.address || "-").trim(),
      kontak_darurat: String(body.kontak_darurat || body.emergency_contact || "-").trim(),
      created_at: now,
    };

    if (!Array.isArray(db.patients)) {
      db.patients = [];
    }
    db.patients.unshift(newPatient);

    appendAuditLog(db, {
      userId,
      entity: "patients",
      entityId: newPatient.patient_id,
      action: "CREATE",
      changeSummary: `Registrasi Master Pasien baru: ${newPatient.full_name} (No. RM: ${newPatient.mrn}, Kode: ${newPatient.patient_code}, Usia: ${newPatient.age_years} th).`,
    });

    await saveDbAsync(db);

    return NextResponse.json(
      {
        ok: true,
        patient: newPatient,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/patients error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Terjadi kesalahan internal pada server saat mendaftarkan pasien.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDbAsync();
    const { userId } = resolveRequestUser(req, db);
    const perm = verifyRolePermission(db, userId, "PATIENT_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const body = await req.json();
    const patientId = String(body.patient_id || "").trim();
    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "ID Pasien (patient_id) wajib disertakan untuk edit data." },
        { status: 400 }
      );
    }

    if (!Array.isArray(db.patients)) db.patients = [];
    const patientIndex = db.patients.findIndex((p) => p.patient_id === patientId);
    if (patientIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Data pasien tidak ditemukan." },
        { status: 404 }
      );
    }

    const existingPatient = db.patients[patientIndex];

    // Cek duplikasi No. RM jika diubah
    if (body.mrn && body.mrn !== existingPatient.mrn) {
      const dupMrn = db.patients.find(
        (p) =>
          p.patient_id !== patientId &&
          p.mrn.toLowerCase() === String(body.mrn).trim().toLowerCase()
      );
      if (dupMrn) {
        return NextResponse.json(
          {
            ok: false,
            error: `Nomor Rekam Medis (${body.mrn}) sudah digunakan oleh pasien lain: ${dupMrn.full_name}.`,
          },
          { status: 409 }
        );
      }
    }

    let calculatedAge = Number(body.age_years ?? existingPatient.age_years);
    const birthDateInput = body.tanggal_lahir || body.birth_date;
    if (birthDateInput) {
      const birthYear = new Date(birthDateInput).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && currentYear > birthYear) {
        calculatedAge = currentYear - birthYear;
      }
    }

    const isAnon =
      body.is_anonymous_mode !== undefined
        ? Boolean(body.is_anonymous_mode)
        : body.is_anonymous !== undefined
        ? Boolean(body.is_anonymous)
        : existingPatient.is_anonymous_mode;

    const updatedPatient: Patient = {
      ...existingPatient,
      full_name: isAnon
        ? `Pasien Anonim (${existingPatient.patient_code})`
        : body.full_name !== undefined
        ? String(body.full_name).trim()
        : existingPatient.full_name,
      mrn: body.mrn !== undefined ? String(body.mrn).trim() : existingPatient.mrn,
      is_anonymous_mode: isAnon,
      tanggal_lahir: birthDateInput || existingPatient.tanggal_lahir,
      age_years: calculatedAge,
      gender: body.gender || existingPatient.gender || "PEREMPUAN",
      golongan_darah: body.golongan_darah || existingPatient.golongan_darah || "O+",
      nik_masked:
        body.nik_masked !== undefined
          ? String(body.nik_masked).trim()
          : body.nik !== undefined
          ? String(body.nik).trim()
          : existingPatient.nik_masked,
      alamat_singkat:
        body.alamat_singkat !== undefined
          ? String(body.alamat_singkat).trim()
          : body.address !== undefined
          ? String(body.address).trim()
          : existingPatient.alamat_singkat,
      kontak_darurat:
        body.kontak_darurat !== undefined
          ? String(body.kontak_darurat).trim()
          : body.emergency_contact !== undefined
          ? String(body.emergency_contact).trim()
          : existingPatient.kontak_darurat,
    };

    db.patients[patientIndex] = updatedPatient;

    appendAuditLog(db, {
      userId,
      entity: "patients",
      entityId: updatedPatient.patient_id,
      action: "UPDATE",
      changeSummary: `Pembaruan Master Pasien: ${updatedPatient.full_name} (${updatedPatient.mrn}, Kode: ${updatedPatient.patient_code}).`,
    });

    await saveDbAsync(db);

    return NextResponse.json({
      ok: true,
      patient: updatedPatient,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal memperbarui data pasien." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const db = await getDbAsync();
    const { userId } = resolveRequestUser(req, db);
    const perm = verifyRolePermission(db, userId, "PATIENT_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let patientId = searchParams.get("patient_id") || "";

    if (!patientId) {
      try {
        const body = await req.json();
        patientId = body.patient_id || "";
      } catch {
        // ignore json parse error if empty body
      }
    }

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "ID Pasien (patient_id) wajib disertakan untuk menghapus data." },
        { status: 400 }
      );
    }

    if (!Array.isArray(db.patients)) db.patients = [];
    const patientIndex = db.patients.findIndex((p) => p.patient_id === patientId);
    if (patientIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Data pasien tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetPatient = db.patients[patientIndex];

    // Hapus pasien dari array
    db.patients.splice(patientIndex, 1);

    // Bersihkan juga admisi terkait
    if (!Array.isArray(db.admissions)) db.admissions = [];
    const removedAdmissionIds = db.admissions
      .filter((a) => a.patient_id === patientId)
      .map((a) => a.admission_id);

    if (removedAdmissionIds.length > 0) {
      db.admissions = db.admissions.filter((a) => a.patient_id !== patientId);
      if (Array.isArray(db.pe_screenings)) {
        db.pe_screenings = db.pe_screenings.filter(
          (s) => !removedAdmissionIds.includes(s.admission_id)
        );
      }
      if (Array.isArray(db.hpp_screenings)) {
        db.hpp_screenings = db.hpp_screenings.filter(
          (s) => !removedAdmissionIds.includes(s.admission_id)
        );
      }
      if (Array.isArray(db.bp_measurements)) {
        db.bp_measurements = db.bp_measurements.filter(
          (b) => !removedAdmissionIds.includes(b.admission_id)
        );
      }
      if (Array.isArray(db.lab_results)) {
        db.lab_results = db.lab_results.filter(
          (l) => !removedAdmissionIds.includes(l.admission_id)
        );
      }
      if (Array.isArray(db.monitoring_records)) {
        db.monitoring_records = db.monitoring_records.filter(
          (m) => !removedAdmissionIds.includes(m.admission_id)
        );
      }
      if (Array.isArray(db.blood_loss_records)) {
        db.blood_loss_records = db.blood_loss_records.filter(
          (bl) => !removedAdmissionIds.includes(bl.admission_id)
        );
      }
    }

    appendAuditLog(db, {
      userId,
      entity: "patients",
      entityId: patientId,
      action: "DELETE",
      changeSummary: `Penghapusan Master Pasien: ${targetPatient.full_name} (${targetPatient.mrn}, Kode: ${targetPatient.patient_code}) beserta ${removedAdmissionIds.length} episode admisi terkait.`,
    });

    await saveDbAsync(db);

    return NextResponse.json({
      ok: true,
      message: `Data pasien ${targetPatient.full_name} (${targetPatient.mrn}) berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal menghapus data pasien." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

