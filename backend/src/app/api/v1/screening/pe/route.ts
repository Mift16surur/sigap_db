import { NextResponse } from "next/server";
import { evaluatePeScreening } from "@/lib/rule-engine";
import {
  appendAuditLog,
  getDb,
  getDbAsync,
  resolveRequestUser,
  saveDb,
  saveDbAsync,
  verifyRolePermission,
} from "@/lib/store";
import {
  AlertRecord,
  BpMeasurement,
  ClinicalAction,
  ClinicalItemResponse,
  InfoSource,
  LabAvailabilityStatus,
  LabResult,
  LabTestCode,
  PeSymptomRecord,
  RiskFactorMaster,
  ScreeningRiskDetail,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const db = await getDbAsync();
  const { userId } = resolveRequestUser(req, db);
  const perm = verifyRolePermission(db, userId, "SCREENING_WRITE");
  if (!perm.allowed) {
    return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
  }

  const body = await req.json();
  const { admission_id, action } = body;
  const now = new Date().toISOString();

  const admission = db.admissions.find((a) => a.admission_id === admission_id);
  if (!admission) {
    return NextResponse.json(
      { ok: false, error: "Episode admisi tidak ditemukan." },
      { status: 404 }
    );
  }

  let peScreening = db.pe_screenings.find(
    (s) => s.admission_id === admission_id
  );
  if (!peScreening) {
    peScreening = {
      pe_screening_id: `pe-scr-${Date.now()}`,
      admission_id,
      screening_time: now,
      started_at: now,
      status: "IN_PROGRESS",
      assessor_id: userId,
      kejang_eklamsia: "BELUM_DIPERIKSA",
      kesadaran_menurun_gcs_rendah: "BELUM_DIPERIKSA",
      edema_paru_sesak_berat: "BELUM_DIPERIKSA",
      oliguria_produksi_urin_rendah: "BELUM_DIPERIKSA",
      updated_at: now,
    };
    db.pe_screenings.unshift(peScreening);
  }

  const activeProtocol =
    db.clinical_protocols.find((p) => p.status === "ACTIVE") ||
    db.clinical_protocols[0];
  const patient = db.patients.find((p) => p.patient_id === admission.patient_id);

  // Aksi 1: Tambah Rekaman Pengukuran Tekanan Darah Baru (FR-07: Append-Only, tidak menimpa!)
  if (action === "ADD_BP_MEASUREMENT") {
    const existingBps = db.bp_measurements.filter(
      (b) => b.admission_id === admission_id
    );
    const seq = existingBps.length + 1;
    const sbp = Number(body.systolic);
    const dbp = Number(body.diastolic);
    const map = Math.round((sbp + 2 * dbp) / 3);

    const newBp: BpMeasurement = {
      bp_id: `bp-${Date.now()}`,
      pe_screening_id: peScreening.pe_screening_id,
      admission_id,
      sequence_number: seq,
      systolic: sbp,
      diastolic: dbp,
      mean_arterial_pressure: map,
      heart_rate: body.heart_rate ? Number(body.heart_rate) : undefined,
      measured_at: body.measured_at || now,
      position: body.position || "DUDUK_BERSANDAR",
      cuff_size: body.cuff_size || "STANDAR_DEWASA",
      is_repeat_verification: seq > 1,
      assessor_id: userId,
      note: body.note || `Pengukuran TD ke-${seq}`,
    };
    db.bp_measurements.push(newBp);

    let preemptiveAlert: AlertRecord | null = null;
    if (
      sbp >= activeProtocol.pe_config.crisis_sbp_threshold ||
      dbp >= activeProtocol.pe_config.crisis_dbp_threshold
    ) {
      // FR-12: Alert prioritas tidak menunggu form lengkap!
      preemptiveAlert = {
        alert_id: `alt-bp-${Date.now()}`,
        admission_id,
        pathway: "PE",
        alert_type: "PREEMPTIVE_SEVERE_HYPERTENSION",
        severity: "CRITICAL_PRIORITY",
        title: `ALERT PRIORITAS SEGERA: Tekanan Darah Krisis (${sbp}/${dbp} mmHg) pada Pengukuran #${seq}`,
        message: `${patient?.full_name || "Pasien"} (${patient?.mrn || "-"}) mengalami TD ${sbp}/${dbp} mmHg (MAP ${map} mmHg) mencapai ambang berat (>=${activeProtocol.pe_config.crisis_sbp_threshold}/${activeProtocol.pe_config.crisis_dbp_threshold} mmHg). Hubungi dokter/tim PONEK segera tanpa menunggu form selesai!`,
        trigger_indicators: [
          `TD Pengukuran #${seq}: ${sbp}/${dbp} mmHg (Posisi: ${newBp.position})`,
        ],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: now,
        triggered_by_user_id: userId,
      };
      db.alerts.unshift(preemptiveAlert);

      appendAuditLog(db, {
        userId,
        entity: "alerts",
        entityId: preemptiveAlert.alert_id,
        action: "TRIGGER_PRIORITY_ALERT",
        changeSummary: `Alert Prioritas Seketika (Pre-emptive) terpicu saat input TD #${seq} (${sbp}/${dbp} mmHg) pada ${patient?.full_name}.`,
        protocolVersionRef: activeProtocol.version,
      });
    } else {
      appendAuditLog(db, {
        userId,
        entity: "bp_measurements",
        entityId: newBp.bp_id,
        action: "CREATE",
        changeSummary: `Menambahkan rekaman pengukuran TD ke-${seq} (${sbp}/${dbp} mmHg, ${newBp.position}) untuk ${patient?.full_name} tanpa menimpa rekaman sebelumnya (FR-07).`,
      });
    }

    await saveDbAsync(db);
    return NextResponse.json({
      ok: true,
      bp_measurement: newBp,
      preemptive_alert: preemptiveAlert,
    });
  }

  // Aksi 2: Evaluasi Penuh & Simpan Skrining PE (FR-06, FR-09, FR-10, FR-11, Bab 7)
  if (body.kejang_eklamsia) peScreening.kejang_eklamsia = body.kejang_eklamsia;
  if (body.kesadaran_menurun_gcs_rendah)
    peScreening.kesadaran_menurun_gcs_rendah = body.kesadaran_menurun_gcs_rendah;
  if (body.edema_paru_sesak_berat)
    peScreening.edema_paru_sesak_berat = body.edema_paru_sesak_berat;
  if (body.oliguria_produksi_urin_rendah)
    peScreening.oliguria_produksi_urin_rendah =
      body.oliguria_produksi_urin_rendah;
  if (body.clinical_notes !== undefined)
    peScreening.clinical_notes = body.clinical_notes;

  // Simpan pengukuran tekanan darah (Dua Kali Pengukuran) bila dikirim dari form terpadu
  if (Array.isArray(body.bp_measurements) && body.bp_measurements.length > 0) {
    db.bp_measurements = db.bp_measurements.filter(
      (b) => b.admission_id !== admission_id
    );
    body.bp_measurements.forEach((bp: any, idx: number) => {
      const sbp = Number(bp.systolic);
      const dbp = Number(bp.diastolic);
      if (!sbp || !dbp) return;
      const map = Math.round((sbp + 2 * dbp) / 3);
      db.bp_measurements.push({
        bp_id: `bp-${Date.now()}-${idx}`,
        pe_screening_id: peScreening!.pe_screening_id,
        admission_id,
        sequence_number: idx + 1,
        systolic: sbp,
        diastolic: dbp,
        mean_arterial_pressure: map,
        heart_rate: bp.heart_rate ? Number(bp.heart_rate) : undefined,
        measured_at: bp.measured_at || now,
        position: bp.position || "DUDUK_BERSANDAR",
        cuff_size: bp.cuff_size || "STANDAR_DEWASA",
        is_repeat_verification: idx > 0,
        assessor_id: userId,
        note: bp.note || (idx === 0 ? "Pengukuran TD ke-1 (Awal Admisi)" : "Pengukuran TD ke-2 (Konfirmasi/Ulang)"),
      });
    });
  }

  // Update gejala PE (5-status eksplisit)
  if (Array.isArray(body.symptoms)) {
    for (const symInput of body.symptoms as Array<{
      symptom_code: string;
      symptom_label: string;
      is_severe_feature: boolean;
      response: ClinicalItemResponse;
      onset_description?: string;
    }>) {
      const existingSym = db.pe_symptoms.find(
        (s) =>
          s.pe_screening_id === peScreening!.pe_screening_id &&
          s.symptom_code === symInput.symptom_code
      );
      if (existingSym) {
        existingSym.response = symInput.response;
        existingSym.assessed_at = now;
        existingSym.onset_description = symInput.onset_description;
      } else {
        const createdSym: PeSymptomRecord = {
          pe_symptom_id: `sym-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pe_screening_id: peScreening.pe_screening_id,
          symptom_code: symInput.symptom_code,
          symptom_label: symInput.symptom_label,
          is_severe_feature: symInput.is_severe_feature,
          response: symInput.response,
          assessed_at: now,
          onset_description: symInput.onset_description,
        };
        db.pe_symptoms.push(createdSym);
      }
    }
  }

  const allCriteria = (db.master_catalog?.clinical_screening_criteria || []) as Array<{
    criterion_id: string;
    domain_id: string;
    label: string;
    risk_tier: string;
    pathway: string;
    category_note?: string;
    active_status?: boolean;
  }>;

  const combinedRiskMasters: RiskFactorMaster[] = [
    ...db.risk_factors,
    ...allCriteria.map((c) => ({
      risk_factor_id: c.criterion_id,
      code: c.criterion_id,
      screening_pathway: (c.pathway === "ALL" ? ("PE" as const) : c.pathway) as any,
      domain_4t: (c.domain_id as any) || "PE_HIGH_RISK",
      risk_tier: (c.risk_tier as any) || "MODERATE",
      default_weight: c.risk_tier === "HIGH" ? 2 : 1,
      label: c.label,
      definition: c.label,
      clinical_rationale: c.category_note || "",
      active_status: c.active_status !== false,
    })),
  ];

  // Update faktor risiko PE (5-status eksplisit + sumber informasi)
  if (Array.isArray(body.risk_details)) {
    db.screening_risk_details = db.screening_risk_details.filter(
      (d) => !(d.admission_id === admission_id && d.pathway === "PE")
    );
    for (const rd of body.risk_details as Array<{
      risk_factor_id: string;
      risk_factor_code: string;
      domain?: string;
      response: ClinicalItemResponse;
      info_source?: InfoSource;
      note?: string;
    }>) {
      const master = combinedRiskMasters.find(
        (m) =>
          m.risk_factor_id === rd.risk_factor_id ||
          m.code === rd.risk_factor_code
      );
      const crit = allCriteria.find(
        (c) =>
          c.criterion_id === rd.risk_factor_id ||
          c.criterion_id === rd.risk_factor_code
      );
      const newDetail: ScreeningRiskDetail = {
        risk_detail_id: `rd-pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        screening_id: peScreening.pe_screening_id,
        admission_id,
        pathway: "PE",
        risk_factor_id: master?.risk_factor_id || crit?.criterion_id || rd.risk_factor_id,
        risk_factor_code: master?.code || crit?.criterion_id || rd.risk_factor_code || rd.risk_factor_id,
        domain: (master?.domain_4t || (crit?.domain_id as any) || (rd.domain as any) || "PE_HIGH_RISK") as any,
        response: rd.response,
        info_source: rd.info_source || "ANAMNESIS_PASIEN",
        assessed_at: now,
        note: rd.note || master?.label || crit?.label || "",
      };
      db.screening_risk_details.push(newDetail);
    }
  }

  // Update hasil laboratorium (Bab 6 & 7: TERSEDIA vs BELUM_TERSEDIA)
  if (Array.isArray(body.labs)) {
    for (const labInput of body.labs as Array<{
      test_code: LabTestCode;
      test_name: string;
      result_status: LabAvailabilityStatus;
      value_numeric?: number;
      value_text?: string;
      unit: string;
      reference_range: string;
    }>) {
      const existingLab = db.lab_results.find(
        (l) =>
          l.admission_id === admission_id && l.test_code === labInput.test_code
      );
      if (existingLab) {
        existingLab.result_status = labInput.result_status;
        existingLab.value_numeric = labInput.value_numeric;
        existingLab.value_text = labInput.value_text;
        existingLab.collected_at =
          labInput.result_status === "TERSEDIA" ? now : undefined;
        existingLab.recorded_by = userId;
      } else {
        const newLab: LabResult = {
          lab_id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          admission_id,
          test_code: labInput.test_code,
          test_name: labInput.test_name,
          result_status: labInput.result_status,
          value_numeric: labInput.value_numeric,
          value_text: labInput.value_text,
          unit: labInput.unit,
          reference_range: labInput.reference_range,
          collected_at:
            labInput.result_status === "TERSEDIA" ? now : undefined,
          recorded_by: userId,
        };
        db.lab_results.push(newLab);
      }
    }
  }

  // Jalankan Mesin Aturan PE Berversi
  const previousResults = db.screening_results
    .filter((r) => r.admission_id === admission_id && r.screening_type === "PE")
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    );

  const bpMeasurements = db.bp_measurements
    .filter((b) => b.admission_id === admission_id)
    .sort((a, b) => a.sequence_number - b.sequence_number);
  const symptoms = db.pe_symptoms.filter(
    (s) => s.pe_screening_id === peScreening!.pe_screening_id
  );
  const riskDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission_id && d.pathway === "PE"
  );
  const labResults = db.lab_results.filter(
    (l) => l.admission_id === admission_id
  );

  const result = evaluatePeScreening({
    admission,
    screening: peScreening,
    bpMeasurements,
    symptoms,
    riskDetails,
    labResults,
    riskFactorMasters: combinedRiskMasters,
    protocol: activeProtocol,
    previousResult: previousResults[0],
  });

  db.screening_results.unshift(result);

  peScreening.completed_at = now;
  peScreening.duration_seconds = body.duration_seconds
    ? Number(body.duration_seconds)
    : Math.max(
        60,
        Math.round(
          (new Date(now).getTime() -
            new Date(peScreening.started_at).getTime()) /
            1000
        )
      );
  peScreening.status = "COMPLETED";
  peScreening.updated_at = now;

  // Sinkronisasi Checklist Kesiapan Fasilitas (FR-13)
  for (const label of result.recommended_checklists) {
    const exists = db.clinical_actions.some(
      (a) =>
        a.admission_id === admission_id &&
        a.pathway === "PE" &&
        a.action_label === label
    );
    if (!exists) {
      const actionItem: ClinicalAction = {
        action_id: `act-pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        admission_id,
        pathway: "PE",
        action_code: "PE_CHECKLIST_ITEM",
        action_label: label,
        category_context: result.category,
        status: "PLANNED",
        protocol_version_id: activeProtocol.protocol_version_id,
      };
      db.clinical_actions.push(actionItem);
    }
  }

  // Simpan / Perbarui Checklist Bundle SOP Tindakan Nakes yang telah dilaksanakan (DONE)
  if (Array.isArray(body.executed_actions)) {
    for (const exec of body.executed_actions) {
      const existing = db.clinical_actions.find(
        (a) =>
          a.admission_id === admission_id &&
          a.pathway === "PE" &&
          (a.action_code === exec.action_code || a.action_label === exec.action_label)
      );
      if (existing) {
        existing.status = "DONE";
        existing.performed_by = userId;
        existing.performed_at = exec.performed_at || exec.executed_at || now;
      } else {
        db.clinical_actions.push({
          action_id: `act-pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          admission_id,
          pathway: "PE",
          action_code: exec.action_code || "PE_CHECKLIST_ITEM",
          action_label: exec.action_label,
          category_context: result.category,
          status: "DONE",
          protocol_version_id: activeProtocol.protocol_version_id,
          performed_by: userId,
          performed_at: exec.performed_at || exec.executed_at || now,
        });
      }
    }
  }

  // Terbitkan Alert jika Priority / High Risk (FR-12)
  let generatedAlert: AlertRecord | null = null;
  if (result.priority_alert_triggered || result.category === "HIGH") {
    generatedAlert = {
      alert_id: `alt-pe-${Date.now()}`,
      admission_id,
      pathway: "PE",
      alert_type: result.priority_alert_triggered
        ? "PE_PRIORITY_EMERGENCY"
        : "PE_HIGH_RISK",
      severity: result.priority_alert_triggered ? "CRITICAL_PRIORITY" : "HIGH",
      title: `ALERT SKRINING PE (${result.category}): ${patient?.full_name || "Pasien"}`,
      message: result.summary_headline,
      trigger_indicators: result.triggered_indicators.map(
        (t) => `${t.label}: ${t.value_summary}`
      ),
      is_preemptive_before_complete: Boolean(body.is_preemptive),
      status: "OPEN",
      triggered_at: now,
      triggered_by_user_id: userId,
    };
    db.alerts.unshift(generatedAlert);
  }

  appendAuditLog(db, {
    userId,
    entity: "screening_results",
    entityId: result.result_id,
    action: result.is_re_evaluation
      ? "RE_EVALUATE_AFTER_CHANGE"
      : "EVALUATE_SCREENING",
    changeSummary: `${
      result.is_re_evaluation ? "[Evaluasi Ulang] " : ""
    }Skrining PE ${patient?.full_name} (${patient?.mrn}) -> Kategori ${
      result.category
    } (${result.triggered_indicators.length} pemicu, ${
      result.missing_or_unknown_fields.length
    } data belum tersedia).`,
    protocolVersionRef: activeProtocol.version,
  });

  await saveDbAsync(db);

  return NextResponse.json({
    ok: true,
    pe_screening: peScreening,
    result,
    alert: generatedAlert,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

