"use client";

import React, { useState } from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lock,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/services/api-client";
import { RiskCategoryBadge } from "@/components/common/StatusBadge";
import type { UserRole } from "@/types";

export function GovernanceReportsView({
  data,
  currentUserId,
  currentUserRole,
  mode,
  onRefresh,
}: {
  data: BootstrapResponse;
  currentUserId: string;
  currentUserRole: UserRole;
  mode: "REPORTS_RESEARCH" | "PROTOCOL_AUDIT";
  onRefresh: () => Promise<void>;
}) {
  const { db, active_protocol: activeProtocol, evaluation_metrics: metrics } =
    data;

  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Pengaturan Protokol Klinis Berversi (FR-10, FR-21, Bab 3)
  const [newVersion, setNewVersion] = useState<string>("v1.3-2026.11");
  const [crisisSbp, setCrisisSbp] = useState<number>(
    activeProtocol.pe_config.crisis_sbp_threshold
  );
  const [crisisDbp, setCrisisDbp] = useState<number>(
    activeProtocol.pe_config.crisis_dbp_threshold
  );
  const [lowPlateletsPe, setLowPlateletsPe] = useState<number>(
    activeProtocol.pe_config.low_platelets_threshold
  );
  const [warnBloodLoss, setWarnBloodLoss] = useState<number>(
    activeProtocol.hpp_config.postpartum_warn_blood_loss_ml
  );
  const [vaginalHppMl, setVaginalHppMl] = useState<number>(
    activeProtocol.hpp_config.postpartum_vaginal_hpp_ml
  );
  const [scHppMl, setScHppMl] = useState<number>(
    activeProtocol.hpp_config.postpartum_sc_hpp_ml
  );
  const [changeNotes, setChangeNotes] = useState<string>(
    "Validasi ambang pemicu prioritas PE dan ambang kehilangan darah kumulatif E-MOTIVE oleh Komite Medik Obstetri."
  );

  // State Kuesioner SUS (Bab 14 Usability Testing)
  const [susRespCode, setSusRespCode] = useState<string>(
    `RESP-BD-0${db.sus_responses.length + 1}`
  );
  const [susRole, setSusRole] = useState<"BIDAN" | "PERAWAT">("BIDAN");
  const [susUnit, setSusUnit] = useState<string>("Kamar Bersalin (VK)");
  const [susScores, setSusScores] = useState<number[]>([
    5, 2, 5, 1, 5, 2, 4, 1, 5, 2,
  ]);

  async function handlePublishProtocol() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/protocols", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "PUBLISH_NEW_PROTOCOL_VERSION",
          version: newVersion,
          pe_config: {
            ...activeProtocol.pe_config,
            crisis_sbp_threshold: crisisSbp,
            crisis_dbp_threshold: crisisDbp,
            low_platelets_threshold: lowPlateletsPe,
          },
          hpp_config: {
            ...activeProtocol.hpp_config,
            postpartum_warn_blood_loss_ml: warnBloodLoss,
            postpartum_vaginal_hpp_ml: vaginalHppMl,
            postpartum_sc_hpp_ml: scHppMl,
          },
          change_notes: changeNotes,
        },
      });
      await onRefresh();
      setFeedbackMsg(
        `Versi Algoritma & Tabel Keputusan baru (${newVersion}) berhasil disahkan oleh Validator Klinis dan langsung aktif (FR-21).`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleAnonymousMode(enabled: boolean) {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/protocols", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "TOGGLE_ANONYMOUS_MODE",
          default_anonymous_mode: enabled,
        },
      });
      await onRefresh();
      setFeedbackMsg(
        `Kebijakan privasi pasien prototipe berhasil diubah ke: ${
          enabled ? "Mode Kode Anonim (NFR-03)" : "Mode Identitas Terbatas"
        }.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitSus() {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest("/protocols", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "SUBMIT_SUS_SCORE",
          respondent_code: susRespCode,
          respondent_role: susRole,
          unit_name: susUnit,
          q_scores: susScores,
        },
      });
      await onRefresh();
      setFeedbackMsg(
        `Responden ${res.sus_entry.respondent_code} berhasil disimpan dengan Skor SUS: ${res.sus_entry.calculated_sus_score} (Target Proposal > 68).`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "REPORTS_RESEARCH") {
    return (
      <div className="space-y-6">
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

        {/* Kartu Target Evaluasi Proposal (Bab 14 SRS) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Uji Kesesuaian Pakar (Cohen&apos;s &kappa;)
              </span>
              <Award className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              &kappa; = {metrics.cohens_kappa}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">
              Target Proposal: &ge; 0,61 ({metrics.observed_agreement_percent}%
              Konkordan)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                System Usability Scale (SUS)
              </span>
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.avg_sus_score} / 100
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">
              Target Proposal: &gt; 68 ({db.sus_responses.length} Responden
              Bidan/Perawat)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Rata-rata Waktu Pengisian SIGAP
              </span>
              <Clock className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.avg_sigap_seconds} dtk
            </div>
            <div className="text-[11px] font-semibold text-indigo-700 mt-1">
              vs Manual {metrics.avg_manual_seconds} dtk (Hemat{" "}
              {metrics.time_saved_percent}% Waktu)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Validasi Kelayakan Ahli Materi/TI
              </span>
              <BarChart3 className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              91,4%
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">
              Target Proposal: &ge; 81% (Sangat Layak)
            </div>
          </div>
        </div>

        {/* Tabel Uji Kesesuaian Skenario Anonim/Sintetis dengan Konsensus 2 Pakar (Bab 14) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Uji Kesesuaian Klasifikasi Sistem vs Konsensus 2 Pakar &
              Perbandingan Waktu Pengisian (Bab 14 SRS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Digunakan untuk analisis reliabilitas inter-rater{" "}
              <strong>Cohen&apos;s kappa (&kappa;)</strong> serta uji beda
              kecepatan pengisian aplikasi vs formulir manual (
              <em>paired t-test / Wilcoxon</em>).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Jalur</th>
                  <th className="py-2.5 px-3">Skenario Klinis Anonim/Sintetis</th>
                  <th className="py-2.5 px-3">Hasil SIGAP</th>
                  <th className="py-2.5 px-3">Konsensus 2 Pakar</th>
                  <th className="py-2.5 px-3">Waktu Manual</th>
                  <th className="py-2.5 px-3">Waktu SIGAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.concordance_scenarios.map((sc) => (
                  <tr key={sc.scenario_id}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {sc.code}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          sc.pathway === "PE"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {sc.pathway}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {sc.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sc.clinical_vignette}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskCategoryBadge
                        category={sc.system_category}
                        size="sm"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskCategoryBadge
                        category={sc.consensus_category}
                        size="sm"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {sc.manual_form_seconds} dtk
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      {sc.sigap_app_seconds} dtk
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form & Rekap System Usability Scale (SUS) Bidan/Perawat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Input Evaluasi Usability Bidan/Perawat — System Usability Scale
              (SUS)
            </h3>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kode Responden
                </label>
                <input
                  type="text"
                  value={susRespCode}
                  onChange={(e) => setSusRespCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Profesi
                </label>
                <select
                  value={susRole}
                  onChange={(e) => setSusRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                >
                  <option value="BIDAN">Bidan</option>
                  <option value="PERAWAT">Perawat Obstetri</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unit Tugas
                </label>
                <input
                  type="text"
                  value={susUnit}
                  onChange={(e) => setSusUnit(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmitSus}
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Simpan Skor Responden SUS
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Responden SUS Tercatat (Target Rata-rata &gt; 68)
            </h3>
            <div className="space-y-2 text-xs">
              {db.sus_responses.map((r) => (
                <div
                  key={r.sus_id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {r.respondent_code} ({r.respondent_role})
                    </span>
                    <span className="ml-2 text-slate-500">{r.unit_name}</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-0.5 font-extrabold text-emerald-800">
                    Skor SUS: {r.calculated_sus_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE: PROTOCOL_AUDIT (Manajemen Protokol Klinis Berversi & Audit Log)
  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Validator Klinis: Pengesahan Versi Tabel Keputusan (FR-10, FR-21, Bab 3) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="inline-block rounded bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-900">
                SRS Bab 3 & FR-21 • Pemisahan Kewenangan Klinis vs TI
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Manajemen Tabel Keputusan & Versi Algoritma (Khusus Validator
                Klinis)
              </h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Aktif: {activeProtocol.version}
            </span>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <strong>CATATAN PENTING SRS BAB 3:</strong> Admin TI tidak berwenang
            mengubah aturan klinis. Saat ini Anda login sebagai role{" "}
            <strong>{currentUserRole}</strong>.{" "}
            {currentUserRole !== "VALIDATOR_KLINIS" &&
              "Jika Anda menekan tombol Sahkan di bawah dengan role selain VALIDATOR_KLINIS, server Backend akan menolak aksi dan mencatatnya di Audit Log."}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor Versi Protokol Baru:
              </label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang Trombositopenia PE (/uL):
              </label>
              <input
                type="number"
                value={lowPlateletsPe}
                onChange={(e) => setLowPlateletsPe(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang TD Sistolik Krisis PE (mmHg):
              </label>
              <input
                type="number"
                value={crisisSbp}
                onChange={(e) => setCrisisSbp(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang TD Diastolik Krisis PE (mmHg):
              </label>
              <input
                type="number"
                value={crisisDbp}
                onChange={(e) => setCrisisDbp(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Peringatan Dini Perdarahan E-MOTIVE (mL):
              </label>
              <input
                type="number"
                value={warnBloodLoss}
                onChange={(e) => setWarnBloodLoss(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang HPP Pervaginam / SC (mL):
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={vaginalHppMl}
                  onChange={(e) => setVaginalHppMl(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 font-bold"
                />
                <input
                  type="number"
                  value={scHppMl}
                  onChange={(e) => setScHppMl(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Pengesahan Validator Klinis:
            </label>
            <textarea
              rows={2}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <button
            type="button"
            onClick={handlePublishProtocol}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Sahkan & Aktifkan Versi Algoritma Baru (FR-21)
          </button>
        </div>

        {/* Pengaturan Privasi Anonimisasi & Daftar Versi Protokol */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-700" />
              Kebijakan Privasi & Identitas Pasien Prototipe (FR-03, NFR-03,
              Bab 16 #1)
            </h3>
            <p className="text-xs text-slate-500">
              Mengatur apakah registrasi pasien baru secara default menggunakan{" "}
              <strong>Kode Anonim Penelitian</strong> (misal{" "}
              <code>SGP-2026-004</code>) atau{" "}
              <strong>Identitas Terbatas Rekam Medis</strong>.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleToggleAnonymousMode(false)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-bold ${
                  !db.system_settings.default_anonymous_mode
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Mode Identitas Terbatas (No. RM & Nama)
              </button>
              <button
                type="button"
                onClick={() => handleToggleAnonymousMode(true)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-bold ${
                  db.system_settings.default_anonymous_mode
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Mode Kode Anonim Penelitian (NFR-03)
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Versi Protokol Klinis Terdaftar (`clinical_protocols`)
            </h3>
            <div className="space-y-2.5 text-xs">
              {db.clinical_protocols.map((p) => (
                <div
                  key={p.protocol_version_id}
                  className="rounded-lg border border-slate-200 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {p.version} — {p.title}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Disetujui oleh: <strong>{p.approved_by_name}</strong> •
                    Berlaku: {p.effective_date}
                  </div>
                  <div className="text-slate-600">{p.change_notes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Audit Log (FR-20 & NFR-04) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Jejak Audit Sistem & Perubahan Data Penting (`audit_logs` — FR-20 &
          NFR-04)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pengguna & Role</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Entitas</th>
                <th className="py-2.5 px-3">Ringkasan Perubahan & Versi Aturan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.audit_logs.map((log) => (
                <tr
                  key={log.audit_id}
                  className={
                    log.action === "BLOCKED_UNAUTHORIZED_ACTION"
                      ? "bg-red-50"
                      : ""
                  }
                >
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">
                      {log.user_name}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {log.user_role}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        log.action === "BLOCKED_UNAUTHORIZED_ACTION" ||
                        log.action === "TRIGGER_PRIORITY_ALERT"
                          ? "bg-red-100 text-red-800"
                          : log.action === "APPROVE_PROTOCOL"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {log.entity}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">
                    {log.change_summary}{" "}
                    {log.protocol_version_ref && (
                      <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                        {log.protocol_version_ref}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
