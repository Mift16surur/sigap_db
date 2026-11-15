import React, { useState } from "react";
import { AlertCircle, Eye, EyeOff, HeartPulse, Lock, LogIn, User } from "lucide-react";
import type { AuthSession } from "../types/auth.types";
import { authService } from "../services/auth.service";

interface LoginFormProps {
  onSuccess: (session: AuthSession) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const session = await authService.login({
        username,
        password,
      });
      onSuccess(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Akun pengguna tidak ditemukan. Periksa kembali username dan kata sandi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-8 sm:p-14 lg:p-20 xl:p-24 bg-white max-w-2xl mx-auto w-full">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 mb-12 sm:mb-16">
          <div className="h-11 w-11 rounded-2xl bg-white border border-blue-200/80 p-1 flex items-center justify-center shadow-md shadow-blue-500/10 overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="SIGAP App"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#0f172a]">
            SIGAP <span className="text-[#1d4ed8]">App</span>
          </span>
        </div>

        {/* Welcome Back Heading */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">
            Welcome Back!
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b] mt-2 font-normal">
            Masukkan akun pengguna untuk masuk ke sistem skrining admisi klinis.
          </p>
        </div>

        {/* Alert Error jika ada */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Username */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
              Username / Akun
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="misal: bidan, dokter, atau admin"
                required
                className="w-full border-b-2 border-[#e2e8f0] focus:border-[#0f172a] py-3 pl-8 pr-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-transparent outline-none transition-colors font-medium"
              />
              <User className="h-4 w-4 text-[#94a3b8] absolute left-0 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Input Password */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border-b-2 border-[#e2e8f0] focus:border-[#0f172a] py-3 pl-8 pr-10 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-transparent outline-none transition-colors font-medium"
              />
              <Lock className="h-4 w-4 text-[#94a3b8] absolute left-0 top-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-3.5 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Tombol Login */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !username.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Login Now</span>
                </>
              )}
            </button>
          </div>

          {/* Akses Akun Resmi (Sesuai Kebutuhan) */}
          <div className="pt-6 border-t border-slate-100 mt-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Pilihan Akun Resmi:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername("bidan");
                  setPassword("bidan123");
                }}
                className="px-2.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all group"
              >
                <span className="font-bold block text-xs text-slate-800 group-hover:text-blue-600">Bidan / Perawat</span>
                <span className="text-[10px] text-slate-400 font-mono">bidan / bidan123</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("dokter");
                  setPassword("dokter123");
                }}
                className="px-2.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all group"
              >
                <span className="font-bold block text-xs text-slate-800 group-hover:text-blue-600">Dokter Sp.OG</span>
                <span className="text-[10px] text-slate-400 font-mono">dokter / dokter123</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("admin");
                  setPassword("admin123");
                }}
                className="px-2.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all group"
              >
                <span className="font-bold block text-xs text-slate-800 group-hover:text-blue-600">Admin RS</span>
                <span className="text-[10px] text-slate-400 font-mono">admin / admin123</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="text-center pt-8 text-xs text-[#94a3b8]">
        Sistem Skrining Rawat Inap Terintegrasi • Versi 2026.1
      </div>
    </div>
  );
}

