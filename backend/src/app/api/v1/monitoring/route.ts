import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getDb,
  resolveRequestUser,
  saveDb,
  verifyRolePermission,
} from "@/lib/store";
import {
  AlertRecord,
  BloodLossRecord,
  MonitoringRecord,
  SbarReport,
} from "@/lib/types";

export async function POST(req: Request) {
  const db = getDb();
  const { userId, user } = resolveRequestUser(req, db);
  const body = await req.json();
  const { action, admission_id } = body;
  const now = new Date().toISOString();

  const admission = db.admissions.find((a) => a.admission_id === admission_id);
  const patient = admission
    ? db.patients.find((p) => p.patient_id === admission.patient_id)
    : undefined;
  const activeProtocol =
    db.clinical_protocols.find((p) => p.status === "ACTIVE") ||
    db.clinical_protocols[0];

  // 1. Tambah Rekaman Monitoring Tanda Vital (FR-14)
  if (action === "ADD_MONITORING_RECORD") {
    const perm = verifyRolePermission(db, userId, "MONITORING_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const sbp = Number(body.systolic || 120);
    const dbp = Number(body.diastolic || 80);
    const hr = Number(body.heart_rate || 82);
    const shockIndex = Number((hr / Math.max(sbp, 1)).toFixed(2));

    const record: MonitoringRecord = {
      monitoring_id: `mon-${Date.now()}`,
      admission_id,
      observation_time: body.observation_time || now,
      phase: body.phase || "POSTPARTUM_KALA_4",
      systolic: sbp,
      diastolic: dbp,
      heart_rate: hr,
      respiratory_rate: Number(body.respiratory_rate || 20),
      temperature_c: Number(body.temperature_c || 36.7),
      spo2_percent: Number(body.spo2_percent || 99),
      shock_index: shockIndex,
      consciousness: body.consciousness || "COMPOS_MENTIS",
      uterine_tonus: body.uterine_tonus || "KERAS_BAIK",
      fundal_height: body.fundal_height || "2 jari bawah pusat",
      urine_output_ml_per_hour: body.urine_output_ml_per_hour
        ? Number(body.urine_output_ml_per_hour)
        : undefined,
      patellar_reflex: body.patellar_reflex || "NORMAL_POSITIF",
      notes: body.notes || "",
      recorded_by: userId,
    };
    db.monitoring_records.unshift(record);

    let generatedAlert: AlertRecord | null = null;
    if (
      sbp >= activeProtocol.pe_config.crisis_sbp_threshold ||
      dbp >= activeProtocol.pe_config.crisis_dbp_threshold ||
      shockIndex >= 0.9 ||
      record.uterine_tonus === "LEMBIK_ATONIA"
    ) {
      const reasons: string[] = [];
      if (
        sbp >= activeProtocol.pe_config.crisis_sbp_threshold ||
        dbp >= activeProtocol.pe_config.crisis_dbp_threshold
      ) {
        reasons.push(`TD Krisis: ${sbp}/${dbp} mmHg`);
      }
      if (shockIndex >= 0.9) {
        reasons.push(`Shock Index Meningkat: ${shockIndex} (HR ${hr} / SBP ${sbp})`);
      }
      if (record.uterine_tonus === "LEMBIK_ATONIA") {
        reasons.push("Tonus Uterus: Lembek / Curiga Atonia Uteri");
      }

      generatedAlert = {
        alert_id: `alt-mon-${Date.now()}`,
        admission_id,
        pathway: "MONITORING",
        alert_type: "MONITORING_PROTOCOL_TRIGGER",
        severity: "CRITICAL_PRIORITY",
        title: `ALERT MONITORING (${patient?.full_name || "Pasien"}): ${reasons.join(" + ")}`,
        message: `Observasi pada fase ${record.phase} mendeteksi ${reasons.join(", ")}. Segera lakukan evaluasi protokol & eskalasi SBAR!`,
        trigger_indicators: reasons,
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: now,
        triggered_by_user_id: userId,
      };
      db.alerts.unshift(generatedAlert);
    }

    appendAuditLog(db, {
      userId,
      entity: "monitoring_records",
      entityId: record.monitoring_id,
      action: "CREATE",
      changeSummary: `Mencatat monitoring tanda vital ${patient?.full_name} (TD ${sbp}/${dbp}, HR ${hr}, SI ${shockIndex}, Tonus: ${record.uterine_tonus}).`,
    });

    saveDb(db);
    return NextResponse.json({
      ok: true,
      monitoring_record: record,
      alert: generatedAlert,
    });
  }

  // 2. Tambah Rekaman Kehilangan Darah Objektif & Hitung Kumulatif (FR-15, Bab 6: Cegah Duplikasi)
  if (action === "ADD_BLOOD_LOSS_RECORD") {
    const perm = verifyRolePermission(db, userId, "MONITORING_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const volume = Number(body.volume_ml || 0);
    const phase = body.phase || "KALA_4_2JAM_PERTAMA";
    const measuredMinute = (body.measured_at || now).slice(0, 16);
    const dedupKey = `${admission_id}-${phase}-${measuredMinute}-${volume}`;

    const duplicate = db.blood_loss_records.find(
      (bl) => bl.deduplication_key === dedupKey
    );
    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PENCEGAHAN DUPLIKASI (Bab 6 SRS): Rekaman kehilangan darah dengan fase, waktu menit, dan volume yang identik sudah tercatat.",
        },
        { status: 409 }
      );
    }

    const existingList = db.blood_loss_records
      .filter((bl) => bl.admission_id === admission_id)
      .sort(
        (a, b) =>
          new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
      );
    const prevCumulative =
      existingList.length > 0
        ? existingList[existingList.length - 1].cumulative_volume_ml
        : 0;
    const newCumulative = prevCumulative + volume;
    const deliveryContext = body.delivery_mode_context || "PERVAGINAM";

    const record: BloodLossRecord = {
      blood_loss_id: `bl-${Date.now()}`,
      admission_id,
      volume_ml: volume,
      cumulative_volume_ml: newCumulative,
      method: body.method || "GRADUATED_DRAPE_UNDERBUTTOCK",
      measured_at: body.measured_at || now,
      phase,
      delivery_mode_context: deliveryContext,
      source_notes: body.source_notes || "",
      assessor_id: userId,
      deduplication_key: dedupKey,
    };
    db.blood_loss_records.push(record);

    // Evaluasi pemicu ambang perdarahan kumulatif sesuai protokol (WHO 2023 / CMQCC)
    let generatedAlert: AlertRecord | null = null;
    const hppThreshold =
      deliveryContext === "SEKSIO_SESAREA"
        ? activeProtocol.hpp_config.postpartum_sc_hpp_ml
        : activeProtocol.hpp_config.postpartum_vaginal_hpp_ml;

    if (newCumulative >= activeProtocol.hpp_config.massive_blood_loss_ml) {
      generatedAlert = {
        alert_id: `alt-bl-${Date.now()}`,
        admission_id,
        pathway: "HPP",
        alert_type: "MASSIVE_OBSTETRIC_HEMORRHAGE",
        severity: "CRITICAL_PRIORITY",
        title: `ALERT PERDARAHAN MASIF: Kumulatif ${newCumulative} mL (>= ${activeProtocol.hpp_config.massive_blood_loss_ml} mL)`,
        message: `${patient?.full_name} mengalami kehilangan darah kumulatif ${newCumulative} mL. Aktifkan Protokol Transfusi Masif & Tim PONEK segera!`,
        trigger_indicators: [
          `Penambahan: +${volume} mL (${record.method})`,
          `Total Kumulatif: ${newCumulative} mL`,
        ],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: now,
        triggered_by_user_id: userId,
      };
      db.alerts.unshift(generatedAlert);
    } else if (newCumulative >= hppThreshold) {
      generatedAlert = {
        alert_id: `alt-bl-${Date.now()}`,
        admission_id,
        pathway: "HPP",
        alert_type: "CUMULATIVE_HPP_THRESHOLD_REACHED",
        severity: "CRITICAL_PRIORITY",
        title: `ALERT AMBANG HPP TERCAPAI: Kumulatif ${newCumulative} mL (${deliveryContext} >= ${hppThreshold} mL)`,
        message: `${patient?.full_name} mencapai ambang HPP dengan kehilangan darah objektif kumulatif ${newCumulative} mL. Lakukan tata laksana aktif HPP & eskalasi SBAR!`,
        trigger_indicators: [
          `Penambahan: +${volume} mL (${record.method})`,
          `Total Kumulatif: ${newCumulative} mL (Ambang ${deliveryContext}: ${hppThreshold} mL)`,
        ],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: now,
        triggered_by_user_id: userId,
      };
      db.alerts.unshift(generatedAlert);
    } else if (
      newCumulative >= activeProtocol.hpp_config.postpartum_warn_blood_loss_ml
    ) {
      generatedAlert = {
        alert_id: `alt-bl-${Date.now()}`,
        admission_id,
        pathway: "HPP",
        alert_type: "EARLY_WARNING_BLOOD_LOSS_300ML",
        severity: "WARNING",
        title: `PERINGATAN DINI PERDARAHAN (E-MOTIVE): Kumulatif ${newCumulative} mL (>= ${activeProtocol.hpp_config.postpartum_warn_blood_loss_ml} mL)`,
        message: `Kehilangan darah kumulatif mencapai ${newCumulative} mL. Evaluasi tonus uterus, masase fundus, dan pastikan kesiapan uterotonika.`,
        trigger_indicators: [`Total Kumulatif: ${newCumulative} mL`],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: now,
        triggered_by_user_id: userId,
      };
      db.alerts.unshift(generatedAlert);
    }

    appendAuditLog(db, {
      userId,
      entity: "blood_loss_records",
      entityId: record.blood_loss_id,
      action: "CREATE",
      changeSummary: `Mencatat kehilangan darah +${volume} mL (${record.method}) pada ${patient?.full_name} -> Total Kumulatif: ${newCumulative} mL.`,
      protocolVersionRef: activeProtocol.version,
    });

    saveDb(db);
    return NextResponse.json({
      ok: true,
      blood_loss_record: record,
      cumulative_volume_ml: newCumulative,
      alert: generatedAlert,
    });
  }

  // 3. Update Status Checklist Kesiapan (FR-13, Bab 13: PLANNED / IN_PROGRESS / DONE / NOT_APPLICABLE)
  if (action === "UPDATE_ACTION_STATUS") {
    const perm = verifyRolePermission(db, userId, "ACTION_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const item = db.clinical_actions.find(
      (a) => a.action_id === body.action_id
    );
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Item checklist tidak ditemukan." },
        { status: 404 }
      );
    }

    item.status = body.status;
    item.performed_at = now;
    item.performed_by = user.full_name;
    if (body.note !== undefined) item.note = body.note;

    appendAuditLog(db, {
      userId,
      entity: "clinical_actions",
      entityId: item.action_id,
      action: "UPDATE",
      changeSummary: `Memperbarui status checklist '${item.action_label}' menjadi ${item.status}.`,
    });

    saveDb(db);
    return NextResponse.json({ ok: true, clinical_action: item });
  }

  // 4. Update Status Alert (Bab 13: OPEN -> ACKNOWLEDGED -> ESCALATED -> RESOLVED)
  if (action === "UPDATE_ALERT_STATUS") {
    const alert = db.alerts.find((al) => al.alert_id === body.alert_id);
    if (!alert) {
      return NextResponse.json(
        { ok: false, error: "Alert tidak ditemukan." },
        { status: 404 }
      );
    }

    alert.status = body.status;
    if (body.status === "ACKNOWLEDGED") {
      alert.acknowledged_at = now;
      alert.acknowledged_by = user.full_name;
    } else if (body.status === "ESCALATED") {
      alert.escalated_at = now;
      alert.escalated_to = body.escalated_to || "dr. Sari Dewi, Sp.OG";
    } else if (body.status === "RESOLVED") {
      alert.resolved_at = now;
      alert.resolution_note =
        body.resolution_note || `Diselesaikan oleh ${user.full_name}`;
    }

    appendAuditLog(db, {
      userId,
      entity: "alerts",
      entityId: alert.alert_id,
      action: "ACKNOWLEDGE_ALERT",
      changeSummary: `Mengubah status Alert '${alert.title}' menjadi ${alert.status}.`,
    });

    saveDb(db);
    return NextResponse.json({ ok: true, alert });
  }

  // 5. Buat atau Respons Laporan Komunikasi Eskalasi SBAR (FR-16, Bab 8)
  if (action === "CREATE_SBAR_REPORT") {
    const perm = verifyRolePermission(db, userId, "SBAR_WRITE");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    if (!body.verified_by_staff) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KEPATUHAN FR-16: Ringkasan SBAR wajib diverifikasi oleh petugas terlebih dahulu sebelum disimpan/dikirim.",
        },
        { status: 400 }
      );
    }

    const sbar: SbarReport = {
      sbar_id: `sbar-${Date.now()}`,
      admission_id,
      related_alert_id: body.related_alert_id,
      pathway: body.pathway || "GABUNGAN",
      situation: body.situation,
      background: body.background,
      assessment: body.assessment,
      recommendation: body.recommendation,
      verified_by_staff: true,
      recipient_doctor_name:
        body.recipient_doctor_name || "dr. Sari Dewi, Sp.OG",
      communication_channel: body.communication_channel || "TELEPON_LANGSUNG",
      reported_at: now,
      created_by: user.full_name,
      created_at: now,
    };
    db.sbar_reports.unshift(sbar);

    appendAuditLog(db, {
      userId,
      entity: "sbar_reports",
      entityId: sbar.sbar_id,
      action: "ESCALATE_SBAR",
      changeSummary: `Menyusun dan mengirim ringkasan SBAR terverifikasi untuk ${patient?.full_name} kepada ${sbar.recipient_doctor_name}.`,
    });

    saveDb(db);
    return NextResponse.json({ ok: true, sbar_report: sbar });
  }

  if (action === "RESPOND_SBAR_REPORT") {
    const perm = verifyRolePermission(db, userId, "SBAR_RESPOND");
    if (!perm.allowed) {
      return NextResponse.json({ ok: false, error: perm.reason }, { status: 403 });
    }

    const sbar = db.sbar_reports.find((s) => s.sbar_id === body.sbar_id);
    if (!sbar) {
      return NextResponse.json(
        { ok: false, error: "Laporan SBAR tidak ditemukan." },
        { status: 404 }
      );
    }

    sbar.doctor_feedback_response = body.doctor_feedback_response;
    sbar.response_received_at = now;

    appendAuditLog(db, {
      userId,
      entity: "sbar_reports",
      entityId: sbar.sbar_id,
      action: "UPDATE",
      changeSummary: `Dokter (${user.full_name}) mencatat evaluasi & umpan balik pada laporan SBAR ${sbar.sbar_id}.`,
    });

    saveDb(db);
    return NextResponse.json({ ok: true, sbar_report: sbar });
  }

  return NextResponse.json(
    { ok: false, error: "Action tidak dikenali" },
    { status: 400 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

