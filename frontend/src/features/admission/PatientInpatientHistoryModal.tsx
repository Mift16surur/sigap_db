"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  FileText,
  Clock,
  HeartPulse,
  Droplets,
  Activity,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  ShieldCheck,
  Check,
  Building2,
  FileCheck2,
  Info,
  ChevronRight,
} from "lucide-react";
import type { SigapDatabase, ClinicalProtocol, Admission } from "@/types";

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
    | "ANAMNESA"
    | "CATATAN_BIDAN"
    | "ASESMEN_MEDIS"
    | "SKRINING_KLINIS"
    | "OBSERVASI_VITAL"
    | "LAPORAN_SBAR"
    | "BUNDLE_SOP"
    | "RESUME_PULANG"
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

  const clinicalActions = db.clinical_actions.filter(
    (a) => a.admission_id === admission.admission_id
  );

  const riskDetails = db.screening_risk_details.filter(
    (d) => d.admission_id === admission.admission_id
  );

  const labResults = db.lab_results.filter(
    (l) => l.admission_id === admission.admission_id
  );

  // Handler Cetak Histori
  const handlePrint = () => {
    window.print();
  };

  const obs = admission.obstetric_history || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[94vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 print:bg-white print:border-b-2">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold text-[10px] font-mono tracking-wider">
                {admission.admission_code}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                STATUS: {admission.status || "CLOSED"}
              </span>
              <span className="text-xs text-slate-500">
                Unit: {unit?.name || "VK Bersalin"}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate mt-1">
              HISTORI RAWAT INAP — {patient?.full_name || "PASIEN"}{" "}
              <span className="text-blue-600 font-mono text-sm sm:text-base">
                ({patient?.mrn || "-"})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak Histori</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* HORIZONTAL TAB NAVIGATION (MIRIP DENGAN TAMPILAN CONTOH) */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("ANAMNESA")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "ANAMNESA"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            ASESMEN KEPERAWATAN / ANAMNESA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CATATAN_BIDAN")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "CATATAN_BIDAN"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            CATATAN PERAWAT / BIDAN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ASESMEN_MEDIS")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "ASESMEN_MEDIS"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            ASESMEN MEDIS (DPJP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("OBSERVASI_VITAL")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "OBSERVASI_VITAL"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            OBSERVASI & TANDA VITAL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LAPORAN_SBAR")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "LAPORAN_SBAR"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            LAPORAN HANDOVER (SBAR)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SKRINING_KLINIS")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "SKRINING_KLINIS"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            SKRINING RISIKO KLINIS (PE & HPP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BUNDLE_SOP")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "BUNDLE_SOP"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            CHECKLIST BUNDLE SOP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RESUME_PULANG")}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === "RESUME_PULANG"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            RINGKASAN PULANG (RPP)
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200">
          {/* ============================================================== */}
          {/* TAB 1: ASESMEN KEPERAWATAN / ANAMNESA (PERSIS SEPERTI GAMBAR)   */}
          {/* ============================================================== */}
          {activeTab === "ANAMNESA" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Baris Petugas & Waktu */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="font-extrabold text-sm uppercase text-slate-900 dark:text-slate-100">
                  {admission.receiving_midwife_name || "BIDAN KOORDINATOR PONEK"}
                </div>
                <div className="text-xs text-slate-500 font-semibold font-mono">
                  {new Date(
                    admission.admission_date || admission.created_at
                  ).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* SECTION HEADER KUNING/ORANYE: ANAMNESA */}
              <div className="bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-1.5 px-4 text-center rounded-xs shadow-2xs">
                ANAMNESA
              </div>

              {/* Data Anamnesa Terstruktur */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    Data diperoleh dari:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Pasien sendiri didampingi keluarga / suami
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    Keluhan Utama:
                  </span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    &ldquo;{admission.keluhan_utama || "Pasien datang untuk evaluasi persalinan"}&rdquo;
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    Indikasi Rawat:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    G{obs.gravida || 1}P{obs.para || 0}A{obs.abortus || 0}, Usia Kehamilan {admission.usia_kehamilan_minggu || 38} Minggu {admission.usia_kehamilan_hari || 0} Hari • Rujukan: {admission.asal_rujukan || "Datang Sendiri"}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    Riwayat Penyakit Sekarang:
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    Pasien rujukan dari {admission.asal_rujukan || "faskes jejaring"} dengan indikasi evaluasi persalinan dan pemantauan tanda bahaya obstetri (Preeklamsia & HPP).
                  </span>
                </div>

                {/* Sub-bagian Riwayat Kesehatan Dahulu */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 underline">
                    Riwayat Kesehatan Dahulu
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Penyakit Sistemik:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        HT ({obs.hipertensi_kronis || "TIDAK"}), DM ({obs.diabetes_melitus || "TIDAK"}), Ginjal ({obs.penyakit_ginjal || "TIDAK"}), Autoimun/SLE ({obs.penyakit_autoimun_sle_aps || "TIDAK"}), Obesitas IMT&gt;30 ({obs.obesitas_imt_lebih_30 || "TIDAK"})
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Penggunaan Obat:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        Tidak ada riwayat konsumsi obat jangka panjang selain suplemen kehamilan (Tablet Tambah Darah / Kalsium).
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Penyakit Keluarga:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        Tidak ada riwayat penyakit berat dalam keluarga inti.
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Alergi:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        Tidak ada alergi obat maupun makanan yang dilaporkan.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-bagian Riwayat Obstetri & Reproduksi */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 underline">
                    Riwayat Obstetri &amp; Ginekologi
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-1">
                    <div>
                      <span className="font-bold text-slate-500 block">Paritas:</span>
                      <span>G{obs.gravida || 1} P{obs.para || 0} A{obs.abortus || 0}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Anak Hidup:</span>
                      <span>{obs.living_children || 0} Orang</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Seksio Sesarea:</span>
                      <span>{obs.riwayat_sc_jumlah > 0 ? `${obs.riwayat_sc_jumlah}x SC` : "Tidak Pernah"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Kehamilan Ganda:</span>
                      <span>{obs.kehamilan_ganda || "TIDAK"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat PE Sebelumnya:</span>
                      <span>{obs.riwayat_pe_sebelumnya || "TIDAK"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat Eklamsia:</span>
                      <span>{obs.riwayat_eklamsia_sebelumnya || "TIDAK"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Riwayat HPP Sebelumnya:</span>
                      <span>{obs.riwayat_hpp_sebelumnya || "TIDAK"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Jarak Kehamilan:</span>
                      <span>{obs.interval_kehamilan_tahun ? `${obs.interval_kehamilan_tahun} Tahun` : "&gt; 2 Tahun / Anak Pertama"}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-bagian Kebutuhan Bio-Psiko-Sosio-Spiritual-Kultural-Ekonomi (Sesuai Referensi Gambar) */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 underline">
                    Kebutuhan Bio Psiko Sosio Spiritual Kultural Ekonomi
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Biologis:</span>
                      <span>Terpenuhi dengan baik, nutrisi dan istirahat teratur.</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Psikologis:</span>
                      <span>Tidak Ada Masalah / Tenang dan kooperatif dalam penanganan.</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Kultural:</span>
                      <span>Berobat untuk sembuh dan mendukung persalinan aman di RS.</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Sosial:</span>
                      <span>Hubungan dengan keluarga dan lingkungan sangat baik.</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Ekonomis:</span>
                      <span>Penjaminan JKN / BPJS Kesehatan / Mandiri.</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Aspek Spiritual:</span>
                      <span>Mandiri dalam berdoa dan beribadah.</span>
                    </div>
                  </div>
                </div>

                {/* Kontak Pendamping */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-500 block mb-0.5">
                    Kontak Darurat / Pendamping:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {patient?.kontak_darurat || "Suami / Keluarga Terdekat"} • Alamat: {patient?.alamat_singkat || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: CATATAN BIDAN / PERAWAT (CPPT KEBIDANAN)                 */}
          {/* ============================================================== */}
          {activeTab === "CATATAN_BIDAN" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  Catatan Asuhan Kebidanan &amp; Perawat Pelaksana
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Unit: {unit?.name || "VK Bersalin"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      [Penerimaan &amp; Orientasi Ruangan]
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(admission.admission_date || admission.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Pasien diterima di {unit?.name || "VK Bersalin"} dalam kondisi sadar. Telah dilakukan serah terima berkas rujukan dari {admission.asal_rujukan || "Puskesmas"}, penjelasan hak pasien, persetujuan umum (general consent), dan orientasi fasilitas ruangan.
                  </p>
                  <div className="text-[11px] text-slate-500 font-semibold pt-1">
                    Bidan Pelaksana: {admission.receiving_midwife_name || "Bidan Koordinator"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      [Pelaksanaan Skrining Awal &amp; Tanda Bahaya]
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(admission.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Telah dilakukan pengkajian 28 butir faktor risiko skrining terpadu (Pedoman RISE &amp; 4T HPP). Tanda vital awal telah dicatat ke dalam rekam medis elektronik. Pasien dan pendamping diberikan edukasi tanda bahaya (nyeri kepala berat, pandangan kabur, perdarahan hebat).
                  </p>
                  <div className="text-[11px] text-slate-500 font-semibold pt-1">
                    Hasil: PE ({latestPe?.category || "LOW"}), HPP ({latestHpp?.category || "LOW"})
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-700 dark:text-purple-400">
                      [Evaluasi Akhir Kepulangan / Pemindahan Pasien]
                    </span>
                    <span className="text-slate-400 font-mono">
                      {admission.discharge_at ? new Date(admission.discharge_at).toLocaleString("id-ID") : "Saat Ini"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Kondisi ibu stabil, kontraksi uterus baik, lokia fisiologis, tidak didapatkan tanda bahaya aktif. Pasien diberikan edukasi tanda bahaya nifas dan jadwal kontrol ulang 1 minggu pascasalin.
                  </p>
                  <div className="text-[11px] text-slate-500 font-semibold pt-1">
                    Status Admisi: CLOSED • Berkas dipindahkan ke Ringkasan Pasien.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: ASESMEN MEDIS (DPJP)                                     */}
          {/* ============================================================== */}
          {activeTab === "ASESMEN_MEDIS" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  Instruksi &amp; Asesmen Dokter Penanggung Jawab Pelayanan (DPJP)
                </h3>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  {admission.attending_doctor_name || "dr. Spesialis Obstetri & Ginekologi"}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Diagnosis Medis Utama &amp; Penyerta:
                  </span>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                    G{obs.gravida || 1}P{obs.para || 0}A{obs.abortus || 0} Hamil {admission.usia_kehamilan_minggu || 38} Minggu inpartu dengan {admission.keluhan_utama || "evaluasi persalinan normal"}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Instruksi Medis &amp; Rencana Tatalaksana (Standing Orders):
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-slate-800 dark:text-slate-200">
                    <li>Observasi ketat tanda-tanda vital setiap jam dan tanda inpartu aktif.</li>
                    <li>Lakukan skrining risiko Preeklamsia dan HPP 4T menggunakan pedoman protokol CDSS SIGAP ({activeProtocol?.title || "Protokol PONEK"}).</li>
                    <li>Manajemen aktif kala III rutin (Oksitosin 10 IU IM segera setelah bayi lahir, PTT, masase fundus uteri).</li>
                    <li>Kuantifikasi kehilangan darah menggunakan graduated drape / tabung penampung terkalibrasi (QBL).</li>
                    <li>Laporkan segera via SBAR bila tekanan darah &ge; 140/90 mmHg atau kehilangan darah kumulatif &gt; 500 ml.</li>
                  </ul>
                </div>

                <div>
                  <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Kesimpulan Akhir DPJP:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {admission.discharge_summary || "Pasien telah menyelesaikan masa perawatan obstetri dengan baik, hemodinamik stabil, dan diperbolehkan rawat jalan dengan instruksi kontrol rutin."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: OBSERVASI & TANDA VITAL                                  */}
          {/* ============================================================== */}
          {activeTab === "OBSERVASI_VITAL" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Histori Observasi Tanda-Tanda Vital &amp; Kehilangan Darah
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Total {monitoringRecords.length} Catatan Observasi
                </span>
              </div>

              {monitoringRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  Belum ada log observasi monitoring tanda vital berkala yang tersimpan untuk admisi ini.
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

              {/* Rangkuman Perdarahan (QBL) */}
              {bloodLossRecords.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-xs">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block">
                    Kuantifikasi Kehilangan Darah Kumulatif (QBL):
                  </span>
                  <div className="flex flex-wrap gap-4">
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
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: LAPORAN HANDOVER (SBAR)                                  */}
          {/* ============================================================== */}
          {activeTab === "LAPORAN_SBAR" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Riwayat Komunikasi Handover SBAR Antar Shift / DPJP
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {sbarReports.length} Laporan Tersimpan
                </span>
              </div>

              {sbarReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  Tidak ada rekaman laporan handover eskalasi SBAR khusus yang dibuat untuk admisi ini.
                </div>
              ) : (
                sbarReports.map((sbar) => (
                  <div
                    key={sbar.sbar_id}
                    className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-purple-200/50 pb-2">
                      <div className="font-bold text-purple-900 dark:text-purple-300">
                        Laporan SBAR — {sbar.pathway} ({sbar.communication_channel})
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {new Date(sbar.reported_at).toLocaleString("id-ID")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950">
                        <strong className="text-purple-700 block mb-0.5">S (Situation):</strong>
                        <span>{sbar.situation}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950">
                        <strong className="text-purple-700 block mb-0.5">B (Background):</strong>
                        <span>{sbar.background}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950">
                        <strong className="text-purple-700 block mb-0.5">A (Assessment):</strong>
                        <span>{sbar.assessment}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950">
                        <strong className="text-purple-700 block mb-0.5">R (Recommendation):</strong>
                        <span>{sbar.recommendation}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 flex items-center justify-between">
                      <span>Dilaporkan kepada: <strong>{sbar.recipient_doctor_name}</strong></span>
                      <span>Dibuat oleh: <strong>{sbar.created_by}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: SKRINING RISIKO KLINIS (PE & HPP)                         */}
          {/* ============================================================== */}
          {activeTab === "SKRINING_KLINIS" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Rekapitulasi Lengkap Skrining Preeklamsia &amp; HPP
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Protokol {activeProtocol?.title || "Nasional"} ({activeProtocol?.version || "v1.0"})
                </span>
              </div>

              {/* Status Hasil Skrining Terpadu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                      <HeartPulse className="h-4 w-4 text-blue-600" />
                      Skrining Preeklamsia (PE)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        latestPe?.category === "HIGH"
                          ? "bg-rose-100 text-rose-800"
                          : latestPe?.category === "MODERATE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      RISIKO {latestPe?.category || "LOW"}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {latestPe?.summary_headline || "Tidak ditemukan tanda bahaya preeklamsia berat pada admisi."}
                  </p>
                  {latestPe?.rationale && latestPe.rationale.length > 0 && (
                    <ul className="list-disc pl-4 text-[10px] text-slate-500">
                      {latestPe.rationale.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                      <Droplets className="h-4 w-4 text-rose-600" />
                      Skrining Perdarahan Postpartum (HPP 4T)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        latestHpp?.category === "HIGH"
                          ? "bg-rose-100 text-rose-800"
                          : latestHpp?.category === "MODERATE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      RISIKO {latestHpp?.category || "LOW"}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {latestHpp?.summary_headline || "Manajemen aktif kala III rutin telah diterapkan."}
                  </p>
                  {latestHpp?.rationale && latestHpp.rationale.length > 0 && (
                    <ul className="list-disc pl-4 text-[10px] text-slate-500">
                      {latestHpp.rationale.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Rincian Faktor Risiko Positif Teridentifikasi */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">
                  Daftar Faktor Risiko Teridentifikasi:
                </span>
                {riskDetails.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    Semua butir skrining berada dalam batas risiko rendah / tidak ada faktor risiko klinis signifikan yang positif.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {riskDetails.map((rd) => (
                      <div
                        key={rd.risk_detail_id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2"
                      >
                        <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-slate-900 dark:text-slate-100">
                            {rd.risk_factor_code}: {rd.domain}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            Respons: {rd.response} ({rd.info_source})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: CHECKLIST BUNDLE SOP                                     */}
          {/* ============================================================== */}
          {activeTab === "BUNDLE_SOP" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  Checklist Bundle SOP Kesiapan Klinis
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Tindakan Klinis Sesuai Rekomendasi
                </span>
              </div>

              {clinicalActions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  Tindakan bundle SOP rutin dilaksanakan langsung sesuai alur pelayanan VK/rawat inap.
                </div>
              ) : (
                <div className="space-y-2">
                  {clinicalActions.map((act) => (
                    <div
                      key={act.action_id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center ${
                            act.status === "DONE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <strong className="block text-slate-900 dark:text-slate-100">
                            {act.action_label}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            Kode: {act.action_code} • Jalur: {act.pathway}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.status === "DONE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {act.status}
                        </span>
                        {act.performed_at && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(act.performed_at).toLocaleTimeString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: RINGKASAN PULANG (RPP RESUME MEDIS)                      */}
          {/* ============================================================== */}
          {activeTab === "RESUME_PULANG" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Ringkasan Pasien
                </h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Selesai Rawat Inap
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Waktu Masuk:</span>
                    <strong>{new Date(admission.admission_date || admission.created_at).toLocaleString("id-ID")}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Waktu Pulang:</span>
                    <strong className="text-emerald-700">
                      {admission.discharge_at ? new Date(admission.discharge_at).toLocaleString("id-ID") : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Lama Rawat (LOS):</span>
                    <strong>{admission.losString || "1 hari"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Keadaan Keluar:</span>
                    <strong className="text-emerald-700">Sembuh / Membaik</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ringkasan Akhir Perawatan:
                  </span>
                  <p className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                    {admission.discharge_summary ||
                      "Pasien dinyatakan sehat, tanda vital normal, involusi uterus baik, perdarahan lokia fisiologis, dan diperbolehkan pulang dengan instruksi kontrol rutin."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Rencana Kontrol Lanjutan:
                    </span>
                    <span>Poli Kebidanan & Kandungan SIGAP App (1 minggu pascapersalinan)</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Edukasi Tanda Bahaya:
                    </span>
                    <span>Segera kembali jika demam tinggi, perdarahan bertambah banyak, atau nyeri kepala hebat.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 print:hidden">
          <div className="text-[11px] text-slate-500">
            Sistem Informasi Obstetri SIGAP CDSS • Rekam Medis Elektronik Tuntas
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
          >
            Tutup Jendela Histori
          </button>
        </div>
      </div>
    </div>
  );
}

