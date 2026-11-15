"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/services/api-client";
import type { User, UserRole } from "@/types";

/**
 * Layar Login Utama SIGAP (FR-01, FR-02, NFR-02, Bab 8 Use Case Login)
 * Memungkinkan pengguna login dengan username & password atau memilih akun cepat
 * dari 5 Role RBAC yang terdaftar di database.
 */
export function LoginScreen({
  data,
  onLoginSuccess,
  onSwitchToAdminLogin,
}: {
  data: BootstrapResponse;
  onLoginSuccess: (user: User, token: string) => void;
  onSwitchToAdminLogin?: () => void;
}) {
  const { db } = data;
  const [username, setUsername] = useState<string>("bidan.ratna");
  const [password, setPassword] = useState<string>("sigap2026");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLoginSubmit(
    e?: React.FormEvent,
    overrideUsername?: string
  ) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const targetUsername = overrideUsername || username;
      const res = await apiRequest("/auth", {
        method: "POST",
        body: {
          action: "LOGIN",
          username: targetUsername,
          password: password || "sigap2026",
        },
      });
      onLoginSuccess(res.session.user, res.session.token);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2461] via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-blue-800/40 bg-white">
        {/* Panel Kiri: Informasi Sistem & Matriks 5 Aktor RBAC */}
        <div className="lg:col-span-7 bg-[#0c2461] text-white p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3.5 py-1 text-xs font-bold text-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              SRS FR-01 & FR-02 • Autentikasi & Role-Based Access Control (RBAC)
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              SIGAP — Skrining Admisi Preeklamsia & Risiko HPP
            </h1>
            <p className="text-xs text-blue-100 leading-relaxed">
              Sistem memeriksa akun, <strong>role</strong>,{" "}
              <strong>unit pelayanan</strong>, dan{" "}
              <strong>status akses aktif/nonaktif</strong> sebelum mengizinkan
              pengguna masuk. Menu dan aksi di dalam sistem dibatasi secara
              otomatis sesuai matriks kewenangan Bab 3 SRS.
            </p>

            {/* Pilihan Akun Cepat 5 Aktor Sesuai Bab 3 */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Pilih Akun Terdaftar untuk Login Cepat (Klik Kartu Akun):
              </div>
              <div className="grid grid-cols-1 gap-2">
                {db.users.map((u) => {
                  const roleDef = db.roles.find((r) => r.role_id === u.role_id);
                  const unit = db.units.find((un) => un.unit_id === u.unit_id);
                  const isSelected = username === u.username;

                  return (
                    <div
                      key={u.user_id}
                      onClick={() => {
                        setUsername(u.username);
                        setPassword("sigap2026");
                      }}
                      className={`cursor-pointer rounded-xl border p-3 transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-blue-400 bg-blue-800/80 shadow-md"
                          : "border-blue-900/80 bg-blue-950/50 hover:bg-blue-900/50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-blue-500/30 px-2 py-0.5 text-[10px] font-extrabold text-blue-200">
                            {u.role_id}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {u.full_name}
                          </span>
                          <span className="text-[11px] font-mono text-blue-300">
                            (@{u.username})
                          </span>
                          {!u.active_status && (
                            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              NONAKTIF
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-blue-200">
                          {roleDef?.description} • Unit:{" "}
                          <strong>{unit?.name}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUsername(u.username);
                          handleLoginSubmit(undefined, u.username);
                        }}
                        disabled={submitting}
                        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-blue-950 hover:bg-blue-50"
                      >
                        Masuk &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-blue-950/80 border border-blue-800/60 p-3.5 text-[11px] text-blue-200">
            <strong>CATATAN PENTING BAB 3 SRS:</strong> Admin TI tidak berwenang
            mengubah aturan klinis. Hanya role{" "}
            <strong>VALIDATOR_KLINIS</strong> yang dapat mengesahkan versi
            algoritma & tabel keputusan.
          </div>
        </div>

        {/* Panel Kanan: Form Login Standar (FR-01 & NFR-02) */}
        <div className="lg:col-span-5 p-8 flex flex-col justify-center space-y-6 bg-white">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Login Pengguna Terdaftar
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan username dan kata sandi akun SIGAP Anda (Kata sandi
              default simulasi: <code>sigap2026</code>).
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username Pengguna
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: bidan.ratna atau dr.sari"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Default: sigap2026"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg hover:bg-blue-700 transition"
            >
              <LogIn className="h-4 w-4" />
              {submitting
                ? "Memverifikasi Akun & RBAC..."
                : "Login ke Sistem SIGAP"}
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">
              Ingin mengatur siapa saja yang bisa login atau mengubah role?
            </div>
            <p>
              Setelah masuk, buka menu{" "}
              <strong>&quot;Manajemen RBAC &amp; Akses Login&quot;</strong> di
              sidebar kiri untuk menambah akun baru, mengatur role, unit,
              mengaktifkan/menonaktifkan akses login, atau langsung berpindah
              sesi login.
            </p>
          </div>

          {onSwitchToAdminLogin && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onSwitchToAdminLogin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Masuk ke Portal Khusus Administrator (Admin RS &amp; TI) &rarr;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Halaman Menu Manajemen RBAC & Penentuan Login (FR-01, FR-02, Bab 3)
 */
export function RbacManagementView({
  data,
  currentUser,
  onSwitchLoginUser,
  onOpenFullLoginScreen,
  onRefresh,
}: {
  data: BootstrapResponse;
  currentUser: User;
  onSwitchLoginUser: (user: User) => Promise<void>;
  onOpenFullLoginScreen: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { db } = data;
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Tambah Akun Baru
  const [newUsername, setNewUsername] = useState<string>("");
  const [newFullName, setNewFullName] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("Bidan Pelaksana");
  const [newRole, setNewRole] = useState<UserRole>("BIDAN_PERAWAT");
  const [newUnitId, setNewUnitId] = useState<string>("unit-vk");
  const [newPassword, setNewPassword] = useState<string>("sigap2026");

  const canManageUsers =
    currentUser.role_id === "ADMIN_RS" || currentUser.role_id === "ADMIN_TI";

  async function handleCreateUser(e: React.FormEvent) {
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
      setNewUsername("");
      setNewFullName("");
      setFeedbackMsg(
        `Akun baru @${res.user.username} (${res.user.full_name}) dengan role ${res.user.role_id} berhasil dibuat dan dapat digunakan untuk Login.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateUserRbac(
    targetUserId: string,
    updates: {
      role_id?: UserRole;
      unit_id?: string;
      active_status?: boolean;
    }
  ) {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const res = await apiRequest("/auth", {
        method: "POST",
        userId: currentUser.user_id,
        body: {
          action: "UPDATE_USER_RBAC",
          target_user_id: targetUserId,
          ...updates,
        },
      });
      await onRefresh();
      setFeedbackMsg(
        `Konfigurasi RBAC untuk pengguna ${res.user.full_name} (@${res.user.username}) berhasil diperbarui.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Matriks Hak Menu berdasarkan Role
  const RBAC_MENU_MATRIX: Array<{
    feature: string;
    srsCode: string;
    roles: Record<UserRole, boolean>;
  }> = [
    {
      feature: "1. Pendaftaran Pasien & Buat Episode Admisi",
      srsCode: "FR-03, FR-04, FR-05",
      roles: {
        BIDAN_PERAWAT: true,
        DOKTER: true,
        VALIDATOR_KLINIS: false,
        ADMIN_RS: false,
        ADMIN_TI: false,
      },
    },
    {
      feature: "2. Input Skrining PE, Rekaman TD Berulang & Skrining HPP 4T",
      srsCode: "FR-06, FR-07, FR-08, FR-09",
      roles: {
        BIDAN_PERAWAT: true,
        DOKTER: false,
        VALIDATOR_KLINIS: false,
        ADMIN_RS: false,
        ADMIN_TI: false,
      },
    },
    {
      feature: "3. Tinjau Hasil Skrining, Respons Evaluasi SBAR & Resolve Alert",
      srsCode: "FR-11, FR-12, FR-16, Bab 3",
      roles: {
        BIDAN_PERAWAT: true,
        DOKTER: true,
        VALIDATOR_KLINIS: true,
        ADMIN_RS: false,
        ADMIN_TI: false,
      },
    },
    {
      feature: "4. Monitoring Tanda Vital, Kehilangan Darah Kumulatif & Checklist",
      srsCode: "FR-13, FR-14, FR-15",
      roles: {
        BIDAN_PERAWAT: true,
        DOKTER: true,
        VALIDATOR_KLINIS: false,
        ADMIN_RS: false,
        ADMIN_TI: false,
      },
    },
    {
      feature:
        "5. Mengubah & Mengesahkan Tabel Keputusan / Versi Algoritma Klinis",
      srsCode: "FR-10, FR-21, Bab 3",
      roles: {
        BIDAN_PERAWAT: false,
        DOKTER: false,
        VALIDATOR_KLINIS: true, // Eksklusif Validator Klinis!
        ADMIN_RS: false,
        ADMIN_TI: false, // Admin TI dilarang mengubah aturan klinis!
      },
    },
    {
      feature: "6. Mengelola Akun Pengguna, Role RBAC, Unit & Status Akses Login",
      srsCode: "FR-01, FR-02, Bab 3",
      roles: {
        BIDAN_PERAWAT: false,
        DOKTER: false,
        VALIDATOR_KLINIS: false,
        ADMIN_RS: true,
        ADMIN_TI: true,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner Menu RBAC & Login */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-[#0c2461] to-indigo-900 p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/30 border border-blue-400/40 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-200">
              SRS FR-01, FR-02 & Bab 3 • Autentikasi & Kewenangan 5 Aktor
            </div>
            <h2 className="text-lg font-extrabold">
              Menu Manajemen RBAC & Penentuan Sesi Login Pengguna
            </h2>
            <p className="text-xs text-blue-100 max-w-3xl leading-relaxed">
              Gunakan menu ini untuk{" "}
              <strong>menentukan akun mana yang sedang Login</strong>, menguji
              pembatasan hak akses tiap role (Bidan/Perawat, Dokter, Validator
              Klinis, Admin RS, Admin TI), serta mengelola akun, unit, dan
              status aktif/nonaktif pengguna.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFullLoginScreen}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-950 shadow hover:bg-blue-50"
          >
            <LogOut className="h-4 w-4 text-red-600" />
            Logout / Buka Halaman Login Penuh
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 underline"
          >
            Tutup
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
          {errorMsg}
        </div>
      )}

      {/* BAGIAN 1: PENENTUAN LOGIN AKTIF & MANAJEMEN AKUN PENGGUNA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Daftar Akun Pengguna Terdaftar — Klik &quot;Gunakan Login
              Ini&quot; untuk Menentukan Sesi Login Aktif
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Saat ini Anda login sebagai:{" "}
              <strong className="text-blue-700">
                {currentUser.full_name} (@{currentUser.username}) — Role:{" "}
                {currentUser.role_id}
              </strong>
              . Untuk mengubah Role/Status akun lain, pastikan Anda login
              sebagai <code>ADMIN_RS</code> atau <code>ADMIN_TI</code>.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-3">Pengguna & Username</th>
                <th className="py-3 px-3">Jabatan / Kredensial</th>
                <th className="py-3 px-3">Role RBAC (FR-02)</th>
                <th className="py-3 px-3">Unit Tugas</th>
                <th className="py-3 px-3">Status Akses Login</th>
                <th className="py-3 px-3 text-right">Penentuan Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map((u) => {
                const isCurrent = u.user_id === currentUser.user_id;
                return (
                  <tr
                    key={u.user_id}
                    className={
                      isCurrent ? "bg-blue-50/70" : "hover:bg-slate-50"
                    }
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {u.full_name}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            SEDANG LOGIN
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        @{u.username} • Pass: <code>sigap2026</code>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {u.title_credentials}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.role_id}
                        disabled={!canManageUsers || submitting}
                        onChange={(e) =>
                          handleUpdateUserRbac(u.user_id, {
                            role_id: e.target.value as UserRole,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 disabled:bg-slate-100"
                      >
                        {db.roles.map((r) => (
                          <option key={r.role_id} value={r.role_id}>
                            {r.role_id} — {r.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.unit_id}
                        disabled={!canManageUsers || submitting}
                        onChange={(e) =>
                          handleUpdateUserRbac(u.user_id, {
                            unit_id: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 disabled:bg-slate-100"
                      >
                        {db.units.map((un) => (
                          <option key={un.unit_id} value={un.unit_id}>
                            {un.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={!canManageUsers || submitting}
                        onClick={() =>
                          handleUpdateUserRbac(u.user_id, {
                            active_status: !u.active_status,
                          })
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                          u.active_status
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        } disabled:opacity-70`}
                      >
                        {u.active_status ? "AKTIF (Diizinkan)" : "NONAKTIF (Diblokir)"}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Sesi Aktif
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!u.active_status || submitting}
                          onClick={() => onSwitchLoginUser(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          Gunakan Login Ini
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BAGIAN 2: TAMBAH AKUN LOGIN BARU & MATRIKS KEWENANGAN RBAC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Buat Akun Login Baru */}
        <form
          onSubmit={handleCreateUser}
          className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Tambah Akun Pengguna Baru untuk Login
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Memerlukan kewenangan <code>ADMIN_RS</code> atau{" "}
              <code>ADMIN_TI</code>. Jika Anda login sebagai role lain, klik{" "}
              <strong>&quot;Gunakan Login Ini&quot;</strong> pada baris{" "}
              <em>Nadia Putri (ADMIN_RS)</em> atau{" "}
              <em>Budi Santoso (ADMIN_TI)</em> di tabel atas terlebih dahulu.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Misal: bidan.siti"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password Login *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Misal: Bd. Siti Rahmawati, S.Tr.Keb"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jabatan / Kredensial
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Misal: Bidan Jaga IGD PONEK"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Role RBAC (FR-02):
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 bg-white font-bold"
                >
                  {db.roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Unit Tugas:
                </label>
                <select
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                >
                  {db.units.map((un) => (
                    <option key={un.unit_id} value={un.unit_id}>
                      {un.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-extrabold text-white shadow hover:bg-blue-700"
            >
              + Simpan Akun Pengguna Baru
            </button>
          </div>
        </form>

        {/* Tabel Matriks Kewenangan 5 Aktor Sesuai Bab 3 SRS */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Matriks Kewenangan Role-Based Access Control (SRS Bab 3 & FR-02)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap aksi pengguna divalidasi di sisi server Backend (`store.ts`
              ). Upaya akses di luar wewenang role akan ditolak (`HTTP 403`) dan
              dicatat ke `audit_logs`.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-2.5">Fitur / Kewenangan Sistem</th>
                  <th className="py-2.5 px-2 text-center">Bidan/Perawat</th>
                  <th className="py-2.5 px-2 text-center">Dokter</th>
                  <th className="py-2.5 px-2 text-center">Validator Klinis</th>
                  <th className="py-2.5 px-2 text-center">Admin RS</th>
                  <th className="py-2.5 px-2 text-center">Admin TI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RBAC_MENU_MATRIX.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-2.5">
                      <div className="font-semibold text-slate-900">
                        {row.feature}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {row.srsCode}
                      </div>
                    </td>
                    {(
                      [
                        "BIDAN_PERAWAT",
                        "DOKTER",
                        "VALIDATOR_KLINIS",
                        "ADMIN_RS",
                        "ADMIN_TI",
                      ] as UserRole[]
                    ).map((r) => (
                      <td key={r} className="py-2.5 px-2 text-center">
                        {row.roles[r] ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

