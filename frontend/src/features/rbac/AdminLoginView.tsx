"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  LogIn,
  User,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/services/api-client";
import type { User as UserType } from "@/types";

interface AdminLoginViewProps {
  data: BootstrapResponse;
  onLoginSuccess: (user: UserType, token: string) => void;
  onSwitchToClinicianLogin?: () => void;
}

export function AdminLoginView({
  data,
  onLoginSuccess,
  onSwitchToClinicianLogin,
}: AdminLoginViewProps) {
  const { db } = data;
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
      const targetUser = (overrideUsername || username).trim();
      const res = await apiRequest("/auth", {
        method: "POST",
        body: {
          action: "ADMIN_LOGIN",
          portal: "ADMIN",
          username: targetUser,
          password: password || "admin123",
        },
      });

      if (res.ok && res.session?.user) {
        onLoginSuccess(res.session.user, res.session.token);
      } else {
        throw new Error(res.error || "Gagal masuk ke portal admin.");
      }
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          "Kredensial admin salah atau server backend tidak dapat dihubungi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white selection:bg-[#2563eb] selection:text-white">
      {/* ============================================================== */}
      {/* PANEL KIRI: BIRU VIBRANT DENGAN SENI GEOMETRIS & TYPOGRAPHY    */}
      {/* Sesuai Gambar Inspirasi: Bintang/Asterisk, Hello Brand!, Tagline*/}
      {/* ============================================================== */}
      <div className="lg:w-[50%] xl:w-[48%] bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#2563eb] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Dekorasi Garis Lengkung Geometris Elegan */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 600 800"
        >
          <path
            d="M -100 200 C 120 80, 280 320, 500 60 L 500 800 L -100 800 Z"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M -60 250 C 160 130, 320 370, 540 110"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M -20 300 C 200 180, 360 420, 580 160"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M 20 350 C 240 230, 400 470, 620 210"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M 60 400 C 280 280, 440 520, 660 260"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>

        {/* Glow ambient background */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        {/* Bagian Atas: Asterisk Icon Sesuai Gambar */}
        <div className="relative z-10">
          <svg
            className="w-12 h-12 text-white mb-10 transition-transform hover:rotate-45 duration-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
          </svg>

          {/* Heading Besar: Hello SIGAP! 👋 */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
            Hello <br />
            SIGAP! 👋
          </h1>

          {/* Kepanjangan Akronim SIGAP */}
          <div className="space-y-2.5 my-6 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-xl max-w-md">
            {[
              { letter: "S", word: "Sistem" },
              { letter: "I", word: "Informasi" },
              { letter: "G", word: "Gerak cepat (respons)" },
              { letter: "A", word: "Antisipasi" },
              { letter: "P", word: "Preeklampsia dan Perdarahan Pascapersalinan" },
            ].map((item) => (
              <div key={item.letter} className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-md bg-white text-[#1d4ed8] font-black text-xs shrink-0 shadow-sm">
                  {item.letter}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white/95 leading-6">
                  — {item.word}
                </span>
              </div>
            ))}
          </div>

          {/* Tagline Deskriptif */}
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-md font-normal">
            Aplikasi Skrining Admisi Preeklamsia dan Perdarahan Pascapersalinan (HPP 4T) pada Pasien Pertama Kali Masuk Rawat Inap Kebidanan.
          </p>
        </div>

        {/* Bagian Bawah: Copyright Sesuai Gambar */}
        <div className="relative z-10 pt-8 text-xs text-blue-200/70 font-medium">
          &copy; {new Date().getFullYear()} SIGAP Kebidanan • Universitas Muhammadiyah Gombong
        </div>
      </div>

      {/* ============================================================== */}
      {/* PANEL KANAN: MINIMALIS PUTIH BERSIH DENGAN BRAND & FORM LOGIN  */}
      {/* Sesuai Gambar Inspirasi: Welcome Back!, Input, Button Login Now */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-14 lg:p-20 xl:p-24 bg-white max-w-2xl mx-auto w-full">
        {/* Brand Logo di Kiri Atas Form */}
        <div>
          <div className="flex items-center gap-2 mb-12 sm:mb-16">
            <div className="h-9 w-9 rounded-xl bg-[#1d4ed8] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#0f172a]">
              SIGAP<span className="text-[#1d4ed8]">.</span>
            </span>
          </div>

          {/* Judul Form: Welcome Back! */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
              Welcome Back!
            </h2>
          </div>

          {/* Alert Error jika ada */}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Form Login Input */}
          <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-6">
            {/* Input Username (Gaya Minimalis Modern sesuai Gambar) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
                Username / Akun Admin
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username admin"
                  required
                  className="w-full border-b-2 border-[#e2e8f0] focus:border-[#0f172a] py-2.5 pl-8 pr-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-transparent outline-none transition-colors font-medium"
                />
                <User className="h-4 w-4 text-[#94a3b8] absolute left-0 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Input Password (Gaya Minimalis Modern sesuai Gambar) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full border-b-2 border-[#e2e8f0] focus:border-[#0f172a] py-2.5 pl-8 pr-10 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-transparent outline-none transition-colors font-mono font-medium"
                />
                <Lock className="h-4 w-4 text-[#94a3b8] absolute left-0 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-3 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Tombol Utama: Login Now (Hitam Sleek Elegan Sesuai Gambar Inspirasi) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#18181b] hover:bg-black text-white py-3.5 px-6 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md shadow-slate-900/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Login Now</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
