import { NextResponse } from "next/server";
import { evaluateHppScreening } from "@/lib/rule-engine";
import {
  appendAuditLog,
  getDb,
  resolveRequestUser,
  saveDb,
  verifyRolePermission,
} from "@/lib/store";
import {
  AlertRecord,
  ClinicalAction,
  ClinicalItemResponse,
  InfoSource,
  LabAvailabilityStatus,
  LabResult,
  LabTestCode,
  ScreeningRiskDetail,
} from "@/lib/types";

export async function POST(req: Request) {
  const db = getDb();
  const { userId } = resolveRequestUser(req, db);
  const perm = verifyRolePermission(db, userId, "SCREENING_WRITE");
  if (!perm.allowed) {
    return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
  }

  const body = await req.json();
  const { admission_id } = body;
  const now = new Date().toISOString();

  const admission = db.admissions.find((a) => a.admission_id === admission_id);
  if (!admission) {
    return NextResponse.json(
      { ok: false, error: "Episode admisi tidak ditemukan." },
      { status: 404 }
    );
  }

  let hppScreening = db.hpp_screenings.find(
    (s) => s.admission_id === admission_id
  );
  if (!hppScreening) {
    hppScreening = {
      hpp_screening_id: `hpp-scr-${Date.now()}`,
      admission_id,
      screening_time: now,
      started_at: now,
      status: "IN_PROGRESS",
      assessor_id: userId,
      perdarahan_aktif_saat_admisi: "BELUM_DIPERIKSA",
      syok_hemodinamik_instabil: "BELUM_DIPERIKSA",
      rencana_metode_persalinan: "BELUM_DITENTUKAN",
      updated_at: now,
    };
    db.hpp_screenings.unshift(hppScreening);
  }

  if (body.perdarahan_aktif_saat_admisi)
    hppScreening.perdarahan_aktif_saat_admisi =
      body.perdarahan_aktif_saat_admisi;
  if (body.syok_hemodinamik_instabil)
    hppScreening.syok_hemodinamik_instabil = body.syok_hemodinamik_instabil;
  if (body.rencana_metode_persalinan)
    hppScreening.rencana_metode_persalinan = body.rencana_metode_persalinan;
  if (body.clinical_notes !== undefined)
    hppScreening.clinical_notes = body.clinical_notes;

  // Update faktor risiko 4T (Tonus, Trauma, Jaringan, Trombin + Tambahan) dengan 5-status & Sumber Informasi
  if (Array.isArray(body.risk_details)) {
    db.screening_risk_details = db.screening_risk_details.filter(
      (d) => !(d.admission_id === admission_id && d.pathway === "HPP")
    );
    for (const rd of body.risk_details as Array<{
      risk_factor_id: string;
      risk_factor_code: string;
      response: ClinicalItemResponse;
      info_source?: InfoSource;
      note?: string;
    }>) {
      const master = db.risk_factors.find(
        (m) =>
          m.risk_factor_id === rd.risk_factor_id ||
          m.code === rd.risk_factor_code
      );
      if (!master) continue;
      const newDetail: ScreeningRiskDetail = {
        risk_detail_id: `rd-hpp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        screening_id: hppScreening.hpp_screening_id,
        admission_id,
        pathway: "HPP",
        risk_factor_id: master.risk_factor_id,
        risk_factor_code: master.code,
        domain: master.domain_4t,
        response: rd.response,
        info_source: rd.info_source || "ANAMNESIS_PASIEN",
        assessed_at: now,
        note: rd.note,
      };
      db.screening_risk_details.push(newDetail);
    }
  }

  // Update hasil laboratorium terkait HPP (Hb, Trombosit, Fibrinogen, Golongan Darah)
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

  const activeProtocol =
    db.clinical_protocols.find((p) => p.status === "ACTIVE") ||
    db.clinical_protocols[0];
  const patient = db.patients.find((p) => p.patient_id === admission.patient_id);

  const previousResults = db.screening_results
    .filter(
      (r) => r.admission_id === admission_id && r.screening_type === "HPP"
    )
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    );

  const riskDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission_id && d.pathway === "HPP"
  );
  const labResults = db.lab_results.filter(
    (l) => l.admission_id === admission_id
  );

  const latestPeResult = db.screening_results
    .filter(
      (r) => r.admission_id === admission_id && r.screening_type === "PE"
    )
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    )[0];

  const result = evaluateHppScreening({
    admission,
    screening: hppScreening,
    riskDetails,
    labResults,
    riskFactorMasters: db.risk_factors,
    protocol: activeProtocol,
    previousResult: previousResults[0],
    latestPeResult,
  });

  db.screening_results.unshift(result);

  hppScreening.completed_at = now;
  hppScreening.duration_seconds = body.duration_seconds
    ? Number(body.duration_seconds)
    : Math.max(
        60,
        Math.round(
          (new Date(now).getTime() -
            new Date(hppScreening.started_at).getTime()) /
            1000
        )
      );
  hppScreening.status =
    result.missing_or_unknown_fields.length > 0 ? "NEEDS_REVIEW" : "COMPLETED";
  hppScreening.updated_at = now;

  // Sinkronisasi Checklist Kesiapan HPP (FR-13)
  for (const label of result.recommended_checklists) {
    const exists = db.clinical_actions.some(
      (a) =>
        a.admission_id === admission_id &&
        a.pathway === "HPP" &&
        a.action_label === label
    );
    if (!exists) {
      const actionItem: ClinicalAction = {
        action_id: `act-hpp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        admission_id,
        pathway: "HPP",
        action_code: "HPP_CHECKLIST_ITEM",
        action_label: label,
        category_context: result.category,
        status: "PLANNED",
        protocol_version_id: activeProtocol.protocol_version_id,
      };
      db.clinical_actions.push(actionItem);
    }
  }

  let generatedAlert: AlertRecord | null = null;
  if (result.priority_alert_triggered || result.category === "HIGH") {
    generatedAlert = {
      alert_id: `alt-hpp-${Date.now()}`,
      admission_id,
      pathway: "HPP",
      alert_type: result.priority_alert_triggered
        ? "HPP_PRIORITY_EMERGENCY"
        : "HPP_HIGH_RISK",
      severity: result.priority_alert_triggered ? "CRITICAL_PRIORITY" : "HIGH",
      title: `ALERT SKRINING HPP (${result.category}): ${patient?.full_name || "Pasien"}`,
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
    }Skrining HPP 4T ${patient?.full_name} (${patient?.mrn}) -> Kategori ${
      result.category
    } (${result.triggered_indicators.length} faktor pemicu, ${
      result.missing_or_unknown_fields.length
    } data belum tersedia).`,
    protocolVersionRef: activeProtocol.version,
  });

  saveDb(db);

  return NextResponse.json({
    ok: true,
    hpp_screening: hppScreening,
    result,
    alert: generatedAlert,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

