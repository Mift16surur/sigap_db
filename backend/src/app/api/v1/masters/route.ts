import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getDb,
  resolveRequestUser,
  saveDb,
} from "@/lib/store";
import {
  ActionChecklistMaster,
  ChiefComplaintTemplate,
  ClinicalScreeningCriterionMaster,
  ComorbidityTemplate,
  DEFAULT_ACTION_CHECKLIST_MASTERS,
  DEFAULT_CLINICAL_SCREENING_CRITERIA,
  DoctorMaster,
  HospitalUnit,
  MidwifeNurseMaster,
  ReferralFacilityMaster,
  RiskFactorMaster,
} from "@/lib/types";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    ok: true,
    master_catalog: db.master_catalog,
    units: db.units,
    risk_factors: db.risk_factors,
  });
}

export async function POST(req: Request) {
  const db = getDb();
  const { userId } = resolveRequestUser(req, db);
  const body = await req.json();
  const { action } = body;

  // 1. Tambah Master Dokter DPJP / Jaga
  if (action === "ADD_DOCTOR_MASTER") {
    const newDoc: DoctorMaster = {
      doctor_id: `doc-${Date.now()}`,
      nip_sip: body.nip_sip || `SIP.446/SpOG-${db.master_catalog.doctors.length + 1}/2026`,
      full_name: body.full_name,
      specialty: body.specialty || "SP_OG",
      unit_id: body.unit_id || "unit-vk",
      phone: body.phone || "0811-2200-xxx",
      is_on_call_dpjp: Boolean(body.is_on_call_dpjp ?? true),
      active_status: true,
    };
    db.master_catalog.doctors.unshift(newDoc);

    appendAuditLog(db, {
      userId,
      entity: "master_doctors",
      entityId: newDoc.doctor_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Dokter baru: ${newDoc.full_name} (${newDoc.specialty}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, doctor: newDoc });
  }

  // 1b. Update Master Dokter
  if (action === "UPDATE_DOCTOR_MASTER") {
    const docIndex = db.master_catalog.doctors.findIndex((d) => d.doctor_id === body.doctor_id);
    if (docIndex === -1) {
      return NextResponse.json({ ok: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }
    const old = db.master_catalog.doctors[docIndex];
    const updatedDoc: DoctorMaster = {
      ...old,
      full_name: body.full_name || old.full_name,
      nip_sip: body.nip_sip || old.nip_sip,
      specialty: body.specialty || old.specialty,
      unit_id: body.unit_id || old.unit_id,
      phone: body.phone || old.phone,
      is_on_call_dpjp: body.is_on_call_dpjp !== undefined ? Boolean(body.is_on_call_dpjp) : old.is_on_call_dpjp,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.doctors[docIndex] = updatedDoc;

    appendAuditLog(db, {
      userId,
      entity: "master_doctors",
      entityId: updatedDoc.doctor_id,
      action: "UPDATE",
      changeSummary: `Memperbarui Master Dokter: ${updatedDoc.full_name}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, doctor: updatedDoc });
  }

  // 1c. Delete Master Dokter
  if (action === "DELETE_DOCTOR_MASTER") {
    const docIndex = db.master_catalog.doctors.findIndex((d) => d.doctor_id === body.doctor_id);
    if (docIndex === -1) {
      return NextResponse.json({ ok: false, error: "Dokter tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.doctors.splice(docIndex, 1)[0];
    appendAuditLog(db, {
      userId,
      entity: "master_doctors",
      entityId: deleted.doctor_id,
      action: "DELETE",
      changeSummary: `Menghapus Master Dokter: ${deleted.full_name}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.doctor_id });
  }

  // 2. Tambah Master Bidan / Perawat Obstetri
  if (action === "ADD_MIDWIFE_NURSE_MASTER") {
    const newStaff: MidwifeNurseMaster = {
      staff_id: `stf-${Date.now()}`,
      nip_str: body.nip_str || `STR.BD-${Date.now().toString().slice(-6)}`,
      full_name: body.full_name,
      profession: body.profession || "BIDAN",
      credential_level: body.credential_level || "Bidan Pelaksana (PK II)",
      unit_id: body.unit_id || "unit-vk",
      shift: body.shift || "PAGI",
      active_status: true,
    };
    db.master_catalog.midwives_nurses.unshift(newStaff);

    appendAuditLog(db, {
      userId,
      entity: "master_midwives_nurses",
      entityId: newStaff.staff_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Bidan/Perawat baru: ${newStaff.full_name} (${newStaff.profession}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, staff: newStaff });
  }

  // 2b. Update Master Bidan / Perawat
  if (action === "UPDATE_MIDWIFE_NURSE_MASTER") {
    const staffIndex = db.master_catalog.midwives_nurses.findIndex(
      (s) => s.staff_id === body.staff_id
    );
    if (staffIndex === -1) {
      return NextResponse.json({ ok: false, error: "Staf tidak ditemukan" }, { status: 404 });
    }
    const old = db.master_catalog.midwives_nurses[staffIndex];
    const updatedStaff: MidwifeNurseMaster = {
      ...old,
      full_name: body.full_name || old.full_name,
      nip_str: body.nip_str || old.nip_str,
      profession: body.profession || old.profession,
      credential_level: body.credential_level || old.credential_level,
      unit_id: body.unit_id || old.unit_id,
      shift: body.shift || old.shift,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.midwives_nurses[staffIndex] = updatedStaff;

    appendAuditLog(db, {
      userId,
      entity: "master_midwives_nurses",
      entityId: updatedStaff.staff_id,
      action: "UPDATE",
      changeSummary: `Memperbarui Master Staf: ${updatedStaff.full_name}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, staff: updatedStaff });
  }

  // 2c. Delete Master Bidan / Perawat
  if (action === "DELETE_MIDWIFE_NURSE_MASTER") {
    const staffIndex = db.master_catalog.midwives_nurses.findIndex(
      (s) => s.staff_id === body.staff_id
    );
    if (staffIndex === -1) {
      return NextResponse.json({ ok: false, error: "Staf tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.midwives_nurses.splice(staffIndex, 1)[0];
    appendAuditLog(db, {
      userId,
      entity: "master_midwives_nurses",
      entityId: deleted.staff_id,
      action: "DELETE",
      changeSummary: `Menghapus Master Staf: ${deleted.full_name}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.staff_id });
  }

  // 3. Tambah Master Unit / Ruangan RS
  if (action === "ADD_UNIT_MASTER") {
    const newUnit: HospitalUnit = {
      unit_id: `unit-${Date.now()}`,
      code: (body.code || "UNIT-BARU").toUpperCase(),
      name: body.name,
      type: body.type || "VK_BERSALIN",
      active_status: true,
    };
    db.units.push(newUnit);

    appendAuditLog(db, {
      userId,
      entity: "units",
      entityId: newUnit.unit_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Unit Pelayanan baru: ${newUnit.name} (${newUnit.code}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, unit: newUnit });
  }

  // 3b. Update Master Unit / Ruangan RS
  if (action === "UPDATE_UNIT_MASTER") {
    const unitIndex = db.units.findIndex((u) => u.unit_id === body.unit_id);
    if (unitIndex === -1) {
      return NextResponse.json({ ok: false, error: "Unit tidak ditemukan" }, { status: 404 });
    }
    const old = db.units[unitIndex];
    const updatedUnit: HospitalUnit = {
      ...old,
      code: (body.code || old.code).toUpperCase(),
      name: body.name || old.name,
      type: body.type || old.type,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.units[unitIndex] = updatedUnit;

    appendAuditLog(db, {
      userId,
      entity: "units",
      entityId: updatedUnit.unit_id,
      action: "UPDATE",
      changeSummary: `Memperbarui Master Unit: ${updatedUnit.name} (${updatedUnit.code}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, unit: updatedUnit });
  }

  // 3c. Delete Master Unit / Ruangan RS
  if (action === "DELETE_UNIT_MASTER") {
    const unitIndex = db.units.findIndex((u) => u.unit_id === body.unit_id);
    if (unitIndex === -1) {
      return NextResponse.json({ ok: false, error: "Unit tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.units.splice(unitIndex, 1)[0];

    appendAuditLog(db, {
      userId,
      entity: "units",
      entityId: deleted.unit_id,
      action: "DELETE",
      changeSummary: `Menghapus Master Unit: ${deleted.name} (${deleted.code}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.unit_id });
  }

  // 4. Tambah Master Fasilitas Rujukan
  if (action === "ADD_REFERRAL_MASTER") {
    const newRef: ReferralFacilityMaster = {
      referral_id: `ref-${Date.now()}`,
      code: (body.code || `REF-${db.master_catalog.referral_facilities.length + 1}`).toUpperCase(),
      facility_name: body.facility_name,
      facility_type: body.facility_type || "PUSKESMAS_PONED",
      district_city: body.district_city || "Kabupaten Banyumas",
      subdistrict: body.subdistrict || "-",
      contact_phone: body.contact_phone || "-",
      active_status: true,
    };
    db.master_catalog.referral_facilities.unshift(newRef);

    appendAuditLog(db, {
      userId,
      entity: "master_referrals",
      entityId: newRef.referral_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Fasilitas Perujuk baru: ${newRef.facility_name} (${newRef.district_city}, Kec. ${newRef.subdistrict}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, referral: newRef });
  }

  // 4b. Update Master Fasilitas Rujukan
  if (action === "UPDATE_REFERRAL_MASTER") {
    const refIndex = db.master_catalog.referral_facilities.findIndex(
      (rf) => rf.referral_id === body.referral_id
    );
    if (refIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Fasilitas perujuk tidak ditemukan" },
        { status: 404 }
      );
    }
    const old = db.master_catalog.referral_facilities[refIndex];
    const updatedRef: ReferralFacilityMaster = {
      ...old,
      code: (body.code || old.code).toUpperCase(),
      facility_name: body.facility_name || old.facility_name,
      facility_type: body.facility_type || old.facility_type,
      district_city: body.district_city !== undefined ? body.district_city : old.district_city,
      subdistrict: body.subdistrict !== undefined ? body.subdistrict : (old.subdistrict || "-"),
      contact_phone: body.contact_phone !== undefined ? body.contact_phone : old.contact_phone,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.referral_facilities[refIndex] = updatedRef;

    appendAuditLog(db, {
      userId,
      entity: "master_referrals",
      entityId: updatedRef.referral_id,
      action: "UPDATE",
      changeSummary: `Memperbarui Master Fasilitas Perujuk: ${updatedRef.facility_name} (${updatedRef.district_city}, Kec. ${updatedRef.subdistrict}).`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, referral: updatedRef });
  }

  // 4c. Delete Master Fasilitas Rujukan
  if (action === "DELETE_REFERRAL_MASTER") {
    const refIndex = db.master_catalog.referral_facilities.findIndex(
      (rf) => rf.referral_id === body.referral_id
    );
    if (refIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Fasilitas perujuk tidak ditemukan" },
        { status: 404 }
      );
    }
    const deleted = db.master_catalog.referral_facilities.splice(refIndex, 1)[0];

    appendAuditLog(db, {
      userId,
      entity: "master_referrals",
      entityId: deleted.referral_id,
      action: "DELETE",
      changeSummary: `Menghapus Master Fasilitas Perujuk: ${deleted.facility_name}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.referral_id });
  }

  // 5. Tambah Master Template Keluhan Utama / Alasan Admisi
  if (action === "ADD_COMPLAINT_TEMPLATE") {
    const newCc: ChiefComplaintTemplate = {
      complaint_id: `cc-${Date.now()}`,
      code: `CC-${Date.now().toString().slice(-4)}`,
      category: body.category || "INPARTU",
      label: body.label,
      default_text: body.default_text,
      active_status: true,
    };
    db.master_catalog.chief_complaints.unshift(newCc);

    appendAuditLog(db, {
      userId,
      entity: "master_complaints",
      entityId: newCc.complaint_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Template Keluhan Utama: ${newCc.label}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, complaint: newCc });
  }

  // 5b. Update Master Template Keluhan Utama
  if (action === "UPDATE_COMPLAINT_TEMPLATE") {
    const ccIndex = db.master_catalog.chief_complaints.findIndex(
      (c) => c.complaint_id === body.complaint_id
    );
    if (ccIndex === -1) {
      return NextResponse.json({ ok: false, error: "Template tidak ditemukan" }, { status: 404 });
    }
    const old = db.master_catalog.chief_complaints[ccIndex];
    const updatedCc: ChiefComplaintTemplate = {
      ...old,
      category: body.category || old.category,
      label: body.label || old.label,
      default_text: body.default_text || old.default_text,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.chief_complaints[ccIndex] = updatedCc;
    saveDb(db);
    return NextResponse.json({ ok: true, complaint: updatedCc });
  }

  // 5c. Delete Master Template Keluhan Utama
  if (action === "DELETE_COMPLAINT_TEMPLATE") {
    const ccIndex = db.master_catalog.chief_complaints.findIndex(
      (c) => c.complaint_id === body.complaint_id
    );
    if (ccIndex === -1) {
      return NextResponse.json({ ok: false, error: "Template tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.chief_complaints.splice(ccIndex, 1)[0];
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.complaint_id });
  }

  // 6. Tambah Master Template Komorbid / Riwayat Obstetri
  if (action === "ADD_COMORBID_TEMPLATE") {
    const newCm: ComorbidityTemplate = {
      comorbid_id: `cm-${Date.now()}`,
      code: `CM-${Date.now().toString().slice(-4)}`,
      label: body.label,
      default_note: body.default_note,
      active_status: true,
    };
    db.master_catalog.comorbidity_templates.unshift(newCm);
    saveDb(db);
    return NextResponse.json({ ok: true, comorbid: newCm });
  }

  // 6b. Delete Master Template Komorbid
  if (action === "DELETE_COMORBID_TEMPLATE") {
    const cmIndex = db.master_catalog.comorbidity_templates.findIndex(
      (c) => c.comorbid_id === body.comorbid_id
    );
    if (cmIndex === -1) {
      return NextResponse.json({ ok: false, error: "Komorbid tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.comorbidity_templates.splice(cmIndex, 1)[0];
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.comorbid_id });
  }

  // 7. Tambah Master Faktor Risiko Klinis (PE / HPP 4T)
  if (action === "ADD_RISK_FACTOR_MASTER") {
    const newRf: RiskFactorMaster = {
      risk_factor_id: `rf-${Date.now()}`,
      code: (body.code || `RF_${Date.now().toString().slice(-4)}`).toUpperCase(),
      screening_pathway: body.screening_pathway || "HPP",
      domain_4t: body.domain_4t || "TONUS",
      risk_tier: body.risk_tier || "MODERATE",
      default_weight: Number(body.default_weight || 1),
      label: body.label,
      definition: body.definition || "-",
      clinical_rationale: body.clinical_rationale || "Ditambahkan melalui Master Faktor Risiko",
      active_status: true,
    };
    db.risk_factors.push(newRf);

    appendAuditLog(db, {
      userId,
      entity: "risk_factors",
      entityId: newRf.risk_factor_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Faktor Risiko [${newRf.screening_pathway} - ${newRf.domain_4t}]: ${newRf.label}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, risk_factor: newRf });
  }

  // 7b. Update Master Faktor Risiko
  if (action === "UPDATE_RISK_FACTOR_MASTER") {
    const rfIndex = db.risk_factors.findIndex((r) => r.risk_factor_id === body.risk_factor_id);
    if (rfIndex === -1) {
      return NextResponse.json({ ok: false, error: "Faktor risiko tidak ditemukan" }, { status: 404 });
    }
    const old = db.risk_factors[rfIndex];
    const updatedRf: RiskFactorMaster = {
      ...old,
      label: body.label || old.label,
      definition: body.definition || old.definition,
      clinical_rationale: body.clinical_rationale || old.clinical_rationale,
      risk_tier: body.risk_tier || old.risk_tier,
      default_weight: body.default_weight !== undefined ? Number(body.default_weight) : old.default_weight,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.risk_factors[rfIndex] = updatedRf;
    saveDb(db);
    return NextResponse.json({ ok: true, risk_factor: updatedRf });
  }

  // 7c. Delete Master Faktor Risiko
  if (action === "DELETE_RISK_FACTOR_MASTER") {
    const rfIndex = db.risk_factors.findIndex((r) => r.risk_factor_id === body.risk_factor_id);
    if (rfIndex === -1) {
      return NextResponse.json({ ok: false, error: "Faktor risiko tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.risk_factors.splice(rfIndex, 1)[0];
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.risk_factor_id });
  }

  // 8. Tambah Master Kriteria Skrining Klinis (4 Domain: Maternal, Obstetri, Janin, Kombinasi)
  if (action === "ADD_SCREENING_CRITERION_MASTER") {
    if (!db.master_catalog.clinical_screening_criteria) {
      db.master_catalog.clinical_screening_criteria = [];
    }
    const newCrit: ClinicalScreeningCriterionMaster = {
      criterion_id: body.criterion_id || `crit_${Date.now()}`,
      domain_id: body.domain_id || "DOMAIN_MATERNAL",
      label: body.label,
      risk_tier: body.risk_tier || "MODERATE",
      pathway: body.pathway || "ALL",
      category_note: body.category_note || "-",
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : true,
      sort_order: Number(body.sort_order || db.master_catalog.clinical_screening_criteria.length + 1),
    };
    db.master_catalog.clinical_screening_criteria.push(newCrit);

    appendAuditLog(db, {
      userId,
      entity: "clinical_screening_criteria",
      entityId: newCrit.criterion_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Kriteria Skrining [${newCrit.domain_id} - ${newCrit.risk_tier}]: ${newCrit.label}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, criterion: newCrit });
  }

  // 8b. Update Master Kriteria Skrining Klinis
  if (action === "UPDATE_SCREENING_CRITERION_MASTER") {
    if (!db.master_catalog.clinical_screening_criteria) {
      db.master_catalog.clinical_screening_criteria = [];
    }
    const cIndex = db.master_catalog.clinical_screening_criteria.findIndex(
      (c) => c.criterion_id === body.criterion_id
    );
    if (cIndex === -1) {
      return NextResponse.json({ ok: false, error: "Kriteria skrining tidak ditemukan" }, { status: 404 });
    }
    const old = db.master_catalog.clinical_screening_criteria[cIndex];
    const updatedCrit: ClinicalScreeningCriterionMaster = {
      ...old,
      domain_id: body.domain_id || old.domain_id,
      label: body.label || old.label,
      risk_tier: body.risk_tier || old.risk_tier,
      pathway: body.pathway || old.pathway,
      category_note: body.category_note !== undefined ? body.category_note : old.category_note,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : old.sort_order,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.clinical_screening_criteria[cIndex] = updatedCrit;
    saveDb(db);
    return NextResponse.json({ ok: true, criterion: updatedCrit });
  }

  // 8c. Delete Master Kriteria Skrining Klinis
  if (action === "DELETE_SCREENING_CRITERION_MASTER") {
    if (!db.master_catalog.clinical_screening_criteria) {
      db.master_catalog.clinical_screening_criteria = [];
    }
    const cIndex = db.master_catalog.clinical_screening_criteria.findIndex(
      (c) => c.criterion_id === body.criterion_id
    );
    if (cIndex === -1) {
      return NextResponse.json({ ok: false, error: "Kriteria skrining tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.clinical_screening_criteria.splice(cIndex, 1)[0];
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.criterion_id });
  }

  // 8d. Seed / Reset Master Kriteria Skrining Klinis Standar (23 Butir)
  if (action === "SEED_SCREENING_CRITERIA_MASTER") {
    db.master_catalog.clinical_screening_criteria = JSON.parse(
      JSON.stringify(DEFAULT_CLINICAL_SCREENING_CRITERIA)
    );
    appendAuditLog(db, {
      userId,
      entity: "clinical_screening_criteria",
      entityId: "seed-23-criteria",
      action: "CREATE",
      changeSummary: "Menyinkronkan 23 kriteria skrining standar ke Master Data.",
    });
    saveDb(db);
    const criteriaList = db.master_catalog.clinical_screening_criteria || [];
    return NextResponse.json({
      ok: true,
      count: criteriaList.length,
      criteria: criteriaList,
    });
  }

  // 9. Tambah Master Bundle Tindak Lanjut Klinis (Checklist Kesiapan)
  if (action === "ADD_ACTION_CHECKLIST_MASTER") {
    if (!db.master_catalog.action_checklist_masters) {
      db.master_catalog.action_checklist_masters = [];
    }
    const newBundle: ActionChecklistMaster = {
      checklist_id: body.checklist_id || `chk-${Date.now()}`,
      code: body.code || `CHK_${body.pathway || "PE"}_${body.risk_category || "MODERATE"}_${Date.now()}`,
      pathway: body.pathway || "PE",
      risk_category: body.risk_category || "MODERATE",
      label: body.label,
      description: body.description || "",
      responsible_role: body.responsible_role || "BIDAN_PERAWAT",
      sort_order: Number(body.sort_order || db.master_catalog.action_checklist_masters.length + 1),
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : true,
    };
    db.master_catalog.action_checklist_masters.push(newBundle);

    appendAuditLog(db, {
      userId,
      entity: "action_checklist_masters",
      entityId: newBundle.checklist_id,
      action: "CREATE",
      changeSummary: `Menambahkan Master Bundle [${newBundle.pathway} - ${newBundle.risk_category}]: ${newBundle.label}.`,
    });
    saveDb(db);
    return NextResponse.json({ ok: true, checklist: newBundle });
  }

  // 9b. Update Master Bundle Tindak Lanjut Klinis
  if (action === "UPDATE_ACTION_CHECKLIST_MASTER") {
    if (!db.master_catalog.action_checklist_masters) {
      db.master_catalog.action_checklist_masters = [];
    }
    const bIndex = db.master_catalog.action_checklist_masters.findIndex(
      (b) => b.checklist_id === body.checklist_id
    );
    if (bIndex === -1) {
      return NextResponse.json({ ok: false, error: "Item bundle tidak ditemukan" }, { status: 404 });
    }
    const old = db.master_catalog.action_checklist_masters[bIndex];
    const updatedBundle: ActionChecklistMaster = {
      ...old,
      code: body.code || old.code,
      pathway: body.pathway || old.pathway,
      risk_category: body.risk_category || old.risk_category,
      label: body.label || old.label,
      description: body.description !== undefined ? body.description : old.description,
      responsible_role: body.responsible_role || old.responsible_role,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : old.sort_order,
      active_status: body.active_status !== undefined ? Boolean(body.active_status) : old.active_status,
    };
    db.master_catalog.action_checklist_masters[bIndex] = updatedBundle;
    saveDb(db);
    return NextResponse.json({ ok: true, checklist: updatedBundle });
  }

  // 9c. Delete Master Bundle Tindak Lanjut Klinis
  if (action === "DELETE_ACTION_CHECKLIST_MASTER") {
    if (!db.master_catalog.action_checklist_masters) {
      db.master_catalog.action_checklist_masters = [];
    }
    const bIndex = db.master_catalog.action_checklist_masters.findIndex(
      (b) => b.checklist_id === body.checklist_id
    );
    if (bIndex === -1) {
      return NextResponse.json({ ok: false, error: "Item bundle tidak ditemukan" }, { status: 404 });
    }
    const deleted = db.master_catalog.action_checklist_masters.splice(bIndex, 1)[0];
    saveDb(db);
    return NextResponse.json({ ok: true, deleted_id: deleted.checklist_id });
  }

  // 9d. Seed / Reset Master Bundle Tindak Lanjut Standar (18 Butir)
  if (action === "SEED_ACTION_CHECKLIST_MASTERS") {
    db.master_catalog.action_checklist_masters = JSON.parse(
      JSON.stringify(DEFAULT_ACTION_CHECKLIST_MASTERS)
    );
    appendAuditLog(db, {
      userId,
      entity: "action_checklist_masters",
      entityId: "seed-18-bundles",
      action: "CREATE",
      changeSummary: "Menyinkronkan 18 item bundle tindak lanjut standar ke Master Data.",
    });
    saveDb(db);
    const bundles = db.master_catalog.action_checklist_masters || [];
    return NextResponse.json({
      ok: true,
      count: bundles.length,
      checklists: bundles,
    });
  }

  return NextResponse.json(
    { ok: false, error: "Action tidak dikenali" },
    { status: 400 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

