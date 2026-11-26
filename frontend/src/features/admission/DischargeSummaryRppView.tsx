"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileText,
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  ShieldAlert,
  HeartPulse,
  Droplets,
  Stethoscope,
  Building2,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  UserCheck,
  Eye,
  Activity,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  BadgeInfo,
  Scale,
  Baby,
  UserRound,
  Download,
  FileDown,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/services/api-client";
import { DEFAULT_CLINICAL_SCREENING_CRITERIA } from "@/types";
import type { SigapDatabase, ClinicalProtocol, RiskCategory } from "@/types";
import { PatientInpatientHistoryModal } from "./PatientInpatientHistoryModal";

interface DischargeSummaryRppViewProps {
  db: SigapDatabase;
  activeProtocol: ClinicalProtocol;
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onNavigateScreening?: (admId: string) => void;
}

export function DischargeSummaryRppView({
  db,
  activeProtocol,
  currentUserId,
  onRefresh,
  onNavigateScreening,
}: DischargeSummaryRppViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CLOSED" | "ACTIVE">("ALL");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "HIGH" | "MODERATE" | "LOW">("ALL");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>("");
  const [historyModalAdmission, setHistoryModalAdmission] = useState<any | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown cetak ketika pengguna mengklik area luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setShowPrintDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ambil semua episode admisi pasien dengan data terhubung
  const allEnrichedAdmissions = useMemo(() => {
    return db.admissions
      .map((adm) => {
        const patient = db.patients.find((p) => p.patient_id === adm.patient_id);
        const unit = db.units.find((u) => u.unit_id === adm.unit_id);
        const pe = db.pe_screenings.find((s) => s.admission_id === adm.admission_id);
        const hpp = db.hpp_screenings.find((s) => s.admission_id === adm.admission_id);
        const latestPe = db.screening_results
          .filter((e) => e.admission_id === adm.admission_id && e.screening_type === "PE")
          .sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())[0];
        const latestHpp = db.screening_results
          .filter((e) => e.admission_id === adm.admission_id && e.screening_type === "HPP")
          .sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())[0];

        // Hitung lama rawat (Length of Stay)
        const entryTime = new Date(adm.admission_date || adm.created_at).getTime();
        const dischargeTime = adm.discharge_at ? new Date(adm.discharge_at).getTime() : Date.now();
        const diffHours = Math.max(1, Math.round((dischargeTime - entryTime) / (1000 * 60 * 60)));
        const diffDays = Math.floor(diffHours / 24);
        const losString = diffDays > 0 ? `${diffDays} hari ${diffHours % 24} jam` : `${diffHours} jam`;

        return {
          ...adm,
          patient,
          unit,
          pe_screening: pe,
          hpp_screening: hpp,
          latest_pe_result: latestPe,
          latest_hpp_result: latestHpp,
          losString,
        };
      })
      .sort((a, b) => {
        // Prioritaskan yang baru saja diupdate/pulang
        const timeB = new Date(b.discharge_at || b.updated_at || b.admission_date).getTime();
        const timeA = new Date(a.discharge_at || a.updated_at || a.admission_date).getTime();
        return timeB - timeA;
      });
  }, [db]);

  // Filter pencarian, status perawatan, dan kategori risiko
  const filteredAdmissions = useMemo(() => {
    return allEnrichedAdmissions.filter((adm) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        adm.patient?.full_name?.toLowerCase().includes(q) ||
        adm.patient?.mrn?.toLowerCase().includes(q) ||
        adm.admission_code?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "CLOSED" && adm.status === "CLOSED") ||
        (statusFilter === "ACTIVE" && adm.status !== "CLOSED");

      const maxRisk =
        adm.latest_pe_result?.category === "HIGH" || adm.latest_hpp_result?.category === "HIGH"
          ? "HIGH"
          : adm.latest_pe_result?.category === "MODERATE" || adm.latest_hpp_result?.category === "MODERATE"
          ? "MODERATE"
          : "LOW";

      const matchRisk = riskFilter === "ALL" || maxRisk === riskFilter;

      return matchSearch && matchStatus && matchRisk;
    });
  }, [allEnrichedAdmissions, searchQuery, statusFilter, riskFilter]);

  // Pasien yang saat ini aktif dipilih untuk dilihat ringkasannya
  const activeDischarge = useMemo(() => {
    if (selectedAdmissionId) {
      const found = filteredAdmissions.find((a) => a.admission_id === selectedAdmissionId);
      if (found) return found;
    }
    return filteredAdmissions[0] || null;
  }, [filteredAdmissions, selectedAdmissionId]);

  // Ambil butir faktor risiko Preeklamsia (PE) yang bernilai "YA" secara riil
  const pePositiveFactors = useMemo(() => {
    if (!activeDischarge) return [];
    const criteriaList = db.master_catalog?.clinical_screening_criteria || DEFAULT_CLINICAL_SCREENING_CRITERIA;
    return db.screening_risk_details
      .filter(
        (d) => d.admission_id === activeDischarge.admission_id && d.pathway === "PE" && d.response === "YA"
      )
      .map((d) => {
        const factor = db.risk_factors.find(
          (rf) => rf.risk_factor_id === d.risk_factor_id || rf.code === d.risk_factor_code
        );
        const criterion = criteriaList.find(
          (c) => c.criterion_id === d.risk_factor_code || c.criterion_id === d.risk_factor_id || c.label === d.risk_factor_code
        );
        return {
          id: d.risk_detail_id,
          code: d.risk_factor_code || criterion?.criterion_id || factor?.code || "FR-PE",
          label: criterion?.label || factor?.label || d.note || d.risk_factor_code || d.risk_factor_id,
          category:
            criterion?.risk_tier ||
            (factor?.risk_tier === "HIGH" ||
            factor?.risk_tier === "CRITICAL_IMMEDIATE" ||
            factor?.domain_4t === "PE_HIGH_RISK"
              ? "HIGH"
              : "MODERATE"),
          domain: d.domain || criterion?.domain_id,
          note: d.note,
        };
      });
  }, [activeDischarge, db.screening_risk_details, db.risk_factors, db.master_catalog?.clinical_screening_criteria]);

  // Ambil butir faktor risiko Perdarahan (HPP 4T) yang bernilai "YA" secara riil
  const hppPositiveFactors = useMemo(() => {
    if (!activeDischarge) return [];
    const criteriaList = db.master_catalog?.clinical_screening_criteria || DEFAULT_CLINICAL_SCREENING_CRITERIA;
    return db.screening_risk_details
      .filter(
        (d) => d.admission_id === activeDischarge.admission_id && d.pathway === "HPP" && d.response === "YA"
      )
      .map((d) => {
        const factor = db.risk_factors.find(
          (rf) => rf.risk_factor_id === d.risk_factor_id || rf.code === d.risk_factor_code
        );
        const criterion = criteriaList.find(
          (c) => c.criterion_id === d.risk_factor_code || c.criterion_id === d.risk_factor_id || c.label === d.risk_factor_code
        );
        return {
          id: d.risk_detail_id,
          code: d.risk_factor_code || criterion?.criterion_id || factor?.code || "FR-HPP",
          label: criterion?.label || factor?.label || d.note || d.risk_factor_code || d.risk_factor_id,
          category: criterion?.risk_tier || factor?.risk_tier || "HIGH",
          domain: d.domain || criterion?.domain_id || factor?.domain_4t || "TONUS",
          note: d.note,
        };
      });
  }, [activeDischarge, db.screening_risk_details, db.risk_factors, db.master_catalog?.clinical_screening_criteria]);

  // Riwayat Pengukuran Tekanan Darah Terakhir
  const latestBp = useMemo(() => {
    if (!activeDischarge) return null;
    return (
      db.bp_measurements
        .filter((b) => b.admission_id === activeDischarge.admission_id)
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0] || null
    );
  }, [activeDischarge, db.bp_measurements]);

  // Riwayat Hasil Laboratorium Terkait
  const patientLabs = useMemo(() => {
    if (!activeDischarge) return [];
    return db.lab_results.filter((l) => l.admission_id === activeDischarge.admission_id);
  }, [activeDischarge, db.lab_results]);

  // Handler: Buka Kembali Admisi (Re-open)
  const handleReopenAdmission = async (admId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin membatalkan status selesai/pulang dan mengaktifkan kembali pasien ini ke daftar skrining aktif?"
      )
    ) {
      return;
    }
    setIsReopening(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "REOPEN_ADMISSION",
          admission_id: admId,
        },
      });
      await onRefresh();
      setFeedbackMessage(
        "Episode admisi berhasil diaktifkan kembali. Pasien kini berstatus aktif di ruang pelayanan."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengaktifkan kembali admisi.");
    } finally {
      setIsReopening(false);
    }
  };

  // Handler: Cetak Langsung (Kirim ke Printer Fisik)
  const handleDirectPrint = () => {
    setShowPrintDropdown(false);
    if (!activeDischarge) return;
    const oldTitle = document.title;
    const cleanName = (activeDischarge.patient?.full_name || "Pasien").replace(/[^a-zA-Z0-9]/g, "_");
    const mrn = activeDischarge.patient?.mrn || "NoRM";
    document.title = `Ringkasan-Pasien_${cleanName}_${mrn}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  // Handler: Download sebagai Dokumen PDF Resmi dari Backend API
  const handleDownloadPdf = async () => {
    setShowPrintDropdown(false);
    if (!activeDischarge) return;
    setIsDownloadingPdf(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    const cleanName = (activeDischarge.patient?.full_name || "Pasien").replace(/[^a-zA-Z0-9]/g, "_");
    const mrn = activeDischarge.patient?.mrn || "NoRM";
    const filename = `Ringkasan_Pasien_${cleanName}_${mrn}.pdf`;

    try {
      // 1. Panggil Endpoint Backend Ekspor PDF
      const res = await fetch(`/api/v1/admissions/export-pdf?admission_id=${encodeURIComponent(activeDischarge.admission_id)}`, {
        method: "GET",
        headers: {
          "x-sigap-user-id": currentUserId,
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Gagal mengunduh dokumen PDF dari server backend.");
      }

      // 2. Terima Binary Stream PDF asli dari backend
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // 3. Picu pengunduhan file .pdf langsung di browser
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(blobUrl);

      setFeedbackMessage(`✓ Berkas dokumen PDF asli "${filename}" berhasil diunduh dari server.`);
    } catch (err: any) {
      console.error("Download PDF error:", err);
      setErrorMessage(err.message || "Gagal mengunduh dokumen PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handler: Unduh File Dokumen HTML Siap Pakai & Cetak Offline
  const handleDownloadOfflineHtml = () => {
    setShowPrintDropdown(false);
    if (!activeDischarge) return;
    const element = document.getElementById("printable-rpp-sheet");
    if (!element) return;
    const cleanName = (activeDischarge.patient?.full_name || "Pasien").replace(/[^a-zA-Z0-9]/g, "_");
    const mrn = activeDischarge.patient?.mrn || "NoRM";
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ringkasan Pasien - ${activeDischarge.patient?.full_name || "Pasien"} (${mrn})</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #000; padding: 24px; }
  </style>
</head>
<body class="bg-white text-slate-900">
  <div class="max-w-4xl mx-auto">
    ${element.outerHTML}
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ringkasan-Pasien_${cleanName}_${mrn}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMessage("Berkas ringkasan pasien berhasil diunduh ke komputer Anda.");
  };

  // Helper IMT
  const patientImt =
    activeDischarge?.obstetric_history?.imt_nilai ||
    (activeDischarge?.obstetric_history as any)?.imt_ibu ||
    null;

  // Cek apakah risiko PE Tinggi (Kontraindikasi Metilergometrin)
  const isHighPe = activeDischarge?.latest_pe_result?.category === "HIGH";

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HEADER SECTION: MIRIP MENU SKRINING & STANDAR SIGAP
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-[11px] font-bold tracking-wide border border-blue-300 dark:border-blue-800">
              Rekam Medis Terpadu
            </span>
            <span className="text-xs text-slate-500">• Standar Pelayanan Obstetri SIGAP App</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-blue-600" />
            Ringkasan Pasien
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Rekapitulasi komprehensif data pendaftaran, riwayat obstetri, hasil evaluasi skrining PE & HPP 4T, serta instruksi tindak lanjut kepulangan pasien.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400/90 dark:border-blue-600 flex items-center gap-3 shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                {allEnrichedAdmissions.filter((a) => a.status === "CLOSED").length} Selesai • {allEnrichedAdmissions.filter((a) => a.status !== "CLOSED").length} Aktif
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                Total {allEnrichedAdmissions.length} Pasien Terdaftar
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK & ERROR BANNER */}
      {feedbackMessage && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          {onNavigateScreening && activeDischarge && (
            <button
              onClick={() => onNavigateScreening(activeDischarge.admission_id)}
              className="font-bold underline hover:text-emerald-950 ml-3 shrink-0"
            >
              Lihat di Menu Skrining &rarr;
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* JIKA TIDAK ADA PASIEN */}
      {allEnrichedAdmissions.length === 0 ? (
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Belum Ada Data Pasien Terdaftar
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Silakan lakukan pendaftaran pasien baru pada menu <strong>Pendaftaran Pasien</strong>, lalu lakukan evaluasi pada menu <strong>Skrining</strong>.
          </p>
        </div>
      ) : (
        /* =========================================================================
            LAYOUT 2-KOLOM: DAFTAR PASIEN DI KIRI & LEMBAR RINGKASAN DI KANAN
           ========================================================================= */
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* =======================================================================
              KOLOM KIRI: DAFTAR PASIEN (PERSIS DENGAN TAMPILAN MENU SKRINING)
             ======================================================================= */}
          <div className="w-full lg:w-[320px] 2xl:w-[350px] shrink-0 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col print:hidden">
            {/* Header Biru "Daftar Pasien" */}
            <div className="bg-[#2457d6] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm tracking-wide">Daftar Pasien</span>
              </div>
              <button
                type="button"
                onClick={() => onRefresh()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Muat ulang data pasien"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Input Pencarian & Filter Status */}
            <div className="p-3 border-b border-blue-100 dark:border-blue-900/60 space-y-2.5 bg-blue-50/20 dark:bg-slate-800/30">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No. RM atau nama..."
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Pills Status: Semua, Selesai (Pulang), Aktif */}
              <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  }`}
                >
                  Semua <span className="opacity-75 text-[10px]">({allEnrichedAdmissions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("CLOSED")}
                  className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                    statusFilter === "CLOSED"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  }`}
                >
                  Selesai <span className="opacity-75 text-[10px]">({allEnrichedAdmissions.filter((a) => a.status === "CLOSED").length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  }`}
                >
                  Aktif <span className="opacity-75 text-[10px]">({allEnrichedAdmissions.filter((a) => a.status !== "CLOSED").length})</span>
                </button>
              </div>

              {/* Filter Pills Risiko: Semua, Tinggi, Sedang, Rendah */}
              <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold pt-1">
                <button
                  type="button"
                  onClick={() => setRiskFilter("ALL")}
                  className={`py-0.5 rounded-md text-center transition-all ${
                    riskFilter === "ALL"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                      : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter("HIGH")}
                  className={`py-0.5 rounded-md text-center transition-all ${
                    riskFilter === "HIGH"
                      ? "bg-rose-600 text-white font-bold"
                      : "bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900"
                  }`}
                >
                  Tinggi
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter("MODERATE")}
                  className={`py-0.5 rounded-md text-center transition-all ${
                    riskFilter === "MODERATE"
                      ? "bg-amber-600 text-white font-bold"
                      : "bg-white dark:bg-slate-800 text-amber-600 border border-amber-200 dark:border-amber-900"
                  }`}
                >
                  Sedang
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter("LOW")}
                  className={`py-0.5 rounded-md text-center transition-all ${
                    riskFilter === "LOW"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-200 dark:border-emerald-900"
                  }`}
                >
                  Rendah
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-medium px-0.5">
                Menampilkan {filteredAdmissions.length} dari {allEnrichedAdmissions.length} pasien
              </div>
            </div>

            {/* List Kartu Pasien (Dengan Animasi & Gaya Skrining) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[640px] overflow-y-auto">
              {filteredAdmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Tidak ada pasien yang sesuai filter pencarian.
                </div>
              ) : (
                filteredAdmissions.map((adm) => {
                  const isSelected = adm.admission_id === activeDischarge?.admission_id;
                  const patientName = adm.patient?.full_name || "Pasien";
                  const initial = patientName.charAt(0).toUpperCase();

                  const isHigh =
                    adm.latest_pe_result?.category === "HIGH" ||
                    adm.latest_hpp_result?.category === "HIGH";
                  const isMod =
                    adm.latest_pe_result?.category === "MODERATE" ||
                    adm.latest_hpp_result?.category === "MODERATE";

                  const isClosed = adm.status === "CLOSED";

                  return (
                    <div
                      key={adm.admission_id}
                      onClick={() => setSelectedAdmissionId(adm.admission_id)}
                      className={`p-3.5 cursor-pointer transition-all duration-300 ease-out border-l-[6px] select-none active:scale-[0.98] ${
                        isSelected
                          ? "border-l-blue-600 bg-gradient-to-r from-blue-100/90 via-blue-50 to-indigo-50/70 dark:from-blue-950/80 dark:via-blue-900/50 dark:to-slate-900 shadow-sm ring-1 ring-blue-300/80 dark:ring-blue-700/80 -translate-y-0.5"
                          : "border-l-transparent bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 hover:border-l-blue-300 dark:hover:border-l-blue-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar Bulat Inisial */}
                        <div
                          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 ring-2 ring-blue-300/70 dark:ring-blue-500/50"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {initial}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Nama Pasien & Indikator Aktif */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`text-xs uppercase truncate transition-colors ${
                                isSelected
                                  ? "font-black text-blue-950 dark:text-blue-100 tracking-tight"
                                  : "font-bold text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {patientName}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-2xs shrink-0 animate-in fade-in zoom-in-75 duration-200">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                                <span>Terpilih</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              RM {adm.patient?.mrn || "-"}
                            </span>{" "}
                            • {adm.patient?.age_years || "-"} Th
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Ruangan:{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {adm.unit?.name || "VK Bersalin"}
                            </span>
                          </div>

                          <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                            <span className="text-slate-500">Status:</span>
                            {isClosed ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1 text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                Pulang ({adm.discharge_at ? new Date(adm.discharge_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Selesai"})
                              </span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                Sedang Dirawat
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isHigh
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : isMod
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isHigh ? "RISIKO TINGGI" : isMod ? "RISIKO SEDANG" : "RISIKO RENDAH"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Rawat: {adm.losString}
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {adm.admission_code}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModalAdmission(adm);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[10px] shadow-2xs transition-all cursor-pointer"
                              title="Lihat Histori Seluruh Inputan Pasien Ini"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Histori Rawat</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* =======================================================================
              KOLOM KANAN: LEMBAR BERKAS RINGKASAN PASIEN RESMI
             ======================================================================= */}
          {activeDischarge && (
            <div className="flex-1 w-full space-y-4">
              {/* ACTION BAR ATAS DENGAN GARIS PINGGIR BIRU TEBAL */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Berkas Pasien:</span>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">
                    {activeDischarge.patient?.full_name} ({activeDischarge.admission_code})
                  </span>
                  {activeDischarge.status === "CLOSED" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Selesai / Pulang
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Sedang Dirawat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHistoryModalAdmission(activeDischarge)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 dark:border-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3.5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Histori Seluruh Inputan</span>
                  </button>

                  {activeDischarge.status === "CLOSED" ? (
                    <button
                      type="button"
                      onClick={() => handleReopenAdmission(activeDischarge.admission_id)}
                      disabled={isReopening}
                      title="Buka kembali admisi jika pasien batal pulang atau ada tindakan tambahan"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                      <span>{isReopening ? "Membuka..." : "Buka Kembali Admisi"}</span>
                    </button>
                  ) : (
                    onNavigateScreening && (
                      <button
                        type="button"
                        onClick={() => onNavigateScreening(activeDischarge.admission_id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-800 dark:text-blue-200 px-3.5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <HeartPulse className="h-3.5 w-3.5 text-blue-600" />
                        <span>Buka Skrining</span>
                      </button>
                    )
                  )}

                  {/* TOMBOL PILIHAN: CETAK LANGSUNG ATAU DOWNLOAD PDF */}
                  <div className="relative" ref={printDropdownRef}>
                    <div className="inline-flex rounded-xl shadow-xs">
                      {/* Tombol Utama */}
                      <button
                        type="button"
                        onClick={handleDirectPrint}
                        className="inline-flex items-center gap-1.5 rounded-l-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer border-r border-blue-500/70"
                        title="Klik untuk langsung cetak ke printer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Cetak Ringkasan</span>
                      </button>

                      {/* Tombol Panah Pilihan / Dropdown */}
                      <button
                        type="button"
                        onClick={() => setShowPrintDropdown((prev) => !prev)}
                        className="inline-flex items-center px-2.5 py-2 rounded-r-xl bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 cursor-pointer"
                        title="Pilihan: Cetak Langsung atau Download PDF"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            showPrintDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {/* Dropdown Menu Pilihan */}
                    {showPrintDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-300 tracking-wider">
                            Pilihan Cetak & Unduh
                          </span>
                        </div>

                        {/* Opsi 1: Cetak Langsung */}
                        <button
                          type="button"
                          onClick={handleDirectPrint}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Printer className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600">
                              Cetak Langsung
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                              Kirim langsung ke perangkat printer fisik yang terhubung.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 2: Download PDF Langsung dari Backend */}
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={isDownloadingPdf}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-start gap-2.5 group cursor-pointer disabled:opacity-50"
                        >
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            {isDownloadingPdf ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 flex items-center gap-1.5">
                              <span>{isDownloadingPdf ? "Mengunduh PDF..." : "Download PDF Asli"}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                PDF
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                              Unduh berkas .PDF resmi hasil inputan dari server.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 3: Unduh Berkas Mandiri (.HTML) */}
                        <button
                          type="button"
                          onClick={handleDownloadOfflineHtml}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <FileDown className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-purple-600">
                              Unduh File Berkas (.HTML)
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                              Download salinan offline siap cetak tanpa dialog print.
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DOKUMEN CETAK RESMI: LEMBAR RINGKASAN PASIEN */}
              <div
                id="printable-rpp-sheet"
                className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6 text-slate-900 dark:text-slate-100 print:border-none print:shadow-none print:p-0 print:text-black"
              >
                {/* KOP RESUME MEDIS OBSTETRI */}
                <div className="border-b-2 border-slate-900 dark:border-slate-300 pb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                      +
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                        SIGAP App — Pelayanan Obstetri
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Instalasi Pelayanan Obstetri Maternal Perinatal • PONEK 24 Jam
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Sistem Pendukung Keputusan Klinis SIGAP (Protokol {activeProtocol.version})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-bold font-mono tracking-wider border border-blue-200 dark:border-blue-800">
                      FORM RINGKASAN PASIEN
                    </div>
                    <div className="text-xs font-black text-blue-600 dark:text-blue-400 mt-1">
                      NO. RM: {activeDischarge.patient?.mrn || "-"}
                    </div>
                  </div>
                </div>

                <div className="text-center py-1">
                  <h3 className="text-base font-black uppercase tracking-wider underline text-slate-900 dark:text-slate-100">
                    RINGKASAN PASIEN (CLINICAL SUMMARY)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rekam Jejak Klinis Terpadu Berdasarkan Inputan Pendaftaran dan Skrining Klinis
                  </p>
                </div>

                {/* =================================================================
                    BAGIAN I: IDENTITAS PASIEN (DARI PENDAFTARAN & MASTER PASIEN)
                   ================================================================= */}
                <div className="rounded-xl border-2 border-blue-200/80 dark:border-blue-900/60 p-4 space-y-3 bg-blue-50/20 dark:bg-slate-800/20">
                  <div className="border-b border-blue-200 dark:border-blue-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        1
                      </span>
                      I. Identitas Pasien
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Nama Lengkap Pasien:</span>
                      <strong className="uppercase text-slate-900 dark:text-slate-100 font-bold">
                        {activeDischarge.patient?.full_name || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Nomor Rekam Medis (RM):</span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {activeDischarge.patient?.mrn || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Tanggal Lahir / Usia:</span>
                      <span className="font-medium">
                        {activeDischarge.patient?.tanggal_lahir || "-"} ({activeDischarge.patient?.age_years || "-"} Tahun)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Golongan Darah:</span>
                      <strong className="text-blue-700 dark:text-blue-400">
                        {activeDischarge.patient?.golongan_darah || "Belum Diisi"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Nomor Induk Kependudukan (NIK):</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {activeDischarge.patient?.nik_masked || (activeDischarge.patient as any)?.nik || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kontak Darurat / HP:</span>
                      <span>{activeDischarge.patient?.kontak_darurat || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Alamat Domisili:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {activeDischarge.patient?.alamat_singkat || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    BAGIAN II: EPISODE RAWAT & RIWAYAT OBSTETRI (INPUTAN PENDAFTARAN)
                   ================================================================= */}
                <div className="rounded-xl border-2 border-blue-200/80 dark:border-blue-900/60 p-4 space-y-3 bg-blue-50/20 dark:bg-slate-800/20">
                  <div className="border-b border-blue-200 dark:border-blue-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      II. Riwayat Rawat & Status Obstetri
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kode Admisi:</span>
                      <strong className="font-mono text-blue-700 dark:text-blue-300">
                        {activeDischarge.admission_code}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Tanggal & Jam Masuk:</span>
                      <span>
                        {new Date(activeDischarge.admission_date || activeDischarge.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Status Selesai / Pulang:</span>
                      {activeDischarge.discharge_at ? (
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {new Date(activeDischarge.discharge_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      ) : (
                        <span className="text-blue-600 font-semibold">Sedang Masa Rawat</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Lama Rawat:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{activeDischarge.losString}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Ruangan / Unit Pelayanan:</span>
                      <strong>{activeDischarge.unit?.name || "Kamar Bersalin (VK)"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Status Paritas (GPA):</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">
                        G{activeDischarge.obstetric_history.gravida} P{activeDischarge.obstetric_history.para} A{activeDischarge.obstetric_history.abortus} (Hidup: {activeDischarge.obstetric_history.living_children})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Usia Kehamilan:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {activeDischarge.usia_kehamilan_minggu} Minggu {activeDischarge.usia_kehamilan_hari} Hari
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Riwayat Bekas SC:</span>
                      <span>
                        {activeDischarge.obstetric_history.riwayat_sc_jumlah > 0
                          ? `${activeDischarge.obstetric_history.riwayat_sc_jumlah}x Seksio Sesarea`
                          : "Tidak ada riwayat SC"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Antropometri Ibu:</span>
                      <span>
                        TB: {(activeDischarge.obstetric_history as any)?.tb_cm || "-"} cm • BB: {(activeDischarge.obstetric_history as any)?.bb_saat_ini_kg || "-"} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Indeks Massa Tubuh (IMT):</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {patientImt ? `${patientImt} kg/m²` : "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Dokter DPJP:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {activeDischarge.attending_doctor_name || "dr. Spesialis Obstetri"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Bidan Penerima:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {activeDischarge.receiving_midwife_name || "Bidan Jaga"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Asal Rujukan & Faskes:</span>
                      <span>
                        {activeDischarge.asal_rujukan || "Datang Sendiri"}{" "}
                        {activeDischarge.referral_facility_name ? `• ${activeDischarge.referral_facility_name}` : ""}
                        {activeDischarge.nomor_rujukan ? ` (No: ${activeDischarge.nomor_rujukan})` : ""}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Diagnosa Awal Masuk:</span>
                      <span>
                        {activeDischarge.diagnosa_rujukan || (activeDischarge as any).diagnosa_awal || "Observasi Inpartu / Evaluasi Maternal"}
                      </span>
                    </div>

                    <div className="col-span-2 md:col-span-4 pt-1">
                      <span className="text-slate-500 block text-[11px] font-semibold">
                        Keluhan Utama Saat Masuk:
                      </span>
                      <p className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 italic text-slate-800 dark:text-slate-200">
                        &ldquo;{activeDischarge.keluhan_utama || "Tidak ada catatan keluhan khusus saat admisi."}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    BAGIAN III: HASIL EVALUASI SKRINING PREEKLAMSIA (PE)
                   ================================================================= */}
                <div className="rounded-xl border-2 border-blue-200/80 dark:border-blue-900/60 p-4 space-y-3 bg-blue-50/20 dark:bg-slate-800/20">
                  <div className="border-b border-blue-200 dark:border-blue-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        3
                      </span>
                      III. Hasil Evaluasi Skrining Preeklamsia (PE)
                    </h4>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                            Tingkat Risiko Preeklamsia
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Waktu Evaluasi:{" "}
                            {activeDischarge.latest_pe_result?.calculated_at
                              ? new Date(activeDischarge.latest_pe_result.calculated_at).toLocaleString("id-ID")
                              : activeDischarge.pe_screening?.screening_time
                              ? new Date(activeDischarge.pe_screening.screening_time).toLocaleString("id-ID")
                              : "Belum dilakukan evaluasi"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                            activeDischarge.latest_pe_result?.category === "HIGH"
                              ? "bg-rose-100 text-rose-800 border-2 border-rose-300"
                              : activeDischarge.latest_pe_result?.category === "MODERATE"
                              ? "bg-amber-100 text-amber-800 border-2 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
                          }`}
                        >
                          RISIKO {activeDischarge.latest_pe_result?.category || "LOW (RENDAH)"}
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Parameter Tekanan Darah Terakhir */}
                    {latestBp && (
                      <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px] block">Tekanan Darah Terakhir:</span>
                          <strong className="text-blue-950 dark:text-blue-200 text-sm">
                            {latestBp.systolic} / {latestBp.diastolic} mmHg
                          </strong>
                          <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                            (MAP: {Math.round(latestBp.mean_arterial_pressure)} mmHg • HR: {latestBp.heart_rate || "-"} bpm)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Posisi: {latestBp.position} • Manset: {latestBp.cuff_size}
                        </div>
                      </div>
                    )}

                    {/* Detail Butir Faktor Risiko YA yang Teridentifikasi */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Faktor Risiko Preeklamsia Teridentifikasi (Pilihan &ldquo;YA&rdquo;):</span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          {pePositiveFactors.length} Faktor Terpenuhi
                        </span>
                      </div>

                      {pePositiveFactors.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 italic">
                          ✓ Tidak ada butir faktor risiko PE terkonfirmasi (Semua butir anamnesis & observasi bernilai TIDAK / Normal).
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {pePositiveFactors.map((f, idx) => (
                            <div
                              key={f.id || idx}
                              className={`p-2 rounded-lg border flex items-start gap-2 ${
                                f.category === "HIGH"
                                  ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                                  : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                              }`}
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 mt-0.5 ${
                                  f.category === "HIGH"
                                    ? "bg-rose-600 text-white"
                                    : "bg-amber-600 text-white"
                                }`}
                              >
                                {f.category}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block leading-snug">
                                  {f.label}
                                </span>
                                {f.note && (
                                  <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                    Catatan: {f.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Catatan Klinis PE */}
                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">
                        Catatan Klinis Evaluasi PE:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                        {activeDischarge.pe_screening?.clinical_notes ||
                          activeDischarge.latest_pe_result?.summary_headline ||
                          "Tensi dan tanda klinis preeklamsia dipantau secara berkala sesuai SPO."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    BAGIAN IV: HASIL EVALUASI SKRINING PERDARAHAN (HPP 4T)
                   ================================================================= */}
                <div className="rounded-xl border-2 border-blue-200/80 dark:border-blue-900/60 p-4 space-y-3 bg-blue-50/20 dark:bg-slate-800/20">
                  <div className="border-b border-blue-200 dark:border-blue-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        4
                      </span>
                      IV. Hasil Evaluasi Skrining Perdarahan Pascapersalinan (HPP 4T)
                    </h4>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-rose-600" />
                        <div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                            Tingkat Risiko Perdarahan Pascapersalinan (HPP)
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Waktu Evaluasi:{" "}
                            {activeDischarge.latest_hpp_result?.calculated_at
                              ? new Date(activeDischarge.latest_hpp_result.calculated_at).toLocaleString("id-ID")
                              : activeDischarge.hpp_screening?.screening_time
                              ? new Date(activeDischarge.hpp_screening.screening_time).toLocaleString("id-ID")
                              : "Belum dilakukan evaluasi"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                            activeDischarge.latest_hpp_result?.category === "HIGH"
                              ? "bg-rose-100 text-rose-800 border-2 border-rose-300"
                              : activeDischarge.latest_hpp_result?.category === "MODERATE"
                              ? "bg-amber-100 text-amber-800 border-2 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
                          }`}
                        >
                          RISIKO {activeDischarge.latest_hpp_result?.category || "LOW (RENDAH)"}
                        </span>
                      </div>
                    </div>

                    {/* Status Perdarahan & Rencana Kelahiran */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Perdarahan Aktif Saat Masuk:</span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {activeDischarge.hpp_screening?.perdarahan_aktif_saat_admisi || "TIDAK"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Rencana Metode Persalinan:</span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {activeDischarge.hpp_screening?.rencana_metode_persalinan || "PERVAGINAM"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Syok Hemodinamik:</span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {activeDischarge.hpp_screening?.syok_hemodinamik_instabil || "TIDAK"}
                        </strong>
                      </div>
                    </div>

                    {/* Detail Butir Faktor Risiko HPP Teridentifikasi */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Faktor Risiko HPP Teridentifikasi (Pilihan &ldquo;YA&rdquo;):</span>
                        <span className="text-[10px] text-rose-600 font-semibold">
                          {hppPositiveFactors.length} Faktor Terpenuhi
                        </span>
                      </div>

                      {hppPositiveFactors.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 italic">
                          ✓ Tidak ada butir faktor risiko HPP terkonfirmasi (Semua butir anamnesis & observasi bernilai TIDAK / Normal).
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {hppPositiveFactors.map((f, idx) => (
                            <div
                              key={f.id || idx}
                              className="p-2 rounded-lg border bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 flex items-start gap-2"
                            >
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white shrink-0 mt-0.5">
                                {f.domain || "4T"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block leading-snug">
                                  {f.label}
                                </span>
                                {f.note && (
                                  <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                    Catatan: {f.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alert Khusus Kontraindikasi Metilergometrin jika PE Tinggi */}
                    {isHighPe && (
                      <div className="p-3 rounded-lg border-2 border-rose-400 bg-rose-100/70 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 flex items-start gap-2.5 text-xs font-semibold">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-rose-800 dark:text-rose-300 font-black">
                            PERINGATAN PROTOKOL UTEROTONIKA:
                          </strong>
                          Pasien berisiko Preeklamsia Tinggi. <strong>KONTRAINDIKASI MUTLAK METILERGOMETRIN</strong>. Gunakan Oksitosin, Misoprostol, atau Karbetosin sesuai SPO rumah sakit guna mencegah lonjakan tekanan darah mendadak.
                        </div>
                      </div>
                    )}

                    {/* Catatan Klinis HPP */}
                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">
                        Catatan Klinis Evaluasi HPP:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                        {activeDischarge.hpp_screening?.clinical_notes ||
                          activeDischarge.latest_hpp_result?.summary_headline ||
                          "Manajemen aktif kala III dan kesiapsiagaan uterotonika lini 1 telah dipersiapkan."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    BAGIAN V: RINGKASAN TINDAK LANJUT KEPULANGAN & INSTRUKSI NAKES
                   ================================================================= */}
                <div className="rounded-xl border-2 border-blue-200/80 dark:border-blue-900/60 p-4 space-y-3 bg-blue-50/20 dark:bg-slate-800/20">
                  <div className="border-b border-blue-200 dark:border-blue-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        5
                      </span>
                      V. Ringkasan Keluar & Instruksi Tindak Lanjut
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">
                        Kondisi Pasien & Resume Ringkasan Kepulangan:
                      </span>
                      <p className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                        {activeDischarge.discharge_summary ||
                          "Ibu dan bayi dalam kondisi stabil, tanda vital dalam rentang terkontrol, involusi rahim dan pengeluaran lokia fisiologis, tidak dijumpai tanda bahaya komplikasi, dan telah diberikan edukasi perawatan di rumah."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="text-blue-700 dark:text-blue-400 font-bold block text-[11px]">
                          Rencana Kontrol Lanjutan:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          Poli Kebidanan & Kandungan (1 minggu pascapersalinan) atau Faskes Perujuk/Puskesmas jejaring terdekat.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="text-rose-700 dark:text-rose-400 font-bold block text-[11px]">
                          Edukasi Tanda Bahaya Nifas:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          Segera kembali ke UGD/PONEK bila terjadi: perdarahan jalan lahir banyak bergumpal, nyeri kepala hebat, pandangan kabur, atau demam tinggi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================================
                    PENGESAHAN DOKTER DPJP & BIDAN PENERIMA (DATA NYATA)
                   ================================================================= */}
                <div className="pt-6 grid grid-cols-2 text-center text-xs">
                  <div className="space-y-12">
                    <p className="text-slate-500">Bidan / Perawat Pelaksana,</p>
                    <div>
                      <strong className="underline uppercase block font-bold text-slate-900 dark:text-slate-100">
                        {activeDischarge.receiving_midwife_name || "Bidan Koordinator PONEK"}
                      </strong>
                      <span className="text-[11px] text-slate-500">SIPB / NIP Terdaftar</span>
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="text-slate-500">
                      Banyumas,{" "}
                      {activeDischarge.discharge_at
                        ? new Date(activeDischarge.discharge_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : new Date().toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                      <br />Dokter Penanggung Jawab Pelayanan (DPJP),
                    </p>
                    <div>
                      <strong className="underline uppercase block font-bold text-slate-900 dark:text-slate-100">
                        {activeDischarge.attending_doctor_name || "dr. Spesialis Obstetri & Ginekologi"}
                      </strong>
                      <span className="text-[11px] text-slate-500">SIP / DPJP Obstetri</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL HISTORI RAWAT INAP & SELURUH RIWAYAT INPUTAN PASIEN */}
      <PatientInpatientHistoryModal
        isOpen={Boolean(historyModalAdmission)}
        onClose={() => setHistoryModalAdmission(null)}
        admission={historyModalAdmission}
        db={db}
        activeProtocol={activeProtocol}
      />
    </div>
  );
}
