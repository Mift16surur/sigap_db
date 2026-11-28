"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardPlus,
  Database,
  Droplets,
  Edit3,
  Eye,
  EyeOff,
  FileCheck,
  HeartPulse,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Stethoscope,
  Sun,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest, type BootstrapResponse, type EnrichedAdmission } from "@/services/api-client";
import type { User as UserType } from "@/types";

export type NavSection =
  | "DASHBOARD"
  | "PATIENT_MASTER"
  | "PATIENT_REGISTRATION"
  | "ADMISSION_INPUT"
  | "PATIENT_DISCHARGE_RPP"
  | "CLINICAL_SCREENING"
  | "PE_SCREENING"
  | "HPP_SCREENING"
  | "MONITORING_SBAR"
  | "REPORTS_RESEARCH"
  | "PROTOCOL_AUDIT"
  | "MASTER_DATA"
  | "RBAC_MANAGEMENT"
  | "USER_GUIDE";

interface NavItemConfig {
  id: NavSection;
  label: string;
  shortLabel: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: "default" | "destructive" | "outline" | "secondary";
}

export function ShadcnAppShell({
  data,
  activeNav,
  setActiveNav,
  selectedAdmission,
  setSelectedAdmissionId,
  setPreselectedPatientIdForAdm,
  currentUser,
  isMenuAllowed,
  openAlertsCount,
  onSyncApi,
  onLogout,
  children,
}: {
  data: BootstrapResponse;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  selectedAdmission?: EnrichedAdmission;
  setSelectedAdmissionId: (id: string) => void;
  setPreselectedPatientIdForAdm: (id: string | null) => void;
  currentUser: UserType;
  isMenuAllowed: (nav: NavSection) => boolean;
  openAlertsCount: number;
  onSyncApi: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const { db, enriched_admissions: admissions, active_protocol: activeProtocol } =
    data;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State Modal Profil Pengguna & Ubah Password
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [myFullName, setMyFullName] = useState<string>(currentUser.full_name || "");
  const [myTitle, setMyTitle] = useState<string>(currentUser.title_credentials || "");
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setMyFullName(currentUser.full_name || "");
    setMyTitle(currentUser.title_credentials || "");
  }, [currentUser]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "UPDATE_PROFILE",
          full_name: myFullName,
          title_credentials: myTitle,
        },
      });
      await onSyncApi();
      setProfileMsg({ text: "Profil berhasil diperbarui.", type: "success" });
      setTimeout(() => setProfileModalOpen(false), 1200);
    } catch (err: any) {
      setProfileMsg({ text: err.message || "Gagal memperbarui profil.", type: "error" });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "Konfirmasi kata sandi baru tidak cocok.", type: "error" });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ text: "Kata sandi baru minimal harus 4 karakter.", type: "error" });
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "CHANGE_PASSWORD",
          old_password: oldPassword,
          new_password: newPassword,
        },
      });
      await onSyncApi();
      setPasswordMsg({ text: "Kata sandi berhasil diperbarui.", type: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordModalOpen(false), 1200);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || "Gagal mengubah kata sandi.", type: "error" });
    } finally {
      setPasswordSaving(false);
    }
  }

  // State Notifikasi Drawer Sebelah Kanan
  const [notificationPanelOpen, setNotificationPanelOpen] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<
    "ALL" | "NO_ADMISSION" | "NO_SCREENING" | "ALERTS"
  >("ALL");

  // Komputasi Notifikasi Pasien: Baru di-input, Belum Admisi, Belum Skrining PE/HPP & Peringatan
  const notificationData = React.useMemo(() => {
    // 1. Pasien Baru Terdaftar yang Belum Ada Admisi
    const noAdmission = db.patients.filter(
      (p) => !db.admissions.some((a) => a.patient_id === p.patient_id)
    );

    // 2. Admisi Aktif yang Belum Diskrining Preeklampsia (PE)
    const noPeScreening = admissions.filter(
      (a) => a.status === "ACTIVE" && !a.latest_pe_result && !a.pe_screening
    );

    // 3. Admisi Aktif yang Belum Diskrining Perdarahan (HPP 4T)
    const noHppScreening = admissions.filter(
      (a) => a.status === "ACTIVE" && !a.latest_hpp_result && !a.hpp_screening
    );

    // 4. Kasus Kritis / Peringatan SBAR Terbuka
    const criticalAdmissions = admissions.filter(
      (a) =>
        a.status === "ACTIVE" &&
        (a.active_alerts_count > 0 ||
          a.latest_pe_result?.category === "HIGH" ||
          a.latest_hpp_result?.category === "HIGH")
    );

    const tasksCount =
      noAdmission.length + noPeScreening.length + noHppScreening.length;
    const totalCount = tasksCount + criticalAdmissions.length;

    return {
      noAdmission,
      noPeScreening,
      noHppScreening,
      criticalAdmissions,
      tasksCount,
      totalCount,
    };
  }, [db.patients, db.admissions, admissions]);

  // Multi-Tab Navigation State (Memungkinkan membuka dan berpindah tab dengan mudah)
  const [openTabs, setOpenTabs] = useState<NavSection[]>(() => [activeNav]);

  // Tambahkan tab ke bar jika user bernavigasi ke menu baru
  useEffect(() => {
    setOpenTabs((prev) => {
      if (prev.includes(activeNav)) return prev;
      return [...prev, activeNav];
    });
  }, [activeNav]);

  // Filter tab agar hanya menu yang diizinkan untuk role saat ini yang tampil
  useEffect(() => {
    setOpenTabs((prev) => {
      const allowed = prev.filter(
        (t) =>
          isMenuAllowed(t) ||
          (t === "CLINICAL_SCREENING" &&
            (isMenuAllowed("PE_SCREENING") || isMenuAllowed("HPP_SCREENING")))
      );
      const safeAllowed: NavSection[] =
        allowed.length === 0 ? (["DASHBOARD"] as NavSection[]) : allowed;
      if (
        safeAllowed.length === prev.length &&
        safeAllowed.every((val, idx) => val === prev[idx])
      ) {
        return prev;
      }
      return safeAllowed;
    });
  }, [isMenuAllowed]);

  // Handler menutup tab
  function handleCloseTab(tabId: NavSection, e: React.MouseEvent) {
    e.stopPropagation();
    if (openTabs.length <= 1) {
      if (activeNav !== "DASHBOARD") {
        setActiveNav("DASHBOARD");
        setOpenTabs(["DASHBOARD"]);
      }
      return;
    }

    const remaining = openTabs.filter((t) => t !== tabId);
    setOpenTabs(remaining);

    if (activeNav === tabId) {
      const closedIndex = openTabs.indexOf(tabId);
      const nextTab =
        remaining[Math.min(closedIndex, remaining.length - 1)] || "DASHBOARD";
      setActiveNav(nextTab);
    }
  }

  // Handler menutup tab lain (Close others)
  function handleCloseOtherTabs(tabId: NavSection, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenTabs([tabId]);
    setActiveNav(tabId);
  }

  // Load and apply theme
  useEffect(() => {
    const saved = localStorage.getItem("sigap_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("sigap_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("sigap_theme", "light");
      }
      return next;
    });
  }

  // Pengelompokan Menu Persis Sesuai Referensi Gambar (UTAMA, ALUR PELAYANAN, SKRINING, MUTU & KINERJA, SISTEM)
  const navGroups: Array<{
    groupLabel: string;
    items: NavItemConfig[];
  }> = React.useMemo(() => [
    {
      groupLabel: "UTAMA",
      items: [
        {
          id: "DASHBOARD",
          label: "Dashboard",
          shortLabel: "Ringkasan",
          group: "UTAMA",
          icon: LayoutDashboard,
          badge: openAlertsCount > 0 ? openAlertsCount : undefined,
          badgeVariant: "destructive",
        },
      ],
    },
    {
      groupLabel: "ALUR PELAYANAN",
      items: [
        {
          id: "PATIENT_MASTER",
          label: "Master Pasien",
          shortLabel: "Master",
          group: "ALUR PELAYANAN",
          icon: Users,
          badge: (db.patients || []).length > 0 ? db.patients.length : undefined,
          badgeVariant: "secondary",
        },
        {
          id: "PATIENT_REGISTRATION",
          label: "Pendaftaran Pasien",
          shortLabel: "Pendaftaran",
          group: "ALUR PELAYANAN",
          icon: ClipboardPlus,
          badge:
            (admissions || []).filter((a) => a.status === "ACTIVE").length > 0
              ? admissions.filter((a) => a.status === "ACTIVE").length
              : undefined,
          badgeVariant: "secondary",
        },
      ],
    },
    {
      groupLabel: "SKRINING & KLINIS",
      items: [
        {
          id: "CLINICAL_SCREENING",
          label: "Skrining",
          shortLabel: "Skrining",
          group: "SKRINING & KLINIS",
          icon: HeartPulse,
          badge:
            selectedAdmission?.latest_pe_result?.category === "HIGH" ||
            selectedAdmission?.latest_hpp_result?.category === "HIGH"
              ? "HIGH"
              : selectedAdmission?.latest_pe_result?.category ||
                selectedAdmission?.latest_hpp_result?.category,
          badgeVariant:
            selectedAdmission?.latest_pe_result?.category === "HIGH" ||
            selectedAdmission?.latest_hpp_result?.category === "HIGH"
              ? "destructive"
              : "outline",
        },
        {
          id: "MONITORING_SBAR",
          label: "Monitoring & SBAR",
          shortLabel: "Monitoring",
          group: "SKRINING & KLINIS",
          icon: Activity,
          badge:
            (selectedAdmission?.cumulative_blood_loss_ml ?? 0) > 0
              ? `${selectedAdmission?.cumulative_blood_loss_ml}mL`
              : undefined,
          badgeVariant: "secondary",
        },
        {
          id: "PATIENT_DISCHARGE_RPP",
          label: "Ringkasan Pasien (RingPas)",
          shortLabel: "RingPas",
          group: "SKRINING & KLINIS",
          icon: FileCheck,
          badge:
            (admissions || []).filter((a) => a.status === "CLOSED").length > 0
              ? admissions.filter((a) => a.status === "CLOSED").length
              : undefined,
          badgeVariant: "outline",
        },
      ],
    },
    {
      groupLabel: "MUTU & KINERJA",
      items: [
        {
          id: "MASTER_DATA",
          label: "Master Data & Faskes",
          shortLabel: "Master",
          group: "MUTU & KINERJA",
          icon: Database,
        },
        {
          id: "PROTOCOL_AUDIT",
          label: "Protokol & Audit Log",
          shortLabel: "Audit",
          group: "MUTU & KINERJA",
          icon: Settings,
          badge: activeProtocol?.version,
          badgeVariant: "outline",
        },
      ],
    },
    {
      groupLabel: "SISTEM",
      items: [
        {
          id: "RBAC_MANAGEMENT",
          label: "Hak Akses & Pengaturan",
          shortLabel: "RBAC",
          group: "SISTEM",
          icon: KeyRound,
        },
      ],
    },
    {
      groupLabel: "BANTUAN & PANDUAN",
      items: [
        {
          id: "USER_GUIDE",
          label: "Panduan Penggunaan",
          shortLabel: "Panduan",
          group: "BANTUAN & PANDUAN",
          icon: BookOpen,
          badge: "Buku Panduan",
          badgeVariant: "secondary",
        },
      ],
    },
  ], [
    openAlertsCount,
    (db.patients || []).length,
    admissions,
    selectedAdmission?.admission_id,
    selectedAdmission?.latest_pe_result?.category,
    selectedAdmission?.latest_hpp_result?.category,
    selectedAdmission?.cumulative_blood_loss_ml,
    activeProtocol?.version,
  ]);

  const allItems = React.useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);
  const currentNavConfig =
    allItems.find((i) => i.id === activeNav) || allItems[0];

  // Filter menu berdasarkan permission role aktif: sembunyikan total menu & kelompok yang tidak diizinkan
  const visibleNavGroups = React.useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          return (
            isMenuAllowed(item.id) ||
            (item.id === "CLINICAL_SCREENING" &&
              (isMenuAllowed("PE_SCREENING") || isMenuAllowed("HPP_SCREENING")))
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, isMenuAllowed]);

  const userInitials =
    currentUser.full_name
      .replace(/^(dr\.|Dr\.|Bd\.|Bdn\.|Ns\.)\s*/gi, "")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "S";

  const userRoleLabel =
    currentUser.role_id === "ADMIN_RS"
      ? "Super Admin"
      : currentUser.role_id === "ADMIN_TI"
      ? "Admin TI"
      : currentUser.role_id === "BIDAN_PERAWAT"
      ? "Bidan Koordinator"
      : currentUser.role_id === "DOKTER"
      ? "Dokter DPJP"
      : currentUser.role_id;

  // Sidebar Component Sesuai Referensi Gambar Mulus & Profesional
  const sidebarContent = (
    <div
      className={`flex h-full flex-col justify-between select-none bg-gradient-to-b from-[#dbe9fb] via-[#eaf2fd] to-[#d8e6f9] dark:from-[#091536] dark:via-[#0d1d49] dark:to-[#08122e] rounded-3xl border-2 border-blue-200/90 dark:border-blue-900/90 shadow-[0_4px_20px_rgba(20,60,160,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        isCollapsed ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <div
        className={`flex flex-col min-h-0 flex-1 ${
          isCollapsed ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        {/* HEADER BRAND (Klik Icon Logo untuk Perkecil / Perbesar Sidebar) */}
        <div
          className={`flex h-16 shrink-0 items-center ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          } pt-1`}
        >
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={
                isCollapsed
                  ? "Klik icon untuk memperbesar sidebar"
                  : "Klik icon untuk memperkecil sidebar"
              }
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group rounded-xl p-1 -ml-1 hover:bg-white/60 dark:hover:bg-blue-950/40 transition-all select-none"
            >
              {/* Square white hospital logo card tile yang clickable */}
              <div className="h-9 w-9 shrink-0 rounded-xl bg-white dark:bg-[#0c183a] shadow-xs border-2 border-blue-200/90 dark:border-blue-700/80 flex items-center justify-center p-0.5 overflow-hidden group-hover:scale-105 group-hover:border-blue-400 group-active:scale-95 transition-all">
                <img
                  src="/logo.png"
                  alt="Logo SIGAP App"
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-black text-slate-900 dark:text-white truncate tracking-tight group-hover:text-[#185adb] dark:group-hover:text-blue-400 transition-colors">
                    SIGAP App
                  </h2>
                </div>
              )}
            </button>

            {isCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-2 h-2 rotate-45 -mr-1 bg-slate-900 dark:bg-white border-l border-b border-slate-900 dark:border-white shadow-xs shrink-0" />
                <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 whitespace-nowrap border border-slate-800 dark:border-slate-100">
                  <span className="text-xs font-bold tracking-wide">
                    SIGAP App · Klik untuk Buka Menu
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DAFTAR MENU (Floating Pill Sesuai Referensi Gambar Profesional) */}
        <div
          className={`p-3 space-y-3 flex-1 scrollbar-none ${
            isCollapsed ? "overflow-visible" : "overflow-y-auto"
          }`}
        >
          {visibleNavGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-black text-blue-900/70 dark:text-blue-300/70 uppercase tracking-widest">
                  {group.groupLabel}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeNav === item.id ||
                    (item.id === "CLINICAL_SCREENING" &&
                      (activeNav === "PE_SCREENING" || activeNav === "HPP_SCREENING"));

                  if (isCollapsed) {
                    return (
                      <div key={item.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNav(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
                            isActive
                              ? "bg-white dark:bg-[#0c183a] text-[#185adb] dark:text-blue-400 shadow-xs font-bold border-2 border-blue-300 dark:border-blue-700"
                              : "text-blue-900/70 dark:text-blue-300/70 hover:text-blue-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>

                        {/* FLOATING HOVER MENU LABEL SAAT SIDEBAR DIPERKECIL */}
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 animate-in fade-in zoom-in-95 duration-150">
                          {/* Segitiga Panah Arah Kiri */}
                          <div className="w-2 h-2 rotate-45 -mr-1 bg-slate-900 dark:bg-white border-l border-b border-slate-900 dark:border-white shadow-xs shrink-0" />

                          {/* Kartu Floating Label Menu */}
                          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 whitespace-nowrap border border-slate-800 dark:border-slate-100">
                            <span className="text-xs font-bold tracking-wide">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/30 dark:bg-blue-100 text-blue-300 dark:text-blue-700 font-mono font-bold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left transition-all cursor-pointer"
                    >
                      {isActive ? (
                        /* Active Menu Item: Clean elevated white pill card with vertical blue indicator bar */
                        <div className="bg-white dark:bg-[#0c183a] shadow-xs rounded-2xl py-2 px-2.5 flex items-center justify-between transition-all border-2 border-blue-300 dark:border-blue-700">
                          <div className="flex items-center min-w-0">
                            <span className="w-1.5 h-4.5 rounded-full bg-[#185adb] dark:bg-blue-500 mr-2.5 shrink-0" />
                            <Icon className="h-4 w-4 text-[#185adb] dark:text-blue-400 shrink-0 mr-2.5" />
                            <span className="text-xs font-black text-[#185adb] dark:text-blue-400 truncate">
                              {item.label}
                            </span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#185adb] dark:text-blue-300 font-mono font-bold border border-blue-200">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Inactive Menu Item: Clean Minimalist with Subtle Hover & Chevron */
                        <div className="text-slate-800 dark:text-slate-200 hover:text-[#185adb] dark:hover:text-white hover:bg-white/80 dark:hover:bg-[#0c183a]/80 rounded-2xl py-2 px-3 flex items-center justify-between text-xs font-bold transition-all group border border-transparent hover:border-blue-200/60 dark:hover:border-blue-800/60 hover:shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0 pl-1">
                            <Icon className="h-4 w-4 text-blue-800/60 dark:text-blue-300/60 shrink-0 group-hover:text-[#185adb] dark:group-hover:text-blue-300 transition-colors" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 text-blue-700/50 dark:text-blue-300/50 shrink-0 group-hover:text-[#185adb] transition-colors" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER SIDEBAR (© 2026 SIGAP App - Klik untuk Info Pembuat Aplikasi) */}
      <div className={`h-12 border-t-2 border-blue-200/80 dark:border-blue-900/80 px-3 flex items-center ${isCollapsed ? "justify-center" : "justify-between"} text-[11px] text-blue-900/80 dark:text-blue-300/80 font-bold select-none bg-blue-50/40 dark:bg-blue-950/20`}>
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-2 p-1.5 -ml-1 rounded-xl text-blue-900/80 dark:text-blue-300/80 hover:text-blue-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-blue-900/50 transition-all cursor-pointer group w-full justify-between"
            title="Klik untuk info pembuat aplikasi"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 shadow-2xs flex items-center justify-center p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src="/synergy-dynamics-logo.png"
                  alt="Synergy Dynamics Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="truncate group-hover:underline">&copy; 2026 SIGAP App</span>
            </div>
            <Info className="h-3.5 w-3.5 text-blue-600/70 dark:text-blue-400/70 shrink-0 group-hover:text-blue-700" />
          </button>
        ) : (
          <div className="relative group">
            <button
              type="button"
              onClick={() => setAboutModalOpen(true)}
              className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 border-2 border-blue-200/90 dark:border-blue-800 shadow-2xs flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <img
                src="/synergy-dynamics-logo.png"
                alt="Synergy Dynamics Logo"
                className="h-full w-full object-contain"
              />
            </button>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-2 h-2 rotate-45 -mr-1 bg-slate-900 dark:bg-white border-l border-b border-slate-900 dark:border-white shadow-xs shrink-0" />
              <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 whitespace-nowrap border border-slate-800 dark:border-slate-100">
                <span className="text-xs font-bold tracking-wide">
                  Info Pembuat: Miftahus Surur · SIGAP v1
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f1f5fd] via-[#f7faff] to-[#edf4fc] dark:from-[#060b1c] dark:via-[#081028] dark:to-[#050917] text-[#17243b] dark:text-[#f1f5f9] transition-colors duration-200">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <div
          className={`fixed inset-y-0 left-0 z-30 p-2.5 transition-all duration-300 ease-in-out ${
            isCollapsed ? "w-[76px]" : "w-[264px]"
          }`}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[276px] max-w-[85vw] h-full shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-4 z-20 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 shadow-xs"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ============================================================== */}
        {/* TOPBAR (Persis Sesuai Gambar Referensi 2)                      */}
        {/* Hamburger + Search Box ⌘K + Bell + User Profile Dropdown       */}
        {/* ============================================================== */}
        <div className="p-2.5 pb-0 lg:p-3 lg:pb-0 shrink-0 sticky top-0 z-20 backdrop-blur-md">
          <header className="flex h-16 shrink-0 items-center justify-between rounded-2xl lg:rounded-3xl border-2 border-blue-200/90 dark:border-blue-900/90 bg-gradient-to-r from-[#dbe9fb] via-[#eaf2fd] to-[#d8e6f9] dark:from-[#091536] dark:via-[#0d1d49] dark:to-[#08122e] px-4 lg:px-6 shadow-[0_4px_20px_rgba(20,60,160,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
            {/* Sisi Kiri: Hamburger Menu + Search Bar dengan Shortcut ⌘K */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    setIsCollapsed(!isCollapsed);
                  } else {
                    setMobileMenuOpen(true);
                  }
                }}
                title="Menu Navigasi"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-[#0c183a] text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-xs transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Kotak Pencarian Global Kontras Tegas */}
              <div className="relative w-44 sm:w-72 lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <input
                  type="text"
                  placeholder="Cari menu..."
                  className="w-full h-9 rounded-full border-2 border-blue-200/90 dark:border-blue-800 bg-white dark:bg-[#08122c] pl-8 pr-12 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:border-[#2457d6] focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all"
                />
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 shadow-2xs">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Notifikasi, Sync & Dropdown User Profile */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Tombol Sinkronisasi Data */}
              <button
                type="button"
                onClick={onSyncApi}
                title="Sinkronkan Backend API"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0c183a] text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-xs transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {/* Ikon Bell Notifikasi Tunggal dengan Animasi Menyala / Berkedip */}
              <button
                type="button"
                onClick={() => {
                  setNotifFilter("ALL");
                  setNotificationPanelOpen(!notificationPanelOpen);
                }}
                title="Buka Pusat Notifikasi & Tindak Lanjut Pasien"
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  notificationPanelOpen
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                    : "border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0c183a] text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-xs"
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
                {notificationData.totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center">
                    {/* Animasi memancar radar ping */}
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80" />
                    {/* Bola oranye-merah menyala gradasi dengan efek glow berkedip beacon */}
                    <span className="relative inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white text-[10px] font-black font-mono shadow-lg shadow-red-500/80 ring-2 ring-white dark:ring-[#070e24] animate-glowing-beacon">
                      {notificationData.totalCount > 99 ? "99+" : notificationData.totalCount}
                    </span>
                  </span>
                )}
              </button>

              {/* User Profile Pill & Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0c183a] hover:border-blue-400 dark:hover:border-blue-600 shadow-xs transition-colors text-left group cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-[#1d4ed8] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-blue-500/30">
                    {userInitials}
                  </div>
                  <div className="hidden sm:block leading-tight text-right pr-0.5">
                    <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-[#2457d6] transition-colors truncate max-w-[130px]">
                      {currentUser.username || "superadmin"}
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                      {userRoleLabel}
                    </div>
                  </div>
                </button>

              {/* FLOATING DROPDOWN CARD (Sesuai Gambar 2: Profil Lengkap, Edit Profile, Ubah Password, Mode Gelap, Keluar) */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-11 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Info Pengguna */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 mb-1 border border-slate-100 dark:border-slate-800/80">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 text-[#2457d6] dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {currentUser.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {userRoleLabel}
                      </div>
                    </div>
                  </div>

                  {/* Daftar Aksi Menu */}
                  <div className="py-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav("USER_GUIDE");
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-blue-600 dark:text-blue-400 font-bold"
                    >
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Buku Panduan SIGAP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMsg(null);
                        setMyFullName(currentUser.full_name || "");
                        setMyTitle(currentUser.title_credentials || "");
                        setProfileModalOpen(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      <span>Profil Pengguna</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMsg(null);
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordModalOpen(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4 text-slate-400" />
                      <span>Ubah Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Moon className="h-4 w-4 text-slate-400" />
                        )}
                        <span>{isDark ? "Mode Terang" : "Mode Gelap"}</span>
                      </div>
                    </button>
                  </div>

                  {/* Tombol Keluar (Merah) Sesuai Gambar 2 */}
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left text-xs font-semibold transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        </div>

        {/* ============================================================== */}
        {/* SUB-HEADER MULTI-TAB BAR (Dapat berpindah & menutup tab mudah) */}
        {/* ============================================================== */}
        <div className="mx-2.5 lg:mx-3 mt-2 rounded-2xl border border-blue-200/90 dark:border-blue-950/70 bg-gradient-to-r from-blue-100/70 via-white/80 to-blue-100/60 dark:from-[#060c20] dark:via-[#091433] dark:to-[#060c20] px-3.5 lg:px-4 py-1.5 flex items-center justify-between gap-2 overflow-hidden shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
            {openTabs.map((tabId) => {
              const config =
                allItems.find((i) => i.id === tabId) ||
                (tabId === "PE_SCREENING" || tabId === "HPP_SCREENING"
                  ? allItems.find((i) => i.id === "CLINICAL_SCREENING")
                  : tabId === "ADMISSION_INPUT"
                  ? allItems.find((i) => i.id === "PATIENT_REGISTRATION")
                  : undefined);
              if (!config) return null;
              const Icon = config.icon;
              const isActive =
                activeNav === tabId ||
                (config.id === "CLINICAL_SCREENING" &&
                  (activeNav === "PE_SCREENING" ||
                    activeNav === "HPP_SCREENING" ||
                    activeNav === "CLINICAL_SCREENING"));
              const isOnlyOne = openTabs.length === 1;

              return (
                <div
                  key={tabId}
                  onClick={() => setActiveNav(tabId)}
                  className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs cursor-pointer select-none transition-all border shrink-0 ${
                    isActive
                      ? "bg-white dark:bg-[#0e1b3d] border-blue-300 dark:border-blue-600/70 text-[#1d4ed8] dark:text-blue-300 shadow-xs font-black ring-2 ring-blue-500/15"
                      : "bg-white/40 dark:bg-slate-800/30 border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:text-[#1d4ed8] dark:hover:text-blue-300 hover:border-blue-200/60 font-semibold"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive
                        ? "text-[#1d4ed8] dark:text-blue-400"
                        : "text-slate-400 group-hover:text-blue-600"
                    }`}
                  />
                  <span className="whitespace-nowrap">{config.label}</span>

                  {/* Tombol Tutup Tab (✕) */}
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tabId, e)}
                    title={isOnlyOne ? "Kembali ke Dashboard" : `Tutup tab ${config.label}`}
                    className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ml-0.5 ${
                      isActive
                        ? "text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                        : "opacity-40 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {openTabs.length > 2 && (
            <button
              type="button"
              onClick={(e) => handleCloseOtherTabs(activeNav, e)}
              className="hidden sm:inline-flex text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold shrink-0 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors border border-transparent hover:border-blue-200"
              title="Tutup semua tab lain kecuali tab aktif"
            >
              Tutup Tab Lain
            </button>
          )}
        </div>

        {/* WORKSPACE CONTENT */}
        <main className="p-4 lg:p-6 w-full space-y-6">
          {children}
        </main>
      </div>

      {/* ============================================================== */}
      {/* DRAWER NOTIFIKASI DI SEBELAH KANAN                            */}
      {/* ============================================================== */}
      {notificationPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur Gelap */}
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setNotificationPanelOpen(false)}
          />

          {/* Sliding Panel Kanan */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
            <div className="w-screen max-w-md bg-white dark:bg-[#0c1630] shadow-2xl border-l border-blue-100 dark:border-blue-950/80 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Header Notifikasi */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 dark:from-[#0d1c42] dark:via-[#0c1630] dark:to-[#0d1c42] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white shadow-md shadow-blue-500/25">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Notifikasi & Antrean Pasien</span>
                      {notificationData.totalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-mono font-black">
                          {notificationData.totalCount}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                        Update Real-Time Aktif
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationPanelOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs bg-slate-50/60 dark:bg-slate-900/40 shrink-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setNotifFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    notifFilter === "ALL"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  Semua ({notificationData.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter("NO_ADMISSION")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    notifFilter === "NO_ADMISSION"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  Belum Admisi ({notificationData.noAdmission.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter("NO_SCREENING")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    notifFilter === "NO_SCREENING"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  Belum Skrining ({notificationData.noPeScreening.length + notificationData.noHppScreening.length})
                </button>
                {notificationData.criticalAdmissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifFilter("ALERTS")}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      notifFilter === "ALERTS"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    }`}
                  >
                    Peringatan ({notificationData.criticalAdmissions.length})
                  </button>
                )}
              </div>

              {/* Notification Content List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notificationData.totalCount === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2 my-auto">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                      Semua Pasien Terlayani!
                    </p>
                    <p className="text-xs text-slate-400">
                      Tidak ada antrean pasien yang belum di-admisi atau belum diskrining saat ini.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. KASUS KRITIS / ALERT KLINIS */}
                    {(notifFilter === "ALL" || notifFilter === "ALERTS") &&
                      notificationData.criticalAdmissions.map((adm) => (
                        <div
                          key={`crit-${adm.admission_id}`}
                          className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 space-y-2.5 ring-1 ring-red-400/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black font-mono">
                              ALERT KLINIS
                            </span>
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              {adm.unit?.name || "VK Bersalin"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {adm.patient?.full_name || "Pasien"} (RM: {adm.patient?.mrn || adm.patient_id})
                            </h4>
                            <p className="text-[11px] text-red-700 dark:text-red-300 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                              <span>Hasil skrining kategori Risiko Tinggi / Perlu Intervensi SBAR</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-red-200/80 dark:border-red-900/50">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdmissionId(adm.admission_id);
                                setActiveNav("MONITORING_SBAR");
                                setNotificationPanelOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <Activity className="h-3.5 w-3.5" />
                              <span>Buka Monitoring SBAR</span>
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* 2. PASIEN BARU YANG BELUM INPUT ADMISI */}
                    {(notifFilter === "ALL" || notifFilter === "NO_ADMISSION") &&
                      notificationData.noAdmission.map((pat) => (
                        <div
                          key={`pat-${pat.patient_id}`}
                          className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold font-mono">
                                RM: {pat.mrn}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                PASIEN BARU
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {pat.age_years || 25} Tahun
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {pat.full_name}
                            </h4>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Pasien baru terdaftar, belum di-input episode admisi rawat inap</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/30">
                            <button
                              type="button"
                              onClick={() => {
                                setPreselectedPatientIdForAdm(pat.patient_id);
                                setActiveNav("ADMISSION_INPUT");
                                setNotificationPanelOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <ClipboardPlus className="h-3.5 w-3.5" />
                              <span>+ Input Admisi Sekarang</span>
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* 3. ADMISI AKTIF BELUM DISKRINING PREEKLAMPSIA (PE) */}
                    {(notifFilter === "ALL" || notifFilter === "NO_SCREENING") &&
                      notificationData.noPeScreening.map((adm) => (
                        <div
                          key={`no-pe-${adm.admission_id}`}
                          className="p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
                              RM: {adm.patient?.mrn || adm.patient_id}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {adm.unit?.name || "VK Kamar Bersalin"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {adm.patient?.full_name || "Pasien Rawat Inap"}
                            </h4>
                            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                              <span>Pasien admisi aktif belum dilakukan Skrining Preeklampsia</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-900/30">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdmissionId(adm.admission_id);
                                setActiveNav("CLINICAL_SCREENING");
                                setNotificationPanelOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <Stethoscope className="h-3.5 w-3.5" />
                              <span>Mulai Skrining PE</span>
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* 4. ADMISI AKTIF BELUM DISKRINING PERDARAHAN (HPP 4T) */}
                    {(notifFilter === "ALL" || notifFilter === "NO_SCREENING") &&
                      notificationData.noHppScreening.map((adm) => (
                        <div
                          key={`no-hpp-${adm.admission_id}`}
                          className="p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold font-mono">
                              RM: {adm.patient?.mrn || adm.patient_id}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {adm.unit?.name || "VK Kamar Bersalin"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {adm.patient?.full_name || "Pasien Rawat Inap"}
                            </h4>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                              <Droplets className="h-3.5 w-3.5 shrink-0" />
                              <span>Pasien admisi aktif belum dilakukan Skrining Risiko HPP 4T</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdmissionId(adm.admission_id);
                                setActiveNav("CLINICAL_SCREENING");
                                setNotificationPanelOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <Droplets className="h-3.5 w-3.5" />
                              <span>Mulai Skrining HPP</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav("PATIENT_REGISTRATION");
                    setNotificationPanelOpen(false);
                  }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  <span>Buka Master Pasien</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationPanelOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL INFORMASI PEMBUAT APLIKASI (DEVELOPER ABOUT MODAL)
         ========================================================================= */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 text-center animate-in zoom-in-95 duration-200">
            {/* Tombol Tutup X di Sudut Kanan Atas */}
            <button
              type="button"
              onClick={() => setAboutModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Logo Synergy Dynamics */}
            <div className="w-24 h-24 mx-auto rounded-2xl bg-white p-2.5 shadow-md border-2 border-blue-100 dark:border-blue-900/50 flex items-center justify-center overflow-hidden">
              <img
                src="/synergy-dynamics-logo.png"
                alt="Synergy Dynamics - Integrated Solutions"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Badge Versi */}
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider border border-blue-200 dark:border-blue-800">
                SIGAP v1
              </span>
            </div>

            {/* Judul & Deskripsi Aplikasi */}
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                SIGAP v1
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Sistem Terpadu Deteksi Dini Risiko Preeklamsia &amp; Perdarahan Pascasalin (HPP 4T) Kamar Bersalin
              </p>
            </div>

            {/* Kotak Informasi Pembuat / Pengembang */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Nama Aplikasi:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">SIGAP v1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Pengembang / Pembuat:</span>
                <span className="font-black text-[#185adb] dark:text-blue-400 text-sm">Miftahus Surur</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Publisher / Organisasi:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Synergy Dynamics</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Divisi Solusi:</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">Integrated Solutions</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Hak Cipta:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">&copy; 2026 SIGAP App</span>
              </div>
            </div>

            {/* Tombol Aksi Tutup */}
            <button
              type="button"
              onClick={() => setAboutModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#2457d6] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
            >
              Tutup Informasi
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL PROFIL PENGGUNA (EDIT NAMA & GELAR MANDIRI)
         ========================================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Profil Pengguna
                  </h3>
                  <p className="text-[11px] text-slate-500">Kelola identitas dan akun Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
                    : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200"
                }`}
              >
                {profileMsg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.username}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-slate-500 font-mono cursor-not-allowed text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Peran / Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.role_id}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-slate-500 font-mono cursor-not-allowed text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={myFullName}
                  onChange={(e) => setMyFullName(e.target.value)}
                  placeholder="Nama lengkap dan titel"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gelar / Kredensial Medis
                </label>
                <input
                  type="text"
                  value={myTitle}
                  onChange={(e) => setMyTitle(e.target.value)}
                  placeholder="Contoh: Bidan Pelaksana VK, S.Tr.Keb / dr. Sp.OG"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-xl bg-[#2457d6] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {profileSaving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL UBAH PASSWORD MANDIRI
         ========================================================================= */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ubah Kata Sandi
                  </h3>
                  <p className="text-[11px] text-slate-500">Perbarui kata sandi akun @{currentUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  passwordMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
                    : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200"
                }`}
              >
                {passwordMsg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showOldPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showNewPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Kata Sandi Baru *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showConfirmPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2 rounded-xl bg-[#2457d6] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {passwordSaving ? "Menyimpan..." : "Perbarui Kata Sandi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
