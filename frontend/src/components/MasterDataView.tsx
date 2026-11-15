"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSpreadsheet,
  HeartPulse,
  Hospital,
  Pencil,
  Plus,
  Stethoscope,
  TestTube,
  Trash2,
  UserCheck,
  Users,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { apiRequest, BootstrapResponse } from "@/lib/api-client";
import type {
  DoctorMaster,
  Domain4T,
  HospitalUnit,
  MidwifeNurseMaster,
  ReferralFacilityMaster,
} from "@/lib/types";

type MasterTab =
  | "DOCTORS"
  | "MIDWIVES_NURSES"
  | "UNITS_REFERRALS"
  | "COMPLAINTS_COMORBIDS"
  | "RISK_FACTORS_LABS";

export function MasterDataView({
  data,
  currentUserId,
  onRefresh,
}: {
  data: BootstrapResponse;
  currentUserId: string;
  onRefresh: () => Promise<void>;
}) {
  const { db } = data;
  const catalog = db.master_catalog;

  const [tab, setTab] = useState<MasterTab>("DOCTORS");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Form Master Dokter
  const [docName, setDocName] = useState<string>("");
  const [docSip, setDocSip] = useState<string>("");
  const [docSpec, setDocSpec] = useState<
    "SP_OG" | "SP_OG_KFM" | "DOKTER_JAGA_PONEK" | "SP_ANESTESI"
  >("SP_OG");
  const [docUnit, setDocUnit] = useState<string>("unit-vk");
  const [docPhone, setDocPhone] = useState<string>("0811-2200-889");

  // State Form Master Bidan/Perawat
  const [staffName, setStaffName] = useState<string>("");
  const [staffStr, setStaffStr] = useState<string>("");
  const [staffProf, setStaffProf] = useState<"BIDAN" | "PERAWAT_OBSTETRI">(
    "BIDAN"
  );
  const [staffCred, setStaffCred] = useState<string>(
    "Bidan Pelaksana Lanjutan (PK II)"
  );
  const [staffUnit, setStaffUnit] = useState<string>("unit-vk");
  const [staffShift, setStaffShift] = useState<"PAGI" | "SORE" | "MALAM">(
    "PAGI"
  );

  // State Form Master Unit & Fasilitas Rujukan
  const [unitCode, setUnitCode] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("");
  const [refName, setRefName] = useState<string>("");
  const [refType, setRefType] = useState<string>("PUSKESMAS_PONED");
  const [refCity, setRefCity] = useState<string>("Kabupaten Banyumas");
  const [refSubdistrict, setRefSubdistrict] = useState<string>("");
  const [refPhone, setRefPhone] = useState<string>("");

  // State Edit & Delete Master Unit
  const [editingUnit, setEditingUnit] = useState<HospitalUnit | null>(null);
  const [editUnitCode, setEditUnitCode] = useState<string>("");
  const [editUnitName, setEditUnitName] = useState<string>("");
  const [editUnitType, setEditUnitType] = useState<string>("VK_BERSALIN");
  const [deletingUnit, setDeletingUnit] = useState<HospitalUnit | null>(null);

  // State Edit & Delete Master Fasilitas Perujuk
  const [editingRef, setEditingRef] = useState<ReferralFacilityMaster | null>(null);
  const [editRefCode, setEditRefCode] = useState<string>("");
  const [editRefName, setEditRefName] = useState<string>("");
  const [editRefType, setEditRefType] = useState<string>("PUSKESMAS_PONED");
  const [editRefCity, setEditRefCity] = useState<string>("");
  const [editRefSubdistrict, setEditRefSubdistrict] = useState<string>("");
  const [editRefPhone, setEditRefPhone] = useState<string>("");
  const [deletingRef, setDeletingRef] = useState<ReferralFacilityMaster | null>(null);

  // State Edit & Delete Master Dokter
  const [editingDoc, setEditingDoc] = useState<DoctorMaster | null>(null);
  const [editDocName, setEditDocName] = useState<string>("");
  const [editDocSip, setEditDocSip] = useState<string>("");
  const [editDocSpec, setEditDocSpec] = useState<string>("SP_OG");
  const [editDocUnit, setEditDocUnit] = useState<string>("unit-vk");
  const [editDocPhone, setEditDocPhone] = useState<string>("");
  const [deletingDoc, setDeletingDoc] = useState<DoctorMaster | null>(null);

  // State Edit & Delete Master Staf
  const [editingStaff, setEditingStaff] = useState<MidwifeNurseMaster | null>(null);
  const [editStaffName, setEditStaffName] = useState<string>("");
  const [editStaffStr, setEditStaffStr] = useState<string>("");
  const [editStaffProf, setEditStaffProf] = useState<string>("BIDAN");
  const [editStaffCred, setEditStaffCred] = useState<string>("");
  const [editStaffUnit, setEditStaffUnit] = useState<string>("unit-vk");
  const [editStaffShift, setEditStaffShift] = useState<string>("PAGI");
  const [deletingStaff, setDeletingStaff] = useState<MidwifeNurseMaster | null>(null);

  // State Form Master Template Keluhan Utama & Komorbid
  const [ccCategory, setCcCategory] = useState<string>("INPARTU");
  const [ccLabel, setCcLabel] = useState<string>("");
  const [ccText, setCcText] = useState<string>("");
  const [cmLabel, setCmLabel] = useState<string>("");
  const [cmNote, setCmNote] = useState<string>("");

  // State Form Master Faktor Risiko PE & HPP 4T
  const [rfPathway, setRfPathway] = useState<"PE" | "HPP">("HPP");
  const [rfDomain, setRfDomain] = useState<Domain4T>("TONUS");
  const [rfTier, setRfTier] = useState<
    "MODERATE" | "HIGH" | "CRITICAL_IMMEDIATE"
  >("MODERATE");
  const [rfLabel, setRfLabel] = useState<string>("");
  const [rfDef, setRfDef] = useState<string>("");

  async function postMasterAction(body: any, successText: string) {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmitting(true);
    try {
      await apiRequest("/masters", {
        method: "POST",
        userId: currentUserId,
        body,
      });
      await onRefresh();
      setFeedbackMsg(successText);
    } catch (err: any) {
      setErrorMsg(`Gagal memproses master data: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Action Handlers for Unit
  async function handleUpdateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUnit) return;
    await postMasterAction(
      {
        action: "UPDATE_UNIT_MASTER",
        unit_id: editingUnit.unit_id,
        code: editUnitCode,
        name: editUnitName,
        type: editUnitType,
      },
      `Master unit [${editUnitCode}] ${editUnitName} berhasil diperbarui.`
    );
    setEditingUnit(null);
  }

  async function handleDeleteUnit() {
    if (!deletingUnit) return;
    await postMasterAction(
      {
        action: "DELETE_UNIT_MASTER",
        unit_id: deletingUnit.unit_id,
      },
      `Master unit ${deletingUnit.name} (${deletingUnit.code}) berhasil dihapus.`
    );
    setDeletingUnit(null);
  }

  // Action Handlers for Referral Facility
  async function handleUpdateReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRef) return;
    await postMasterAction(
      {
        action: "UPDATE_REFERRAL_MASTER",
        referral_id: editingRef.referral_id,
        code: editRefCode,
        facility_name: editRefName,
        facility_type: editRefType,
        district_city: editRefCity,
        subdistrict: editRefSubdistrict,
        contact_phone: editRefPhone,
      },
      `Master fasilitas perujuk ${editRefName} berhasil diperbarui.`
    );
    setEditingRef(null);
  }

  async function handleDeleteReferral() {
    if (!deletingRef) return;
    await postMasterAction(
      {
        action: "DELETE_REFERRAL_MASTER",
        referral_id: deletingRef.referral_id,
      },
      `Master fasilitas perujuk ${deletingRef.facility_name} berhasil dihapus.`
    );
    setDeletingRef(null);
  }

  // Action Handlers for Doctor
  async function handleUpdateDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDoc) return;
    await postMasterAction(
      {
        action: "UPDATE_DOCTOR_MASTER",
        doctor_id: editingDoc.doctor_id,
        full_name: editDocName,
        nip_sip: editDocSip,
        specialty: editDocSpec,
        unit_id: editDocUnit,
        phone: editDocPhone,
      },
      `Master dokter ${editDocName} berhasil diperbarui.`
    );
    setEditingDoc(null);
  }

  async function handleDeleteDoctor() {
    if (!deletingDoc) return;
    await postMasterAction(
      {
        action: "DELETE_DOCTOR_MASTER",
        doctor_id: deletingDoc.doctor_id,
      },
      `Master dokter ${deletingDoc.full_name} berhasil dihapus.`
    );
    setDeletingDoc(null);
  }

  // Action Handlers for Staff
  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    await postMasterAction(
      {
        action: "UPDATE_MIDWIFE_NURSE_MASTER",
        staff_id: editingStaff.staff_id,
        full_name: editStaffName,
        nip_str: editStaffStr,
        profession: editStaffProf,
        credential_level: editStaffCred,
        unit_id: editStaffUnit,
        shift: editStaffShift,
      },
      `Master staf ${editStaffName} berhasil diperbarui.`
    );
    setEditingStaff(null);
  }

  async function handleDeleteStaff() {
    if (!deletingStaff) return;
    await postMasterAction(
      {
        action: "DELETE_MIDWIFE_NURSE_MASTER",
        staff_id: deletingStaff.staff_id,
      },
      `Master staf ${deletingStaff.full_name} berhasil dihapus.`
    );
    setDeletingStaff(null);
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HEADER SECTION: KARTU HEADER DENGAN GARIS PINGGIR BERWARNA (CLEAN BORDER)
         ========================================================================= */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide border border-blue-200 dark:border-blue-800">
              Pusat Data Master Terintegrasi
            </span>
            <span className="text-xs text-slate-500">• Standar Input Seluruh Modul SIGAP</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Master Data & Faskes</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Pusat pengelolaan terpadu dokter DPJP, bidan/perawat, unit ruangan, faskes perujuk, template keluhan, komorbid, serta variabel faktor risiko 4T/PE & laboratorium yang terhubung otomatis ke seluruh form SIGAP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-blue-400/90 dark:border-blue-600 flex items-center gap-3 shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                {catalog.doctors.length +
                  catalog.midwives_nurses.length +
                  db.units.length +
                  catalog.referral_facilities.length +
                  db.risk_factors.length}{" "}
                Variabel
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                5 Kategori Master Terhubung
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGASI MASTER BERBINGKAI BIRU TEBAL */}
      <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-2.5 shadow-sm flex flex-wrap gap-2">
        {[
          {
            id: "DOCTORS",
            step: "1",
            label: `Master Dokter DPJP (${catalog.doctors.length})`,
            icon: Stethoscope,
          },
          {
            id: "MIDWIVES_NURSES",
            step: "2",
            label: `Master Bidan & Perawat (${catalog.midwives_nurses.length})`,
            icon: UserCheck,
          },
          {
            id: "UNITS_REFERRALS",
            step: "3",
            label: `Master Unit & Asal Rujukan (${db.units.length + catalog.referral_facilities.length})`,
            icon: Building2,
          },
          {
            id: "COMPLAINTS_COMORBIDS",
            step: "4",
            label: `Master Template Keluhan & Komorbid (${catalog.chief_complaints.length + catalog.comorbidity_templates.length})`,
            icon: ClipboardList,
          },
          {
            id: "RISK_FACTORS_LABS",
            step: "5",
            label: `Master Faktor Risiko 4T/PE & Lab (${db.risk_factors.length})`,
            icon: TestTube,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as MasterTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 active:scale-95 cursor-pointer select-none ${
                active
                  ? "bg-[#2457d6] text-white shadow-md shadow-blue-500/30 font-black ring-2 ring-blue-300/80 dark:ring-blue-500/60 scale-[1.02]"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50/70 hover:text-blue-700 dark:hover:text-blue-300 font-bold"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  active
                    ? "bg-white text-blue-700"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {item.step}
              </span>
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {feedbackMsg && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 dark:text-emerald-300 underline font-semibold ml-3"
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

      {/* TAB 1: MASTER DOKTER DPJP / SP.OG / JAGA */}
      {tab === "DOCTORS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postMasterAction(
                {
                  action: "ADD_DOCTOR_MASTER",
                  full_name: docName,
                  nip_sip: docSip,
                  specialty: docSpec,
                  unit_id: docUnit,
                  phone: docPhone,
                  is_on_call_dpjp: true,
                },
                `Dokter ${docName} berhasil ditambahkan ke Master Dokter dan langsung tersedia di pilihan DPJP Admisi & Penerima SBAR.`
              );
              setDocName("");
              setDocSip("");
            }}
            className="lg:col-span-4 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <Plus className="h-4 w-4 text-blue-600" />
              Tambah Master Dokter DPJP / Jaga
            </h3>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Nama Lengkap & Gelar Dokter *
              </label>
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Contoh: dr. Karina Putri, Sp.OG"
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Nomor SIP / NIP
              </label>
              <input
                type="text"
                value={docSip}
                onChange={(e) => setDocSip(e.target.value)}
                placeholder="SIP.446/SpOG-06/2026"
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Spesialisasi Klinis
              </label>
              <select
                value={docSpec}
                onChange={(e) => setDocSpec(e.target.value as any)}
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SP_OG">Spesialis Obstetri & Ginekologi (Sp.OG)</option>
                <option value="SP_OG_KFM">
                  Subspesialis Kedokteran Fetomaternal (Subsp.K.Fm)
                </option>
                <option value="DOKTER_JAGA_PONEK">Dokter Jaga IGD PONEK</option>
                <option value="SP_ANESTESI">
                  Spesialis Anestesiologi & Terapi Intensif (Sp.An)
                </option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Unit Penempatan Utama
              </label>
              <select
                value={docUnit}
                onChange={(e) => setDocUnit(e.target.value)}
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {db.units.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Kontak On-Call Eskalasi SBAR
              </label>
              <input
                type="text"
                value={docPhone}
                onChange={(e) => setDocPhone(e.target.value)}
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2.5 font-black text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan ke Master...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>+ Simpan ke Master Dokter</span>
                </>
              )}
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-blue-100 dark:border-blue-900/60 pb-3">
              Daftar Master Dokter Terdaftar (Digunakan pada Dropdown DPJP Admisi & Penerima SBAR)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-blue-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-slate-800/80 text-blue-950 dark:text-blue-200 font-black text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-3">Nama Dokter</th>
                    <th className="py-2.5 px-3">SIP / NIP</th>
                    <th className="py-2.5 px-3">Spesialisasi</th>
                    <th className="py-2.5 px-3">Kontak On-Call</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {catalog.doctors.map((doc) => (
                    <tr key={doc.doctor_id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {doc.full_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {doc.nip_sip}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                          {doc.specialty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {doc.phone}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                          Aktif DPJP
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDoc(doc);
                              setEditDocName(doc.full_name);
                              setEditDocSip(doc.nip_sip);
                              setEditDocSpec(doc.specialty);
                              setEditDocUnit(doc.unit_id);
                              setEditDocPhone(doc.phone);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Dokter"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDoc(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus Dokter"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER BIDAN & PERAWAT OBSTETRI */}
      {tab === "MIDWIVES_NURSES" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postMasterAction(
                {
                  action: "ADD_MIDWIFE_NURSE_MASTER",
                  full_name: staffName,
                  nip_str: staffStr,
                  profession: staffProf,
                  credential_level: staffCred,
                  unit_id: staffUnit,
                  shift: staffShift,
                },
                `Petugas ${staffName} berhasil ditambahkan ke Master Bidan/Perawat dan langsung tersedia di pilihan Petugas Pemeriksa.`
              );
              setStaffName("");
              setStaffStr("");
            }}
            className="lg:col-span-4 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Tambah Master Bidan / Perawat Obstetri</span>
            </h3>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Nama Lengkap & Gelar Bidan/Perawat *
              </label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Contoh: Bd. Rini Handayani, S.Tr.Keb"
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Nomor STR / SIPB
              </label>
              <input
                type="text"
                value={staffStr}
                onChange={(e) => setStaffStr(e.target.value)}
                placeholder="STR.BD-19950210-009"
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  Profesi
                </label>
                <select
                  value={staffProf}
                  onChange={(e) => setStaffProf(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-2.5 py-2 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BIDAN">Bidan</option>
                  <option value="PERAWAT_OBSTETRI">Perawat Obstetri</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  Shift Jaga
                </label>
                <select
                  value={staffShift}
                  onChange={(e) => setStaffShift(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-2.5 py-2 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PAGI">Shift Pagi</option>
                  <option value="SORE">Shift Sore</option>
                  <option value="MALAM">Shift Malam</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Jenjang Kredensial Klinis
              </label>
              <input
                type="text"
                value={staffCred}
                onChange={(e) => setStaffCred(e.target.value)}
                placeholder="Contoh: PK-II Maternal"
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                Unit Tugas
              </label>
              <select
                value={staffUnit}
                onChange={(e) => setStaffUnit(e.target.value)}
                className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-3 py-2 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {db.units.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2.5 font-black text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Simpan ke Master Bidan / Perawat</span>
                </>
              )}
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Daftar Master Bidan & Perawat Obstetri
              </h3>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-black text-blue-800 dark:text-blue-300">
                {catalog.midwives_nurses.length} Petugas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
              Digunakan pada Petugas Ukur TD, Pemeriksa Skrining, Monitoring & Pelaksana Checklist
            </p>
            <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-blue-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-slate-800/80 text-blue-950 dark:text-blue-200 font-black uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Nama Bidan / Perawat</th>
                    <th className="py-2.5 px-3">No. STR / SIPB</th>
                    <th className="py-2.5 px-3">Profesi & Kredensial</th>
                    <th className="py-2.5 px-3">Shift</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/60 dark:divide-slate-800">
                  {catalog.midwives_nurses.map((st) => (
                    <tr key={st.staff_id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {st.full_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {st.nip_str}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-800 dark:text-indigo-400">
                          {st.profession}
                        </span>{" "}
                        — {st.credential_level}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                          {st.shift}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaff(st);
                              setEditStaffName(st.full_name);
                              setEditStaffStr(st.nip_str);
                              setEditStaffProf(st.profession);
                              setEditStaffCred(st.credential_level);
                              setEditStaffUnit(st.unit_id);
                              setEditStaffShift(st.shift);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Staf"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStaff(st)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus Staf"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER UNIT RS & FASILITAS RUJUKAN */}
      {tab === "UNITS_REFERRALS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Master Unit RS */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Master Unit / Ruangan Rumah Sakit (`units`)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola ruangan atau bangsal rawat inap obstetri rumah sakit
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-xs font-black">
                {db.units.length} Unit
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                postMasterAction(
                  {
                    action: "ADD_UNIT_MASTER",
                    code: unitCode,
                    name: unitName,
                    type: "VK_BERSALIN",
                  },
                  `Unit pelayanan ${unitName} (${unitCode}) berhasil ditambahkan.`
                );
                setUnitCode("");
                setUnitName("");
              }}
              className="grid grid-cols-3 gap-2.5 text-xs bg-blue-50/20 dark:bg-slate-800/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/80"
            >
              <input
                type="text"
                required
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                placeholder="Kode (Misal: OK-PONEK)"
                className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono font-semibold text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                required
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Nama Ruangan / Unit"
                className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-3 py-1.5 font-black text-xs text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>+ Tambah Unit</span>
              </button>
            </form>

            <div className="space-y-2 text-xs">
              {db.units.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl border-blue-200 dark:border-blue-800">
                  Belum ada unit terdaftar.
                </div>
              ) : (
                db.units.map((u) => (
                  <div
                    key={u.unit_id}
                    className="flex items-center justify-between rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/40 p-3 hover:bg-blue-50/60 dark:hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono font-black text-blue-700 dark:text-blue-400 mr-2">
                        [{u.code}]
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {u.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-mono">
                        {u.type}
                      </span>
                      {/* Aksi: Edit & Hapus */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUnit(u);
                            setEditUnitCode(u.code);
                            setEditUnitName(u.name);
                            setEditUnitType(u.type);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Unit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUnit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus Unit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Master Fasilitas Perujuk */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Master Fasilitas Kesehatan Perujuk (Puskesmas PONED / Klinik / TPMB)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daftar fasilitas kesehatan rujukan jejaring maternal perinatal
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-mono text-xs font-black">
                {catalog.referral_facilities.length} Perujuk
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                postMasterAction(
                  {
                    action: "ADD_REFERRAL_MASTER",
                    facility_name: refName,
                    facility_type: refType,
                    district_city: refCity,
                    subdistrict: refSubdistrict,
                    contact_phone: refPhone,
                  },
                  `Fasilitas perujuk ${refName} (${refCity}, Kec. ${refSubdistrict || "-"}) berhasil ditambahkan.`
                );
                setRefName("");
                setRefSubdistrict("");
                setRefPhone("");
              }}
              className="space-y-3 bg-blue-50/20 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800/80 text-xs"
            >
              {/* Row 1: Nama Faskes & Jenis Faskes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nama Faskes / Klinik / Bidan *
                  </label>
                  <input
                    type="text"
                    required
                    value={refName}
                    onChange={(e) => setRefName(e.target.value)}
                    placeholder="Contoh: Puskesmas Somagede"
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Jenis Fasilitas Perujuk
                  </label>
                  <select
                    value={refType}
                    onChange={(e) => setRefType(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUSKESMAS_PONED">Puskesmas PONED</option>
                    <option value="KLINIK_PRATAMA">Klinik Pratama</option>
                    <option value="BPM_BIDAN_PRAKTIK">TPMB / Bidan Praktik</option>
                    <option value="RS_TIPE_C_D">RS Tipe C/D</option>
                    <option value="DATANG_SENDIRI">Datang Sendiri (Non-Rujukan)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Wilayah/Kab/Kota, Kecamatan, & No. HP / Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Wilayah / Kab. / Kota
                  </label>
                  <input
                    type="text"
                    value={refCity}
                    onChange={(e) => setRefCity(e.target.value)}
                    placeholder="Contoh: Kabupaten Banyumas"
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={refSubdistrict}
                    onChange={(e) => setRefSubdistrict(e.target.value)}
                    placeholder="Contoh: Somagede"
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nomor HP / Telepon
                  </label>
                  <input
                    type="text"
                    value={refPhone}
                    onChange={(e) => setRefPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2 font-black text-xs text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Tambah Perujuk</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 text-xs">
              {catalog.referral_facilities.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl border-blue-200 dark:border-blue-800">
                  Belum ada fasilitas perujuk terdaftar.
                </div>
              ) : (
                catalog.referral_facilities.map((rf) => (
                  <div
                    key={rf.referral_id}
                    className="flex items-center justify-between rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/40 p-3 hover:bg-blue-50/60 dark:hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {rf.facility_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>{rf.district_city || "Kabupaten Banyumas"}</span>
                        {rf.subdistrict && rf.subdistrict !== "-" && (
                          <span>• Kec. {rf.subdistrict}</span>
                        )}
                        <span>• Telp: {rf.contact_phone || "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="rounded bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                        {rf.facility_type}
                      </span>
                      {/* Aksi: Edit & Hapus */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRef(rf);
                            setEditRefCode(rf.code || "");
                            setEditRefName(rf.facility_name);
                            setEditRefType(rf.facility_type);
                            setEditRefCity(rf.district_city || "");
                            setEditRefSubdistrict(rf.subdistrict || "");
                            setEditRefPhone(rf.contact_phone || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Fasilitas Perujuk"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRef(rf)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus Fasilitas Perujuk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER TEMPLATE KELUHAN UTAMA & KOMORBID OBSTETRI */}
      {tab === "COMPLAINTS_COMORBIDS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Master Keluhan Utama */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Master Template Keluhan Utama Admisi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih cepat 1-klik saat petugas mengisi form Pendaftaran & Admisi
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-xs font-black">
                {catalog.chief_complaints.length} Template
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                postMasterAction(
                  {
                    action: "ADD_COMPLAINT_TEMPLATE",
                    category: ccCategory,
                    label: ccLabel,
                    default_text: ccText,
                  },
                  `Template keluhan utama '${ccLabel}' berhasil disimpan.`
                );
                setCcLabel("");
                setCcText("");
              }}
              className="space-y-3 text-xs bg-blue-50/20 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800/80"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Judul Singkat *
                  </label>
                  <input
                    type="text"
                    required
                    value={ccLabel}
                    onChange={(e) => setCcLabel(e.target.value)}
                    placeholder="Contoh: Kenceng-kenceng Teratur"
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Kategori Klinis
                  </label>
                  <select
                    value={ccCategory}
                    onChange={(e) => setCcCategory(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INPARTU">Inpartu / Persalinan</option>
                    <option value="HIPERTENSI_PE">Hipertensi / Preeklamsia</option>
                    <option value="PERDARAHAN_HPP">Perdarahan / HPP</option>
                    <option value="ANTENATAL_NIFAS">Antenatal / Nifas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Isi Narasi Lengkap Keluhan Utama *
                </label>
                <textarea
                  rows={2}
                  required
                  value={ccText}
                  onChange={(e) => setCcText(e.target.value)}
                  placeholder="Isi kalimat lengkap keluhan utama..."
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2 font-black text-xs text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Simpan Template Keluhan</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5 text-xs">
              {catalog.chief_complaints.map((cc) => (
                <div
                  key={cc.complaint_id}
                  className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/40 p-3 space-y-1 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{cc.label}</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                      {cc.category}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{cc.default_text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Master Template Catatan Komorbid */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Master Template Riwayat Obstetri & Komorbid
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Template catatan klinis komorbiditas dan riwayat medis obstetri
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-mono text-xs font-black">
                {catalog.comorbidity_templates.length} Template
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                postMasterAction(
                  {
                    action: "ADD_COMORBID_TEMPLATE",
                    label: cmLabel,
                    default_note: cmNote,
                  },
                  `Template komorbid '${cmLabel}' berhasil disimpan.`
                );
                setCmLabel("");
                setCmNote("");
              }}
              className="space-y-3 text-xs bg-blue-50/20 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800/80"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Judul Riwayat / Komorbid *
                </label>
                <input
                  type="text"
                  required
                  value={cmLabel}
                  onChange={(e) => setCmLabel(e.target.value)}
                  placeholder="Contoh: Riwayat Seksio Sesarea 1x (2022)"
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Isi Catatan Klinis *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cmNote}
                  onChange={(e) => setCmNote(e.target.value)}
                  placeholder="Isi catatan klinis riwayat obstetri / komorbid..."
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-4 py-2 font-black text-xs text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Simpan Template Komorbid</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5 text-xs">
              {catalog.comorbidity_templates.map((cm) => (
                <div
                  key={cm.comorbid_id}
                  className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/40 p-3 space-y-1 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100">{cm.label}</div>
                  <p className="text-slate-600 dark:text-slate-400">{cm.default_note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MASTER FAKTOR RISIKO (PE & HPP 4T) DAN PARAMETER LABORATORIUM */}
      {tab === "RISK_FACTORS_LABS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postMasterAction(
                  {
                    action: "ADD_RISK_FACTOR_MASTER",
                    screening_pathway: rfPathway,
                    domain_4t: rfDomain,
                    risk_tier: rfTier,
                    label: rfLabel,
                    definition: rfDef,
                  },
                  `Variabel Faktor Risiko '${rfLabel}' berhasil ditambahkan ke Master dan otomatis tampil di form Skrining ${rfPathway}.`
                );
                setRfLabel("");
                setRfDef("");
              }}
              className="lg:col-span-4 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3.5 text-xs"
            >
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-3">
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Tambah Master Faktor Risiko (PE / HPP 4T)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Jalur Skrining
                  </label>
                  <select
                    value={rfPathway}
                    onChange={(e) => {
                      const p = e.target.value as "PE" | "HPP";
                      setRfPathway(p);
                      setRfDomain(p === "PE" ? "PE_HIGH_RISK" : "TONUS");
                    }}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HPP">Jalur HPP (4T)</option>
                    <option value="PE">Jalur Preeklamsia (PE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Domain
                  </label>
                  <select
                    value={rfDomain}
                    onChange={(e) => setRfDomain(e.target.value as Domain4T)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {rfPathway === "HPP" ? (
                      <>
                        <option value="TONUS">TONUS</option>
                        <option value="TRAUMA">TRAUMA</option>
                        <option value="JARINGAN">JARINGAN (TISSUE)</option>
                        <option value="TROMBIN">TROMBIN</option>
                        <option value="TAMBAHAN">FAKTOR TAMBAHAN</option>
                      </>
                    ) : (
                      <>
                        <option value="PE_HIGH_RISK">PE RISIKO TINGGI</option>
                        <option value="PE_MODERATE_RISK">
                          PE RISIKO SEDANG
                        </option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Tingkat Bobot Risiko
                </label>
                <select
                  value={rfTier}
                  onChange={(e) => setRfTier(e.target.value as any)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MODERATE">Risiko Sedang (Moderate)</option>
                  <option value="HIGH">Risiko Tinggi (High)</option>
                  <option value="CRITICAL_IMMEDIATE">
                    Pemicu Prioritas Kritis (Immediate Alert)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nama Variabel Faktor Risiko *
                </label>
                <input
                  type="text"
                  required
                  value={rfLabel}
                  onChange={(e) => setRfLabel(e.target.value)}
                  placeholder="Contoh: Riwayat Inversio Uteri"
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Definisi Operasional Klinis *
                </label>
                <textarea
                  rows={2}
                  required
                  value={rfDef}
                  onChange={(e) => setRfDef(e.target.value)}
                  placeholder="Penjelasan kriteria penilaian faktor risiko..."
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2.5 font-black text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>+ Simpan ke Master Faktor Risiko</span>
                  </>
                )}
              </button>
            </form>

            <div className="lg:col-span-8 rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Katalog Master Faktor Risiko Terdaftar (`risk_factors`)
                </h3>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-black text-blue-800 dark:text-blue-300">
                  {db.risk_factors.length} Variabel
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 text-xs">
                {db.risk_factors.map((rf) => (
                  <div
                    key={rf.risk_factor_id}
                    className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-slate-800/40 p-3 flex items-start justify-between gap-3 hover:bg-blue-50/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            rf.screening_pathway === "PE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                          }`}
                        >
                          {rf.screening_pathway} • {rf.domain_4t}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {rf.label}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">{rf.definition}</p>
                    </div>
                    <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {rf.risk_tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Katalog Master Parameter Laboratorium & Gejala PE */}
          <div className="rounded-2xl border-2 border-blue-400/90 dark:border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/60 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Master Parameter Laboratorium & Nilai Rujukan Normal (`lab_parameter_masters`)
              </h3>
              <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-mono text-xs font-black">
                {catalog.lab_parameter_masters.length} Parameter
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {catalog.lab_parameter_masters.map((lp) => (
                <div
                  key={lp.test_code}
                  className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 p-3.5 bg-blue-50/20 dark:bg-slate-800/40 space-y-1 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {lp.test_name}
                    </span>
                    <span className="rounded bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                      {lp.pathway}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    Satuan: <strong>{lp.unit}</strong> • Normal:{" "}
                    <strong>{lp.reference_range}</strong>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                    Ambang Kritis: {lp.critical_threshold_info}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT MASTER UNIT                                      */}
      {/* ============================================================== */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Master Unit / Ruangan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Perbarui kode dan nama unit rumah sakit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Unit / Ruangan *
                </label>
                <input
                  type="text"
                  required
                  value={editUnitCode}
                  onChange={(e) => setEditUnitCode(e.target.value)}
                  placeholder="Misal: OK-PONEK"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Ruangan / Bangsal *
                </label>
                <input
                  type="text"
                  required
                  value={editUnitName}
                  onChange={(e) => setEditUnitName(e.target.value)}
                  placeholder="Misal: Kamar Bersalin (VK)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe / Klasifikasi Pelayanan
                </label>
                <select
                  value={editUnitType}
                  onChange={(e) => setEditUnitType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                >
                  <option value="VK_BERSALIN">Kamar Bersalin (VK)</option>
                  <option value="IGD_OBSTETRI">IGD Obstetri / PONEK</option>
                  <option value="RAWAT_INAP_NIFAS">Ruang Rawat Inap Nifas</option>
                  <option value="HCU_ICU">HCU / ICU Maternal</option>
                  <option value="MANAJEMEN">Manajemen / Poliklinik</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-blue-700 hover:to-blue-800 text-white font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: HAPUS MASTER UNIT                                     */}
      {/* ============================================================== */}
      {deletingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Master Unit
                </h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi penghapusan data unit
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus unit{" "}
              <strong className="text-slate-900 dark:text-white">
                [{deletingUnit.code}] {deletingUnit.name}
              </strong>{" "}
              dari database Master Unit?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingUnit(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUnit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: EDIT MASTER FASILITAS PERUJUK                         */}
      {/* ============================================================== */}
      {editingRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Hospital className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Fasilitas Kesehatan Perujuk
                  </h3>
                  <p className="text-xs text-slate-400">
                    Perbarui data jejaring rujukan maternal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRef(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateReferral} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Fasilitas Kesehatan *
                </label>
                <input
                  type="text"
                  required
                  value={editRefName}
                  onChange={(e) => setEditRefName(e.target.value)}
                  placeholder="Misal: Puskesmas Somagede"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Fasilitas Perujuk
                </label>
                <select
                  value={editRefType}
                  onChange={(e) => setEditRefType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                >
                  <option value="PUSKESMAS_PONED">Puskesmas PONED</option>
                  <option value="KLINIK_PRATAMA">Klinik Pratama</option>
                  <option value="BPM_BIDAN_PRAKTIK">TPMB / Bidan Praktik Mandiri</option>
                  <option value="RS_TIPE_C_D">RS Tipe C/D</option>
                  <option value="DATANG_SENDIRI">Datang Sendiri (Non-Rujukan)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wilayah / Kabupaten / Kota
                  </label>
                  <input
                    type="text"
                    value={editRefCity}
                    onChange={(e) => setEditRefCity(e.target.value)}
                    placeholder="Misal: Kabupaten Banyumas"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={editRefSubdistrict}
                    onChange={(e) => setEditRefSubdistrict(e.target.value)}
                    placeholder="Misal: Somagede"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP / Telepon Perujuk
                </label>
                <input
                  type="text"
                  value={editRefPhone}
                  onChange={(e) => setEditRefPhone(e.target.value)}
                  placeholder="Misal: 0812-3456-7890 / 0281-796xxx"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRef(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold transition-all shadow-md shadow-indigo-500/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: HAPUS MASTER FASILITAS PERUJUK                        */}
      {/* ============================================================== */}
      {deletingRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Fasilitas Perujuk
                </h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi penghapusan data perujuk
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus fasilitas perujuk{" "}
              <strong className="text-slate-900 dark:text-white">
                {deletingRef.facility_name}
              </strong>{" "}
              dari database Master Rujukan?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingRef(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteReferral}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Perujuk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: EDIT MASTER DOKTER                                    */}
      {/* ============================================================== */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Master Dokter DPJP
                  </h3>
                  <p className="text-xs text-slate-400">
                    Perbarui profil dokter spesialis / jaga
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SIP / NIP Dokter
                </label>
                <input
                  type="text"
                  value={editDocSip}
                  onChange={(e) => setEditDocSip(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Spesialisasi Klinis
                </label>
                <select
                  value={editDocSpec}
                  onChange={(e) => setEditDocSpec(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                >
                  <option value="SP_OG">Spesialis Obstetri & Ginekologi (Sp.OG)</option>
                  <option value="SP_OG_KFM">Subspesialis Fetomaternal (Subsp.K.Fm)</option>
                  <option value="DOKTER_JAGA_PONEK">Dokter Jaga IGD PONEK</option>
                  <option value="SP_ANESTESI">Spesialis Anestesiologi (Sp.An)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kontak On-Call / HP
                </label>
                <input
                  type="text"
                  value={editDocPhone}
                  onChange={(e) => setEditDocPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-blue-700 hover:to-blue-800 text-white font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: HAPUS MASTER DOKTER                                   */}
      {/* ============================================================== */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Master Dokter
                </h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi penghapusan data dokter
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data dokter{" "}
              <strong className="text-slate-900 dark:text-white">
                {deletingDoc.full_name}
              </strong>{" "}
              dari database Master Dokter?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteDoctor}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Dokter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: EDIT MASTER BIDAN / PERAWAT                          */}
      {/* ============================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Master Bidan / Perawat
                  </h3>
                  <p className="text-xs text-slate-400">
                    Perbarui profil staf tenaga kesehatan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor STR / SIPB
                </label>
                <input
                  type="text"
                  value={editStaffStr}
                  onChange={(e) => setEditStaffStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Profesi
                </label>
                <select
                  value={editStaffProf}
                  onChange={(e) => setEditStaffProf(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                >
                  <option value="BIDAN">Bidan</option>
                  <option value="PERAWAT_OBSTETRI">Perawat Obstetri</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Kredensial Klinis
                </label>
                <input
                  type="text"
                  value={editStaffCred}
                  onChange={(e) => setEditStaffCred(e.target.value)}
                  placeholder="Misal: Bidan Pelaksana Lanjutan (PK II)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shift Jaga
                </label>
                <select
                  value={editStaffShift}
                  onChange={(e) => setEditStaffShift(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-[#2563eb] outline-none"
                >
                  <option value="PAGI">Pagi</option>
                  <option value="SORE">Sore</option>
                  <option value="MALAM">Malam</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold transition-all shadow-md shadow-indigo-500/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 8: HAPUS MASTER BIDAN / PERAWAT                         */}
      {/* ============================================================== */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131f37] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Master Tenaga Kesehatan
                </h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi penghapusan data staf
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data staf{" "}
              <strong className="text-slate-900 dark:text-white">
                {deletingStaff.full_name}
              </strong>{" "}
              dari database Master Tenaga Kesehatan?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteStaff}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Staf"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

