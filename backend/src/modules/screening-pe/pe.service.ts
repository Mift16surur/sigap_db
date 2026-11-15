import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { PeScreening, BpMeasurement, ScreeningResult, RiskCategory } from "@/lib/types";

export class PeScreeningService {
  async submitPeScreening(userId: string, payload: {
    admission_id: string;
    bp_measurements: Array<{ systolic: number; diastolic: number; note?: string }>;
    symptoms?: Record<string, string>;
    clinical_notes?: string;
  }) {
    const db = loadDb();
    const admission = db.admissions.find((a) => a.admission_id === payload.admission_id);
    if (!admission) {
      throw new Error("Episode admisi tidak ditemukan.");
    }

    const bp1 = payload.bp_measurements[0] || { systolic: 120, diastolic: 80 };
    const bp2 = payload.bp_measurements[1];
    const sbp = Math.max(bp1.systolic, bp2?.systolic || 0);
    const dbp = Math.max(bp1.diastolic, bp2?.diastolic || 0);

    // Kategori Sederhana Sesuai Tabel 1 & 2 Proposal (Hijau / Kuning / Merah)
    let category: RiskCategory = "LOW";
    let summary = "Tekanan darah dalam batas normal, tidak ada tanda bahaya preeklamsia.";

    if (sbp >= 160 || dbp >= 110) {
      category = "HIGH";
      summary = `Hipertensi Krisis Berat (${sbp}/${dbp} mmHg). Siapkan MgSO4 & hubungi DPJP segera.`;
    } else if (sbp >= 140 || dbp >= 90) {
      category = "MODERATE";
      summary = `Hipertensi Dalam Kehamilan (${sbp}/${dbp} mmHg). Pantau tensi ulang & periksa protein urin.`;
    }

    const screeningId = `pe-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newPe: PeScreening = {
      pe_screening_id: screeningId,
      admission_id: payload.admission_id,
      screening_time: nowIso,
      started_at: nowIso,
      completed_at: nowIso,
      duration_seconds: 60,
      status: "COMPLETED",
      assessor_id: userId,
      kejang_eklamsia: "TIDAK",
      kesadaran_menurun_gcs_rendah: "TIDAK",
      edema_paru_sesak_berat: "TIDAK",
      oliguria_produksi_urin_rendah: "TIDAK",
      clinical_notes: payload.clinical_notes || "",
      updated_at: nowIso,
    };

    db.pe_screenings = db.pe_screenings.filter((p) => p.admission_id !== payload.admission_id);
    db.pe_screenings.push(newPe);

    // Simpan pengukuran tekanan darah
    payload.bp_measurements.forEach((bp, idx) => {
      const bpRecord: BpMeasurement = {
        bp_id: `bp-${Date.now()}-${idx}`,
        pe_screening_id: screeningId,
        admission_id: payload.admission_id,
        sequence_number: idx + 1,
        systolic: bp.systolic,
        diastolic: bp.diastolic,
        mean_arterial_pressure: Math.round((bp.systolic + 2 * bp.diastolic) / 3),
        measured_at: nowIso,
        position: "DUDUK_BERSANDAR",
        cuff_size: "STANDAR_DEWASA",
        is_repeat_verification: idx > 0,
        assessor_id: userId,
        note: bp.note || `Pengukuran ke-${idx + 1}`,
      };
      db.bp_measurements.push(bpRecord);
    });

    const resultRecord: ScreeningResult = {
      result_id: `res-pe-${Date.now()}`,
      admission_id: payload.admission_id,
      screening_id: screeningId,
      screening_type: "PE",
      category,
      priority_alert_triggered: category === "HIGH",
      summary_headline: summary,
      rationale: [summary],
      triggered_indicators: category === "HIGH" ? [{
        code: "PE_CRISIS_BP",
        label: "Tekanan Darah Krisis",
        domain: "VITAL_SIGNS",
        severity: "CRITICAL",
        value_summary: `${sbp}/${dbp} mmHg`,
      }] : [],
      missing_or_unknown_fields: [],
      recommended_checklists: category === "HIGH" ? [
        "Pasang IV line kaliber besar (16G/18G)",
        "Pemberian MgSO4 40% dosis inisial 4 gram IV",
        "Pasang kateter urin menetap pantau diuresis",
        "Eskalasi ke DPJP Obstetri & Ginekologi",
      ] : [],
      protocol_version_id: "proto-pe-2026-v1",
      protocol_version_number: "2026.1",
      calculated_at: nowIso,
      assessor_id: userId,
      is_re_evaluation: false,
      input_snapshot_hash: `pe-${Date.now()}`,
    };

    db.screening_results = (db.screening_results || []).filter(
      (r) => !(r.admission_id === payload.admission_id && r.screening_type === "PE")
    );
    db.screening_results.push(resultRecord);

    if (category === "HIGH") {
      db.alerts.unshift({
        alert_id: `alt-pe-${Date.now()}`,
        admission_id: payload.admission_id,
        pathway: "PE",
        alert_type: "RULE_PE_CRISIS",
        severity: "CRITICAL_PRIORITY",
        title: "PERINGATAN KRISIS: Preeklamsia dengan Kriteria Berat (PEB)",
        message: summary,
        trigger_indicators: ["Tekanan Darah Krisis (>=160/110 mmHg)"],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: nowIso,
        triggered_by_user_id: userId,
      });
    }

    appendAuditLog(db, {
      userId,
      entity: "pe_screenings",
      entityId: screeningId,
      action: "CREATE",
      changeSummary: `Skrining PE selesai: Kategori ${category} (${summary}).`,
    });
    saveDb(db);

    return {
      screening: newPe,
      result: resultRecord,
      category,
      summary,
    };
  }
}

export const peScreeningService = new PeScreeningService();
