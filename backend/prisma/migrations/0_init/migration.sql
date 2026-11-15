-- Initial migration: PostgreSQL Schema DDL untuk SIGAP Hospital Superapps
-- Sesuai Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS)

CREATE TABLE IF NOT EXISTS "hospital_units" (
    "unit_id" VARCHAR(50) PRIMARY KEY,
    "code" VARCHAR(30) NOT NULL UNIQUE,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "active_status" BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "roles" (
    "role_id" VARCHAR(50) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "users" (
    "user_id" VARCHAR(50) PRIMARY KEY,
    "role_id" VARCHAR(50) REFERENCES "roles"("role_id"),
    "unit_id" VARCHAR(50) REFERENCES "hospital_units"("unit_id"),
    "username" VARCHAR(100) NOT NULL UNIQUE,
    "full_name" VARCHAR(150) NOT NULL,
    "title_credentials" VARCHAR(50),
    "password_hash" VARCHAR(255) NOT NULL,
    "active_status" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "patients" (
    "patient_id" VARCHAR(50) PRIMARY KEY,
    "patient_code" VARCHAR(50) NOT NULL UNIQUE,
    "mrn" VARCHAR(50) NOT NULL UNIQUE,
    "full_name" VARCHAR(150) NOT NULL,
    "is_anonymous_mode" BOOLEAN DEFAULT FALSE,
    "tanggal_lahir" DATE,
    "age_years" INTEGER NOT NULL,
    "nik_masked" VARCHAR(50),
    "alamat_singkat VARCHAR(255),
    "kontak_darurat" VARCHAR(255),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "admissions" (
    "admission_id" VARCHAR(50) PRIMARY KEY,
    "patient_id" VARCHAR(50) NOT NULL REFERENCES "patients"("patient_id") ON DELETE CASCADE,
    "admission_code" VARCHAR(50) NOT NULL UNIQUE,
    "admission_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "usia_kehamilan_minggu" INTEGER NOT NULL DEFAULT 0,
    "usia_kehamilan_hari" INTEGER NOT NULL DEFAULT 0,
    "jenis_admisi" VARCHAR(50) NOT NULL,
    "asal_rujukan" VARCHAR(100),
    "unit_id" VARCHAR(50) REFERENCES "hospital_units"("unit_id"),
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "keluhan_utama" TEXT,
    "obstetric_history" JSONB DEFAULT '{}'::jsonb,
    "created_by" VARCHAR(50),
    "attending_doctor_id" VARCHAR(50),
    "attending_doctor_name" VARCHAR(150),
    "receiving_midwife_id" VARCHAR(50),
    "receiving_midwife_name" VARCHAR(150),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pe_screenings" (
    "pe_screening_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "screening_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP WITH TIME ZONE,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "duration_seconds" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    "assessor_id" VARCHAR(50),
    "kejang_eklamsia" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "kesadaran_menurun_gcs_rendah" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "edema_paru_sesak_berat" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "oliguria_produksi_urin_rendah" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "clinical_notes" TEXT,
    "result_category" VARCHAR(30),
    "result_confidence_percent" NUMERIC(5,2),
    "result_summary" TEXT,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bp_measurements" (
    "bp_id" VARCHAR(50) PRIMARY KEY,
    "pe_screening_id" VARCHAR(50) REFERENCES "pe_screenings"("pe_screening_id") ON DELETE CASCADE,
    "admission_id" VARCHAR(50) REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "sequence_number" INTEGER NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "mean_arterial_pressure" NUMERIC(5,2),
    "heart_rate" INTEGER,
    "measured_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "position" VARCHAR(50),
    "cuff_size" VARCHAR(50),
    "is_repeat_verification" BOOLEAN DEFAULT FALSE,
    "assessor_id" VARCHAR(50),
    "note" TEXT
);

CREATE TABLE IF NOT EXISTS "hpp_screenings" (
    "hpp_screening_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "screening_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP WITH TIME ZONE,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "duration_seconds" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    "assessor_id" VARCHAR(50),
    "tonus_atonia_uteri" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "trauma_laserasi_jalan_lahir" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "jaringan_retensio_sisa_plasenta" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "trombin_koagulopati" VARCHAR(30) DEFAULT 'BELUM_DIPERIKSA',
    "clinical_notes" TEXT,
    "result_category" VARCHAR(30),
    "result_confidence_percent" NUMERIC(5,2),
    "result_summary" TEXT,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "blood_loss_entries" (
    "entry_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "measurement_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "method" VARCHAR(50) NOT NULL,
    "dry_weight_grams" NUMERIC(8,2) DEFAULT 0,
    "wet_weight_grams" NUMERIC(8,2) DEFAULT 0,
    "volume_ml" NUMERIC(8,2) NOT NULL,
    "cumulative_total_ml" NUMERIC(8,2) NOT NULL,
    "recorder_id" VARCHAR(50),
    "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "monitoring_records" (
    "record_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "recorded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" VARCHAR(50),
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "oxygen_saturation" NUMERIC(5,2),
    "temperature_c" NUMERIC(4,2),
    "urine_output_ml_per_hour" NUMERIC(6,2),
    "meows_score" INTEGER,
    "fetal_heart_rate" INTEGER,
    "fundal_height_contraction" VARCHAR(100),
    "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "sbar_handovers" (
    "sbar_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(50),
    "situation" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "target_role" VARCHAR(50),
    "target_user_id" VARCHAR(50),
    "read_status" BOOLEAN DEFAULT FALSE,
    "read_at" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "clinical_alerts" (
    "alert_id" VARCHAR(50) PRIMARY KEY,
    "admission_id" VARCHAR(50) NOT NULL REFERENCES "admissions"("admission_id") ON DELETE CASCADE,
    "rule_id" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(30) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "recommendations" JSONB DEFAULT '[]'::jsonb,
    "triggered_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "acknowledged_by" VARCHAR(50),
    "acknowledged_at" TIMESTAMP WITH TIME ZONE,
    "resolved_by" VARCHAR(50),
    "resolved_at" TIMESTAMP WITH TIME ZONE,
    "resolution_notes" TEXT
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "audit_id" VARCHAR(50) PRIMARY KEY,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "user_id" VARCHAR(50) NOT NULL,
    "user_name" VARCHAR(150),
    "user_role" VARCHAR(50),
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "change_summary" TEXT NOT NULL,
    "protocol_version_ref" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "karyawan" (
    "karyawan_id" VARCHAR(50) PRIMARY KEY,
    "nik" VARCHAR(30) NOT NULL UNIQUE,
    "nama_lengkap" VARCHAR(150) NOT NULL,
    "jabatan" VARCHAR(100) NOT NULL,
    "unit_kerja" VARCHAR(100) NOT NULL,
    "status_kerja" VARCHAR(30) DEFAULT 'TETAP',
    "tanggal_masuk" DATE,
    "email" VARCHAR(100),
    "nomor_hp" VARCHAR(30),
    "active_status" BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "bed_master" (
    "bed_id" VARCHAR(50) PRIMARY KEY,
    "unit_id" VARCHAR(50) REFERENCES "hospital_units"("unit_id"),
    "room_number" VARCHAR(30) NOT NULL,
    "bed_code" VARCHAR(30) NOT NULL UNIQUE,
    "class_tier" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) DEFAULT 'VACANT'
);

CREATE TABLE IF NOT EXISTS "internship_records" (
    "internship_id" VARCHAR(50) PRIMARY KEY,
    "nama_magang" VARCHAR(150) NOT NULL,
    "institusi" VARCHAR(150) NOT NULL,
    "periode_mulai" DATE NOT NULL,
    "periode_akhir" DATE NOT NULL,
    "supervisor_id" VARCHAR(50),
    "status" VARCHAR(30) DEFAULT 'ACTIVE'
);

