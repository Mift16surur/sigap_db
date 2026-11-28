"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardPlus,
  Download,
  Eye,
  FileText,
  Filter,
  HeartPulse,
  Hospital,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest, BootstrapResponse, EnrichedAdmission } from "@/services/api-client";
import { RiskCategoryBadge } from "@/components/common/StatusBadge";
import type { AdmissionType, Patient } from "@/types";

export function PatientRegistrationView({
  data,
  currentUserId,
  preselectedPatientId,
  onRefresh,
  onProceedToScreening,
  onProceedToMonitoring,
  onNavigateToMasterPasien,
}: {
  data: BootstrapResponse;
  currentUserId: string;
  preselectedPatientId?: string | null;
  onRefresh: () => Promise<void>;
  onProceedToScreening?: (admissionId: string) => void;
  onProceedToMonitoring?: (admissionId: string) => void;
  onNavigateToMasterPasien?: () => void;
}) {
  const { db, enriched_admissions: admissions } = data;

  // Toggle Form Pendaftaran Baru
  const [showForm, setShowForm] = useState<boolean>(true);

  // Search & Filter State
  const [searchAdmQuery, setSearchAdmQuery] = useState<string>("");
  const [filterUnitMasuk, setFilterUnitMasuk] = useState<string>("ALL");
  const [filterAsalRujukan, setFilterAsalRujukan] = useState<string>("ALL");
  const [filterPenjamin, setFilterPenjamin] = useState<string>("ALL");
  const [filterScreeningStatus, setFilterScreeningStatus] = useState<string>("ALL");
  const [filterStatusPelayanan, setFilterStatusPelayanan] = useState<string>("ACTIVE");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "NAME_ASC" | "RISK_HIGH">("NEWEST");

  // Notifications
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Quick Modal Tambah Pasien Baru ke Master langsung dari formulir
  const [showQuickAddPatientModal, setShowQuickAddPatientModal] = useState<boolean>(false);
  const [quickFullName, setQuickFullName] = useState<string>("");
  const [quickMrn, setQuickMrn] = useState<string>("");
  const [quickBirthDate, setQuickBirthDate] = useState<string>("");
  const [quickAge, setQuickAge] = useState<number | string>(28);
  const [quickGender, setQuickGender] = useState<"PEREMPUAN" | "LAKI_LAKI">("PEREMPUAN");
  const [quickBlood, setQuickBlood] = useState<string>("O+");
  const [quickNik, setQuickNik] = useState<string>("");
  const [quickAlamat, setQuickAlamat] = useState<string>("");
  const [quickKontak, setQuickKontak] = useState<string>("");
  const [quickSubmitting, setQuickSubmitting] = useState<boolean>(false);

  // STATE MODAL EDIT ADMISI MASUK
  const [editingAdmission, setEditingAdmission] = useState<EnrichedAdmission | null>(null);
  const [editUnitMasuk, setEditUnitMasuk] = useState<string>("unit-igd-ponek");
  const [editDiagnosaRujukan, setEditDiagnosaRujukan] = useState<string>("");
  const [editKeluhanUtama, setEditKeluhanUtama] = useState<string>("");
  const [editGravida, setEditGravida] = useState<number>(1);
  const [editPara, setEditPara] = useState<number>(0);
  const [editAbortus, setEditAbortus] = useState<number>(0);
  const [editMidwifeName, setEditMidwifeName] = useState<string>("");
  const [editDoctorName, setEditDoctorName] = useState<string>("");
  const [editAsalRujukan, setEditAsalRujukan] = useState<string>("Rujukan Puskesmas");
  const [editFaskesPerujuk, setEditFaskesPerujuk] = useState<string>("");
  const [editNomorRujukan, setEditNomorRujukan] = useState<string>("");
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  // STATE MODAL HAPUS / BATAL ADMISI MASUK
  const [deletingAdmission, setDeletingAdmission] = useState<EnrichedAdmission | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);

  // FORMULIR PENDAFTARAN PASIEN MASUK STATE
  // 1. Pilih Pasien dari Master Pasien
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    preselectedPatientId || (db.patients[0]?.patient_id ?? "")
  );

  // Update selectedPatientId jika props preselectedPatientId berubah
  useEffect(() => {
    if (preselectedPatientId) {
      setSelectedPatientId(preselectedPatientId);
      setShowForm(true);
    }
  }, [preselectedPatientId]);

  // Pasien terpilih dari master
  const selectedPatient = useMemo(
    () => db.patients.find((p) => p.patient_id === selectedPatientId) || db.patients[0],
    [db.patients, selectedPatientId]
  );

  // 2. Data Masuk Dari Mana & Rujukan Dari Mana (Inti Pendaftaran)
  const [unitMasuk, setUnitMasuk] = useState<string>("unit-igd-ponek");
  const [asalRujukan, setAsalRujukan] = useState<string>("Rujukan Puskesmas");
  const [namaFaskesPerujuk, setNamaFaskesPerujuk] = useState<string>("Puskesmas Banyumas");
  const [nomorSuratRujukan, setNomorSuratRujukan] = useState<string>("");
  const [diagnosaRujukan, setDiagnosaRujukan] = useState<string>("");
  const [penjamin, setPenjamin] = useState<string>("BPJS Kesehatan (PBI)");
  const [waktuMasuk, setWaktuMasuk] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("usr-dokter");
  const [doctorNameManual, setDoctorNameManual] = useState<string>("dr. Hepta, Sp.OG");
  const [selectedMidwifeId, setSelectedMidwifeId] = useState<string>("usr-bidan");
  const [midwifeNameManual, setMidwifeNameManual] = useState<string>("bd. Hasta (Bidan Jaga)");
  const [keluhanUtama, setKeluhanUtama] = useState<string>("Kenceng-kenceng teratur dan nyeri perut bagian bawah.");
  const [selectedComplaintTemplate, setSelectedComplaintTemplate] = useState<string>("");

  // Template Keluhan Utama untuk Dropdown
  const COMPLAINT_TEMPLATES = [
    { value: "", label: "-- Pilih Template Keluhan Utama --" },
    { value: "Kenceng-kenceng teratur dan nyeri perut bagian bawah disertai lendir darah (Inpartu Kala 1).", label: "Kenceng-kenceng teratur & lendir darah (Inpartu Kala 1)" },
    { value: "Keluar cairan ketuban merembes dari jalan lahir sejak beberapa jam lalu (Curiga KPD).", label: "Keluar cairan ketuban merembes / pecah dini (KPD)" },
    { value: "Rujukan dengan riwayat tensi tinggi dari faskes perujuk, pusing berputar dan tengkuk berat (Curiga Preeklamsia).", label: "Tekanan darah tinggi / Curiga Preeklamsia dari perujuk" },
    { value: "Nyeri kepala hebat menetap tidak hilang, pandangan mata kabur, dan nyeri ulu hati (Impending Eklamsia).", label: "Nyeri kepala hebat, mata kabur & nyeri ulu hati (Impending Eklamsia)" },
    { value: "Keluar darah merah segar dari jalan lahir tanpa rasa nyeri (Curiga Plasenta Previa / Perdarahan Antepartum).", label: "Keluar darah merah segar dari jalan lahir (Perdarahan Antepartum)" },
    { value: "Gerakan janin dirasakan berkurang / tidak aktif sejak 1 hari terakhir (Evaluasi Kesejahteraan Janin).", label: "Gerakan janin berkurang / tidak dirasakan" },
    { value: "Mules belum teratur, usia kehamilan aterm (Evaluasi Kesiapan Persalinan).", label: "Mules belum teratur, aterm (Evaluasi Persalinan)" },
    { value: "Rujukan terencana untuk terminasi persalinan dengan riwayat Seksio Sesarea (Bekas SC).", label: "Rujukan terencana dengan riwayat bekas SC" },
    { value: "Mual dan muntah berlebihan, badan lemas, tidak bisa makan dan minum (Hiperemesis Gravidarum).", label: "Mual muntah berlebihan & dehidrasi (Hiperemesis)" },
  ];

  // 3. Data Obstetri, Kehamilan Awal & Antropometri (BB, TB, IMT Otomatis)
  const [jenisAdmisi, setJenisAdmisi] = useState<AdmissionType>("ADM_INPARTU");
  const [usiaKehamilanMinggu, setUsiaKehamilanMinggu] = useState<number | string>(38);
  const [usiaKehamilanHari, setUsiaKehamilanHari] = useState<number | string>(0);
  const [beratBadanKg, setBeratBadanKg] = useState<number | string>(60);
  const [tinggiBadanCm, setTinggiBadanCm] = useState<number | string>(158);
  const [gravida, setGravida] = useState<number | string>(1);
  const [para, setPara] = useState<number | string>(0);
  const [abortus, setAbortus] = useState<number | string>(0);
  const [livingChildren, setLivingChildren] = useState<number | string>(0);
  const [riwayatScJumlah, setRiwayatScJumlah] = useState<number | string>(0);

  // Perhitungan IMT Otomatis: BB (kg) / ((TB (cm) / 100) ^ 2)
  const calculatedImt = useMemo(() => {
    const bb = Number(beratBadanKg);
    const tb = Number(tinggiBadanCm);
    if (!bb || !tb || tb <= 0) return 24.0;
    const tbMeter = tb / 100;
    const imt = bb / (tbMeter * tbMeter);
    return Math.round(imt * 10) / 10;
  }, [beratBadanKg, tinggiBadanCm]);

  const imtCategory = useMemo(() => {
    if (calculatedImt < 18.5) {
      return {
        label: "Underweight (< 18.5)",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300",
      };
    }
    if (calculatedImt < 25) {
      return {
        label: "Normal (18.5 - 24.9)",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300",
      };
    }
    if (calculatedImt < 30) {
      return {
        label: "Overweight (25 - 29.9)",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300",
      };
    }
    return {
      label: "Obesitas (≥ 30) - Faktor Risiko PE/HPP",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 font-bold",
    };
  }, [calculatedImt]);

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

  function formatIndoDateTime(dateStr?: string) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
      ];
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${mins} WIB`;
    } catch {
      return dateStr;
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

  // Submit Pendaftaran Pasien Masuk Baru
  async function handleRegisterAdmission(e: React.FormEvent, proceedToScreening = false) {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg("Pilih pasien dari Master Pasien terlebih dahulu.");
      return;
    }

    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);

    try {
      const unitObj = db.units.find((u) => u.unit_id === unitMasuk);
      const docObj = db.master_catalog?.doctors?.find((d) => d.doctor_id === selectedDoctorId);
      const midObj = db.master_catalog?.midwives_nurses?.find((m) => m.staff_id === selectedMidwifeId);

      const payload = {
        patient_id: selectedPatient.patient_id,
        jenis_admisi: jenisAdmisi,
        asal_rujukan: asalRujukan,
        referral_facility_name: namaFaskesPerujuk.trim() || undefined,
        nomor_rujukan: nomorSuratRujukan.trim() || undefined,
        diagnosa_rujukan: diagnosaRujukan.trim() || undefined,
        penjamin: penjamin,
        unit_id: unitMasuk,
        unit_name: unitObj?.name || "Kamar Bersalin (VK)",
        keluhan_utama: diagnosaRujukan.trim() || keluhanUtama.trim() || "Pendaftaran pasien masuk persalinan.",
        usia_kehamilan_minggu: Number(usiaKehamilanMinggu || 38),
        usia_kehamilan_hari: Number(usiaKehamilanHari || 0),
        gravida: Number(gravida || 1),
        para: Number(para || 0),
        abortus: Number(abortus || 0),
        living_children: Number(livingChildren || 0),
        riwayat_sc_jumlah: Number(riwayatScJumlah || 0),
        imt_nilai: calculatedImt,
        attending_doctor_id: selectedDoctorId,
        attending_doctor_name: docObj?.full_name || doctorNameManual || "dr. Spesialis Kandungan, Sp.OG",
        receiving_midwife_id: selectedMidwifeId,
        receiving_midwife_name: midObj?.full_name || midwifeNameManual || "Bd. Pelaksana VK",
      };

      const res = await apiRequest<{ ok: boolean; admission: any; error?: string }>(
        "/admissions",
        {
          method: "POST",
          userId: currentUserId,
          body: payload,
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Gagal menyimpan pendaftaran pasien");
      }

      setFeedbackMsg(
        `Pasien "${selectedPatient.full_name}" (${selectedPatient.mrn}) berhasil didaftarkan ke ${unitObj?.name || "Unit Pelayanan"} [No. Admisi: ${res.admission.admission_code}].`
      );

      await onRefresh();

      if (proceedToScreening && onProceedToScreening) {
        onProceedToScreening(res.admission.admission_id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses pendaftaran pasien.");
    } finally {
      setSubmitting(false);
    }
  }

  // Quick Add Patient ke Master Pasien
  async function handleQuickAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setQuickSubmitting(true);
    try {
      const res = await apiRequest<{ ok: boolean; patient: Patient; error?: string }>(
        "/patients",
        {
          method: "POST",
          userId: currentUserId,
          body: {
            full_name: quickFullName.trim(),
            mrn: quickMrn.trim(),
            tanggal_lahir: quickBirthDate,
            age_years: Number(quickAge || 28),
            gender: quickGender,
            golongan_darah: quickBlood,
            nik_masked: quickNik.trim() || undefined,
            alamat_singkat: quickAlamat.trim() || undefined,
            kontak_darurat: quickKontak.trim() || undefined,
          },
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Gagal menambahkan pasien ke Master Pasien");
      }

      await onRefresh();
      setSelectedPatientId(res.patient.patient_id);
      setShowQuickAddPatientModal(false);
      setFeedbackMsg(`Pasien baru "${res.patient.full_name}" (${res.patient.mrn}) berhasil dibuat di Master Pasien dan terpilih untuk pendaftaran.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat pasien baru.");
    } finally {
      setQuickSubmitting(false);
    }
  }

  // Buka Modal Edit Admisi Masuk
  function handleOpenEditModal(adm: EnrichedAdmission) {
    setEditingAdmission(adm);
    setEditUnitMasuk(adm.unit_id || "unit-igd-ponek");
    setEditDiagnosaRujukan(adm.diagnosa_rujukan || "");
    setEditKeluhanUtama(adm.keluhan_utama || "");
    setEditGravida(adm.obstetric_history?.gravida ?? 1);
    setEditPara(adm.obstetric_history?.para ?? 0);
    setEditAbortus(adm.obstetric_history?.abortus ?? 0);
    setEditMidwifeName(adm.receiving_midwife_name || "bd. Hasta (Bidan Jaga)");
    setEditDoctorName(adm.attending_doctor_name || "dr. Hepta, Sp.OG");
    setEditAsalRujukan(adm.asal_rujukan || "Rujukan Puskesmas");
    setEditFaskesPerujuk(adm.referral_facility_name || "");
    setEditNomorRujukan(adm.nomor_rujukan || "");
  }

  // Simpan Perubahan Data Admisi Masuk
  async function handleSaveEditAdmission(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAdmission) return;
    setEditSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "UPDATE_ADMISSION",
          admission_id: editingAdmission.admission_id,
          unit_id: editUnitMasuk,
          diagnosa_rujukan: editDiagnosaRujukan.trim() || undefined,
          keluhan_utama: editKeluhanUtama.trim() || undefined,
          obstetric_history: {
            gravida: Number(editGravida) || 1,
            para: Number(editPara) || 0,
            abortus: Number(editAbortus) || 0,
          },
          receiving_midwife_name: editMidwifeName.trim() || undefined,
          attending_doctor_name: editDoctorName.trim() || undefined,
          asal_rujukan: editAsalRujukan,
          referral_facility_name: editFaskesPerujuk.trim() || undefined,
          nomor_rujukan: editNomorRujukan.trim() || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error || "Gagal memperbarui data pendaftaran admisi");
      setFeedbackMsg(`Data pendaftaran ${editingAdmission.admission_code} (${editingAdmission.patient?.full_name}) berhasil diperbarui.`);
      setEditingAdmission(null);
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui data pendaftaran admisi.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Konfirmasi Batal / Hapus Pendaftaran Admisi
  async function handleConfirmDeleteAdmission() {
    if (!deletingAdmission) return;
    setDeleteSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest("/admissions", {
        method: "POST",
        userId: currentUserId,
        body: {
          action: "DELETE_ADMISSION",
          admission_id: deletingAdmission.admission_id,
        },
      });
      if (!res.ok) throw new Error(res.error || "Gagal membatalkan pendaftaran admisi");
      setFeedbackMsg(`Pendaftaran admisi ${deletingAdmission.admission_code} (${deletingAdmission.patient?.full_name}) berhasil dibatalkan / dihapus.`);
      setDeletingAdmission(null);
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membatalkan pendaftaran admisi.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // Filter & Urutkan Daftar Pendaftaran Masuk RS
  const filteredAdmissions = useMemo(() => {
    let result = admissions.filter((adm) => {
      // Filter status pelayanan
      if (filterStatusPelayanan === "ACTIVE" && adm.status === "CLOSED") return false;
      if (filterStatusPelayanan === "CLOSED" && adm.status !== "CLOSED") return false;

      // Filter Pencarian
      const q = searchAdmQuery.trim().toLowerCase();
      if (q) {
        const p = adm.patient;
        const match =
          adm.admission_code.toLowerCase().includes(q) ||
          (p && p.full_name.toLowerCase().includes(q)) ||
          (p && p.mrn.toLowerCase().includes(q)) ||
          (adm.diagnosa_rujukan && adm.diagnosa_rujukan.toLowerCase().includes(q)) ||
          (adm.keluhan_utama && adm.keluhan_utama.toLowerCase().includes(q)) ||
          (adm.receiving_midwife_name && adm.receiving_midwife_name.toLowerCase().includes(q)) ||
          (adm.unit?.name && adm.unit.name.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Filter Masuk Dari Mana (Unit)
      if (filterUnitMasuk !== "ALL") {
        if (filterUnitMasuk === "unit-igd-ponek") {
          const isIgd = adm.unit_id === "unit-igd-ponek" || (adm.unit_name && adm.unit_name.toLowerCase().includes("igd"));
          if (!isIgd) return false;
        } else if (filterUnitMasuk === "unit-poli") {
          const isPoli = adm.unit_id === "unit-poli" || (adm.unit_name && (adm.unit_name.toLowerCase().includes("poli") || adm.unit_name.toLowerCase().includes("rajal")));
          if (!isPoli) return false;
        } else if (adm.unit_id !== filterUnitMasuk) {
          return false;
        }
      }

      // Filter Status Skrining
      if (filterScreeningStatus !== "ALL") {
        const peCat = adm.latest_pe_result?.category;
        const hppCat = adm.latest_hpp_result?.category;
        const isHigh = peCat === "HIGH" || hppCat === "HIGH";
        const isMod = peCat === "MODERATE" || hppCat === "MODERATE";
        const isLow = peCat === "LOW" && hppCat === "LOW";
        const isUnscreened = !peCat && !hppCat;

        if (filterScreeningStatus === "HIGH" && !isHigh) return false;
        if (filterScreeningStatus === "MODERATE" && !isMod) return false;
        if (filterScreeningStatus === "LOW" && !isLow) return false;
        if (filterScreeningStatus === "UNSCREENED" && !isUnscreened) return false;
      }

      return true;
    });

    if (sortBy === "NEWEST") {
      result.sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime());
    } else if (sortBy === "OLDEST") {
      result.sort((a, b) => new Date(a.admission_date).getTime() - new Date(b.admission_date).getTime());
    } else if (sortBy === "NAME_ASC") {
      result.sort((a, b) => (a.patient?.full_name || "").localeCompare(b.patient?.full_name || ""));
    } else if (sortBy === "RISK_HIGH") {
      result.sort((a, b) => {
        const aHigh = a.latest_pe_result?.category === "HIGH" || a.latest_hpp_result?.category === "HIGH" ? 1 : 0;
        const bHigh = b.latest_pe_result?.category === "HIGH" || b.latest_hpp_result?.category === "HIGH" ? 1 : 0;
        return bHigh - aHigh;
      });
    }

    return result;
  }, [
    admissions,
    filterStatusPelayanan,
    searchAdmQuery,
    filterUnitMasuk,
    filterAsalRujukan,
    filterPenjamin,
    filterScreeningStatus,
    sortBy,
  ]);

  // Statistik Cepat Pendaftaran
  const totalAdmCount = admissions.length;
  const vkIgdCount = admissions.filter((a) => a.unit_id === "unit-igd-ponek" || a.asal_rujukan.includes("IGD")).length;
  const poliCount = admissions.filter((a) => a.unit_id === "unit-poli" || a.asal_rujukan.includes("Poli")).length;
  const activeCount = admissions.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-4 select-none pb-12">
      {/* ============================================================== */}
      {/* 4 KARTU STATISTIK PENDAFTARAN PASIEN MASUK                      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(20,60,160,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-blue-900/70 dark:text-blue-300 uppercase tracking-wider">
              Total Pendaftaran
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalAdmCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Riwayat admisi pasien masuk RS
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <ClipboardPlus className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border-2 border-rose-200/90 dark:border-rose-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(220,50,100,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Pasien Masuk VK IGD
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {vkIgdCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Penerimaan dari IGD PONEK
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <HeartPulse className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border-2 border-indigo-200/90 dark:border-indigo-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(90,60,200,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Pasien dari Poli
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {poliCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Rujukan Poliklinik Rawat Jalan
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200/90 dark:border-emerald-900/80 bg-white dark:bg-[#0c183a] p-3.5 shadow-[0_4px_20px_rgba(20,160,100,0.06)] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Sedang Diskrining
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Kunjungan berstatus PELAYANAN
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <BedDouble className="h-5 w-5" />
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
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-600 hover:text-emerald-800">
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
          <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* FORMULIR PENDAFTARAN PASIEN MASUK (HEADER BIRU ELEGAN)        */}
      {/* ============================================================== */}
      <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] overflow-hidden shadow-[0_4px_20px_rgba(20,60,160,0.06)]">
        {/* HEADER BIRU FORMULIR (Sesuai Gaya Yang Disukai Pengguna) */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-[#1d4ed8] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs text-white">
              <ClipboardPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">
                  Pendaftaran Pasien & Admisi Masuk (FR-04)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase tracking-wider">
                  Kedatangan RS
                </span>
              </div>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Mendaftarkan pasien masuk RS: pilih pasien dari Master Pasien, catat unit masuk (VK IGD, Poli, dll), asal rujukan (Puskesmas, Bidan Mandiri, Datang Sendiri), penjamin, DPJP, keluhan, dan data kehamilan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToMasterPasien && (
              <button
                type="button"
                onClick={onNavigateToMasterPasien}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
                title="Buka Database Master Pasien"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Lihat Master Pasien</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-blue-800 hover:bg-blue-50 text-xs font-black shadow-xs transition-colors"
            >
              <span>{showForm ? "Tutup Formulir" : "+ Buka Formulir Pendaftaran"}</span>
            </button>
          </div>
        </div>

        {/* ISI FORMULIR PENDAFTARAN */}
        {showForm && (
          <form onSubmit={(e) => handleRegisterAdmission(e, false)} className="p-5 space-y-4 text-xs">
            {/* BAGIAN 1: PILIH PASIEN DARI MASTER PASIEN */}
            <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/80 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  1. Pilih Pasien yang Mendaftar (dari Master Pasien):
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddPatientModal(true)}
                  className="text-[11px] font-black text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Pasien Belum Terdaftar? Tambah Pasien Baru ke Master &rarr;</span>
                </button>
              </div>

              {/* SELECT PASIEN TERDAFTAR */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-[#0c183a] text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {db.patients.map((pat) => (
                    <option key={pat.patient_id} value={pat.patient_id}>
                      {pat.full_name} — No. RM: {pat.mrn} (Usia: {pat.age_years} th • Gol. Darah: {pat.golongan_darah || "O+"})
                    </option>
                  ))}
                </select>
              </div>

              {/* KARTU INFO PASIEN TERPILIH */}
              {selectedPatient && (
                <div className="rounded-xl bg-white dark:bg-[#0c183a] p-3 border border-blue-200/90 dark:border-blue-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                      {selectedPatient.golongan_darah || "O+"}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-white uppercase">
                        {selectedPatient.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        No. RM: <strong className="text-blue-700 dark:text-blue-400">{selectedPatient.mrn}</strong> • NIK: {selectedPatient.nik_masked || "-"} • Usia: {selectedPatient.age_years} Tahun
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Domisili: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedPatient.alamat_singkat || "-"}</span></div>
                    <div>Kontak: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedPatient.kontak_darurat || "-"}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* BAGIAN 2: DATA KEDATANGAN MASUK (UNIT, WAKTU, BIDAN, DIAGNOSA) */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Hospital className="h-4 w-4 text-blue-600" />
                2. Data Pendaftaran Masuk:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. MASUK DARI MANA (UNIT PENERIMA) */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Masuk Dari Mana? (Unit Penerima) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={unitMasuk}
                    onChange={(e) => setUnitMasuk(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="unit-igd-ponek">IGD</option>
                    <option value="unit-poli">Rawat Jalan (Rajal)</option>
                  </select>
                </div>

                {/* 2. WAKTU MASUK / KEDATANGAN */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Waktu Masuk / Kedatangan
                  </label>
                  <input
                    type="datetime-local"
                    value={waktuMasuk}
                    onChange={(e) => setWaktuMasuk(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-mono font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {/* 3. BIDAN / PERAWAT PENERIMA */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Bidan / Perawat Penerima Admisi
                  </label>
                  <input
                    type="text"
                    value={midwifeNameManual}
                    onChange={(e) => setMidwifeNameManual(e.target.value)}
                    placeholder="Contoh: bd. Hasta / Bd. Ratna, S.Tr.Keb"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* 4. DIAGNOSA AWAL RUJUKAN */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Diagnosa Awal / Pengantar Perujuk
                  </label>
                  <input
                    type="text"
                    value={diagnosaRujukan}
                    onChange={(e) => setDiagnosaRujukan(e.target.value)}
                    placeholder="Contoh: G1P0A0 38 mgg inpartu kala 1 fase aktif"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN 3: DATA OBSTETRI & KEHAMILAN AWAL */}
            <div className="space-y-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-rose-600" />
                3. Riwayat Kehamilan & Paritas Saat Admisi:
              </h4>

              {/* Baris 1: Jenis Admisi, Usia Kehamilan, Bekas SC */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Jenis Admisi Obstetri
                  </label>
                  <select
                    value={jenisAdmisi}
                    onChange={(e) => setJenisAdmisi(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="ADM_INPARTU">Admisi Inpartu (Persalinan Aktif)</option>
                    <option value="ADM_ANTENATAL">Admisi Antenatal (Patologi / Observasi)</option>
                    <option value="ADM_POSTPARTUM">Admisi Postpartum (Nifas)</option>
                    <option value="RUJUKAN_EMERGENSI">Rujukan Emergensi Maternal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    UK (Minggu)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={44}
                    value={usiaKehamilanMinggu}
                    onChange={(e) => setUsiaKehamilanMinggu(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    UK (Hari)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={usiaKehamilanHari}
                    onChange={(e) => setUsiaKehamilanHari(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Jumlah Bekas SC
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={riwayatScJumlah}
                    onChange={(e) => setRiwayatScJumlah(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>
              </div>

              {/* Baris 2: ANTROPOMETRI & IMT OTOMATIS DENGAN BERAT BADAN DAN TINGGI BADAN */}
              <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-blue-50/60 dark:from-[#091536] dark:via-[#0c1a45] dark:to-[#091536] p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-black text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                      Antropometri & Perhitungan IMT Otomatis:
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${imtCategory.badgeColor}`}>
                    {imtCategory.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* BERAT BADAN */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                      Berat Badan (BB) dalam kg <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min={30}
                        max={200}
                        required
                        value={beratBadanKg}
                        onChange={(e) => setBeratBadanKg(e.target.value)}
                        placeholder="60"
                        className="w-full py-2 pl-3 pr-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c183a] font-black text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>

                  {/* TINGGI BADAN */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                      Tinggi Badan (TB) dalam cm <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min={100}
                        max={220}
                        required
                        value={tinggiBadanCm}
                        onChange={(e) => setTinggiBadanCm(e.target.value)}
                        placeholder="158"
                        className="w-full py-2 pl-3 pr-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c183a] font-black text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        cm
                      </span>
                    </div>
                  </div>

                  {/* IMT OTOMATIS */}
                  <div>
                    <label className="block text-[11px] font-black text-blue-900 dark:text-blue-300 mb-1">
                      IMT Ibu (kg/m²) — Dihitung Otomatis
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={`${calculatedImt} kg/m²`}
                        className="w-full py-2 px-3 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-[#0c183a] font-black text-center text-blue-950 dark:text-blue-100 cursor-not-allowed text-sm shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 3: Paritas (G, P, A, Anak Hidup) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Gravida (G)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={gravida}
                    onChange={(e) => setGravida(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Para (P)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={para}
                    onChange={(e) => setPara(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Abortus (A)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={abortus}
                    onChange={(e) => setAbortus(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Anak Hidup
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={livingChildren}
                    onChange={(e) => setLivingChildren(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* TOMBOL AKSI SIMPAN FORMULIR */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setKeluhanUtama("");
                  setNomorSuratRujukan("");
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition-colors text-xs"
              >
                Reset Formulir
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black shadow-md text-xs transition-all disabled:opacity-50"
              >
                {submitting ? "Menyimpan Pendaftaran..." : "Simpan Pendaftaran Saja"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => handleRegisterAdmission(e, true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-[#1d4ed8] hover:from-blue-700 hover:to-blue-800 text-white font-black shadow-lg shadow-blue-500/25 active:scale-95 text-xs transition-all disabled:opacity-50"
              >
                <HeartPulse className="h-4 w-4" />
                <span>Daftarkan & Langsung Lanjut Skrining &rarr;</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================== */}
      {/* DAFTAR PENDAFTARAN PASIEN (KUNJUNGAN MASUK RS)                  */}
      {/* FILTER LENGKAP TAPI SIMPEL DENGAN GARIS TEGAS BERBAYANG         */}
      {/* ============================================================== */}
      <div className="rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/80 bg-white dark:bg-[#0c183a] p-4 shadow-[0_4px_20px_rgba(20,60,160,0.06)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100 dark:border-blue-900/60">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardPlus className="h-4 w-4 text-blue-600" />
              Daftar Pendaftaran Pasien Masuk RS ({filteredAdmissions.length} Kunjungan)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Menampilkan riwayat pendaftaran kedatangan pasien, unit penerima (IGD / Rajal), diagnosa, dan status skrining klinis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* BAR FILTER LENGKAP TAPI TERASA SIMPEL (REQUEST 7) */}
        <div className="space-y-2.5">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchAdmQuery}
              onChange={(e) => setSearchAdmQuery(e.target.value)}
              placeholder="Cari berdasarkan No. RM, Nama Pasien, No. Admisi, Bidan, atau Diagnosa..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchAdmQuery && (
              <button
                type="button"
                onClick={() => setSearchAdmQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* BARIS DROPDOWN FILTER (DISESUAIKAN DENGAN INPUTAN) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Filter Masuk Dari Mana (Unit: IGD / Rajal) */}
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Masuk Dari Mana:</span>
              <select
                value={filterUnitMasuk}
                onChange={(e) => setFilterUnitMasuk(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Semua Unit</option>
                <option value="unit-igd-ponek">IGD</option>
                <option value="unit-poli">Rawat Jalan (Rajal)</option>
              </select>
            </div>

            {/* Filter Status Skrining */}
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Hasil Skrining:</span>
              <select
                value={filterScreeningStatus}
                onChange={(e) => setFilterScreeningStatus(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Semua Skrining</option>
                <option value="HIGH">Risiko Tinggi (Merah)</option>
                <option value="MODERATE">Risiko Sedang (Kuning)</option>
                <option value="LOW">Risiko Rendah (Hijau)</option>
                <option value="UNSCREENED">Belum Diskrining</option>
              </select>
            </div>

            {/* Filter Status Pelayanan */}
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Status Pelayanan:</span>
              <select
                value={filterStatusPelayanan}
                onChange={(e) => setFilterStatusPelayanan(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ACTIVE">Pelayanan Aktif</option>
                <option value="CLOSED">Selesai / Pulang (RPP)</option>
                <option value="ALL">Semua Status</option>
              </select>
            </div>

            {/* Urutan */}
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Urutan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c183a] text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="NEWEST">Terbaru Masuk</option>
                <option value="OLDEST">Terlama Masuk</option>
                <option value="NAME_ASC">Nama Pasien A-Z</option>
                <option value="RISK_HIGH">Prioritas Risiko Tinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL DAFTAR PENDAFTARAN PASIEN MASUK (SESUAI INPUTAN) */}
        <div className="rounded-xl border border-blue-200/90 dark:border-blue-900/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 dark:from-[#091536] dark:via-[#0c1a45] dark:to-[#091536] text-[10px] font-black uppercase tracking-wider text-blue-950 dark:text-blue-300 border-b-2 border-blue-200/90 dark:border-blue-900/80">
                <tr>
                  <th className="py-3 px-3">No. Admisi</th>
                  <th className="py-3 px-3">Waktu Masuk</th>
                  <th className="py-3 px-3">Nama Pasien</th>
                  <th className="py-3 px-3">No. RM</th>
                  <th className="py-3 px-3 text-center">Usia</th>
                  <th className="py-3 px-3 text-center">GPA</th>
                  <th className="py-3 px-3">Masuk Dari</th>
                  <th className="py-3 px-3">Diagnosa Awal</th>
                  <th className="py-3 px-3">Bidan / Penerima</th>
                  <th className="py-3 px-3">Hasil Skrining</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <ClipboardPlus className="h-8 w-8 mx-auto mb-2 opacity-30 text-blue-600" />
                      <p className="font-bold">Tidak ada pendaftaran admisi yang sesuai filter</p>
                      <p className="text-[11px] mt-0.5">Gunakan formulir di atas untuk mendaftarkan pasien masuk RS.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((adm) => {
                    const pat = adm.patient;
                    const peCat = adm.latest_pe_result?.category;
                    const hppCat = adm.latest_hpp_result?.category;
                    const hasHighRisk = peCat === "HIGH" || hppCat === "HIGH";
                    const isUnscreened = !peCat && !hppCat;

                    return (
                      <tr
                        key={adm.admission_id}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        {/* 1. NO. ADMISI */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                            {adm.admission_code}
                          </span>
                        </td>

                        {/* 2. WAKTU MASUK */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{formatIndoDateTime(adm.admission_date)}</span>
                          </div>
                        </td>

                        {/* 3. NAMA PASIEN */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {pat?.full_name || "Pasien"}
                          </div>
                        </td>

                        {/* 4. NO. RM */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                            {pat?.mrn || "-"}
                          </span>
                        </td>

                        {/* 5. USIA */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pat?.age_years ? `${pat.age_years} Th` : "-"}
                          </span>
                        </td>

                        {/* 6. STATUS OBSTETRI (GPA) */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            G{adm.obstetric_history?.gravida ?? 1}P{adm.obstetric_history?.para ?? 0}A{adm.obstetric_history?.abortus ?? 0}
                          </span>
                        </td>

                        {/* MASUK DARI MANA (IGD / RAJAL) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200">
                            <Hospital className="h-3 w-3 text-blue-600" />
                            {adm.unit_id === "unit-poli" || (adm.unit_name && (adm.unit_name.toLowerCase().includes("poli") || adm.unit_name.toLowerCase().includes("rajal") || adm.unit_name.toLowerCase().includes("rawat jalan")))
                              ? "Rawat Jalan (Rajal)"
                              : "IGD"}
                          </span>
                        </td>

                        {/* DIAGNOSA AWAL / PENGANTAR */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200 max-w-[200px] line-clamp-2" title={adm.diagnosa_rujukan || adm.keluhan_utama || "-"}>
                            {adm.diagnosa_rujukan || adm.keluhan_utama || "-"}
                          </div>
                        </td>

                        {/* BIDAN / PERAWAT PENERIMA */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {adm.receiving_midwife_name || "Bd. Penerima"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Bidan / Perawat Penerima
                          </div>
                        </td>

                        {/* HASIL SKRINING */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isUnscreened ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                              Belum Diskrining
                            </span>
                          ) : hasHighRisk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                              RISIKO TINGGI (HIGH)
                            </span>
                          ) : peCat === "MODERATE" || hppCat === "MODERATE" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300">
                              RISIKO SEDANG (MODERATE)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                              RISIKO RENDAH (LOW)
                            </span>
                          )}
                        </td>

                        {/* STATUS ADMISI */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            adm.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {adm.status === "ACTIVE" ? "PELAYANAN" : "SELESAI"}
                          </span>
                        </td>

                        {/* AKSI: SKRINING & MONITORING */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* TOMBOL SKRINING (BIRU MENYALA) */}
                            {onProceedToScreening && (
                              <button
                                type="button"
                                onClick={() => onProceedToScreening(adm.admission_id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] hover:from-blue-700 hover:to-blue-800 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95"
                                title="Buka Skrining Preeklamsia & HPP 4T Pasien Ini"
                              >
                                <HeartPulse className="h-3.5 w-3.5" />
                                <span>Skrining</span>
                              </button>
                            )}

                            {/* TOMBOL MONITORING & SBAR */}
                            {onProceedToMonitoring && (
                              <button
                                type="button"
                                onClick={() => onProceedToMonitoring(adm.admission_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 text-xs font-bold transition-all shadow-xs"
                                title="Monitoring Tanda Vital & Laporan SBAR"
                              >
                                <Activity className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Monitoring</span>
                              </button>
                            )}

                            {/* TOMBOL EDIT ADMISI */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(adm)}
                              className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                              title="Edit Data Pendaftaran Admisi"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* TOMBOL HAPUS / BATAL ADMISI */}
                            <button
                              type="button"
                              onClick={() => setDeletingAdmission(adm)}
                              className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs"
                              title="Hapus / Batalkan Pendaftaran Admisi"
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
      </div>

      {/* ============================================================== */}
      {/* MODAL CEPAT: TAMBAH PASIEN BARU KE MASTER PASIEN                */}
      {/* (Bila pasien belum pernah terdaftar sama sekali di RS)         */}
      {/* ============================================================== */}
      {showQuickAddPatientModal && (
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
                    Pasien akan otomatis tersimpan di Master Pasien dan terpilih untuk pendaftaran.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddPatientModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddPatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    No. Rekam Medis (No. RM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickMrn}
                    onChange={(e) => setQuickMrn(e.target.value)}
                    placeholder="Contoh: 494950"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    NIK
                  </label>
                  <input
                    type="text"
                    value={quickNik}
                    onChange={(e) => setQuickNik(e.target.value)}
                    placeholder="3302**********01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-mono text-slate-900 dark:text-white"
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
                  value={quickFullName}
                  onChange={(e) => setQuickFullName(e.target.value)}
                  placeholder="Contoh: Ny. Siti Aminah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={quickBirthDate}
                    onChange={(e) => {
                      setQuickBirthDate(e.target.value);
                      if (e.target.value) {
                        const birth = new Date(e.target.value);
                        const diff = new Date().getFullYear() - birth.getFullYear();
                        if (diff > 0 && diff < 120) setQuickAge(diff);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={80}
                    value={quickAge}
                    onChange={(e) => setQuickAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    Gol. Darah
                  </label>
                  <select
                    value={quickBlood}
                    onChange={(e) => setQuickBlood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-bold"
                  >
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O+">O+</option>
                    <option value="TIDAK_DIKETAHUI">Belum Tahu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  Alamat Domisili
                </label>
                <input
                  type="text"
                  value={quickAlamat}
                  onChange={(e) => setQuickAlamat(e.target.value)}
                  placeholder="Kec. Somagede, Kab. Banyumas"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={quickKontak}
                  onChange={(e) => setQuickKontak(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickAddPatientModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#1d4ed8] text-white font-black shadow-md disabled:opacity-50"
                >
                  {quickSubmitting ? "Menyimpan..." : "Simpan & Pilih Pasien Ini"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA PENDAFTARAN ADMISI */}
      {editingAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Edit Data Pendaftaran Admisi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  No. Admisi: <span className="font-mono font-bold text-blue-600">{editingAdmission.admission_code}</span> &bull; {editingAdmission.patient?.full_name} (RM {editingAdmission.patient?.mrn})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmission} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Masuk / Ruang Perawatan *
                  </label>
                  <select
                    value={editUnitMasuk}
                    onChange={(e) => setEditUnitMasuk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                    required
                  >
                    <option value="unit-igd-ponek">IGD Obstetri / PONEK 24 Jam</option>
                    <option value="unit-vk">Kamar Bersalin (VK)</option>
                    <option value="unit-icu-kebidanan">ICU / HCU Kebidanan</option>
                    <option value="unit-nifas">Ruang Rawat Inap Nifas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Asal Rujukan *
                  </label>
                  <select
                    value={editAsalRujukan}
                    onChange={(e) => setEditAsalRujukan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                    required
                  >
                    <option value="Datang Sendiri">Datang Sendiri / Non-Rujukan</option>
                    <option value="Rujukan Puskesmas">Rujukan Puskesmas</option>
                    <option value="Rujukan Klinik Pratama">Rujukan Klinik Pratama</option>
                    <option value="Rujukan Praktik Mandiri Bidan (PMB)">Rujukan PMB</option>
                    <option value="Rujukan RS Lain">Rujukan RS Lain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Faskes Perujuk
                  </label>
                  <input
                    type="text"
                    value={editFaskesPerujuk}
                    onChange={(e) => setEditFaskesPerujuk(e.target.value)}
                    placeholder="Contoh: Puskesmas Banyumas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Surat Rujukan
                  </label>
                  <input
                    type="text"
                    value={editNomorRujukan}
                    onChange={(e) => setEditNomorRujukan(e.target.value)}
                    placeholder="Contoh: 440/123/PKM/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Diagnosa Awal / Rujukan
                </label>
                <input
                  type="text"
                  value={editDiagnosaRujukan}
                  onChange={(e) => setEditDiagnosaRujukan(e.target.value)}
                  placeholder="Contoh: Inpartu kala I fase aktif, susp. PEB"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keluhan Utama
                </label>
                <textarea
                  rows={2}
                  value={editKeluhanUtama}
                  onChange={(e) => setEditKeluhanUtama(e.target.value)}
                  placeholder="Keluhan utama saat pasien datang..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Riwayat Obstetri (G - P - A)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Gravida (G)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editGravida}
                      onChange={(e) => setEditGravida(Number(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Para (P)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={editPara}
                      onChange={(e) => setEditPara(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Abortus (A)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={editAbortus}
                      onChange={(e) => setEditAbortus(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bidan / Perawat Penerima
                  </label>
                  <input
                    type="text"
                    value={editMidwifeName}
                    onChange={(e) => setEditMidwifeName(e.target.value)}
                    placeholder="Nama bidan jaga"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dokter DPJP
                  </label>
                  <input
                    type="text"
                    value={editDoctorName}
                    onChange={(e) => setEditDoctorName(e.target.value)}
                    placeholder="Nama dokter Sp.OG"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAdmission(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BATAL / HAPUS PENDAFTARAN ADMISI */}
      {deletingAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Batalkan Pendaftaran Pasien?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini tidak dapat diurungkan
                </p>
              </div>
            </div>

            <div className="my-4 text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-slate-400">No. Admisi:</span>{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {deletingAdmission.admission_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Nama Pasien:</span>{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {deletingAdmission.patient?.full_name}
                </span>{" "}
                (RM: {deletingAdmission.patient?.mrn})
              </div>
              <div>
                <span className="text-slate-400">Unit:</span>{" "}
                <span>{deletingAdmission.unit_name || deletingAdmission.unit_id}</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl mt-2 border border-amber-200 dark:border-amber-900/50">
                ⚠️ Catatan: Data pendaftaran ini beserta riwayat skrining klinis dan monitoring terkait admisi ini akan dihapus dari daftar pelayanan aktif.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmission(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAdmission}
                disabled={deleteSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-colors"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus Pendaftaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
