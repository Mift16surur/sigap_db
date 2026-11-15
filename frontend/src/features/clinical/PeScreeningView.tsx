"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  HeartPulse,
  Plus,
  Printer,
  ShieldAlert,
  Stethoscope,
  TestTube,
} from "lucide-react";
import { apiRequest, EnrichedAdmission } from "@/services/api-client";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalWorkflowStepper } from "@/components/common/ClinicalWorkflowStepper";
import {
  FiveStatusSelector,
  INFO_SOURCE_OPTIONS,
  LAB_STATUS_OPTIONS,
  RiskCategoryBadge,
} from "@/components/common/StatusBadge";
import type {
  BpPosition,
  ClinicalItemResponse,
  ClinicalProtocol,
  InfoSource,
  LabAvailabilityStatus,
  LabTestCode,
  RiskFactorMaster,
  SigapDatabase,
} from "@/types";

export function PeScreeningView({
  admission,
  db,
  activeProtocol,
  currentUserId,
  onRefresh,
  onNavigateMonitoring,
}: {
  admission: EnrichedAdmission;
  db: SigapDatabase;
  activeProtocol: ClinicalProtocol;
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onNavigateMonitoring: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startTimestamp] = useState<number>(() => Date.now());

  const peScr = admission.pe_screening;
  const existingBps = db.bp_measurements
    .filter((b) => b.admission_id === admission.admission_id)
    .sort((a, b) => a.sequence_number - b.sequence_number);

  // State input rekaman TD baru (FR-07: Append-only, tidak menimpa nilai lama)
  const [newSbp, setNewSbp] = useState<number>(125);
  const [newDbp, setNewDbp] = useState<number>(82);
  const [newHr, setNewHr] = useState<number>(84);
  const [newBpPos, setNewBpPos] = useState<BpPosition>("DUDUK_BERSANDAR");
  const [newBpCuff, setNewBpCuff] = useState<
    "STANDAR_DEWASA" | "BESAR_OBESITAS" | "KECIL"
  >("STANDAR_DEWASA");
  const [newBpNote, setNewBpNote] = useState<string>("");

  // State kondisi darurat PE (Flowchart Bab 11)
  const [kejang, setKejang] = useState<ClinicalItemResponse>(
    peScr?.kejang_eklamsia || "TIDAK"
  );
  const [kesadaranMenurun, setKesadaranMenurun] =
    useState<ClinicalItemResponse>(
      peScr?.kesadaran_menurun_gcs_rendah || "TIDAK"
    );
  const [edemaParu, setEdemaParu] = useState<ClinicalItemResponse>(
    peScr?.edema_paru_sesak_berat || "TIDAK"
  );
  const [oliguria, setOliguria] = useState<ClinicalItemResponse>(
    peScr?.oliguria_produksi_urin_rendah || "TIDAK"
  );
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    peScr?.clinical_notes || ""
  );

  // State gejala PE
  const existingSymptoms = db.pe_symptoms.filter(
    (s) => s.pe_screening_id === peScr?.pe_screening_id
  );
  const [symptomsState, setSymptomsState] = useState<
    Array<{
      symptom_code: string;
      symptom_label: string;
      is_severe_feature: boolean;
      response: ClinicalItemResponse;
      onset_description?: string;
    }>
  >(() =>
    existingSymptoms.length > 0
      ? existingSymptoms.map((s) => ({
          symptom_code: s.symptom_code,
          symptom_label: s.symptom_label,
          is_severe_feature: s.is_severe_feature,
          response: s.response,
          onset_description: s.onset_description || "",
        }))
      : [
          {
            symptom_code: "SYM_HEADACHE",
            symptom_label:
              "Nyeri Kepala Hebat Menetap (Tidak Membaik dengan Analgetik)",
            is_severe_feature: true,
            response: "BELUM_DIPERIKSA",
          },
          {
            symptom_code: "SYM_VISUAL",
            symptom_label:
              "Gangguan Penglihatan (Pandangan Kabur / Skotoma / Fotofobia)",
            is_severe_feature: true,
            response: "BELUM_DIPERIKSA",
          },
          {
            symptom_code: "SYM_EPIGASTRIC",
            symptom_label: "Nyeri Epigastrium / Kuadran Kanan Atas Hebat",
            is_severe_feature: true,
            response: "BELUM_DIPERIKSA",
          },
          {
            symptom_code: "SYM_NAUSEA_VOMIT",
            symptom_label:
              "Mual Muntah Hebat / Edema Wajah-Ekstremitas Mendadak",
            is_severe_feature: false,
            response: "BELUM_DIPERIKSA",
          },
        ]
  );

  // State faktor risiko PE
  const peMasters: RiskFactorMaster[] = db.risk_factors.filter(
    (rf) => rf.screening_pathway === "PE" && rf.active_status
  );
  const existingPeRiskDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission.admission_id && d.pathway === "PE"
  );

  const [riskDetailsState, setRiskDetailsState] = useState<
    Record<
      string,
      {
        response: ClinicalItemResponse;
        info_source: InfoSource;
        note: string;
      }
    >
  >(() => {
    const map: Record<
      string,
      { response: ClinicalItemResponse; info_source: InfoSource; note: string }
    > = {};
    for (const m of peMasters) {
      const found = existingPeRiskDetails.find(
        (d) => d.risk_factor_id === m.risk_factor_id || d.risk_factor_code === m.code
      );
      let defaultResp: ClinicalItemResponse = found?.response || "TIDAK";
      if (!found) {
        // Sinkronisasi awal dari riwayat obstetri admisi bila relevan
        if (
          m.code === "PE_PRIMIGRAVIDA" &&
          admission.obstetric_history.is_primigravida
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "PE_HIST_PREV_PE" &&
          admission.obstetric_history.riwayat_pe_sebelumnya === "YA"
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "PE_CHRONIC_HTN" &&
          admission.obstetric_history.hipertensi_kronis === "YA"
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "PE_AGE_35" &&
          (admission.patient?.age_years || 0) >= 35
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "PE_OBESITY_BMI30" &&
          admission.obstetric_history.obesitas_imt_lebih_30 === "YA"
        ) {
          defaultResp = "YA";
        }
      }
      map[m.risk_factor_id] = {
        response: defaultResp,
        info_source: found?.info_source || "ANAMNESIS_PASIEN",
        note: found?.note || "",
      };
    }
    return map;
  });

  // State Laboratorium terkait PE
  const admissionLabs = db.lab_results.filter(
    (l) => l.admission_id === admission.admission_id
  );
  const getLabInitial = (
    code: LabTestCode,
    name: string,
    unit: string,
    ref: string
  ) => {
    const found = admissionLabs.find((l) => l.test_code === code);
    return {
      test_code: code,
      test_name: name,
      result_status: (found?.result_status ||
        "BELUM_TERSEDIA") as LabAvailabilityStatus,
      value_numeric: found?.value_numeric,
      value_text: found?.value_text || "",
      unit,
      reference_range: ref,
    };
  };

  const [labsState, setLabsState] = useState(() => [
    getLabInitial(
      "PROTEIN_URIN_DIPSTICK",
      "Protein Urin Dipstick",
      "kualitatif",
      "Negatif"
    ),
    getLabInitial(
      "TROMBOSIT",
      "Hitung Trombosit",
      "/uL",
      "150.000 - 400.000 /uL"
    ),
    getLabInitial("SGOT_AST", "SGOT (AST)", "U/L", "< 35 U/L"),
    getLabInitial(
      "KREATININ_SERUM",
      "Kreatinin Serum",
      "mg/dL",
      "0.5 - 1.1 mg/dL"
    ),
  ]);

  // Deteksi Real-Time Pemicu Prioritas Darurat di UI (FR-12: Tanpa menunggu form lengkap!)
  const hasLiveEmergencyTrigger =
    kejang === "YA" ||
    kesadaranMenurun === "YA" ||
    edemaParu === "YA" ||
    existingBps.some(
      (b) =>
        b.systolic >= activeProtocol.pe_config.crisis_sbp_threshold ||
        b.diastolic >= activeProtocol.pe_config.crisis_dbp_threshold
    ) ||
    symptomsState.some((s) => s.is_severe_feature && s.response === "YA");

  async function handleAddBpMeasurement() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest("/screening/pe", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "ADD_BP_MEASUREMENT",
          admission_id: admission.admission_id,
          systolic: newSbp,
          diastolic: newDbp,
          heart_rate: newHr,
          position: newBpPos,
          cuff_size: newBpCuff,
          note: newBpNote,
        },
      });
      await onRefresh();
      if (res.preemptive_alert) {
        setFeedbackMsg(
          `ALERT PRIORITAS SEGERA DITERBITKAN: TD ${newSbp}/${newDbp} mmHg melampaui ambang berat protokol! Segera hubungi DPJP/Tim PONEK.`
        );
      } else {
        setFeedbackMsg(
          `Rekaman Tekanan Darah ke-${res.bp_measurement.sequence_number} (${newSbp}/${newDbp} mmHg) berhasil disimpan sebagai rekaman terpisah (FR-07).`
        );
      }
      setNewBpNote("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEvaluatePe(isPreemptive = false) {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const elapsedSeconds = Math.max(
        45,
        Math.round((Date.now() - startTimestamp) / 1000)
      );
      const formattedRiskDetails = Object.entries(riskDetailsState).map(
        ([rfId, val]) => {
          const master = peMasters.find((m) => m.risk_factor_id === rfId);
          return {
            risk_factor_id: rfId,
            risk_factor_code: master?.code || "",
            response: val.response,
            info_source: val.info_source,
            note: val.note,
          };
        }
      );

      await apiRequest("/screening/pe", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "EVALUATE_PE",
          admission_id: admission.admission_id,
          kejang_eklamsia: kejang,
          kesadaran_menurun_gcs_rendah: kesadaranMenurun,
          edema_paru_sesak_berat: edemaParu,
          oliguria_produksi_urin_rendah: oliguria,
          clinical_notes: clinicalNotes,
          symptoms: symptomsState,
          risk_details: formattedRiskDetails,
          labs: labsState,
          duration_seconds: elapsedSeconds,
          is_preemptive: isPreemptive,
        },
      });
      await onRefresh();
      setStep(4);
      setFeedbackMsg(
        `Evaluasi Skrining Preeklamsia selesai menggunakan ${activeProtocol.version} dan tersimpan di riwayat audit.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const latestResult = admission.latest_pe_result;

  return (
    <div className="space-y-6">
      {/* Header Halaman & Stepper Alur Klinis */}
      <PageHeader
        title="3A. Skrining Admisi Preeklamsia (PE)"
        description={`Evaluasi tekanan darah berulang, gejala pemberat, pemeriksaan laboratorium, dan penentuan risiko preeklamsia (${admission.patient?.full_name || "Pasien"} • ${admission.patient?.mrn || "-"}).`}
        badge="Jalur 1"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748b]">Kategori:</span>
            <RiskCategoryBadge category={latestResult?.category} />
          </div>
        }
      >
        <ClinicalWorkflowStepper currentStepId="PE_SCREENING" />
      </PageHeader>

      {/* Banner Pemicu Prioritas Seketika (FR-12 & Flowchart Bab 11) */}
      {hasLiveEmergencyTrigger && (
        <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-7 w-7 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                    FR-12 • Pemicu Prioritas Segera
                  </span>
                  <h4 className="text-sm font-bold text-red-900">
                    Ditemukan Kondisi Darurat / Gambaran Berat Preeklamsia!
                  </h4>
                </div>
                <p className="mt-1 text-xs text-red-800 leading-relaxed">
                  Sesuai Flowchart Skrining PE (Bab 11):{" "}
                  <strong>
                    Jangan tunggu seluruh form selesai diisi untuk melakukan
                    eskalasi!
                  </strong>{" "}
                  Tekan tombol di kanan untuk menerbitkan Alert Prioritas &
                  evaluasi cepat sekarang.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEvaluatePe(true)}
              disabled={submitting}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-red-700"
            >
              Picu Alert Prioritas & Evaluasi Sekarang
            </button>
          </div>
        </div>
      )}

      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-medium text-red-900">
          {errorMsg}
        </div>
      )}

      {/* Header Wizard Stepper */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Jalur 1 • Skrining Admisi Preeklamsia (PE)
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {admission.patient?.full_name} ({admission.patient?.mrn}) — UK{" "}
              {admission.usia_kehamilan_minggu} mgg{" "}
              {admission.usia_kehamilan_hari} hr
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Hasil PE Saat Ini:</span>
            <RiskCategoryBadge category={latestResult?.category} />
          </div>
        </div>

        {/* 4 Steps Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
          {[
            {
              num: 1,
              title: "1. Data Awal & Pemicu Darurat",
              desc: "Episode Admisi & Kejang/Krisis",
            },
            {
              num: 2,
              title: "2. Faktor Risiko PE",
              desc: "5 Status Eksplisit & Sumber",
            },
            {
              num: 3,
              title: "3. TD Berulang, Gejala & Lab",
              desc: "Rekaman TD Terpisah & Protein Urin",
            },
            {
              num: 4,
              title: "4. Hasil & Alasan Klasifikasi",
              desc: `Tabel Keputusan ${activeProtocol.version}`,
            },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                step === s.num
                  ? "border-blue-600 bg-blue-50/70 shadow-sm"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step === s.num
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {s.num}
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {s.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {s.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: DATA AWAL & PEMICU PRIORITAS DARURAT */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-600" />
              Ringkasan Episode Admisi & Riwayat Obstetri (FR-04, FR-05)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500">Kode Episode Admisi:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {admission.admission_code}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Unit / Ruangan:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {admission.unit?.name}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Paritas & Usia Ibu:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  G{admission.obstetric_history.gravida}P
                  {admission.obstetric_history.para}A
                  {admission.obstetric_history.abortus} •{" "}
                  {admission.patient?.age_years} Tahun
                </div>
              </div>
              <div>
                <span className="text-slate-500">Indeks Massa Tubuh (IMT):</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {admission.obstetric_history.imt_nilai || "-"} kg/m²
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Keluhan Utama Admisi:</span>
                <div className="font-medium text-slate-800 mt-0.5">
                  {admission.keluhan_utama}
                </div>
              </div>
              {admission.obstetric_history.catatan_komorbid && (
                <div className="col-span-2">
                  <span className="text-slate-500">Catatan Riwayat/Komorbid:</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {admission.obstetric_history.catatan_komorbid}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Cek Pemicu Prioritas Segera Saat Admisi (Flowchart Bab 11)
            </h3>
            <p className="text-xs text-slate-500">
              Setiap kondisi di bawah ini wajib dinilai secara eksplisit. Jika
              berstatus <strong>Ya</strong>, sistem memicu Alert Prioritas
              seketika.
            </p>

            <div className="space-y-3">
              {[
                {
                  label: "Kejang Umum / Tanda Eklamsia Saat Admisi",
                  val: kejang,
                  setVal: setKejang,
                },
                {
                  label: "Penurunan Kesadaran / Defisit Neurologis Akut",
                  val: kesadaranMenurun,
                  setVal: setKesadaranMenurun,
                },
                {
                  label: "Gejala Edema Paru / Sesak Napas Berat / Sianosis",
                  val: edemaParu,
                  setVal: setEdemaParu,
                },
                {
                  label: "Oliguria (Produksi Urin < 30 mL/jam atau < 500 mL/24 jam)",
                  val: oliguria,
                  setVal: setOliguria,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 p-3 bg-slate-50/60"
                >
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    {item.label}
                  </div>
                  <FiveStatusSelector
                    value={item.val}
                    onChange={item.setVal}
                    compact
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Selanjutnya: Faktor Risiko PE &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FAKTOR RISIKO PE (5 STATUS EKSPLISIT + SUMBER INFORMASI) */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Penilaian Faktor Risiko Maternal & Obstetri Preeklamsia (FR-06,
                FR-09)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuai SRS Bab 6 & FR-09: Membedakan status{" "}
                <strong>
                  Ya, Tidak, Tidak Diketahui, Belum Diperiksa, dan Tidak Relevan
                </strong>
                . Data kosong tidak diasumsikan negatif.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {peMasters.map((m) => {
              const st = riskDetailsState[m.risk_factor_id] || {
                response: "BELUM_DIPERIKSA" as ClinicalItemResponse,
                info_source: "ANAMNESIS_PASIEN" as InfoSource,
                note: "",
              };
              return (
                <div
                  key={m.risk_factor_id}
                  className={`rounded-xl border p-4 transition-all ${
                    st.response === "YA"
                      ? "border-red-300 bg-red-50/40"
                      : st.response === "BELUM_DIPERIKSA" ||
                        st.response === "TIDAK_DIKETAHUI"
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            m.risk_tier === "HIGH"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.risk_tier === "HIGH"
                            ? "Faktor Risiko Tinggi"
                            : "Faktor Risiko Sedang"}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {m.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{m.definition}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <FiveStatusSelector
                        value={st.response}
                        onChange={(val) =>
                          setRiskDetailsState((prev) => ({
                            ...prev,
                            [m.risk_factor_id]: {
                              ...st,
                              response: val,
                            },
                          }))
                        }
                        compact
                      />
                      <select
                        value={st.info_source}
                        onChange={(e) =>
                          setRiskDetailsState((prev) => ({
                            ...prev,
                            [m.risk_factor_id]: {
                              ...st,
                              info_source: e.target.value as InfoSource,
                            },
                          }))
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        {INFO_SOURCE_OPTIONS.map((src) => (
                          <option key={src.value} value={src.value}>
                            {src.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              &larr; Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Selanjutnya: TD Berulang, Gejala & Lab &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PENGUKURAN TD BERULANG (FR-07), GEJALA PE, DAN LABORATORIUM */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Sub-bagian A: Log Pengukuran Tekanan Darah Berulang (FR-07) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-rose-600" />
                  Rekaman Pengukuran Tekanan Darah Berulang (FR-07 & Bab 6)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap pengukuran disimpan sebagai{" "}
                  <strong>rekaman terpisah (append-only)</strong> dengan waktu,
                  posisi ukur, ukuran manset, dan urutan pengukuran—tidak
                  menimpa nilai sebelumnya.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                Total Rekaman TD: {existingBps.length}x
              </span>
            </div>

            {/* Tabel Riwayat Pengukuran TD */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Urutan</th>
                    <th className="py-2.5 px-3 font-semibold">
                      Sistolik / Diastolik
                    </th>
                    <th className="py-2.5 px-3 font-semibold">MAP</th>
                    <th className="py-2.5 px-3 font-semibold">Nadi</th>
                    <th className="py-2.5 px-3 font-semibold">
                      Posisi & Manset
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Waktu Ukur</th>
                    <th className="py-2.5 px-3 font-semibold">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {existingBps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-4 text-center text-slate-500 italic"
                      >
                        Belum ada rekaman pengukuran tekanan darah pada episode
                        admisi ini.
                      </td>
                    </tr>
                  ) : (
                    existingBps.map((bp) => {
                      const isCrisis =
                        bp.systolic >=
                          activeProtocol.pe_config.crisis_sbp_threshold ||
                        bp.diastolic >=
                          activeProtocol.pe_config.crisis_dbp_threshold;
                      const isHigh =
                        bp.systolic >=
                          activeProtocol.pe_config.hypertension_sbp_threshold ||
                        bp.diastolic >=
                          activeProtocol.pe_config.hypertension_dbp_threshold;
                      return (
                        <tr
                          key={bp.bp_id}
                          className={
                            isCrisis
                              ? "bg-red-50/70"
                              : isHigh
                              ? "bg-amber-50/50"
                              : ""
                          }
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            #{bp.sequence_number}{" "}
                            {bp.is_repeat_verification && (
                              <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">
                                Verifikasi Ulang
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            <span
                              className={
                                isCrisis
                                  ? "text-red-700 font-extrabold"
                                  : isHigh
                                  ? "text-amber-800"
                                  : "text-emerald-700"
                              }
                            >
                              {bp.systolic} / {bp.diastolic} mmHg
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {bp.mean_arterial_pressure} mmHg
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {bp.heart_rate ? `${bp.heart_rate} x/mnt` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {bp.position.replace(/_/g, " ")} ({bp.cuff_size})
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(bp.measured_at).toLocaleTimeString(
                              "id-ID",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {bp.note || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Form Tambah Rekaman TD Baru */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="text-xs font-bold text-slate-800 mb-3">
                + Tambah Rekaman Pengukuran Tekanan Darah ke-
                {existingBps.length + 1}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sistolik (mmHg)
                  </label>
                  <input
                    type="number"
                    value={newSbp}
                    onChange={(e) => setNewSbp(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Diastolik (mmHg)
                  </label>
                  <input
                    type="number"
                    value={newDbp}
                    onChange={(e) => setNewDbp(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nadi (x/mnt)
                  </label>
                  <input
                    type="number"
                    value={newHr}
                    onChange={(e) => setNewHr(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Posisi Ukur
                  </label>
                  <select
                    value={newBpPos}
                    onChange={(e) => setNewBpPos(e.target.value as BpPosition)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="DUDUK_BERSANDAR">Duduk Bersandar</option>
                    <option value="SEMI_FOWLER">Semi-Fowler</option>
                    <option value="MIRING_KIRI">Miring Kiri</option>
                    <option value="TERLENTANG">Terlentang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Catatan Kondisi
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Istirahat 15 mnt"
                    value={newBpNote}
                    onChange={(e) => setNewBpNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddBpMeasurement}
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Simpan TD #{existingBps.length + 1}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-bagian B: Gejala Klinis Preeklamsia */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Penilaian Gejala Klinis Preeklamsia (Bab 6: Status Eksplisit &
              Waktu Penilaian)
            </h3>
            <div className="space-y-3">
              {symptomsState.map((sym, idx) => (
                <div
                  key={sym.symptom_code}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-slate-200 p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {sym.is_severe_feature && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                          Gejala Berat (Severe Feature)
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900">
                        {sym.symptom_label}
                      </span>
                    </div>
                  </div>
                  <FiveStatusSelector
                    value={sym.response}
                    onChange={(val) =>
                      setSymptomsState((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, response: val } : item
                        )
                      )
                    }
                    compact
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sub-bagian C: Protein Urin & Laboratorium PE (Bab 7: Belum Tersedia != Normal) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-indigo-600" />
                  Pemeriksaan Protein Urin & Laboratorium Terkait PE (Bab 6 &
                  Bab 7)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laboratorium yang belum keluar wajib berstatus{" "}
                  <strong>Belum Tersedia</strong>, bukan dianggap normal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labsState.map((lab, idx) => (
                <div
                  key={lab.test_code}
                  className={`rounded-xl border p-4 space-y-3 ${
                    lab.result_status === "BELUM_TERSEDIA"
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {lab.test_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Rujukan normal: {lab.reference_range}
                      </div>
                    </div>
                    <select
                      value={lab.result_status}
                      onChange={(e) =>
                        setLabsState((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  result_status: e.target
                                    .value as LabAvailabilityStatus,
                                }
                              : item
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                    >
                      {LAB_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {lab.result_status === "TERSEDIA" && (
                    <div className="pt-1">
                      {lab.test_code === "PROTEIN_URIN_DIPSTICK" ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hasil Dipstick Protein Urin:
                          </label>
                          <select
                            value={lab.value_text || "Negatif"}
                            onChange={(e) =>
                              setLabsState((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, value_text: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold"
                          >
                            <option value="Negatif">Negatif</option>
                            <option value="Trace (+/-)">Trace (+/-)</option>
                            <option value="+1">+1 (30 mg/dL)</option>
                            <option value="+2">+2 (100 mg/dL)</option>
                            <option value="+3">+3 (300 mg/dL)</option>
                            <option value="+4">+4 (&ge; 1000 mg/dL)</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nilai Hasil ({lab.unit}):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={lab.value_numeric ?? ""}
                            onChange={(e) =>
                              setLabsState((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        value_numeric:
                                          e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value),
                                        value_text: e.target.value,
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder={`Masukkan nilai dalam ${lab.unit}`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Klinis Petugas Pemeriksa (Pilih Master Bidan / Template):
                </label>
                <div className="flex flex-wrap gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setClinicalNotes((prev) =>
                          prev
                            ? `${prev} | Pemeriksa: ${e.target.value}`
                            : `Pemeriksa: ${e.target.value}. Pasien kooperatif, observasi ketat TD dan tanda bahaya PE.`
                        );
                      }
                    }}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900"
                  >
                    <option value="">+ Pilih Petugas dari Master Bidan/Perawat...</option>
                    {db.master_catalog.midwives_nurses.map((m) => (
                      <option key={m.staff_id} value={m.full_name}>
                        {m.full_name} ({m.profession} - {m.shift})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Tambahkan catatan observasi klinis skrining PE..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                &larr; Kembali ke Faktor Risiko
              </button>
              <button
                type="button"
                onClick={() => handleEvaluatePe(false)}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
              >
                {submitting
                  ? "Mengevaluasi..."
                  : `Evaluasi dengan Mesin Aturan (${activeProtocol.version}) \u2192`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: HASIL PENILAIAN SKRINING PE, ALASAN KLASIFIKASI, DATA BELUM TERSEDIA & CHECKLIST */}
      {step === 4 && (
        <div className="space-y-6">
          {!latestResult ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Skrining Preeklamsia pada episode admisi ini belum dievaluasi.
              </p>
              <button
                type="button"
                onClick={() => handleEvaluatePe(false)}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white"
              >
                Jalankan Evaluasi Skrining PE Sekarang
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      Versi Aturan: {latestResult.protocol_version_number}
                    </span>
                    {latestResult.is_re_evaluation && (
                      <span className="rounded bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                        Hasil Evaluasi Ulang (Sebelumnya:{" "}
                        {latestResult.previous_category})
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {latestResult.summary_headline}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dievaluasi pada{" "}
                    {new Date(latestResult.calculated_at).toLocaleString(
                      "id-ID"
                    )}{" "}
                    • Hasil skrining bukan diagnosis medis mandiri (Bab 1 & Bab
                    7).
                  </p>
                </div>
                <RiskCategoryBadge category={latestResult.category} size="lg" />
              </div>

              {/* Indikator Pemicu & Alasan Klasifikasi (FR-11) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Alasan Klasifikasi & Indikator Pemicu (FR-11)
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-800">
                    {latestResult.rationale.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                  {latestResult.triggered_indicators.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {latestResult.triggered_indicators.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-900"
                        >
                          {t.label}: {t.value_summary}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daftar Data Belum Tersedia Eksplisit (NFR-09 & Bab 6) */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FileWarning className="h-4 w-4 text-amber-700" />
                    Status Kelengkapan Data & Lab Belum Tersedia (NFR-09)
                  </h4>
                  {latestResult.missing_or_unknown_fields.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Seluruh variabel wajib, tanda vital, dan laboratorium PE
                      telah diperiksa secara lengkap.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-900">
                        Terdapat{" "}
                        <strong>
                          {latestResult.missing_or_unknown_fields.length}{" "}
                          item
                        </strong>{" "}
                        yang masih berstatus <em>Belum Diperiksa</em> /{" "}
                        <em>Tidak Diketahui</em> / <em>Belum Tersedia</em>{" "}
                        (tidak dianggap negatif):
                      </p>
                      <ul className="space-y-1 text-xs font-medium text-amber-950 list-disc list-inside">
                        {latestResult.missing_or_unknown_fields.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Rekomendasi Checklist Kesiapan Fasilitas (FR-13) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Checklist Kesiapan & Tindak Lanjut Protokol (FR-13 — Bukan
                  Instruksi Terapi/Dosis Otomatis)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {latestResult.recommended_checklists.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg bg-white p-3 border border-blue-100 text-xs text-slate-800"
                    >
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  &larr; Perbarui Input / Evaluasi Ulang
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Cetak Ringkasan Simulasi (FR-22)
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateMonitoring}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Buka Monitoring, Checklist & SBAR &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
