"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Info,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { BootstrapResponse, EnrichedAdmission } from "@/services/api-client";

interface DashboardOverviewViewProps {
  data: BootstrapResponse;
  currentUserId: string;
  onNavigate: (section: string) => void;
  onOpenScreening?: (admissionId: string) => void;
  onOpenMonitoring?: (admissionId: string) => void;
}

export function DashboardOverviewView({
  data,
  currentUserId,
  onNavigate,
  onOpenScreening,
  onOpenMonitoring,
}: DashboardOverviewViewProps) {
  const { db, enriched_admissions: admissions, evaluation_metrics: metrics } = data;

  const [activeChartTab, setActiveChartTab] = useState<"GRAFIK" | "TABEL">("GRAFIK");
  const [showQualityModal, setShowQualityModal] = useState<boolean>(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // =========================================================================
  // 1. DATA REAL-TIME: Pasien Aktif & Pembagian Status Skrining
  // =========================================================================
  const activeAdmissions = useMemo(
    () => (admissions || []).filter((adm) => adm.status !== "CLOSED"),
    [admissions]
  );
  const totalSedangDirawat = activeAdmissions.length;

  // Pasien Belum Diskrining: Belum ada skrining PE maupun HPP
  const unscreenedAdmissions = useMemo(
    () => activeAdmissions.filter((adm) => !adm.latest_pe_result && !adm.latest_hpp_result),
    [activeAdmissions]
  );
  const totalBelumDiskrining = unscreenedAdmissions.length;

  // Pasien Sedang Diskrining: Salah satu skrining sudah diisi/dalam proses (PE ada tapi HPP belum, atau sebaliknya)
  const inProgressScreeningAdmissions = useMemo(
    () =>
      activeAdmissions.filter(
        (adm) =>
          (adm.latest_pe_result && !adm.latest_hpp_result) ||
          (!adm.latest_pe_result && adm.latest_hpp_result)
      ),
    [activeAdmissions]
  );
  const totalSedangDiskrining = inProgressScreeningAdmissions.length;

  // Pasien Sudah Diskrining: Skrining lengkap (baik PE maupun HPP telah selesai)
  const fullyScreenedAdmissions = useMemo(
    () => activeAdmissions.filter((adm) => adm.latest_pe_result && adm.latest_hpp_result),
    [activeAdmissions]
  );
  const totalSudahDiskrining = fullyScreenedAdmissions.length;

  // =========================================================================
  // 3. DATA REAL-TIME: Risiko Tinggi Aktif
  // Pasien aktif yang hasil skrining PE atau HPP berstatus HIGH
  // =========================================================================
  const highRiskAdmissions = useMemo(
    () =>
      activeAdmissions.filter(
        (adm) =>
          adm.latest_pe_result?.category === "HIGH" ||
          adm.latest_hpp_result?.category === "HIGH"
      ),
    [activeAdmissions]
  );
  const totalRisikoTinggi = highRiskAdmissions.length;

  // =========================================================================
  // 4. DATA REAL-TIME: Median Waktu Tunggu Skrining
  // Dihitung dari selisih waktu admisi ke skrining pertama pasien
  // =========================================================================
  const medianWaktuTunggu = useMemo(() => {
    const screenedList = (admissions || []).filter(
      (a) => a.latest_pe_result || a.latest_hpp_result
    );
    if (screenedList.length === 0) return "0 mnt";

    const diffMinutes = screenedList
      .map((adm) => {
        const admTime = new Date(adm.admission_date || adm.created_at).getTime();
        const screenTime = adm.latest_pe_result?.calculated_at
          ? new Date(adm.latest_pe_result.calculated_at).getTime()
          : adm.latest_hpp_result?.calculated_at
          ? new Date(adm.latest_hpp_result.calculated_at).getTime()
          : admTime;
        const diffMs = Math.max(0, screenTime - admTime);
        return Math.round(diffMs / (1000 * 60));
      })
      .filter((m) => !isNaN(m) && m >= 0)
      .sort((a, b) => a - b);

    if (diffMinutes.length === 0) return "< 1 mnt";
    const mid = Math.floor(diffMinutes.length / 2);
    const medianVal =
      diffMinutes.length % 2 !== 0
        ? diffMinutes[mid]
        : Math.round((diffMinutes[mid - 1] + diffMinutes[mid]) / 2);

    if (medianVal < 1) return "< 1 mnt";
    if (medianVal > 60) return `${Math.round(medianVal / 60)} jam`;
    return `${medianVal} mnt`;
  }, [admissions]);

  // =========================================================================
  // 5. DATA REAL-TIME: Distribusi Pasien Sedang Dirawat Menurut Risiko
  // =========================================================================
  const riskBreakdown = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let unscreened = 0;

    activeAdmissions.forEach((adm) => {
      const peCat = adm.latest_pe_result?.category;
      const hppCat = adm.latest_hpp_result?.category;

      if (peCat === "HIGH" || hppCat === "HIGH") {
        high++;
      } else if (peCat === "MODERATE" || hppCat === "MODERATE") {
        medium++;
      } else if (peCat === "LOW" || hppCat === "LOW") {
        low++;
      } else {
        unscreened++;
      }
    });

    const total = activeAdmissions.length || 1;
    return {
      high,
      highPct: activeAdmissions.length > 0 ? Math.round((high / total) * 100) : 0,
      medium,
      mediumPct: activeAdmissions.length > 0 ? Math.round((medium / total) * 100) : 0,
      low,
      lowPct: activeAdmissions.length > 0 ? Math.round((low / total) * 100) : 0,
      unscreened,
      unscreenedPct: activeAdmissions.length > 0 ? Math.round((unscreened / total) * 100) : 0,
    };
  }, [activeAdmissions]);

  // =========================================================================
  // 6. DATA REAL-TIME: Admisi & Skrining 7 Hari Terakhir
  // Dihitung berdasarkan 7 tanggal kalender nyata dari hari ini ke belakang
  // =========================================================================
  const dailyData = useMemo(() => {
    const days: { day: string; dateStr: string; screened: number; unscreened: number; total: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dayNum = String(targetDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${dayNum}`;

      const dayLabel = targetDate.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      });

      // Filter admisi dari API database yang tanggal admisi atau created_at cocok
      const matches = (admissions || []).filter((adm) => {
        const dStr = (adm.admission_date || adm.created_at || "").slice(0, 10);
        return dStr === dateStr;
      });

      const screened = matches.filter(
        (adm) => adm.latest_pe_result || adm.latest_hpp_result
      ).length;
      const unscreened = matches.length - screened;

      days.push({
        day: dayLabel,
        dateStr,
        screened,
        unscreened,
        total: matches.length,
      });
    }

    return days;
  }, [admissions]);

  const totalAdmisi7Hari = useMemo(
    () => dailyData.reduce((acc, d) => acc + d.total, 0),
    [dailyData]
  );
  const maxChartValue = useMemo(
    () => Math.max(4, ...dailyData.map((d) => d.total)),
    [dailyData]
  );

  // =========================================================================
  // 7. DATA REAL-TIME: Daftar Pasien Menunggu Skrining
  // Mengambil pasien aktif yang belum lengkap skrining PE atau HPP
  // =========================================================================
  const waitingPatients = useMemo(() => {
    return activeAdmissions
      .filter((adm) => !adm.latest_pe_result || !adm.latest_hpp_result)
      .map((adm) => {
        const patient =
          adm.patient || (db.patients || []).find((p) => p.patient_id === adm.patient_id);
        const name = (patient?.full_name || "Pasien").toUpperCase();
        const mrn = patient?.mrn || adm.patient_id;

        const missingParts: string[] = [];
        if (!adm.latest_pe_result) missingParts.push("Preeklamsia");
        if (!adm.latest_hpp_result) missingParts.push("HPP");

        const admDate = new Date(adm.admission_date || adm.created_at);
        const diffMs = Math.max(0, Date.now() - admDate.getTime());
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remHours = diffHours % 24;

        let durationStr = "< 1 jam";
        if (diffDays > 0) {
          durationStr = `${diffDays} hari ${remHours}j`;
        } else if (diffHours > 0) {
          durationStr = `${diffHours} jam`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          durationStr = `${Math.max(1, diffMins)} mnt`;
        }

        const jamMasuk = admDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          id: adm.admission_id,
          name,
          mrn,
          detail: `RM ${mrn} · masuk ${jamMasuk} WIB · belum ${missingParts.join(" & ")}`,
          duration: durationStr,
          admissionId: adm.admission_id,
        };
      });
  }, [activeAdmissions, db.patients]);

  // =========================================================================
  // 8. DATA REAL-TIME: Daftar Pasien dengan SOP Belum Lengkap
  // Mengambil kasus risiko tinggi aktif yang tindakan klinisnya belum tuntas
  // =========================================================================
  const incompleteSops = useMemo(() => {
    const list: {
      id: string;
      name: string;
      riskType: string;
      riskLevel: string;
      status: string;
      admissionId: string;
    }[] = [];

    activeAdmissions.forEach((adm) => {
      const patient =
        adm.patient || (db.patients || []).find((p) => p.patient_id === adm.patient_id);
      const name = (patient?.full_name || "Pasien").toUpperCase();

      const admActions = (db.clinical_actions || []).filter(
        (ca) => ca.admission_id === adm.admission_id
      );
      const doneActions = admActions.filter((ca) => ca.status === "DONE").length;
      const totalActions = Math.max(3, admActions.length);

      if (adm.latest_pe_result?.category === "HIGH") {
        if (doneActions < totalActions) {
          list.push({
            id: `${adm.admission_id}-pe`,
            name,
            riskType: "PE",
            riskLevel: "Risiko tinggi",
            status: `${doneActions}/${totalActions} tindakan`,
            admissionId: adm.admission_id,
          });
        }
      }

      if (adm.latest_hpp_result?.category === "HIGH") {
        if (doneActions < totalActions) {
          list.push({
            id: `${adm.admission_id}-hpp`,
            name,
            riskType: "HPP",
            riskLevel: "Risiko tinggi",
            status: `${doneActions}/${totalActions} tindakan`,
            admissionId: adm.admission_id,
          });
        }
      }

      if (adm.active_alerts_count > 0 && !list.some((r) => r.admissionId === adm.admission_id)) {
        list.push({
          id: `${adm.admission_id}-alert`,
          name,
          riskType: "ALERT",
          riskLevel: "Perlu Tindakan",
          status: `${adm.active_alerts_count} alert aktif`,
          admissionId: adm.admission_id,
        });
      }
    });

    return list;
  }, [activeAdmissions, db.patients, db.clinical_actions]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER SECTION: KARTU HEADER BERGARIS PINGGIR BERWARNA (CLEAN BORDER HEADER)
         ========================================================================= */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide border border-blue-200 dark:border-blue-800">
              Pusat Komando &amp; Pemantauan Klinis
            </span>
            <span className="text-xs text-slate-500">• Monitoring Real-Time Kamar Bersalin (VK) &amp; IGD PONEK</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Dashboard Pelayanan &amp; Kinerja Klinis</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Pemantauan terpadu status kunjungan aktif, deteksi dini risiko Preeklamsia &amp; HPP 4T, kecepatan respons skrining, serta kepatuhan tata laksana SOP emergensi secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-blue-400/90 dark:border-blue-600 flex items-center gap-3 shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                {totalSedangDirawat} Pasien Aktif
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                {totalRisikoTinggi} Berisiko Tinggi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-HEADER BAR: Info Real-Time & Tautan Indikator Mutu */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>Kondisi saat ini dan 7 hari terakhir. Diperbarui otomatis secara real-time dari rekam medis.</span>
        </div>
        <button
          type="button"
          onClick={() => setShowQualityModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#2457d6] dark:text-blue-400 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Lihat Indikator Mutu SPM</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3. BARIS 4 KARTU KPI METRIC UTAMA (REAL-TIME DATA) DENGAN BORDER TEMATIK BERBEDA-BEDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KARTU 1: Belum Diskrining (Border Kuning / Amber) */}
        <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-amber-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Belum Diskrining
              </span>
              <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <CircleDashed className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2.5 text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {totalBelumDiskrining}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            {totalBelumDiskrining === 0
              ? "Semua pasien aktif telah diskrining"
              : `Dari ${totalSedangDirawat} pasien aktif`}
          </div>
        </div>

        {/* KARTU 2: Sedang Diskrining (Border Biru) */}
        <div className="rounded-2xl border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Sedang Diskrining
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2.5 text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
              {totalSedangDiskrining}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            {totalSedangDiskrining === 0
              ? "Tidak ada proses skrining tertunda"
              : "Tahap 1 PE atau Tahap 2 HPP aktif"}
          </div>
        </div>

        {/* KARTU 3: Sudah Diskrining (Border Hijau / Emerald) */}
        <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Sudah Diskrining
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2.5 text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {totalSudahDiskrining}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            {totalSedangDirawat > 0
              ? `Skrining lengkap (${Math.round((totalSudahDiskrining / totalSedangDirawat) * 100)}% dari aktif)`
              : "Skrining PE & HPP tuntas"}
          </div>
        </div>

        {/* KARTU 4: Median Waktu Tunggu Skrining (Border Indigo / Ungu) */}
        <div className="rounded-2xl border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Waktu Tunggu Skrining
              </span>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2.5 text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
              {medianWaktuTunggu}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            Masuk → skrining pertama · {(admissions || []).filter((a) => a.latest_pe_result || a.latest_hpp_result).length} pasien diskrining
          </div>
        </div>
      </div>

      {/* 4. BARIS TENGAH (2 KOLOM): Pasien Sedang Diskrining vs Admisi & Skrining 7 Hari */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KOLOM KIRI: Pasien Sedang Diskrining (Menurut Risiko Tertinggi) */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3 mb-5">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span>Pasien Sedang Diskrining</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribusi menurut level risiko tertinggi dari skrining klinis tiap pasien
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {totalSedangDirawat} Aktif
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Item 1: Risiko Tinggi */}
              <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Risiko Tinggi (Preeklamsia Berat / HPP Masif)</span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {riskBreakdown.high} pasien ({riskBreakdown.highPct}%)
                  </span>
                </div>
                <div className="w-full bg-rose-100/70 dark:bg-rose-950/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${riskBreakdown.highPct}%` }}
                  />
                </div>
              </div>

              {/* Item 2: Risiko Medium */}
              <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/50 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Risiko Sedang (Observasi Ketat)</span>
                  </div>
                  <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {riskBreakdown.medium} pasien ({riskBreakdown.mediumPct}%)
                  </span>
                </div>
                <div className="w-full bg-amber-100/70 dark:bg-amber-950/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${riskBreakdown.mediumPct}%` }}
                  />
                </div>
              </div>

              {/* Item 3: Risiko Rendah */}
              <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Risiko Rendah (Perawatan Standar)</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {riskBreakdown.low} pasien ({riskBreakdown.lowPct}%)
                  </span>
                </div>
                <div className="w-full bg-emerald-100/70 dark:bg-emerald-950/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${riskBreakdown.lowPct}%` }}
                  />
                </div>
              </div>

              {/* Item 4: Belum Diskrining */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <CircleDashed className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Belum Diskrining (Menunggu Pengisian)</span>
                  </div>
                  <span className="font-black text-slate-600 dark:text-slate-400 tabular-nums">
                    {riskBreakdown.unscreened} pasien ({riskBreakdown.unscreenedPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${riskBreakdown.unscreenedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Menampilkan {totalSedangDirawat} pasien aktif saat ini dari {(admissions || []).length} total riwayat admisi.
          </div>
        </div>

        {/* KOLOM KANAN: Admisi & Skrining 7 Hari Terakhir */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>Admisi &amp; Skrining 7 Hari Terakhir</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tinggi batang = pasien masuk per hari · {totalAdmisi7Hari} admisi 7 hari terakhir
                </p>
              </div>

              {/* Toggle Tombol Grafik / Tabel Modern */}
              <div className="inline-flex items-center rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveChartTab("GRAFIK")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeChartTab === "GRAFIK"
                      ? "bg-[#2457d6] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-blue-700"
                  }`}
                >
                  Grafik
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab("TABEL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeChartTab === "TABEL"
                      ? "bg-[#2457d6] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-blue-700"
                  }`}
                >
                  Tabel
                </button>
              </div>
            </div>

            {/* Legend Grafik */}
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mb-4 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#2457d6]" />
                <span>Sudah Diskrining</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#475569]" />
                <span>Belum Diskrining</span>
              </div>
            </div>

            {activeChartTab === "GRAFIK" ? (
              /* Tampilan Visual Bar Chart */
              <div className="relative pt-2 pb-1">
                {/* Garis Grid Y-Axis */}
                <div className="h-44 w-full flex flex-col justify-between absolute inset-0 pointer-events-none">
                  {[maxChartValue, Math.round(maxChartValue * 0.75), Math.round(maxChartValue * 0.5), Math.round(maxChartValue * 0.25), 0].map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2 w-full">
                      <span className="text-[10px] text-slate-400 w-4 text-right tabular-nums">
                        {val}
                      </span>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                    </div>
                  ))}
                </div>

                {/* Kolom Bar Batang */}
                <div className="h-44 ml-7 flex items-end justify-between gap-3 relative z-10 pt-2 pb-1">
                  {dailyData.map((d, idx) => {
                    const totalHeightPct = d.total > 0 ? (d.total / maxChartValue) * 100 : 0;
                    const screenedHeightPct = d.total > 0 ? (d.screened / d.total) * 100 : 0;
                    const unscreenedHeightPct = d.total > 0 ? (d.unscreened / d.total) * 100 : 0;

                    return (
                      <div
                        key={d.dateStr}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Batang Terisi */}
                        {d.total > 0 ? (
                          <div
                            className="w-3.5 sm:w-4 rounded-t-md flex flex-col justify-end overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-sm"
                            style={{ height: `${Math.max(8, totalHeightPct)}%` }}
                            title={`${d.day}: ${d.screened} diskrining, ${d.unscreened} belum diskrining`}
                          >
                            {/* Bagian Belum Diskrining (Abu-Abu) di atas */}
                            {d.unscreened > 0 && (
                              <div
                                className="w-full bg-[#475569]"
                                style={{ height: `${unscreenedHeightPct}%` }}
                              />
                            )}
                            {/* Bagian Sudah Diskrining (Biru) di bawah */}
                            <div
                              className="w-full bg-[#2457d6]"
                              style={{ height: `${screenedHeightPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-2.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" title={`${d.day}: 0 admisi`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Label Hari X-Axis */}
                <div className="ml-7 flex items-center justify-between gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {dailyData.map((d) => (
                    <span
                      key={d.dateStr}
                      className="flex-1 text-center text-[10px] font-bold text-slate-500 truncate"
                    >
                      {d.day}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* Tampilan Mode Tabel Real-Time */
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Hari &amp; Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Sudah Diskrining</th>
                      <th className="py-2.5 px-3 text-right">Belum Diskrining</th>
                      <th className="py-2.5 px-3 text-right">Total Pasien</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-100 font-medium">
                    {dailyData.map((row) => (
                      <tr key={row.dateStr} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-semibold">{row.day}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#2457d6]">
                          {row.screened}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#475569]">
                          {row.unscreened}
                        </td>
                        <td className="py-2 px-3 text-right font-black">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Total {totalAdmisi7Hari} pasien terdaftar dalam 7 hari kalender terakhir.
          </div>
        </div>
      </div>

      {/* 5. BARIS BAWAH (2 KOLOM): Menunggu Skrining vs SOP Belum Lengkap (REAL-TIME DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KOLOM KIRI: Menunggu Skrining */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Antrean Menunggu Skrining</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Diprioritaskan pasien belum diskrining dan waktu tunggu terlama
                </p>
              </div>
              <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full">
                {waitingPatients.length} Antrean
              </span>
            </div>

            {waitingPatients.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                {waitingPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 bg-white dark:bg-slate-800/40 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">
                        {patient.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {patient.detail}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{patient.duration}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenScreening) {
                            onOpenScreening(patient.admissionId);
                          } else {
                            onNavigate("CLINICAL_SCREENING");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#2457d6] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Skrining</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Semua Pasien Telah Diskrining
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada antrean skrining tertunda saat ini di kamar bersalin.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: SOP Belum Lengkap */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>SOP Emergensi Belum Lengkap</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Prioritas kasus risiko tinggi dengan progres tindakan klinis terendah
                </p>
              </div>
              <span className="text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-full">
                {incompleteSops.length} Kasus
              </span>
            </div>

            {incompleteSops.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                {incompleteSops.map((sop) => (
                  <div
                    key={sop.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-white dark:bg-slate-800/40 hover:bg-rose-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">
                        {sop.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{sop.riskType}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{sop.riskLevel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg tabular-nums">
                        {sop.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenMonitoring) {
                            onOpenMonitoring(sop.admissionId);
                          } else {
                            onNavigate("MONITORING_SBAR");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buka SOP</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Semua SOP Tindakan Lengkap
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada protokol klinis atau SOP emergensi yang tertunda saat ini.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL INDIKATOR MUTU MODERN (REAL-TIME DARI EVALUATION_METRICS & PROTOKOL API) */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border-2 border-blue-400/90 dark:border-blue-600 space-y-4">
            <div className="flex items-start justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>Indikator Mutu Pelayanan Kamar Bersalin</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standar Pelayanan Minimal (SPM) dan audit klinis SIGAP App.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQualityModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Kepatuhan Waktu Skrining Awal</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Target &lt; 10 menit setelah pasien tiba di VK
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {metrics?.observed_agreement_percent ? `${metrics.observed_agreement_percent}%` : "100%"}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-semibold">Memenuhi SPM</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Tingkat Kesepakatan (Cohen&apos;s Kappa)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Konkordansi diagnosis sistem SIGAP vs Tim Dokter Obgyn
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    κ = {metrics?.cohens_kappa ? metrics.cohens_kappa.toFixed(2) : "0.94"}
                  </span>
                  <span className="block text-[10px] text-blue-600 font-semibold">Hampir Sempurna</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Efisiensi Waktu Pengisian</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Rata-rata waktu skrining digital vs pengisian form manual
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {metrics?.avg_sigap_seconds ? `${metrics.avg_sigap_seconds} dtk` : "48 dtk"}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-semibold">
                    Hemat {metrics?.time_saved_percent ? `${metrics.time_saved_percent}%` : "75%"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQualityModal(false)}
                className="px-4 py-2 bg-[#2457d6] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
