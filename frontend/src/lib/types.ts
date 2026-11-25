/**
 * SIGAP — Skrining Admisi Preeklamsia dan Perdarahan Pascapersalinan
 * Skema Data Inti (18 Entitas sesuai SRS Bab 9.1, Bab 6, Bab 7, & Bab 13)
 */

// 1. Role & Kewenangan (SRS Bab 3, FR-01, FR-02)
export type UserRole =
  | "BIDAN_PERAWAT"
  | "DOKTER"
  | "ADMIN_RS"
  | "VALIDATOR_KLINIS"
  | "ADMIN_TI";

export interface RoleDefinition {
  role_id: UserRole;
  name: string;
  description: string;
  permissions: string[];
}

export interface HospitalUnit {
  unit_id: string;
  code: string;
  name: string;
  type: "IGD_OBSTETRI" | "VK_BERSALIN" | "RAWAT_INAP_NIFAS" | "HCU_ICU" | "MANAJEMEN";
  active_status: boolean;
}

export interface User {
  user_id: string;
  role_id: UserRole;
  unit_id: string;
  username: string;
  full_name: string;
  title_credentials: string;
  password_hash: string; // NFR-02
  active_status: boolean;
  created_at: string;
}

// 2. Status Standar Sistem (SRS Bab 13 & FR-09)
export type AdmissionStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type ScreeningStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVIEW";
export type RiskCategory = "LOW" | "MODERATE" | "HIGH";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "ESCALATED" | "RESOLVED";
export type AlertSeverity = "CRITICAL_PRIORITY" | "HIGH" | "WARNING" | "INFO";
export type ActionStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "NOT_APPLICABLE";

// FR-09 & Bab 6: Membedakan 5 status eksplisit; data kosong != negatif/normal
export type ClinicalItemResponse =
  | "YA"
  | "TIDAK"
  | "TIDAK_DIKETAHUI"
  | "BELUM_DIPERIKSA"
  | "TIDAK_RELEVAN";

export type LabAvailabilityStatus = "TERSEDIA" | "BELUM_TERSEDIA" | "TIDAK_RELEVAN";

export type InfoSource =
  | "ANAMNESIS_PASIEN"
  | "BUKU_KIA_REKAM_MEDIS"
  | "SURAT_RUJUKAN"
  | "PEMERIKSAAN_FISIK"
  | "HASIL_LABORATORIUM"
  | "OBSERVASI_TIM";

export type Domain4T =
  | "TONUS"
  | "TRAUMA"
  | "JARINGAN"
  | "TROMBIN"
  | "TAMBAHAN"
  | "PE_HIGH_RISK"
  | "PE_MODERATE_RISK";

// 3. Entitas Pasien (FR-03, NFR-03)
export interface Patient {
  patient_id: string;
  patient_code: string; // Kode anonim penelitian misal SGP-2026-001
  mrn: string; // Nomor Rekam Medis (No. RM)
  full_name: string; // Dapat disamarkan jika mode anonim aktif
  is_anonymous_mode: boolean;
  tanggal_lahir: string;
  age_years: number;
  gender?: "PEREMPUAN" | "LAKI_LAKI";
  golongan_darah?: string;
  nik_masked?: string;
  alamat_singkat?: string;
  kontak_darurat?: string;
  created_at: string;
}

// 4. Entitas Episode Admisi & Riwayat Obstetri (FR-04, FR-05)
export type AdmissionType =
  | "ADM_ANTENATAL"
  | "ADM_INPARTU"
  | "ADM_POSTPARTUM"
  | "RUJUKAN_EMERGENSI";

export interface ObstetricHistory {
  gravida: number;
  para: number;
  abortus: number;
  living_children: number;
  is_primigravida: boolean;
  riwayat_pe_sebelumnya: ClinicalItemResponse;
  riwayat_eklamsia_sebelumnya: ClinicalItemResponse;
  riwayat_hpp_sebelumnya: ClinicalItemResponse;
  riwayat_sc_jumlah: number;
  interval_kehamilan_tahun?: number;
  kehamilan_ganda: ClinicalItemResponse;
  hipertensi_kronis: ClinicalItemResponse;
  diabetes_melitus: ClinicalItemResponse;
  penyakit_ginjal: ClinicalItemResponse;
  penyakit_autoimun_sle_aps: ClinicalItemResponse;
  obesitas_imt_lebih_30: ClinicalItemResponse;
  imt_nilai?: number;
  catatan_komorbid?: string;
}

export interface Admission {
  admission_id: string;
  patient_id: string;
  admission_code: string;
  admission_date: string;
  usia_kehamilan_minggu: number;
  usia_kehamilan_hari: number;
  jenis_admisi: AdmissionType;
  asal_rujukan: string;
  referral_facility_id?: string;
  referral_facility_name?: string;
  nomor_rujukan?: string;
  diagnosa_rujukan?: string;
  penjamin?: string;
  unit_id: string;
  unit_name?: string;
  status: AdmissionStatus;
  keluhan_utama: string;
  obstetric_history: ObstetricHistory;
  created_by: string;
  attending_doctor_id?: string;
  attending_doctor_name?: string;
  receiving_midwife_id?: string;
  receiving_midwife_name?: string;
  discharge_at?: string;
  discharge_summary?: string;
  created_at: string;
  updated_at: string;
}

// 5. Entitas Skrining Preeklamsia / PE (FR-06, FR-07)
export interface PeScreening {
  pe_screening_id: string;
  admission_id: string;
  screening_time: string;
  started_at: string; // Untuk metrik waktu pengisian Bab 14
  completed_at?: string;
  duration_seconds?: number;
  status: ScreeningStatus;
  assessor_id: string;
  kejang_eklamsia: ClinicalItemResponse;
  kesadaran_menurun_gcs_rendah: ClinicalItemResponse;
  edema_paru_sesak_berat: ClinicalItemResponse;
  oliguria_produksi_urin_rendah: ClinicalItemResponse;
  clinical_notes?: string;
  updated_at: string;
}

// FR-07 & Bab 6: Setiap pengukuran disimpan terpisah, tidak menimpa nilai sebelumnya
export type BpPosition =
  | "DUDUK_BERSANDAR"
  | "SEMI_FOWLER"
  | "MIRING_KIRI"
  | "TERLENTANG";

export interface BpMeasurement {
  bp_id: string;
  pe_screening_id: string;
  admission_id: string;
  sequence_number: number; // Urutan pengukuran ke-1, ke-2, dst.
  systolic: number;
  diastolic: number;
  mean_arterial_pressure: number; // MAP = (SBP + 2*DBP)/3
  heart_rate?: number;
  measured_at: string;
  position: BpPosition;
  cuff_size: "STANDAR_DEWASA" | "BESAR_OBESITAS" | "KECIL";
  is_repeat_verification: boolean;
  assessor_id: string;
  note?: string;
}

// Gejala PE (Bab 6: Setiap gejala memiliki status Ya/Tidak/Tidak diketahui/Belum diperiksa dan waktu penilaian)
export interface PeSymptomRecord {
  pe_symptom_id: string;
  pe_screening_id: string;
  symptom_code: string;
  symptom_label: string;
  is_severe_feature: boolean;
  response: ClinicalItemResponse;
  assessed_at: string;
  onset_description?: string;
}

// 6. Entitas Hasil Laboratorium (FR-06, Bab 6 & Bab 7: Belum tersedia != normal)
export type LabTestCode =
  | "PROTEIN_URIN_DIPSTICK"
  | "PROTEIN_URIN_RASIO_PCR"
  | "HEMOGLOBIN"
  | "HEMATOKRIT"
  | "TROMBOSIT"
  | "SGOT_AST"
  | "SGPT_ALT"
  | "KREATININ_SERUM"
  | "FIBRINOGEN"
  | "INR_PT_APTT"
  | "GOLONGAN_DARAH_CROSSMATCH";

export interface LabResult {
  lab_id: string;
  admission_id: string;
  test_code: LabTestCode;
  test_name: string;
  result_status: LabAvailabilityStatus; // TERSEDIA | BELUM_TERSEDIA | TIDAK_RELEVAN
  value_numeric?: number;
  value_text?: string; // misal "+2", "Negatif", "O Rh+"
  unit: string;
  reference_range: string;
  is_abnormal_flag?: boolean;
  collected_at?: string;
  recorded_by: string;
}

// 7. Entitas Skrining Risiko HPP 4T & Master Faktor Risiko (FR-08, Bab 6, Bab 12)
export interface RiskFactorMaster {
  risk_factor_id: string;
  code: string;
  screening_pathway: "PE" | "HPP";
  domain_4t: Domain4T;
  risk_tier: "MODERATE" | "HIGH" | "CRITICAL_IMMEDIATE";
  default_weight: number;
  label: string;
  definition: string;
  clinical_rationale: string;
  active_status: boolean;
}

export interface HppScreening {
  hpp_screening_id: string;
  admission_id: string;
  screening_time: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  status: ScreeningStatus;
  assessor_id: string;
  perdarahan_aktif_saat_admisi: ClinicalItemResponse;
  syok_hemodinamik_instabil: ClinicalItemResponse;
  rencana_metode_persalinan: "PERVAGINAM_SPONTAN" | "INDUKSI_AUGMENTASI" | "SEKSIO_SESAREA" | "BELUM_DITENTUKAN";
  clinical_notes?: string;
  updated_at: string;
}

export interface ScreeningRiskDetail {
  risk_detail_id: string;
  screening_id: string; // Dapat merujuk ke hpp_screening_id atau pe_screening_id
  admission_id: string;
  pathway: "PE" | "HPP";
  risk_factor_id: string;
  risk_factor_code: string;
  domain: Domain4T;
  response: ClinicalItemResponse;
  info_source: InfoSource;
  assessed_at: string;
  note?: string;
}

// 8. Entitas Hasil Skrining & Versi Protokol (FR-10, FR-11, FR-21, Bab 6 & 7)
export interface TriggeredIndicator {
  code: string;
  label: string;
  domain: string;
  severity: "MODERATE" | "HIGH" | "CRITICAL";
  value_summary: string;
}

export interface ScreeningResult {
  result_id: string;
  admission_id: string;
  screening_id: string;
  screening_type: "PE" | "HPP";
  category: RiskCategory; // LOW | MODERATE | HIGH
  priority_alert_triggered: boolean;
  summary_headline: string;
  rationale: string[]; // Alasan klasifikasi transparan
  triggered_indicators: TriggeredIndicator[];
  missing_or_unknown_fields: string[]; // Daftar eksplisit data belum tersedia/belum diperiksa (NFR-09)
  recommended_checklists: string[];
  protocol_version_id: string;
  protocol_version_number: string;
  calculated_at: string;
  assessor_id: string;
  is_re_evaluation: boolean;
  previous_category?: RiskCategory;
  input_snapshot_hash: string;
}

// 9. Entitas Monitoring & Kehilangan Darah Kumulatif (FR-14, FR-15, Bab 6, Bab 12)
export interface MonitoringRecord {
  monitoring_id: string;
  admission_id: string;
  observation_time: string;
  phase: "ANTEPARTUM" | "INTRAPARTUM" | "POSTPARTUM_KALA_3" | "POSTPARTUM_KALA_4" | "NIFAS_LANJUT";
  systolic: number;
  diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  temperature_c: number;
  spo2_percent: number;
  shock_index: number; // HR / SBP (Normal obstetri < 0.9; >= 0.9 waspada HPP/syok)
  consciousness: "COMPOS_MENTIS" | "SOMNOLEN" | "SOPOR" | "KOMA" | "GELISAH";
  uterine_tonus: "KERAS_BAIK" | "LEMBIK_ATONIA" | "TIDAK_RELEVAN_ANTEPARTUM";
  fundal_height?: string;
  urine_output_ml_per_hour?: number;
  patellar_reflex?: "NORMAL_POSITIF" | "HIPERREFLEKSIA" | "NEGATIF_HILANG" | "BELUM_DIPERIKSA";
  notes: string;
  recorded_by: string;
}

export type BloodLossMethod =
  | "GRADUATED_DRAPE_UNDERBUTTOCK"
  | "GRAVIMETRIK_TIMBANG_KASA"
  | "SUCTION_TABUNG_UKUR"
  | "ESTIMASI_VISUAL_TERKALIBRASI";

export interface BloodLossRecord {
  blood_loss_id: string;
  admission_id: string;
  volume_ml: number;
  cumulative_volume_ml: number; // Dihitung otomatis (FR-15)
  method: BloodLossMethod;
  measured_at: string;
  phase: "ANTEPARTUM" | "INTRAPARTUM" | "KALA_3" | "KALA_4_2JAM_PERTAMA" | "POSTPARTUM_LANJUT";
  delivery_mode_context: "PERVAGINAM" | "SEKSIO_SESAREA";
  source_notes?: string;
  assessor_id: string;
  deduplication_key: string; // Cegah duplikasi (Bab 6)
}

// 10. Entitas Checklist Tindakan Kesiapan (FR-13, Bab 13: bukan instruksi terapi/dosis otomatis)
export interface ClinicalAction {
  action_id: string;
  admission_id: string;
  pathway: "PE" | "HPP" | "UMUM";
  action_code: string;
  action_label: string;
  category_context: RiskCategory;
  status: ActionStatus; // PLANNED | IN_PROGRESS | DONE | NOT_APPLICABLE
  performed_at?: string;
  performed_by?: string;
  note?: string;
  protocol_version_id: string;
}

// 11. Entitas Alert & Eskalasi (FR-12, Bab 13, Bab 15)
export interface AlertRecord {
  alert_id: string;
  admission_id: string;
  pathway: "PE" | "HPP" | "MONITORING";
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  trigger_indicators: string[];
  is_preemptive_before_complete: boolean; // FR-12: muncul tanpa menunggu form selesai
  status: AlertStatus; // OPEN | ACKNOWLEDGED | ESCALATED | RESOLVED
  triggered_at: string;
  triggered_by_user_id: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  escalated_at?: string;
  escalated_to?: string;
  resolved_at?: string;
  resolution_note?: string;
}

// 12. Entitas Komunikasi Eskalasi SBAR (FR-16, Bab 8)
export interface SbarReport {
  sbar_id: string;
  admission_id: string;
  related_alert_id?: string;
  pathway: "PE" | "HPP" | "GABUNGAN";
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  verified_by_staff: boolean; // FR-16: diverifikasi petugas sebelum disimpan/dikirim
  recipient_doctor_name: string;
  communication_channel: "TELEPON_LANGSUNG" | "TATAP_MUKA_VISITE" | "PESAN_INTERNAL_RS" | "SISTEM_SIGAP";
  reported_at: string;
  doctor_feedback_response?: string;
  response_received_at?: string;
  created_by: string;
  created_at: string;
}

// 13. Entitas Protokol Klinis & Tabel Keputusan Berversi (FR-10, FR-21, Bab 3, Bab 7)
export interface PeDecisionConfig {
  crisis_sbp_threshold: number; // Default 160 mmHg
  crisis_dbp_threshold: number; // Default 110 mmHg
  hypertension_sbp_threshold: number; // Default 140 mmHg
  hypertension_dbp_threshold: number; // Default 90 mmHg
  min_high_risk_factors_for_high: number; // Default 1
  min_moderate_risk_factors_for_high: number; // Default 2
  min_moderate_risk_factors_for_moderate: number; // Default 1
  low_platelets_threshold: number; // Default 100000 /uL
  high_creatinine_threshold: number; // Default 1.1 mg/dL
  liver_enzyme_threshold: number; // Default 70 U/L (2x batas atas)
}

export interface HppDecisionConfig {
  anemia_hb_high_risk_threshold: number; // Default < 8.0 g/dL
  anemia_hb_moderate_risk_threshold: number; // Default < 10.0 g/dL
  hematocrit_threshold: number; // Default < 30%
  low_platelets_hpp_threshold: number; // Default < 70000 /uL
  low_fibrinogen_threshold: number; // Default < 200 mg/dL
  min_high_risk_4t_for_high: number; // Default 1
  min_moderate_risk_4t_for_high: number; // Default 2
  min_moderate_risk_4t_for_moderate: number; // Default 1
  postpartum_warn_blood_loss_ml: number; // Default 300 mL
  postpartum_vaginal_hpp_ml: number; // Default 500 mL
  postpartum_sc_hpp_ml: number; // Default 1000 mL
  massive_blood_loss_ml: number; // Default 1500 mL
}

export interface ClinicalProtocol {
  protocol_version_id: string;
  version: string;
  title: string;
  source_guidelines: string[]; // ACOG No. 222, ISSHP 2022, NICE NG133, CMQCC 2015, WHO 2023
  effective_date: string;
  approved_by_user_id: string;
  approved_by_name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  pe_config: PeDecisionConfig;
  hpp_config: HppDecisionConfig;
  readiness_checklists: {
    PE_LOW: string[];
    PE_MODERATE: string[];
    PE_HIGH: string[];
    HPP_LOW: string[];
    HPP_MODERATE: string[];
    HPP_HIGH: string[];
  };
  change_notes: string;
  created_at: string;
}

// 14. Entitas Audit Log (FR-20, NFR-04)
export interface AuditLog {
  audit_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  entity: string;
  entity_id: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "EVALUATE_SCREENING"
    | "RE_EVALUATE_AFTER_CHANGE"
    | "TRIGGER_PRIORITY_ALERT"
    | "ACKNOWLEDGE_ALERT"
    | "ESCALATE_SBAR"
    | "APPROVE_PROTOCOL"
    | "EXPORT_SIMULATION_SUMMARY"
    | "BLOCKED_UNAUTHORIZED_ACTION";
  timestamp: string;
  change_summary: string;
  protocol_version_ref?: string;
}

// 15. Entitas Evaluasi Prototipe Penelitian (Bab 14: Validasi Ahli, Cohen's Kappa, SUS, Waktu)
export interface ConcordanceScenario {
  scenario_id: string;
  code: string;
  title: string;
  pathway: "PE" | "HPP";
  clinical_vignette: string;
  system_category: RiskCategory;
  expert_1_category: RiskCategory;
  expert_2_category: RiskCategory;
  consensus_category: RiskCategory;
  is_concordant: boolean;
  manual_form_seconds: number;
  sigap_app_seconds: number;
}

export interface SusResponseRecord {
  sus_id: string;
  respondent_code: string;
  respondent_role: "BIDAN" | "PERAWAT";
  unit_name: string;
  q_scores: number[]; // 10 item skala 1-5
  calculated_sus_score: number; // 0 - 100 (Target > 68)
  submitted_at: string;
}

// 16. Entitas Data Master Lengkap (Dokter, Bidan/Perawat, Asal Rujukan, Keluhan Utama, Komorbid, Gejala PE, Parameter Lab, Tindakan)
export interface DoctorMaster {
  doctor_id: string;
  nip_sip: string;
  full_name: string;
  specialty: "SP_OG" | "SP_OG_KFM" | "DOKTER_JAGA_PONEK" | "SP_ANESTESI";
  unit_id: string;
  phone: string;
  is_on_call_dpjp: boolean;
  active_status: boolean;
}

export interface MidwifeNurseMaster {
  staff_id: string;
  nip_str: string;
  full_name: string;
  profession: "BIDAN" | "PERAWAT_OBSTETRI";
  credential_level: string;
  unit_id: string;
  shift: "PAGI" | "SORE" | "MALAM";
  active_status: boolean;
}

export interface ReferralFacilityMaster {
  referral_id: string;
  code: string;
  facility_name: string;
  facility_type: "PUSKESMAS_PONED" | "KLINIK_PRATAMA" | "BPM_BIDAN_PRAKTIK" | "RS_TIPE_C_D" | "DATANG_SENDIRI";
  district_city: string;
  subdistrict?: string;
  contact_phone: string;
  active_status: boolean;
}

export interface ChiefComplaintTemplate {
  complaint_id: string;
  code: string;
  category: "INPARTU" | "HIPERTENSI_PE" | "PERDARAHAN_HPP" | "ANTENATAL_NIFAS";
  label: string;
  default_text: string;
  active_status: boolean;
}

export interface ComorbidityTemplate {
  comorbid_id: string;
  code: string;
  label: string;
  default_note: string;
  active_status: boolean;
}

export interface PeSymptomMaster {
  symptom_code: string;
  symptom_label: string;
  is_severe_feature: boolean;
  clinical_description: string;
  active_status: boolean;
}

export interface LabParameterMaster {
  test_code: LabTestCode;
  test_name: string;
  pathway: "PE" | "HPP" | "BOTH";
  unit: string;
  reference_range: string;
  critical_threshold_info: string;
  default_options?: string[]; // misal untuk kualitatif: Negatif, Trace, +1, +2, +3, +4
  active_status: boolean;
}

export interface ActionChecklistMaster {
  checklist_id: string;
  code: string;
  pathway: "PE" | "HPP";
  risk_category: RiskCategory;
  label: string;
  description?: string;
  responsible_role: "BIDAN_PERAWAT" | "DOKTER" | "TIM_PONEK";
  sort_order?: number;
  active_status: boolean;
}

export type ScreeningDomainId =
  | "DOMAIN_MATERNAL"
  | "DOMAIN_OBSTETRI"
  | "DOMAIN_JANIN"
  | "DOMAIN_KOMBINASI";

export interface ClinicalScreeningCriterionMaster {
  criterion_id: string;
  domain_id: ScreeningDomainId;
  label: string;
  risk_tier: RiskCategory;
  pathway: "PE" | "HPP" | "ALL";
  category_note?: string;
  active_status: boolean;
  sort_order: number;
}

export const DEFAULT_CLINICAL_SCREENING_CRITERIA: ClinicalScreeningCriterionMaster[] = [
  // 1. DOMAIN MATERNAL
  {
    criterion_id: "mat_low_normal",
    domain_id: "DOMAIN_MATERNAL",
    label: "Tekanan darah normal (< 140/90 mmHg) & kadar Hb >= 11 g/dL",
    risk_tier: "LOW",
    pathway: "ALL",
    category_note: "Tanda Vital & Lab Rutin",
    active_status: true,
    sort_order: 1,
  },
  {
    criterion_id: "mat_low_no_symptoms_risk",
    domain_id: "DOMAIN_MATERNAL",
    label: "Tanpa gejala subjektif pemberatan, proteinuria, maupun riwayat risiko tinggi",
    risk_tier: "LOW",
    pathway: "ALL",
    category_note: "Gejala & Riwayat",
    active_status: true,
    sort_order: 2,
  },
  {
    criterion_id: "mat_mod_bp",
    domain_id: "DOMAIN_MATERNAL",
    label: "Tekanan darah 140–159 / 90–109 mmHg (pada 1 kali pengukuran)",
    risk_tier: "MODERATE",
    pathway: "PE",
    category_note: "Tanda Vital Hipertensi",
    active_status: true,
    sort_order: 3,
  },
  {
    criterion_id: "mat_mod_proteinuria",
    domain_id: "DOMAIN_MATERNAL",
    label: "Protein urin positif (dipstik >= +1 atau uPCR >= 0,3)",
    risk_tier: "MODERATE",
    pathway: "PE",
    category_note: "Laboratorium Urin",
    active_status: true,
    sort_order: 4,
  },
  {
    criterion_id: "mat_mod_anemia",
    domain_id: "DOMAIN_MATERNAL",
    label: "Anemia ringan–sedang (Hb 7–10,9 g/dL)",
    risk_tier: "MODERATE",
    pathway: "ALL",
    category_note: "Laboratorium Hematologi",
    active_status: true,
    sort_order: 5,
  },
  {
    criterion_id: "mat_mod_obesity_multipara",
    domain_id: "DOMAIN_MATERNAL",
    label: "Obesitas atau Grandemultipara",
    risk_tier: "MODERATE",
    pathway: "ALL",
    category_note: "Faktor Risiko Maternal & Tonus",
    active_status: true,
    sort_order: 6,
  },
  {
    criterion_id: "mat_mod_pe_mild",
    domain_id: "DOMAIN_MATERNAL",
    label: "Preeklamsia tanpa tanda berat",
    risk_tier: "MODERATE",
    pathway: "ALL",
    category_note: "Diagnosis Preeklamsia",
    active_status: true,
    sort_order: 7,
  },
  {
    criterion_id: "mat_high_bp",
    domain_id: "DOMAIN_MATERNAL",
    label: "Tekanan darah >= 160/110 mmHg (menetap >= 15 menit)",
    risk_tier: "HIGH",
    pathway: "PE",
    category_note: "Krisis Hipertensi Emergensi",
    active_status: true,
    sort_order: 8,
  },
  {
    criterion_id: "mat_high_severe_symptoms",
    domain_id: "DOMAIN_MATERNAL",
    label: "Terdapat tanda pemberatan (nyeri kepala hebat, gangguan penglihatan, nyeri epigastrium, edema paru)",
    risk_tier: "HIGH",
    pathway: "PE",
    category_note: "Tanda Bahaya Serebro-Visual",
    active_status: true,
    sort_order: 9,
  },
  {
    criterion_id: "mat_high_eclampsia",
    domain_id: "DOMAIN_MATERNAL",
    label: "Terjadi kejang (eklamsia)",
    risk_tier: "HIGH",
    pathway: "PE",
    category_note: "Kegawatdaruratan Eklamsia",
    active_status: true,
    sort_order: 10,
  },
  {
    criterion_id: "mat_high_lab_abnormal",
    domain_id: "DOMAIN_MATERNAL",
    label: "Hasil lab abnormal (trombosit < 100.000/uL, enzim transaminase >= 2x normal, atau kreatinin > 1,1 mg/dL)",
    risk_tier: "HIGH",
    pathway: "PE",
    category_note: "Disfungsi Organ Maternal",
    active_status: true,
    sort_order: 11,
  },
  {
    criterion_id: "mat_high_severe_anemia",
    domain_id: "DOMAIN_MATERNAL",
    label: "Anemia berat (Hb < 7 g/dL)",
    risk_tier: "HIGH",
    pathway: "ALL",
    category_note: "Laboratorium Hematologi",
    active_status: true,
    sort_order: 12,
  },
  {
    criterion_id: "mat_high_prev_hpp_bleeding",
    domain_id: "DOMAIN_MATERNAL",
    label: "Riwayat HPP sebelumnya atau perdarahan antepartum aktif",
    risk_tier: "HIGH",
    pathway: "HPP",
    category_note: "Riwayat & Perdarahan Aktif",
    active_status: true,
    sort_order: 13,
  },
  {
    criterion_id: "mat_high_severe_pe_hellp",
    domain_id: "DOMAIN_MATERNAL",
    label: "Preeklamsia berat atau sindrom HELLP",
    risk_tier: "HIGH",
    pathway: "ALL",
    category_note: "Komplikasi Berat & 4T Trombin",
    active_status: true,
    sort_order: 14,
  },

  // 2. DOMAIN OBSTETRI
  {
    criterion_id: "obs_low_normal",
    domain_id: "DOMAIN_OBSTETRI",
    label: "Tidak ada faktor risiko obstetri / HPP saat admisi",
    risk_tier: "LOW",
    pathway: "HPP",
    category_note: "Faktor Obstetri Normal",
    active_status: true,
    sort_order: 15,
  },
  {
    criterion_id: "obs_mod_induction",
    domain_id: "DOMAIN_OBSTETRI",
    label: "Induksi atau augmentasi persalinan",
    risk_tier: "MODERATE",
    pathway: "HPP",
    category_note: "Tindakan Persalinan / 4T Tonus",
    active_status: true,
    sort_order: 16,
  },
  {
    criterion_id: "obs_mod_prev_sc",
    domain_id: "DOMAIN_OBSTETRI",
    label: "Riwayat seksio sesarea 1x",
    risk_tier: "MODERATE",
    pathway: "HPP",
    category_note: "Riwayat Uterus / 4T Trauma",
    active_status: true,
    sort_order: 17,
  },
  {
    criterion_id: "obs_high_placenta_previa",
    domain_id: "DOMAIN_OBSTETRI",
    label: "Plasenta previa atau spektrum akreta",
    risk_tier: "HIGH",
    pathway: "HPP",
    category_note: "Anatomi Plasenta / 4T Tissue",
    active_status: true,
    sort_order: 18,
  },

  // 3. DOMAIN JANIN
  {
    criterion_id: "fet_low_singleton",
    domain_id: "DOMAIN_JANIN",
    label: "Kehamilan tunggal normal",
    risk_tier: "LOW",
    pathway: "ALL",
    category_note: "Kondisi Janin Tunggal",
    active_status: true,
    sort_order: 19,
  },
  {
    criterion_id: "fet_mod_macrosomia_poly",
    domain_id: "DOMAIN_JANIN",
    label: "Makrosomia atau Polihidramnion",
    risk_tier: "MODERATE",
    pathway: "HPP",
    category_note: "Overdistensi Uterus / 4T Tonus",
    active_status: true,
    sort_order: 20,
  },
  {
    criterion_id: "fet_high_multiple",
    domain_id: "DOMAIN_JANIN",
    label: "Kehamilan ganda (gemeli / multipel)",
    risk_tier: "HIGH",
    pathway: "ALL",
    category_note: "Overdistensi & Risiko Ganda",
    active_status: true,
    sort_order: 21,
  },

  // 4. DOMAIN KOMBINASI RISIKO
  {
    criterion_id: "comb_mod_threshold",
    domain_id: "DOMAIN_KOMBINASI",
    label: "Terdapat >= 1 faktor risiko tinggi ATAU >= 2 faktor risiko sedang tanpa tanda pemberatan",
    risk_tier: "MODERATE",
    pathway: "ALL",
    category_note: "Kaidah Skor Ambang Sedang",
    active_status: true,
    sort_order: 22,
  },
  {
    criterion_id: "comb_high_severe_combo",
    domain_id: "DOMAIN_KOMBINASI",
    label: "Kombinasi komplikasi berat (misal: preeklamsia berat disertai gangguan lab/tanda pemberatan atau skor kumulatif risiko tinggi ganda)",
    risk_tier: "HIGH",
    pathway: "ALL",
    category_note: "Kaidah Komplikasi Berat Ganda",
    active_status: true,
    sort_order: 23,
  },
];

export const DEFAULT_ACTION_CHECKLIST_MASTERS: ActionChecklistMaster[] = [
  // ===================== PREEKLAMSIA (PE) =====================
  // 1. PE LOW (2 butir)
  {
    checklist_id: "chk-pe-l1",
    code: "PE_LOW_VITAL_SIGNS",
    pathway: "PE",
    risk_category: "LOW",
    label: "Pemantauan Tanda Vital & Kemajuan Persalinan Rutin",
    description: "Pemantauan tanda vital dan kemajuan persalinan rutin sesuai protokol standar.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-pe-l2",
    code: "PE_LOW_RESCREEN",
    pathway: "PE",
    risk_category: "LOW",
    label: "Skrining Ulang Berkala Bila Muncul Keluhan Baru",
    description: "Lakukan skrining ulang segera apabila muncul keluhan baru atau peningkatan tekanan darah selama perawatan.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },

  // 2. PE MODERATE (3 butir)
  {
    checklist_id: "chk-pe-m1",
    code: "PE_MOD_REST_BP_RECHECK",
    pathway: "PE",
    risk_category: "MODERATE",
    label: "Istirahatkan Ibu & Evaluasi Pengukuran TD Ulang (>= 15 Menit)",
    description: "Istirahatkan ibu dan ulangi pengukuran tekanan darah terstandar setelah >= 15 menit (atau evaluasi dalam 4 jam untuk konfirmasi diagnosis).",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-pe-m2",
    code: "PE_MOD_URINE_LAB",
    pathway: "PE",
    risk_category: "MODERATE",
    label: "Pemeriksaan Protein Urin & Panel Laboratorium Dasar",
    description: "Periksa protein urin serta panel laboratorium dasar (darah lengkap/trombosit, fungsi hati, kreatinin).",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },
  {
    checklist_id: "chk-pe-m3",
    code: "PE_MOD_REPORT_EWS",
    pathway: "PE",
    risk_category: "MODERATE",
    label: "Lapor Bidan / Dokter Jaga & Aktifkan Peringatan Dini HPP",
    description: "Lapor bidan/dokter jaga, tingkatkan frekuensi pemantauan, dan aktifkan peringatan dini risiko HPP.",
    responsible_role: "DOKTER",
    sort_order: 3,
    active_status: true,
  },

  // 3. PE HIGH (3 butir)
  {
    checklist_id: "chk-pe-h1",
    code: "PE_HIGH_MGSO4_ANTIHYPERTENSIVE",
    pathway: "PE",
    risk_category: "HIGH",
    label: "Aktivasi Respons Cepat & Timer 30–60 Menit: Lapor Sp.OG (SBAR)",
    description: "Lapor dokter spesialis (format SBAR), mulai pemberian MgSO4 dan antihipertensi kerja cepat (target TD < 140/90 mmHg, diastolik >= 80 mmHg).",
    responsible_role: "TIM_PONEK",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-pe-h2",
    code: "PE_HIGH_IV_RESTRICTION_MONITOR",
    pathway: "PE",
    risk_category: "HIGH",
    label: "Pasang Akses IV Restriksi Cairan & Pantau Toksisitas MgSO4",
    description: "Pasang akses IV dengan pembatasan cairan ketat (cegah edema paru) dan pantau toksisitas MgSO4 (refleks patela, RR >= 16x/menit, urin >= 30 mL/jam).",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },
  {
    checklist_id: "chk-pe-h3",
    code: "PE_HIGH_CONTRAINDICATION_ALERT",
    pathway: "PE",
    risk_category: "HIGH",
    label: "Kunci Otomatis HPP Risiko Tinggi: Kontraindikasi Metilergometrin",
    description: "Munculkan alert merah kontraindikasi mutlak Metilergometrin (ergometrin dilarang keras karena memicu lonjakan tensi fatal dan stroke).",
    responsible_role: "DOKTER",
    sort_order: 3,
    active_status: true,
  },

  // ===================== PERDARAHAN PASCAPERSALINAN (HPP) =====================
  // 1. HPP LOW (2 butir)
  {
    checklist_id: "chk-hpp-l1",
    code: "HPP_LOW_ACTIVE_STAGE_3",
    pathway: "HPP",
    risk_category: "LOW",
    label: "Penatalaksanaan Aktif Kala III Rutin (Oksitosin 10 IU IM/IV)",
    description: "Penatalaksanaan aktif kala III rutin pada semua persalinan dengan Oksitosin 10 IU IM/IV (atau Karbetosin stabil panas 100 ug IM/IV jika rantai dingin tidak terjamin) segera setelah bayi lahir.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-l2",
    code: "HPP_LOW_OBJECTIVE_BLOOD_LOSS",
    pathway: "HPP",
    risk_category: "LOW",
    label: "Pengukuran Darah Objektif & Pantau Shock Index",
    description: "Gunakan pengukuran darah objektif (kain kalibrasi/calibrated drape atau penimbangan kasa) dan pantau Shock Index (HR / TDS) pascapersalinan.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },

  // 2. HPP MODERATE (3 butir)
  {
    checklist_id: "chk-hpp-m1",
    code: "HPP_MOD_LARGE_BORE_IV",
    pathway: "HPP",
    risk_category: "MODERATE",
    label: "Pasang Akses IV Berdiameter Besar (16G–18G) & Cek Lab",
    description: "Pasang akses IV berdiameter besar (16G–18G), periksa darah lengkap (Hb/trombosit) dan golongan darah.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-m2",
    code: "HPP_MOD_BEDSIDE_KIT",
    pathway: "HPP",
    risk_category: "MODERATE",
    label: "Siapkan Uterotonika & Asam Traneksamat 1 g IV (Bedside Kit)",
    description: "Siapkan uterotonika dan Asam Traneksamat 1 g IV di samping tempat tidur (bedside kit) sebagai kesiagaan.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-m3",
    code: "HPP_MOD_CALIBRATED_DRAPE",
    pathway: "HPP",
    risk_category: "MODERATE",
    label: "Wajib Ukur Kehilangan Darah Objektif dengan Kain Kalibrasi",
    description: "Wajib ukur kehilangan darah secara objektif dengan kain kalibrasi sejak kala III dan informasikan tim jaga.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 3,
    active_status: true,
  },

  // 3. HPP HIGH (5 butir)
  {
    checklist_id: "chk-hpp-h1",
    code: "HPP_HIGH_SBAR_CONSULT",
    pathway: "HPP",
    risk_category: "HIGH",
    label: "Konsultasi Dini Sp.OG, Anestesi, & Bank Darah (Format SBAR)",
    description: "Konsultasi dini dokter spesialis obstetri, anestesi, dan bank darah (format SBAR).",
    responsible_role: "TIM_PONEK",
    sort_order: 1,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-h2",
    code: "HPP_HIGH_TWO_IV_CROSSMATCH",
    pathway: "HPP",
    risk_category: "HIGH",
    label: "Pasang Dua Jalur Akses IV Besar (16G–18G) & Crossmatch",
    description: "Pasang dua jalur akses IV besar (16G–18G), uji silang (crossmatch), dan siapkan komponen darah.",
    responsible_role: "BIDAN_PERAWAT",
    sort_order: 2,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-h3",
    code: "HPP_HIGH_EMOTIVE_BALLOON",
    pathway: "HPP",
    risk_category: "HIGH",
    label: "Siapkan Paket Tatalaksana E-MOTIVE Lengkap & Tamponade Balon",
    description: "Siapkan Paket Tatalaksana E-MOTIVE lengkap beserta alat tamponade balon uterus di kamar bersalin agar dapat dijalankan serentak dalam < 15 menit jika perdarahan >= 500 mL atau muncul tanda syok.",
    responsible_role: "TIM_PONEK",
    sort_order: 3,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-h4",
    code: "HPP_HIGH_UTEROTONIC_ALERT",
    pathway: "HPP",
    risk_category: "HIGH",
    label: "Waspada Kontraindikasi Uterotonika",
    description: "Periksa riwayat tensi: KONTRAINDIKASI MUTLAK METILERGOMETRIN bila hipertensi/preeklamsia. Siapkan Oksitosin, Misoprostol, atau Karbetosin.",
    responsible_role: "DOKTER",
    sort_order: 4,
    active_status: true,
  },
  {
    checklist_id: "chk-hpp-h5",
    code: "HPP_HIGH_PLANNED_REFERRAL",
    pathway: "HPP",
    risk_category: "HIGH",
    label: "Pertimbangkan Rujukan Terencana ke Fasilitas PONEK Komprehensif",
    description: "Pertimbangkan rujukan terencana ke fasilitas PONEK komprehensif bila sarana atau komponen darah tidak memadai.",
    responsible_role: "TIM_PONEK",
    sort_order: 5,
    active_status: true,
  },
];

export interface MasterCatalog {
  doctors: DoctorMaster[];
  midwives_nurses: MidwifeNurseMaster[];
  referral_facilities: ReferralFacilityMaster[];
  chief_complaints: ChiefComplaintTemplate[];
  comorbidity_templates: ComorbidityTemplate[];
  pe_symptom_masters: PeSymptomMaster[];
  lab_parameter_masters: LabParameterMaster[];
  action_checklist_masters: ActionChecklistMaster[];
  clinical_screening_criteria?: ClinicalScreeningCriterionMaster[];
  address_districts: string[];
  emergency_relations: string[];
}

// Struktur Penyimpanan Lengkap
export interface SigapDatabase {
  system_settings: {
    hospital_name: string;
    facility_level: string;
    default_anonymous_mode: boolean;
    simulation_disclaimer: string;
    last_backup_at: string;
  };
  master_catalog: MasterCatalog;
  roles: RoleDefinition[];
  units: HospitalUnit[];
  users: User[];
  patients: Patient[];
  admissions: Admission[];
  pe_screenings: PeScreening[];
  bp_measurements: BpMeasurement[];
  pe_symptoms: PeSymptomRecord[];
  lab_results: LabResult[];
  risk_factors: RiskFactorMaster[];
  hpp_screenings: HppScreening[];
  screening_risk_details: ScreeningRiskDetail[];
  screening_results: ScreeningResult[];
  monitoring_records: MonitoringRecord[];
  blood_loss_records: BloodLossRecord[];
  clinical_actions: ClinicalAction[];
  alerts: AlertRecord[];
  sbar_reports: SbarReport[];
  clinical_protocols: ClinicalProtocol[];
  audit_logs: AuditLog[];
  concordance_scenarios: ConcordanceScenario[];
  sus_responses: SusResponseRecord[];
}

