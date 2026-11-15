"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPlus,
  Database,
  Droplets,
  FileCheck2,
  FileText,
  HeartPulse,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Lock,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { NavSection } from "@/components/common/ShadcnAppShell";

interface UserGuideViewProps {
  onNavigate: (section: NavSection) => void;
  userRole?: string;
}

export function UserGuideView({ onNavigate, userRole }: UserGuideViewProps) {
  const [activeTab, setActiveTab] = useState<
    "WORKFLOW" | "DIFFERENCE" | "ROLES" | "CLINICAL_RULES" | "FAQ"
  >("WORKFLOW");

  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<"BIDAN" | "DOKTER" | "ADMIN">(
    userRole === "DOKTER"
      ? "DOKTER"
      : userRole === "ADMIN_RS"
      ? "ADMIN"
      : "BIDAN"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [clinicalSubTab, setClinicalSubTab] = useState<
    "TABEL_1" | "TABEL_2" | "TABEL_3"
  >("TABEL_2");

  const workflowSteps = [
    {
      step: 1,
      title: "Pendaftaran Pasien (Master Pasien)",
      shortDesc: "Input identitas dasar pasien satu kali seumur hidup",
      icon: UserPlus,
      color: "blue",
      navTarget: "PATIENT_REGISTRATION" as NavSection,
      details: {
        purpose:
          "Menyimpan data identitas biologis dan administratif pasien ke dalam master database rumah sakit.",
        whoDoesIt: "Bidan / Perawat VK IGD, Admin Pendaftaran",
        inputs: [
          "Nama Lengkap Pasien",
          "Nomor Rekam Medis (No. RM)",
          "NIK (KTP) — tersimpan aman dengan penyamaran/masking",
          "Tanggal Lahir & Usia Otomatis",
          "Alamat Singkat & Kontak Darurat",
        ],
        clinicalTip:
          "Pasien hanya didaftarkan 1 kali. Jika pasien pernah berobat sebelumnya, langsung gunakan No. RM pasien tersebut.",
      },
    },
    {
      step: 2,
      title: "Input Episode Admisi",
      shortDesc: "Membuka kunjungan rawat inap dan data kehamilan saat ini",
      icon: ClipboardPlus,
      color: "indigo",
      navTarget: "ADMISSION_INPUT" as NavSection,
      details: {
        purpose:
          "Mencatat kondisi kehamilan dan rincian kunjungan saat ini karena usia kehamilan dan paritas berubah setiap episode.",
        whoDoesIt: "Bidan Pelaksana Kamar Bersalin (VK)",
        inputs: [
          "Pilihan Pasien dari Master",
          "Unit Rawat (VK Kamar Bersalin / IGD PONEK / Poli)",
          "Usia Kehamilan (Gestasi) dalam Minggu & Hari",
          "Paritas Obstetri (Gravida G, Para P, Abortus A)",
          "Riwayat Obstetri Terdahulu (Riwayat SC, PE, atau HPP)",
          "Keluhan Utama & DPJP Dokter Sp.OG",
        ],
        clinicalTip:
          "Episode Admisi mengikat hasil skrining dengan usia gestasi spesifik kunjungan tersebut.",
      },
    },
    {
      step: 3,
      title: "Skrining PE & HPP (Clinical Decision Support)",
      shortDesc: "Asesmen risiko ganda terstruktur dengan kalkulasi otomatis",
      icon: HeartPulse,
      color: "rose",
      navTarget: "PE_SCREENING" as NavSection,
      details: {
        purpose:
          "Mendeteksi dini ancaman Preeklamsia Berat (PE) dan Perdarahan Pascapersalinan (HPP 4T) tanpa bias asumsi.",
        whoDoesIt: "Bidan / Nakes Kamar Bersalin & Dokter Jaga",
        inputs: [
          "Pengukuran Tensi Sistolik & Diastolik berulang",
          "Pemeriksaan Gejala Subjektif (Nyeri kepala hebat, pandangan kabur, nyeri ulu hati)",
          "Laboratorium Urin (Proteinuria Dipstick) & Darah Lengkap",
          "Faktor Risiko 4T (Tonus Uterus, Trauma Jalan Lahir, Tissue Plasenta, Thrombin Koagulasi)",
        ],
        clinicalTip:
          "Sistem otomatis mengklasifikasikan ke dalam 3 Kategori Risiko: RENDAH (Hijau), SEDANG (Kuning), atau TINGGI/KRISIS (Merah).",
      },
    },
    {
      step: 4,
      title: "Pengerjaan Bundle SOP Tindakan Nakes",
      shortDesc: "Checklist tindakan emergensi sesuai tingkat risiko",
      icon: ClipboardCheck,
      color: "amber",
      navTarget: "PE_SCREENING" as NavSection,
      details: {
        purpose:
          "Memastikan seluruh langkah pencegahan dan stabilisasi dikerjakan tim medis sebelum terjadi komplikasi fatal.",
        whoDoesIt: "Tim Bidan VK & Perawat Pendamping",
        inputs: [
          "Pemasangan IV line kaliber besar (16G/18G)",
          "Pemberian Uterotonika Profilaksis / Terapi Oksitosin",
          "Protokol MgSO4 dosis inisial & rumatan (jika PE Berat)",
          "Pemasangan Kateter Urin & Pemantauan Input/Output Cairan",
        ],
        clinicalTip:
          "Waktu pengerjaan bundle SOP dicatat otomatis sebagai bukti kepatuhan klinis terintegrasi.",
      },
    },
    {
      step: 5,
      title: "Monitoring Timbang Darah & Handover SBAR",
      shortDesc: "Pemantauan kuantitatif dan eskalasi komunikasi klinis",
      icon: Activity,
      color: "emerald",
      navTarget: "MONITORING_SBAR" as NavSection,
      details: {
        purpose:
          "Memantau tanda vital berkala, menimbang kehilangan darah secara gravimetrik (kasa/dower), dan menyusun laporan SBAR terstandar.",
        whoDoesIt: "Bidan Pelaksana -> Dokter DPJP Sp.OG",
        inputs: [
          "Tanda Vital Serial (Tensi, Nadi, Respirasi, Suhu, MEOWS)",
          "Kuantifikasi Kehilangan Darah Objektif (mL)",
          "Ringkasan SBAR: Situation, Background, Assessment, Recommendation",
        ],
        clinicalTip:
          "Tombol 'Kirim SBAR' menghasilkan format komunikasi resmi yang siap dikonsulkan via telepon atau sistem RS ke Dokter Sp.OG.",
      },
    },
  ];

  const currentStepData = workflowSteps[activeStep - 1];

  const faqs = [
    {
      q: "Mengapa pasien harus didaftarkan dulu sebelum skrining?",
      a: "Karena skrining kebidanan memerlukan riwayat biologis tetap (No. RM, tanggal lahir, golongan darah) yang valid. Pendaftaran pasien menjamin rekam medis ibu tersimpan permanen dan tidak tertukar dengan pasien lain.",
    },
    {
      q: "Apa perbedaan antara Pasien, Admisi, dan Skrining?",
      a: "Pasien adalah manusianya (identitas seumur hidup). Admisi adalah kunjungan/episode perawatannya saat ini (misal: masuk VK pada UK 38 minggu). Skrining adalah asesmen risiko bahaya klinis (PE & HPP) yang dilakukan pada admisi tersebut.",
    },
    {
      q: "Bagaimana jika pasien datang dalam kondisi gawat darurat (inpartu kala 2 / kejang)?",
      a: "Nakes dapat memilih pendaftaran cepat dengan centang 'Mode Emergensi/Anonim' untuk langsung membuka lembar skrining dan checklist resusitasi tanpa harus menunggu kelengkapan berkas KTP/NIK di loket administrasi.",
    },
    {
      q: "Kapan kriteria Preeklamsia dinyatakan 'Risiko Tinggi' oleh sistem?",
      a: "Sistem SIGAP memicu Kategori Tinggi jika tensi sistolik >= 160 mmHg atau diastolik >= 110 mmHg, ATAU terdapat minimal 1 faktor risiko tinggi riwayat PE/eklamsia, ATAU ditemukan salah satu gejala kriteria berat (nyeri kepala persisten, pandangan kabur, atau nyeri epigastrium).",
    },
    {
      q: "Apakah data yang dimasukkan tetap aman jika browser ditutup?",
      a: "Ya. Setiap perubahan tersimpan otomatis ke database backend SIGAP dan dicatat dalam riwayat audit log (Audit Trail) yang mencatat waktu input, nama nakes, dan id tindakan.",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* HERO BANNER: PANDUAN PENGGUNAAN SIGAP                          */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6 sm:p-10 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <BookOpen className="h-3.5 w-3.5" />
              PANDUAN OPERASIONAL KLINIS SIGAP
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Buku Panduan & Alur Kerja Klinis
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Pelajari tata kelola skrining admisi ganda (Preeklamsia & HPP),
              peran masing-masing tenaga medis, serta panduan praktis penggunaan
              aplikasi SIGAP di Unit Kamar Bersalin (VK) dan IGD PONEK.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate("PATIENT_REGISTRATION")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Mulai Pendaftaran Pasien</span>
            </button>
            <button
              onClick={() => onNavigate("PE_SCREENING")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-bold text-xs tracking-wide transition-all"
            >
              <HeartPulse className="h-4 w-4 text-rose-400" />
              <span>Buka Menu Skrining</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB NAVIGATION PANDUAN                                         */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("WORKFLOW")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "WORKFLOW"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>1. Alur Kerja 5 Tahap</span>
        </button>
        <button
          onClick={() => setActiveTab("DIFFERENCE")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "DIFFERENCE"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>2. Pasien vs Admisi vs Skrining</span>
        </button>
        <button
          onClick={() => setActiveTab("ROLES")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "ROLES"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>3. Panduan Peran (Role)</span>
        </button>
        <button
          onClick={() => setActiveTab("CLINICAL_RULES")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "CLINICAL_RULES"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>4. Standar Klinis (POGI/WHO)</span>
        </button>
        <button
          onClick={() => setActiveTab("FAQ")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "FAQ"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Info className="h-4 w-4" />
          <span>5. Tanya Jawab (FAQ)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ALUR KERJA 5 TAHAP                                     */}
      {/* ============================================================== */}
      {activeTab === "WORKFLOW" && (
        <div className="space-y-6">
          {/* Horizontal Step Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {workflowSteps.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.step;
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isActive
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Tahap {s.step}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400"
                      }`}
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {s.shortDesc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Step Detailed Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 shrink-0">
                  <currentStepData.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                    <span>Langkah Operasional Ke-{currentStepData.step}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {currentStepData.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {currentStepData.details.purpose}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate(currentStepData.navTarget)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-md transition-all self-start lg:self-auto shrink-0"
              >
                <span>Buka Menu {currentStepData.title}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Siapa Penanggung Jawabnya?
                  </h5>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2.5">
                    <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{currentStepData.details.whoDoesIt}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Data Yang Perlu Diinput:
                  </h5>
                  <ul className="space-y-2">
                    {currentStepData.details.inputs.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Catatan Klinis & Tips Praktis:
                  </h5>
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Pedoman Nakes:</p>
                      <p>{currentStepData.details.clinicalTip}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Navigasi Cepat Tahap:</span>
                  <div className="flex gap-2">
                    <button
                      disabled={activeStep === 1}
                      onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={activeStep === workflowSteps.length}
                      onClick={() =>
                        setActiveStep((prev) =>
                          Math.min(workflowSteps.length, prev + 1)
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
                    >
                      Lanjut Tahap {activeStep + 1}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PASIEN VS ADMISI VS SKRINING                           */}
      {/* ============================================================== */}
      {activeTab === "DIFFERENCE" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
            <h3 className="text-base font-bold flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Mengapa Ada Menu Pasien, Admisi, dan Skrining?
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              Di rumah sakit, data ibu hamil tidak boleh dicampur menjadi satu
              formulir tunggal. Pemisahan menjadi tiga lapisan (Pasien $\rightarrow$
              Admisi $\rightarrow$ Skrining) mencerminkan alur pelayanan asli di
              Kamar Bersalin (VK) dan menjamin keselamatan data pasien.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Kartu 1: Pasien */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                  1
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Data Pasien (Master)
                </h4>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-bold text-[11px] mt-1 mb-3">
                  Satu Kali Seumur Hidup
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Menjawab pertanyaan: <strong>"Orangnya siapa?"</strong>.
                  Menyimpan identitas permanen biologis pasien yang tidak pernah
                  berubah.
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Contoh Data:
                  </span>
                  <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>• Nama: Ny. Andini</li>
                    <li>• No. RM: 442992</li>
                    <li>• Tgl Lahir: 16 November 1999</li>
                    <li>• NIK: 330209...</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => onNavigate("PATIENT_REGISTRATION")}
                className="mt-6 w-full py-2.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
              >
                Buka Pendaftaran Pasien
              </button>
            </div>

            {/* Kartu 2: Admisi */}
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                  2
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Episode Admisi
                </h4>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold text-[11px] mt-1 mb-3">
                  Tiap Kunjungan Rawat
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Menjawab pertanyaan: <strong>"Hamil berapa minggu dan di ruangan apa saat ini?"</strong>.
                  Data kehamilan dan paritas bisa berbeda tiap kunjungan.
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Contoh Data:
                  </span>
                  <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>• Ruangan: VK Kamar Bersalin</li>
                    <li>• Usia Gestasi: 38 Minggu 2 Hari</li>
                    <li>• Paritas: G2 P1 A0</li>
                    <li>• DPJP: dr. Spesialis Sp.OG</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => onNavigate("ADMISSION_INPUT")}
                className="mt-6 w-full py-2.5 rounded-xl border border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
              >
                Buka Input Admisi
              </button>
            </div>

            {/* Kartu 3: Skrining */}
            <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-sm mb-4">
                  3
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Skrining Klinis (PE & HPP)
                </h4>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-bold text-[11px] mt-1 mb-3">
                  Keputusan Medis CDSS
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Menjawab pertanyaan: <strong>"Apakah ada bahaya preeklamsia/perdarahan dan apa SOP-nya?"</strong>.
                  Memberikan hasil klasifikasi risiko otomatis.
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Contoh Data:
                  </span>
                  <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>• Tensi: 160/100 mmHg</li>
                    <li>• Gejala: Nyeri Kepala (+)</li>
                    <li>• Risiko: Preeklamsia Berat</li>
                    <li>• SOP: Pasang IV 16G, MgSO4</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => onNavigate("PE_SCREENING")}
                className="mt-6 w-full py-2.5 rounded-xl border border-rose-500 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              >
                Buka Skrining PE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PANDUAN BERDASARKAN PERAN PENGGUNA                     */}
      {/* ============================================================== */}
      {activeTab === "ROLES" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRole("BIDAN")}
              className={`flex-1 py-3 px-4 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all ${
                selectedRole === "BIDAN"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              👩‍⚕️ Bidan / Perawat Obstetri
            </button>
            <button
              onClick={() => setSelectedRole("DOKTER")}
              className={`flex-1 py-3 px-4 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all ${
                selectedRole === "DOKTER"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              👨‍⚕️ Dokter Sp.OG / DPJP
            </button>
            <button
              onClick={() => setSelectedRole("ADMIN")}
              className={`flex-1 py-3 px-4 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all ${
                selectedRole === "ADMIN"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              🛡️ Admin Rumah Sakit
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
            {selectedRole === "BIDAN" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                    B
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Peran: Bidan / Perawat Kamar Bersalin (VK & IGD PONEK)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Akun resmi: <code className="font-mono font-bold text-blue-600">bidan</code> / <code className="font-mono text-slate-400">bidan123</code>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Tugas Utama:
                    </h5>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-5 list-disc">
                      <li>Pendaftaran Pasien baru dan buka Episode Admisi rawat inap</li>
                      <li>Input hasil tensi berulang dan centang gejala kriteria berat</li>
                      <li>Mengisi checklist faktor risiko HPP 4T saat pasien admisi</li>
                      <li>Melaksanakan bundle SOP (pasang infus, siapkan obat)</li>
                      <li>Mengisi timbang darah dan membuat laporan SBAR ke Dokter</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                    <h5 className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Tips Efisiensi Kerja:
                    </h5>
                    <p className="text-xs text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                      Gunakan fitur <strong>"Lanjut ke Skrining Langsung"</strong> saat mendaftarkan pasien baru agar sistem otomatis membuka formulir admisi dan tensi tanpa perlu berpindah-pindah menu.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === "DOKTER" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                    D
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Peran: Dokter Spesialis Sp.OG / DPJP & Dokter Jaga
                    </h4>
                    <p className="text-xs text-slate-500">
                      Akun resmi: <code className="font-mono font-bold text-indigo-600">dokter</code> / <code className="font-mono text-slate-400">dokter123</code>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Tugas Utama:
                    </h5>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-5 list-disc">
                      <li>Meninjau hasil skrining PE & HPP yang diinput oleh bidan</li>
                      <li>Merespons alert klinis gawat darurat (Krisis Hipertensi / HPP Masif)</li>
                      <li>Memberikan instruksi terapi atau rencana terminasi kehamilan</li>
                      <li>Menerima dan menandatangani eskalasi komunikasi SBAR</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
                    <h5 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-indigo-600" />
                      Tips Penilaian Klinis:
                    </h5>
                    <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
                      Dokter dapat melihat riwayat tensi berulang dan tren MEOWS secara grafik pada menu <strong>Monitoring & SBAR</strong> untuk memutuskan intervensi sectio caesarea atau terapi antihipertensi parenteral.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === "ADMIN" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black">
                    A
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Peran: Administrator Rumah Sakit & Manajemen Mutu
                    </h4>
                    <p className="text-xs text-slate-500">
                      Akun resmi: <code className="font-mono font-bold text-slate-800 dark:text-slate-200">admin</code> / <code className="font-mono text-slate-400">admin123</code>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Tugas Utama:
                    </h5>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-5 list-disc">
                      <li>Mengelola akun nakes dan hak akses per modul ruangan</li>
                      <li>Mengatur kebijakan privasi dan mode penyamaran data (anonimisasi)</li>
                      <li>Memantau kepatuhan pengerjaan SOP bundle di rumah sakit</li>
                      <li>Mengekspor data master rekam medis dalam format CSV/Excel</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-300 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-slate-600" />
                      Integritas Data:
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Admin RS dapat memeriksa menu <strong>Protokol & Audit Log</strong> untuk memverifikasi siapa saja yang melakukan perubahan data pasien, guna memenuhi standar akreditasi rumah sakit (KARS/JCI).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PEDOMAN STANDAR KLINIS                                 */}
      {/* ============================================================== */}
      {activeTab === "CLINICAL_RULES" && (
        <div className="space-y-6">
          {/* Header & Sub-tab Selector */}
          <div className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Rancangan Materi Klinis & Dasar Rujukan SIGAP (Dokumen Resmi)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Penyelarasan standar medis terbaru: WHO PPH Guidelines (2025/2026), InaSH & POGI (2025), serta KMK RI Pedoman PONEK (2025).
                </p>
              </div>

              {/* Sub-tab Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setClinicalSubTab("TABEL_1")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    clinicalSubTab === "TABEL_1"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  Tabel 1: Fitur Utama
                </button>
                <button
                  type="button"
                  onClick={() => setClinicalSubTab("TABEL_2")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    clinicalSubTab === "TABEL_2"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  Tabel 2: 12 Materi & Rujukan
                </button>
                <button
                  type="button"
                  onClick={() => setClinicalSubTab("TABEL_3")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    clinicalSubTab === "TABEL_3"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  Tabel 3: Kategori & Tindak Lanjut
                </button>
              </div>
            </div>
          </div>

          {/* SUB-TAB 1: TABEL 1. FITUR UTAMA APLIKASI SIGAP */}
          {clinicalSubTab === "TABEL_1" && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Tabel 1. Fitur Utama Aplikasi SIGAP
                </h4>
                <p className="text-xs text-slate-500">Struktur dan kapabilitas inti sistem pendukung keputusan klinis</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                      <th className="py-3 px-4 w-1/4">Fitur</th>
                      <th className="py-3 px-4">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Data admisi</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Kode pasien, usia, paritas, usia kehamilan, jenis admisi (inpartu atau indikasi lain), riwayat obstetri, dan penyakit penyerta.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Modul skrining preeklamsia</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Input tekanan darah (dua kali pengukuran), protein urin, gejala (sakit kepala, gangguan penglihatan, nyeri ulu hati, sesak napas), faktor risiko, dan hasil laboratorium bila tersedia. Aplikasi menampilkan kategori risiko rendah, sedang, atau tinggi.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Modul skrining risiko HPP</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Input faktor risiko berdasarkan kelompok tonus, trauma, jaringan, dan trombin, ditambah anemia dan riwayat HPP. Aplikasi menampilkan kategori risiko rendah, sedang, atau tinggi.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Rekomendasi tindak lanjut</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Daftar periksa kesiapan sesuai kategori, misalnya pemasangan akses IV, pemeriksaan Hb dan golongan darah, kesiapan uterotonika, asam traneksamat, dan magnesium sulfat sesuai protokol rumah sakit.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Peringatan dan eskalasi</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Tanda peringatan merah, tombol hubungi dokter penanggung jawab.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Penilaian ulang</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Pengingat skrining ulang saat kondisi berubah dan pada masa pascapersalinan, serta kolom pengukuran kehilangan darah objektif dan tanda vital.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Dasbor mutu</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Rekap jumlah skrining, sebaran kategori, dan waktu pengisian untuk audit internal.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: TABEL 2. RANCANGAN MATERI SKRINING DAN DASAR RUJUKAN */}
          {clinicalSubTab === "TABEL_2" && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Tabel 2. Rancangan Materi Skrining dan Dasar Rujukan (12 Topik Medis)
                </h4>
                <p className="text-xs text-slate-500">Dasar bukti ilmiah yang mendasari logika keputusan klinis aplikasi SIGAP</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                      <th className="py-3 px-4 w-1/5">Topik Materi</th>
                      <th className="py-3 px-4 w-3/5">Ringkasan Materi</th>
                      <th className="py-3 px-4 w-1/5">Dasar Rujukan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        1. Prinsip skrining saat admisi
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Skrining wajib dilakukan pada setiap ibu segera saat masuk rawat inap (admission triage) dan diulang secara berkala atau segera bila status klinis berubah. Evaluasi mencakup tekanan darah terstandar, keluhan subjektif, riwayat antenatal (termasuk kepatuhan konsumsi aspirin/kalsium), status anemia, dan faktor risiko obstetri.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Consolidated PPH Guidelines (2025); KMK RI tentang Pedoman PONEK (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        2. Pengukuran tekanan darah
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Gunakan manset sesuai ukuran lengan, posisi lengan setinggi jantung, dan pasien dalam posisi duduk atau setengah duduk. Tekanan darah sistolik &ge; 160 mmHg atau diastolik &ge; 110 mmHg yang dikonfirmasi dalam interval &ge; 15 menit merupakan kegawatdaruratan hipertensi dan wajib mendapat antihipertensi segera dalam 30–60 menit. Target penurunan tekanan darah adalah &lt; 140/90 mmHg dengan batas aman diastolik tidak di bawah 80 mmHg untuk menjaga perfusi uteroplasenta.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        Panduan Hipertensi Peripartum InaSH & POGI (2025); WHO HDP Roadmap (2026)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        3. Kriteria diagnosis preeklamsia
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tekanan darah &ge; 140/90 mmHg pada dua kali pengukuran berjarak minimal 4 jam setelah usia kehamilan 20 minggu, disertai proteinuria (rasio protein/kreatinin urin/uPCR &ge; 0,3 mg/mg, protein urin 24 jam &ge; 300 mg, atau dipstik &ge; +2). Tanpa proteinuria, diagnosis tetap tegak bila terdapat disfungsi organ maternal (trombositopenia, gangguan hati/ginjal, edema paru, gejala serebral/visual) atau tanda insufisiensi uteroplasenta.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        InaSH & POGI (2025); Kemenkes RI (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        4. Tanda dan kriteria berat
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tekanan darah &ge; 160/110 mmHg, trombosit &lt; 100.000/&mu;L, peningkatan enzim transaminase &ge; 2 kali batas atas normal, kreatinin serum &gt; 1,1 mg/dL, edema paru, sakit kepala hebat persisten, gangguan penglihatan, atau nyeri epigastrium/kuadran kanan atas yang menetap.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        InaSH & POGI (2025); WHO Pre-eclampsia Fact Sheet (2026)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        5. Faktor risiko preeklamsia
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong>Risiko tinggi:</strong> riwayat preeklamsia, kehamilan ganda, hipertensi kronik, diabetes pragestasional, penyakit ginjal kronik, dan penyakit autoimun (SLE/APS).<br />
                        <strong>Risiko sedang:</strong> nulipara, obesitas, riwayat keluarga preeklamsia, usia &ge; 35 tahun, jarak kehamilan &gt; 10 tahun, dan kehamilan teknologi reproduksi berbantu (bayi tabung/ART).<br />
                        Aplikasi mencatat riwayat profilaksis antenatal (aspirin dosis rendah 75–150 mg/hari dan suplementasi kalsium 1–2 g/hari).
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Living Guidelines Calcium & Pre-eclampsia (2026); InaSH & POGI (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        6. Tatalaksana awal preeklamsia berat
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Pemberian <strong>Magnesium Sulfat (MgSO4 40%)</strong> sebagai lini pertama pencegahan dan pengobatan kejang (bukan diazepam). Antihipertensi kerja cepat (nifedipin oral kerja cepat, labetalol IV, atau hidralazin IV) dalam 30–60 menit. Pemantauan ketat toksisitas magnesium (refleks patela +, frekuensi napas &ge; 16x/menit, produksi urin &ge; 30 mL/jam) dan konsultasi dokter spesialis. Tidak dianjurkan tirah baring ketat maupun restriksi garam.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Pre-eclampsia Recommendations (2026); InaSH & POGI (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        7. Definisi dan pengukuran HPP
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        HPP didefinisikan sebagai kehilangan darah &ge; 500 mL dalam 24 jam pascapersalinan (HPP berat bila &ge; 1.000 mL) atau adanya tanda ketidakstabilan hemodinamik. Sesuai pedoman terkonsolidasi terbaru, penilaian wajib menggunakan <strong>pengukuran darah objektif</strong> (kain kalibrasi / calibrated drape atau penimbangan kasa/alas) yang dipadukan dengan pemantauan tanda vital dan <strong>Shock Index (HR / TDS)</strong>, meninggalkan metode perkiraan visual.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Consolidated PPH Guidelines (2025); WHO PPH Implementation Guide (2026)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        8. Faktor risiko HPP saat admisi
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Penilaian berbasis pendekatan 4T (Tonus, Trauma, Tissue, Thrombin) ditambah skrining anemia antenatal/intrapartum (pemeriksaan Hb saat admisi merupakan prioritas baru dalam pedoman WHO 2025 karena anemia meningkatkan mortalitas akibat perdarahan ringan-sedang). Faktor lain mencakup riwayat HPP, plasenta previa/spektrum plasenta akreta, kehamilan ganda, makrosomia, induksi/augmentasi, dan preeklamsia berat.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Consolidated PPH Guidelines (2025); KMK RI Pedoman PONEK (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        9. Pencegahan HPP rutin
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Pemberian uterotonika terjamin mutunya segera setelah bayi lahir pada semua persalinan: <strong>Oksitosin 10 IU IM/IV</strong> sebagai pilihan utama, atau <strong>Karbetosin stabil panas</strong> (heat-stable carbetocin) 100 &mu;g IM/IV (terutama bila rantai dingin tidak terjamin), atau <strong>Misoprostol oral 400–600 &mu;g</strong> bila sediaan injeksi tidak tersedia. Asam traneksamat tidak direkomendasikan untuk pencegahan rutin saat persalinan.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO Consolidated PPH Guidelines (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        10. Paket tatalaksana HPP (E-MOTIVE)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Penerapan paket respons pertama (first-response bundle) secara simultan dalam 15 menit pertama sejak diagnosis HPP tegak, bukan secara bertahap:<br />
                        &bull; <strong>(E)</strong> Deteksi dini objektif (calibrated drape)<br />
                        &bull; <strong>(M)</strong> Masase uterus<br />
                        &bull; <strong>(O)</strong> Oksitosin (uterotonika)<br />
                        &bull; <strong>(T)</strong> Asam Traneksamat 1 g IV (dalam 3 jam pascapersalinan)<br />
                        &bull; <strong>(IV)</strong> Cairan kristaloid IV dan pemeriksaan jalan lahir/plasenta<br />
                        &bull; <strong>(E)</strong> Eskalasi segera ke tatalaksana refrakter (tamponade balon uterus/kondom kateter, kompresi bimanual, atau intervensi bedah) bila perdarahan berlanjut.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO PPH Assessment & Bundle Recommendations (2023); WHO Consolidated PPH Guidelines (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        11. Kesiapan pada ibu risiko tinggi
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Pemasangan akses IV berdiameter besar (16G–18G, dua jalur untuk risiko tinggi), pemeriksaan darah lengkap (Hb/trombosit) dan golongan darah/uji silang (crossmatch), penyiapan stok uterotonika dan asam traneksamat di samping tempat tidur (bedside emergency kit), serta aktivasi dini tim PONEK/anestesi/bank darah atau sistem rujukan terencana.
                      </td>
                      <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-semibold">
                        WHO PPH Implementation Guide (2026); KMK RI Pedoman PONEK (2025)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        12. Keterkaitan preeklamsia dan HPP
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Ibu dengan preeklamsia berat atau sindrom HELLP otomatis diklasifikasikan sebagai <strong>risiko tinggi HPP</strong> akibat gangguan koagulasi/trombositopenia dan gangguan kontraksi uterus pascapaparan (MgSO4). <strong>KONTRAINDIKASI MUTLAK pemberian Metilergometrin (ergometrin)</strong> pada hipertensi/preeklamsia karena memicu krisis hipertensi dan stroke. Resusitasi cairan IV harus dibatasi secara hati-hati untuk mencegah edema paru akut.
                      </td>
                      <td className="py-3.5 px-4 text-rose-700 dark:text-rose-400 font-bold">
                        InaSH & POGI (2025); WHO Consolidated PPH Guidelines (2025)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: TABEL 3. KATEGORI HASIL SKRINING DAN TINDAK LANJUT */}
          {clinicalSubTab === "TABEL_3" && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Tabel 3. Kategori Hasil Skrining dan Tindak Lanjut (Rancangan Awal)
                </h4>
                <p className="text-xs text-slate-500">Kriteria ringkas dan paket tindakan nakes per kategori risiko klinis</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                      <th className="py-3 px-4 w-1/5">Kategori</th>
                      <th className="py-3 px-4 w-2/5">Kriteria Ringkas</th>
                      <th className="py-3 px-4 w-2/5">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-black text-emerald-700 dark:text-emerald-400">
                        Preeklamsia: Risiko Rendah
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tekanan darah &lt; 140/90 mmHg, tanpa gejala subjektif pemberatan, tanpa riwayat/faktor risiko tinggi, serta tanpa proteinuria atau kelainan laboratorium.
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; Pemantauan tanda vital dan kemajuan persalinan rutin sesuai protokol standar.<br />
                        &bull; Lakukan skrining ulang segera apabila muncul keluhan baru atau peningkatan tekanan darah selama perawatan.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-black text-amber-700 dark:text-amber-400">
                        Preeklamsia: Risiko Sedang
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tekanan darah 140–159 / 90–109 mmHg pada satu kali pengukuran, atau proteinuria positif (dipstik &ge; +1 atau uPCR &ge; 0,3), atau terdapat &ge; 1 faktor risiko tinggi maupun &ge; 2 faktor risiko sedang tanpa tanda pemberatan.
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; Istirahatkan ibu dan ulangi pengukuran tekanan darah terstandar setelah &ge; 15 menit (atau evaluasi dalam 4 jam untuk konfirmasi diagnosis).<br />
                        &bull; Periksa protein urin serta panel laboratorium dasar (darah lengkap/trombosit, fungsi hati, kreatinin).<br />
                        &bull; Lapor bidan penanggung jawab/dokter jaga, tingkatkan frekuensi pemantauan, dan aktifkan peringatan dini risiko HPP (minimal kategori sedang/tinggi sesuai kondisi).
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 bg-rose-50/30 dark:bg-rose-950/20">
                      <td className="py-3.5 px-4 font-black text-rose-700 dark:text-rose-400">
                        Preeklamsia: Risiko Berat
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tekanan darah &ge; 160/110 mmHg (menetap &ge; 15 menit), atau terdapat tanda pemberatan (nyeri kepala hebat, gangguan penglihatan, nyeri epigastrium, edema paru), kejang (eklamsia), atau hasil lab abnormal (trombosit &lt; 100.000/&mu;L, transaminase &ge; 2x normal, kreatinin &gt; 1,1 mg/dL).
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; <strong>Aktivasi Respons Cepat &amp; Timer 30–60 Menit:</strong> Segera lapor dokter spesialis (format SBAR) dan mulai pemberian Magnesium Sulfat (MgSO4 40% dosis awal 4g IV pelan dalam 5-10 menit, lanjut 1g/jam) serta antihipertensi kerja cepat dalam 30–60 menit (target TD &lt; 140/90 mmHg, diastolik &ge; 80 mmHg).<br />
                        &bull; Pasang akses IV dengan pembatasan cairan ketat (cegah edema paru) dan pantau tanda toksisitas (MgSO4) (refleks patela, RR &ge; 16x/menit, urin &ge; 30 mL/jam).<br />
                        &bull; <strong>Kunci Otomatis HPP Risiko Tinggi:</strong> Aplikasi memunculkan alert merah kontraindikasi mutlak Metilergometrin dan menyiapkan rujukan bila fasilitas tidak memadai.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-black text-emerald-700 dark:text-emerald-400">
                        HPP: Risiko Rendah (Hijau)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Tidak ada faktor risiko HPP saat admisi, kadar Hb &ge; 11 g/dL, janin tunggal, dan tekanan darah normal.
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; Penatalaksanaan aktif kala III rutin pada semua persalinan dengan Oksitosin 10 IU IM/IV (atau Karbetosin stabil panas 100 &mu;g IM/IV bila rantai dingin tidak terjamin) segera setelah bayi lahir.<br />
                        &bull; Tetap gunakan pengukuran darah objektif (kain kalibrasi/calibrated drape atau penimbangan kasa) dan pantau Shock Index (HR / TDS) pascapersalinan.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-black text-amber-700 dark:text-amber-400">
                        HPP: Risiko Sedang (Kuning)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Terdapat faktor risiko sedang, meliputi anemia ringan-sedang (Hb 7–10,9 g/dL), obesitas, makrosomia, polihidramnion, grandemultipara, induksi/augmentasi persalinan, riwayat seksio sesarea 1x, atau preeklamsia tanpa tanda berat.
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; Pasang akses IV berdiameter besar (16G–18G), periksa darah lengkap (Hb/trombosit) dan golongan darah.<br />
                        &bull; Siapkan uterotonika dan Asam Traneksamat 1 g IV di samping tempat tidur (bedside kit) sebagai kesiagaan.<br />
                        &bull; Wajib ukur kehilangan darah secara objektif dengan kain kalibrasi sejak kala III dan informasikan tim jaga.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 bg-rose-50/30 dark:bg-rose-950/20">
                      <td className="py-3.5 px-4 font-black text-rose-700 dark:text-rose-400">
                        HPP: Risiko Tinggi (Merah)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        Terdapat faktor risiko tinggi, meliputi riwayat HPP sebelumnya, plasenta previa/spektrum plasenta akreta, perdarahan antepartum aktif, kehamilan ganda, anemia berat (Hb &lt; 7 g/dL), trombositopenia/koagulopati, atau preeklamsia berat / sindrom HELLP.
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                        &bull; Konsultasi dini dokter spesialis obstetri, anestesi, dan bank darah (format SBAR).<br />
                        &bull; Pasang dua jalur akses IV ukuran besar (16G–18G), lakukan uji silang (crossmatch), dan siapkan komponen darah.<br />
                        &bull; Siapkan <strong>Paket Tatalaksana E-MOTIVE</strong> lengkap beserta alat tamponade balon uterus di kamar bersalin agar dapat dijalankan serentak dalam &lt; 15 menit bila perdarahan &ge; 500 mL atau tanda syok muncul.<br />
                        &bull; Pertimbangkan rujukan terencana ke fasilitas PONEK komprehensif sebelum persalinan berlangsung.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: FAQ (TANYA JAWAB UMUM)                                  */}
      {/* ============================================================== */}
      {activeTab === "FAQ" && (
        <div className="space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

