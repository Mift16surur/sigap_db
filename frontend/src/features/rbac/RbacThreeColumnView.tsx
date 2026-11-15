"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardPlus,
  Database,
  Droplets,
  Edit,
  Eye,
  EyeOff,
  FileCheck,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/services/api-client";
import type { User as UserType, UserRole } from "@/types";

interface RbacThreeColumnViewProps {
  data: BootstrapResponse;
  currentUser: UserType;
  onRefresh: () => Promise<void>;
  onSwitchLoginUser?: (user: UserType) => Promise<void>;
}

interface MenuItemDef {
  id: string;
  code: string;
  label: string;
  path: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultScope: string;
}

export function RbacThreeColumnView({
  data,
  currentUser,
  onRefresh,
  onSwitchLoginUser,
}: RbacThreeColumnViewProps) {
  const { db } = data;
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Floating Toast Notification State
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!toast?.show) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (
    title: string,
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ show: true, title, message, type });
  };

  // Filter Search State
  const [userSearch, setUserSearch] = useState<string>("");
  const [menuSearch, setMenuSearch] = useState<string>("");

  // Selected States
  const [selectedUserId, setSelectedUserId] = useState<string>(
    db.users[0]?.user_id || "usr-admin-01"
  );
  const [activeTab, setActiveTab] = useState<"ROLE_PERMISSION" | "APP_MENU">(
    "ROLE_PERMISSION"
  );

  // Modal Tambah User
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newFullName, setNewFullName] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("Staf Administrasi");
  const [newRole, setNewRole] = useState<UserRole>("ADMIN_RS");
  const [newUnitId, setNewUnitId] = useState<string>("unit-manajemen");
  const [newPassword, setNewPassword] = useState<string>("sigap2026");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Modal Edit User
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("BIDAN_PERAWAT");
  const [editUnitId, setEditUnitId] = useState<string>("unit-vk");
  const [editPassword, setEditPassword] = useState<string>("");
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);

  // Modal Delete User
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);

  // Selected User Object
  const selectedUser =
    db.users.find((u) => u.user_id === selectedUserId) || db.users[0];

  // Selected Role Object based on selected user
  const selectedRole =
    db.roles.find((r) => r.role_id === selectedUser?.role_id) || db.roles[0];

  // State untuk Modal / Popover Akses Spesifik Scope (CRUD)
  const [selectedScopeMenu, setSelectedScopeMenu] = useState<MenuItemDef | null>(null);
  const [menuScopes, setMenuScopes] = useState<Record<string, string[]>>({
    DASHBOARD: ["VIEW"],
    PATIENT_REGISTRATION: ["VIEW", "CREATE", "UPDATE"],
    ADMISSION_INPUT: ["VIEW", "CREATE"],
    PE_SCREENING: ["VIEW", "CREATE", "UPDATE", "APPROVE"],
    HPP_SCREENING: ["VIEW", "CREATE", "UPDATE", "APPROVE"],
    MONITORING_SBAR: ["VIEW", "CREATE", "UPDATE"],
    MASTER_DATA: ["VIEW", "CREATE", "UPDATE", "EXPORT"],
    PROTOCOL_AUDIT: ["VIEW", "UPDATE", "EXPORT"],
    RBAC_MANAGEMENT: ["VIEW", "UPDATE"],
  });

  // Role Catalog Data: Cukup 3 Role Utama Sesuai Kebutuhan Rumah Sakit (Bidan, Dokter, Admin/IT)
  const availableRoles: Array<{
    role_id: UserRole;
    name: string;
    alias: string;
    description: string;
    badge: string;
  }> = [
    {
      role_id: "BIDAN_PERAWAT",
      name: "Bidan",
      alias: "Bidan & Perawat Obstetri",
      description: "Pendaftaran pasien, input skrining PE & HPP 4T, monitoring tanda vital, dan eskalasi SBAR",
      badge: "KLINIS",
    },
    {
      role_id: "DOKTER",
      name: "Dokter",
      alias: "Dokter Spesialis Obgyn (Sp.OG) / DPJP",
      description: "Review & verifikasi skrining klinis, instruksi tatalaksana medis, dan konfirmasi tindakan darurat",
      badge: "SPESIALIS",
    },
    {
      role_id: "ADMIN_RS",
      name: "Admin / IT",
      alias: "Administrator Sistem & TI Rumah Sakit",
      description: "Pengelolaan akun staf, hak akses wewenang, master data faskes, dan pemeliharaan sistem",
      badge: "ADMINISTRATOR",
    },
  ];

  // Definisi Struktur Menu Aplikasi (Persis 100% Sama dengan Sidebar Navigasi SIGAP)
  const appMenus: MenuItemDef[] = [
    {
      id: "menu-dashboard",
      code: "DASHBOARD",
      label: "Dashboard",
      path: "/dashboard",
      group: "UTAMA",
      icon: LayoutDashboard,
      defaultScope: "0/1 scope",
    },
    {
      id: "menu-pasien-master",
      code: "PATIENT_MASTER",
      label: "Master Pasien",
      path: "/master-pasien",
      group: "ALUR PELAYANAN",
      icon: Users,
      defaultScope: "0/4 scope",
    },
    {
      id: "menu-pasien-reg",
      code: "PATIENT_REGISTRATION",
      label: "Pendaftaran Pasien",
      path: "/pendaftaran-pasien",
      group: "ALUR PELAYANAN",
      icon: ClipboardPlus,
      defaultScope: "0/3 scope",
    },
    {
      id: "menu-skrining",
      code: "CLINICAL_SCREENING",
      label: "Skrining",
      path: "/skrining",
      group: "SKRINING & KLINIS",
      icon: HeartPulse,
      defaultScope: "0/4 scope",
    },
    {
      id: "menu-monitoring",
      code: "MONITORING_SBAR",
      label: "Monitoring & SBAR",
      path: "/monitoring-sbar",
      group: "SKRINING & KLINIS",
      icon: Activity,
      defaultScope: "0/3 scope",
    },
    {
      id: "menu-ringkasan",
      code: "PATIENT_DISCHARGE_RPP",
      label: "Ringkasan Pasien",
      path: "/ringkasan-pasien",
      group: "SKRINING & KLINIS",
      icon: FileCheck,
      defaultScope: "0/3 scope",
    },
    {
      id: "menu-master",
      code: "MASTER_DATA",
      label: "Master Data & Faskes",
      path: "/master-data",
      group: "MUTU & KINERJA",
      icon: Database,
      defaultScope: "0/5 scope",
    },
    {
      id: "menu-protokol",
      code: "PROTOCOL_AUDIT",
      label: "Protokol & Audit Log",
      path: "/protokol-audit",
      group: "MUTU & KINERJA",
      icon: Settings,
      defaultScope: "0/3 scope",
    },
    {
      id: "menu-rbac",
      code: "RBAC_MANAGEMENT",
      label: "Hak Akses & Pengaturan",
      path: "/hak-akses",
      group: "SISTEM",
      icon: KeyRound,
      defaultScope: "0/2 scope",
    },
    {
      id: "menu-panduan",
      code: "USER_GUIDE",
      label: "Panduan Penggunaan",
      path: "/panduan",
      group: "BANTUAN & PANDUAN",
      icon: BookOpen,
      defaultScope: "0/1 scope",
    },
  ];

  // Default Fallback Izin Menu jika belum dikonfigurasi kustom di database
  const DEFAULT_ROLE_MENU_PERMISSIONS: Record<string, string[]> = {
    BIDAN_PERAWAT: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "CLINICAL_SCREENING",
      "MONITORING_SBAR",
      "PATIENT_DISCHARGE_RPP",
      "MASTER_DATA",
      "USER_GUIDE",
    ],
    DOKTER: [
      "DASHBOARD",
      "PATIENT_MASTER",
      "PATIENT_REGISTRATION",
      "CLINICAL_SCREENING",
      "MONITORING_SBAR",
      "PATIENT_DISCHARGE_RPP",
      "MASTER_DATA",
      "USER_GUIDE",
    ],
    ADMIN_RS: [
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
    ],
    ADMIN_TI: [
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
    ],
  };

  const currentRolePerms =
    selectedRole?.permissions &&
    selectedRole.permissions.length > 0 &&
    selectedRole.permissions.some((p) => appMenus.some((m) => m.code === p))
      ? selectedRole.permissions
      : DEFAULT_ROLE_MENU_PERMISSIONS[selectedRole?.role_id] ||
        appMenus.map((m) => m.code);

  const navGroupsOrder = [
    "UTAMA",
    "ALUR PELAYANAN",
    "SKRINING & KLINIS",
    "MUTU & KINERJA",
    "SISTEM",
    "BANTUAN & PANDUAN",
  ];

  // Filter Users
  const filteredUsers = db.users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.role_id.toLowerCase().includes(q)
    );
  });

  // Filter Menus
  const filteredMenus = appMenus.filter((m) => {
    const q = menuSearch.toLowerCase();
    return (
      m.label.toLowerCase().includes(q) ||
      m.path.toLowerCase().includes(q) ||
      m.group.toLowerCase().includes(q)
    );
  });

  // Action: Ubah Role User Terpilih (Kolom 2)
  async function handleChangeUserRole(newRoleId: UserRole) {
    if (!selectedUser) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "UPDATE_USER_RBAC",
          target_user_id: selectedUser.user_id,
          role_id: newRoleId,
        },
      });

      await onRefresh();
      const targetRoleDef = availableRoles.find((r) => r.role_id === newRoleId);
      const roleName = targetRoleDef ? targetRoleDef.name : newRoleId;
      const successText = `Role pengguna @${selectedUser.username} (${selectedUser.full_name}) berhasil diubah menjadi ${roleName}.`;
      setFeedbackMsg(successText);
      showToast(
        "Role Pengguna Diperbarui",
        successText,
        "success"
      );
    } catch (err: any) {
      const errorText = err.message || "Gagal memperbarui role pengguna.";
      setErrorMsg(errorText);
      showToast("Gagal Memperbarui Role", errorText, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Action: Ubah Izin Menu untuk Role Terpilih (Kolom 3)
  async function handleToggleMenuPermission(menuCode: string) {
    if (!selectedRole) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    const currentPerms = currentRolePerms;
    let updatedPerms: string[];

    if (currentPerms.includes(menuCode)) {
      updatedPerms = currentPerms.filter((p) => p !== menuCode);
    } else {
      updatedPerms = [...currentPerms, menuCode];
    }

    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "UPDATE_ROLE_PERMISSIONS",
          role_id: selectedRole.role_id,
          permissions: updatedPerms,
        },
      });

      await onRefresh();
      const targetMenu = appMenus.find((m) => m.code === menuCode);
      const menuLabel = targetMenu ? targetMenu.label : menuCode;
      const isNowActive = updatedPerms.includes(menuCode);
      const successText = `Menu ${menuLabel} sekarang ${isNowActive ? "AKTIF (Diizinkan)" : "TIDAK AKTIF (Dibatasi)"} untuk role ${selectedRole.name}.`;
      setFeedbackMsg(successText);
      showToast(
        isNowActive ? "Akses Menu Diizinkan" : "Akses Menu Dinonaktifkan",
        successText,
        "success"
      );
    } catch (err: any) {
      const errorText = err.message || "Gagal memperbarui izin menu.";
      setErrorMsg(errorText);
      showToast("Gagal Memperbarui Izin Menu", errorText, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Action: Toggle Scope Aksi (CRUD)
  function handleToggleScope(scopeCode: string) {
    if (!selectedScopeMenu) return;
    const current = menuScopes[selectedScopeMenu.code] || ["VIEW"];
    let updated: string[];
    if (current.includes(scopeCode)) {
      updated = current.filter((s) => s !== scopeCode);
    } else {
      updated = [...current, scopeCode];
    }
    setMenuScopes((prev) => ({
      ...prev,
      [selectedScopeMenu.code]: updated,
    }));
    const isNowActive = updated.includes(scopeCode);
    const scopeFeedback = `Hak aksi (Scope) '${scopeCode}' untuk menu ${selectedScopeMenu.label} berhasil ${isNowActive ? "diaktifkan" : "dinonaktifkan"}.`;
    setFeedbackMsg(scopeFeedback);
    showToast(
      isNowActive ? "Scope Ditambahkan" : "Scope Dihapus",
      `Scope '${scopeCode}' ${isNowActive ? "aktif" : "nonaktif"} untuk menu ${selectedScopeMenu.label} (${selectedRole?.name}).`,
      "success"
    );
  }

  // Action: Tambah User Baru
  async function handleAddUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const res = await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "CREATE_USER",
          username: newUsername,
          full_name: newFullName,
          title_credentials: newTitle,
          role_id: newRole,
          unit_id: newUnitId,
          password: newPassword,
        },
      });

      await onRefresh();
      setShowAddUserModal(false);
      setNewUsername("");
      setNewFullName("");
      setSelectedUserId(res.user.user_id);
      const successText = `Pengguna baru @${res.user.username} (${res.user.full_name}) berhasil ditambahkan.`;
      setFeedbackMsg(successText);
      showToast(
        "Pengguna Berhasil Ditambahkan",
        successText,
        "success"
      );
    } catch (err: any) {
      const errorText = err.message || "Gagal menambahkan pengguna baru.";
      setErrorMsg(errorText);
      showToast("Gagal Menambahkan Pengguna", errorText, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Action: Buka Modal Edit User
  function handleOpenEditUser(user: UserType) {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditTitle(user.title_credentials || "");
    setEditRole(user.role_id);
    setEditUnitId(user.unit_id || "unit-vk");
    setEditPassword("");
    setShowEditUserModal(true);
  }

  // Action: Submit Simpan Edit User
  async function handleEditUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const payload: any = {
        action: "UPDATE_USER_RBAC",
        target_user_id: editingUser.user_id,
        full_name: editFullName,
        title_credentials: editTitle,
        role_id: editRole,
        unit_id: editUnitId,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: payload,
      });

      await onRefresh();
      setShowEditUserModal(false);
      const successText = `Data akun @${editingUser.username} (${editFullName}) berhasil diperbarui.`;
      setFeedbackMsg(successText);
      showToast("Data Pengguna Diperbarui", successText, "success");
    } catch (err: any) {
      const errorText = err.message || "Gagal memperbarui data pengguna.";
      setErrorMsg(errorText);
      showToast("Gagal Memperbarui Pengguna", errorText, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Action: Buka Konfirmasi Hapus User
  function handleOpenDeleteUser(user: UserType) {
    setDeletingUser(user);
    setShowDeleteUserModal(true);
  }

  // Action: Eksekusi Hapus User
  async function handleDeleteUserConfirm() {
    if (!deletingUser) return;
    if (deletingUser.user_id === currentUser.user_id) {
      showToast("Aksi Ditolak", "Anda tidak dapat menghapus akun Anda sendiri.", "error");
      return;
    }

    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "DELETE_USER",
          target_user_id: deletingUser.user_id,
        },
      });

      await onRefresh();
      setShowDeleteUserModal(false);
      if (selectedUserId === deletingUser.user_id) {
        const remaining = db.users.filter((u) => u.user_id !== deletingUser.user_id);
        if (remaining.length > 0) {
          setSelectedUserId(remaining[0].user_id);
        }
      }
      const successText = `Akun pengguna @${deletingUser.username} (${deletingUser.full_name}) berhasil dihapus.`;
      setFeedbackMsg(successText);
      showToast("Pengguna Dihapus", successText, "success");
    } catch (err: any) {
      const errorText = err.message || "Gagal menghapus pengguna.";
      setErrorMsg(errorText);
      showToast("Gagal Menghapus Pengguna", errorText, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER SECTION: KARTU HEADER BERGARIS PINGGIR BERWARNA (CLEAN BORDER HEADER)
         ========================================================================= */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide border border-blue-200 dark:border-blue-800">
              Manajemen Wewenang &amp; Pengguna
            </span>
            <span className="text-xs text-slate-500">• Standar Keamanan &amp; Otorisasi RBAC SIGAP</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight flex items-center gap-2.5">
            <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Hak Akses &amp; Pengaturan (Role &amp; Permission)</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Kelola penugasan peran pengguna (Role Bidan, Dokter, IT, Manajemen), visibilitas modul menu aplikasi, dan hak aksi spesifik (scope CRUD) dalam struktur 3 kolom terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-blue-400/90 dark:border-blue-600 flex items-center gap-3 shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                {db.users.length} Akun Staf
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                {availableRoles.length} Peran Sistem
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGASI MODUL RBAC BERBINGKAI BIRU */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-2.5 shadow-sm flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#2457d6] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50">
          <KeyRound className="h-4 w-4" />
          <span>Role &amp; Permission Pengguna</span>
        </div>
      </div>

      {/* Alert Notifikasi Feedback / Error */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. KONTEN 3 KOLOM TERPADU (USER, ROLE, DAN MENU)               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ============================================================ */}
        {/* KOLOM 1: DAFTAR USER (Width: ~28%)                           */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              DAFTAR USER
            </h3>
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Kotak Pencarian User */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari user..."
              className="w-full h-9 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 pl-9 pr-3 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Daftar User List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
            {filteredUsers.map((u) => {
              const isSelected = selectedUser?.user_id === u.user_id;

              if (isSelected) {
                return (
                  <div
                    key={u.user_id}
                    className="w-full bg-[#2457d6] text-white font-bold rounded-2xl py-3 px-4 shadow-md flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs tracking-tight truncate font-black flex items-center gap-1.5">
                        <span>@{u.username}</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-white/20 text-white font-mono">
                          {u.role_id.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-100 font-medium truncate mt-0.5">
                        {u.full_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditUser(u);
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Edit Data User"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteUser(u);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                        title="Hapus User"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={u.user_id}
                  onClick={() => setSelectedUserId(u.user_id)}
                  className="w-full bg-white dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-50/50 hover:border-blue-300 text-slate-700 dark:text-slate-200 rounded-2xl py-2.5 px-4 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#2457d6] transition-colors truncate">
                      @{u.username}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                      {u.full_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-blue-800 dark:text-blue-300 border border-blue-200/60">
                      {u.role_id.replace("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditUser(u);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Data User"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteUser(u);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                      title="Hapus User"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="h-6 w-6 rounded-full border border-blue-200 dark:border-blue-800 flex items-center justify-center cursor-not-allowed">
              &lt;
            </span>
            <span className="font-semibold">Hal 1 dari 1 ({filteredUsers.length} User)</span>
            <span className="h-6 w-6 rounded-full border border-blue-200 dark:border-blue-800 flex items-center justify-center cursor-not-allowed">
              &gt;
            </span>
          </div>

          {/* Tombol Simulasi Login */}
          {onSwitchLoginUser && selectedUser && (
            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60">
              <button
                type="button"
                onClick={() => onSwitchLoginUser(selectedUser)}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-black border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-[#2457d6]" />
                <span>Simulasi Login Akun (@{selectedUser.username})</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* KOLOM 2: ROLE USER (Width: ~34%)                             */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                ROLE USER: {selectedUser?.username}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Centang role yang diberikan untuk akun ini:
              </p>
            </div>
            <span className="text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              AKSES: SUPERAPPS
            </span>
          </div>

          {/* Daftar Role dengan Checkbox */}
          <div className="space-y-2.5">
            {availableRoles.map((r) => {
              const isUserRole =
                selectedUser?.role_id === r.role_id ||
                (r.role_id === "ADMIN_RS" &&
                  (selectedUser?.role_id === "ADMIN_TI" ||
                    selectedUser?.role_id === "VALIDATOR_KLINIS"));

              return (
                <div
                  key={r.role_id}
                  onClick={() => handleChangeUserRole(r.role_id)}
                  className={`w-full rounded-2xl border py-3 px-4 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isUserRole
                      ? "border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs"
                      : "border border-blue-200/70 dark:border-blue-900/60 bg-white dark:bg-slate-900/60 hover:bg-blue-50/30 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                        isUserRole
                          ? "bg-[#2457d6] border-[#2457d6] text-white"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      }`}
                    >
                      {isUserRole && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({r.alias})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                        {r.description}
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 shrink-0">
                    {r.badge}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-blue-100 dark:border-blue-900/60 text-[11px] text-slate-500">
            Perubahan role pada akun pengguna akan otomatis memperbarui visibilitas menu di Kolom 3.
          </div>
        </div>

        {/* ============================================================ */}
        {/* KOLOM 3: STRUKTUR MENU & AKSES SPESIFIK (Width: ~38%)       */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                STRUKTUR MENU ({selectedRole?.name})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Centang untuk memberikan hak VIEW menu pada role terpilih:
              </p>
            </div>
            <span className="text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400">
              AppMenu • Superapps
            </span>
          </div>

          {/* Kotak Pencarian Menu */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Cari Menu..."
              className="w-full h-9 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 pl-9 pr-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Daftar Struktur Menu Mengikuti Grup Side Navbar */}
          <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-0.5">
            {navGroupsOrder.map((groupName) => {
              const groupMenus = filteredMenus.filter((m) => m.group === groupName);
              if (groupMenus.length === 0) return null;

              return (
                <div key={groupName} className="space-y-1.5">
                  <div className="px-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>{groupName}</span>
                  </div>
                  <div className="space-y-1.5">
                    {groupMenus.map((menu) => {
                      const Icon = menu.icon;
                      const hasPermission = currentRolePerms.includes(menu.code);

                      return (
                        <div
                          key={menu.id}
                          onClick={() => handleToggleMenuPermission(menu.code)}
                          className={`w-full rounded-2xl border py-2.5 px-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                            hasPermission
                              ? "border border-blue-200/80 dark:border-blue-900/60 bg-white dark:bg-slate-900/70 hover:bg-blue-50/40 hover:border-blue-300"
                              : "border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/40 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox Hak Akses */}
                            <div
                              className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                                hasPermission
                                  ? "bg-[#2457d6] border-[#2457d6] text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {hasPermission && (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                            </div>

                            {/* Icon Menu */}
                            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-100 dark:border-slate-700">
                              <Icon className="h-3.5 w-3.5" />
                            </div>

                            {/* Judul & Path Menu */}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {menu.label}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({menu.path})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bagian Kanan: Status Aktif, Scope, & Tombol Edit */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold ${
                                hasPermission
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-500 dark:text-rose-400"
                              }`}
                            >
                              {hasPermission ? "Aktif" : "Tidak Aktif"}
                            </span>

                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-slate-800/80 text-blue-800 dark:text-blue-300">
                              {(menuScopes[menu.code] || ["VIEW"]).length}/6 scope
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScopeMenu(menu);
                              }}
                              className="text-slate-400 hover:text-[#2457d6] p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              title="Ubah Scope Hak Aksi (CRUD)"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Role saat ini: <strong className="text-slate-800 dark:text-slate-200">{selectedRole?.name}</strong></span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{currentRolePerms.length} dari {appMenus.length} Menu Diizinkan</span>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. MODAL TAMBAH USER BARU (JIKA DIBUTUHKAN)                    */}
      {/* ============================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#2457d6]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Tambah Akun Pengguna Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: dr.budi atau bidan.ani"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: dr. Budi Santoso, Sp.OG"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role RBAC
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                  >
                    <option value="BIDAN_PERAWAT">Bidan / Perawat Obstetri</option>
                    <option value="DOKTER">Dokter Sp.OG / DPJP</option>
                    <option value="ADMIN_RS">Admin / IT Sistem</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Kerja
                  </label>
                  <select
                    value={newUnitId}
                    onChange={(e) => setNewUnitId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                  >
                    {db.units.map((u) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password Akun
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Default: sigap2026"
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

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#2457d6] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Simpan Akun Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3B. MODAL EDIT USER                                            */}
      {/* ============================================================== */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-[#2457d6]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Edit Data Pengguna (@{editingUser.username})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username (ID Sistem)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Contoh: dr. Budi Santoso, Sp.OG"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gelar / Kredensial Medis
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Bidan Pelaksana VK, S.Tr.Keb"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role RBAC
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                  >
                    <option value="BIDAN_PERAWAT">Bidan (Bidan &amp; Perawat Obstetri)</option>
                    <option value="DOKTER">Dokter (Spesialis Kandungan / DPJP)</option>
                    <option value="ADMIN_RS">Admin / IT (Administrator Sistem)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Penempatan
                  </label>
                  <select
                    value={editUnitId}
                    onChange={(e) => setEditUnitId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden"
                  >
                    {db.units.map((u) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password (Kosongkan jika tidak diubah)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Masukkan password baru jika ingin mereset..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#2457d6] focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showEditPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showEditPassword ? (
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
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#2457d6] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3C. MODAL KONFIRMASI HAPUS USER                                */}
      {/* ============================================================== */}
      {showDeleteUserModal && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-300 dark:border-red-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Hapus Pengguna?
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi tindakan penghapusan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong className="text-slate-900 dark:text-white">@{deletingUser.username}</strong> ({deletingUser.full_name})? Pengguna ini tidak akan dapat login lagi ke sistem SIGAP.
            </p>

            {deletingUser.user_id === currentUser.user_id && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                Peringatan: Ini adalah akun yang sedang Anda gunakan saat ini.
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || deletingUser.user_id === currentUser.user_id}
                onClick={handleDeleteUserConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODAL AKSES SPESIFIK (SCOPE CRUD) - PERSIS GAMBAR 2         */}
      {/* ============================================================== */}
      {selectedScopeMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2457d6] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Akses Spesifik (Scope)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedScopeMenu.label} ({selectedScopeMenu.path})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScopeMenu(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Atur izin aksi terperinci (CRUD &amp; Otorisasi) untuk role <strong className="text-slate-800 dark:text-slate-200">{selectedRole?.name}</strong> pada menu ini:
            </div>

            <div className="space-y-2">
              {[
                {
                  code: "VIEW",
                  label: "VIEW (Lihat Menu & Tampilan Halaman)",
                  desc: "Dapat membuka dan melihat data di antarmuka menu ini.",
                },
                {
                  code: "CREATE",
                  label: "CREATE (Entri Data / Skrining Baru)",
                  desc: "Dapat menambahkan rekaman pasien, asesmen atau skrining baru.",
                },
                {
                  code: "UPDATE",
                  label: "UPDATE (Ubah & Perbarui Data)",
                  desc: "Dapat memperbarui catatan medis, tanda vital atau data faskes.",
                },
                {
                  code: "DELETE",
                  label: "DELETE (Hapus Rekaman / Pasien)",
                  desc: "Wewenang menghapus data (dibatasi hanya Administrator).",
                },
                {
                  code: "EXPORT",
                  label: "EXPORT (Unduh Laporan Excel / PDF)",
                  desc: "Dapat mengekspor ringkasan data dan rekam audit.",
                },
                {
                  code: "APPROVE",
                  label: "APPROVE (Validasi Klinis / TTD DPJP)",
                  desc: "Wewenang memvalidasi keputusan klinis dan tanda tangan medis.",
                },
              ].map((scope) => {
                const currentScopes =
                  menuScopes[selectedScopeMenu.code] || ["VIEW"];
                const isChecked = currentScopes.includes(scope.code);

                return (
                  <div
                    key={scope.code}
                    onClick={() => handleToggleScope(scope.code)}
                    className={`w-full rounded-xl border p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      isChecked
                        ? "border-[#2457d6] bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-[4px] border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-[#2457d6] border-[#2457d6] text-white"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {scope.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {scope.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {(menuScopes[selectedScopeMenu.code] || []).length} dari 6 scope aktif
              </span>
              <button
                type="button"
                onClick={() => setSelectedScopeMenu(null)}
                className="px-4 py-2 rounded-xl bg-[#2457d6] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING TOAST NOTIFICATION (FEEDBACK KETIKA MENCENTANG ROLE / MENU)
         ========================================================================= */}
      {toast && toast.show && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`rounded-2xl border-2 shadow-2xl p-4 flex items-start gap-3 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 transition-all ${
              toast.type === "success"
                ? "border-emerald-500 shadow-emerald-500/10"
                : "border-red-500 shadow-red-500/10"
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
