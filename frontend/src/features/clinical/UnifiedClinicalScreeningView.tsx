"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRightLeft,
  CheckCheck,
  Save,
  RotateCcw,
  ShieldAlert,
  Droplets,
  HeartPulse,
  Activity,
  FileText,
  X,
  Bed,
  Check,
  Stethoscope,
  Info,
  Calendar,
  AlertCircle,
  Lock,
  Unlock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { apiRequest, EnrichedAdmission } from "@/services/api-client";
import type {
  ClinicalItemResponse,
  ClinicalProtocol,
  Domain4T,
  InfoSource,
  LabAvailabilityStatus,
  LabTestCode,
  RiskCategory,
  RiskFactorMaster,
  SigapDatabase,
  AdmissionStatus,
} from "@/types";

interface UnifiedClinicalScreeningViewProps {
  initialAdmissionId?: string;
  initialInstrument?: "PE" | "HPP";
  db: SigapDatabase;
  activeProtocol: ClinicalProtocol;
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onNavigateAdmission?: (admId: string) => void;
  onNavigateMonitoring?: (admId: string) => void;
  onNavigateRpp?: () => void;
}

// 7 Kategori Pengkajian Risiko Klinis Maternal & Obstetri dengan Warna Lembut-Sedang (Level 200–250)
const RISK_CATEGORIES = [
  {
    id: "MATERNAL",
    label: "MATERNAL",
    domain: "TONUS" as Domain4T,
    headerGradient: "bg-gradient-to-r from-rose-200 via-rose-200/90 to-pink-200/80 dark:from-rose-950/70 dark:via-rose-900/60 dark:to-pink-950/50 text-rose-950 dark:text-rose-100 border-b-2 border-rose-300/90 dark:border-rose-800",
    cardBorder: "border-2 border-rose-300/90 dark:border-rose-800/80 shadow-[0_2px_12px_rgba(244,63,94,0.06)]",
    iconStyle: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-300/80 dark:border-rose-700",
    badgeStyle: "bg-white/90 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border border-rose-300/80 dark:border-rose-700",
    chevronStyle: "text-rose-800 dark:text-rose-200 bg-white/70 dark:bg-rose-900/50",
    indentLine: "border-l-4 border-l-rose-400 dark:border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20",
    icon: HeartPulse,
  },
  {
    id: "OBSTETRI",
    label: "OBSTETRI",
    domain: "TRAUMA" as Domain4T,
    headerGradient: "bg-gradient-to-r from-blue-200 via-blue-200/90 to-indigo-200/80 dark:from-blue-950/70 dark:via-blue-900/60 dark:to-indigo-950/50 text-blue-950 dark:text-blue-100 border-b-2 border-blue-300/90 dark:border-blue-800",
    cardBorder: "border-2 border-blue-300/90 dark:border-blue-800/80 shadow-[0_2px_12px_rgba(37,99,235,0.06)]",
    iconStyle: "bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-300/80 dark:border-blue-700",
    badgeStyle: "bg-white/90 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300/80 dark:border-blue-700",
    chevronStyle: "text-blue-800 dark:text-blue-200 bg-white/70 dark:bg-blue-900/50",
    indentLine: "border-l-4 border-l-blue-400 dark:border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20",
    icon: Stethoscope,
  },
  {
    id: "JANIN",
    label: "JANIN",
    domain: "JARINGAN" as Domain4T,
    headerGradient: "bg-gradient-to-r from-purple-200 via-purple-200/90 to-violet-200/80 dark:from-purple-950/70 dark:via-purple-900/60 dark:to-violet-950/50 text-purple-950 dark:text-purple-100 border-b-2 border-purple-300/90 dark:border-purple-800",
    cardBorder: "border-2 border-purple-300/90 dark:border-purple-800/80 shadow-[0_2px_12px_rgba(147,51,234,0.06)]",
    iconStyle: "bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-300/80 dark:border-purple-700",
    badgeStyle: "bg-white/90 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300/80 dark:border-purple-700",
    chevronStyle: "text-purple-800 dark:text-purple-200 bg-white/70 dark:bg-purple-900/50",
    indentLine: "border-l-4 border-l-purple-400 dark:border-l-purple-500 bg-purple-50/40 dark:bg-purple-950/20",
    icon: Activity,
  },
  {
    id: "KOMBINASI_RISIKO",
    label: "KOMBINASI RISIKO",
    domain: "TAMBAHAN" as Domain4T,
    headerGradient: "bg-gradient-to-r from-amber-200 via-amber-200/90 to-orange-200/80 dark:from-amber-950/70 dark:via-amber-900/60 dark:to-orange-950/50 text-amber-950 dark:text-amber-100 border-b-2 border-amber-300/90 dark:border-amber-800",
    cardBorder: "border-2 border-amber-300/90 dark:border-amber-800/80 shadow-[0_2px_12px_rgba(217,119,6,0.06)]",
    iconStyle: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700",
    badgeStyle: "bg-white/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700",
    chevronStyle: "text-amber-800 dark:text-amber-200 bg-white/70 dark:bg-amber-900/50",
    indentLine: "border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20",
    icon: ShieldAlert,
  },
  {
    id: "PERSALINAN",
    label: "PERSALINAN",
    domain: "TONUS" as Domain4T,
    headerGradient: "bg-gradient-to-r from-emerald-200 via-emerald-200/90 to-teal-200/80 dark:from-emerald-950/70 dark:via-emerald-900/60 dark:to-teal-950/50 text-emerald-950 dark:text-emerald-100 border-b-2 border-emerald-300/90 dark:border-emerald-800",
    cardBorder: "border-2 border-emerald-300/90 dark:border-emerald-900/80 shadow-[0_2px_12px_rgba(5,150,105,0.06)]",
    iconStyle: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700",
    badgeStyle: "bg-white/90 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700",
    chevronStyle: "text-emerald-800 dark:text-emerald-200 bg-white/70 dark:bg-emerald-900/50",
    indentLine: "border-l-4 border-l-emerald-400 dark:border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
    icon: Clock,
  },
  {
    id: "HEMATOLOGI",
    label: "HEMATOLOGI",
    domain: "TROMBIN" as Domain4T,
    headerGradient: "bg-gradient-to-r from-red-200 via-red-200/90 to-rose-200/80 dark:from-red-950/70 dark:via-red-900/60 dark:to-rose-950/50 text-red-950 dark:text-red-100 border-b-2 border-red-300/90 dark:border-red-800",
    cardBorder: "border-2 border-red-300/90 dark:border-red-900/80 shadow-[0_2px_12px_rgba(220,38,38,0.06)]",
    iconStyle: "bg-red-500/20 text-red-800 dark:text-red-200 border border-red-300/80 dark:border-red-700",
    badgeStyle: "bg-white/90 dark:bg-red-900/60 text-red-900 dark:text-red-200 border border-red-300/80 dark:border-red-700",
    chevronStyle: "text-red-800 dark:text-red-200 bg-white/70 dark:bg-red-900/50",
    indentLine: "border-l-4 border-l-red-400 dark:border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
    icon: Droplets,
  },
  {
    id: "LABORATORIUM",
    label: "LABORATORIUM",
    domain: "TROMBIN" as Domain4T,
    headerGradient: "bg-gradient-to-r from-cyan-200 via-cyan-200/90 to-sky-200/80 dark:from-cyan-950/70 dark:via-cyan-900/60 dark:to-sky-950/50 text-cyan-950 dark:text-cyan-100 border-b-2 border-cyan-300/90 dark:border-cyan-800",
    cardBorder: "border-2 border-cyan-300/90 dark:border-cyan-900/80 shadow-[0_2px_12px_rgba(8,145,178,0.06)]",
    iconStyle: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-300/80 dark:border-cyan-700",
    badgeStyle: "bg-white/90 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200 border border-cyan-300/80 dark:border-cyan-700",
    chevronStyle: "text-cyan-800 dark:text-cyan-200 bg-white/70 dark:bg-cyan-900/50",
    indentLine: "border-l-4 border-l-cyan-400 dark:border-l-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20",
    icon: FileText,
  },
];

export function UnifiedClinicalScreeningView({
  initialAdmissionId,
  initialInstrument = "PE",
  db,
  activeProtocol,
  currentUserId,
  onRefresh,
  onNavigateAdmission,
  onNavigateMonitoring,
  onNavigateRpp,
}: UnifiedClinicalScreeningViewProps) {
  // 1. Tab Instrumen Skrining (Alur Wajib: Skrining PE Terlebih Dahulu)
  const [activeInstrument, setActiveInstrument] = useState<"PE" | "HPP">(initialInstrument);

  // 2. State Filter & Pencarian Daftar Pasien (Kolom Kiri)
  const [searchQuery, setSearchQuery] = useState("");
  const [patientTypeFilter, setPatientTypeFilter] = useState<"ALL" | "RANAP" | "RAJAL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // 3. Pasien / Admisi Terpilih (Hanya Pasien Aktif / Belum Pulang)
  const [selectedAdmId, setSelectedAdmId] = useState<string>(() => {
    if (initialAdmissionId && db.admissions.some((a) => a.admission_id === initialAdmissionId && a.status !== "CLOSED")) {
      return initialAdmissionId;
    }
    const firstActive = db.admissions.find((a) => a.status === "ACTIVE") || db.admissions.find((a) => a.status !== "CLOSED");
    return firstActive?.admission_id || "";
  });

  useEffect(() => {
    if (initialAdmissionId) {
      setSelectedAdmId(initialAdmissionId);
    }
  }, [initialAdmissionId]);

  // Enrich Admissions with Patient & Screening
  const enrichedAdmissions = useMemo(() => {
    return db.admissions.map((adm) => {
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

      return {
        ...adm,
        patient,
        unit,
        pe_screening: pe,
        hpp_screening: hpp,
        latest_pe_result: latestPe,
        latest_hpp_result: latestHpp,
      };
    });
  }, [db]);

  // Pasien yang berstatus CLOSED (Selesai/Pulang) otomatis keluar dari antrean skrining aktif!
  const activeAdmissions = useMemo(() => {
    return enrichedAdmissions.filter((adm) => adm.status !== "CLOSED");
  }, [enrichedAdmissions]);

  // Filtered Admissions for Left Column (Hanya Pasien Aktif)
  const filteredAdmissions = useMemo(() => {
    return activeAdmissions.filter((adm) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        adm.patient?.full_name?.toLowerCase().includes(q) ||
        adm.patient?.mrn?.toLowerCase().includes(q) ||
        adm.admission_code?.toLowerCase().includes(q);

      const isRanap = adm.jenis_admisi === "ADM_INPARTU" || adm.jenis_admisi === "RUJUKAN_EMERGENSI";
      let matchType = true;
      if (patientTypeFilter === "RANAP") matchType = isRanap;
      if (patientTypeFilter === "RAJAL") matchType = !isRanap;

      return matchSearch && matchType;
    });
  }, [activeAdmissions, searchQuery, patientTypeFilter]);

  // Pagination for Left Column
  const totalItems = filteredAdmissions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedAdmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmissions.slice(start, start + pageSize);
  }, [filteredAdmissions, currentPage, pageSize]);

  // Selected Admission Object (Harus dari antrean aktif)
  const currentAdmission = useMemo(() => {
    return (
      activeAdmissions.find((a) => a.admission_id === selectedAdmId) ||
      activeAdmissions[0] ||
      null
    );
  }, [activeAdmissions, selectedAdmId]);

  // Status Apakah Skrining PE Pasien Ini Sudah Selesai Dibuat/Dievaluasi
  const isPeScreeningCompleted = useMemo(() => {
    if (!currentAdmission) return false;
    return Boolean(
      currentAdmission.latest_pe_result?.category ||
      (currentAdmission.pe_screening && currentAdmission.pe_screening.status === "COMPLETED")
    );
  }, [currentAdmission]);

  // Alur Klinis Wajib: Bila pasien belum menyelesaikan Skrining PE, tab HPP otomatis terkunci dan kembali ke PE
  useEffect(() => {
    if (!isPeScreeningCompleted && activeInstrument === "HPP") {
      setActiveInstrument("PE");
    }
  }, [selectedAdmId, isPeScreeningCompleted, activeInstrument]);

  // 4. State Accordion Kategori & Filter Risiko (Section 1)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    MATERNAL: true,
    OBSTETRI: true,
    HEMATOLOGI: true,
    LABORATORIUM: true,
    PERSALINAN: true,
    JANIN: true,
    KOMBINASI_RISIKO: true,
  });

  const [riskFilter, setRiskFilter] = useState<"SEMUA" | "TINGGI" | "MEDIUM" | "RENDAH">("SEMUA");

  // Masters
  const hppMasters = useMemo(() => {
    return db.risk_factors.filter((r) => r.screening_pathway === "HPP" && r.active_status);
  }, [db]);

  const peMasters = useMemo(() => {
    return db.risk_factors.filter((r) => r.screening_pathway === "PE" && r.active_status);
  }, [db]);

  const currentMasters = activeInstrument === "HPP" ? hppMasters : peMasters;

  // 5. State Isian Skrining (Form Inputs)
  const [responses, setResponses] = useState<Record<string, ClinicalItemResponse>>({});
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast Notification State (Feedback Otomatis Setelah Simpan)
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!toast?.show) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (title: string, message: string, type: "success" | "error" = "success") => {
    setToast({
      show: true,
      title,
      message,
      type,
    });
  };

  // Bundle Checklist Execution State
  const [bundleChecked, setBundleChecked] = useState<Record<string, { done: boolean; time?: string }>>({});

  // Dialog Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");

  // Track loaded admission and instrument to prevent background sync from wiping user edits
  const lastLoadedAdmIdRef = useRef<string>("");
  const lastLoadedInstrumentRef = useRef<string>("");

  // Populate responses ONLY when patient or instrument changes
  useEffect(() => {
    if (!currentAdmission) return;
    const isNewContext =
      lastLoadedAdmIdRef.current !== currentAdmission.admission_id ||
      lastLoadedInstrumentRef.current !== activeInstrument;

    if (!isNewContext) {
      // Jangan timpa isian form bila pasien dan instrumen masih sama (misal ada polling background)
      return;
    }

    lastLoadedAdmIdRef.current = currentAdmission.admission_id;
    lastLoadedInstrumentRef.current = activeInstrument;

    const pathway = activeInstrument;
    const existingDetails = db.screening_risk_details.filter(
      (d) => d.admission_id === currentAdmission.admission_id && d.pathway === pathway
    );

    const initMap: Record<string, ClinicalItemResponse> = {};
    const masters = pathway === "HPP" ? hppMasters : peMasters;

    masters.forEach((m) => {
      const found = existingDetails.find(
        (d) => d.risk_factor_id === m.risk_factor_id || d.risk_factor_code === m.code
      );
      if (found) {
        initMap[m.risk_factor_id] = found.response;
      } else {
        // Cek riwayat obstetri bawaan
        if (m.code === "HPP_ADD_PREV_HPP" && currentAdmission.obstetric_history.riwayat_hpp_sebelumnya === "YA") {
          initMap[m.risk_factor_id] = "YA";
        } else if (m.code === "HPP_TRAUMA_PREV_SC_SURGERY" && currentAdmission.obstetric_history.riwayat_sc_jumlah > 0) {
          initMap[m.risk_factor_id] = "YA";
        } else if (m.code === "HPP_TONUS_GRAND_MULTIPARA" && currentAdmission.obstetric_history.para > 4) {
          initMap[m.risk_factor_id] = "YA";
        } else if (
          (m.code === "PE_HIST_PREV_PE" || m.code === "PE_HIGH_PREV_PE") &&
          currentAdmission.obstetric_history.riwayat_pe_sebelumnya === "YA"
        ) {
          initMap[m.risk_factor_id] = "YA";
        } else if (
          (m.code === "PE_CHRONIC_HTN" || m.code === "PE_HIGH_CHRONIC_HYPERTENSION") &&
          currentAdmission.obstetric_history.hipertensi_kronis === "YA"
        ) {
          initMap[m.risk_factor_id] = "YA";
        } else {
          // Default: tidak
          initMap[m.risk_factor_id] = "TIDAK";
        }
      }
    });

    setResponses(initMap);
    setClinicalNotes(
      (activeInstrument === "HPP"
        ? currentAdmission.hpp_screening?.clinical_notes
        : currentAdmission.pe_screening?.clinical_notes) || ""
    );
    setTargetUnitId(currentAdmission.unit_id || db.units[0]?.unit_id || "");
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [currentAdmission?.admission_id, activeInstrument, db.screening_risk_details, hppMasters, peMasters]);

  // Hitung Aspek Ditinjau & Belum Dipilih
  const totalFactorsCount = currentMasters.length;
  const answeredCount = useMemo(() => {
    return Object.values(responses).filter((r) => r === "YA" || r === "TIDAK").length;
  }, [responses]);

  const unselectedCount = Math.max(0, totalFactorsCount - answeredCount);

  // Kategori Faktor Pembagian (Mapping ke 7 Accordion)
  const categorizedFactors = useMemo(() => {
    const groups: Record<string, RiskFactorMaster[]> = {
      MATERNAL: [],
      OBSTETRI: [],
      HEMATOLOGI: [],
      LABORATORIUM: [],
      PERSALINAN: [],
      JANIN: [],
      KOMBINASI_RISIKO: [],
    };

    currentMasters.forEach((m) => {
      const codeUpper = m.code.toUpperCase();
      const labelUpper = m.label.toUpperCase();

      if (codeUpper.includes("LAB") || codeUpper.includes("TROMBOSIT") || codeUpper.includes("PROTEIN") || labelUpper.includes("LABORATORIUM")) {
        groups.LABORATORIUM.push(m);
      } else if (codeUpper.includes("TROMBIN") || codeUpper.includes("HEMO") || codeUpper.includes("ANEMIA")) {
        groups.HEMATOLOGI.push(m);
      } else if (codeUpper.includes("PERSALINAN") || codeUpper.includes("INDUKSI") || codeUpper.includes("PARTUS")) {
        groups.PERSALINAN.push(m);
      } else if (codeUpper.includes("JANIN") || codeUpper.includes("GEMELI") || codeUpper.includes("MAKROSOMIA") || codeUpper.includes("IUGR") || codeUpper.includes("MULTIPLE") || labelUpper.includes("JANIN") || labelUpper.includes("GANDA")) {
        groups.JANIN.push(m);
      } else if (codeUpper.includes("KOMBINASI") || codeUpper.includes("TAMBAHAN") || codeUpper.includes("OBESIT") || codeUpper.includes("USIA") || codeUpper.includes("AGE") || codeUpper.includes("INTERVAL") || labelUpper.includes("OBESITAS") || labelUpper.includes("USIA")) {
        groups.KOMBINASI_RISIKO.push(m);
      } else if (codeUpper.includes("TRAUMA") || codeUpper.includes("SC") || codeUpper.includes("PARUT") || codeUpper.includes("OBSTETRI") || codeUpper.includes("PRIMI") || codeUpper.includes("PREV_PE") || codeUpper.includes("HIST_PREV") || labelUpper.includes("PREEKLAMSIA") || labelUpper.includes("PRIMIGRAVIDA")) {
        groups.OBSTETRI.push(m);
      } else {
        groups.MATERNAL.push(m);
      }
    });

    return groups;
  }, [currentMasters]);

  // Live Calculated Risk Category (Sesuai Kriteria Ringkas Tabel 3)
  const calculatedRisk: RiskCategory = useMemo(() => {
    // Kunci Otomatis: Ibu dengan PE Berat otomatis diklasifikasikan sebagai Risiko Tinggi HPP (Tabel 2 & 3)
    if (activeInstrument === "HPP" && currentAdmission?.latest_pe_result?.category === "HIGH") {
      return "HIGH";
    }

    let hasHigh = false;
    let moderateCount = 0;

    Object.entries(responses).forEach(([rfId, resp]) => {
      if (resp === "YA") {
        const factor = currentMasters.find((m) => m.risk_factor_id === rfId);
        if (factor) {
          if (factor.risk_tier === "CRITICAL_IMMEDIATE" || factor.risk_tier === "HIGH") {
            hasHigh = true;
          } else if (factor.risk_tier === "MODERATE") {
            moderateCount++;
          }
        }
      }
    });

    if (hasHigh) return "HIGH";
    if (moderateCount >= 1) return "MODERATE";
    return "LOW";
  }, [responses, currentMasters, activeInstrument, currentAdmission]);

  // Deteksi Otomatis: Apakah pasien mengalami Preeklamsia Berat / Hipertensi (Tabel 2 Poin 12)
  const isPatientPeHigh = useMemo(() => {
    return (
      currentAdmission?.latest_pe_result?.category === "HIGH" ||
      (activeInstrument === "PE" && calculatedRisk === "HIGH") ||
      currentAdmission?.obstetric_history.riwayat_pe_sebelumnya === "YA" ||
      currentAdmission?.obstetric_history.hipertensi_kronis === "YA"
    );
  }, [currentAdmission, activeInstrument, calculatedRisk]);

  const activeFactorsCount = useMemo(() => {
    return Object.values(responses).filter((r) => r === "YA").length;
  }, [responses]);

  // Bundle Tindak Lanjut Klinis Persis Sesuai Tabel 3 Dokumen SIGAP
  const bundleItems = useMemo(() => {
    if (activeInstrument === "HPP") {
      if (calculatedRisk === "HIGH") {
        return [
          {
            id: "hpp-h1",
            title: "Konsultasi Dini Sp.OG, Anestesi, & Bank Darah (Format SBAR)",
            desc: "Pemberitahuan dini tim multidisiplin PONEK dan konfirmasi kesiapan darah cito.",
          },
          {
            id: "hpp-h2",
            title: "Pasang Dua Jalur Akses IV Kanul Besar (16G–18G) & Crossmatch",
            desc: "Siapkan jalur kristaloid hangat & transfusi darah (minimal 2 labu PRC siap pakai).",
          },
          {
            id: "hpp-h3",
            title: "Siapkan Paket Tatalaksana E-MOTIVE Lengkap di Kamar Bersalin",
            desc: "Kesiapan respons simultan < 15 menit: (E) Drape kalibrasi, (M) Masase, (O) Oksitosin, (T) Asam Traneksamat 1g IV, (IV) Cairan & periksa jalan lahir, (E) Eskalasi.",
          },
          {
            id: "hpp-h4",
            title: "Siapkan Alat Tamponade Balon Uterus / Kondom Kateter",
            desc: "Intervensi hemostasis mekanis darurat bila perdarahan berlanjut sebelum intervensi bedah.",
          },
          {
            id: "hpp-h5",
            title: "Waspada Kontraindikasi Uterotonika",
            desc: isPatientPeHigh
              ? "KONTRAINDIKASI MUTLAK METILERGOMETRIN (pasien hipertensi/preeklamsia). Gunakan Oksitosin / Misoprostol / Karbetosin."
              : "Siapkan Oksitosin 10-20 IU drip, Karbetosin 100 mcg IM/IV, atau Misoprostol 400-600 mcg.",
          },
          {
            id: "hpp-h6",
            title: "Pertimbangkan Rujukan Terencana ke Fasilitas PONEK Komprehensif",
            desc: "Siapkan stabilisasi dan rujukan ambulans bila sarana atau komponen darah tidak memadai.",
          },
        ];
      }
      if (calculatedRisk === "MODERATE") {
        return [
          {
            id: "hpp-m1",
            title: "Pasang Akses IV Berdiameter Besar (16G–18G)",
            desc: "Akses intravena paten untuk kesiagaan hidrasi dan dekompensasi mendadak.",
          },
          {
            id: "hpp-m2",
            title: "Pemeriksaan Darah Lengkap (Hb / Trombosit) & Golongan Darah",
            desc: "Identifikasi status anemia admisi (Hb < 11 g/dL) dan uji kecocokan golongan darah.",
          },
          {
            id: "hpp-m3",
            title: "Siapkan Uterotonika & Asam Traneksamat 1 g IV (Bedside Kit)",
            desc: "Letakkan uterotonika dan Asam Traneksamat di samping tempat tidur sebagai kesiagaan darurat.",
          },
          {
            id: "hpp-m4",
            title: "Wajib Ukur Kehilangan Darah Objektif dengan Kain Kalibrasi",
            desc: "Gunakan underbuttock graduated drape / penimbangan kasa sejak kala III dan informasikan tim jaga.",
          },
        ];
      }
      // LOW (Hijau)
      return [
        {
          id: "hpp-l1",
          title: "Penatalaksanaan Aktif Kala III (MAK III) Rutin",
          desc: "Pemberian Oksitosin 10 IU IM/IV (atau Karbetosin stabil panas 100 ug) segera dalam 1 menit setelah bayi lahir.",
        },
        {
          id: "hpp-l2",
          title: "Pengukuran Kehilangan Darah Objektif & Pantau Shock Index",
          desc: "Gunakan kain kalibrasi / penimbangan kasa dan pantau Shock Index (HR/TDS) pascapersalinan. Tinggalkan estimasi visual.",
        },
      ];
    } else {
      // Instrument PREEKLAMSIA (PE)
      if (calculatedRisk === "HIGH") {
        return [
          {
            id: "pe-h1",
            title: "Aktivasi Respons Cepat & Timer 30–60 Menit: Lapor Sp.OG (SBAR)",
            desc: "Segera laporkan kondisi ibu ke DPJP Sp.OG menggunakan kerangka komunikasi SBAR terstandar.",
          },
          {
            id: "pe-h2",
            title: "Pemberian Magnesium Sulfat (MgSO4 40%) Lini Pertama Anti-Kejang",
            desc: "Loading dose: 4 gram MgSO4 40% IV pelan dalam 5-10 menit, lanjut rumatan 1 gram/jam. Siapkan Kalsium Glukonat 10% (antidotum).",
          },
          {
            id: "pe-h3",
            title: "Antihipertensi Kerja Cepat dalam 30–60 Menit",
            desc: "Nifedipin 10 mg oral (evaluasi 15-30 mnt), Labetalol IV, atau Hidralazin IV. Target TD < 140/90 mmHg (diastolik aman >= 80 mmHg).",
          },
          {
            id: "pe-h4",
            title: "Pasang Akses IV Pembatasan Cairan Ketat & Kateter Urin Menetap",
            desc: "Batasi cairan untuk cegah edema paru akut. Pantau syarat MgSO4: urin >= 30 mL/jam, RR >= 16x/mnt, refleks patela (+).",
          },
          {
            id: "pe-h5",
            title: "Kunci Otomatis HPP Risiko Tinggi & Kontraindikasi Metilergometrin",
            desc: "KONTRAINDIKASI MUTLAK METILERGOMETRIN (ergometrin) karena memicu krisis hipertensi dan stroke hemoragik.",
          },
          {
            id: "pe-h6",
            title: "Evaluasi Laboratorium Serial & Rencana Rujukan / Terminasi",
            desc: "Cek serial trombosit, fungsi hati SGOT/SGPT, kreatinin, dan siapkan rujukan bila fasilitas tidak memadai.",
          },
        ];
      }
      if (calculatedRisk === "MODERATE") {
        return [
          {
            id: "pe-m1",
            title: "Istirahatkan Ibu & Ulangi Pengukuran TD Terstandar (>= 15 Menit)",
            desc: "Posisi duduk bersandar atau setengah duduk, manset pas, lengan setinggi jantung (atau evaluasi dalam 4 jam).",
          },
          {
            id: "pe-m2",
            title: "Periksa Protein Urin (Dipstik / uPCR) & Laboratorium Dasar",
            desc: "Pemeriksaan dipstik urin (>= +1) atau uPCR >= 0.3 mg/mg, darah lengkap (trombosit), fungsi hati, dan kreatinin.",
          },
          {
            id: "pe-m3",
            title: "Lapor Bidan Penanggung Jawab / Dokter Jaga & Pantau Berkala",
            desc: "Tingkatkan frekuensi observasi tanda vital dan edukasi tanda bahaya (nyeri kepala hebat, pandangan kabur, nyeri ulu hati).",
          },
          {
            id: "pe-m4",
            title: "Aktifkan Peringatan Dini Risiko HPP (Minimal Kategori Sedang)",
            desc: "Preeklamsia meningkatkan risiko atonia uteri dan komplikasi perdarahan pascapersalinan.",
          },
        ];
      }
      // LOW
      return [
        {
          id: "pe-l1",
          title: "Pemantauan Tanda Vital & Kemajuan Persalinan Rutin",
          desc: "Observasi tanda vital standar, denyut jantung janin, dan kemajuan partus sesuai protokol pelayanan kamar bersalin.",
        },
        {
          id: "pe-l2",
          title: "Skrining Ulang Segera Bila Muncul Keluhan Baru / Kenaikan TD",
          desc: "Lakukan pengukuran ulang bila tensi meningkat >= 140/90 mmHg atau muncul gejala nyeri kepala / pandangan kabur.",
        },
      ];
    }
  }, [activeInstrument, calculatedRisk, isPatientPeHigh]);

  const executedCount = Object.values(bundleChecked).filter((b) => b.done).length;

  // Handler: Tetapkan Jawaban Faktor Risiko (Eksplisit YA, TIDAK, atau BELUM_DIPERIKSA)
  const handleSelectResponse = (rfId: string, value: ClinicalItemResponse) => {
    setResponses((prev) => ({
      ...prev,
      [rfId]: value,
    }));
  };

  // Handler: Simpan Rekam Medis (Evaluasi CDSS Skrining)
  const handleSaveMedicalRecord = async () => {
    if (!currentAdmission) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const startTime = Date.now();

    try {
      if (activeInstrument === "HPP") {
        const formattedRiskDetails = Object.entries(responses).map(([rfId, val]) => {
          const m = hppMasters.find((item) => item.risk_factor_id === rfId);
          return {
            risk_factor_id: rfId,
            risk_factor_code: m?.code || "",
            response: val,
            info_source: "ANAMNESIS_PASIEN" as InfoSource,
            note: "",
          };
        });

        await apiRequest("/screening/hpp", {
          method: "POST",
          userId: currentUserId,
          body: {
            admission_id: currentAdmission.admission_id,
            perdarahan_aktif_saat_admisi: responses["HPP_ACTIVE_BLEED"] || "TIDAK",
            syok_hemodinamik_instabil: "TIDAK",
            rencana_metode_persalinan: "PERVAGINAM",
            clinical_notes: clinicalNotes || "Skrining HPP dari panel klinis terpadu.",
            risk_details: formattedRiskDetails,
            labs: [],
            duration_seconds: 60,
            is_preemptive: false,
          },
        });
      } else {
        // PE Screening
        const formattedRiskDetails = Object.entries(responses).map(([rfId, val]) => {
          const m = peMasters.find((item) => item.risk_factor_id === rfId);
          return {
            risk_factor_id: rfId,
            risk_factor_code: m?.code || "",
            response: val,
            info_source: "ANAMNESIS_PASIEN" as InfoSource,
            note: "",
          };
        });

        await apiRequest("/screening/pe", {
          method: "POST",
          userId: currentUserId,
          body: {
            action: "EVALUATE_PE",
            admission_id: currentAdmission.admission_id,
            kejang_eklamsia: "TIDAK",
            kesadaran_menurun_gcs_rendah: "TIDAK",
            edema_paru_sesak_berat: "TIDAK",
            oliguria_produksi_urin_rendah: "TIDAK",
            clinical_notes: clinicalNotes || "Skrining PE dari panel klinis terpadu.",
            symptoms: [],
            risk_details: formattedRiskDetails,
            labs: [],
            duration_seconds: 60,
            is_preemptive: false,
          },
        });
      }

      await onRefresh();

      // Berikan durasi minimum 600ms agar animasi proses loading pada button dapat terlihat jelas oleh pengguna
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }

      const patientName = currentAdmission.patient?.full_name || "Pasien";
      if (activeInstrument === "PE") {
        const msg = `Hasil Skrining Risiko PE berhasil disimpan (Kategori: ${calculatedRisk})! Skrining Risiko HPP sekarang telah terbuka.`;
        setSuccessMessage(msg);
        showToast(
          "Rekam Medis Berhasil Disimpan!",
          `Skrining Risiko PE untuk ${patientName} telah berhasil disimpan dengan kategori ${calculatedRisk}. Tahap 2 (Skrining HPP) kini telah terbuka.`,
          "success"
        );
      } else {
        const msg = `Hasil Skrining Risiko HPP berhasil disimpan ke Rekam Medis! Status risiko diperbarui: ${calculatedRisk}.`;
        setSuccessMessage(msg);
        showToast(
          "Rekam Medis Berhasil Disimpan!",
          `Skrining Risiko HPP untuk ${patientName} berhasil dievaluasi dan diperbarui ke kategori ${calculatedRisk}.`,
          "success"
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan rekam medis");
      showToast(
        "Gagal Menyimpan Rekam Medis",
        err.message || "Terjadi kendala saat menghubungi database server.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Ubah Status Rawat / Unit
  const handleUpdateUnitStatus = async () => {
    if (!currentAdmission) return;
    try {
      await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "UPDATE_UNIT_STATUS",
          admission_id: currentAdmission.admission_id,
          unit_id: targetUnitId,
          status: "ACTIVE",
          transfer_note: `Dipindahkan ke unit baru oleh petugas klinis.`,
        },
      });
      setShowStatusModal(false);
      await onRefresh();
      setSuccessMessage("Status rawat dan unit pasien berhasil diperbarui.");
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui status rawat");
    }
  };

  // Handler: Selesai / Pulang Pasien (Discharge)
  const handleDischargePatient = async () => {
    if (!currentAdmission) return;
    try {
      const patientName = currentAdmission.patient?.full_name || "Pasien";
      await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "DISCHARGE_ADMISSION",
          admission_id: currentAdmission.admission_id,
          discharge_summary:
            dischargeSummary || "Pasien telah menyelesaikan perawatan obstetri dan dinyatakan pulang tuntas.",
        },
      });
      setShowDischargeModal(false);
      setSelectedAdmId("");
      await onRefresh();
      setSuccessMessage(
        `Pasien ${patientName} telah resmi dipulangkan. Berkas otomatis dipindahkan ke menu Ringkasan Pasien.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memulangkan pasien");
    }
  };

  // Reset Formulir
  const handleResetForm = () => {
    const initMap: Record<string, ClinicalItemResponse> = {};
    currentMasters.forEach((m) => {
      initMap[m.risk_factor_id] = "TIDAK";
    });
    setResponses(initMap);
    setBundleChecked({});
    setSuccessMessage("Isian skrining telah direset ke nilai awal.");
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 items-start">
      {/* =========================================================================
          KOLOM KIRI: DAFTAR PASIEN (PERSIS SEPERTI GAMBAR REFERENSI USER)
         ========================================================================= */}
      <div className="w-full xl:w-[320px] 2xl:w-[350px] shrink-0 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
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
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
            title="Muat ulang daftar pasien"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Input Pencarian & Filter Pill */}
        <div className="p-3 border-b border-blue-100 dark:border-blue-900/60 space-y-2.5 bg-blue-50/20 dark:bg-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. RM atau nama..."
              className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Pills: Semua, Ranap, Rajal dengan Animasi */}
          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setPatientTypeFilter("ALL");
                setCurrentPage(1);
              }}
              className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                patientTypeFilter === "ALL"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
              }`}
            >
              Semua <span className="opacity-75 text-[10px]">({activeAdmissions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientTypeFilter("RANAP");
                setCurrentPage(1);
              }}
              className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                patientTypeFilter === "RANAP"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
              }`}
            >
              Ranap{" "}
              <span className="opacity-75 text-[10px]">
                ({activeAdmissions.filter((a) => a.jenis_admisi === "ADM_INPARTU" || a.jenis_admisi === "RUJUKAN_EMERGENSI").length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientTypeFilter("RAJAL");
                setCurrentPage(1);
              }}
              className={`py-1 rounded-lg text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                patientTypeFilter === "RAJAL"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600"
              }`}
            >
              Rajal{" "}
              <span className="opacity-75 text-[10px]">
                ({activeAdmissions.filter((a) => a.jenis_admisi !== "ADM_INPARTU" && a.jenis_admisi !== "RUJUKAN_EMERGENSI").length})
              </span>
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-medium px-0.5">
            Menampilkan {paginatedAdmissions.length} dari {totalItems} pasien
          </div>
        </div>

        {/* List Card Pasien */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[640px] overflow-y-auto">
          {paginatedAdmissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada pasien yang sesuai kriteria pencarian.
            </div>
          ) : (
            paginatedAdmissions.map((adm) => {
              const isSelected = adm.admission_id === currentAdmission?.admission_id;
              const isRanap = adm.jenis_admisi === "ADM_INPARTU" || adm.jenis_admisi === "RUJUKAN_EMERGENSI";
              const patientName = adm.patient?.full_name || "Pasien";
              const initial = patientName.charAt(0).toUpperCase();

              // Status Skrining Terakhir Pasien
              const scrResult = activeInstrument === "HPP" ? adm.latest_hpp_result : adm.latest_pe_result;
              const hasScreening = !!scrResult;
              const riskTier = scrResult?.category;

              return (
                <div
                  key={adm.admission_id}
                  onClick={() => setSelectedAdmId(adm.admission_id)}
                  className={`p-3.5 cursor-pointer transition-all duration-300 ease-out border-l-[6px] select-none active:scale-[0.98] ${
                    isSelected
                      ? "border-l-blue-600 bg-gradient-to-r from-blue-100/90 via-blue-50 to-indigo-50/70 dark:from-blue-950/80 dark:via-blue-900/50 dark:to-slate-900 shadow-sm ring-1 ring-blue-300/80 dark:ring-blue-700/80 -translate-y-0.5"
                      : "border-l-transparent bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 hover:border-l-blue-300 dark:hover:border-l-blue-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Lingkaran Avatar Inisial dengan Animasi */}
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
                      {/* Nama Pasien, Usia & Indikator Aktif */}
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
                            <span>Aktif</span>
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
                        Pasien Dari:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {adm.unit?.name || "VK IGD"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Status Pasien:{" "}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {isRanap ? "Rawat Inap (Ranap)" : "Rawat Jalan (Rajal)"}
                        </span>
                      </div>

                      {/* Badge Hasil Skrining */}
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        {hasScreening ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                                riskTier === "HIGH"
                                  ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
                                  : riskTier === "MODERATE"
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200"
                                  : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                              }`}
                            >
                              RISIKO {riskTier === "HIGH" ? "TINGGI" : riskTier === "MODERATE" ? "MEDIUM" : "RENDAH"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(scrResult.calculated_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Belum diskrining kunjungan ini
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Pagination Kolom Kiri */}
        <div className="p-3 border-t border-blue-100 dark:border-blue-900/60 bg-blue-50/30 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Hal {currentPage}/{totalPages} • Total {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 text-[11px]"
            >
              &lt; Prev
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 text-[11px]"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KOLOM KANAN: WORKSPACE SKRINING KLINIS UTAMA (PERSIS SEPERTI GAMBAR USER)
         ========================================================================= */}
      <div className="flex-1 w-full space-y-5">
        {/* Banner Alert Sukses / Error */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <div className="flex items-center gap-3">
              {activeInstrument === "PE" && isPeScreeningCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setActiveInstrument("HPP");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 active:scale-95"
                >
                  <span>Lanjut Skrining HPP &rarr;</span>
                </button>
              )}
              {onNavigateRpp && (
                <button
                  type="button"
                  onClick={onNavigateRpp}
                  className="font-bold underline text-blue-700 dark:text-blue-400 hover:text-blue-900"
                >
                  Buka Menu RPP &rarr;
                </button>
              )}
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 1. Header Pasien Terpilih & Tombol Aksi Rawat */}
        {currentAdmission ? (
          <>
            <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                  {currentAdmission.patient?.full_name?.charAt(0).toUpperCase() || "P"}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      {currentAdmission.patient?.full_name || "NAMA PASIEN"}
                    </h2>
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      RM {currentAdmission.patient?.mrn || "-"}
                    </span>
                    {currentAdmission.status === "ACTIVE" ? (
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ADMISI AKTIF
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        STATUS: {currentAdmission.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {currentAdmission.patient?.age_years || "-"} Th (
                      {currentAdmission.patient?.tanggal_lahir || "-"})
                    </span>
                    <span>•</span>
                    <span>
                      Status:{" "}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {currentAdmission.jenis_admisi === "ADM_INPARTU" ||
                        currentAdmission.jenis_admisi === "RUJUKAN_EMERGENSI"
                          ? "Rawat Inap (Ranap)"
                          : "Rawat Jalan (Rajal)"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Pasien Dari:{" "}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {currentAdmission.unit?.name || "VK IGD"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dua Tombol Aksi di Kanan Atas: Ubah Status Rawat & Selesai / Pulang */}
              <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
                  <span>Ubah Status Rawat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-white" />
                  <span>Selesai / Pulang</span>
                </button>
              </div>
            </div>

            {/* Instrument Switcher Tabs */}
            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                INSTRUMEN:
              </span>

              {/* TAHAP 1: SKRINING RISIKO PE (WAJIB PERTAMA) */}
              <button
                type="button"
                onClick={() => setActiveInstrument("PE")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                  activeInstrument === "PE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                <span>Tahap 1: Skrining Risiko PE</span>
                {isPeScreeningCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
                    <Check className="h-3 w-3 text-emerald-600" />
                    Selesai
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300">
                    Wajib Dahulu
                  </span>
                )}
              </button>

              {/* TAHAP 2: SKRINING RISIKO HPP (TERKUNCI SEBELUM SKRINING PE SELESAI) */}
              <button
                type="button"
                onClick={() => {
                  if (!isPeScreeningCompleted) {
                    setErrorMessage(
                      "Skrining Risiko HPP terkunci! Selesaikan dan simpan Skrining Risiko PE (Preeklamsia) terlebih dahulu untuk mengidentifikasi tingkat risiko maternal dan kontraindikasi klinis pasien."
                    );
                    return;
                  }
                  setActiveInstrument("HPP");
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                  !isPeScreeningCompleted
                    ? "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-dashed border-amber-300 dark:border-amber-700/60 cursor-not-allowed"
                    : activeInstrument === "HPP"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={
                  !isPeScreeningCompleted
                    ? "Terkunci: Skrining Risiko PE harus diselesaikan dan disimpan terlebih dahulu."
                    : "Buka Skrining Risiko HPP"
                }
              >
                {!isPeScreeningCompleted ? (
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Droplets className="h-3.5 w-3.5" />
                )}
                <span>Tahap 2: Skrining Risiko HPP</span>
                {!isPeScreeningCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                    <Lock className="h-3 w-3" />
                    Terkunci
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
                    <Unlock className="h-3 w-3 text-emerald-600" />
                    Terbuka
                  </span>
                )}
              </button>
            </div>

            {/* Workflow Alur Skrining Banner */}
            {!isPeScreeningCompleted ? (
              <div className="rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-black text-amber-900 dark:text-amber-100 flex items-center gap-2">
                      <span>Alur Skrining Klinis: Tahap 1 Wajib (Skrining Risiko PE)</span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                        HPP Terkunci
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Selesaikan dan simpan <strong>Skrining Risiko PE</strong> di bawah ini terlebih dahulu. Berdasarkan pedoman klinis (Tabel 2 &amp; 3), diagnosis Preeklamsia menjadi penentu utama risiko HPP dan memicu kontraindikasi mutlak Metilergometrin.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-black text-emerald-900 dark:text-emerald-100">
                      Skrining Risiko PE Selesai (Kategori: {currentAdmission?.latest_pe_result?.category || "TEREVALUASI"})
                    </span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Skrining Risiko HPP telah terbuka dan siap diisi.
                    </p>
                  </div>
                </div>
                {activeInstrument === "PE" && (
                  <button
                    type="button"
                    onClick={() => setActiveInstrument("HPP")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all shrink-0 active:scale-95"
                  >
                    <span>Lanjut ke Skrining Risiko HPP &rarr;</span>
                  </button>
                )}
              </div>
            )}
          </div>

        {/* 2. Section 1: Pengkajian Faktor Risiko (Pedoman RISE / POGI / 4T) */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Pengkajian Faktor Risiko ({activeInstrument === "HPP" ? "Pedoman RISE / 4T" : "Pedoman POGI & InaSH (Preeklamsia)"})
              </h3>
            </div>
          </div>

          {/* Subheader Faktor Risiko: Count badges & filter pills */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-slate-800/40 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldAlert className="h-4 w-4 text-blue-600" />
                <span>FAKTOR RISIKO ({totalFactorsCount} BUTIR)</span>
              </div>
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">
                {unselectedCount} Belum Dipilih
              </span>
              <span className="rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 text-[11px] font-medium">
                {answeredCount}/{totalFactorsCount} butir ditinjau
              </span>
            </div>

            {/* Filter Pills TINGGI / MEDIUM / RENDAH */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRiskFilter("SEMUA")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "SEMUA"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("TINGGI")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "TINGGI"
                    ? "bg-rose-600 text-white"
                    : "bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900"
                }`}
              >
                TINGGI
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("MEDIUM")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "MEDIUM"
                    ? "bg-amber-600 text-white"
                    : "bg-white dark:bg-slate-800 text-amber-600 border border-amber-200 dark:border-amber-900"
                }`}
              >
                MEDIUM
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("RENDAH")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "RENDAH"
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-200 dark:border-emerald-900"
                }`}
              >
                RENDAH
              </button>
            </div>
          </div>

          {/* Accordion 7 Kategori Pengkajian Risiko */}
          <div className="space-y-2.5">
            {RISK_CATEGORIES.map((cat) => {
              const allItemsInCat = categorizedFactors[cat.id] || [];
              const filteredItems = allItemsInCat.filter((item) => {
                if (riskFilter === "SEMUA") return true;
                if (riskFilter === "TINGGI") return item.risk_tier === "HIGH" || item.risk_tier === "CRITICAL_IMMEDIATE";
                if (riskFilter === "MEDIUM") return item.risk_tier === "MODERATE";
                if (riskFilter === "RENDAH") return (item.risk_tier as string) === "LOW";
                return true;
              });

              if (allItemsInCat.length === 0) return null;

              const isExpanded = !!expandedCategories[cat.id];
              const unselectedInCat = allItemsInCat.filter(
                (item) => responses[item.risk_factor_id] !== "YA" && responses[item.risk_factor_id] !== "TIDAK"
              ).length;

              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl ${cat.cardBorder} bg-white dark:bg-[#0c183a] overflow-hidden transition-all shadow-xs`}
                >
                  {/* Baris Accordion Header dengan Warna Lembut-Sedang (Level 200–250) */}
                  <div
                    onClick={() =>
                      setExpandedCategories((prev) => ({
                        ...prev,
                        [cat.id]: !prev[cat.id],
                      }))
                    }
                    className={`p-3.5 ${cat.headerGradient} cursor-pointer flex items-center justify-between transition-all select-none hover:opacity-95`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-lg ${cat.iconStyle} flex items-center justify-center shrink-0 shadow-2xs`}>
                        {React.createElement(cat.icon, { className: "h-4 w-4" })}
                      </div>
                      <span className="font-black text-xs tracking-wider uppercase">
                        {cat.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-bold ${cat.badgeStyle} px-2.5 py-0.5 rounded-full shadow-2xs`}>
                        {allItemsInCat.length} butir
                      </span>
                      {unselectedInCat > 0 ? (
                        <span className="rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950 px-2.5 py-0.5 text-[10px] font-black shadow-xs">
                          {unselectedInCat} belum diisi
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950 px-2.5 py-0.5 text-[10px] font-black shadow-xs flex items-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" />
                          Lengkap
                        </span>
                      )}
                      <div className={`p-1 rounded-md ${cat.chevronStyle}`}>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Isi Kategori (Daftar Butir Faktor Risiko yang dimasukkan lebih ke dalam / Indented) */}
                  {isExpanded && (
                    <div className={`pl-6 sm:pl-10 pr-4 sm:pr-6 py-2 divide-y divide-slate-100 dark:divide-slate-800/80 ${cat.indentLine} ml-4 sm:ml-6 mr-3 my-2.5 rounded-r-2xl`}>
                      {filteredItems.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          Tidak ada faktor yang cocok dengan filter {riskFilter}.
                        </div>
                      ) : (
                        filteredItems.map((item) => {
                          const currentVal = responses[item.risk_factor_id] || "TIDAK";
                          const isHigh = item.risk_tier === "HIGH" || item.risk_tier === "CRITICAL_IMMEDIATE";
                          const isMed = item.risk_tier === "MODERATE";

                          return (
                            <div
                              key={item.risk_factor_id}
                              className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 max-w-xl">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                                      isHigh
                                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200"
                                        : isMed
                                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200"
                                        : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                                    }`}
                                  >
                                    {isHigh ? "TINGGI" : isMed ? "MEDIUM" : "RENDAH"}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {item.label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-3.5">
                                  {item.definition || item.clinical_rationale}
                                </p>
                              </div>

                              {/* 5-State / Fast Toggle Selector */}
                              <div className="flex items-center gap-1 self-start md:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSelectResponse(item.risk_factor_id, "YA")}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentVal === "YA"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  YA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectResponse(item.risk_factor_id, "TIDAK")}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentVal === "TIDAK"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  TIDAK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectResponse(item.risk_factor_id, "BELUM_DIPERIKSA")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                    currentVal === "BELUM_DIPERIKSA"
                                      ? "bg-amber-500 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                                  }`}
                                  title="Belum Diperiksa (FR-09: Data kosong != negatif)"
                                >
                                  Belum Cek
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BANNER PERINGATAN KRITIS & PROTOKOL RESPON CEPAT (SESUAI TABEL 2 & 3) */}
        {/* 1. Alert Kontraindikasi Mutlak Metilergometrin */}
        {(isPatientPeHigh || (activeInstrument === "PE" && calculatedRisk === "HIGH")) && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/60 p-4 shadow-sm flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-rose-700 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                  Peringatan Kritis PONEK
                </span>
                <h4 className="text-sm font-black text-rose-950 dark:text-rose-100">
                  KONTRAINDIKASI MUTLAK METILERGOMETRIN (ERGOMETRIN)
                </h4>
              </div>
              <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-relaxed">
                Pasien terindikasi Hipertensi / Preeklamsia. Pemberian uterotonika golongan alkaloid ergot (Metilergometrin / Ergometrin) <strong>DILARANG KERAS</strong> karena memicu vasokonstriksi sistemik akut, krisis hipertensi maligna, dan stroke hemoragik (InaSH & POGI 2025; WHO 2025).
              </p>
              <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span>&bull; Pilihan Uterotonika Aman: Oksitosin 10–20 IU drip, Karbetosin 100 &mu;g, atau Misoprostol 400–600 &mu;g.</span>
                <span>&bull; Resusitasi cairan kristaloid IV harus dibatasi ketat untuk mencegah edema paru akut.</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Timer Respons Cepat 30-60 Menit (PE Berat) */}
        {activeInstrument === "PE" && calculatedRisk === "HIGH" && (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 p-4 shadow-sm flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs text-amber-950 dark:text-amber-100">
              <div className="flex items-center gap-2">
                <span className="font-black uppercase tracking-wider text-[10px] bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded text-amber-900 dark:text-amber-100">
                  Timer Kegawatdaruratan Hipertensi 30–60 Menit
                </span>
                <span className="font-black text-rose-700 dark:text-rose-400">Target TD &lt; 140/90 mmHg</span>
              </div>
              <p className="font-bold">
                Antihipertensi kerja cepat (Nifedipin oral 10 mg / Labetalol IV / Hidralazin IV) wajib diberikan dalam 30–60 menit sejak terkonfirmasi TD &ge; 160/110 mmHg.
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Pemberian Magnesium Sulfat (MgSO4 40% loading dose 4g IV pelan dalam 5-10 menit, lanjut 1g/jam) sebagai lini pertama pencegahan kejang. Pantau refleks patela (+), frekuensi napas &ge; 16x/menit, dan urin &ge; 30 mL/jam. Batas aman diastolik tidak boleh di bawah 80 mmHg.
              </p>
            </div>
          </div>
        )}

        {/* 3. Paket Respons Simultan E-MOTIVE (<15 Menit) untuk HPP Risiko Tinggi */}
        {activeInstrument === "HPP" && calculatedRisk === "HIGH" && (
          <div className="rounded-2xl border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 p-4 shadow-sm flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-100">
              <div className="flex items-center gap-2">
                <span className="font-black uppercase tracking-wider text-[10px] bg-indigo-200 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-900 dark:text-indigo-100">
                  Paket Respons Pertama E-MOTIVE (WHO Consolidated Guidelines 2023–2025)
                </span>
                <span className="font-bold text-indigo-800 dark:text-indigo-300">Respons Simultan &lt; 15 Menit</span>
              </div>
              <p className="font-bold">
                Diterapkan secara serentak (bukan bertahap) dalam 15 menit pertama bila perdarahan &ge; 500 mL atau muncul tanda ketidakstabilan hemodinamik:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 pt-1">
                <div>&bull; <strong>(E) Early Detection:</strong> Pengukuran darah objektif dengan calibrated drape</div>
                <div>&bull; <strong>(M) Uterine Massage:</strong> Masase fundus uteri secara kontinu</div>
                <div>&bull; <strong>(O) Oxytocic Drugs:</strong> Oksitosin 10–20 IU drip cepat (atau Karbetosin)</div>
                <div>&bull; <strong>(T) Tranexamic Acid:</strong> Asam Traneksamat 1 g IV (diberikan &le; 3 jam)</div>
                <div>&bull; <strong>(IV) IV Fluids:</strong> Kristaloid hangat &amp; periksa plasenta/laserasi jalan lahir</div>
                <div>&bull; <strong>(E) Escalation:</strong> Eskalasi segera ke tamponade balon uterus &amp; tim PONEK</div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Section 2: Bundle SOP Tindakan Nakes (Sesuai Tingkat Risiko) */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Bundle SOP Tindakan Nakes (Sesuai Tingkat Risiko)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Pelaksanaan:</span>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 px-3 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                {executedCount} dari {bundleItems.length} Dilaksanakan
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-slate-800/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bundle Checklist SOP Tindakan Klinis:
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  calculatedRisk === "HIGH"
                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200"
                    : calculatedRisk === "MODERATE"
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                }`}
              >
                KATEGORI {calculatedRisk === "HIGH" ? "TINGGI" : calculatedRisk === "MODERATE" ? "MEDIUM" : "RENDAH"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Centang tindakan yang telah selesai dilaksanakan oleh tim nakes di VK. Waktu pelaksanaan akan terekam otomatis di audit trail.
            </p>
          </div>

          {/* Checklist Tindakan Klinis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bundleItems.map((item) => {
              const isChecked = !!bundleChecked[item.id]?.done;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                    setBundleChecked((prev) => ({
                      ...prev,
                      [item.id]: { done: !isChecked, time: !isChecked ? now : undefined },
                    }));
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isChecked
                      ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    }`}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{item.title}</span>
                      {bundleChecked[item.id]?.time && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          ({bundleChecked[item.id]?.time})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Bottom Sticky Footer (Persis Gambar: Reset Isian, Status Risiko, SIMPAN REKAM MEDIS) */}
        <div className="sticky bottom-4 z-20 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Isian</span>
          </button>

          {/* Status Risiko Dinamis Real-Time */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-500 font-medium">Risiko:</span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide uppercase ${
                calculatedRisk === "HIGH"
                  ? "bg-rose-600 text-white shadow-xs"
                  : calculatedRisk === "MODERATE"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-emerald-600 text-white shadow-xs"
              }`}
            >
              {calculatedRisk === "HIGH" ? "TINGGI" : calculatedRisk === "MODERATE" ? "MEDIUM" : "RENDAH"}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {activeFactorsCount} faktor terpenuhi
            </span>
            {unselectedCount > 0 && (
              <span className="rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[11px] font-bold">
                {unselectedCount} belum dipilih
              </span>
            )}
          </div>

          {/* Tombol Simpan Rekam Medis (Royal Blue dengan Animasi Proses & Spinner) */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveMedicalRecord}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all ${
              isSubmitting
                ? "bg-blue-700 opacity-90 cursor-wait shadow-blue-500/20 scale-[0.99] ring-2 ring-blue-300/60"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-600/20 cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Menyimpan ke Rekam Medis...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>SIMPAN REKAM MEDIS</span>
              </>
            )}
          </button>
        </div>
      </>
    ) : (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4 shadow-sm">
        <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            Tidak Ada Pasien Aktif di Antrean Skrining
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Semua pasien telah selesai/pulang dan seluruh berkasnya tersimpan di menu <strong>Ringkasan Pasien</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onNavigateRpp && (
            <button
              type="button"
              onClick={onNavigateRpp}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Buka Ringkasan Pasien</span>
            </button>
          )}
          {onNavigateAdmission && (
            <button
              type="button"
              onClick={() => onNavigateAdmission("")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              <span>+ Input Admisi Baru</span>
            </button>
          )}
        </div>
      </div>
    )}
      </div>

      {/* =========================================================================
          MODAL: UBAH STATUS RAWAT & UNIT
         ========================================================================= */}
      {showStatusModal && currentAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                Ubah Status Rawat & Unit Pasien
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pasien & Kode Admisi:
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                  {currentAdmission.patient?.full_name} ({currentAdmission.admission_code})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pindahkan ke Unit / Ruangan:
                </label>
                <select
                  value={targetUnitId}
                  onChange={(e) => setTargetUnitId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 font-medium"
                >
                  {db.units.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      [{u.code}] {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateUnitStatus}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SELESAI / PULANG PASIEN (DISCHARGE)
         ========================================================================= */}
      {showDischargeModal && currentAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 text-rose-600">
                <CheckCheck className="h-4 w-4" />
                Konfirmasi Pasien Selesai / Pulang
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Tindakan ini akan <strong>menutup episode rawat</strong> untuk pasien{" "}
                <strong className="text-slate-900 dark:text-slate-100">{currentAdmission.patient?.full_name}</strong> (RM: {currentAdmission.patient?.mrn}), merekam jam kepulangan, dan membebaskan kapasitas unit.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan / Resume Pulang (*Discharge Summary*):
                </label>
                <textarea
                  rows={3}
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  placeholder="Kondisi ibu & bayi stabil, terapi pascapersalinan selesai, kontrol Poli Kebidanan 1 minggu lagi..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDischargePatient}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs"
              >
                ✓ Ya, Pulangkan Pasien
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          FLOATING TOAST NOTIFICATION (MUNCUL OTOMATIS SETELAH SELESAI SIMPAN)
         ========================================================================= */}
      {toast?.show && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-full bg-white dark:bg-slate-900 border-2 border-emerald-500 text-slate-900 dark:text-slate-100 shadow-[0_12px_40px_rgba(16,185,129,0.3)] rounded-2xl p-4 flex items-start gap-3.5 transition-all animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs border border-emerald-300 dark:border-emerald-800">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
            ) : (
              <AlertTriangle className="h-6 w-6 stroke-[2.5] text-rose-500" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                {toast.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold uppercase tracking-wide border border-emerald-300 dark:border-emerald-800">
                Tersimpan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

