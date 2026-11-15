import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { HppScreening, ScreeningResult, RiskCategory } from "@/lib/types";

export class HppScreeningService {
  /**
   * Menyimpan dan mengevaluasi skrining HPP 4T sesuai Tabel 1 & 2 Proposal
   */
  async submitHppScreening(userId: string, payload: {
    admission_id: string;
    risk_factors_4t: {
      tonus?: Record<string, string>;
      trauma?: Record<string, string>;
      tissue?: Record<string, string>;
      thrombin?: Record<string, string>;
    };
    clinical_notes?: string;
  }) {
    const db = loadDb();
    const admission = db.admissions.find((a) => a.admission_id === payload.admission_id);
    if (!admission) {
      throw new Error("Episode admisi tidak ditemukan.");
    }

    // Evaluasi faktor risiko 4T (Tonus, Trauma, Tissue, Thrombin)
    const tonusValues = Object.values(payload.risk_factors_4t.tonus || {});
    const traumaValues = Object.values(payload.risk_factors_4t.trauma || {});
    const tissueValues = Object.values(payload.risk_factors_4t.tissue || {});
    const thrombinValues = Object.values(payload.risk_factors_4t.thrombin || {});

    const hasHighRisk =
      tonusValues.includes("YA_BERAT") ||
      traumaValues.includes("YA_BERAT") ||
      tissueValues.includes("YA_BERAT") ||
      thrombinValues.includes("YA_BERAT") ||
      tissueValues.includes("RETENSIO_PLASENTA") ||
      tonusValues.includes("ATONIA_UTERI");

    const hasModerateRisk =
      hasHighRisk ||
      tonusValues.includes("YA") ||
      traumaValues.includes("YA") ||
      tissueValues.includes("YA") ||
      thrombinValues.includes("YA") ||
      tonusValues.includes("PARTUS_LAMA") ||
      tonusValues.includes("POLIHIDRAMNION");

    let category: RiskCategory = "LOW";
    let summary = "Risiko HPP rendah. Lakukan manajemen aktif kala III standar.";

    if (hasHighRisk) {
      category = "HIGH";
      summary = "Risiko Tinggi HPP (4T Positif). Siapkan protokol perdarahan masif, jalur IV ganda, dan uterotonika lini kedua.";
    } else if (hasModerateRisk) {
      category = "MODERATE";
      summary = "Risiko Sedang HPP. Pastikan ketersediaan uterotonika profilaksis dan timbang darah gravimetrik.";
    }

    const screeningId = `hpp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newHpp: HppScreening = {
      hpp_screening_id: screeningId,
      admission_id: payload.admission_id,
      screening_time: nowIso,
      started_at: nowIso,
      completed_at: nowIso,
      duration_seconds: 60,
      status: "COMPLETED",
      assessor_id: userId,
      perdarahan_aktif_saat_admisi: category === "HIGH" ? "YA" : "TIDAK",
      syok_hemodinamik_instabil: "TIDAK",
      rencana_metode_persalinan: "PERVAGINAM_SPONTAN",
      clinical_notes: payload.clinical_notes || "",
      updated_at: nowIso,
    };

    db.hpp_screenings = db.hpp_screenings.filter((h) => h.admission_id !== payload.admission_id);
    db.hpp_screenings.push(newHpp);

    const resultRecord: ScreeningResult = {
      result_id: `res-hpp-${Date.now()}`,
      admission_id: payload.admission_id,
      screening_id: screeningId,
      screening_type: "HPP",
      category,
      priority_alert_triggered: category === "HIGH",
      summary_headline: summary,
      rationale: [summary],
      triggered_indicators: category === "HIGH" ? [{
        code: "HPP_4T_HIGH",
        label: "Faktor Risiko 4T Tinggi",
        domain: "OBSTETRIC_HISTORY",
        severity: "CRITICAL",
        value_summary: "Positif faktor risiko tinggi 4T",
      }] : [],
      missing_or_unknown_fields: [],
      recommended_checklists: category === "HIGH" ? [
        "Jalur IV ganda 16G/18G",
        "Siapkan uterotonika (Oksitosin, Metilergometrin/Misoprostol)",
        "Siapkan Asam Traneksamat 1 gram IV",
        "Crossmatch & konfirmasi persediaan labu darah",
      ] : [],
      protocol_version_id: "proto-hpp-2026-v1",
      protocol_version_number: "2026.1",
      calculated_at: nowIso,
      assessor_id: userId,
      is_re_evaluation: false,
      input_snapshot_hash: `hpp-${Date.now()}`,
    };

    db.screening_results = (db.screening_results || []).filter(
      (r) => !(r.admission_id === payload.admission_id && r.screening_type === "HPP")
    );
    db.screening_results.push(resultRecord);

    // Jika Kategori Tinggi, munculkan alert klinis kesiapan penanganan perdarahan masif
    if (category === "HIGH") {
      db.alerts.unshift({
        alert_id: `alt-hpp-${Date.now()}`,
        admission_id: payload.admission_id,
        pathway: "HPP",
        alert_type: "RULE_HPP_MASSIVE",
        severity: "CRITICAL_PRIORITY",
        title: "PERINGATAN KRISIS: Risiko Tinggi Perdarahan Pascapersalinan (HPP 4T)",
        message: summary,
        trigger_indicators: ["Faktor Risiko 4T Tinggi"],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: nowIso,
        triggered_by_user_id: userId,
      });
    }

    appendAuditLog(db, {
      userId,
      entity: "hpp_screenings",
      entityId: screeningId,
      action: "CREATE",
      changeSummary: `Skrining HPP selesai: Kategori ${category} (${summary}).`,
    });
    saveDb(db);

    return {
      screening: newHpp,
      result: resultRecord,
      category,
      summary,
    };
  }
}

export const hppScreeningService = new HppScreeningService();
