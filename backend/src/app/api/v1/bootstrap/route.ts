import { NextResponse } from "next/server";
import { getDb, resetDbToSeed } from "@/lib/store";

export async function GET() {
  const db = getDb();
  const activeProtocol =
    db.clinical_protocols.find((p) => p.status === "ACTIVE") ||
    db.clinical_protocols[0];

  // Enrich admissions with patient, unit, latest PE result, latest HPP result, and active alerts
  const enrichedAdmissions = db.admissions.map((adm) => {
    const patient = db.patients.find((p) => p.patient_id === adm.patient_id);
    const unit = db.units.find((u) => u.unit_id === adm.unit_id);
    const peScreening = db.pe_screenings.find(
      (s) => s.admission_id === adm.admission_id
    );
    const hppScreening = db.hpp_screenings.find(
      (s) => s.admission_id === adm.admission_id
    );
    const peResults = db.screening_results
      .filter(
        (r) => r.admission_id === adm.admission_id && r.screening_type === "PE"
      )
      .sort(
        (a, b) =>
          new Date(b.calculated_at).getTime() -
          new Date(a.calculated_at).getTime()
      );
    const hppResults = db.screening_results
      .filter(
        (r) => r.admission_id === adm.admission_id && r.screening_type === "HPP"
      )
      .sort(
        (a, b) =>
          new Date(b.calculated_at).getTime() -
          new Date(a.calculated_at).getTime()
      );
    const bpList = db.bp_measurements
      .filter((b) => b.admission_id === adm.admission_id)
      .sort((a, b) => a.sequence_number - b.sequence_number);
    const bloodLossList = db.blood_loss_records
      .filter((bl) => bl.admission_id === adm.admission_id)
      .sort(
        (a, b) =>
          new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
      );
    const cumulativeBloodLoss =
      bloodLossList.length > 0
        ? bloodLossList[bloodLossList.length - 1].cumulative_volume_ml
        : 0;
    const openAlerts = db.alerts.filter(
      (al) =>
        al.admission_id === adm.admission_id && al.status !== "RESOLVED"
    );

    return {
      ...adm,
      patient,
      unit,
      pe_screening: peScreening,
      hpp_screening: hppScreening,
      latest_pe_result: peResults[0] || null,
      latest_hpp_result: hppResults[0] || null,
      bp_count: bpList.length,
      latest_bp: bpList[bpList.length - 1] || null,
      cumulative_blood_loss_ml: cumulativeBloodLoss,
      active_alerts_count: openAlerts.length,
    };
  });

  // Compute Cohen's Kappa & Time Metrics for Bab 14
  const totalScenarios = db.concordance_scenarios.length;
  const concordantCount = db.concordance_scenarios.filter(
    (s) => s.is_concordant
  ).length;
  const observedAgreement =
    totalScenarios > 0 ? concordantCount / totalScenarios : 0;
  // Expected chance agreement across 4 categories ~ 0.27
  const expectedAgreement = 0.27;
  const cohensKappa =
    totalScenarios > 0
      ? Number(
          (
            (observedAgreement - expectedAgreement) /
            (1 - expectedAgreement)
          ).toFixed(2)
        )
      : 0;

  const avgManualSeconds =
    totalScenarios > 0
      ? Math.round(
          db.concordance_scenarios.reduce(
            (acc, s) => acc + s.manual_form_seconds,
            0
          ) / totalScenarios
        )
      : 0;
  const avgSigapSeconds =
    totalScenarios > 0
      ? Math.round(
          db.concordance_scenarios.reduce(
            (acc, s) => acc + s.sigap_app_seconds,
            0
          ) / totalScenarios
        )
      : 0;
  const avgSusScore =
    db.sus_responses.length > 0
      ? Number(
          (
            db.sus_responses.reduce(
              (acc, r) => acc + r.calculated_sus_score,
              0
            ) / db.sus_responses.length
          ).toFixed(1)
        )
      : 0;

  return NextResponse.json({
    ok: true,
    active_protocol: activeProtocol,
    enriched_admissions: enrichedAdmissions,
    evaluation_metrics: {
      total_scenarios: totalScenarios,
      concordant_count: concordantCount,
      observed_agreement_percent: Math.round(observedAgreement * 100),
      cohens_kappa: cohensKappa,
      avg_manual_seconds: avgManualSeconds,
      avg_sigap_seconds: avgSigapSeconds,
      time_saved_percent:
        avgManualSeconds > 0
          ? Math.round(
              ((avgManualSeconds - avgSigapSeconds) / avgManualSeconds) * 100
            )
          : 0,
      avg_sus_score: avgSusScore,
    },
    db,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "RESET_SEED") {
    const reset = resetDbToSeed();
    return NextResponse.json({
      ok: true,
      message: "Database berhasil di-reset ke data skenario simulasi awal.",
      db: reset,
    });
  }
  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

