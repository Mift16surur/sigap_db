import { loadDb, saveDb, appendAuditLog } from "@/lib/store";
import { BloodLossRecord, MonitoringRecord, SbarReport } from "@/lib/types";

export class MonitoringService {
  /**
   * Catat Pengukuran Darah Gravimetrik (Timbang Kain / Pembalut Kalibrasi - Sesuai Proposal)
   */
  async recordBloodLoss(userId: string, payload: {
    admission_id: string;
    dry_weight_grams: number;
    wet_weight_grams: number;
    phase?: "ANTEPARTUM" | "INTRAPARTUM" | "KALA_3" | "KALA_4_2JAM_PERTAMA" | "POSTPARTUM_LANJUT";
    delivery_mode_context?: "PERVAGINAM" | "SEKSIO_SESAREA";
    notes?: string;
  }) {
    const db = loadDb();
    const dry = Number(payload.dry_weight_grams || 0);
    const wet = Number(payload.wet_weight_grams || 0);
    const volumeMl = Math.max(0, wet - dry);

    // Hitung total kumulatif
    const prevEntries = db.blood_loss_records.filter((b) => b.admission_id === payload.admission_id);
    const prevTotal = prevEntries.reduce((acc, curr) => acc + Number(curr.volume_ml || 0), 0);
    const cumulativeTotal = prevTotal + volumeMl;

    const entry: BloodLossRecord = {
      blood_loss_id: `bl-${Date.now()}`,
      admission_id: payload.admission_id,
      volume_ml: volumeMl,
      cumulative_volume_ml: cumulativeTotal,
      method: "GRAVIMETRIK_TIMBANG_KASA",
      measured_at: new Date().toISOString(),
      phase: payload.phase || "KALA_4_2JAM_PERTAMA",
      delivery_mode_context: payload.delivery_mode_context || "PERVAGINAM",
      source_notes: payload.notes || `Kering: ${dry}g, Basah: ${wet}g`,
      assessor_id: userId,
      deduplication_key: `dedup-${Date.now()}`,
    };

    db.blood_loss_records.push(entry);

    // Jika kumulatif >= 500 mL, buat alert darurat
    if (cumulativeTotal >= 500) {
      db.alerts.unshift({
        alert_id: `alt-bl-${Date.now()}`,
        admission_id: payload.admission_id,
        pathway: "HPP",
        alert_type: "RULE_BLOOD_LOSS_CRITICAL",
        severity: "CRITICAL_PRIORITY",
        title: `PERINGATAN: Perdarahan Terukur Objektif ${cumulativeTotal} mL`,
        message: `Total perdarahan kuantitatif telah mencapai ${cumulativeTotal} mL. Lakukan tata laksana HPP segera.`,
        trigger_indicators: ["Volume Darah Terukur >= 500 mL"],
        is_preemptive_before_complete: true,
        status: "OPEN",
        triggered_at: new Date().toISOString(),
        triggered_by_user_id: userId,
      });
    }

    appendAuditLog(db, {
      userId,
      entity: "blood_loss_records",
      entityId: entry.blood_loss_id,
      action: "CREATE",
      changeSummary: `Pencatatan darah gravimetrik: +${volumeMl} mL (Total: ${cumulativeTotal} mL).`,
    });
    saveDb(db);

    return entry;
  }

  /**
   * Catat Tanda Vital & Monitoring Klinis
   */
  async recordVitals(userId: string, payload: {
    admission_id: string;
    systolic: number;
    diastolic: number;
    heart_rate: number;
    respiratory_rate: number;
    temperature_c?: number;
    oxygen_saturation?: number;
    notes?: string;
  }) {
    const db = loadDb();
    const sbp = Number(payload.systolic || 120);
    const hr = Number(payload.heart_rate || 80);
    const shockIndex = sbp > 0 ? Number((hr / sbp).toFixed(2)) : 0.67;

    const record: MonitoringRecord = {
      monitoring_id: `mr-${Date.now()}`,
      admission_id: payload.admission_id,
      observation_time: new Date().toISOString(),
      phase: "POSTPARTUM_KALA_4",
      systolic: sbp,
      diastolic: Number(payload.diastolic || 80),
      heart_rate: hr,
      respiratory_rate: Number(payload.respiratory_rate || 20),
      temperature_c: Number(payload.temperature_c || 36.8),
      spo2_percent: Number(payload.oxygen_saturation || 98),
      shock_index: shockIndex,
      consciousness: "COMPOS_MENTIS",
      uterine_tonus: "KERAS_BAIK",
      notes: payload.notes || "Pemantauan berkala",
      recorded_by: userId,
    };

    db.monitoring_records.push(record);
    saveDb(db);
    return record;
  }

  /**
   * Buat Ringkasan Serah Terima Format SBAR (Sesuai Proposal)
   */
  async createSbarHandover(userId: string, payload: {
    admission_id: string;
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    recipient_doctor_name?: string;
  }) {
    const db = loadDb();
    const sbar: SbarReport = {
      sbar_id: `sbar-${Date.now()}`,
      admission_id: payload.admission_id,
      pathway: "GABUNGAN",
      situation: payload.situation,
      background: payload.background,
      assessment: payload.assessment,
      recommendation: payload.recommendation,
      verified_by_staff: true,
      recipient_doctor_name: payload.recipient_doctor_name || "dr. Sari Dewi, Sp.OG (DPJP)",
      communication_channel: "SISTEM_SIGAP",
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      created_by: userId,
    };

    db.sbar_reports.unshift(sbar);
    appendAuditLog(db, {
      userId,
      entity: "sbar_reports",
      entityId: sbar.sbar_id,
      action: "CREATE",
      changeSummary: `Serah terima SBAR dibuat untuk penerima ${sbar.recipient_doctor_name}.`,
    });
    saveDb(db);

    return sbar;
  }
}

export const monitoringService = new MonitoringService();
