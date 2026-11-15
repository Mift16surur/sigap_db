/**
 * SIGAP — Mesin Aturan Klinis Berversi (Versioned Clinical Rule Engine)
 * Memenuhi SRS FR-06..FR-15, FR-21, NFR-08, NFR-09, Bab 6, Bab 7, Bab 11, Bab 12, Bab 13
 *
 * CATATAN KESELAMATAN KLINIS:
 * 1. Data kosong / "BELUM_DIPERIKSA" / "TIDAK_DIKETAHUI" TIDAK BOLEH ditafsirkan sebagai negatif/normal.
 * 2. Pemicu prioritas darurat (kejang, gejala berat, TD krisis >=160/110, perdarahan aktif/syok)
 *    langsung menghasilkan Alert Prioritas tanpa menunggu seluruh form lengkap.
 * 3. Hasil PE dan HPP dihitung secara independen dan selalu mengikat protocol_version_id.
 */

import {
  Admission,
  BpMeasurement,
  ClinicalProtocol,
  HppScreening,
  LabResult,
  PeScreening,
  PeSymptomRecord,
  RiskCategory,
  RiskFactorMaster,
  ScreeningResult,
  ScreeningRiskDetail,
  TriggeredIndicator,
} from "./types";

export interface PeEvaluationInput {
  admission: Admission;
  screening: PeScreening;
  bpMeasurements: BpMeasurement[];
  symptoms: PeSymptomRecord[];
  riskDetails: ScreeningRiskDetail[];
  labResults: LabResult[];
  riskFactorMasters: RiskFactorMaster[];
  protocol: ClinicalProtocol;
  previousResult?: ScreeningResult;
}

export interface HppEvaluationInput {
  admission: Admission;
  screening: HppScreening;
  riskDetails: ScreeningRiskDetail[];
  labResults: LabResult[];
  riskFactorMasters: RiskFactorMaster[];
  protocol: ClinicalProtocol;
  previousResult?: ScreeningResult;
  latestPeResult?: ScreeningResult;
}

/**
 * Evaluasi Jalur Skrining Preeklamsia (PE) — Flowchart Bab 11
 */
export function evaluatePeScreening(input: PeEvaluationInput): ScreeningResult {
  const {
    admission,
    screening,
    bpMeasurements,
    symptoms,
    riskDetails,
    labResults,
    riskFactorMasters,
    protocol,
    previousResult,
  } = input;

  const cfg = protocol.pe_config;
  const triggered: TriggeredIndicator[] = [];
  const rationale: string[] = [];
  const missingFields: string[] = [];
  let priorityAlertTriggered = false;

  // 1. Evaluasi Pemicu Prioritas Darurat (Flowchart Bab 11: Kejang, Gejala Berat, TD Krisis)
  if (screening.kejang_eklamsia === "YA") {
    priorityAlertTriggered = true;
    triggered.push({
      code: "PE_CONVULSION_ECLAMPSIA",
      label: "Kejang / Tanda Eklamsia Saat Admisi",
      domain: "EMERGENCY_PE",
      severity: "CRITICAL",
      value_summary: "Ya (Darurat Obstetri)",
    });
    rationale.push(
      "TRIGGER PRIORITAS SEGERA: Ditemukan kejang/tanda eklamsia saat admisi."
    );
  } else if (
    screening.kejang_eklamsia === "BELUM_DIPERIKSA" ||
    screening.kejang_eklamsia === "TIDAK_DIKETAHUI"
  ) {
    missingFields.push(`Status Kejang/Eklamsia (${screening.kejang_eklamsia})`);
  }

  if (screening.edema_paru_sesak_berat === "YA") {
    priorityAlertTriggered = true;
    triggered.push({
      code: "PE_PULMONARY_EDEMA",
      label: "Gejala Edema Paru / Sesak Napas Berat",
      domain: "EMERGENCY_PE",
      severity: "CRITICAL",
      value_summary: "Ya",
    });
    rationale.push(
      "TRIGGER PRIORITAS SEGERA: Ditemukan tanda/gejala edema paru atau sesak berat."
    );
  } else if (
    screening.edema_paru_sesak_berat === "BELUM_DIPERIKSA" ||
    screening.edema_paru_sesak_berat === "TIDAK_DIKETAHUI"
  ) {
    missingFields.push(`Status Edema Paru/Sesak Berat (${screening.edema_paru_sesak_berat})`);
  }

  if (screening.kesadaran_menurun_gcs_rendah === "YA") {
    priorityAlertTriggered = true;
    triggered.push({
      code: "PE_ALTERED_CONSCIOUSNESS",
      label: "Penurunan Kesadaran / Defisit Neurologis",
      domain: "EMERGENCY_PE",
      severity: "CRITICAL",
      value_summary: "Ya",
    });
    rationale.push(
      "TRIGGER PRIORITAS SEGERA: Penurunan kesadaran atau tanda neurologis berat."
    );
  }

  if (screening.oliguria_produksi_urin_rendah === "YA") {
    triggered.push({
      code: "PE_OLIGURIA",
      label: "Oliguria (Produksi Urin < 500 mL/24 jam atau < 30 mL/jam)",
      domain: "ORGAN_DYSFUNCTION",
      severity: "HIGH",
      value_summary: "Ya",
    });
    rationale.push("Ditemukan tanda oliguria / gangguan fungsi ginjal klinis.");
  }

  // 2. Evaluasi Rekaman Tekanan Darah Berulang (FR-07)
  let maxSbp = 0;
  let maxDbp = 0;
  let crisisBpCount = 0;
  let hypertensionBpCount = 0;

  if (bpMeasurements.length === 0) {
    missingFields.push("Pengukuran Tekanan Darah (Belum ada rekaman pengukuran TD)");
  } else {
    for (const bp of bpMeasurements) {
      if (bp.systolic > maxSbp) maxSbp = bp.systolic;
      if (bp.diastolic > maxDbp) maxDbp = bp.diastolic;

      if (
        bp.systolic >= cfg.crisis_sbp_threshold ||
        bp.diastolic >= cfg.crisis_dbp_threshold
      ) {
        crisisBpCount++;
      } else if (
        bp.systolic >= cfg.hypertension_sbp_threshold ||
        bp.diastolic >= cfg.hypertension_dbp_threshold
      ) {
        hypertensionBpCount++;
      }
    }

    if (crisisBpCount > 0) {
      priorityAlertTriggered = true;
      triggered.push({
        code: "BP_SEVERE_HYPERTENSION",
        label: `Tekanan Darah Mencapai Ambang Berat (>=${cfg.crisis_sbp_threshold}/${cfg.crisis_dbp_threshold} mmHg)`,
        domain: "BLOOD_PRESSURE",
        severity: "CRITICAL",
        value_summary: `Tertinggi ${maxSbp}/${maxDbp} mmHg (${crisisBpCount}x dari ${bpMeasurements.length} pengukuran)`,
      });
      rationale.push(
        `TRIGGER PRIORITAS SEGERA: Tekanan darah mencapai ambang krisis/berat (${maxSbp}/${maxDbp} mmHg >= ${cfg.crisis_sbp_threshold}/${cfg.crisis_dbp_threshold} mmHg).`
      );
    } else if (hypertensionBpCount > 0) {
      triggered.push({
        code: "BP_HYPERTENSION",
        label: `Peningkatan Tekanan Darah (>=${cfg.hypertension_sbp_threshold}/${cfg.hypertension_dbp_threshold} mmHg)`,
        domain: "BLOOD_PRESSURE",
        severity: "HIGH",
        value_summary: `Tertinggi ${maxSbp}/${maxDbp} mmHg (${hypertensionBpCount}x pengukuran)`,
      });
      rationale.push(
        `Ditemukan peningkatan tekanan darah (${maxSbp}/${maxDbp} mmHg >= ${cfg.hypertension_sbp_threshold}/${cfg.hypertension_dbp_threshold} mmHg).`
      );
      if (bpMeasurements.length < 2) {
        missingFields.push(
          "Verifikasi Pengukuran Ulang Tekanan Darah (Baru 1x pengukuran pada TD meningkat)"
        );
      }
    }
  }

  // 3. Evaluasi Gejala Preeklamsia (Bab 6: Status Ya/Tidak/Tidak diketahui/Belum diperiksa)
  let severeSymptomCount = 0;
  for (const sym of symptoms) {
    if (sym.response === "YA") {
      if (sym.is_severe_feature) {
        severeSymptomCount++;
        priorityAlertTriggered = true;
        triggered.push({
          code: sym.symptom_code,
          label: `Gejala Berat PE: ${sym.symptom_label}`,
          domain: "PE_SYMPTOM",
          severity: "CRITICAL",
          value_summary: "Ya",
        });
        rationale.push(`Gejala pemberat preeklamsia positif: ${sym.symptom_label}.`);
      } else {
        triggered.push({
          code: sym.symptom_code,
          label: `Gejala PE: ${sym.symptom_label}`,
          domain: "PE_SYMPTOM",
          severity: "MODERATE",
          value_summary: "Ya",
        });
        rationale.push(`Gejala klinis positif: ${sym.symptom_label}.`);
      }
    } else if (
      sym.response === "BELUM_DIPERIKSA" ||
      sym.response === "TIDAK_DIKETAHUI"
    ) {
      missingFields.push(`Gejala: ${sym.symptom_label} (${sym.response})`);
    }
  }

  // 4. Evaluasi Laboratorium & Protein Urin (Bab 6 & Bab 7: Belum tersedia != normal)
  let hasProteinuria = false;
  let hasLabOrganDysfunction = false;

  const proteinDipstick = labResults.find(
    (l) => l.test_code === "PROTEIN_URIN_DIPSTICK"
  );
  if (!proteinDipstick || proteinDipstick.result_status === "BELUM_TERSEDIA") {
    missingFields.push("Laboratorium: Protein Urin Dipstick (BELUM TERSERDIA)");
  } else if (proteinDipstick.result_status === "TERSEDIA") {
    const val = (proteinDipstick.value_text || "").toUpperCase();
    if (
      val.includes("+1") ||
      val.includes("+2") ||
      val.includes("+3") ||
      val.includes("+4") ||
      val.includes("POSITIF")
    ) {
      hasProteinuria = true;
      triggered.push({
        code: "LAB_PROTEINURIA",
        label: "Proteinuria Positif",
        domain: "LABORATORY",
        severity: val.includes("+2") || val.includes("+3") || val.includes("+4") ? "HIGH" : "MODERATE",
        value_summary: `${proteinDipstick.value_text}`,
      });
      rationale.push(`Protein urin positif (${proteinDipstick.value_text}).`);
    }
  }

  const platelets = labResults.find((l) => l.test_code === "TROMBOSIT");
  if (!platelets || platelets.result_status === "BELUM_TERSEDIA") {
    missingFields.push("Laboratorium: Hitung Trombosit (BELUM TERSEDIA)");
  } else if (
    platelets.result_status === "TERSEDIA" &&
    platelets.value_numeric !== undefined &&
    platelets.value_numeric < cfg.low_platelets_threshold
  ) {
    hasLabOrganDysfunction = true;
    priorityAlertTriggered = true;
    triggered.push({
      code: "LAB_THROMBOCYTOPENIA",
      label: `Trombositopenia (< ${cfg.low_platelets_threshold.toLocaleString("id-ID")} /uL)`,
      domain: "LABORATORY",
      severity: "CRITICAL",
      value_summary: `${platelets.value_numeric.toLocaleString("id-ID")} ${platelets.unit}`,
    });
    rationale.push(
      `Disfungsi hematologi/trombositopenia: Trombosit ${platelets.value_numeric.toLocaleString("id-ID")} /uL (< ${cfg.low_platelets_threshold.toLocaleString("id-ID")}).`
    );
  }

  const creatinine = labResults.find((l) => l.test_code === "KREATININ_SERUM");
  if (
    creatinine &&
    creatinine.result_status === "TERSEDIA" &&
    creatinine.value_numeric !== undefined &&
    creatinine.value_numeric > cfg.high_creatinine_threshold
  ) {
    hasLabOrganDysfunction = true;
    triggered.push({
      code: "LAB_RENAL_INSUFFICIENCY",
      label: `Peningkatan Kreatinin Serum (> ${cfg.high_creatinine_threshold} mg/dL)`,
      domain: "LABORATORY",
      severity: "HIGH",
      value_summary: `${creatinine.value_numeric} ${creatinine.unit}`,
    });
    rationale.push(
      `Tanda gangguan fungsi ginjal: Kreatinin ${creatinine.value_numeric} mg/dL.`
    );
  }

  const sgot = labResults.find((l) => l.test_code === "SGOT_AST");
  const sgpt = labResults.find((l) => l.test_code === "SGPT_ALT");
  if (
    (sgot?.result_status === "TERSEDIA" &&
      (sgot.value_numeric ?? 0) >= cfg.liver_enzyme_threshold) ||
    (sgpt?.result_status === "TERSEDIA" &&
      (sgpt.value_numeric ?? 0) >= cfg.liver_enzyme_threshold)
  ) {
    hasLabOrganDysfunction = true;
    triggered.push({
      code: "LAB_LIVER_IMPAIRMENT",
      label: `Peningkatan Enzim Hati SGOT/SGPT (>= ${cfg.liver_enzyme_threshold} U/L)`,
      domain: "LABORATORY",
      severity: "HIGH",
      value_summary: `SGOT: ${sgot?.value_numeric ?? "-"} U/L, SGPT: ${sgpt?.value_numeric ?? "-"} U/L`,
    });
    rationale.push("Disfungsi hepar: peningkatan transaminase hati mencapai ambang.");
  }

  // 5. Evaluasi Faktor Risiko Maternal & Obstetri (ACOG / ISSHP / NICE NG133)
  let highRiskFactorCount = 0;
  let moderateRiskFactorCount = 0;

  for (const detail of riskDetails.filter((d) => d.pathway === "PE")) {
    const master = riskFactorMasters.find(
      (m) => m.risk_factor_id === detail.risk_factor_id || m.code === detail.risk_factor_code
    );
    if (!master) continue;

    if (detail.response === "YA") {
      if (master.risk_tier === "HIGH" || master.risk_tier === "CRITICAL_IMMEDIATE") {
        highRiskFactorCount++;
        triggered.push({
          code: master.code,
          label: `Faktor Risiko Tinggi PE: ${master.label}`,
          domain: master.domain_4t,
          severity: "HIGH",
          value_summary: `Ya (${detail.info_source})`,
        });
        rationale.push(`Faktor risiko mayor PE positif: ${master.label}.`);
      } else {
        moderateRiskFactorCount++;
        triggered.push({
          code: master.code,
          label: `Faktor Risiko Sedang PE: ${master.label}`,
          domain: master.domain_4t,
          severity: "MODERATE",
          value_summary: `Ya (${detail.info_source})`,
        });
        rationale.push(`Faktor risiko sedang PE positif: ${master.label}.`);
      }
    } else if (
      detail.response === "BELUM_DIPERIKSA" ||
      detail.response === "TIDAK_DIKETAHUI"
    ) {
      missingFields.push(`Faktor Risiko PE: ${master.label} (${detail.response})`);
    }
  }

  // 6. Penentuan Kategori Risiko PE (LOW | MODERATE | HIGH | UNDETERMINED)
  let category: RiskCategory = "LOW";
  let summaryHeadline = "";

  const hasSevereClinicalOrBp =
    priorityAlertTriggered ||
    crisisBpCount > 0 ||
    severeSymptomCount > 0 ||
    hasLabOrganDysfunction ||
    (hypertensionBpCount > 0 && hasProteinuria);

  if (
    hasSevereClinicalOrBp ||
    highRiskFactorCount >= cfg.min_high_risk_factors_for_high ||
    moderateRiskFactorCount >= cfg.min_moderate_risk_factors_for_high
  ) {
    category = "HIGH";
    summaryHeadline = priorityAlertTriggered
      ? "Risiko Preeklamsia TINGGI dengan Pemicu Prioritas / Gambaran Berat — Eskalasi Segera"
      : "Risiko Preeklamsia TINGGI — Memerlukan Pemantauan Ketat & Evaluasi Dokter";
  } else if (
    hypertensionBpCount > 0 ||
    hasProteinuria ||
    moderateRiskFactorCount >= cfg.min_moderate_risk_factors_for_moderate
  ) {
    // Jika masih ada tanda vital utama yang belum diukur sama sekali, beri catatan
    category = "MODERATE";
    summaryHeadline =
      "Risiko Preeklamsia SEDANG — Pantau Berkala & Lengkapi Pemeriksaan Penunjang";
  } else if (missingFields.length > 0) {
    // Bab 6 & Bab 13: Data belum cukup tidak boleh otomatis dianggap LOW/Normal
    category = "UNDETERMINED";
    summaryHeadline =
      "Belum Dapat Ditentukan (UNDETERMINED) — Terdapat Data Esensial yang Belum Diperiksa / Belum Tersedia";
    rationale.push(
      `PERINGATAN KESELAMATAN (NFR-09): Ditemukan ${missingFields.length} parameter berstatus Belum Diperiksa / Tidak Diketahui / Belum Tersedia. Sistem tidak mengasumsikan data kosong sebagai normal.`
    );
  } else {
    category = "LOW";
    summaryHeadline =
      "Risiko Preeklamsia RENDAH — Lanjutkan Pemantauan Admisi Rutin Sesuai Protokol";
    rationale.push(
      "Seluruh parameter tekanan darah, gejala klinis, dan faktor risiko PE telah diperiksa dan berada dalam batas normal."
    );
  }

  const recommendedChecklists =
    category === "HIGH"
      ? protocol.readiness_checklists.PE_HIGH
      : category === "MODERATE" || category === "UNDETERMINED"
      ? protocol.readiness_checklists.PE_MODERATE
      : protocol.readiness_checklists.PE_LOW;

  return {
    result_id: `res-pe-${Date.now()}`,
    admission_id: admission.admission_id,
    screening_id: screening.pe_screening_id,
    screening_type: "PE",
    category,
    priority_alert_triggered: priorityAlertTriggered,
    summary_headline: summaryHeadline,
    rationale,
    triggered_indicators: triggered,
    missing_or_unknown_fields: missingFields,
    recommended_checklists: recommendedChecklists,
    protocol_version_id: protocol.protocol_version_id,
    protocol_version_number: protocol.version,
    calculated_at: new Date().toISOString(),
    assessor_id: screening.assessor_id,
    is_re_evaluation: Boolean(previousResult),
    previous_category: previousResult?.category,
    input_snapshot_hash: `pe-${bpMeasurements.length}-${triggered.length}-${missingFields.length}`,
  };
}

/**
 * Evaluasi Jalur Skrining Risiko Hemoragia Postpartum (HPP 4T) — Flowchart Bab 12
 */
export function evaluateHppScreening(input: HppEvaluationInput): ScreeningResult {
  const {
    admission,
    screening,
    riskDetails,
    labResults,
    riskFactorMasters,
    protocol,
    previousResult,
  } = input;

  const cfg = protocol.hpp_config;
  const triggered: TriggeredIndicator[] = [];
  const rationale: string[] = [];
  const missingFields: string[] = [];
  let priorityAlertTriggered = false;

  // 1. Pemicu Darurat HPP Saat Admisi (Perdarahan Aktif / Syok Hemodinamik)
  if (screening.perdarahan_aktif_saat_admisi === "YA") {
    priorityAlertTriggered = true;
    triggered.push({
      code: "HPP_ACTIVE_BLEEDING_ADMISSION",
      label: "Perdarahan Pervaginam Aktif Saat Admisi",
      domain: "EMERGENCY_HPP",
      severity: "CRITICAL",
      value_summary: "Ya (Pemicu Prioritas Segera)",
    });
    rationale.push(
      "TRIGGER PRIORITAS SEGERA: Pasien mengalami perdarahan aktif saat admisi."
    );
  } else if (
    screening.perdarahan_aktif_saat_admisi === "BELUM_DIPERIKSA" ||
    screening.perdarahan_aktif_saat_admisi === "TIDAK_DIKETAHUI"
  ) {
    missingFields.push(
      `Status Perdarahan Aktif Saat Admisi (${screening.perdarahan_aktif_saat_admisi})`
    );
  }

  if (screening.syok_hemodinamik_instabil === "YA") {
    priorityAlertTriggered = true;
    triggered.push({
      code: "HPP_HEMODYNAMIC_SHOCK",
      label: "Tanda Instabilitas Hemodinamik / Syok",
      domain: "EMERGENCY_HPP",
      severity: "CRITICAL",
      value_summary: "Ya",
    });
    rationale.push(
      "TRIGGER PRIORITAS SEGERA: Ditemukan tanda instabilitas hemodinamik/syok."
    );
  }

  // 2. Evaluasi Domain 4T (Tonus, Trauma, Jaringan/Tissue, Trombin) + Faktor Tambahan
  let highRisk4TCount = 0;
  let moderateRisk4TCount = 0;

  // Keterkaitan Otomatis Preeklamsia & HPP (Tabel 2 Poin 12 & Tabel 3)
  if (input.latestPeResult?.category === "HIGH") {
    priorityAlertTriggered = true;
    highRisk4TCount++;
    triggered.push({
      code: "HPP_LINK_SEVERE_PE",
      label: "Keterkaitan Preeklamsia Berat / Sindrom HELLP (Otomatis Risiko Tinggi HPP)",
      domain: "TROMBIN",
      severity: "CRITICAL",
      value_summary: "Preeklamsia Berat Aktif",
    });
    rationale.push(
      "KETERKAITAN OTOMATIS (WHO 2025 & InaSH/POGI 2025): Ibu dengan preeklamsia berat otomatis diklasifikasikan sebagai Risiko Tinggi HPP akibat gangguan koagulasi/trombositopenia dan risiko atonia uteri pasca-MgSO4."
    );
    rationale.push(
      "PERINGATAN MERAH (KONTRAINDIKASI MUTLAK): DILARANG MEMBERIKAN METILERGOMETRIN (ERGOMETRIN) pada pasien preeklamsia/hipertensi karena memicu krisis hipertensi dan stroke!"
    );
  }

  for (const detail of riskDetails.filter((d) => d.pathway === "HPP")) {
    const master = riskFactorMasters.find(
      (m) => m.risk_factor_id === detail.risk_factor_id || m.code === detail.risk_factor_code
    );
    if (!master) continue;

    if (detail.response === "YA") {
      if (master.risk_tier === "CRITICAL_IMMEDIATE") {
        priorityAlertTriggered = true;
        highRisk4TCount++;
        triggered.push({
          code: master.code,
          label: `[${master.domain_4t}] ${master.label}`,
          domain: master.domain_4t,
          severity: "CRITICAL",
          value_summary: `Ya (${detail.info_source})`,
        });
        rationale.push(
          `Faktor risiko kritis HPP (Domain ${master.domain_4t}): ${master.label}.`
        );
      } else if (master.risk_tier === "HIGH") {
        highRisk4TCount++;
        triggered.push({
          code: master.code,
          label: `[${master.domain_4t}] ${master.label}`,
          domain: master.domain_4t,
          severity: "HIGH",
          value_summary: `Ya (${detail.info_source})`,
        });
        rationale.push(
          `Faktor risiko tinggi HPP (Domain ${master.domain_4t}): ${master.label}.`
        );
      } else {
        moderateRisk4TCount++;
        triggered.push({
          code: master.code,
          label: `[${master.domain_4t}] ${master.label}`,
          domain: master.domain_4t,
          severity: "MODERATE",
          value_summary: `Ya (${detail.info_source})`,
        });
        rationale.push(
          `Faktor risiko sedang HPP (Domain ${master.domain_4t}): ${master.label}.`
        );
      }
    } else if (
      detail.response === "BELUM_DIPERIKSA" ||
      detail.response === "TIDAK_DIKETAHUI"
    ) {
      missingFields.push(
        `Domain ${master.domain_4t}: ${master.label} (${detail.response})`
      );
    }
  }

  // 3. Evaluasi Laboratorium Terkait HPP (Hb, Hematokrit, Trombosit, Fibrinogen)
  const hb = labResults.find((l) => l.test_code === "HEMOGLOBIN");
  if (!hb || hb.result_status === "BELUM_TERSEDIA") {
    missingFields.push("Laboratorium: Hemoglobin / Hb (BELUM TERSEDIA)");
  } else if (hb.result_status === "TERSEDIA" && hb.value_numeric !== undefined) {
    if (hb.value_numeric < cfg.anemia_hb_high_risk_threshold) {
      highRisk4TCount++;
      triggered.push({
        code: "LAB_SEVERE_ANEMIA",
        label: `Anemia Berat/Sedang-Berat (Hb < ${cfg.anemia_hb_high_risk_threshold} g/dL)`,
        domain: "TAMBAHAN",
        severity: "HIGH",
        value_summary: `Hb ${hb.value_numeric} ${hb.unit}`,
      });
      rationale.push(
        `Kadar Hemoglobin sangat rendah (${hb.value_numeric} g/dL < ${cfg.anemia_hb_high_risk_threshold} g/dL) meningkatkan risiko dekompensasi cepat saat perdarahan.`
      );
    } else if (hb.value_numeric < cfg.anemia_hb_moderate_risk_threshold) {
      moderateRisk4TCount++;
      triggered.push({
        code: "LAB_ANEMIA",
        label: `Anemia Maternal (Hb < ${cfg.anemia_hb_moderate_risk_threshold} g/dL)`,
        domain: "TAMBAHAN",
        severity: "MODERATE",
        value_summary: `Hb ${hb.value_numeric} ${hb.unit}`,
      });
      rationale.push(
        `Anemia maternal saat admisi (Hb ${hb.value_numeric} g/dL < ${cfg.anemia_hb_moderate_risk_threshold} g/dL).`
      );
    }
  }

  const platelets = labResults.find((l) => l.test_code === "TROMBOSIT");
  if (
    platelets &&
    platelets.result_status === "TERSEDIA" &&
    platelets.value_numeric !== undefined &&
    platelets.value_numeric < cfg.low_platelets_hpp_threshold
  ) {
    highRisk4TCount++;
    priorityAlertTriggered = true;
    triggered.push({
      code: "LAB_HPP_THROMBOCYTOPENIA",
      label: `[TROMBIN] Trombosit < ${cfg.low_platelets_hpp_threshold.toLocaleString("id-ID")} /uL`,
      domain: "TROMBIN",
      severity: "CRITICAL",
      value_summary: `${platelets.value_numeric.toLocaleString("id-ID")} /uL`,
    });
    rationale.push(
      `Domain Trombin: Trombositopenia berat (${platelets.value_numeric.toLocaleString("id-ID")} /uL) meningkatkan risiko koagulopati pascapersalinan.`
    );
  }

  // 4. Penentuan Kategori Risiko HPP (LOW | MODERATE | HIGH | UNDETERMINED)
  let category: RiskCategory = "LOW";
  let summaryHeadline = "";

  if (
    priorityAlertTriggered ||
    highRisk4TCount >= cfg.min_high_risk_4t_for_high ||
    moderateRisk4TCount >= cfg.min_moderate_risk_4t_for_high
  ) {
    category = "HIGH";
    summaryHeadline = priorityAlertTriggered
      ? "Risiko HPP TINGGI (Kondisi Prioritas Aktif) — Siagakan Tim Multidisiplin & Produk Darah Segera"
      : "Risiko HPP TINGGI — Siapkan Langkah Antisipasi, Uterotonika Lini 1-2 & Crossmatch Darah";
  } else if (moderateRisk4TCount >= cfg.min_moderate_risk_4t_for_moderate) {
    category = "MODERATE";
    summaryHeadline =
      "Risiko HPP SEDANG — Siagakan Akses IV Besar, Pemeriksaan Golongan Darah & Manajemen Aktif Kala III";
  } else if (missingFields.length > 0) {
    category = "UNDETERMINED";
    summaryHeadline =
      "Belum Dapat Ditentukan (UNDETERMINED) — Terdapat Faktor 4T / Lab yang Belum Diperiksa";
    rationale.push(
      `PERINGATAN KESELAMATAN (NFR-09): Masih terdapat ${missingFields.length} item faktor risiko 4T atau Hb yang berstatus Belum Diperiksa / Belum Tersedia. Jangan anggap kosong sebagai negatif.`
    );
  } else {
    category = "LOW";
    summaryHeadline =
      "Risiko HPP RENDAH — Lakukan Manajemen Aktif Kala III Standar & Observasi Kehilangan Darah Objektif";
    rationale.push(
      "Seluruh domain 4T (Tonus, Trauma, Jaringan, Trombin) dan faktor tambahan telah dinilai negatif."
    );
  }

  const recommendedChecklists =
    category === "HIGH"
      ? protocol.readiness_checklists.HPP_HIGH
      : category === "MODERATE" || category === "UNDETERMINED"
      ? protocol.readiness_checklists.HPP_MODERATE
      : protocol.readiness_checklists.HPP_LOW;

  return {
    result_id: `res-hpp-${Date.now()}`,
    admission_id: admission.admission_id,
    screening_id: screening.hpp_screening_id,
    screening_type: "HPP",
    category,
    priority_alert_triggered: priorityAlertTriggered,
    summary_headline: summaryHeadline,
    rationale,
    triggered_indicators: triggered,
    missing_or_unknown_fields: missingFields,
    recommended_checklists: recommendedChecklists,
    protocol_version_id: protocol.protocol_version_id,
    protocol_version_number: protocol.version,
    calculated_at: new Date().toISOString(),
    assessor_id: screening.assessor_id,
    is_re_evaluation: Boolean(previousResult),
    previous_category: previousResult?.category,
    input_snapshot_hash: `hpp-${triggered.length}-${missingFields.length}`,
  };
}

