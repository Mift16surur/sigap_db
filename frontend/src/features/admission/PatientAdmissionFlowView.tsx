"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardPlus,
  Download,
  Droplets,
  Edit3,
  Eye,
  FileText,
  Filter,
  FolderPlus,
  HeartPulse,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest, BootstrapResponse, EnrichedAdmission } from "@/services/api-client";
import { FiveStatusSelector, RiskCategoryBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalWorkflowStepper } from "@/components/common/ClinicalWorkflowStepper";
import type {
  AdmissionType,
  ClinicalItemResponse,
  Patient,
} from "@/types";

/**
 * TAHAP 2 ALUR BISNIS: INPUT EPISODE ADMISI & RIWAYAT OBSTETRI (FR-04, FR-05)
 */
export function AdmissionEpisodeView({
  data,
  currentUserId,
  preselectedPatientId,
  selectedAdmissionId,
  onSelectAdmission,
  onRefresh,
  onOpenPeScreening,
  onOpenHppScreening,
  onOpenMonitoring,
  onBackToPatientRegistration,
  onNavigateRpp,
}: {
  data: BootstrapResponse;
  currentUserId: string;
  preselectedPatientId: string | null;
  selectedAdmissionId: string;
  onSelectAdmission: (admId: string) => void;
  onRefresh: () => Promise<void>;
  onOpenPeScreening: (admId: string) => void;
  onOpenHppScreening: (admId: string) => void;
  onOpenMonitoring: (admId: string) => void;
  onBackToPatientRegistration: () => void;
  onNavigateRpp?: () => void;
}) {
  const { db, enriched_admissions: admissions } = data;

  // Filter hanya pasien aktif (yang sudah closed otomatis dipindahkan ke RPP)
  const activeAdmissions = useMemo(
    () => admissions.filter((adm) => adm.status !== "CLOSED"),
    [admissions]
  );
  const closedAdmissions = useMemo(
    () => admissions.filter((adm) => adm.status === "CLOSED"),
    [admissions]
  );

  // Filter & Search states untuk Daftar Episode Admisi Aktif
  const [searchAdmQuery, setSearchAdmQuery] = useState<string>("");
  const [filterRiskQuick, setFilterRiskQuick] = useState<
    "ALL" | "HIGH" | "MODERATE" | "LOW" | "UNSCREENED"
  >("ALL");
  const [filterUnit, setFilterUnit] = useState<string>("ALL");
  const [filterDpjp, setFilterDpjp] = useState<string>("ALL");
  const [filterScreeningStatus, setFilterScreeningStatus] =
    useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "NEWEST" | "OLDEST" | "NAME_ASC" | "RISK_HIGH" | "UK_DESC"
  >("NEWEST");

  // Daftar unik DPJP dari data admisi aktif
  const availableDpjps = useMemo(() => {
    const set = new Set<string>();
    activeAdmissions.forEach((a) => {
      if (a.attending_doctor_name) set.add(a.attending_doctor_name);
    });
    return Array.from(set).sort();
  }, [activeAdmissions]);

  // Daftar unik Ruangan/Unit dari data admisi aktif
  const availableUnits = useMemo(() => {
    const map = new Map<string, string>();
    activeAdmissions.forEach((a) => {
      if (a.unit?.unit_id && a.unit?.name) {
        map.set(a.unit.unit_id, a.unit.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [activeAdmissions]);

  // Hitung jumlah pasien per kategori risiko untuk Quick Filter Chips
  const countHigh = useMemo(
    () =>
      activeAdmissions.filter(
        (a) =>
          a.latest_pe_result?.category === "HIGH" ||
          a.latest_hpp_result?.category === "HIGH"
      ).length,
    [activeAdmissions]
  );
  const countModerate = useMemo(
    () =>
      activeAdmissions.filter(
        (a) =>
          (a.latest_pe_result?.category === "MODERATE" ||
            a.latest_hpp_result?.category === "MODERATE") &&
          a.latest_pe_result?.category !== "HIGH" &&
          a.latest_hpp_result?.category !== "HIGH"
      ).length,
    [activeAdmissions]
  );
  const countLow = useMemo(
    () =>
      activeAdmissions.filter(
        (a) =>
          (a.latest_pe_result?.category === "LOW" ||
            a.latest_hpp_result?.category === "LOW") &&
          a.latest_pe_result?.category !== "HIGH" &&
          a.latest_pe_result?.category !== "MODERATE" &&
          a.latest_hpp_result?.category !== "HIGH" &&
          a.latest_hpp_result?.category !== "MODERATE"
      ).length,
    [activeAdmissions]
  );
  const countUnscreened = useMemo(
    () =>
      activeAdmissions.filter(
        (a) => !a.latest_pe_result?.category && !a.latest_hpp_result?.category
      ).length,
    [activeAdmissions]
  );

  // Filtered & Sorted active admissions
  const filteredAdmissions = useMemo(() => {
    return activeAdmissions
      .filter((adm) => {
        // Quick Risk Tab filter
        if (filterRiskQuick === "HIGH") {
          const isHigh =
            adm.latest_pe_result?.category === "HIGH" ||
            adm.latest_hpp_result?.category === "HIGH";
          if (!isHigh) return false;
        } else if (filterRiskQuick === "MODERATE") {
          const isModerate =
            (adm.latest_pe_result?.category === "MODERATE" ||
              adm.latest_hpp_result?.category === "MODERATE") &&
            adm.latest_pe_result?.category !== "HIGH" &&
            adm.latest_hpp_result?.category !== "HIGH";
          if (!isModerate) return false;
        } else if (filterRiskQuick === "LOW") {
          const isLow =
            (adm.latest_pe_result?.category === "LOW" ||
              adm.latest_hpp_result?.category === "LOW") &&
            adm.latest_pe_result?.category !== "HIGH" &&
            adm.latest_pe_result?.category !== "MODERATE" &&
            adm.latest_hpp_result?.category !== "HIGH" &&
            adm.latest_hpp_result?.category !== "MODERATE";
          if (!isLow) return false;
        } else if (filterRiskQuick === "UNSCREENED") {
          const isUnscreened =
            !adm.latest_pe_result?.category && !adm.latest_hpp_result?.category;
          if (!isUnscreened) return false;
        }

        // Search Query (Patient Name, MRN, Code, Doctor, Midwife, Unit, Referral, Complaint)
        if (searchAdmQuery.trim()) {
          const q = searchAdmQuery.toLowerCase().trim();
          const matchName = adm.patient?.full_name?.toLowerCase().includes(q);
          const matchMrn = adm.patient?.mrn?.toLowerCase().includes(q);
          const matchCode = adm.admission_code?.toLowerCase().includes(q);
          const matchDoc = adm.attending_doctor_name?.toLowerCase().includes(q);
          const matchMid = adm.receiving_midwife_name?.toLowerCase().includes(q);
          const matchComplaint = adm.keluhan_utama?.toLowerCase().includes(q);
          const matchUnit = adm.unit?.name?.toLowerCase().includes(q);
          const matchReferral = adm.asal_rujukan?.toLowerCase().includes(q);
          if (
            !matchName &&
            !matchMrn &&
            !matchCode &&
            !matchDoc &&
            !matchMid &&
            !matchComplaint &&
            !matchUnit &&
            !matchReferral
          ) {
            return false;
          }
        }

        // Filter Unit
        if (filterUnit !== "ALL") {
          if (
            adm.unit_id !== filterUnit &&
            adm.unit?.unit_id !== filterUnit &&
            adm.unit?.name !== filterUnit
          ) {
            return false;
          }
        }

        // Filter DPJP
        if (filterDpjp !== "ALL") {
          if (adm.attending_doctor_name !== filterDpjp) {
            return false;
          }
        }

        // Filter Specific Screening Status
        if (filterScreeningStatus === "PE_HIGH") {
          if (adm.latest_pe_result?.category !== "HIGH") return false;
        } else if (filterScreeningStatus === "PE_MODERATE") {
          if (adm.latest_pe_result?.category !== "MODERATE") return false;
        } else if (filterScreeningStatus === "PE_LOW") {
          if (adm.latest_pe_result?.category !== "LOW") return false;
        } else if (filterScreeningStatus === "HPP_HIGH") {
          if (adm.latest_hpp_result?.category !== "HIGH") return false;
        } else if (filterScreeningStatus === "HPP_MODERATE") {
          if (adm.latest_hpp_result?.category !== "MODERATE") return false;
        } else if (filterScreeningStatus === "HPP_LOW") {
          if (adm.latest_hpp_result?.category !== "LOW") return false;
        } else if (filterScreeningStatus === "UNSCREENED_ALL") {
          if (adm.latest_pe_result?.category || adm.latest_hpp_result?.category)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "NAME_ASC") {
          return (a.patient?.full_name || "").localeCompare(
            b.patient?.full_name || ""
          );
        }
        if (sortBy === "RISK_HIGH") {
          const score = (item: EnrichedAdmission) => {
            if (
              item.latest_pe_result?.category === "HIGH" ||
              item.latest_hpp_result?.category === "HIGH"
            )
              return 3;
            if (
              item.latest_pe_result?.category === "MODERATE" ||
              item.latest_hpp_result?.category === "MODERATE"
            )
              return 2;
            if (
              item.latest_pe_result?.category === "LOW" ||
              item.latest_hpp_result?.category === "LOW"
            )
              return 1;
            return 0;
          };
          return score(b) - score(a);
        }
        if (sortBy === "UK_DESC") {
          const totalDaysA =
            (a.usia_kehamilan_minggu || 0) * 7 + (a.usia_kehamilan_hari || 0);
          const totalDaysB =
            (b.usia_kehamilan_minggu || 0) * 7 + (b.usia_kehamilan_hari || 0);
          return totalDaysB - totalDaysA;
        }
        if (sortBy === "OLDEST") {
          return (a.admission_date || a.created_at || "").localeCompare(
            b.admission_date || b.created_at || ""
          );
        }
        // Default: NEWEST
        return (b.admission_date || b.created_at || "").localeCompare(
          a.admission_date || a.created_at || ""
        );
      });
  }, [
    activeAdmissions,
    filterRiskQuick,
    searchAdmQuery,
    filterUnit,
    filterDpjp,
    filterScreeningStatus,
    sortBy,
  ]);

  const isFilterActive =
    searchAdmQuery.trim() !== "" ||
    filterRiskQuick !== "ALL" ||
    filterUnit !== "ALL" ||
    filterDpjp !== "ALL" ||
    filterScreeningStatus !== "ALL" ||
    sortBy !== "NEWEST";

  const handleResetFilters = () => {
    setSearchAdmQuery("");
    setFilterRiskQuick("ALL");
    setFilterUnit("ALL");
    setFilterDpjp("ALL");
    setFilterScreeningStatus("ALL");
    setSortBy("NEWEST");
  };

  const [targetPatientId, setTargetPatientId] = useState<string>(
    preselectedPatientId || db.patients[0]?.patient_id || ""
  );
  const [showAdmissionForm, setShowAdmissionForm] = useState<boolean>(
    Boolean(preselectedPatientId)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Form Input Episode Admisi & Riwayat Obstetri (FR-04 & FR-05) — Bersih tanpa teks dummy
  const [jenisAdmisi, setJenisAdmisi] = useState<AdmissionType>("ADM_INPARTU");
  const [unitId, setUnitId] = useState<string>("unit-vk");
  const [attendingDoctorId, setAttendingDoctorId] = useState<string>(
    db.master_catalog.doctors[0]?.doctor_id || ""
  );
  const [attendingDoctorNameManual, setAttendingDoctorNameManual] =
    useState<string>("");
  const [receivingMidwifeId, setReceivingMidwifeId] = useState<string>(
    db.master_catalog.midwives_nurses[0]?.staff_id || ""
  );
  const [receivingMidwifeNameManual, setReceivingMidwifeNameManual] =
    useState<string>("");
  const [referralFacilityId, setReferralFacilityId] = useState<string>(
    db.master_catalog.referral_facilities[0]?.referral_id || ""
  );
  const [asalRujukan, setAsalRujukan] = useState<string>("");
  const [ukMinggu, setUkMinggu] = useState<number>(38);
  const [ukHari, setUkHari] = useState<number>(0);
  const [keluhanUtama, setKeluhanUtama] = useState<string>("");

  // Riwayat Obstetri & Komorbid Relevan (FR-05)
  const [gravida, setGravida] = useState<number>(1);
  const [para, setPara] = useState<number>(0);
  const [abortus, setAbortus] = useState<number>(0);
  const [livingChildren, setLivingChildren] = useState<number>(0);
  const [scCount, setScCount] = useState<number>(0);
  const [intervalTahun, setIntervalTahun] = useState<number>(0);
  const [bbKg, setBbKg] = useState<number>(60);
  const [tbCm, setTbCm] = useState<number>(158);
  const [imtNilai, setImtNilai] = useState<number>(24.0);

  // Perhitungan Otomatis IMT Ibu dari Berat Badan & Tinggi Badan
  useEffect(() => {
    if (bbKg > 0 && tbCm > 0) {
      const tbMeter = tbCm / 100;
      const imt = Number((bbKg / (tbMeter * tbMeter)).toFixed(1));
      setImtNilai(imt);
    }
  }, [bbKg, tbCm]);

  const [riwayatPe, setRiwayatPe] = useState<ClinicalItemResponse>("TIDAK");
  const [riwayatHpp, setRiwayatHpp] = useState<ClinicalItemResponse>("TIDAK");
  const [kehamilanGanda, setKehamilanGanda] =
    useState<ClinicalItemResponse>("TIDAK");
  const [hipertensiKronis, setHipertensiKronis] =
    useState<ClinicalItemResponse>("TIDAK");
  const [diabetesMelitus, setDiabetesMelitus] =
    useState<ClinicalItemResponse>("TIDAK");
  const [penyakitGinjal, setPenyakitGinjal] =
    useState<ClinicalItemResponse>("TIDAK");
  const [penyakitAutoimun, setPenyakitAutoimun] =
    useState<ClinicalItemResponse>("TIDAK");
  const [catatanKomorbid, setCatatanKomorbid] = useState<string>("");

  const selectedPatient = db.patients.find(
    (p) => p.patient_id === targetPatientId
  );

  async function handleCreateAdmissionEpisode(
    e: React.FormEvent,
    nextAction: "STAY" | "PE" | "HPP"
  ) {
    e.preventDefault();
    if (!targetPatientId) {
      setErrorMsg("Silakan pilih pasien terdaftar terlebih dahulu.");
      return;
    }

    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const selectedDoc = db.master_catalog.doctors.find(
        (d) => d.doctor_id === attendingDoctorId
      );
      const selectedMid = db.master_catalog.midwives_nurses.find(
        (m) => m.staff_id === receivingMidwifeId
      );
      const res = await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          patient_id: targetPatientId,
          jenis_admisi: jenisAdmisi,
          unit_id: unitId,
          attending_doctor_id: attendingDoctorId || "manual-doc",
          attending_doctor_name:
            selectedDoc?.full_name || attendingDoctorNameManual || "-",
          receiving_midwife_id: receivingMidwifeId || "manual-mid",
          receiving_midwife_name:
            selectedMid?.full_name || receivingMidwifeNameManual || "-",
          referral_facility_id: referralFacilityId,
          asal_rujukan: asalRujukan || "Datang Sendiri",
          usia_kehamilan_minggu: ukMinggu,
          usia_kehamilan_hari: ukHari,
          keluhan_utama: keluhanUtama,
          gravida,
          para,
          abortus,
          living_children: livingChildren,
          riwayat_sc_jumlah: scCount,
          interval_kehamilan_tahun: intervalTahun,
          imt_nilai: imtNilai,
          riwayat_pe_sebelumnya: gravida === 1 ? "TIDAK_RELEVAN" : riwayatPe,
          riwayat_hpp_sebelumnya: gravida === 1 ? "TIDAK_RELEVAN" : riwayatHpp,
          kehamilan_ganda: kehamilanGanda,
          hipertensi_kronis: hipertensiKronis,
          diabetes_melitus: diabetesMelitus,
          penyakit_ginjal: penyakitGinjal,
          penyakit_autoimun_sle_aps: penyakitAutoimun,
          catatan_komorbid: catatanKomorbid,
        },
      });

      await onRefresh();
      const createdAdmId = res.admission.admission_id;
      onSelectAdmission(createdAdmId);

      if (nextAction === "PE") {
        onOpenPeScreening(createdAdmId);
      } else if (nextAction === "HPP") {
        onOpenHppScreening(createdAdmId);
      } else {
        setShowAdmissionForm(false);
        setFeedbackMsg(
          `Episode Admisi ${res.admission.admission_code} untuk pasien ${res.patient.full_name} berhasil dibuat. Silakan lanjutkan ke Skrining PE atau Skrining HPP.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman Warna Biru Tegas & Elegan */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#185adb] via-[#2463eb] to-[#1d4ed8] p-6 lg:p-7 text-white shadow-lg shadow-blue-500/20 border border-blue-400/40">
        {/* Dekorasi Visual Cahaya Latar */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 -top-12 h-36 w-36 rounded-full bg-blue-300/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white border border-white/30 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Tahap 2 • Alur Admisi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ClipboardPlus className="h-7 w-7 text-blue-200 shrink-0" />
              <span>2. Input Episode Admisi & Riwayat Obstetri</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium max-w-2xl leading-relaxed">
              Hubungkan pasien terdaftar ke episode admisi baru, tentukan Dokter DPJP, dan lengkapi data paritas serta komorbid.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onBackToPatientRegistration}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25 backdrop-blur-xs shadow-xs transition-all active:scale-[0.98]"
            >
              &larr; Pendaftaran Pasien
            </button>
            <button
              type="button"
              onClick={() => setShowAdmissionForm(!showAdmissionForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#185adb] shadow-md hover:bg-blue-50 active:scale-[0.98] transition-all"
            >
              <FolderPlus className="h-4 w-4 text-[#185adb]" />
              <span>{showAdmissionForm ? "Tutup Formulir" : "+ Input Admisi Baru"}</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900">
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
          {errorMsg}
        </div>
      )}

      {/* FORM INPUT EPISODE ADMISI & RIWAYAT OBSTETRI (FR-04, FR-05) */}
      {showAdmissionForm && (
        <form
          onSubmit={(e) => handleCreateAdmissionEpisode(e, "STAY")}
          className="w-full rounded-3xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-6 lg:p-8 shadow-[0_4px_25px_rgba(20,60,160,0.06)] space-y-7"
        >
          {/* Header Formulir dengan Ikon Stethoscope Bergradasi */}
          <div className="border-b border-blue-100 dark:border-blue-950/80 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#185adb] to-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm border border-blue-300/40">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Formulir Input Episode Admisi & Riwayat Obstetri (FR-04 & FR-05)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih pasien dari Master Pasien, lalu lengkapi parameter admisi klinis dan riwayat obstetri di bawah ini.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Pilih Pasien dari Master Pasien */}
          <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-blue-50/60 dark:from-[#091536] dark:via-[#0c193b] dark:to-[#08122e] p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-xs font-black text-blue-950 dark:text-blue-200 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#185adb]" />
                <span>1. Pilih Pasien Terdaftar (Master Pasien):</span>
              </label>
              <button
                type="button"
                onClick={onBackToPatientRegistration}
                className="text-xs font-bold text-[#185adb] dark:text-blue-300 hover:underline flex items-center gap-1 self-start sm:self-auto bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800"
              >
                <span>Pasien belum terdaftar? Ke Menu Pendaftaran Pasien</span>
                <span>&rarr;</span>
              </button>
            </div>

            <select
              value={targetPatientId}
              onChange={(e) => setTargetPatientId(e.target.value)}
              className="w-full rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-[#071129] px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 shadow-xs focus:ring-4 focus:ring-blue-500/15 focus:border-[#185adb]"
            >
              {db.patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.full_name} — No. RM: {p.mrn} (Kode: {p.patient_code} • Usia: {p.age_years} th)
                </option>
              ))}
            </select>

            {selectedPatient && (
              <div className="rounded-xl border border-blue-200/90 dark:border-blue-800/80 bg-white/95 dark:bg-[#08122c] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#185adb] to-blue-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {selectedPatient.full_name?.slice(0, 2).toUpperCase() || "PS"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">
                      {selectedPatient.full_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md">
                        RM: {selectedPatient.mrn}
                      </span>
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        Kode: {selectedPatient.patient_code}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Lahir: {selectedPatient.tanggal_lahir} ({selectedPatient.age_years} Th)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-2 md:pt-0 md:pl-4 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex md:justify-end items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>Domisili</span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate mt-0.5">
                    {selectedPatient.alamat_singkat || "-"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Data Episode Admisi (FR-04) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <Building2 className="h-4 w-4 text-[#185adb]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Data Episode Admisi Saat Ini (FR-04)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jenis Admisi Obstetri:
                </label>
                <select
                  value={jenisAdmisi}
                  onChange={(e) => setJenisAdmisi(e.target.value as AdmissionType)}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 bg-white dark:bg-[#08122c] font-bold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb] transition-all"
                >
                  <option value="ADM_INPARTU">Admisi Inpartu (Persalinan)</option>
                  <option value="ADM_ANTENATAL">Admisi Antenatal / Observasi Kehamilan</option>
                  <option value="RUJUKAN_EMERGENSI">Rujukan Emergensi PONEK</option>
                  <option value="ADM_POSTPARTUM">Admisi Postpartum / Rujukan Nifas</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit / Ruangan Pelayanan:
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 bg-white dark:bg-[#08122c] font-bold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb] transition-all"
                >
                  {db.units.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    UK (Minggu):
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={44}
                    value={ukMinggu}
                    onChange={(e) => setUkMinggu(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-[#08122c] font-extrabold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    UK (Hari):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={ukHari}
                    onChange={(e) => setUkHari(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-[#08122c] font-extrabold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Asal Rujukan / Cara Masuk:
                </label>
                <div className="space-y-1.5">
                  <select
                    value={referralFacilityId}
                    onChange={(e) => {
                      const facId = e.target.value;
                      setReferralFacilityId(facId);
                      const found = db.master_catalog.referral_facilities.find(
                        (f) => f.referral_id === facId
                      );
                      if (found) setAsalRujukan(found.facility_name);
                    }}
                    className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-xs"
                  >
                    {db.master_catalog.referral_facilities.map((fac) => (
                      <option key={fac.referral_id} value={fac.referral_id}>
                        {fac.facility_name} ({fac.facility_type})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={asalRujukan}
                    onChange={(e) => setAsalRujukan(e.target.value)}
                    placeholder="Keterangan Asal Rujukan..."
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-[#08122c] font-medium"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-1.5">
                  <label className="block font-black text-blue-950 dark:text-blue-200">
                    Dokter DPJP Penanggung Jawab (Master Dokter):
                  </label>
                  {db.master_catalog.doctors.length > 0 ? (
                    <select
                      value={attendingDoctorId}
                      onChange={(e) => setAttendingDoctorId(e.target.value)}
                      className="w-full rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-[#08122c] px-3.5 py-2.5 font-bold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb]"
                    >
                      <option value="">-- Pilih Dokter DPJP --</option>
                      {db.master_catalog.doctors.map((doc) => (
                        <option key={doc.doctor_id} value={doc.doctor_id}>
                          {doc.full_name} — {doc.specialty} ({doc.phone})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={attendingDoctorNameManual}
                      onChange={(e) => setAttendingDoctorNameManual(e.target.value)}
                      placeholder="Ketik Nama Dokter DPJP..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 space-y-1.5">
                  <label className="block font-black text-emerald-950 dark:text-emerald-200">
                    Bidan / Perawat Penerima Admisi:
                  </label>
                  {db.master_catalog.midwives_nurses.length > 0 ? (
                    <select
                      value={receivingMidwifeId}
                      onChange={(e) => setReceivingMidwifeId(e.target.value)}
                      className="w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#08122c] px-3.5 py-2.5 font-bold text-slate-900 dark:text-white shadow-2xs focus:border-emerald-600"
                    >
                      <option value="">-- Pilih Bidan / Perawat --</option>
                      {db.master_catalog.midwives_nurses.map((mid) => (
                        <option key={mid.staff_id} value={mid.staff_id}>
                          {mid.full_name} — {mid.profession} (Shift {mid.shift})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={receivingMidwifeNameManual}
                      onChange={(e) => setReceivingMidwifeNameManual(e.target.value)}
                      placeholder="Ketik Nama Bidan/Perawat..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="md:col-span-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Keluhan Utama / Alasan Admisi Masuk:
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const tpl = db.master_catalog.chief_complaints.find(
                        (t) => t.complaint_id === e.target.value
                      );
                      if (tpl) setKeluhanUtama(tpl.default_text);
                    }}
                    className="rounded-lg border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900"
                  >
                    <option value="">+ Pilih Cepat dari Master Template Keluhan Utama...</option>
                    {db.master_catalog.chief_complaints.map((tpl) => (
                      <option key={tpl.complaint_id} value={tpl.complaint_id}>
                        [{tpl.code}] {tpl.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={keluhanUtama}
                  onChange={(e) => setKeluhanUtama(e.target.value)}
                  placeholder="Ketik keluhan utama atau pilih template di atas..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-[#08122c] font-semibold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb]"
                />
              </div>
            </div>
          </div>

          {/* 3. Riwayat Obstetri & Penyakit Penyerta Relevan (FR-05) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                3. Riwayat Obstetri, Paritas, & Penyakit Penyerta Relevan (FR-05)
              </h4>
            </div>

            {/* 5 Metric Counter Tiles (G, P, A, Anak Hidup, SC) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-[#08122c] p-3 text-center shadow-2xs">
                <span className="block font-black text-blue-900 dark:text-blue-300 text-[11px] mb-1">
                  Gravida (G)
                </span>
                <input
                  type="number"
                  min={1}
                  value={gravida}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    setGravida(g);
                    if (g === 1) {
                      setPara(0);
                      setAbortus(0);
                      setScCount(0);
                    }
                  }}
                  className="w-full text-center rounded-xl bg-blue-50/60 dark:bg-blue-950/60 py-1.5 text-base font-black text-[#185adb] dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                />
              </div>

              <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-[#08122c] p-3 text-center shadow-2xs">
                <span className="block font-black text-indigo-900 dark:text-indigo-300 text-[11px] mb-1">
                  Para (P)
                </span>
                <input
                  type="number"
                  min={0}
                  value={para}
                  onChange={(e) => setPara(Number(e.target.value))}
                  className="w-full text-center rounded-xl bg-indigo-50/60 dark:bg-indigo-950/60 py-1.5 text-base font-black text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                />
              </div>

              <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-[#08122c] p-3 text-center shadow-2xs">
                <span className="block font-black text-amber-900 dark:text-amber-300 text-[11px] mb-1">
                  Abortus (A)
                </span>
                <input
                  type="number"
                  min={0}
                  value={abortus}
                  onChange={(e) => setAbortus(Number(e.target.value))}
                  className="w-full text-center rounded-xl bg-amber-50/60 dark:bg-amber-950/60 py-1.5 text-base font-black text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                />
              </div>

              <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#08122c] p-3 text-center shadow-2xs">
                <span className="block font-black text-emerald-900 dark:text-emerald-300 text-[11px] mb-1">
                  Anak Hidup
                </span>
                <input
                  type="number"
                  min={0}
                  value={livingChildren}
                  onChange={(e) => setLivingChildren(Number(e.target.value))}
                  className="w-full text-center rounded-xl bg-emerald-50/60 dark:bg-emerald-950/60 py-1.5 text-base font-black text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                />
              </div>

              <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-[#08122c] p-3 text-center shadow-2xs">
                <span className="block font-black text-purple-900 dark:text-purple-300 text-[11px] mb-1">
                  Jumlah Bekas SC
                </span>
                <input
                  type="number"
                  min={0}
                  value={scCount}
                  onChange={(e) => setScCount(Number(e.target.value))}
                  className="w-full text-center rounded-xl bg-purple-50/60 dark:bg-purple-950/60 py-1.5 text-base font-black text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                />
              </div>
            </div>

            {/* Antropometri & Perhitungan IMT Otomatis (BB & TB) */}
            <div className="rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  <span className="font-black text-teal-950 dark:text-teal-200 text-xs uppercase tracking-wider">
                    Antropometri & Perhitungan IMT Otomatis:
                  </span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  imtNilai >= 30
                    ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200"
                    : imtNilai >= 25
                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200"
                    : imtNilai >= 18.5
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200"
                    : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200"
                }`}>
                  {imtNilai >= 30
                    ? `Obesitas (IMT ${imtNilai}) — Faktor Risiko PE & HPP`
                    : imtNilai >= 25
                    ? `Overweight (IMT ${imtNilai})`
                    : imtNilai >= 18.5
                    ? `Normal (IMT ${imtNilai})`
                    : `Underweight (IMT ${imtNilai})`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                    Berat Badan (BB) dalam kg <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min={30}
                      max={200}
                      value={bbKg}
                      onChange={(e) => setBbKg(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2 font-black text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                    Tinggi Badan (TB) dalam cm <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min={100}
                      max={220}
                      value={tbCm}
                      onChange={(e) => setTbCm(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2 font-black text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">cm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-teal-900 dark:text-teal-300 mb-1">
                    IMT Ibu (kg/m²) — Dihitung Otomatis:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      readOnly
                      value={imtNilai}
                      className="w-full rounded-xl border-2 border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-[#062024] px-3.5 py-2 font-black text-teal-900 dark:text-teal-200 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600">kg/m²</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Faktor Komorbiditas FiveStatusSelector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                {
                  label: "Riwayat Preeklamsia / Eklamsia Sebelumnya",
                  val: gravida === 1 ? "TIDAK_RELEVAN" : riwayatPe,
                  setVal: setRiwayatPe,
                },
                {
                  label: "Riwayat HPP / Atonia Uteri Sebelumnya",
                  val: gravida === 1 ? "TIDAK_RELEVAN" : riwayatHpp,
                  setVal: setRiwayatHpp,
                },
                {
                  label: "Kehamilan Ganda / Multipel Saat Ini",
                  val: kehamilanGanda,
                  setVal: setKehamilanGanda,
                },
                {
                  label: "Hipertensi Kronis",
                  val: hipertensiKronis,
                  setVal: setHipertensiKronis,
                },
                {
                  label: "Diabetes Melitus (Pregestasional / Gestasional)",
                  val: diabetesMelitus,
                  setVal: setDiabetesMelitus,
                },
                {
                  label: "Penyakit Ginjal / Autoimun (SLE/APS)",
                  val: penyakitGinjal,
                  setVal: setPenyakitGinjal,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08122c] p-4 flex flex-col gap-2 shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                  <FiveStatusSelector value={item.val} onChange={item.setVal} compact />
                </div>
              ))}
            </div>

            <div className="text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Catatan Tambahan Riwayat Obstetri / Komorbid:
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = db.master_catalog.comorbidity_templates.find(
                      (t) => t.comorbid_id === e.target.value
                    );
                    if (tpl) setCatatanKomorbid(tpl.default_note);
                  }}
                  className="rounded-lg border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900"
                >
                  <option value="">+ Pilih Cepat dari Master Template Komorbid/ANC...</option>
                  {db.master_catalog.comorbidity_templates.map((tpl) => (
                    <option key={tpl.comorbid_id} value={tpl.comorbid_id}>
                      [{tpl.code}] {tpl.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={catatanKomorbid}
                onChange={(e) => setCatatanKomorbid(e.target.value)}
                placeholder="Misal: USG plasenta letak rendah, kontrol ANC di bidan..."
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-[#08122c] font-semibold text-slate-900 dark:text-white shadow-2xs focus:border-[#185adb]"
              />
            </div>
          </div>

          {/* Tombol Aksi Simpan */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c183a] px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors"
            >
              Simpan Episode Admisi Saja
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => handleCreateAdmissionEpisode(e as any, "PE")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#185adb] hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                <HeartPulse className="h-4 w-4" />
                <span>Simpan Admisi & Mulai Skrining PE &rarr;</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => handleCreateAdmissionEpisode(e as any, "HPP")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
              >
                <Droplets className="h-4 w-4" />
                <span>Simpan Admisi & Mulai Skrining HPP 4T &rarr;</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* DAFTAR EPISODE ADMISI AKTIF */}
      <div className="w-full rounded-3xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-6 lg:p-8 shadow-[0_4px_25px_rgba(20,60,160,0.06)] space-y-6">
        {/* Header Daftar Admisi */}
        <div className="border-b border-blue-100 dark:border-blue-950/80 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#185adb] to-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm border border-blue-300/40">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Daftar Episode Admisi Aktif
                </h3>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/80 px-3 py-0.5 text-xs font-black text-[#185adb] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {activeAdmissions.length} Pasien Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hanya menampilkan pasien yang sedang aktif dirawat. Pasien berstatus CLOSED otomatis dipindahkan ke RPP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 rounded-xl border border-blue-200 dark:border-blue-800 transition-all active:scale-95 shadow-2xs"
              title="Perbarui Data Admisi"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* FILTER PANEL LENGKAP & SIMPEL */}
        <div className="rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/40 to-slate-50/30 dark:from-blue-950/20 dark:to-[#08122c]/40 p-4 lg:p-5 space-y-3.5 shadow-xs">
          {/* Quick Filter Tabs (Chips) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-bold scrollbar-none">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setFilterRiskQuick("ALL")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterRiskQuick === "ALL"
                    ? "bg-[#185adb] text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
              >
                Semua ({activeAdmissions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterRiskQuick("HIGH")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  filterRiskQuick === "HIGH"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Risiko Tinggi ({countHigh})
              </button>
              <button
                type="button"
                onClick={() => setFilterRiskQuick("MODERATE")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  filterRiskQuick === "MODERATE"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:border-amber-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Risiko Sedang ({countModerate})
              </button>
              <button
                type="button"
                onClick={() => setFilterRiskQuick("LOW")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  filterRiskQuick === "LOW"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Risiko Rendah ({countLow})
              </button>
              <button
                type="button"
                onClick={() => setFilterRiskQuick("UNSCREENED")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  filterRiskQuick === "UNSCREENED"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                Belum Skrining ({countUnscreened})
              </button>
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Baris Input Pencarian & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchAdmQuery}
                onChange={(e) => setSearchAdmQuery(e.target.value)}
                placeholder="Cari Pasien, No. RM, Kode ADM, DPJP, dsb..."
                className="w-full rounded-xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#08122c] pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#185adb] shadow-2xs transition-all"
              />
              {searchAdmQuery && (
                <button
                  type="button"
                  onClick={() => setSearchAdmQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Ruangan / Unit */}
            <div className="lg:col-span-2">
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full rounded-xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#08122c] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:border-[#185adb]"
              >
                <option value="ALL">Semua Ruangan</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Dokter DPJP */}
            <div className="lg:col-span-2">
              <select
                value={filterDpjp}
                onChange={(e) => setFilterDpjp(e.target.value)}
                className="w-full rounded-xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#08122c] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:border-[#185adb]"
              >
                <option value="ALL">Semua DPJP</option>
                {availableDpjps.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Skrining Detail */}
            <div className="lg:col-span-2">
              <select
                value={filterScreeningStatus}
                onChange={(e) => setFilterScreeningStatus(e.target.value)}
                className="w-full rounded-xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#08122c] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:border-[#185adb]"
              >
                <option value="ALL">Semua Skrining</option>
                <option value="PE_HIGH">PE: Risiko Tinggi</option>
                <option value="PE_MODERATE">PE: Risiko Sedang</option>
                <option value="PE_LOW">PE: Risiko Rendah</option>
                <option value="HPP_HIGH">HPP: Risiko Tinggi</option>
                <option value="HPP_MODERATE">HPP: Risiko Sedang</option>
                <option value="HPP_LOW">HPP: Risiko Rendah</option>
                <option value="UNSCREENED_ALL">Belum Skrining Lengkap</option>
              </select>
            </div>

            {/* Urutkan (Sort By) */}
            <div className="lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#08122c] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:border-[#185adb]"
              >
                <option value="NEWEST">Admisi Terbaru</option>
                <option value="RISK_HIGH">Risiko Tertinggi</option>
                <option value="NAME_ASC">Nama Pasien (A-Z)</option>
                <option value="UK_DESC">Usia Kehamilan Terbesar</option>
                <option value="OLDEST">Admisi Terlama</option>
              </select>
            </div>
          </div>

          {/* Status Keterangan Hasil Saring */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
            <div>
              Menampilkan{" "}
              <span className="font-black text-[#185adb] dark:text-blue-400">
                {filteredAdmissions.length}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {activeAdmissions.length}
              </span>{" "}
              episode admisi aktif
            </div>
            {isFilterActive && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                Filter kustom aktif
              </span>
            )}
          </div>
        </div>

        {/* DAFTAR KARTU ADMISI */}
        <div className="space-y-4">
          {filteredAdmissions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-10 text-center text-xs space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#185adb] dark:text-blue-300 flex items-center justify-center mx-auto">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {isFilterActive
                    ? "Tidak ada episode admisi yang cocok dengan kriteria filter."
                    : "Tidak ada episode admisi pasien aktif saat ini."}
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {isFilterActive
                    ? "Coba ubah kata kunci pencarian atau bersihkan filter untuk melihat semua pasien aktif."
                    : "Seluruh episode admisi yang telah ditutup/selesai dapat dilihat di menu Ringkasan Pasien Pulang (RPP)."}
                </p>
              </div>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-xl border border-blue-300 shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Bersihkan Filter</span>
                </button>
              )}
            </div>
          ) : (
            filteredAdmissions.map((adm) => {
              const isSelected = adm.admission_id === selectedAdmissionId;
              return (
                <div
                  key={adm.admission_id}
                  className={`rounded-2xl border-2 p-5 lg:p-6 transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-[0_4px_22px_rgba(24,90,219,0.18)] ring-2 ring-blue-500/30"
                      : "border-blue-200/90 hover:border-blue-400 dark:border-blue-900/70 dark:hover:border-blue-600 bg-white dark:bg-[#0c183a] shadow-[0_4px_20px_rgba(20,60,160,0.06)] hover:shadow-[0_8px_25px_rgba(20,60,160,0.12)]"
                  }`}
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-black text-white tracking-wide shadow-2xs">
                        {adm.admission_code}
                      </span>
                      <span className="rounded-lg bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Status: {adm.status}
                      </span>
                      <span className="rounded-lg bg-blue-100 dark:bg-blue-950/80 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {adm.unit?.name || "Kamar Bersalin"}
                      </span>
                      {adm.asal_rujukan && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          • {adm.asal_rujukan}
                        </span>
                      )}
                    </div>

                    {/* Patient Name, Parity, Gestational Age */}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-base font-black text-slate-900 dark:text-white capitalize">
                        {adm.patient?.full_name?.toLowerCase()}
                      </h4>
                      <span className="text-xs font-extrabold text-[#185adb] dark:text-blue-400">
                        ({adm.patient?.mrn})
                      </span>
                      <span className="text-xs text-slate-400 font-bold">—</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-extrabold border border-purple-200 dark:border-purple-800">
                        G{adm.obstetric_history.gravida}P
                        {adm.obstetric_history.para}A
                        {adm.obstetric_history.abortus}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">•</span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        UK {adm.usia_kehamilan_minggu} mgg{" "}
                        {adm.usia_kehamilan_hari} hr
                      </span>
                    </div>

                    {/* Keluhan */}
                    {adm.keluhan_utama && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                        <strong className="text-slate-700 dark:text-slate-200">
                          Keluhan:
                        </strong>{" "}
                        {adm.keluhan_utama}
                      </p>
                    )}

                    {/* DPJP & Bidan */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-[#185adb]" />
                        <strong>DPJP:</strong> {adm.attending_doctor_name || "-"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <strong>Bidan/Perawat:</strong>{" "}
                        {adm.receiving_midwife_name || "-"}
                      </span>
                    </div>

                    {/* Hasil Skrining PE & HPP */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          Hasil PE:
                        </span>
                        <RiskCategoryBadge
                          category={adm.latest_pe_result?.category}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          Hasil HPP:
                        </span>
                        <RiskCategoryBadge
                          category={adm.latest_hpp_result?.category}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() => onOpenPeScreening(adm.admission_id)}
                      className="rounded-xl bg-gradient-to-r from-[#185adb] to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-w-[135px]"
                    >
                      <HeartPulse className="h-4 w-4" />
                      <span>Skrining</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMonitoring(adm.admission_id)}
                      className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 min-w-[135px]"
                    >
                      <Activity className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span>Monitoring & SBAR</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

