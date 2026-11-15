"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardPlus,
  Download,
  Eye,
  Filter,
  HeartPulse,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/services/api-client";
import type { Patient } from "@/types";

export function PatientMasterView({
  data,
  currentUserId,
  onRefresh,
  onProceedToAdmission,
}: {
  data: BootstrapResponse;
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onProceedToAdmission: (patientId: string) => void;
}) {
  const { db, enriched_admissions: admissions } = data;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bloodFilter, setBloodFilter] = useState<string>("ALL");
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("NEWEST");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  // Notifications
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [mrn, setMrn] = useState<string>("");
  const [tanggalLahir, setTanggalLahir] = useState<string>("");
  const [ageYears, setAgeYears] = useState<number | string>("");
  const [gender, setGender] = useState<"PEREMPUAN" | "LAKI_LAKI">("PEREMPUAN");
  const [golonganDarah, setGolonganDarah] = useState<string>("O+");
  const [nikMasked, setNikMasked] = useState<string>("");
  const [alamatSingkat, setAlamatSingkat] = useState<string>("");
  const [kontakDarurat, setKontakDarurat] = useState<string>("");
  const [isAnonMode, setIsAnonMode] = useState<boolean>(
    db.system_settings?.default_anonymous_mode || false
  );

  // View / Edit / Delete Modal State
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editMrn, setEditMrn] = useState<string>("");
  const [editTanggalLahir, setEditTanggalLahir] = useState<string>("");
  const [editAgeYears, setEditAgeYears] = useState<number | string>(25);
  const [editGender, setEditGender] = useState<"PEREMPUAN" | "LAKI_LAKI">("PEREMPUAN");
  const [editGolonganDarah, setEditGolonganDarah] = useState<string>("O+");
  const [editNikMasked, setEditNikMasked] = useState<string>("");
  const [editAlamatSingkat, setEditAlamatSingkat] = useState<string>("");
  const [editKontakDarurat, setEditKontakDarurat] = useState<string>("");
  const [editIsAnonMode, setEditIsAnonMode] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);

  // Format Tanggal Indonesia
  function formatIndoDate(dateStr?: string) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  // Hitung otomatis umur dari tanggal lahir
  function handleTanggalLahirChange(val: string, isEdit = false) {
    if (isEdit) {
      setEditTanggalLahir(val);
      if (val) {
        const birth = new Date(val);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        if (
          now.getMonth() < birth.getMonth() ||
          (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
        ) {
          years--;
        }
        if (years > 0 && years < 120) setEditAgeYears(years);
      }
    } else {
      setTanggalLahir(val);
      if (val) {
        const birth = new Date(val);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        if (
          now.getMonth() < birth.getMonth() ||
          (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
        ) {
          years--;
        }
        if (years > 0 && years < 120) setAgeYears(years);
      }
    }
  }

  async function handleRefreshClick() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }

  // Filter & Pengurutan Pasien Master
  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = db.patients.filter((pat) => {
      const matchQuery =
        !query ||
        pat.full_name.toLowerCase().includes(query) ||
        pat.mrn.toLowerCase().includes(query) ||
        pat.patient_code.toLowerCase().includes(query) ||
        (pat.nik_masked && pat.nik_masked.toLowerCase().includes(query)) ||
        (pat.alamat_singkat && pat.alamat_singkat.toLowerCase().includes(query));

      if (!matchQuery) return false;

      // Filter Golongan Darah
      if (bloodFilter !== "ALL" && pat.golongan_darah !== bloodFilter) {
        return false;
      }

      // Filter Riwayat Admisi
      const patAdmissions = admissions.filter((a) => a.patient_id === pat.patient_id);
      const hasActive = patAdmissions.some((a) => a.status === "ACTIVE");

      if (admissionStatusFilter === "ACTIVE") return hasActive;
      if (admissionStatusFilter === "NEVER") return patAdmissions.length === 0;
      if (admissionStatusFilter === "COMPLETED")
        return patAdmissions.length > 0 && !hasActive;

      return true;
    });

    if (sortOrder === "NAME_ASC") {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortOrder === "NAME_DESC") {
      result.sort((a, b) => b.full_name.localeCompare(a.full_name));
    } else if (sortOrder === "MRN_ASC") {
      result.sort((a, b) => a.mrn.localeCompare(b.mrn));
    } else if (sortOrder === "OLDEST") {
      result.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      // NEWEST
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [db.patients, admissions, searchQuery, bloodFilter, admissionStatusFilter, sortOrder]);

  // Ekspor CSV Data Master Pasien
  function handleExportCsv() {
    const headers = [
      "No. RM",
      "Nama Pasien",
      "Usia",
      "Tgl Lahir",
      "Jenis Kelamin",
      "Gol. Darah",
      "NIK",
      "Alamat",
      "Kontak",
      "Tgl Registrasi Master",
    ];
    const rows = filteredPatients.map((p) => [
      p.mrn,
      `"${p.full_name}"`,
      p.age_years || "-",
      p.tanggal_lahir || "-",
      p.gender || "PEREMPUAN",
      p.golongan_darah || "O+",
      p.nik_masked || "-",
      `"${p.alamat_singkat || "-"}"`,
      p.kontak_darurat || "-",
      formatIndoDate(p.created_at),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `master_pasien_sigap_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Submit Tambah Pasien Baru ke Master
  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        mrn: mrn.trim(),
        tanggal_lahir: tanggalLahir,
        age_years: Number(ageYears || 25),
        gender,
        golongan_darah: golonganDarah,
        nik_masked: nikMasked.trim() || undefined,
        alamat_singkat: alamatSingkat.trim() || undefined,
        kontak_darurat: kontakDarurat.trim() || undefined,
        is_anonymous: isAnonMode,
      };

      const res = await apiRequest<{ ok: boolean; patient: Patient; error?: string }>(
        "/patients",
        {
          method: "POST",
          userId: currentUserId,
          body: payload,
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Gagal menyimpan pasien ke Master Pasien");
      }

      setFeedbackMsg(
        `Pasien "${res.patient.full_name}" (${res.patient.mrn}) berhasil ditambahkan ke Database Master Pasien.`
      );
      setShowAddModal(false);
      resetForm();
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data master pasien.");
    } finally {
      setSubmitting(false);
    }
  }

  // Open Edit Modal
  function handleOpenEditModal(p: Patient) {
    setEditingPatient(p);
    setEditFullName(p.full_name);
    setEditMrn(p.mrn);
    setEditTanggalLahir(p.tanggal_lahir || "");
    setEditAgeYears(p.age_years || 25);
    setEditGender(p.gender || "PEREMPUAN");
    setEditGolonganDarah(p.golongan_darah || "O+");
    setEditNikMasked(p.nik_masked || "");
    setEditAlamatSingkat(p.alamat_singkat || "");
    setEditKontakDarurat(p.kontak_darurat || "");
    setEditIsAnonMode(p.is_anonymous_mode || false);
  }

  // Submit Update Master Pasien
  async function handleUpdatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPatient) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setEditSubmitting(true);

    try {
      const payload = {
        patient_id: editingPatient.patient_id,
        full_name: editFullName.trim(),
        mrn: editMrn.trim(),
        tanggal_lahir: editTanggalLahir,
        age_years: Number(editAgeYears || 25),
        gender: editGender,
        golongan_darah: editGolonganDarah,
        nik_masked: editNikMasked.trim(),
        alamat_singkat: editAlamatSingkat.trim(),
        kontak_darurat: editKontakDarurat.trim(),
        is_anonymous: editIsAnonMode,
      };

      const res = await apiRequest<{ ok: boolean; patient: Patient; error?: string }>(
        "/patients",
        {
          method: "PUT",
          userId: currentUserId,
          body: payload,
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Gagal memperbarui data master pasien");
      }

      setFeedbackMsg(
        `Data identitas pasien "${res.patient.full_name}" (${res.patient.mrn}) berhasil diperbarui.`
      );
      setEditingPatient(null);
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui data pasien.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Delete Patient
  async function handleDeletePatient() {
    if (!deletingPatient) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setDeleteSubmitting(true);

    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>(
        `/patients?id=${deletingPatient.patient_id}`,
        {
          method: "DELETE",
          userId: currentUserId,
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Gagal menghapus pasien dari Master Pasien");
      }

      setFeedbackMsg(
        `Pasien "${deletingPatient.full_name}" (${deletingPatient.mrn}) berhasil dihapus dari Master Pasien.`
      );
      setDeletingPatient(null);
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus pasien.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function resetForm() {
    setFullName("");
    setMrn("");
    setTanggalLahir("");
    setAgeYears("");
    setGender("PEREMPUAN");
    setGolonganDarah("O+");
    setNikMasked("");
    setAlamatSingkat("");
    setKontakDarurat("");
    setIsAnonMode(db.system_settings?.default_anonymous_mode || false);
  }

  // Statistik Cepat Master Pasien
  const totalPatients = db.patients.length;
  const femalePatients = db.patients.filter((p) => (p.gender || "PEREMPUAN") === "PEREMPUAN").length;
  const activeCareCount = admissions.filter((a) => a.status === "ACTIVE").length;
  const withAdmissionsCount = db.patients.filter((p) =>
    admissions.some((a) => a.patient_id === p.patient_id)
  ).length;

  return (
    <div className="space-y-4 select-none pb-12">
      {/* ============================================================== */}
      {/* 4 KARTU STATISTIK INDUK MASTER PASIEN                          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KARTU 1: TOTAL PASIEN TERDAFTAR */}
        <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(20,60,160,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-blue-900/70 dark:text-blue-300 uppercase tracking-wider">
              Total Master Pasien
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalPatients}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Database induk seluruh pasien RS
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* KARTU 2: PASIEN PEREMPUAN / OBSTETRI */}
        <div className="rounded-2xl border-2 border-pink-200/90 dark:border-pink-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(220,50,100,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Pasien Kebidanan
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {femalePatients}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Pasien perempuan terdaftar
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <HeartPulse className="h-5 w-5" />
          </div>
        </div>

        {/* KARTU 3: MEMILIKI RIWAYAT ADMISI */}
        <div className="rounded-2xl border-2 border-indigo-200/90 dark:border-indigo-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(90,60,200,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Pernah Berobat
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {withAdmissionsCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Memiliki riwayat admisi RS
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <ClipboardPlus className="h-5 w-5" />
          </div>
        </div>

        {/* KARTU 4: SEDANG DIRAWAT AKTIF */}
        <div className="rounded-2xl border-2 border-emerald-200/90 dark:border-emerald-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(20,160,100,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Sedang Dirawat
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeCareCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Kunjungan berstatus PELAYANAN
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* FEEDBACK & ERROR ALERTS */}
      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-300 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* HEADER UTAMA & SEARCH FILTER BAR MASTER PASIEN                 */}
      {/* ============================================================== */}
      <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-4 shadow-[0_4px_20px_rgba(20,60,160,0.06)] space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-blue-100 dark:border-blue-900/60">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Master Data Pasien SIGAP App
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Basis data induk identitas pasien permanen (No. RM, NIK, Nama, Usia, Gol. Darah, Alamat). Klik <strong>"Daftarkan Admisi"</strong> untuk mendaftarkan kedatangan pasien masuk RS.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] hover:from-blue-700 hover:to-blue-800 text-xs font-black text-white shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Pasien Baru ke Master</span>
            </button>
          </div>
        </div>

        {/* SEARCH BOX & FILTERS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan No. RM, NIK, Nama Lengkap, atau Alamat Domisili..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* QUICK DROPDOWN FILTERS */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Filter Golongan Darah */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Gol. Darah:</span>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Semua Golongan</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O+">O+</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
                <option value="O-">O-</option>
              </select>
            </div>

            {/* Filter Status Riwayat */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Kunjungan:</span>
              <select
                value={admissionStatusFilter}
                onChange={(e) => setAdmissionStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Sedang Dirawat (Aktif)</option>
                <option value="NEVER">Belum Pernah Admisi</option>
                <option value="COMPLETED">Pernah Selesai / Pulang</option>
              </select>
            </div>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="NEWEST">Terbaru Ditambahkan</option>
              <option value="OLDEST">Terlama</option>
              <option value="NAME_ASC">Nama Pasien (A-Z)</option>
              <option value="MRN_ASC">No. RM Urut</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg ${
                  viewMode === "TABLE"
                    ? "bg-white dark:bg-[#0c183a] text-blue-600 shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Tampilan Tabel"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`p-1.5 rounded-lg ${
                  viewMode === "GRID"
                    ? "bg-white dark:bg-[#0c183a] text-blue-600 shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Tampilan Kartu (Grid)"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TABEL MASTER PASIEN LENGKAP DENGAN AKSI DAFTARKAN ADMISI       */}
      {/* ============================================================== */}
      {viewMode === "TABLE" ? (
        <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] overflow-hidden shadow-[0_4px_20px_rgba(20,60,160,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 dark:from-[#091536] dark:via-[#0c1a45] dark:to-[#091536] text-[10px] font-black uppercase tracking-wider text-blue-900/80 dark:text-blue-300 border-b-2 border-blue-200/90 dark:border-blue-900/80">
                <tr>
                  <th className="py-3 px-3.5">No. RM</th>
                  <th className="py-3 px-3.5">Nama Pasien & NIK</th>
                  <th className="py-3 px-3.5">Usia & Tgl Lahir</th>
                  <th className="py-3 px-3.5">Gender & Gol. Darah</th>
                  <th className="py-3 px-3.5">Alamat & Domisili</th>
                  <th className="py-3 px-3.5">Kontak / No. HP</th>
                  <th className="py-3 px-3.5">Status Kunjungan</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30 text-blue-600" />
                      <p className="font-bold">Tidak ada data pasien yang sesuai kriteria pencarian</p>
                      <p className="text-[11px] mt-0.5">Silakan sesuaikan filter atau tambahkan pasien baru ke Master.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((pat) => {
                    const patAdmissions = admissions.filter((a) => a.patient_id === pat.patient_id);
                    const activeAdm = patAdmissions.find((a) => a.status === "ACTIVE");

                    return (
                      <tr
                        key={pat.patient_id}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        {/* NO. RM */}
                        <td className="py-3 px-3.5 font-mono font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {pat.mrn}
                        </td>

                        {/* NAMA PASIEN & NIK */}
                        <td className="py-3 px-3.5">
                          <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {pat.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIK: {pat.nik_masked || "-"}
                          </div>
                        </td>

                        {/* USIA & LAHIR */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {pat.age_years} Tahun
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {pat.tanggal_lahir ? formatIndoDate(pat.tanggal_lahir) : "-"}
                          </div>
                        </td>

                        {/* GENDER & GOL. DARAH */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80">
                              {pat.gender || "PEREMPUAN"}
                            </span>
                            <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80">
                              {pat.golongan_darah || "O+"}
                            </span>
                          </div>
                        </td>

                        {/* ALAMAT & DOMISILI */}
                        <td className="py-3 px-3.5 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                          <span title={pat.alamat_singkat || "-"}>{pat.alamat_singkat || "-"}</span>
                        </td>

                        {/* KONTAK */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {pat.kontak_darurat || "-"}
                        </td>

                        {/* STATUS KUNJUNGAN */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {activeAdm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              PELAYANAN AKTIF
                            </span>
                          ) : patAdmissions.length > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {patAdmissions.length} Kunjungan Lampau
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                              Belum Pernah Admisi
                            </span>
                          )}
                        </td>

                        {/* AKSI */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* TOMBOL UTAMA: DAFTARKAN ADMISI */}
                            <button
                              type="button"
                              onClick={() => onProceedToAdmission(pat.patient_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] hover:from-blue-700 hover:to-blue-800 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95"
                              title="Daftarkan Pasien Ini ke Admisi / Masuk RS"
                            >
                              <ClipboardPlus className="h-3.5 w-3.5" />
                              <span>Daftarkan Admisi</span>
                            </button>

                            {/* LIHAT DETAIL */}
                            <button
                              type="button"
                              onClick={() => setViewingPatient(pat)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                              title="Lihat Detail Profil Pasien"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(pat)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Identitas Master Pasien"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* HAPUS */}
                            <button
                              type="button"
                              onClick={() => setDeletingPatient(pat)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                              title="Hapus dari Master Pasien"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPatients.map((pat) => {
            const patAdmissions = admissions.filter((a) => a.patient_id === pat.patient_id);
            const activeAdm = patAdmissions.find((a) => a.status === "ACTIVE");

            return (
              <div
                key={pat.patient_id}
                className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-4 shadow-[0_4px_20px_rgba(20,60,160,0.06)] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-xs text-blue-700 dark:text-blue-400">
                        {pat.mrn}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                        {pat.full_name}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        NIK: {pat.nik_masked || "-"}
                      </div>
                    </div>
                    {activeAdm ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        AKTIF
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        {patAdmissions.length} Admisi
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">Usia / Tgl Lahir</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {pat.age_years} Th ({pat.tanggal_lahir || "-"})
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Gender / Gol. Darah</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {pat.gender || "P"} • {pat.golongan_darah || "O+"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-400">Domisili</div>
                      <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {pat.alamat_singkat || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewingPatient(pat)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      title="Lihat Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(pat)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPatient(pat)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onProceedToAdmission(pat.patient_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] text-white text-xs font-black shadow-xs hover:shadow-md"
                  >
                    <ClipboardPlus className="h-3.5 w-3.5" />
                    <span>Daftarkan Admisi</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TAMBAH PASIEN BARU KE MASTER PASIEN                   */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Tambah Pasien Baru ke Master Pasien
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Registrasi identitas dasar pasien ke basis data induk rumah sakit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* NO. RM */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    No. Rekam Medis (No. RM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    placeholder="Contoh: 494949"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* NIK */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    NIK (Nomor Induk Kependudukan)
                  </label>
                  <input
                    type="text"
                    value={nikMasked}
                    onChange={(e) => setNikMasked(e.target.value)}
                    placeholder="3302**********01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* NAMA LENGKAP */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  Nama Lengkap Pasien <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Ny. Maryam Rahmawati"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* TANGGAL LAHIR */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={tanggalLahir}
                    onChange={(e) => handleTanggalLahirChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* USIA */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Usia (Tahun) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={12}
                    max={80}
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    placeholder="28"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* JENIS KELAMIN */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="PEREMPUAN">Perempuan</option>
                    <option value="LAKI_LAKI">Laki-Laki</option>
                  </select>
                </div>

                {/* GOLONGAN DARAH */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Golongan Darah & Rhesus
                  </label>
                  <select
                    value={golonganDarah}
                    onChange={(e) => setGolonganDarah(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="A+">A (+)</option>
                    <option value="B+">B (+)</option>
                    <option value="AB+">AB (+)</option>
                    <option value="O+">O (+)</option>
                    <option value="A-">A (-)</option>
                    <option value="B-">B (-)</option>
                    <option value="AB-">AB (-)</option>
                    <option value="O-">O (-)</option>
                    <option value="TIDAK_DIKETAHUI">Belum Diketahui</option>
                  </select>
                </div>
              </div>

              {/* ALAMAT */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  Alamat Lengkap / Domisili
                </label>
                <textarea
                  rows={2}
                  value={alamatSingkat}
                  onChange={(e) => setAlamatSingkat(e.target.value)}
                  placeholder="Jl. Raya Banyumas RT 02/04, Somagede, Banyumas"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* KONTAK DARURAT */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  No. Telepon / WhatsApp / Kontak Darurat
                </label>
                <input
                  type="text"
                  value={kontakDarurat}
                  onChange={(e) => setKontakDarurat(e.target.value)}
                  placeholder="0812-3456-7890 (Suami - Tn. Budi)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] text-white font-black shadow-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan ke Master Pasien"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT IDENTITAS MASTER PASIEN                           */}
      {/* ============================================================== */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Edit Identitas Master Pasien ({editingPatient.mrn})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Perbarui data identitas pasien di database induk.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    No. Rekam Medis (No. RM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMrn}
                    onChange={(e) => setEditMrn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    NIK
                  </label>
                  <input
                    type="text"
                    value={editNikMasked}
                    onChange={(e) => setEditNikMasked(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  Nama Lengkap Pasien <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={editTanggalLahir}
                    onChange={(e) => handleTanggalLahirChange(e.target.value, true)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    required
                    min={12}
                    max={80}
                    value={editAgeYears}
                    onChange={(e) => setEditAgeYears(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold"
                  >
                    <option value="PEREMPUAN">Perempuan</option>
                    <option value="LAKI_LAKI">Laki-Laki</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Golongan Darah & Rhesus
                  </label>
                  <select
                    value={editGolonganDarah}
                    onChange={(e) => setEditGolonganDarah(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold"
                  >
                    <option value="A+">A (+)</option>
                    <option value="B+">B (+)</option>
                    <option value="AB+">AB (+)</option>
                    <option value="O+">O (+)</option>
                    <option value="A-">A (-)</option>
                    <option value="B-">B (-)</option>
                    <option value="AB-">AB (-)</option>
                    <option value="O-">O (-)</option>
                    <option value="TIDAK_DIKETAHUI">Belum Diketahui</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  Alamat Lengkap / Domisili
                </label>
                <textarea
                  rows={2}
                  value={editAlamatSingkat}
                  onChange={(e) => setEditAlamatSingkat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  No. Telepon / Kontak Darurat
                </label>
                <input
                  type="text"
                  value={editKontakDarurat}
                  onChange={(e) => setEditKontakDarurat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-md hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
                >
                  {editSubmitting ? "Menyimpan..." : "Perbarui Identitas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: LIHAT DETAIL PROFIL LENGKAP PASIEN                    */}
      {/* ============================================================== */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Detail Master Pasien ({viewingPatient.mrn})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Informasi identitas biologis & riwayat admisi rumah sakit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPatient(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#091536] dark:to-[#0c1a45] p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/80">
                <div className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase">
                  No. Rekam Medis (MRN)
                </div>
                <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-400 mt-0.5">
                  {viewingPatient.mrn}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-1 uppercase">
                  {viewingPatient.full_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NIK: {viewingPatient.nik_masked || "-"} • Kode Sistem: {viewingPatient.patient_code}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">Usia & Tanggal Lahir</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingPatient.age_years} Tahun ({viewingPatient.tanggal_lahir ? formatIndoDate(viewingPatient.tanggal_lahir) : "-"})
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">Gender & Gol. Darah</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingPatient.gender || "PEREMPUAN"} • {viewingPatient.golongan_darah || "O+"}
                  </p>
                </div>
                <div className="col-span-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">Alamat Lengkap / Domisili</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingPatient.alamat_singkat || "-"}
                  </p>
                </div>
                <div className="col-span-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">Kontak / No. Telepon</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingPatient.kontak_darurat || "-"}
                  </p>
                </div>
              </div>

              {/* RIWAYAT ADMISI */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Riwayat Kunjungan / Admisi Pasien
                </h4>
                {admissions.filter((a) => a.patient_id === viewingPatient.patient_id).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada riwayat admisi untuk pasien ini.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {admissions
                      .filter((a) => a.patient_id === viewingPatient.patient_id)
                      .map((adm) => (
                        <div
                          key={adm.admission_id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {adm.admission_code}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {adm.unit_name || "Kamar Bersalin VK"} • Masuk: {formatIndoDate(adm.admission_date)}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            adm.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {adm.status === "ACTIVE" ? "AKTIF" : "SELESAI"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingPatient(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const patId = viewingPatient.patient_id;
                  setViewingPatient(null);
                  onProceedToAdmission(patId);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] text-white text-xs font-black shadow-md"
              >
                <ClipboardPlus className="h-3.5 w-3.5" />
                <span>Daftarkan Admisi Pasien Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: KONFIRMASI HAPUS PASIEN DARI MASTER                    */}
      {/* ============================================================== */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-200 dark:border-red-900/80 bg-white dark:bg-[#0c183a] shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Hapus Pasien dari Master Pasien?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan jika pasien belum memiliki riwayat admisi aktif.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs">
              <div className="font-bold text-red-900 dark:text-red-300">
                {deletingPatient.full_name} ({deletingPatient.mrn})
              </div>
              <div className="text-red-700 dark:text-red-400 text-[11px] mt-0.5">
                NIK: {deletingPatient.nik_masked || "-"} • Usia: {deletingPatient.age_years} Tahun
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingPatient(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeletePatient}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md text-xs disabled:opacity-50"
              >
                {deleteSubmitting ? "Menghapus..." : "Ya, Hapus Pasien"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
