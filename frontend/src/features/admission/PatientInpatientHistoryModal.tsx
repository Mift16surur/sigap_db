"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  FileText,
  HeartPulse,
  Droplets,
  Activity,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Stethoscope,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import type { SigapDatabase, ClinicalProtocol } from "@/types";
import { DEFAULT_CLINICAL_SCREENING_CRITERIA } from "@/types";

interface PatientInpatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: any; // Enriched admission or Admission with patient & unit
  db: SigapDatabase;
  activeProtocol: ClinicalProtocol;
}

export function PatientInpatientHistoryModal({
  isOpen,
  onClose,
  admission,
  db,
  activeProtocol,
}: PatientInpatientHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<
    "ANAMNESA" | "SKRINING_KLINIS" | "OBSERVASI_VITAL" | "RESUME_PULANG"
  >("ANAMNESA");

  if (!isOpen || !admission) return null;

  const patient =
    admission.patient ||
    db.patients.find((p) => p.patient_id === admission.patient_id);
  const unit =
    admission.unit || db.units.find((u) => u.unit_id === admission.unit_id);

  // Data Terkait dari DB
  const peScreening = db.pe_screenings.find(
    (s) => s.admission_id === admission.admission_id
  );
  const hppScreening = db.hpp_screenings.find(
    (s) => s.admission_id === admission.admission_id
  );

  const peResults = db.screening_results
    .filter(
      (r) =>
        r.admission_id === admission.admission_id && r.screening_type === "PE"
    )
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    );
  const hppResults = db.screening_results
    .filter(
      (r) =>
        r.admission_id === admission.admission_id && r.screening_type === "HPP"
    )
    .sort(
      (a, b) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime()
    );

  const latestPe = peResults[0] || admission.latest_pe_result;
  const latestHpp = hppResults[0] || admission.latest_hpp_result;

  const monitoringRecords = db.monitoring_records
    .filter((m) => m.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(a.observation_time).getTime() -
        new Date(b.observation_time).getTime()
    );

  const bloodLossRecords = db.blood_loss_records
    .filter((b) => b.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );

  const sbarReports = db.sbar_reports
    .filter((s) => s.admission_id === admission.admission_id)
    .sort(
      (a, b) =>
        new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
    );

  const hbLab = db.lab_results.find(
    (l) => l.admission_id === admission.admission_id && l.test_code === "HEMOGLOBIN"
  );
  const riskDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission.admission_id && d.response === "YA"
  );
  const pePositiveFactors = riskDetails.filter((d) => d.pathway === "PE");
  const hppPositiveFactors = riskDetails.filter((d) => d.pathway === "HPP");

  // Handler Cetak Histori
  const handlePrint = () => {
    window.print();
  };

  const obs = admission.obstetric_history || {};

  const getRiskBadge = (category?: string) => {
    const cat = (category || "LOW").toUpperCase();
    if (cat === "HIGH") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          RISIKO TINGGI
        </span>
      );
    }
    if (cat === "MODERATE") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          RISIKO SEDANG
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        RISIKO RENDAH
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 print:bg-white print:border-b-2">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold text-xs font-mono tracking-wider">
                {admission.admission_code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                  admission.status === "CLOSED"
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {admission.status === "CLOSED" ? "STATUS: PULANG / SELESAI" : "STATUS: RAWAT AKTIF"}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Unit: {unit?.name || admission.unit_name || "Kamar Bersalin (VK)"}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate mt-1">
              HISTORI RAWAT INAP — {patient?.full_name || "PASIEN"}{" "}
              <span className="text-blue-600 font-mono text-sm sm:text-base">
                (RM: {patient?.mrn || "-"})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak Histori</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 4 TAB NAVIGATION BERSIH & RAPI SESUAI DATA INPUT */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("ANAMNESA")}
            className={`py-3 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ANAMNESA"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>ASESMEN &amp; DATA ADMISI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SKRINING_KLINIS")}
            className={`py-3 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "SKRINING_KLINIS"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>HASIL SKRINING RISIKO (PE &amp; HPP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OBSERVASI_VITAL")}
            className={`py-3 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "OBSERVASI_VITAL"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>OBSERVASI &amp; MONITORING ({monitoringRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("RESUME_PULANG")}
            className={`py-3 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "RESUME_PULANG"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>RINGKASAN PULANG (RINGPAS)</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200">
          {/* ============================================================== */}
          {/* TAB 1: ASESMEN & DATA ADMISI (HANYA DATA ASLI INPUTAN)          */}
          {/* ============================================================== */}
          {activeTab === "ANAMNESA" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Petugas & Tanggal Masuk */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block font-semibold">Petugas Penanggung Jawab:</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    DPJP: <span className="text-blue-600">{admission.attending_doctor_name || "-"}</span> • Bidan Penerima: <span className="text-slate-700 dark:text-slate-300">{admission.receiving_midwife_name || "-"}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold font-mono sm:text-right">
                  Waktu Masuk: {new Date(admission.admission_date || admission.created_at).toLocaleString("id-ID")}
                </div>
              </div>

              {/* 1. KELUHAN UTAMA */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-1">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                  Keluhan Utama Saat Admisi
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic">
                  &ldquo;{admission.keluhan_utama || "Tidak ada keluhan khusus yang dicatat."}&rdquo;
                </p>
              </div>

              {/* 2. IDENTITAS PASIEN & DATA REGISTRASI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kartu Identitas Pasien */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    Identitas Pasien
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Nama Lengkap:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{patient?.full_name || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">No. Rekam Medis (MRN):</span>
                      <strong className="text-blue-600 font-mono">{patient?.mrn || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">NIK:</span>
                      <span className="font-mono">{patient?.nik || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Tgl Lahir / Usia:</span>
                      <span>{patient?.birth_date || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Jenis Kelamin:</span>
                      <span>{patient?.gender || "Perempuan"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Golongan Darah:</span>
                      <span>{patient?.blood_type || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px] block">Alamat / Domisili:</span>
                      <span>{patient?.address || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px] block">Kontak / Telepon:</span>
                      <span>{patient?.phone || patient?.kontak_darurat || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Kartu Informasi Admisi */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    Informasi Admisi &amp; Rujukan
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">No. Admisi:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{admission.admission_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Ruang / Unit:</span>
                      <strong>{unit?.name || admission.unit_name || "VK Bersalin"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Penjamin Pasien:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{admission.penjamin || "UMUM"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Asal Rujukan:</span>
                      <span>{admission.asal_rujukan || "Datang Sendiri"}</span>
                    </div>
                    {admission.nomor_rujukan && (
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[11px] block">No. Surat Rujukan:</span>
                        <span className="font-mono">{admission.nomor_rujukan}</span>
                      </div>
                    )}
                    {admission.diagnosa_rujukan && (
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[11px] block">Diagnosa Rujukan:</span>
                        <span>{admission.diagnosa_rujukan}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. RIWAYAT OBSTETRI & GINEKOLOGI (INPUT ASLI DARI ADMISI) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                  Riwayat Obstetri &amp; Ginekologi
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Paritas:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      G{obs.gravida ?? 1} P{obs.para ?? 0} A{obs.abortus ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Anak Hidup:</span>
                    <span>{obs.living_children ?? 0} Orang</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Usia Kehamilan:</span>
                    <strong>
                      {admission.usia_kehamilan_minggu || 0} Mgg {admission.usia_kehamilan_hari || 0} Hari
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Riwayat SC:</span>
                    <span>{obs.riwayat_sc_jumlah > 0 ? `${obs.riwayat_sc_jumlah}x Seksio Sesarea` : "Tidak Pernah"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Riwayat PE Sebelumnya:</span>
                    <span className={obs.riwayat_pe_sebelumnya === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.riwayat_pe_sebelumnya || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Riwayat Eklamsia:</span>
                    <span className={obs.riwayat_eklamsia_sebelumnya === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.riwayat_eklamsia_sebelumnya || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Riwayat HPP Sebelumnya:</span>
                    <span className={obs.riwayat_hpp_sebelumnya === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.riwayat_hpp_sebelumnya || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Kehamilan Ganda:</span>
                    <span className={obs.kehamilan_ganda === "YA" ? "text-amber-600 font-bold" : ""}>
                      {obs.kehamilan_ganda || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Jarak Antar Kehamilan:</span>
                    <span>{obs.interval_kehamilan_tahun ? `${obs.interval_kehamilan_tahun} Tahun` : "-"}</span>
                  </div>
                </div>
              </div>

              {/* 4. RIWAYAT PENYAKIT KOMORBID (INPUT ASLI DARI ADMISI) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  Riwayat Penyakit Komorbiditas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Hipertensi Kronis:</span>
                    <span className={obs.hipertensi_kronis === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.hipertensi_kronis || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Diabetes Melitus:</span>
                    <span className={obs.diabetes_melitus === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.diabetes_melitus || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Penyakit Ginjal:</span>
                    <span className={obs.penyakit_ginjal === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.penyakit_ginjal || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Autoimun / SLE:</span>
                    <span className={obs.penyakit_autoimun_sle_aps === "YA" ? "text-rose-600 font-bold" : ""}>
                      {obs.penyakit_autoimun_sle_aps || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Obesitas (IMT &gt; 30):</span>
                    <span className={obs.obesitas_imt_lebih_30 === "YA" ? "text-amber-600 font-bold" : ""}>
                      {obs.obesitas_imt_lebih_30 || "TIDAK"} {obs.imt_nilai ? `(${obs.imt_nilai} kg/m²)` : ""}
                    </span>
                  </div>
                </div>
                {obs.catatan_komorbid && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px] block">Catatan Komorbid Tambahan:</span>
                    <span className="text-slate-800 dark:text-slate-200">{obs.catatan_komorbid}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: HASIL SKRINING RISIKO KLINIS (PE & HPP)                  */}
          {/* ============================================================== */}
          {activeTab === "SKRINING_KLINIS" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Hasil Pengkajian Skrining Klinis (PE &amp; HPP)
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Pedoman {activeProtocol?.title || "Nasional"}
                </span>
              </div>

              {/* Status Hasil Skrining Terpadu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skrining PE */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                      <HeartPulse className="h-4 w-4 text-blue-600" />
                      Tahap 1: Skrining Risiko PE
                    </span>
                    {getRiskBadge(latestPe?.category)}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">
                    {latestPe?.summary_headline || "Skrining preeklamsia telah tersimpan di rekam medis."}
                  </p>
                  {latestPe?.calculated_at && (
                    <span className="block text-[11px] text-slate-400 font-mono">
                      Waktu Evaluasi: {new Date(latestPe.calculated_at).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>

                {/* Skrining HPP */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                      <Droplets className="h-4 w-4 text-rose-600" />
                      Tahap 2: Skrining Risiko HPP (4T)
                    </span>
                    {getRiskBadge(latestHpp?.category)}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">
                    {latestHpp?.summary_headline || "Skrining perdarahan postpartum telah tersimpan di rekam medis."}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    {hbLab && (
                      <span>Kadar Hb: <strong className="text-slate-700 dark:text-slate-300">{hbLab.value_numeric || hbLab.value_text} {hbLab.unit || "g/dL"}</strong></span>
                    )}
                    {latestHpp?.calculated_at && (
                      <span>Waktu Evaluasi: {new Date(latestHpp.calculated_at).toLocaleString("id-ID")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Butir Faktor Risiko Positif (Jawaban YA) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Daftar Faktor Risiko Terpenuhi (Jawaban &ldquo;Ya&rdquo; saat Skrining):
                </h4>

                {pePositiveFactors.length === 0 && hppPositiveFactors.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    Tidak ada butir faktor risiko klinis yang positif / seluruhnya dijawab Tidak atau berada pada kategori risiko rendah.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {pePositiveFactors.map((f, idx) => {
                      const criteriaList = db.master_catalog?.clinical_screening_criteria || DEFAULT_CLINICAL_SCREENING_CRITERIA;
                      const factorName =
                        criteriaList.find(
                          (c) => c.criterion_id === f.risk_factor_code || c.criterion_id === f.risk_factor_id || c.label === f.risk_factor_code
                        )?.label ||
                        db.risk_factors.find(
                          (rf) =>
                            rf.risk_factor_id === f.risk_factor_id ||
                            rf.code === f.risk_factor_code
                        )?.label ||
                        f.note ||
                        f.risk_factor_code;
                      return (
                        <div
                          key={`pe-${idx}`}
                          className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 shadow-2xs space-y-1"
                        >
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            PE • {f.domain || "Faktor Risiko"}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {factorName}
                          </p>
                        </div>
                      );
                    })}

                    {hppPositiveFactors.map((f, idx) => {
                      const criteriaList = db.master_catalog?.clinical_screening_criteria || DEFAULT_CLINICAL_SCREENING_CRITERIA;
                      const factorName =
                        criteriaList.find(
                          (c) => c.criterion_id === f.risk_factor_code || c.criterion_id === f.risk_factor_id || c.label === f.risk_factor_code
                        )?.label ||
                        db.risk_factors.find(
                          (rf) =>
                            rf.risk_factor_id === f.risk_factor_id ||
                            rf.code === f.risk_factor_code
                        )?.label ||
                        f.note ||
                        f.risk_factor_code;
                      return (
                        <div
                          key={`hpp-${idx}`}
                          className="p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 shadow-2xs space-y-1"
                        >
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            HPP 4T • {f.domain || "Faktor Risiko"}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {factorName}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: OBSERVASI & MONITORING BERKALA (INPUTAN AKTUAL)          */}
          {/* ============================================================== */}
          {activeTab === "OBSERVASI_VITAL" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Histori Observasi Tanda Vital Berkala
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {monitoringRecords.length} Log Observasi Tercatat
                </span>
              </div>

              {monitoringRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  Belum ada log pemantauan tanda vital berkala yang diinput di menu Monitoring untuk admisi ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      <tr>
                        <th className="p-2.5">Waktu</th>
                        <th className="p-2.5">Fase</th>
                        <th className="p-2.5">TD (mmHg)</th>
                        <th className="p-2.5">HR (bpm)</th>
                        <th className="p-2.5">RR (/mnt)</th>
                        <th className="p-2.5">Suhu (°C)</th>
                        <th className="p-2.5">SpO2 (%)</th>
                        <th className="p-2.5">Shock Index</th>
                        <th className="p-2.5">Tonus Uterus</th>
                        <th className="p-2.5">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {monitoringRecords.map((m) => {
                        const isHighBp = m.systolic >= 140 || m.diastolic >= 90;
                        return (
                          <tr
                            key={m.monitoring_id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              isHighBp ? "bg-rose-50/40 dark:bg-rose-950/20 font-bold" : ""
                            }`}
                          >
                            <td className="p-2.5 font-sans whitespace-nowrap">
                              {new Date(m.observation_time).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="p-2.5 font-sans">{m.phase}</td>
                            <td className={`p-2.5 ${isHighBp ? "text-rose-600" : ""}`}>
                              {m.systolic}/{m.diastolic}
                            </td>
                            <td className="p-2.5">{m.heart_rate}</td>
                            <td className="p-2.5">{m.respiratory_rate}</td>
                            <td className="p-2.5">{m.temperature_c}°C</td>
                            <td className="p-2.5">{m.spo2_percent}%</td>
                            <td className="p-2.5">{m.shock_index}</td>
                            <td className="p-2.5 font-sans">{m.uterine_tonus}</td>
                            <td className="p-2.5 font-sans text-slate-500">
                              {m.recorded_by}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rangkuman Perdarahan (QBL) jika ada */}
              {bloodLossRecords.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-xs">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block">
                    Kuantifikasi Kehilangan Darah Terukur (QBL):
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {bloodLossRecords.map((b, idx) => (
                      <div
                        key={b.blood_loss_id || idx}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                      >
                        <span className="text-slate-400 text-[10px] block font-sans">
                          {b.phase} ({new Date(b.measured_at).toLocaleTimeString("id-ID")}):
                        </span>
                        <strong>{b.volume_ml} ml</strong> • Kumulatif:{" "}
                        <span className="text-rose-600 font-bold">
                          {b.cumulative_volume_ml} ml
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Laporan SBAR Handover jika ada */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Komunikasi Handover SBAR ({sbarReports.length} Laporan)
                </span>
                {sbarReports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Belum ada laporan eskalasi SBAR khusus yang dibuat untuk admisi ini.
                  </p>
                ) : (
                  sbarReports.map((sbar) => (
                    <div
                      key={sbar.sbar_id}
                      className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-2 text-xs"
                    >
                      <div className="flex justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300">
                        <span>Laporan SBAR: {sbar.pathway} ({sbar.communication_channel})</span>
                        <span className="font-mono text-slate-400">{new Date(sbar.reported_at).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-950">
                          <strong className="text-purple-700 block">S (Situation):</strong> {sbar.situation}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-950">
                          <strong className="text-purple-700 block">B (Background):</strong> {sbar.background}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-950">
                          <strong className="text-purple-700 block">A (Assessment):</strong> {sbar.assessment}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-950">
                          <strong className="text-purple-700 block">R (Recommendation):</strong> {sbar.recommendation}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                        <span>Penerima: <strong>{sbar.recipient_doctor_name}</strong></span>
                        <span>Pelapor: <strong>{sbar.created_by}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: RINGKASAN PULANG (RINGPAS RESUME MEDIS)                  */}
          {/* ============================================================== */}
          {activeTab === "RESUME_PULANG" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Ringkasan Kepulangan Pasien (RingPas)
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    admission.status === "CLOSED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {admission.status === "CLOSED" ? "Selesai / Pulang" : "Dalam Perawatan Aktif"}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Waktu Masuk:</span>
                    <strong>{new Date(admission.admission_date || admission.created_at).toLocaleString("id-ID")}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Waktu Pulang:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {admission.discharge_at ? new Date(admission.discharge_at).toLocaleString("id-ID") : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Lama Rawat:</span>
                    <strong>{admission.losString || "1 Hari"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Status Admisi:</span>
                    <strong className={admission.status === "CLOSED" ? "text-emerald-700 dark:text-emerald-400" : "text-blue-600"}>
                      {admission.status === "CLOSED" ? "Pulang / Discharged" : "Rawat Aktif"}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan Ringkasan Pasien Pulang:
                  </span>
                  <p className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-xs leading-relaxed">
                    {admission.discharge_summary ||
                      "Pasien masih dalam masa rawat aktif. Catatan ringkasan pulang akan tersimpan begitu admisi diselesaikan melalui tombol Selesai/Pulang."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 print:hidden">
          <div className="text-[11px] text-slate-500">
            Sistem Informasi Obstetri SIGAP CDSS • Data Asli Rekam Medis Elektronik
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup Jendela Histori
          </button>
        </div>
      </div>
    </div>
  );
}
