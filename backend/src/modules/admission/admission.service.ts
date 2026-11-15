import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { Admission, Patient } from "@/lib/types";

export class AdmissionService {
  /**
   * Mengambil daftar seluruh pasien dan admisi
   */
  async getAdmissions() {
    const db = loadDb();
    return {
      admissions: db.admissions,
      patients: db.patients,
    };
  }

  /**
   * Mendaftarkan Pasien Baru (Mendukung mode kode anonim sesuai Proposal Bab II)
   */
  async registerPatient(userId: string, payload: {
    mrn?: string;
    full_name: string;
    is_anonymous_mode?: boolean;
    tanggal_lahir?: string;
    age_years: number;
    nik_masked?: string;
    alamat_singkat?: string;
    kontak_darurat?: string;
  }) {
    const db = loadDb();
    const isAnon = Boolean(payload.is_anonymous_mode);
    const patientCode = `P-${Date.now().toString().slice(-6)}`;
    const mrn = payload.mrn?.trim() || `RM-${patientCode}`;

    const newPatient: Patient = {
      patient_id: `pat-${Date.now()}`,
      patient_code: patientCode,
      mrn,
      full_name: isAnon ? `Pasien Anonim #${patientCode}` : payload.full_name.trim(),
      is_anonymous_mode: isAnon,
      tanggal_lahir: payload.tanggal_lahir || "2000-01-01",
      age_years: Number(payload.age_years || 25),
      nik_masked: payload.nik_masked,
      alamat_singkat: payload.alamat_singkat,
      kontak_darurat: payload.kontak_darurat,
      created_at: new Date().toISOString(),
    };

    db.patients.push(newPatient);
    appendAuditLog(db, {
      userId,
      entity: "patients",
      entityId: newPatient.patient_id,
      action: "CREATE",
      changeSummary: `Pendaftaran pasien baru: ${newPatient.full_name} (${newPatient.patient_code}).`,
    });
    saveDb(db);

    return newPatient;
  }

  /**
   * Membuat Episode Admisi Masuk Rawat Inap Ruang Bersalin (Tabel 1 Proposal)
   */
  async createAdmission(userId: string, payload: {
    patient_id: string;
    usia_kehamilan_minggu: number;
    usia_kehamilan_hari: number;
    jenis_admisi: "ADM_INPARTU" | "ADM_ANTENATAL" | "ADM_POSTPARTUM" | "RUJUKAN_EMERGENSI";
    asal_rujukan?: string;
    unit_id?: string;
    keluhan_utama?: string;
    attending_doctor_id?: string;
    attending_doctor_name?: string;
    receiving_midwife_id?: string;
    receiving_midwife_name?: string;
  }) {
    const db = loadDb();
    const patient = db.patients.find((p) => p.patient_id === payload.patient_id);
    if (!patient) {
      throw new Error("Pasien tidak ditemukan.");
    }

    const admissionCode = `ADM-${Date.now().toString().slice(-6)}`;
    const newAdmission: Admission = {
      admission_id: `adm-${Date.now()}`,
      patient_id: payload.patient_id,
      admission_code: admissionCode,
      admission_date: new Date().toISOString(),
      usia_kehamilan_minggu: Number(payload.usia_kehamilan_minggu || 0),
      usia_kehamilan_hari: Number(payload.usia_kehamilan_hari || 0),
      jenis_admisi: payload.jenis_admisi,
      asal_rujukan: payload.asal_rujukan || "Datang Sendiri",
      unit_id: payload.unit_id || "unit-vk",
      status: "ACTIVE",
      keluhan_utama: payload.keluhan_utama || "Masuk ruang bersalin untuk pemantauan / persalinan",
      obstetric_history: {
        gravida: 1,
        para: 0,
        abortus: 0,
        living_children: 0,
        is_primigravida: true,
        riwayat_pe_sebelumnya: "TIDAK",
        riwayat_eklamsia_sebelumnya: "TIDAK",
        riwayat_hpp_sebelumnya: "TIDAK",
        riwayat_sc_jumlah: 0,
        kehamilan_ganda: "TIDAK",
        hipertensi_kronis: "TIDAK",
        diabetes_melitus: "TIDAK",
        penyakit_ginjal: "TIDAK",
        penyakit_autoimun_sle_aps: "TIDAK",
        obesitas_imt_lebih_30: "TIDAK",
      },
      created_by: userId,
      attending_doctor_id: payload.attending_doctor_id,
      attending_doctor_name: payload.attending_doctor_name || "dr. Sari Dewi, Sp.OG",
      receiving_midwife_id: payload.receiving_midwife_id || userId,
      receiving_midwife_name: payload.receiving_midwife_name || "Bd. Ratna Kusuma, S.Tr.Keb",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.admissions.unshift(newAdmission);
    appendAuditLog(db, {
      userId,
      entity: "admissions",
      entityId: newAdmission.admission_id,
      action: "CREATE",
      changeSummary: `Admisi baru dibuat: ${newAdmission.admission_code} untuk pasien ${patient.full_name}.`,
    });
    saveDb(db);

    return newAdmission;
  }
}

export const admissionService = new AdmissionService();
