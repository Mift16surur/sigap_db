"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileWarning,
  Printer,
  ShieldAlert,
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
  ClinicalItemResponse,
  ClinicalProtocol,
  Domain4T,
  InfoSource,
  LabAvailabilityStatus,
  LabTestCode,
  RiskFactorMaster,
  SigapDatabase,
} from "@/types";

const DOMAIN_4T_META: Array<{
  domain: Domain4T;
  title: string;
  subtitle: string;
  badgeColor: string;
}> = [
  {
    domain: "TONUS",
    title: "1. Domain TONUS (Kontraktilitas Uterus — ~70% Kasus HPP)",
    subtitle:
      "Overdistensi uterus (gemeli, polihidramnion, makrosomia), korioamnionitis, partus lama / induksi oksitosin / MgSO4, grande multipara.",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    domain: "TRAUMA",
    title: "2. Domain TRAUMA (Jaringan Jalan Lahir & Parut Uterus — ~20% Kasus HPP)",
    subtitle:
      "Riwayat Seksio Sesarea (bekas SC), operasi miomektomi, mioma uteri besar, atau kelainan anatomi uterus.",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    domain: "JARINGAN",
    title: "3. Domain JARINGAN / TISSUE (Plasenta & Retensi Jaringan — ~10% Kasus HPP)",
    subtitle:
      "Plasenta previa, curiga spektrum plasenta akreta (PAS), atau riwayat retensio plasenta/manual plasenta.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    domain: "TROMBIN",
    title: "4. Domain TROMBIN (Koagulasi & Pembekuan Darah — ~1% Kasus HPP)",
    subtitle:
      "Riwayat gangguan koagulasi, penyakit von Willebrand, sindrom HELLP/DIC, atau terapi antikoagulan.",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
  },
  {
    domain: "TAMBAHAN",
    title: "5. Faktor Tambahan Proposal SIGAP (Anemia, Riwayat HPP, Obesitas, Perdarahan Antepartum)",
    subtitle:
      "Faktor komorbid yang mempercepat dekompensasi hemodinamik saat terjadi perdarahan pascapersalinan.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
];

export function HppScreeningView({
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

  const hppScr = admission.hpp_screening;

  const [perdarahanAktif, setPerdarahanAktif] = useState<ClinicalItemResponse>(
    hppScr?.perdarahan_aktif_saat_admisi || "TIDAK"
  );
  const [syokHemodinamik, setSyokHemodinamik] = useState<ClinicalItemResponse>(
    hppScr?.syok_hemodinamik_instabil || "TIDAK"
  );
  const [rencanaPersalinan, setRencanaPersalinan] = useState<
    | "PERVAGINAM_SPONTAN"
    | "INDUKSI_AUGMENTASI"
    | "SEKSIO_SESAREA"
    | "BELUM_DITENTUKAN"
  >(hppScr?.rencana_metode_persalinan || "PERVAGINAM_SPONTAN");
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    hppScr?.clinical_notes || ""
  );

  // Master Faktor Risiko HPP 4T
  const hppMasters: RiskFactorMaster[] = db.risk_factors.filter(
    (rf) => rf.screening_pathway === "HPP" && rf.active_status
  );
  const existingHppDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission.admission_id && d.pathway === "HPP"
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
    for (const m of hppMasters) {
      const found = existingHppDetails.find(
        (d) =>
          d.risk_factor_id === m.risk_factor_id || d.risk_factor_code === m.code
      );
      let defaultResp: ClinicalItemResponse = found?.response || "TIDAK";
      if (!found) {
        if (
          m.code === "HPP_ADD_PREV_HPP" &&
          admission.obstetric_history.riwayat_hpp_sebelumnya === "YA"
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "HPP_TRAUMA_PREV_SC_SURGERY" &&
          admission.obstetric_history.riwayat_sc_jumlah > 0
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "HPP_TONUS_GRAND_MULTIPARA" &&
          admission.obstetric_history.para > 4
        ) {
          defaultResp = "YA";
        } else if (
          m.code === "HPP_ADD_OBESITY" &&
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

  // State Laboratorium terkait HPP (Hb, Trombosit)
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
      "HEMOGLOBIN",
      "Hemoglobin (Hb) Admisi",
      "g/dL",
      "11.0 - 14.0 g/dL"
    ),
    getLabInitial(
      "TROMBOSIT",
      "Hitung Trombosit",
      "/uL",
      "150.000 - 400.000 /uL"
    ),
  ]);

  const hasLivePriorityHpp =
    perdarahanAktif === "YA" ||
    syokHemodinamik === "YA" ||
    hppMasters.some(
      (m) =>
        m.risk_tier === "CRITICAL_IMMEDIATE" &&
        riskDetailsState[m.risk_factor_id]?.response === "YA"
    );

  async function handleEvaluateHpp(isPreemptive = false) {
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
          const master = hppMasters.find((m) => m.risk_factor_id === rfId);
          return {
            risk_factor_id: rfId,
            risk_factor_code: master?.code || "",
            response: val.response,
            info_source: val.info_source,
            note: val.note,
          };
        }
      );

      await apiRequest("/screening/hpp", {
        method: "POST",
        userId: currentUserId,
        body: {
          admission_id: admission.admission_id,
          perdarahan_aktif_saat_admisi: perdarahanAktif,
          syok_hemodinamik_instabil: syokHemodinamik,
          rencana_metode_persalinan: rencanaPersalinan,
          clinical_notes: clinicalNotes,
          risk_details: formattedRiskDetails,
          labs: labsState,
          duration_seconds: elapsedSeconds,
          is_preemptive: isPreemptive,
        },
      });
      await onRefresh();
      setStep(4);
      setFeedbackMsg(
        `Evaluasi Skrining Risiko HPP 4T selesai menggunakan ${activeProtocol.version} secara independen dari hasil PE.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const latestResult = admission.latest_hpp_result;

  return (
    <div className="space-y-6">
      {/* Header Halaman & Stepper Alur Klinis */}
      <PageHeader
        title="3B. Skrining Risiko HPP (Domain 4T)"
        description={`Evaluasi independen risiko perdarahan pascapersalinan domain Tonus, Trauma, Jaringan, Trombin & faktor tambahan (${admission.patient?.full_name || "Pasien"} • ${admission.patient?.mrn || "-"}).`}
        badge="Jalur 2"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748b]">Kategori:</span>
            <RiskCategoryBadge category={latestResult?.category} />
          </div>
        }
      >
        <ClinicalWorkflowStepper currentStepId="HPP_SCREENING" />
      </PageHeader>

      {hasLivePriorityHpp && (
        <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-7 w-7 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                    FR-12 • Pemicu Prioritas HPP
                  </span>
                  <h4 className="text-sm font-bold text-red-900">
                    Terdeteksi Faktor Risiko Kritis / Perdarahan Aktif HPP!
                  </h4>
                </div>
                <p className="mt-1 text-xs text-red-800">
                  Siagakan Tim Multidisiplin PONEK, 2 jalur IV kaliber besar,
                  dan persiapan produk darah (Crossmatch) tanpa menunggu form
                  selesai.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEvaluateHpp(true)}
              disabled={submitting}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-red-700"
            >
              Picu Alert Prioritas HPP Sekarang
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
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Jalur 2 • Skrining Risiko Hemoragia Postpartum (HPP — Domain 4T)
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {admission.patient?.full_name} ({admission.patient?.mrn}) — G
              {admission.obstetric_history.gravida}P
              {admission.obstetric_history.para}A
              {admission.obstetric_history.abortus} (UK{" "}
              {admission.usia_kehamilan_minggu} mgg)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Hasil HPP Saat Ini:</span>
            <RiskCategoryBadge category={latestResult?.category} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
          {[
            {
              num: 1,
              title: "1. Kondisi Admisi & Rencana Lahir",
              desc: "Perdarahan Aktif & Metode Persalinan",
            },
            {
              num: 2,
              title: "2. Faktor Risiko 4T & Tambahan",
              desc: "Tonus, Trauma, Jaringan, Trombin",
            },
            {
              num: 3,
              title: "3. Pemeriksaan Hb & Koagulasi",
              desc: "Status Tersedia / Belum Tersedia",
            },
            {
              num: 4,
              title: "4. Hasil & Checklist Kesiapan",
              desc: `Tabel Keputusan ${activeProtocol.version}`,
            },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                step === s.num
                  ? "border-rose-600 bg-rose-50/70 shadow-sm"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step === s.num
                    ? "bg-rose-600 text-white"
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

      {/* STEP 1: DATA AWAL & KONDISI ADMISI */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-rose-600" />
            Penilaian Kondisi Hemodinamik Awal & Rencana Persalinan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Apakah Terdapat Perdarahan Pervaginam Aktif Saat Admisi?
              </div>
              <p className="text-[11px] text-slate-500">
                Pemicu prioritas bila perdarahan antepartum/intrapartum aktif.
              </p>
              <FiveStatusSelector
                value={perdarahanAktif}
                onChange={setPerdarahanAktif}
                compact
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Apakah Terdapat Tanda Instabilitas Hemodinamik / Syok (Takikardia,
                Hipotensi, Akral Dingin)?
              </div>
              <p className="text-[11px] text-slate-500">
                Shock Index (Nadi / Sistolik) &ge; 0.9 merupakan indikator dini
                gangguan hemodinamik obstetri.
              </p>
              <FiveStatusSelector
                value={syokHemodinamik}
                onChange={setSyokHemodinamik}
                compact
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              Rencana Metode Persalinan pada Episode Ini:
            </label>
            <select
              value={rencanaPersalinan}
              onChange={(e) => setRencanaPersalinan(e.target.value as any)}
              className="w-full md:w-96 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
            >
              <option value="PERVAGINAM_SPONTAN">
                Persalinan Pervaginam Spontan (Ambang HPP &ge; 500 mL)
              </option>
              <option value="INDUKSI_AUGMENTASI">
                Persalinan Pervaginam dengan Induksi / Augmentasi Oksitosin
              </option>
              <option value="SEKSIO_SESAREA">
                Seksio Sesarea / SC (Ambang HPP &ge; 1000 mL)
              </option>
              <option value="BELUM_DITENTUKAN">
                Belum Ditentukan / Menunggu Evaluasi Obstetri
              </option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              Selanjutnya: Faktor Risiko Domain 4T &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FAKTOR RISIKO DOMAIN 4T + FAKTOR TAMBAHAN */}
      {step === 2 && (
        <div className="space-y-5">
          {DOMAIN_4T_META.map((dom) => {
            const factors = hppMasters.filter(
              (m) => m.domain_4t === dom.domain
            );
            return (
              <div
                key={dom.domain}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="border-b border-slate-100 pb-3">
                  <span
                    className={`inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${dom.badgeColor}`}
                  >
                    Domain {dom.domain}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {dom.title}
                  </h3>
                  <p className="text-xs text-slate-500">{dom.subtitle}</p>
                </div>

                <div className="space-y-3">
                  {factors.map((m) => {
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
                                  m.risk_tier === "CRITICAL_IMMEDIATE"
                                    ? "bg-red-600 text-white"
                                    : m.risk_tier === "HIGH"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {m.risk_tier === "CRITICAL_IMMEDIATE"
                                  ? "Risiko Kritis"
                                  : m.risk_tier === "HIGH"
                                  ? "Risiko Tinggi"
                                  : "Risiko Sedang"}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {m.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {m.definition}
                            </p>
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
              </div>
            );
          })}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              &larr; Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              Selanjutnya: Pemeriksaan Hb & Koagulasi &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PEMERIKSAAN LABORATORIUM HPP (HB & TROMBOSIT) */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TestTube className="h-4 w-4 text-rose-600" />
              Pemeriksaan Hemoglobin (Hb) & Trombosit Terkait Risiko HPP
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuai Flowchart Skrining HPP (Bab 12): Jika pemeriksaan Hb atau
              faktor relevan belum tersedia, sistem akan menandai data belum
              lengkap dan tidak menganggap kosong sebagai negatif.
            </p>
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
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Catatan Klinis Skrining HPP (Pilih Master Bidan / Template):
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    setClinicalNotes((prev) =>
                      prev
                        ? `${prev} | Pemeriksa: ${e.target.value}`
                        : `Pemeriksa: ${e.target.value}. Kesiapan uterotonika aktif, kantong ukur terkalibrasi (drape) telah disiapkan.`
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
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Catatan kesiapan uterotonika, akses IV, atau ketersediaan darah..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
            />
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              &larr; Kembali ke Faktor 4T
            </button>
            <button
              type="button"
              onClick={() => handleEvaluateHpp(false)}
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-700"
            >
              {submitting
                ? "Mengevaluasi..."
                : `Terapkan Tabel Keputusan HPP (${activeProtocol.version}) \u2192`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: HASIL KLASIFIKASI HPP & CHECKLIST KESIAPAN */}
      {step === 4 && (
        <div className="space-y-6">
          {!latestResult ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Skrining Risiko HPP pada episode admisi ini belum dievaluasi.
              </p>
              <button
                type="button"
                onClick={() => handleEvaluateHpp(false)}
                className="rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-bold text-white"
              >
                Jalankan Evaluasi Skrining HPP Sekarang
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      Versi Tabel Keputusan: {latestResult.protocol_version_number}
                    </span>
                    {latestResult.is_re_evaluation && (
                      <span className="rounded bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                        Evaluasi Ulang (Sebelumnya:{" "}
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
                    • Disimpan secara independen dari hasil Preeklamsia (FR-11).
                  </p>
                </div>
                <RiskCategoryBadge category={latestResult.category} size="lg" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Faktor Pemicu Domain 4T & Alasan Klasifikasi (FR-11)
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-800">
                    {latestResult.rationale.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                  {latestResult.triggered_indicators.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {latestResult.triggered_indicators.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-rose-100 border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-900"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FileWarning className="h-4 w-4 text-amber-700" />
                    Status Kelengkapan Faktor 4T & Lab (NFR-09)
                  </h4>
                  {latestResult.missing_or_unknown_fields.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Seluruh domain 4T (Tonus, Trauma, Jaringan, Trombin) dan
                      pemeriksaan Hb/Trombosit telah dinilai lengkap.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-900">
                        Terdapat{" "}
                        <strong>
                          {latestResult.missing_or_unknown_fields.length} item
                        </strong>{" "}
                        yang masih berstatus <em>Belum Diperiksa</em> /{" "}
                        <em>Belum Tersedia</em>:
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

              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Checklist Kesiapan Antisipasi HPP yang Disahkan Fasilitas
                  (FR-13)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {latestResult.recommended_checklists.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg bg-white p-3 border border-rose-100 text-xs text-slate-800"
                    >
                      <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  &larr; Perbarui Faktor 4T / Evaluasi Ulang
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Cetak Ringkasan Simulasi
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateMonitoring}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Lanjut ke Monitoring Kehilangan Darah Kumulatif & SBAR &rarr;
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
