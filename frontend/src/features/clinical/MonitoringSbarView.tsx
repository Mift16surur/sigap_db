"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Droplets,
  ExternalLink,
  FileText,
  History,
  MessageSquareWarning,
  PhoneCall,
  Plus,
  Printer,
  Send,
} from "lucide-react";
import { apiRequest, EnrichedAdmission } from "@/services/api-client";
import { RiskCategoryBadge } from "@/components/common/StatusBadge";
import type {
  ActionStatus,
  AlertStatus,
  BloodLossMethod,
  ClinicalProtocol,
  SigapDatabase,
  UserRole,
} from "@/types";

export function MonitoringSbarView({
  admission,
  db,
  activeProtocol,
  currentUserId,
  currentUserRole,
  onRefresh,
}: {
  admission: EnrichedAdmission;
  db: SigapDatabase;
  activeProtocol: ClinicalProtocol;
  currentUserId: string;
  currentUserRole: UserRole;
  onRefresh: () => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<
    "CHECKLIST" | "BLOOD_LOSS" | "VITALS" | "SBAR" | "HISTORY"
  >("CHECKLIST");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const actions = db.clinical_actions.filter(
    (a) => a.admission_id === admission.admission_id
  );
  const bloodLossList = db.blood_loss_records
    .filter((bl) => bl.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );
  const monitoringList = db.monitoring_records
    .filter((m) => m.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(b.observation_time).getTime() -
        new Date(a.observation_time).getTime()
    );
  const sbarList = db.sbar_reports
    .filter((s) => s.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
    );
  const alertsList = db.alerts
    .filter((al) => al.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(b.triggered_at).getTime() -
        new Date(a.triggered_at).getTime()
    );
  const resultsHistory = db.screening_results
    .filter((r) => r.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    );

  const cumulativeBloodLoss =
    bloodLossList.length > 0
      ? bloodLossList[bloodLossList.length - 1].cumulative_volume_ml
      : 0;

  // Form Kehilangan Darah (FR-15)
  const [blVolume, setBlVolume] = useState<number>(200);
  const [blMethod, setBlMethod] = useState<BloodLossMethod>(
    "GRADUATED_DRAPE_UNDERBUTTOCK"
  );
  const [blPhase, setBlPhase] = useState<
    | "ANTEPARTUM"
    | "INTRAPARTUM"
    | "KALA_3"
    | "KALA_4_2JAM_PERTAMA"
    | "POSTPARTUM_LANJUT"
  >("KALA_4_2JAM_PERTAMA");
  const [blDeliveryContext, setBlDeliveryContext] = useState<
    "PERVAGINAM" | "SEKSIO_SESAREA"
  >("PERVAGINAM");
  const [blNotes, setBlNotes] = useState<string>("");

  // Form Monitoring Tanda Vital (FR-14)
  const [monSbp, setMonSbp] = useState<number>(118);
  const [monDbp, setMonDbp] = useState<number>(76);
  const [monHr, setMonHr] = useState<number>(88);
  const [monRr, setMonRr] = useState<number>(20);
  const [monTemp, setMonTemp] = useState<number>(36.7);
  const [monSpo2, setMonSpo2] = useState<number>(99);
  const [monTonus, setMonTonus] = useState<
    "KERAS_BAIK" | "LEMBIK_ATONIA" | "TIDAK_RELEVAN_ANTEPARTUM"
  >("KERAS_BAIK");
  const [monReflex, setMonReflex] = useState<
    "NORMAL_POSITIF" | "HIPERREFLEKSIA" | "NEGATIF_HILANG" | "BELUM_DIPERIKSA"
  >("NORMAL_POSITIF");
  const [monUrine, setMonUrine] = useState<number>(55);
  const [monNotes, setMonNotes] = useState<string>("");

  // Form SBAR Otomatis + Verifikasi Petugas (FR-16)
  const latestPe = admission.latest_pe_result;
  const latestHpp = admission.latest_hpp_result;
  const latestVital = monitoringList[0];

  const [sbarPathway, setSbarPathway] = useState<"PE" | "HPP" | "GABUNGAN">(
    "GABUNGAN"
  );
  const [sbarRecipient, setSbarRecipient] = useState<string>(
    admission.attending_doctor_name ||
      db.master_catalog.doctors[0]?.full_name ||
      "dr. Sari Dewi, Sp.OG"
  );
  const [sbarChannel, setSbarChannel] = useState<
    | "TELEPON_LANGSUNG"
    | "TATAP_MUKA_VISITE"
    | "PESAN_INTERNAL_RS"
    | "SISTEM_SIGAP"
  >("TELEPON_LANGSUNG");
  const [sbarSituation, setSbarSituation] = useState<string>(
    () =>
      `Lapor DPJP untuk pasien ${admission.patient?.full_name} (${admission.patient?.mrn}), usia ${admission.patient?.age_years} th, G${admission.obstetric_history.gravida}P${admission.obstetric_history.para}A${admission.obstetric_history.abortus} UK ${admission.usia_kehamilan_minggu} mgg ${admission.usia_kehamilan_hari} hr di ${admission.unit?.name}. Hasil Skrining PE: ${latestPe?.category || "BELUM DINILAI"} | Hasil Skrining HPP: ${latestHpp?.category || "BELUM DINILAI"}.`
  );
  const [sbarBackground, setSbarBackground] = useState<string>(
    () =>
      `Keluhan masuk: ${admission.keluhan_utama}. ${admission.obstetric_history.catatan_komorbid || "Tidak ada catatan komorbid tambahan."}`
  );
  const [sbarAssessment, setSbarAssessment] = useState<string>(
    () =>
      `TD terakhir: ${admission.latest_bp ? `${admission.latest_bp.systolic}/${admission.latest_bp.diastolic} mmHg (Rekaman #${admission.bp_count})` : "Belum diukur"}. Kehilangan darah objektif kumulatif: ${cumulativeBloodLoss} mL. ${latestVital ? `Observasi terakhir: HR ${latestVital.heart_rate} x/mnt, Shock Index ${latestVital.shock_index}, Tonus Uterus: ${latestVital.uterine_tonus}.` : ""}`
  );
  const [sbarRecommendation, setSbarRecommendation] = useState<string>(
    "Mohon evaluasi dan konfirmasi tindak lanjut sesuai protokol PONEK RS serta kesiapan tim multidisiplin."
  );
  const [sbarVerified, setSbarVerified] = useState<boolean>(false);
  const [doctorResponseInput, setDoctorResponseInput] = useState<
    Record<string, string>
  >({});

  async function handleUpdateActionStatus(
    actionId: string,
    status: ActionStatus
  ) {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "UPDATE_ACTION_STATUS",
          admission_id: admission.admission_id,
          action_id: actionId,
          status,
        },
      });
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateAlertStatus(alertId: string, status: AlertStatus) {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "UPDATE_ALERT_STATUS",
          admission_id: admission.admission_id,
          alert_id: alertId,
          status,
        },
      });
      await onRefresh();
      setFeedbackMsg(`Status Alert diperbarui menjadi ${status}.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddBloodLoss() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "ADD_BLOOD_LOSS_RECORD",
          admission_id: admission.admission_id,
          volume_ml: blVolume,
          method: blMethod,
          phase: blPhase,
          delivery_mode_context: blDeliveryContext,
          source_notes: blNotes,
        },
      });
      await onRefresh();
      setBlNotes("");
      setFeedbackMsg(
        `Rekaman perdarahan +${blVolume} mL berhasil dicatat. Total Kumulatif: ${res.cumulative_volume_ml} mL.${
          res.alert ? ` [${res.alert.title}]` : ""
        }`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddVitalMonitoring() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "ADD_MONITORING_RECORD",
          admission_id: admission.admission_id,
          systolic: monSbp,
          diastolic: monDbp,
          heart_rate: monHr,
          respiratory_rate: monRr,
          temperature_c: monTemp,
          spo2_percent: monSpo2,
          uterine_tonus: monTonus,
          patellar_reflex: monReflex,
          urine_output_ml_per_hour: monUrine,
          notes: monNotes,
        },
      });
      await onRefresh();
      setMonNotes("");
      setFeedbackMsg(
        `Observasi tanda vital berhasil disimpan (Shock Index: ${res.monitoring_record.shock_index}).`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSbar() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "CREATE_SBAR_REPORT",
          admission_id: admission.admission_id,
          pathway: sbarPathway,
          recipient_doctor_name: sbarRecipient,
          communication_channel: sbarChannel,
          situation: sbarSituation,
          background: sbarBackground,
          assessment: sbarAssessment,
          recommendation: sbarRecommendation,
          verified_by_staff: sbarVerified,
        },
      });
      await onRefresh();
      setSbarVerified(false);
      setFeedbackMsg(
        "Ringkasan eskalasi SBAR terverifikasi berhasil disimpan dan dicatat dalam Audit Log (FR-16)."
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleCopySbarText = () => {
    const fullText = `*LAPORAN ESKALASI KLINIS SBAR — SIGAP RS*
Kepada: ${sbarRecipient}
Pasien: ${admission.patient?.full_name} (RM: ${admission.patient?.mrn})
Ruangan: ${admission.unit?.name || "Kamar Bersalin (VK)"}

*S (Situation):*
${sbarSituation}

*B (Background):*
${sbarBackground}

*A (Assessment):*
${sbarAssessment}

*R (Recommendation):*
${sbarRecommendation}

_Dilaporkan via SIGAP Clinical Risk System_`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setFeedbackMsg("Teks laporan SBAR berhasil disalin ke clipboard!");
    }
  };

  const handleOpenWhatsApp = () => {
    const doc = db.master_catalog.doctors.find((d) => d.full_name === sbarRecipient);
    const phone = doc?.phone?.replace(/[^0-9]/g, "") || "";
    const cleanPhone = phone.startsWith("0") ? "62" + phone.slice(1) : phone;
    const fullText = `*LAPORAN ESKALASI KLINIS SBAR — SIGAP RS*
Kepada: ${sbarRecipient}
Pasien: ${admission.patient?.full_name} (RM: ${admission.patient?.mrn})
Ruangan: ${admission.unit?.name || "Kamar Bersalin (VK)"}

*S (Situation):*
${sbarSituation}

*B (Background):*
${sbarBackground}

*A (Assessment):*
${sbarAssessment}

*R (Recommendation):*
${sbarRecommendation}

_Dilaporkan via SIGAP Clinical Risk System_`;
    window.open(
      `https://wa.me/${cleanPhone || "628112200889"}?text=${encodeURIComponent(
        fullText
      )}`,
      "_blank"
    );
  };

  async function handleRespondSbar(sbarId: string) {
    const respText = doctorResponseInput[sbarId];
    if (!respText) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/monitoring", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "RESPOND_SBAR_REPORT",
          admission_id: admission.admission_id,
          sbar_id: sbarId,
          doctor_feedback_response: respText,
        },
      });
      await onRefresh();
      setFeedbackMsg(
        "Evaluasi dan instruksi tindak lanjut dokter berhasil disimpan."
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Profil Pasien & Ringkasan 2 Jalur Independen (Serasi dengan Menu Skrining) */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar Inisial Bulat Biru Besar */}
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
              {admission.patient?.full_name?.charAt(0).toUpperCase() || "P"}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {admission.patient?.full_name || "NAMA PASIEN"}
                </h2>
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  RM {admission.patient?.mrn || "-"}
                </span>
                <span className="rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 text-xs font-bold">
                  {admission.admission_code}
                </span>
                <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ADMISI AKTIF
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {admission.patient?.age_years || "-"} Th •{" "}
                  <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                    G{admission.obstetric_history.gravida}P{admission.obstetric_history.para}A{admission.obstetric_history.abortus}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  UK: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{admission.usia_kehamilan_minggu} mgg {admission.usia_kehamilan_hari} hr</strong>
                </span>
                <span>•</span>
                <span>
                  Ruang Rawat:{" "}
                  <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                    {admission.unit?.name || "Kamar Bersalin (VK)"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-slate-800/40 px-3 py-2 text-center shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Kategori Preeklamsia (PE)
              </div>
              <div className="mt-1 flex justify-center">
                <RiskCategoryBadge category={latestPe?.category} size="sm" />
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-slate-800/40 px-3 py-2 text-center shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Kategori Risiko HPP (4T)
              </div>
              <div className="mt-1 flex justify-center">
                <RiskCategoryBadge category={latestHpp?.category} size="sm" />
              </div>
            </div>
            <div className="rounded-xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-3.5 py-2 text-center shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                Perdarahan Kumulatif (FR-15)
              </div>
              <div className="text-sm font-black text-rose-900 dark:text-rose-100 mt-0.5">
                {cumulativeBloodLoss} mL
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs (Identik dengan Menu Skrining) */}
        <div className="flex flex-wrap gap-2.5 pt-3.5 border-t border-blue-100 dark:border-blue-900/60">
          {[
            {
              id: "CHECKLIST",
              label: `Checklist Kesiapan & Alert (${alertsList.filter((a) => a.status !== "RESOLVED").length})`,
              icon: ClipboardCheck,
            },
            {
              id: "BLOOD_LOSS",
              label: `Kehilangan Darah Kumulatif (${cumulativeBloodLoss} mL)`,
              icon: Droplets,
            },
            {
              id: "VITALS",
              label: `Monitoring Tanda Vital & Shock Index (${monitoringList.length})`,
              icon: Activity,
            },
            {
              id: "SBAR",
              label: `Komunikasi Eskalasi SBAR (${sbarList.length})`,
              icon: MessageSquareWarning,
            },
            {
              id: "HISTORY",
              label: `Riwayat Skrining & Cetak Simulasi (${resultsHistory.length})`,
              icon: History,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-xs font-black"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900">
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-medium text-red-900">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: CHECKLIST KESIAPAN & MANAJEMEN ALERT (FR-12, FR-13, Bab 13) */}
      {subTab === "CHECKLIST" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Daftar Alert Episode Ini */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-600" />
                <span>Manajemen Alert & Siklus Acknowledgment</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Siklus penanganan kegawatdaruratan (Bab 13): <strong>OPEN</strong> &rarr; <strong>ACKNOWLEDGED</strong> &rarr; <strong>ESCALATED</strong> &rarr; <strong>RESOLVED</strong>.
            </p>

            {alertsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 italic">
                Tidak ada alert aktif pada episode admisi ini.
              </div>
            ) : (
              <div className="space-y-3">
                {alertsList.map((al) => (
                  <div
                    key={al.alert_id}
                    className={`rounded-xl border-2 p-4 space-y-2.5 transition-all shadow-2xs ${
                      al.status === "RESOLVED"
                        ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-75"
                        : al.severity === "CRITICAL_PRIORITY"
                        ? "border-rose-400 bg-rose-50/80 dark:bg-rose-950/40"
                        : "border-amber-400 bg-amber-50/80 dark:bg-amber-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-900 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-white">
                            Status: {al.status}
                          </span>
                          {al.is_preemptive_before_complete && (
                            <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Pre-emptive Priority Alert (FR-12)
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                          {al.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(al.triggered_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{al.message}</p>
                    {al.acknowledged_by && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Di-acknowledge oleh: <strong>{al.acknowledged_by}</strong>
                        {al.escalated_to && (
                          <>
                            {" "}
                            • Dieskalasikan ke: <strong>{al.escalated_to}</strong>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {al.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAlertStatus(al.alert_id, "ACKNOWLEDGED")
                          }
                          disabled={submitting}
                          className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                        >
                          Acknowledge Alert
                        </button>
                      )}
                      {(al.status === "OPEN" ||
                        al.status === "ACKNOWLEDGED") && (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateAlertStatus(al.alert_id, "ESCALATED");
                            setSubTab("SBAR");
                          }}
                          disabled={submitting}
                          className="rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                        >
                          Eskalasi & Susun SBAR
                        </button>
                      )}
                      {al.status !== "RESOLVED" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAlertStatus(al.alert_id, "RESOLVED")
                          }
                          disabled={submitting}
                          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all active:scale-95"
                        >
                          Tandai Selesai (Resolved)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Daftar Checklist Kesiapan Fasilitas (FR-13) */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Checklist Kesiapan & Tindak Lanjut Fasilitas (FR-13 & Bab 13)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Status pelaksanaan: <strong>PLANNED</strong>, <strong>IN_PROGRESS</strong>, <strong>DONE</strong>, atau <strong>NOT_APPLICABLE</strong>.
                </p>
              </div>
            </div>

            {actions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 italic">
                Belum ada item checklist kesiapan. Jalankan evaluasi skrining PE atau HPP terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((act) => (
                  <div
                    key={act.action_id}
                    className={`rounded-xl border-2 p-3.5 space-y-2 transition-all shadow-2xs ${
                      act.status === "DONE"
                        ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                        : act.status === "IN_PROGRESS"
                        ? "border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            act.pathway === "PE"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200"
                              : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200"
                          }`}
                        >
                          Jalur {act.pathway} ({act.category_context})
                        </span>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {act.action_label}
                        </div>
                        {act.performed_by && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Diperbarui oleh {act.performed_by}{" "}
                            {act.note ? `— "${act.note}"` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(
                        [
                          "PLANNED",
                          "IN_PROGRESS",
                          "DONE",
                          "NOT_APPLICABLE",
                        ] as ActionStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            handleUpdateActionStatus(act.action_id, st)
                          }
                          disabled={submitting}
                          className={`rounded-lg border px-3 py-1 text-[11px] font-bold transition-all active:scale-95 ${
                            act.status === st
                              ? st === "DONE"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                : st === "IN_PROGRESS"
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-800 dark:bg-slate-700 text-white border-slate-800"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KEHILANGAN DARAH OBJEKTIF KUMULATIF (FR-15 & Bab 12) */}
      {subTab === "BLOOD_LOSS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Droplets className="h-4 w-4 text-rose-600" />
                <span>Catat Kehilangan Darah Objektif</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menyimpan volume, metode ukur, waktu, fase, petugas, mencegah duplikasi, serta menghitung kumulatif otomatis.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Volume Darah Baru (mL):
                </label>
                <input
                  type="number"
                  value={blVolume}
                  onChange={(e) => setBlVolume(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2 font-bold text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pengukuran Objektif (WHO 2023):
                </label>
                <select
                  value={blMethod}
                  onChange={(e) =>
                    setBlMethod(e.target.value as BloodLossMethod)
                  }
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="GRADUATED_DRAPE_UNDERBUTTOCK">
                    Underbuttock Graduated Drape (Kantong Ukur Terkalibrasi)
                  </option>
                  <option value="GRAVIMETRIK_TIMBANG_KASA">
                    Gravimetrik (Timbang Kasa/Underpad: 1g selisih = 1 mL)
                  </option>
                  <option value="SUCTION_TABUNG_UKUR">
                    Tabung Suction Ukur (Dikurangi Cairan Amnion/Irigasi)
                  </option>
                  <option value="ESTIMASI_VISUAL_TERKALIBRASI">
                    Estimasi Visual Terkalibrasi Simulasi
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fase Observasi:
                </label>
                <select
                  value={blPhase}
                  onChange={(e) => setBlPhase(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="ANTEPARTUM">Antepartum</option>
                  <option value="INTRAPARTUM">Intrapartum</option>
                  <option value="KALA_3">Kala III (Pelepasan Plasenta)</option>
                  <option value="KALA_4_2JAM_PERTAMA">
                    Kala IV (2 Jam Pertama Pascapersalinan)
                  </option>
                  <option value="POSTPARTUM_LANJUT">
                    Nifas Lanjut (&gt; 2 Jam Pascapersalinan)
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Konteks Persalinan (Ambang Protokol):
                </label>
                <select
                  value={blDeliveryContext}
                  onChange={(e) => setBlDeliveryContext(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="PERVAGINAM">
                    Pervaginam (Waspada &ge;300 mL, HPP &ge;500 mL)
                  </option>
                  <option value="SEKSIO_SESAREA">
                    Seksio Sesarea / SC (HPP &ge;1000 mL)
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Sumber / Keterangan:
                </label>
                <input
                  type="text"
                  value={blNotes}
                  onChange={(e) => setBlNotes(e.target.value)}
                  placeholder="Misal: Kasa 4 lembar + drape 150 mL"
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleAddBloodLoss}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 font-bold text-xs text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Simpan & Hitung Kumulatif</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Grafik Bar & Log Akumulasi Kehilangan Darah Objektif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ambang Protokol: Waspada Dini &ge; 300 mL | HPP Pervaginam &ge; 500 mL | HPP SC &ge; 1000 mL
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Kumulatif Saat Ini
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {cumulativeBloodLoss} mL
                </div>
              </div>
            </div>

            {/* Progress Bar Ambang Perdarahan */}
            <div className="space-y-1.5">
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all ${
                    cumulativeBloodLoss >= 1000
                      ? "bg-red-700"
                      : cumulativeBloodLoss >= 500
                      ? "bg-red-500"
                      : cumulativeBloodLoss >= 300
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((cumulativeBloodLoss / 1500) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>0 mL</span>
                <span className="text-amber-700">300 mL (Waspada E-MOTIVE)</span>
                <span className="text-red-600">500 mL (HPP Pervaginam)</span>
                <span className="text-red-800">1000 mL (HPP SC)</span>
                <span>1500+ mL (Masif)</span>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Fase</th>
                    <th className="py-2.5 px-3">Metode Objektif</th>
                    <th className="py-2.5 px-3">Volume (+mL)</th>
                    <th className="py-2.5 px-3">Total Kumulatif</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bloodLossList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-slate-500 italic"
                      >
                        Belum ada pencatatan volume kehilangan darah.
                      </td>
                    </tr>
                  ) : (
                    bloodLossList.map((bl) => (
                      <tr key={bl.blood_loss_id}>
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(bl.measured_at).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {bl.phase}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {bl.method.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-rose-700">
                          +{bl.volume_ml} mL
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {bl.cumulative_volume_ml} mL
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {bl.source_notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONITORING TANDA VITAL & SHOCK INDEX (FR-14) */}
      {subTab === "VITALS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Input Observasi Tanda Vital</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perekaman berkala tanda vital ibu, tonus uterus, dan refleks patela.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  TD Sistolik (mmHg)
                </label>
                <input
                  type="number"
                  value={monSbp}
                  onChange={(e) => setMonSbp(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  TD Diastolik (mmHg)
                </label>
                <input
                  type="number"
                  value={monDbp}
                  onChange={(e) => setMonDbp(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nadi / HR (x/mnt)
                </label>
                <input
                  type="number"
                  value={monHr}
                  onChange={(e) => setMonHr(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Frekuensi Napas (RR)
                </label>
                <input
                  type="number"
                  value={monRr}
                  onChange={(e) => setMonRr(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Suhu (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={monTemp}
                  onChange={(e) => setMonTemp(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Diuresis Urin (mL/jam)
                </label>
                <input
                  type="number"
                  value={monUrine}
                  onChange={(e) => setMonUrine(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tonus Kontraksi Uterus:
              </label>
              <select
                value={monTonus}
                onChange={(e) => setMonTonus(e.target.value as any)}
                className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="KERAS_BAIK">Keras / Kontraksi Baik</option>
                <option value="LEMBIK_ATONIA">
                  Lembek / Curiga Atonia Uteri (Pemicu Alert!)
                </option>
                <option value="TIDAK_RELEVAN_ANTEPARTUM">
                  Tidak Relevan (Masih Antepartum)
                </option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Refleks Patella (Pengawasan MgSO4/PE):
              </label>
              <select
                value={monReflex}
                onChange={(e) => setMonReflex(e.target.value as any)}
                className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="NORMAL_POSITIF">Normal Positif (+)</option>
                <option value="HIPERREFLEKSIA">Hiperrefleksia (++)</option>
                <option value="NEGATIF_HILANG">
                  Negatif / Hilang (Waspada Intoksikasi MgSO4)
                </option>
                <option value="BELUM_DIPERIKSA">Belum Diperiksa</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Observasi:
              </label>
              <input
                type="text"
                value={monNotes}
                onChange={(e) => setMonNotes(e.target.value)}
                placeholder="Catatan kondisi ibu & tindakan..."
                className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={handleAddVitalMonitoring}
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 font-bold text-xs text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              Simpan Rekaman Monitoring
            </button>
          </div>

          <div className="lg:col-span-2 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Riwayat Monitoring Tanda Vital, Tonus Uterus & Shock Index
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target: TDS &lt; 140/90 mmHg | Shock Index (HR / TDS) aman &lt; 0.9 | Tonus keras
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-blue-100 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">TD (mmHg)</th>
                    <th className="py-2.5 px-3">Nadi & RR</th>
                    <th className="py-2.5 px-3">Shock Index</th>
                    <th className="py-2.5 px-3">Tonus & Refleks</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monitoringList.map((m) => (
                    <tr
                      key={m.monitoring_id}
                      className={
                        m.shock_index >= 0.9 ||
                        m.uterine_tonus === "LEMBIK_ATONIA"
                          ? "bg-rose-50/60 dark:bg-rose-950/30"
                          : ""
                      }
                    >
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {new Date(m.observation_time).toLocaleTimeString(
                          "id-ID",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {m.systolic}/{m.diastolic}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        HR {m.heart_rate} • RR {m.respiratory_rate}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded px-2 py-0.5 font-bold ${
                            m.shock_index >= 0.9
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200"
                              : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                          }`}
                        >
                          {m.shock_index}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {m.uterine_tonus} • Patella: {m.patellar_reflex || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KOMUNIKASI ESKALASI SBAR TERVERIFIKASI (FR-16 & Bab 8) */}
      {subTab === "SBAR" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-blue-600" />
                <span>Penyusunan Ringkasan Komunikasi Eskalasi SBAR</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sistem menarik draf ringkasan otomatis dari data admisi, skrining PE/HPP, dan tanda vital terbaru. Wajib diverifikasi petugas sebelum dikirim.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Penerima Eskalasi (Pilih DPJP / Dokter):
                </label>
                <select
                  value={sbarRecipient}
                  onChange={(e) => setSbarRecipient(e.target.value)}
                  className="w-full rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-slate-800 px-3 py-2 font-bold text-slate-900 dark:text-slate-100"
                >
                  {db.master_catalog.doctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.full_name}>
                      {doc.full_name} — {doc.specialty} ({doc.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kanal Komunikasi:
                </label>
                <select
                  value={sbarChannel}
                  onChange={(e) => setSbarChannel(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="TELEPON_LANGSUNG">Telepon Langsung</option>
                  <option value="TATAP_MUKA_VISITE">Tatap Muka / Visite</option>
                  <option value="PESAN_INTERNAL_RS">Pesan Internal RS</option>
                  <option value="SISTEM_SIGAP">Sistem SIGAP</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-blue-900 dark:text-blue-200 mb-1">
                  S — Situation (Situasi Saat Ini):
                </label>
                <textarea
                  rows={2}
                  value={sbarSituation}
                  onChange={(e) => setSbarSituation(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-900 dark:text-blue-200 mb-1">
                  B — Background (Latar Belakang Klinis & Riwayat):
                </label>
                <textarea
                  rows={2}
                  value={sbarBackground}
                  onChange={(e) => setSbarBackground(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-900 dark:text-blue-200 mb-1">
                  A — Assessment (Penilaian Tanda Vital, Lab & Skrining):
                </label>
                <textarea
                  rows={3}
                  value={sbarAssessment}
                  onChange={(e) => setSbarAssessment(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-900 dark:text-blue-200 mb-1">
                  R — Recommendation (Rekomendasi / Konfirmasi Tindakan):
                </label>
                <textarea
                  rows={2}
                  value={sbarRecommendation}
                  onChange={(e) => setSbarRecommendation(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sbarVerified}
                onChange={(e) => setSbarVerified(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                VERIFIKASI PETUGAS (FR-16): Saya telah memeriksa kembali keakuratan isi Situation, Background, Assessment, dan Recommendation di atas sebelum disimpan/dikirim.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreateSbar}
                disabled={submitting}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Simpan Laporan SBAR</span>
              </button>
              <button
                type="button"
                onClick={handleCopySbarText}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all"
                title="Salin teks SBAR ke clipboard"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Teks</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
                title="Buka WhatsApp ke Dokter DPJP"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Kirim WA ke DPJP</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Riwayat Eskalasi SBAR & Respons Evaluasi Dokter (Bab 8)
              </h3>
            </div>
            {sbarList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 italic">
                Belum ada laporan komunikasi SBAR pada episode admisi ini.
              </div>
            ) : (
              <div className="space-y-4">
                {sbarList.map((sb) => (
                  <div
                    key={sb.sbar_id}
                    className="rounded-xl border border-blue-200/80 dark:border-slate-800 p-4 space-y-2.5 text-xs bg-slate-50/60 dark:bg-slate-800/40 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-blue-100 dark:border-slate-800 pb-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Kepada: {sb.recipient_doctor_name}
                        </span>
                        <span className="ml-2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
                          {sb.communication_channel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(sb.reported_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">S (Situation):</strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200">{sb.situation}</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">B (Background):</strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200">{sb.background}</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">A (Assessment):</strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200">{sb.assessment}</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">R (Recommendation):</strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200">{sb.recommendation}</span>
                    </div>

                    {sb.doctor_feedback_response ? (
                      <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 mt-2 shadow-2xs">
                        <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Respons & Evaluasi Dokter:</span>
                        </div>
                        <p className="text-emerald-950 dark:text-emerald-100 mt-1 font-medium">
                          {sb.doctor_feedback_response}
                        </p>
                      </div>
                    ) : currentUserRole === "DOKTER" ? (
                      <div className="pt-2 space-y-2">
                        <textarea
                          rows={2}
                          placeholder="Catat evaluasi & instruksi tindak lanjut dokter..."
                          value={doctorResponseInput[sb.sbar_id] || ""}
                          onChange={(e) =>
                            setDoctorResponseInput((prev) => ({
                              ...prev,
                              [sb.sbar_id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRespondSbar(sb.sbar_id)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
                        >
                          Simpan Respons Dokter
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] italic text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                        Menunggu catatan respons dari Dokter (Ganti role ke Dokter Sp.OG di pojok kanan atas untuk menguji pengisian respons dokter).
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RIWAYAT SKRINING & CETAK RINGKASAN SIMULASI (FR-17 & FR-22) */}
      {subTab === "HISTORY" && (
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-blue-100 dark:border-slate-800 pb-4">
            <div>
              <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 px-3 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:text-amber-200">
                FR-22 • Ringkasan Simulasi & Pendukung Keputusan — Bukan Rekam Medis Resmi
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                Riwayat Evaluasi Skrining, Versi Algoritma, & Jejak Perubahan (FR-17)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak / Ekspor PDF Ringkasan Simulasi</span>
            </button>
          </div>

          <div className="space-y-4">
            {resultsHistory.map((res) => (
              <div
                key={res.result_id}
                className="rounded-xl border border-blue-200/80 dark:border-slate-800 p-4 space-y-2.5 text-xs bg-slate-50/50 dark:bg-slate-800/40 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2.5 py-0.5 font-bold ${
                        res.screening_type === "PE"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      Jalur {res.screening_type}
                    </span>
                    <RiskCategoryBadge category={res.category} size="sm" />
                    <span className="text-slate-500 dark:text-slate-400">
                      Protokol: <strong>{res.protocol_version_number}</strong>
                    </span>
                    {res.is_re_evaluation && (
                      <span className="rounded bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                        Evaluasi Ulang (Sebelumnya: {res.previous_category})
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">
                    {new Date(res.calculated_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {res.summary_headline}
                </div>
                <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-0.5">
                  {res.rationale.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
