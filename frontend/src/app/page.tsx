"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  ClipboardList,
  ClipboardPlus,
  Database,
  Droplets,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  API_BASE_URL,
  apiRequest,
  BootstrapResponse,
  EnrichedAdmission,
} from "@/services/api-client";
import { RiskCategoryBadge } from "@/components/common/StatusBadge";
import {
  AdmissionEpisodeView,
  DischargeSummaryRppView,
  PatientRegistrationView,
} from "@/features/admission";
import { PatientMasterView } from "@/features/master/PatientMasterView";
import {
  AdminLoginView,
  LoginScreen,
  RbacManagementView,
  RbacThreeColumnView,
} from "@/features/rbac";
import { LoginPageView } from "@/modules/auth/pages/LoginPageView";
import { MasterDataView } from "@/components/MasterDataView";
import { PeScreeningView } from "@/features/clinical/PeScreeningView";
import { HppScreeningView } from "@/features/clinical/HppScreeningView";
import { MonitoringSbarView } from "@/features/clinical/MonitoringSbarView";
import { UnifiedClinicalScreeningView } from "@/features/clinical/UnifiedClinicalScreeningView";
import { GovernanceReportsView } from "@/components/GovernanceReportsView";
import { UserGuideView } from "@/features/guide/UserGuideView";
import { DashboardOverviewView } from "@/features/dashboard/DashboardOverviewView";
import { ShadcnAppShell, NavSection } from "@/components/common/ShadcnAppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalWorkflowStepper } from "@/components/common/ClinicalWorkflowStepper";
import type { User } from "@/types";

export default function SigapApplicationPage() {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavSection>("DASHBOARD");
  const [selectedAdmissionId, setSelectedAdmissionId] =
    useState<string>("adm-2026-001");
  const [preselectedPatientIdForAdm, setPreselectedPatientIdForAdm] =
    useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("usr-admin");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<"ADMIN" | "CLINICIAN">("ADMIN");

  // Periksa sesi tersimpan di browser
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("sigap_auth_user");
      if (savedUser) {
        setCurrentUserId(savedUser);
        setIsAuthenticated(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBootstrap = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setApiError(null);
        const res = await apiRequest<BootstrapResponse>("/bootstrap", {
          method: "GET",
          userId: currentUserId,
        });
        setData(res);
      } catch (err: any) {
        if (!isSilent) {
          setApiError(
            `Tidak dapat terhubung ke Backend API (${API_BASE_URL}): ${err.message}. Pastikan server backend berjalan di port 4000.`
          );
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    fetchBootstrap();

    // Auto-sync polling real-time setiap 3 detik (tanpa refresh manual atau reload layar)
    const pollInterval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        fetchBootstrap(true);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [fetchBootstrap]);

  function handleLoginSuccess(user: User, token?: string) {
    setCurrentUserId(user.user_id);
    setIsAuthenticated(true);
    try {
      localStorage.setItem("sigap_auth_user", user.user_id);
      if (token) localStorage.setItem("sigap_auth_token", token);
    } catch {
      // ignore
    }
    // Jika role admin yang login, arahkan langsung ke Manajemen Data & Faskes
    if (user.role_id === "ADMIN_RS" || user.role_id === "ADMIN_TI") {
      setActiveNav("MASTER_DATA");
    } else {
      setActiveNav("DASHBOARD");
    }
    fetchBootstrap();
  }

  async function handleResetDemo() {
    setLoading(true);
    try {
      await apiRequest("/bootstrap", {
        method: "POST",
        userId: currentUserId,
        body: { action: "RESET_SEED" },
      });
      await fetchBootstrap();
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchLoginUser(user: User) {
    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "LOGIN",
          username: user.username,
          password: "",
        },
      });
      handleLoginSuccess(user);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUserId,
        body: { action: "LOGOUT" },
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("sigap_auth_user");
      localStorage.removeItem("sigap_auth_token");
    } catch {
      // ignore
    }
  }

  // Pembatasan Menu Berdasarkan Role RBAC Aktif (FR-02 & SRS Bab 3)
  const ROLE_ALLOWED_MENUS: Record<string, NavSection[]> = {
    BIDAN_PERAWAT: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "ADMISSION_INPUT",
      "PATIENT_DISCHARGE_RPP",
      "CLINICAL_SCREENING",
      "PE_SCREENING",
      "HPP_SCREENING",
      "MONITORING_SBAR",
      "MASTER_DATA",
      "USER_GUIDE",
    ],
    DOKTER: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "ADMISSION_INPUT",
      "PATIENT_DISCHARGE_RPP",
      "CLINICAL_SCREENING",
      "PE_SCREENING",
      "HPP_SCREENING",
      "MONITORING_SBAR",
      "MASTER_DATA",
      "USER_GUIDE",
    ],
    VALIDATOR_KLINIS: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_DISCHARGE_RPP",
      "CLINICAL_SCREENING",
      "PE_SCREENING",
      "HPP_SCREENING",
      "MONITORING_SBAR",
      "PROTOCOL_AUDIT",
      "MASTER_DATA",
      "USER_GUIDE",
    ],
    ADMIN_RS: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "ADMISSION_INPUT",
      "PATIENT_DISCHARGE_RPP",
      "CLINICAL_SCREENING",
      "PE_SCREENING",
      "HPP_SCREENING",
      "MONITORING_SBAR",
      "PROTOCOL_AUDIT",
      "MASTER_DATA",
      "RBAC_MANAGEMENT",
      "USER_GUIDE",
    ],
    ADMIN_TI: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "ADMISSION_INPUT",
      "PATIENT_DISCHARGE_RPP",
      "CLINICAL_SCREENING",
      "PE_SCREENING",
      "HPP_SCREENING",
      "MONITORING_SBAR",
      "PROTOCOL_AUDIT",
      "MASTER_DATA",
      "RBAC_MANAGEMENT",
      "USER_GUIDE",
    ],
  };

  const currentUser = useMemo(() => {
    const users = data?.db?.users || [];
    return (
      users.find((u) => u.user_id === currentUserId) ||
      users[0] || {
        user_id: "usr-admin",
        username: "admin",
        full_name: "Administrator Sistem",
        role_id: "ADMIN_RS",
        status: "ACTIVE",
      }
    );
  }, [data?.db?.users, currentUserId]);

  const currentRoleDef = useMemo(() => {
    const roles = data?.db?.roles || [];
    return roles.find((r) => r.role_id === currentUser.role_id);
  }, [data?.db?.roles, currentUser.role_id]);

  // Ambil izin menu secara dinamis dari database (RBAC) jika sudah dikonfigurasi melalui menu Hak Akses
  const isDynamicPermissionsConfigured = Boolean(
    currentRoleDef?.permissions &&
      Array.isArray(currentRoleDef.permissions) &&
      currentRoleDef.permissions.length > 0 &&
      currentRoleDef.permissions.some((p) =>
        [
          "DASHBOARD",
          "PATIENT_MASTER",
          "PATIENT_REGISTRATION",
          "CLINICAL_SCREENING",
          "MONITORING_SBAR",
          "PATIENT_DISCHARGE_RPP",
          "MASTER_DATA",
          "PROTOCOL_AUDIT",
          "RBAC_MANAGEMENT",
          "USER_GUIDE",
        ].includes(p)
      )
  );

  const activePermissions = useMemo(() => {
    if (isDynamicPermissionsConfigured && currentRoleDef?.permissions) {
      return currentRoleDef.permissions as string[];
    }
    const roleId = currentUser.role_id || "ADMIN_RS";
    return (ROLE_ALLOWED_MENUS[roleId] || ROLE_ALLOWED_MENUS.ADMIN_RS) as string[];
  }, [isDynamicPermissionsConfigured, currentRoleDef, currentUser.role_id]);

  const isMenuAllowed = useCallback(
    (navId: NavSection) => {
      // Dashboard & Panduan Penggunaan selalu terbuka
      if (navId === "USER_GUIDE" || navId === "DASHBOARD") return true;

      // Cek apakah menu terdaftar pada izin role yang aktif
      if (activePermissions.includes(navId)) return true;

      // Untuk Clinical Screening jika sub-menu PE atau HPP diizinkan
      if (
        navId === "CLINICAL_SCREENING" &&
        (activePermissions.includes("PE_SCREENING") ||
          activePermissions.includes("HPP_SCREENING"))
      ) {
        return true;
      }

      return false;
    },
    [activePermissions]
  );

  // Jika menu yang sedang aktif tidak diizinkan untuk role saat ini, arahkan otomatis ke DASHBOARD
  useEffect(() => {
    if (data && isAuthenticated && !isMenuAllowed(activeNav)) {
      setActiveNav("DASHBOARD");
    }
  }, [data, isAuthenticated, activeNav, isMenuAllowed]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1329] text-white p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] p-8 text-center space-y-4 shadow-2xl">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-100">
              Memuat Sistem SIGAP...
            </h3>
            <p className="text-xs text-slate-400">
              Menghubungkan ke Backend API: <span className="font-mono text-blue-400">{API_BASE_URL}</span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            {API_BASE_URL.includes("localhost") ? (
              <>
                Jika proses ini memakan waktu, pastikan Backend API berjalan di port 4000 (<code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-slate-400">npm run dev:backend</code> atau <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-slate-400">npm run dev</code>).
              </>
            ) : (
              <>Menghubungkan ke server Backend di <span className="font-mono text-blue-400">{API_BASE_URL}</span></>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (apiError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f8fc] dark:bg-[#0b1329] p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#0f172a] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3>Koneksi Backend Terputus</h3>
              <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {API_BASE_URL.includes("localhost")
                  ? "Backend API di port 4000 belum aktif atau terputus"
                  : `Tidak dapat menjangkau server Backend (${API_BASE_URL})`}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-3 text-xs text-slate-600 dark:text-slate-300 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-800">
            {apiError}
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchBootstrap();
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2457d6] hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Hubungkan Ulang
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Jalankan perintah <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">npm run dev:backend</code> atau <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">npm run dev</code> di terminal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan Layar Login Penuh jika pengguna Logout atau belum Login
  if (!isAuthenticated) {
    return (
      <LoginPageView
        onLoginSuccess={(session) => handleLoginSuccess(session.user, session.token)}
      />
    );
  }

  const { db, enriched_admissions: admissions, active_protocol: activeProtocol } =
    data;
  const selectedAdmission: EnrichedAdmission | undefined =
    (admissions || []).find((a) => a.admission_id === selectedAdmissionId) ||
    admissions?.[0];

  const openAlerts = (db.alerts || []).filter((al) => al.status !== "RESOLVED");

  return (
    <ShadcnAppShell
      data={data}
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      selectedAdmission={selectedAdmission}
      setSelectedAdmissionId={setSelectedAdmissionId}
      setPreselectedPatientIdForAdm={setPreselectedPatientIdForAdm}
      currentUser={currentUser}
      isMenuAllowed={isMenuAllowed}
      openAlertsCount={openAlerts.length}
      onSyncApi={fetchBootstrap}
      onLogout={handleLogout}
    >
          {/* 0. DASHBOARD UTAMA (FR-18) */}
          {activeNav === "DASHBOARD" && (
            <DashboardOverviewView
              data={data}
              currentUserId={currentUserId}
              onNavigate={(section) => setActiveNav(section as NavSection)}
              onOpenScreening={(admissionId) => {
                setSelectedAdmissionId(admissionId);
                setActiveNav("CLINICAL_SCREENING");
              }}
              onOpenMonitoring={(admissionId) => {
                setSelectedAdmissionId(admissionId);
                setActiveNav("MONITORING_SBAR");
              }}
            />
          )}

          {/* 1A. MENU MASTER PASIEN (DATABASE INDUK PASIEN RS) */}
          {activeNav === "PATIENT_MASTER" && (
            <PatientMasterView
              data={data}
              currentUserId={currentUserId}
              onRefresh={fetchBootstrap}
              onProceedToAdmission={(patientId) => {
                setPreselectedPatientIdForAdm(patientId);
                setActiveNav("PATIENT_REGISTRATION");
              }}
            />
          )}

          {/* 1B. MENU PENDAFTARAN PASIEN (KEDATANGAN & ADMISI MASUK RS) */}
          {(activeNav === "PATIENT_REGISTRATION" || activeNav === "ADMISSION_INPUT") && (
            <PatientRegistrationView
              data={data}
              currentUserId={currentUserId}
              preselectedPatientId={preselectedPatientIdForAdm}
              onRefresh={fetchBootstrap}
              onProceedToScreening={(admId) => {
                setSelectedAdmissionId(admId);
                setActiveNav("CLINICAL_SCREENING");
              }}
              onProceedToMonitoring={(admId) => {
                setSelectedAdmissionId(admId);
                setActiveNav("MONITORING_SBAR");
              }}
              onNavigateToMasterPasien={() => setActiveNav("PATIENT_MASTER")}
            />
          )}

          {/* 2B. MENU RINGKASAN PASIEN PULANG (RPP) / DISCHARGE SUMMARY */}
          {activeNav === "PATIENT_DISCHARGE_RPP" && (
            <DischargeSummaryRppView
              db={db}
              activeProtocol={activeProtocol}
              currentUserId={currentUserId}
              onRefresh={fetchBootstrap}
              onNavigateScreening={(admId) => {
                setSelectedAdmissionId(admId);
                setActiveNav("CLINICAL_SCREENING");
              }}
            />
          )}

          {/* 3. JALUR SKRINING KLINIS TERPADU (PE & HPP - SESUAI TAMPILAN 2-KOLOM REFERENSI) */}
          {(activeNav === "CLINICAL_SCREENING" ||
            activeNav === "PE_SCREENING" ||
            activeNav === "HPP_SCREENING") && (
            <UnifiedClinicalScreeningView
              key={`unified-screening-${selectedAdmission?.admission_id || "default"}-${activeNav}`}
              initialAdmissionId={selectedAdmission?.admission_id}
              initialInstrument={activeNav === "HPP_SCREENING" ? "HPP" : "PE"}
              db={db}
              activeProtocol={activeProtocol}
              currentUserId={currentUserId}
              onRefresh={fetchBootstrap}
              onNavigateRpp={() => setActiveNav("PATIENT_DISCHARGE_RPP")}
              onNavigateAdmission={(admId) => {
                setSelectedAdmissionId(admId);
                setActiveNav("PATIENT_REGISTRATION");
              }}
              onNavigateMonitoring={(admId) => {
                setSelectedAdmissionId(admId);
                setActiveNav("MONITORING_SBAR");
              }}
            />
          )}

          {/* 4. MONITORING, KEHILANGAN DARAH KUMULATIF, CHECKLIST, ALERT & SBAR */}
          {activeNav === "MONITORING_SBAR" &&
            (selectedAdmission ? (
              <MonitoringSbarView
                key={`mon-${selectedAdmission.admission_id}`}
                admission={selectedAdmission}
                db={db}
                activeProtocol={activeProtocol}
                currentUserId={currentUserId}
                currentUserRole={currentUser.role_id}
                onRefresh={fetchBootstrap}
              />
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-2xs space-y-3">
                <Activity className="h-8 w-8 text-indigo-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Belum Ada Episode Admisi Pasien Aktif untuk Monitoring & SBAR
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Silakan daftarkan pasien terlebih dahulu di menu{" "}
                  <strong>1. Pendaftaran Pasien</strong> lalu buat episode
                  admisi di menu <strong>2. Input Episode Admisi</strong>.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveNav("PATIENT_MASTER")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50"
                  >
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>Master Pasien</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("PATIENT_REGISTRATION")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  >
                    <ClipboardPlus className="h-3.5 w-3.5" />
                    <span>Pendaftaran Pasien Masuk</span>
                  </button>
                </div>
              </div>
            ))}

          {/* 5. LAPORAN AUDIT MUTU & EVALUASI PENELITIAN (BAB 14) */}
          {activeNav === "REPORTS_RESEARCH" && (
            <GovernanceReportsView
              data={data}
              currentUserId={currentUserId}
              currentUserRole={currentUser.role_id}
              mode="REPORTS_RESEARCH"
              onRefresh={fetchBootstrap}
            />
          )}

          {/* 6. PROTOKOL KLINIS BERVERSI (VALIDATOR KLINIS) & AUDIT LOG */}
          {activeNav === "PROTOCOL_AUDIT" && (
            <GovernanceReportsView
              data={data}
              currentUserId={currentUserId}
              currentUserRole={currentUser.role_id}
              mode="PROTOCOL_AUDIT"
              onRefresh={fetchBootstrap}
            />
          )}

          {/* 7. MENU MASTER DATA TERPUSAT (DOKTER, BIDAN, UNIT, RUJUKAN, KELUHAN, RISIKO & LAB) */}
          {activeNav === "MASTER_DATA" && (
            <MasterDataView
              data={data}
              currentUserId={currentUserId}
              onRefresh={fetchBootstrap}
            />
          )}

          {/* 8. MENU MANAJEMEN RBAC & PENENTUAN LOGIN (FR-01, FR-02, BAB 3) */}
          {activeNav === "RBAC_MANAGEMENT" && (
            <RbacThreeColumnView
              data={data}
              currentUser={currentUser}
              onSwitchLoginUser={handleSwitchLoginUser}
              onRefresh={fetchBootstrap}
            />
          )}

          {/* 9. BUKU PANDUAN PENGGUNAAN KLINIS SIGAP */}
          {activeNav === "USER_GUIDE" && (
            <UserGuideView
              onNavigate={setActiveNav}
              userRole={currentUser.role_id}
            />
          )}
    </ShadcnAppShell>
  );
}
