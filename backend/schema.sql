-- ==============================================================================
-- SIGAP Clinical Decision Support System (CDSS) - PostgreSQL Schema DDL
-- Sesuai Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS)
-- ==============================================================================

-- 1. Tabel Unit Fasilitas Kesehatan / RS
CREATE TABLE IF NOT EXISTS hospital_units (
    unit_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    active_status BOOLEAN DEFAULT TRUE
);

-- 2. Tabel Role Pengguna (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb
);

-- 3. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    role_id VARCHAR(50) REFERENCES roles(role_id),
    unit_id VARCHAR(50) REFERENCES hospital_units(unit_id),
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    title_credentials VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Master Pasien (Master Patient Index)
CREATE TABLE IF NOT EXISTS patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    mrn VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    is_anonymous_mode BOOLEAN DEFAULT FALSE,
    tanggal_lahir DATE,
    age_years INTEGER NOT NULL,
    nik_masked VARCHAR(50),
    alamat_singkat VARCHAR(255),
    kontak_darurat VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Episode Admisi Obstetri
CREATE TABLE IF NOT EXISTS admissions (
    admission_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    admission_code VARCHAR(50) NOT NULL UNIQUE,
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usia_kehamilan_minggu INTEGER NOT NULL DEFAULT 0,
    usia_kehamilan_hari INTEGER NOT NULL DEFAULT 0,
    jenis_admisi VARCHAR(50) NOT NULL,
    asal_rujukan VARCHAR(100),
    unit_id VARCHAR(50) REFERENCES hospital_units(unit_id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    keluhan_utama TEXT,
    obstetric_history JSONB DEFAULT '{}'::jsonb,
    created_by VARCHAR(50),
    attending_doctor_id VARCHAR(50),
    attending_doctor_name VARCHAR(150),
    receiving_midwife_id VARCHAR(50),
    receiving_midwife_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Skrining Preeklamsia (PE)
CREATE TABLE IF NOT EXISTS pe_screenings (
    pe_screening_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    screening_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    assessor_id VARCHAR(50),
    kejang_eklamsia VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    kesadaran_menurun_gcs_rendah VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    edema_paru_sesak_berat VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    oliguria_produksi_urin_rendah VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    clinical_notes TEXT,
    result_category VARCHAR(30),
    result_confidence_percent NUMERIC(5,2),
    result_summary TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Pengukuran Tekanan Darah Terpisah
CREATE TABLE IF NOT EXISTS bp_measurements (
    bp_id VARCHAR(50) PRIMARY KEY,
    pe_screening_id VARCHAR(50) REFERENCES pe_screenings(pe_screening_id) ON DELETE CASCADE,
    admission_id VARCHAR(50) REFERENCES admissions(admission_id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    mean_arterial_pressure NUMERIC(5,2),
    heart_rate INTEGER,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    position VARCHAR(50),
    cuff_size VARCHAR(50),
    is_repeat_verification BOOLEAN DEFAULT FALSE,
    assessor_id VARCHAR(50),
    note TEXT
);

-- 8. Tabel Skrining Perdarahan Pascapersalinan (HPP / 4T)
CREATE TABLE IF NOT EXISTS hpp_screenings (
    hpp_screening_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    screening_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    assessor_id VARCHAR(50),
    tonus_atonia_uteri VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    trauma_laserasi_jalan_lahir VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    jaringan_retensio_sisa_plasenta VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    trombin_koagulopati VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    clinical_notes TEXT,
    result_category VARCHAR(30),
    result_confidence_percent NUMERIC(5,2),
    result_summary TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Log Perdarahan Kuantitatif (Gravimetrik / Kolorimetrik)
CREATE TABLE IF NOT EXISTS blood_loss_entries (
    entry_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    measurement_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50) NOT NULL,
    dry_weight_grams NUMERIC(8,2) DEFAULT 0,
    wet_weight_grams NUMERIC(8,2) DEFAULT 0,
    volume_ml NUMERIC(8,2) NOT NULL,
    cumulative_total_ml NUMERIC(8,2) NOT NULL,
    recorder_id VARCHAR(50),
    notes TEXT
);

-- 10. Tabel Monitoring Klinis & Tanda Vital
CREATE TABLE IF NOT EXISTS monitoring_records (
    record_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by VARCHAR(50),
    systolic INTEGER,
    diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation NUMERIC(5,2),
    temperature_c NUMERIC(4,2),
    urine_output_ml_per_hour NUMERIC(6,2),
    meows_score INTEGER,
    fetal_heart_rate INTEGER,
    fundal_height_contraction VARCHAR(100),
    notes TEXT
);

-- 11. Tabel Handoff Komunikasi SBAR
CREATE TABLE IF NOT EXISTS sbar_handovers (
    sbar_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    situation TEXT NOT NULL,
    background TEXT NOT NULL,
    assessment TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    target_role VARCHAR(50),
    target_user_id VARCHAR(50),
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- 12. Tabel Peringatan Klinis (CDSS Alerts)
CREATE TABLE IF NOT EXISTS clinical_alerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    admission_id VARCHAR(50) NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    rule_id VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    recommendations JSONB DEFAULT '[]'::jsonb,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    acknowledged_by VARCHAR(50),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- 13. Tabel Audit Log Hukum & Keamanan (NFR-04)
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(30) NOT NULL,
    change_summary TEXT NOT NULL,
    protocol_version_ref VARCHAR(50)
);

-- ==============================================================================
-- TABEL MASTER TAMBAHAN (Manajemen Data Faskes, Tenaga Medis, & Katalog Klinis)
-- ==============================================================================

-- 14. Master Dokter DPJP & Dokter Jaga Obstetri
CREATE TABLE IF NOT EXISTS master_doctors (
    doctor_id VARCHAR(50) PRIMARY KEY,
    nip_sip VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    specialty VARCHAR(50) NOT NULL DEFAULT 'SP_OG',
    unit_id VARCHAR(50) REFERENCES hospital_units(unit_id),
    phone VARCHAR(50),
    is_on_call_dpjp BOOLEAN DEFAULT TRUE,
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Master Bidan & Perawat Obstetri
CREATE TABLE IF NOT EXISTS master_midwives_nurses (
    staff_id VARCHAR(50) PRIMARY KEY,
    nip_str VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    profession VARCHAR(50) NOT NULL DEFAULT 'BIDAN',
    credential_level VARCHAR(100),
    unit_id VARCHAR(50) REFERENCES hospital_units(unit_id),
    shift VARCHAR(30) DEFAULT 'PAGI',
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Master Fasilitas Pelayanan Perujuk (Puskesmas PONED, Klinik, RS Tipe C/D)
CREATE TABLE IF NOT EXISTS master_referral_facilities (
    referral_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    facility_name VARCHAR(150) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    district_city VARCHAR(100),
    contact_phone VARCHAR(50),
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Master Template Keluhan Utama Admisi
CREATE TABLE IF NOT EXISTS master_chief_complaints (
    complaint_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    default_text TEXT,
    active_status BOOLEAN DEFAULT TRUE
);

-- 18. Master Template Komorbiditas & Riwayat Obstetri
CREATE TABLE IF NOT EXISTS master_comorbidities (
    comorbid_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(150) NOT NULL,
    default_note TEXT,
    active_status BOOLEAN DEFAULT TRUE
);

-- 19. Master Faktor Risiko CDSS (Preeklamsia & 4T HPP)
CREATE TABLE IF NOT EXISTS master_risk_factors (
    risk_factor_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    screening_pathway VARCHAR(30) NOT NULL, -- 'PE' atau 'HPP'
    domain_4t VARCHAR(30),                  -- 'TONUS', 'TRAUMA', 'JARINGAN', 'TROMBIN', 'PE_HIGH_RISK', dll
    risk_tier VARCHAR(30) NOT NULL,         -- 'HIGH', 'MODERATE', 'LOW'
    default_weight INTEGER DEFAULT 1,
    label VARCHAR(150) NOT NULL,
    definition TEXT,
    clinical_rationale TEXT,
    active_status BOOLEAN DEFAULT TRUE
);

-- 20. Master Versi Protokol Klinis & Ambang Batas Cut-Off
CREATE TABLE IF NOT EXISTS clinical_protocols (
    protocol_id VARCHAR(50) PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    title VARCHAR(200) NOT NULL,
    legal_basis TEXT,
    cutoff_parameters JSONB DEFAULT '{}'::jsonb,
    scoring_rules JSONB DEFAULT '{}'::jsonb,
    approved_by VARCHAR(150),
    effective_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Kunci untuk Performa Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_bp_admission_id ON bp_measurements(admission_id);
CREATE INDEX IF NOT EXISTS idx_alerts_admission_id ON clinical_alerts(admission_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_doctors_nip ON master_doctors(nip_sip);
CREATE INDEX IF NOT EXISTS idx_midwives_nip ON master_midwives_nurses(nip_str);
CREATE INDEX IF NOT EXISTS idx_rf_pathway ON master_risk_factors(screening_pathway);

