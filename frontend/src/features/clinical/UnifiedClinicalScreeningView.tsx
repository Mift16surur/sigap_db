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
  Gauge,
  TestTube,
  AlertOctagon,
  History,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { apiRequest, EnrichedAdmission } from "@/services/api-client";
import {
  DEFAULT_ACTION_CHECKLIST_MASTERS,
  DEFAULT_CLINICAL_SCREENING_CRITERIA,
} from "@/types";
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
  ScreeningDomainId,
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

// Struktur 4 DOMAIN Pengkajian Skrining Klinis SIGAP Sesuai Format Permintaan:
// 1. DOMAIN MATERNAL (Kondisi & Riwayat Ibu)
// 2. DOMAIN OBSTETRI (Proses, Tindakan & Riwayat Persalinan)
// 3. DOMAIN JANIN (Kondisi & Jumlah Janin)
// 4. DOMAIN KOMBINASI RISIKO
export interface ScreeningDomainItem {
  id: string;
  label: string;
  riskTier: "LOW" | "MODERATE" | "HIGH";
}

export interface ScreeningDomainGroup {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  icon: any;
  headerGradient: string;
  cardBorder: string;
  iconStyle: string;
  badgeStyle: string;
  chevronStyle: string;
  items: ScreeningDomainItem[];
}

export const CLINICAL_SCREENING_DOMAINS: ScreeningDomainGroup[] = [
  {
    id: "DOMAIN_MATERNAL",
    name: "MATERNAL",
    title: "1. DOMAIN MATERNAL (Kondisi & Riwayat Ibu)",
    subtitle: "Evaluasi tekanan darah, gejala pemberatan, proteinuria, hematologi & komplikasi maternal",
    icon: HeartPulse,
    headerGradient: "bg-gradient-to-r from-rose-100 via-rose-100/90 to-pink-100/80 dark:from-rose-950/70 dark:via-rose-900/60 dark:to-pink-950/50 text-rose-950 dark:text-rose-100 border-b-2 border-rose-300 dark:border-rose-800",
    cardBorder: "border-2 border-rose-300/90 dark:border-rose-800 shadow-[0_2px_12px_rgba(244,63,94,0.06)]",
    iconStyle: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-300/80 dark:border-rose-700",
    badgeStyle: "bg-white/90 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700",
    chevronStyle: "text-rose-800 dark:text-rose-200 bg-white/70 dark:bg-rose-900/50",
    items: [
      // RISIKO RENDAH
      { id: "mat_low_normal", label: "Tekanan darah normal (< 140/90 mmHg) & kadar Hb >= 11 g/dL", riskTier: "LOW" },
      { id: "mat_low_no_symptoms_risk", label: "Tanpa gejala subjektif pemberatan, proteinuria, maupun riwayat risiko tinggi", riskTier: "LOW" },

      // RISIKO SEDANG
      { id: "mat_mod_bp", label: "Tekanan darah 140–159 / 90–109 mmHg (pada 1 kali pengukuran)", riskTier: "MODERATE" },
      { id: "mat_mod_proteinuria", label: "Protein urin positif (dipstik >= +1 atau uPCR >= 0,3)", riskTier: "MODERATE" },
      { id: "mat_mod_anemia", label: "Anemia ringan–sedang (Hb 7–10,9 g/dL)", riskTier: "MODERATE" },
      { id: "mat_mod_obesity_multipara", label: "Obesitas atau Grandemultipara", riskTier: "MODERATE" },
      { id: "mat_mod_pe_mild", label: "Preeklamsia tanpa tanda berat", riskTier: "MODERATE" },

      // RISIKO TINGGI
      { id: "mat_high_bp", label: "Tekanan darah >= 160/110 mmHg (menetap >= 15 menit)", riskTier: "HIGH" },
      { id: "mat_high_severe_symptoms", label: "Terdapat tanda pemberatan (nyeri kepala hebat, gangguan penglihatan, nyeri epigastrium, edema paru)", riskTier: "HIGH" },
      { id: "mat_high_eclampsia", label: "Terjadi kejang (eklamsia)", riskTier: "HIGH" },
      { id: "mat_high_lab_abnormal", label: "Hasil lab abnormal (trombosit < 100.000/uL, enzim transaminase >= 2x normal, atau kreatinin > 1,1 mg/dL)", riskTier: "HIGH" },
      { id: "mat_high_severe_anemia", label: "Anemia berat (Hb < 7 g/dL)", riskTier: "HIGH" },
      { id: "mat_high_prev_hpp_bleeding", label: "Riwayat HPP sebelumnya atau perdarahan antepartum aktif", riskTier: "HIGH" },
      { id: "mat_high_severe_pe_hellp", label: "Preeklamsia berat atau sindrom HELLP", riskTier: "HIGH" },
    ],
  },
  {
    id: "DOMAIN_OBSTETRI",
    name: "OBSTETRI",
    title: "2. DOMAIN OBSTETRI (Proses, Tindakan & Riwayat Persalinan)",
    subtitle: "Evaluasi riwayat persalinan sesarea, induksi / partus memanjang & spektrum plasenta akreta",
    icon: Stethoscope,
    headerGradient: "bg-gradient-to-r from-blue-100 via-blue-100/90 to-indigo-100/80 dark:from-blue-950/70 dark:via-blue-900/60 dark:to-indigo-950/50 text-blue-950 dark:text-blue-100 border-b-2 border-blue-300 dark:border-blue-800",
    cardBorder: "border-2 border-blue-300/90 dark:border-blue-800 shadow-[0_2px_12px_rgba(37,99,235,0.06)]",
    iconStyle: "bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-300/80 dark:border-blue-700",
    badgeStyle: "bg-white/90 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700",
    chevronStyle: "text-blue-800 dark:text-blue-200 bg-white/70 dark:bg-blue-900/50",
    items: [
      // RISIKO RENDAH
      { id: "obs_low_normal", label: "Tidak ada faktor risiko obstetri / HPP saat admisi", riskTier: "LOW" },

      // RISIKO SEDANG
      { id: "obs_mod_induction", label: "Induksi atau augmentasi persalinan", riskTier: "MODERATE" },
      { id: "obs_mod_prev_sc", label: "Riwayat seksio sesarea 1x", riskTier: "MODERATE" },

      // RISIKO TINGGI
      { id: "obs_high_placenta_previa", label: "Plasenta previa atau spektrum akreta", riskTier: "HIGH" },
    ],
  },
  {
    id: "DOMAIN_JANIN",
    name: "JANIN",
    title: "3. DOMAIN JANIN (Kondisi & Jumlah Janin)",
    subtitle: "Evaluasi kehamilan tunggal vs ganda, taksiran berat janin (makrosomia) & volume ketuban",
    icon: Activity,
    headerGradient: "bg-gradient-to-r from-purple-100 via-purple-100/90 to-violet-100/80 dark:from-purple-950/70 dark:via-purple-900/60 dark:to-violet-950/50 text-purple-950 dark:text-purple-100 border-b-2 border-purple-300 dark:border-purple-800",
    cardBorder: "border-2 border-purple-300/90 dark:border-purple-800 shadow-[0_2px_12px_rgba(147,51,234,0.06)]",
    iconStyle: "bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-300/80 dark:border-purple-700",
    badgeStyle: "bg-white/90 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700",
    chevronStyle: "text-purple-800 dark:text-purple-200 bg-white/70 dark:bg-purple-900/50",
    items: [
      // RISIKO RENDAH
      { id: "fet_low_singleton", label: "Kehamilan tunggal normal", riskTier: "LOW" },

      // RISIKO SEDANG
      { id: "fet_mod_macrosomia_poly", label: "Makrosomia atau Polihidramnion", riskTier: "MODERATE" },

      // RISIKO TINGGI
      { id: "fet_high_multiple", label: "Kehamilan ganda (gemeli / multipel)", riskTier: "HIGH" },
    ],
  },
  {
    id: "DOMAIN_KOMBINASI",
    name: "KOMBINASI RISIKO",
    title: "4. DOMAIN KOMBINASI RISIKO",
    subtitle: "Evaluasi penggabungan faktor risiko maternal, obstetri, janin & ambang eskalasi klinis",
    icon: ShieldAlert,
    headerGradient: "bg-gradient-to-r from-amber-100 via-amber-100/90 to-orange-100/80 dark:from-amber-950/70 dark:via-amber-900/60 dark:to-orange-950/50 text-amber-950 dark:text-amber-100 border-b-2 border-amber-300 dark:border-amber-800",
    cardBorder: "border-2 border-amber-300/90 dark:border-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.06)]",
    iconStyle: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700",
    badgeStyle: "bg-white/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700",
    chevronStyle: "text-amber-800 dark:text-amber-200 bg-white/70 dark:bg-amber-900/50",
    items: [
      // RISIKO SEDANG
      { id: "comb_mod_threshold", label: "Terdapat >= 1 faktor risiko tinggi ATAU >= 2 faktor risiko sedang tanpa tanda pemberatan", riskTier: "MODERATE" },

      // RISIKO TINGGI
      { id: "comb_high_severe_combo", label: "Kombinasi komplikasi berat (misal: preeklamsia berat disertai gangguan lab/tanda pemberatan atau skor kumulatif risiko tinggi ganda)", riskTier: "HIGH" },
    ],
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

  // Status Apakah Skrining HPP Pasien Ini Sudah Selesai Dibuat/Dievaluasi
  const isHppScreeningCompleted = useMemo(() => {
    if (!currentAdmission) return false;
    return Boolean(
      currentAdmission.latest_hpp_result?.category ||
      (currentAdmission.hpp_screening && currentAdmission.hpp_screening.status === "COMPLETED")
    );
  }, [currentAdmission]);

  // Alur Klinis Wajib: Bila pasien belum menyelesaikan Skrining PE, tab HPP otomatis terkunci dan kembali ke PE
  useEffect(() => {
    if (!isPeScreeningCompleted && activeInstrument === "HPP") {
      setActiveInstrument("PE");
    }
  }, [selectedAdmId, isPeScreeningCompleted, activeInstrument]);

  // State Panel Samping Riwayat Skrining Pasien (Kolom Kanan) - Default Tertutup
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [viewingHistoryAdm, setViewingHistoryAdm] = useState<any | null>(null);

  // Riwayat Kunjungan / Skrining Pasien Terpilih (Longitudinal History)
  const patientHistoryRecords = useMemo(() => {
    if (!currentAdmission?.patient_id) return [];
    return enrichedAdmissions
      .filter((adm) => adm.patient_id === currentAdmission.patient_id)
      .sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime());
  }, [enrichedAdmissions, currentAdmission?.patient_id]);

  // 4. State Accordion Kategori & Filter Risiko (Section 1)
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({
    TIER_LOW: true,
    TIER_MODERATE: true,
    TIER_HIGH: true,
  });

  // State Accordion 4 Domain Skrining Klinis SIGAP (Maternal, Obstetri, Janin, Kombinasi Risiko)
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({
    DOMAIN_MATERNAL: true,
    DOMAIN_OBSTETRI: true,
    DOMAIN_JANIN: true,
    DOMAIN_KOMBINASI: true,
  });

  const toggleDomainExpand = (domainId: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  const [riskFilter, setRiskFilter] = useState<"SEMUA" | "RENDAH" | "SEDANG" | "TINGGI">("SEMUA");

  const handleSetRiskFilter = (filter: "SEMUA" | "RENDAH" | "SEDANG" | "TINGGI") => {
    setRiskFilter(filter);
    if (filter === "SEMUA") {
      setExpandedTiers({ TIER_LOW: true, TIER_MODERATE: true, TIER_HIGH: true });
    } else if (filter === "RENDAH") {
      setExpandedTiers({ TIER_LOW: true, TIER_MODERATE: false, TIER_HIGH: false });
    } else if (filter === "SEDANG") {
      setExpandedTiers({ TIER_LOW: false, TIER_MODERATE: true, TIER_HIGH: false });
    } else if (filter === "TINGGI") {
      setExpandedTiers({ TIER_LOW: false, TIER_MODERATE: false, TIER_HIGH: true });
    }
  };

  // Masters
  const hppMasters = useMemo(() => {
    return db.risk_factors.filter((r) => r.screening_pathway === "HPP" && r.active_status);
  }, [db]);

  const peMasters = useMemo(() => {
    return db.risk_factors.filter((r) => r.screening_pathway === "PE" && r.active_status);
  }, [db]);

  const currentMasters = activeInstrument === "HPP" ? hppMasters : peMasters;

  // Pemisahan Faktor Risiko Klinis Sesuai Tabel 1 & Tabel 2 Dokumen Template SIGAP
  const peModerateFactors = useMemo(() => {
    return peMasters.filter((m) => m.risk_tier === "MODERATE");
  }, [peMasters]);

  const peHighFactors = useMemo(() => {
    return peMasters.filter((m) => m.risk_tier === "HIGH" || m.risk_tier === "CRITICAL_IMMEDIATE");
  }, [peMasters]);

  const hppModerateFactors = useMemo(() => {
    return hppMasters.filter((m) => m.risk_tier === "MODERATE");
  }, [hppMasters]);

  const hppHighFactors = useMemo(() => {
    return hppMasters.filter((m) => m.risk_tier === "HIGH" || m.risk_tier === "CRITICAL_IMMEDIATE");
  }, [hppMasters]);

  // 5. State Isian Skrining (Form Inputs)
  // State Spesifik: Pengukuran Tekanan Darah (Dua Kali Pengukuran)
  const [bp1Systolic, setBp1Systolic] = useState<string>("");
  const [bp1Diastolic, setBp1Diastolic] = useState<string>("");
  const [bp1HeartRate, setBp1HeartRate] = useState<string>("");
  const [bp2Systolic, setBp2Systolic] = useState<string>("");
  const [bp2Diastolic, setBp2Diastolic] = useState<string>("");
  const [bp2HeartRate, setBp2HeartRate] = useState<string>("");

  // State Spesifik: Protein Urin & 4 Gejala Pemberatan Utama
  const [proteinUrine, setProteinUrine] = useState<string>("NEGATIF");
  const [symptomHeadache, setSymptomHeadache] = useState<boolean>(false);
  const [symptomVision, setSymptomVision] = useState<boolean>(false);
  const [symptomEpigastric, setSymptomEpigastric] = useState<boolean>(false);
  const [symptomDyspnea, setSymptomDyspnea] = useState<boolean>(false);

  // State Spesifik HPP: Kadar Hb & Riwayat HPP
  const [labHb, setLabHb] = useState<string>("");
  const [historyPrevHpp, setHistoryPrevHpp] = useState<boolean>(false);

  // State Spesifik Lab Organ
  const [labPlatelets, setLabPlatelets] = useState<string>("");
  const [labSgot, setLabSgot] = useState<string>("");
  const [labCreatinine, setLabCreatinine] = useState<string>("");

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
  const [showRescreenModal, setShowRescreenModal] = useState(false);
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

    // Isi nilai eksisting dari DB
    const bps = (db.bp_measurements || [])
      .filter((b) => b.admission_id === currentAdmission.admission_id)
      .sort((a, b) => a.sequence_number - b.sequence_number);
    if (bps[0]) {
      setBp1Systolic(String(bps[0].systolic));
      setBp1Diastolic(String(bps[0].diastolic));
      setBp1HeartRate(bps[0].heart_rate ? String(bps[0].heart_rate) : "");
    } else {
      setBp1Systolic("");
      setBp1Diastolic("");
      setBp1HeartRate("");
    }
    if (bps[1]) {
      setBp2Systolic(String(bps[1].systolic));
      setBp2Diastolic(String(bps[1].diastolic));
      setBp2HeartRate(bps[1].heart_rate ? String(bps[1].heart_rate) : "");
    } else {
      setBp2Systolic("");
      setBp2Diastolic("");
      setBp2HeartRate("");
    }

    const symptoms = (db.pe_symptoms || []).filter(
      (s) => s.pe_screening_id === currentAdmission.pe_screening?.pe_screening_id
    );
    setSymptomHeadache(symptoms.some((s) => s.symptom_code.includes("HEADACHE") && s.response === "YA"));
    setSymptomVision(symptoms.some((s) => s.symptom_code.includes("VISION") && s.response === "YA"));
    setSymptomEpigastric(symptoms.some((s) => s.symptom_code.includes("EPIGASTRIC") && s.response === "YA"));
    setSymptomDyspnea(
      symptoms.some((s) => (s.symptom_code.includes("DYSPNEA") || s.symptom_code.includes("EDEMA")) && s.response === "YA") ||
      currentAdmission.pe_screening?.edema_paru_sesak_berat === "YA"
    );

    const labs = (db.lab_results || []).filter((l) => l.admission_id === currentAdmission.admission_id);
    const protLab = labs.find((l) => l.test_code.includes("PROTEIN") || l.test_name.toLowerCase().includes("protein"));
    setProteinUrine(protLab?.value_text || (protLab?.value_numeric ? `+${protLab.value_numeric}` : "NEGATIF"));

    const hbLab = labs.find((l) => l.test_code.includes("HB") || l.test_name.toLowerCase().includes("hemoglobin"));
    setLabHb(hbLab?.value_numeric ? String(hbLab.value_numeric) : hbLab?.value_text?.replace(/[^0-9.]/g, "") || "");

    const pltLab = labs.find((l) => l.test_code.includes("PLATELET") || l.test_name.toLowerCase().includes("trombosit"));
    setLabPlatelets(pltLab?.value_numeric ? String(pltLab.value_numeric) : "");

    const sgotLab = labs.find((l) => l.test_code.includes("SGOT") || l.test_code.includes("AST") || l.test_name.toLowerCase().includes("sgot"));
    setLabSgot(sgotLab?.value_numeric ? String(sgotLab.value_numeric) : "");

    const creatLab = labs.find((l) => l.test_code.includes("CREATININE") || l.test_name.toLowerCase().includes("kreatinin"));
    setLabCreatinine(creatLab?.value_numeric ? String(creatLab.value_numeric) : "");

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

  // Dynamic Screening Domains loaded from Master Data, filtered by activeInstrument and active status
  const activeScreeningDomains: ScreeningDomainGroup[] = useMemo(() => {
    const rawList =
      db.master_catalog?.clinical_screening_criteria &&
      db.master_catalog.clinical_screening_criteria.length > 0
        ? db.master_catalog.clinical_screening_criteria
        : DEFAULT_CLINICAL_SCREENING_CRITERIA;

    const masterList = rawList.filter(
      (c) =>
        c.active_status &&
        (c.pathway === "ALL" || c.pathway === activeInstrument)
    );

    const domainKeys: ScreeningDomainId[] = [
      "DOMAIN_MATERNAL",
      "DOMAIN_OBSTETRI",
      "DOMAIN_JANIN",
      "DOMAIN_KOMBINASI",
    ];

    return domainKeys
      .map((domainId) => {
        const baseGroup = CLINICAL_SCREENING_DOMAINS.find((d) => d.id === domainId)!;
        const items = masterList
          .filter((c) => c.domain_id === domainId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((c) => ({
            id: c.criterion_id,
            label: c.label,
            riskTier: c.risk_tier,
          }));

        return {
          ...baseGroup,
          items,
        };
      })
      .filter((domain) => domain.items.length > 0);
  }, [db.master_catalog?.clinical_screening_criteria, activeInstrument]);

  // Hitung Aspek Ditinjau & Belum Dipilih Berdasarkan 4 Domain Klinis
  const allDomainItems = useMemo(() => {
    return activeScreeningDomains.flatMap((d) => d.items);
  }, [activeScreeningDomains]);

  const totalFactorsCount = allDomainItems.length;
  const answeredCount = useMemo(() => {
    return allDomainItems.filter((item) => {
      const resp = responses[item.id];
      return resp === "YA" || resp === "TIDAK";
    }).length;
  }, [allDomainItems, responses]);

  const unselectedCount = Math.max(0, totalFactorsCount - answeredCount);

  // Live Calculated Risk Category (Persis Kriteria Template Docx & Protokol)
  const calculatedRisk: RiskCategory = useMemo(() => {
    // 1. Evaluasi Berdasarkan Respon 4 Domain Klinis (Kriteria Master Dinamis)
    let domainHasHigh = false;
    let domainModCount = 0;

    activeScreeningDomains.forEach((domain) => {
      domain.items.forEach((item) => {
        const val = responses[item.id];
        if (val === "YA") {
          if (item.riskTier === "HIGH") domainHasHigh = true;
          else if (item.riskTier === "MODERATE") domainModCount++;
        }
      });
    });

    if (domainHasHigh) {
      return "HIGH";
    }
    if (domainModCount >= 1) {
      return "MODERATE";
    }

    if (activeInstrument === "PE") {
      const sbp1 = Number(bp1Systolic) || 0;
      const dbp1 = Number(bp1Diastolic) || 0;
      const sbp2 = Number(bp2Systolic) || 0;
      const dbp2 = Number(bp2Diastolic) || 0;
      const maxSbp = Math.max(sbp1, sbp2);
      const maxDbp = Math.max(dbp1, dbp2);

      // 1. Tanda Bahaya & Krisis Berat (HIGH / Risiko Berat) Sesuai Tabel 1 Template:
      // - Tekanan darah >= 160/110 mmHg (menetap >= 15 menit)
      // - Terdapat tanda pemberatan (sakit kepala hebat, gangguan penglihatan, nyeri ulu hati/epigastrium, sesak napas/edema paru)
      // - Kejang (eklamsia)
      // - Hasil lab abnormal (trombosit < 100.000/uL, transaminase >= 2x normal, kreatinin > 1.1 mg/dL)
      const isBpCrisis = maxSbp >= 160 || maxDbp >= 110;
      const hasSevereSymptoms = symptomHeadache || symptomVision || symptomEpigastric || symptomDyspnea;

      const plt = Number(labPlatelets) || 0;
      const sgot = Number(labSgot) || 0;
      const creat = Number(labCreatinine) || 0;
      const isLabSevere = (plt > 0 && plt < 100000) || sgot >= 70 || creat > 1.1;

      if (isBpCrisis || (maxSbp >= 140 && hasSevereSymptoms) || isLabSevere) {
        return "HIGH";
      }

      // 2. Kriteria Risiko Sedang (MODERATE / Risiko Sedang) Sesuai Tabel 1 Template:
      // - Tekanan darah 140–159 / 90–109 mmHg (pada 1 kali pengukuran)
      // - Protein urin positif (dipstik >= +1 atau uPCR >= 0.3)
      // - Terdapat >= 1 faktor risiko tinggi ATAU >= 2 faktor risiko sedang tanpa tanda pemberatan
      const isBpHypertension = maxSbp >= 140 || maxDbp >= 90;
      const hasProteinuria = ["POSITIF_1", "POSITIF_2", "POSITIF_3", "POSITIF_4", "+1", "+2", "+3", "+4", "UPCR_HIGH"].includes(proteinUrine);

      let highCount = 0;
      let modCount = 0;
      Object.entries(responses).forEach(([rfId, val]) => {
        if (val === "YA") {
          const m = peMasters.find((item) => item.risk_factor_id === rfId);
          if (m?.risk_tier === "HIGH" || m?.risk_tier === "CRITICAL_IMMEDIATE") highCount++;
          else if (m?.risk_tier === "MODERATE") modCount++;
        }
      });

      if (isBpHypertension || hasProteinuria || highCount >= 1 || modCount >= 2) {
        return "MODERATE";
      }

      // 3. Kriteria Risiko Rendah (LOW / Normal) Sesuai Tabel 1 Template:
      // - TD < 140/90 mmHg, tanpa keluhan, tanpa riwayat risiko tinggi, tanpa proteinuria
      return "LOW";
    } else {
      // INSTRUMEN HPP Sesuai Tabel 2 Template SIGAP
      // 1. Risiko Tinggi (HIGH / Merah):
      // - Riwayat HPP sebelumnya, plasenta previa/akreta, perdarahan aktif, gemeli, anemia berat (Hb < 7), trombositopenia, PE Berat
      const hb = parseFloat(labHb) || 0;
      const isSevereAnemia = hb > 0 && hb < 7.0;
      const isPeSevere =
        currentAdmission?.latest_pe_result?.category === "HIGH" &&
        (currentAdmission?.pe_screening?.edema_paru_sesak_berat === "YA" ||
         currentAdmission?.pe_screening?.kejang_eklamsia === "YA" ||
         Number(bp1Systolic) >= 160 ||
         Number(bp1Diastolic) >= 110);

      let hasHighHppFactor = false;
      let modHppCount = 0;
      Object.entries(responses).forEach(([rfId, val]) => {
        if (val === "YA") {
          const m = hppMasters.find((item) => item.risk_factor_id === rfId);
          if (m?.risk_tier === "CRITICAL_IMMEDIATE" || m?.risk_tier === "HIGH") hasHighHppFactor = true;
          else if (m?.risk_tier === "MODERATE") modHppCount++;
        }
      });

      if (historyPrevHpp || isSevereAnemia || isPeSevere || hasHighHppFactor) {
        return "HIGH";
      }

      // 2. Risiko Sedang (MODERATE / Kuning):
      // - Anemia ringan-sedang (Hb 7–10,9 g/dL), obesitas, makrosomia, polihidramnion, grandemultipara, induksi, riwayat SC 1x, PE ringan
      const isModerateAnemia = hb >= 7.0 && hb < 11.0;
      if (isModerateAnemia || modHppCount >= 1) {
        return "MODERATE";
      }

      // 3. Risiko Rendah (LOW / Hijau):
      // - Tidak ada faktor risiko HPP saat admisi, Hb >= 11 g/dL, kehamilan tunggal, TD normal
      return "LOW";
    }
  }, [
    activeScreeningDomains,
    responses,
    peMasters,
    hppMasters,
    activeInstrument,
    currentAdmission,
    bp1Systolic,
    bp1Diastolic,
    bp2Systolic,
    bp2Diastolic,
    proteinUrine,
    symptomHeadache,
    symptomVision,
    symptomEpigastric,
    symptomDyspnea,
    labPlatelets,
    labSgot,
    labCreatinine,
    labHb,
    historyPrevHpp,
  ]);

  // Deteksi Otomatis: Apakah pasien mengalami Preeklamsia Berat Aktif / Hipertensi Krisis (Tabel 2 Poin 12)
  const isPatientPeHigh = useMemo(() => {
    if (activeInstrument === "PE") {
      return calculatedRisk === "HIGH";
    }
    const sbp = Number(bp1Systolic) || 0;
    const dbp = Number(bp1Diastolic) || 0;
    return (
      sbp >= 160 ||
      dbp >= 110 ||
      (currentAdmission?.latest_pe_result?.category === "HIGH" &&
        (symptomHeadache || symptomVision || symptomEpigastric || symptomDyspnea))
    );
  }, [activeInstrument, calculatedRisk, bp1Systolic, bp1Diastolic, currentAdmission, symptomHeadache, symptomVision, symptomEpigastric, symptomDyspnea]);

  const activeFactorsCount = useMemo(() => {
    return Object.values(responses).filter((r) => r === "YA").length;
  }, [responses]);

  // Bundle Tindak Lanjut Klinis Dinamis Berbasis Master Data (Tabel 3 Proposal & SOP SIGAP)
  const masterBundles = useMemo(() => {
    const list = db.master_catalog?.action_checklist_masters;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    return DEFAULT_ACTION_CHECKLIST_MASTERS;
  }, [db.master_catalog?.action_checklist_masters]);

  const bundleItems = useMemo(() => {
    const filtered = masterBundles
      .filter(
        (b) =>
          b.pathway === activeInstrument &&
          b.risk_category === calculatedRisk &&
          b.active_status !== false
      )
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

    if (filtered.length > 0) {
      return filtered.map((b) => {
        let desc = b.description || b.label;
        // Penyesuaian cerdas klinis bila terdeteksi tensi tinggi / PE Berat
        if (b.code === "HPP_HIGH_UTEROTONIC_ALERT" && isPatientPeHigh) {
          desc = "KONTRAINDIKASI MUTLAK METILERGOMETRIN (pasien hipertensi/preeklamsia). Gunakan Oksitosin / Misoprostol / Karbetosin.";
        }
        return {
          id: b.checklist_id,
          title: b.label,
          desc,
          role: b.responsible_role,
        };
      });
    }

    return [];
  }, [masterBundles, activeInstrument, calculatedRisk, isPatientPeHigh]);

  const executedCount = Object.values(bundleChecked).filter((b) => b.done).length;

  // Handler: Tetapkan Jawaban Faktor Risiko (Eksplisit YA, TIDAK, atau BELUM_DIPERIKSA)
  const handleSelectResponse = (rfId: string, value: ClinicalItemResponse) => {
    setResponses((prev) => ({
      ...prev,
      [rfId]: value,
    }));
  };

  // Handler: Tetapkan Jawaban 4 Domain Klinis SIGAP (Maternal, Obstetri, Janin, Kombinasi Risiko)
  const handleToggleDomainItem = (itemId: string, value: ClinicalItemResponse) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: value,
    }));

    // Sinkronisasi otomatis ke parameter vital & lab CDSS bila pengguna mengonfirmasi respon "YA"
    if (itemId === "mat_low_normal" && value === "YA") {
      if (!bp1Systolic || Number(bp1Systolic) >= 140) setBp1Systolic("120");
      if (!bp1Diastolic || Number(bp1Diastolic) >= 90) setBp1Diastolic("80");
      setLabHb("12.0");
      setProteinUrine("NEGATIF");
      setSymptomHeadache(false);
      setSymptomVision(false);
      setSymptomEpigastric(false);
      setSymptomDyspnea(false);
    } else if (itemId === "mat_mod_bp" && value === "YA") {
      setBp1Systolic("145");
      setBp1Diastolic("95");
    } else if (itemId === "mat_high_bp" && value === "YA") {
      setBp1Systolic("165");
      setBp1Diastolic("110");
    }

    if (itemId === "mat_low_no_symptoms_risk" && value === "YA") {
      setSymptomHeadache(false);
      setSymptomVision(false);
      setSymptomEpigastric(false);
      setSymptomDyspnea(false);
      setProteinUrine("NEGATIF");
    } else if (itemId === "mat_high_severe_symptoms" && value === "YA") {
      setSymptomHeadache(true);
      setSymptomVision(true);
      setSymptomEpigastric(true);
      setSymptomDyspnea(true);
    }

    if (itemId === "mat_mod_proteinuria" && value === "YA") {
      setProteinUrine("POSITIF_1");
    }

    if (itemId === "mat_mod_anemia" && value === "YA") {
      setLabHb("9.5");
    } else if (itemId === "mat_high_severe_anemia" && value === "YA") {
      setLabHb("6.5");
    }

    if (itemId === "mat_high_prev_hpp_bleeding") {
      setHistoryPrevHpp(value === "YA");
    }
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

        const hppLabsPayload: Array<{
          test_code: LabTestCode;
          test_name: string;
          result_status: LabAvailabilityStatus;
          value_numeric?: number;
          value_text?: string;
          unit: string;
          reference_range: string;
        }> = [];
        if (labHb) {
          hppLabsPayload.push({
            test_code: "LAB_HB_HEMOGLOBIN" as LabTestCode,
            test_name: "Kadar Hemoglobin (Hb)",
            result_status: "TERSEDIA" as LabAvailabilityStatus,
            value_numeric: parseFloat(labHb),
            value_text: `${labHb} g/dL`,
            unit: "g/dL",
            reference_range: ">= 11.0 g/dL",
          });
        }

        const hppRiskDetails = formattedRiskDetails.map((rd) => {
          if (rd.risk_factor_code.includes("PREV_HPP") && historyPrevHpp) {
            return { ...rd, response: "YA" as ClinicalItemResponse };
          }
          if (rd.risk_factor_code.includes("MATERNAL_ANEMIA") && labHb && parseFloat(labHb) < 11.0) {
            return { ...rd, response: "YA" as ClinicalItemResponse };
          }
          return rd;
        });

        await apiRequest("/screening/hpp", {
          method: "POST",
          userId: currentUserId,
          body: {
            admission_id: currentAdmission.admission_id,
            perdarahan_aktif_saat_admisi: responses["HPP_ACTIVE_BLEED"] || "TIDAK",
            syok_hemodinamik_instabil: "TIDAK",
            rencana_metode_persalinan: "PERVAGINAM",
            clinical_notes: clinicalNotes || "Skrining HPP berdasarkan 4T, Hb Anemia & Riwayat HPP.",
            risk_details: hppRiskDetails,
            labs: hppLabsPayload,
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

        const bpPayload = [];
        if (bp1Systolic && bp1Diastolic) {
          bpPayload.push({
            systolic: Number(bp1Systolic),
            diastolic: Number(bp1Diastolic),
            heart_rate: bp1HeartRate ? Number(bp1HeartRate) : undefined,
            note: "Pengukuran TD ke-1 (Awal Admisi)",
          });
        }
        if (bp2Systolic && bp2Diastolic) {
          bpPayload.push({
            systolic: Number(bp2Systolic),
            diastolic: Number(bp2Diastolic),
            heart_rate: bp2HeartRate ? Number(bp2HeartRate) : undefined,
            note: "Pengukuran TD ke-2 (Konfirmasi / Interval >= 15 Menit)",
          });
        }

        const symptomsPayload = [
          {
            symptom_code: "PE_SYM_HEADACHE",
            symptom_label: "Sakit Kepala Hebat",
            is_severe_feature: true,
            response: (symptomHeadache ? "YA" : "TIDAK") as ClinicalItemResponse,
          },
          {
            symptom_code: "PE_SYM_VISUAL",
            symptom_label: "Gangguan Penglihatan (Kabur/Skotoma)",
            is_severe_feature: true,
            response: (symptomVision ? "YA" : "TIDAK") as ClinicalItemResponse,
          },
          {
            symptom_code: "PE_SYM_EPIGASTRIC",
            symptom_label: "Nyeri Ulu Hati / Epigastrium",
            is_severe_feature: true,
            response: (symptomEpigastric ? "YA" : "TIDAK") as ClinicalItemResponse,
          },
          {
            symptom_code: "PE_SYM_DYSPNEA",
            symptom_label: "Sesak Napas / Edema Paru",
            is_severe_feature: true,
            response: (symptomDyspnea ? "YA" : "TIDAK") as ClinicalItemResponse,
          },
        ];

        const labsPayload: Array<{
          test_code: LabTestCode;
          test_name: string;
          result_status: LabAvailabilityStatus;
          value_numeric?: number;
          value_text?: string;
          unit: string;
          reference_range: string;
        }> = [
          {
            test_code: "LAB_PROTEIN_DIPSTICK" as LabTestCode,
            test_name: "Protein Urin",
            result_status: "TERSEDIA" as LabAvailabilityStatus,
            value_text: proteinUrine,
            unit: "dipstik",
            reference_range: "Negatif",
          },
        ];
        if (labPlatelets) {
          labsPayload.push({
            test_code: "LAB_PLATELETS" as LabTestCode,
            test_name: "Trombosit",
            result_status: "TERSEDIA" as LabAvailabilityStatus,
            value_numeric: Number(labPlatelets),
            unit: "/uL",
            reference_range: "150.000 - 450.000",
          });
        }
        if (labSgot) {
          labsPayload.push({
            test_code: "LAB_SGOT_AST" as LabTestCode,
            test_name: "SGOT / AST",
            result_status: "TERSEDIA" as LabAvailabilityStatus,
            value_numeric: Number(labSgot),
            unit: "U/L",
            reference_range: "< 35 U/L",
          });
        }
        if (labCreatinine) {
          labsPayload.push({
            test_code: "LAB_SERUM_CREATININE" as LabTestCode,
            test_name: "Serum Kreatinin",
            result_status: "TERSEDIA" as LabAvailabilityStatus,
            value_numeric: Number(labCreatinine),
            unit: "mg/dL",
            reference_range: "0.5 - 1.1 mg/dL",
          });
        }

        await apiRequest("/screening/pe", {
          method: "POST",
          userId: currentUserId,
          body: {
            action: "EVALUATE_PE",
            admission_id: currentAdmission.admission_id,
            kejang_eklamsia: "TIDAK",
            kesadaran_menurun_gcs_rendah: "TIDAK",
            edema_paru_sesak_berat: symptomDyspnea ? "YA" : "TIDAK",
            oliguria_produksi_urin_rendah: "TIDAK",
            clinical_notes: clinicalNotes || "Skrining PE berdasarkan pengukuran tensi 2x, protein urin, gejala & lab.",
            bp_measurements: bpPayload,
            symptoms: symptomsPayload,
            labs: labsPayload,
            risk_details: formattedRiskDetails,
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
      const riskLabelIndo =
        calculatedRisk === "HIGH"
          ? "TINGGI"
          : calculatedRisk === "MODERATE"
          ? "SEDANG"
          : "RENDAH";

      if (activeInstrument === "PE") {
        const msg = `Hasil Skrining Risiko PE berhasil disimpan (Kategori: ${riskLabelIndo})! Skrining Risiko HPP sekarang telah terbuka.`;
        setSuccessMessage(msg);
        showToast(
          "Rekam Medis Berhasil Disimpan!",
          `Skrining Risiko PE untuk ${patientName} telah berhasil disimpan dengan kategori ${riskLabelIndo}. Tahap 2 (Skrining HPP) kini telah terbuka.`,
          "success"
        );
      } else {
        const msg = `Hasil Skrining Risiko HPP berhasil disimpan ke Rekam Medis! Status risiko diperbarui: ${riskLabelIndo}.`;
        setSuccessMessage(msg);
        showToast(
          "Rekam Medis Berhasil Disimpan!",
          `Skrining Risiko HPP untuk ${patientName} berhasil dievaluasi dan diperbarui ke kategori ${riskLabelIndo}.`,
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

  // Handler: Skrining Ulang (Pengkajian Observasi / Kunjungan Terkini)
  const handleConfirmRescreen = () => {
    // Bersihkan respon 4 domain dan tanda vital agar siap diisi baru
    setResponses({});
    setBp1Systolic("");
    setBp1Diastolic("");
    setBp1HeartRate("");
    setBp2Systolic("");
    setBp2Diastolic("");
    setBp2HeartRate("");
    setProteinUrine("NEGATIF");
    setSymptomHeadache(false);
    setSymptomVision(false);
    setSymptomEpigastric(false);
    setSymptomDyspnea(false);
    setLabHb("");
    setHistoryPrevHpp(false);
    setLabPlatelets("");
    setLabSgot("");
    setLabCreatinine("");
    setClinicalNotes("");
    setBundleChecked({});
    setActiveInstrument("PE");
    setShowRescreenModal(false);
    showToast(
      "Skrining Ulang Siap",
      "Formulir 4 Domain (Maternal, Obstetri, Janin, Kombinasi Risiko) dan Tanda Vital telah disiapkan kembali untuk observasi terkini.",
      "success"
    );
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
    if (activeInstrument === "PE") {
      setBp1Systolic("");
      setBp1Diastolic("");
      setBp1HeartRate("");
      setBp2Systolic("");
      setBp2Diastolic("");
      setBp2HeartRate("");
      setProteinUrine("NEGATIF");
      setSymptomHeadache(false);
      setSymptomVision(false);
      setSymptomEpigastric(false);
      setSymptomDyspnea(false);
      setLabPlatelets("");
      setLabSgot("");
      setLabCreatinine("");
    } else {
      setLabHb("");
      setHistoryPrevHpp(false);
    }
    const initMap: Record<string, ClinicalItemResponse> = {};
    currentMasters.forEach((m) => {
      initMap[m.risk_factor_id] = "TIDAK";
    });
    setResponses(initMap);
    setBundleChecked({});
    setSuccessMessage("Isian skrining telah direset ke nilai awal.");
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
      {/* =========================================================================
          KOLOM KIRI (20%): DAFTAR PASIEN (PERSIS SEPERTI GAMBAR REFERENSI USER)
         ========================================================================= */}
      <div className="w-full xl:w-[22%] 2xl:w-[20%] shrink-0 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
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
          KOLOM TENGAH (60%): LEMBAR KERJA PENGKAJIAN SKRINING KLINIS UTAMA
         ========================================================================= */}
      <div
        className={`w-full ${
          isHistoryPanelOpen ? "xl:w-[56%] 2xl:w-[60%]" : "xl:flex-1"
        } space-y-5 min-w-0 transition-all duration-200`}
      >
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
                  Buka Menu RingPas &rarr;
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

              {/* Tiga Tombol Aksi di Kanan Atas: Skrining Ulang, Ubah Status Rawat & Selesai / Pulang */}
              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRescreenModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Mulai pengkajian skrining ulang klinis untuk pasien ini"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Skrining Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
                  <span>Ubah Status Rawat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
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
                ) : isHppScreeningCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
                    <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                    Selesai
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
              <div className="space-y-2.5">
                {/* 1. Notif Skrining Risiko PE Selesai */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-black text-emerald-900 dark:text-emerald-100">
                        Skrining Risiko PE Selesai (Kategori:{" "}
                        {currentAdmission?.latest_pe_result?.category === "HIGH"
                          ? "TINGGI"
                          : currentAdmission?.latest_pe_result?.category === "MODERATE"
                          ? "SEDANG"
                          : "RENDAH"}
                        )
                      </span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        {!isHppScreeningCompleted
                          ? "Skrining Risiko HPP telah terbuka dan siap diisi."
                          : "Skrining Tahap 1 (Preeklamsia) telah selesai dievaluasi."}
                      </p>
                    </div>
                  </div>
                  {activeInstrument === "PE" && !isHppScreeningCompleted && (
                    <button
                      type="button"
                      onClick={() => setActiveInstrument("HPP")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                      <span>Lanjut ke Skrining Risiko HPP &rarr;</span>
                    </button>
                  )}
                </div>

                {/* 2. Notif Skrining Risiko HPP Selesai (Tepat di Bawah Notif PE) */}
                {isHppScreeningCompleted && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-black text-emerald-900 dark:text-emerald-100">
                          Skrining Risiko HPP Selesai (Kategori:{" "}
                          {currentAdmission?.latest_hpp_result?.category === "HIGH"
                            ? "TINGGI"
                            : currentAdmission?.latest_hpp_result?.category === "MODERATE"
                            ? "SEDANG"
                            : "RENDAH"}
                          )
                        </span>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          Seluruh tahapan skrining admisi (PE &amp; HPP) telah selesai dievaluasi dan tersimpan di Rekam Medis.
                        </p>
                      </div>
                    </div>
                    {onNavigateRpp && (
                      <button
                        type="button"
                        onClick={onNavigateRpp}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all shrink-0 active:scale-95 cursor-pointer"
                      >
                        <span>Buka Menu RingPas &rarr;</span>
                      </button>
                    )}
                  </div>
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

            {/* Filter Pills Dimulai dari: SEMUA -> RENDAH -> SEDANG -> TINGGI */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSetRiskFilter("SEMUA")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "SEMUA"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleSetRiskFilter("RENDAH")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "RENDAH"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
                }`}
              >
                RENDAH
              </button>
              <button
                type="button"
                onClick={() => handleSetRiskFilter("SEDANG")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "SEDANG"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-50"
                }`}
              >
                SEDANG
              </button>
              <button
                type="button"
                onClick={() => handleSetRiskFilter("TINGGI")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === "TINGGI"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-50"
                }`}
              >
                TINGGI
              </button>
            </div>
          </div>

          {/* =========================================================================
              4 DOMAIN SKRINING KLINIS SIGAP (MATERNAL, OBSTETRI, JANIN, KOMBINASI)
              FORMAT TAMPILAN: [DOMAIN] , [RISIKO] - [NAMA KRITERIA] - [YA / TIDAK / BELUM DI CEK]
             ========================================================================= */}
          <div className="space-y-4">
            {activeScreeningDomains.map((domain) => {
              const DomainIcon = domain.icon;
              const isExpanded = expandedDomains[domain.id] ?? true;

              // Filter item berdasarkan filter pill (SEMUA / RENDAH / SEDANG / TINGGI)
              const visibleItems = domain.items.filter((item) => {
                if (riskFilter === "SEMUA") return true;
                if (riskFilter === "RENDAH") return item.riskTier === "LOW";
                if (riskFilter === "SEDANG") return item.riskTier === "MODERATE";
                if (riskFilter === "TINGGI") return item.riskTier === "HIGH";
                return true;
              });

              if (visibleItems.length === 0) return null;

              // Hitung statistik respon pada domain ini
              const domainAnswered = domain.items.filter(
                (item) => responses[item.id] === "YA" || responses[item.id] === "TIDAK"
              ).length;
              const domainHasYes = domain.items.some((item) => responses[item.id] === "YA");

              return (
                <div
                  key={domain.id}
                  className={`rounded-2xl ${domain.cardBorder} bg-white dark:bg-[#0c183a] overflow-hidden transition-all`}
                >
                  {/* Header Accordion Domain */}
                  <div
                    onClick={() => toggleDomainExpand(domain.id)}
                    className={`p-3.5 ${domain.headerGradient} cursor-pointer flex items-center justify-between transition-all select-none hover:opacity-95`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-7 w-7 rounded-lg ${domain.iconStyle} flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        <DomainIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs tracking-wider uppercase">
                            {domain.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${domain.badgeStyle}`}
                          >
                            {domainAnswered}/{domain.items.length} Terisi
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 font-medium">
                          {domain.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {domainHasYes && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] shadow-2xs">
                          Terindikasi
                        </span>
                      )}
                      <div className={`p-1 rounded-md ${domain.chevronStyle}`}>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Isi Domain: Format [Domain] , [Risiko] - [Nama Kriteria] - [Ya / Tidak / Belum di cek] */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {visibleItems.map((item) => {
                          const val = responses[item.id];
                          const isYes = val === "YA";
                          const isNo = val === "TIDAK";
                          const isUnchecked = val === "BELUM_DIPERIKSA" || !val;

                          return (
                            <div
                              key={item.id}
                              className={`py-2.5 px-3 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isYes
                                  ? item.riskTier === "HIGH"
                                    ? "bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60"
                                    : item.riskTier === "MODERATE"
                                    ? "bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60"
                                    : "bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60"
                                  : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              {/* [Domain] , [Risiko] - [Nama Kriteria] */}
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-wrap">
                                {/* Label Domain Mini */}
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {domain.name}
                                </span>

                                <span className="text-slate-300 dark:text-slate-600 font-bold hidden sm:inline">,</span>

                                {/* Badge Kategori Risiko */}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 tracking-wider shadow-2xs border ${
                                    item.riskTier === "HIGH"
                                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800"
                                      : item.riskTier === "MODERATE"
                                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                                      : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                                  }`}
                                >
                                  {item.riskTier === "HIGH"
                                    ? "Risiko Tinggi"
                                    : item.riskTier === "MODERATE"
                                    ? "Risiko Sedang"
                                    : "Risiko Rendah"}
                                </span>

                                <span className="text-slate-400 font-bold hidden sm:inline">-</span>

                                {/* Nama Kriteria */}
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                  {item.label}
                                </span>
                              </div>

                              {/* Tombol [ Ya / Tidak / Belum di cek ] */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDomainItem(item.id, "YA")}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isYes
                                      ? item.riskTier === "HIGH"
                                        ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-400 font-black"
                                        : item.riskTier === "MODERATE"
                                        ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-400 font-black"
                                        : "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400 font-black"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDomainItem(item.id, "TIDAK")}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isNo
                                      ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-400 font-black"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  Tidak
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDomainItem(item.id, "BELUM_DIPERIKSA")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                    isUnchecked
                                      ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                                      : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  Belum di cek
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                KATEGORI {calculatedRisk === "LOW" ? "RISIKO RENDAH" : calculatedRisk === "MODERATE" ? "RISIKO SEDANG" : "RISIKO BERAT"}
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

        {/* 4. Footer Aksi Skrining (Menempel rapi di bawah Bundle SOP Tindakan Nakes) */}
        <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
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
              {calculatedRisk === "LOW" ? "RENDAH" : calculatedRisk === "MODERATE" ? "SEDANG" : "TINGGI (BERAT)"}
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
              <span>Buka Menu RingPas</span>
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
          KOLOM KANAN (20%): DAFTAR HISTORY PASIEN (PERSIS GAMBAR REFERENSI SIMRS)
         ========================================================================= */}
      {isHistoryPanelOpen ? (
        <div className="w-full xl:w-[22%] 2xl:w-[20%] shrink-0 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col transition-all duration-200">
          {/* Header Biru "Daftar History Pasien" */}
          <div className="bg-[#2457d6] text-white px-3.5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-xs tracking-wide block leading-tight">
                  Daftar History Pasien
                </span>
                <span className="text-[10px] text-blue-100 font-medium">
                  Histori Skrining & Rawat
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRefresh()}
                className="p-1 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Muat ulang histori"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryPanelOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Sembunyikan panel riwayat"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sub-header Ringkasan Pasien Terpilih */}
          <div className="p-3 border-b border-blue-100 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/30">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {currentAdmission?.patient?.full_name || "Pilih Pasien"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  RM {currentAdmission?.patient?.mrn || "-"}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-black text-[10px] shrink-0 border border-blue-200 dark:border-blue-800">
                {patientHistoryRecords.length} Kunjungan
              </span>
            </div>
          </div>

          {/* Daftar Kartu Riwayat (List of History Cards - Persis Gambar SIMRS) */}
          <div className="p-3 space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto divide-y-0">
            {patientHistoryRecords.length === 0 ? (
              <div className="text-center py-8 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-400">
                <Calendar className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600" />
                <p>Belum ada riwayat skrining sebelumnya untuk pasien ini.</p>
              </div>
            ) : (
              patientHistoryRecords.map((adm, idx) => {
                const isCurrent = adm.admission_id === currentAdmission?.admission_id;
                const peResult = adm.latest_pe_result;
                const hppResult = adm.latest_hpp_result;

                return (
                  <div
                    key={adm.admission_id || idx}
                    className={`rounded-xl border p-3 text-xs transition-all space-y-2 relative group ${
                      isCurrent
                        ? "border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-300/60"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs"
                    }`}
                  >
                    {/* Header Kartu: Tanggal/Jam & Tombol Cetak / Detail */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {new Date(adm.admission_date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          <span className="text-slate-500 font-normal">
                            {new Date(adm.admission_date).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-600 text-white">
                            Aktif
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.print();
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Cetak lembar riwayat ini"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingHistoryAdm(adm)}
                          className="p-1 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Lihat detail skrining"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Informasi Dokter DPJP & Unit (Persis Gambar SIMRS) */}
                    <div
                      onClick={() => setViewingHistoryAdm(adm)}
                      className="cursor-pointer space-y-1"
                    >
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <Stethoscope className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {adm.attending_doctor_name || "dr. DPJP Sp.OG Jaga"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {adm.unit?.name || "VK Bersalin"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            adm.penjamin?.includes("BPJS")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {adm.penjamin || "UMUM"}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        #{adm.admission_code || adm.admission_id}
                      </div>
                    </div>

                    {/* Hasil Skrining PE & HPP (Badge Rendah / Sedang / Tinggi) */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                      {peResult ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            peResult.category === "HIGH"
                              ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200"
                              : peResult.category === "MODERATE"
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200"
                          }`}
                        >
                          PE:{" "}
                          {peResult.category === "HIGH"
                            ? "Tinggi"
                            : peResult.category === "MODERATE"
                            ? "Sedang"
                            : "Rendah"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">PE: Belum</span>
                      )}

                      {hppResult ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            hppResult.category === "HIGH"
                              ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200"
                              : hppResult.category === "MODERATE"
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200"
                          }`}
                        >
                          HPP:{" "}
                          {hppResult.category === "HIGH"
                            ? "Tinggi"
                            : hppResult.category === "MODERATE"
                            ? "Sedang"
                            : "Rendah"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">• HPP: Belum</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Tombol Expand Ketika Panel Kanan Diciutkan */
        <button
          type="button"
          onClick={() => setIsHistoryPanelOpen(true)}
          className="flex xl:flex-col items-center justify-center py-2.5 px-4 xl:py-4 xl:px-2.5 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs gap-2 xl:gap-3 cursor-pointer transition-all shrink-0 xl:sticky xl:top-4 self-start"
          title="Buka Daftar History Pasien"
        >
          <ChevronLeft className="h-4 w-4 hidden xl:block" />
          <History className="h-4 w-4" />
          <span className="xl:[writing-mode:vertical-lr] xl:rotate-180 text-[11px] xl:text-[10px] font-black tracking-wider uppercase">
            History Pasien ({patientHistoryRecords.length})
          </span>
          <ChevronRight className="h-4 w-4 xl:hidden" />
        </button>
      )}

      {/* =========================================================================
          MODAL PREVIEW DETAIL RIWAYAT SKRINING PASIEN (LONGITUDINAL PREVIEW)
         ========================================================================= */}
      {viewingHistoryAdm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Detail Riwayat Kunjungan & Skrining
                  </h3>
                  <p className="text-xs text-slate-400">
                    No. Rawat #{viewingHistoryAdm.admission_code || viewingHistoryAdm.admission_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryAdm(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Info Pasien & Waktu */}
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/30 dark:bg-slate-800/40 p-3 space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100">
                  <span>{viewingHistoryAdm.patient?.full_name}</span>
                  <span className="font-mono">RM {viewingHistoryAdm.patient?.mrn}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>Unit: {viewingHistoryAdm.unit?.name || "VK Bersalin"}</span>
                  <span>
                    {new Date(viewingHistoryAdm.admission_date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  DPJP: {viewingHistoryAdm.attending_doctor_name || "dr. DPJP Sp.OG"}
                </div>
              </div>

              {/* Status Skrining PE & HPP */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Skrining PE</div>
                  <div className="font-black text-sm">
                    {viewingHistoryAdm.latest_pe_result ? (
                      <span
                        className={
                          viewingHistoryAdm.latest_pe_result.category === "HIGH"
                            ? "text-rose-600"
                            : viewingHistoryAdm.latest_pe_result.category === "MODERATE"
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        RISIKO{" "}
                        {viewingHistoryAdm.latest_pe_result.category === "HIGH"
                          ? "TINGGI"
                          : viewingHistoryAdm.latest_pe_result.category === "MODERATE"
                          ? "SEDANG"
                          : "RENDAH"}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Belum dievaluasi</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Skrining HPP</div>
                  <div className="font-black text-sm">
                    {viewingHistoryAdm.latest_hpp_result ? (
                      <span
                        className={
                          viewingHistoryAdm.latest_hpp_result.category === "HIGH"
                            ? "text-rose-600"
                            : viewingHistoryAdm.latest_hpp_result.category === "MODERATE"
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        RISIKO{" "}
                        {viewingHistoryAdm.latest_hpp_result.category === "HIGH"
                          ? "TINGGI"
                          : viewingHistoryAdm.latest_hpp_result.category === "MODERATE"
                          ? "SEDANG"
                          : "RENDAH"}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Belum dievaluasi</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Catatan / Tanda Vital Jika Ada */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                  Status Pelayanan:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Status admisi:{" "}
                  <strong>{viewingHistoryAdm.status === "CLOSED" ? "Pulang / Selesai" : "Rawat Aktif"}</strong>.
                  {viewingHistoryAdm.latest_pe_result && (
                    <span>
                      {" "}Skrining PE dievaluasi pada{" "}
                      {new Date(viewingHistoryAdm.latest_pe_result.calculated_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak Lembar Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingHistoryAdm(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
          MODAL: KONFIRMASI SKRINING ULANG
         ========================================================================= */}
      {showRescreenModal && currentAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Konfirmasi Skrining Ulang Pasien
              </h3>
              <button
                type="button"
                onClick={() => setShowRescreenModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Siapkan Pengkajian Klinis Observasi Baru</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Apakah Anda ingin memulai skrining ulang untuk <strong>{currentAdmission.patient?.full_name}</strong> (RM: {currentAdmission.patient?.mrn})?
                </p>
                <p className="text-[11px] opacity-85 leading-relaxed pt-1">
                  Sesuai pedoman POGI, InaSH &amp; WHO, skrining ulang dilakukan saat terjadi perubahan kondisi klinis, tanda vital baru, atau evaluasi interval (&ge; 15–60 menit).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                Formulir 4 Domain (Maternal, Obstetri, Janin, Kombinasi Risiko) dan Tanda Vital akan disiapkan kembali untuk pengisian evaluasi terkini.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRescreenModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRescreen}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Mulai Skrining Ulang</span>
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

