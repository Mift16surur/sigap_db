-- ==============================================================================
-- SIGAP Clinical Decision Support System (CDSS) - Seed Data SQL
-- Mengisi Data Master & Data Operasional Awal ke PostgreSQL
-- ==============================================================================

-- 1. Insert Data Master Unit Rumah Sakit
INSERT INTO hospital_units (unit_id, code, name, type, active_status) VALUES
('unit-igd-ponek', 'IGD-PONEK', 'IGD Obstetri / Emergensi PONEK 24 Jam', 'IGD_OBSTETRI', true),
('unit-vk', 'VK-BERSALIN', 'Kamar Bersalin (VK / Delivery Room)', 'VK_BERSALIN', true),
('unit-nifas', 'RAWAT-NIFAS', 'Ruang Perawatan Nifas & Postpartum', 'RAWAT_INAP_NIFAS', true),
('unit-hcu', 'HCU-ICU', 'High Care Unit (HCU) Maternal', 'HCU_ICU', true),
('unit-manajemen', 'MANAJEMEN', 'Komite Mutu & Tata Kelola RS', 'MANAJEMEN', true)
ON CONFLICT (unit_id) DO NOTHING;

-- 2. Insert Data Master Roles (RBAC)
INSERT INTO roles (role_id, name, description, permissions) VALUES
('BIDAN_PERAWAT', 'Bidan / Perawat Obstetri', 'Pendaftaran pasien, skrining PE & HPP, monitoring tanda vital, estimasi perdarahan, checklist kesiapan, dan pembuatan SBAR.', '["PATIENT_WRITE","ADMISSION_WRITE","SCREENING_WRITE","MONITORING_WRITE","ACTION_WRITE","ALERT_ACKNOWLEDGE","SBAR_WRITE","REPORT_READ"]'::jsonb),
('DOKTER', 'Dokter Sp.OG / Dokter Jaga', 'Review skrining, respons alert CDSS, instruksi tata laksana klinis, eskalasi rujukan, dan verifikasi tindakan.', '["PATIENT_READ","ADMISSION_WRITE","SCREENING_READ","SCREENING_REVIEW","MONITORING_WRITE","ACTION_WRITE","ALERT_ACKNOWLEDGE","ALERT_RESOLVE","SBAR_RESPOND","REPORT_READ"]'::jsonb),
('VALIDATOR_KLINIS', 'Validator Klinis (Sp.OG Konsultan / Bidan Senior)', 'Otoritas penetapan variabel klinis, validasi ambang batas CDSS, dan pengesahan versi protokol.', '["PROTOCOL_WRITE","PROTOCOL_APPROVE","RISK_FACTOR_WRITE","REPORT_READ","VALIDATION_WORKBENCH"]'::jsonb),
('ADMIN_RS', 'Admin RS / Manajemen Mutu', 'Pengelolaan akun pengguna, unit kerja faskes, audit trail, serta pelaporan evaluasi pelayanan.', '["USER_MANAGE","UNIT_MANAGE","SETTINGS_MANAGE","REPORT_READ","AUDIT_READ"]'::jsonb),
('ADMIN_TI', 'Admin Teknologi Informasi (TI)', 'Pengelolaan infrastruktur teknis, backup database, integrasi sistem, dan log keamanan server.', '["USER_MANAGE","SYSTEM_BACKUP","AUDIT_READ"]'::jsonb)
ON CONFLICT (role_id) DO NOTHING;

-- 3. Insert Data Pengguna Awal (Users)
INSERT INTO users (user_id, role_id, unit_id, username, full_name, title_credentials, password_hash, active_status) VALUES
('usr-bidan-01', 'BIDAN_PERAWAT', 'unit-vk', 'bidan.ratna', 'Bd. Ratna Kusuma, S.Tr.Keb', 'Bidan Koordinator VK', 'demo_hash_nfr02', true),
('usr-dr-01', 'DOKTER', 'unit-vk', 'dr.hendra', 'dr. Hendra Pratama, Sp.OG', 'Dokter Spesialis Obgyn DPJP', 'demo_hash_nfr02', true),
('usr-val-01', 'VALIDATOR_KLINIS', 'unit-manajemen', 'dr.maya.konsultan', 'dr. Maya Indriati, Sp.OG, Subsp. KFM', 'Sp.OG Konsultan Fetomaternal', 'demo_hash_nfr02', true),
('usr-admin-01', 'ADMIN_RS', 'unit-manajemen', 'admin.mutu', 'Siti Rahma, S.Kep., MARS', 'Manajer Mutu & Pelayanan Medis', 'demo_hash_nfr02', true),
('usr-ti-01', 'ADMIN_TI', 'unit-manajemen', 'admin.it', 'Arif Budiman, S.Kom', 'Administrator Sistem TI RS', 'demo_hash_nfr02', true)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Insert Data Master Dokter DPJP / Jaga
INSERT INTO master_doctors (doctor_id, nip_sip, full_name, specialty, unit_id, phone, is_on_call_dpjp, active_status) VALUES
('doc-01', 'SIP.446/SpOG-01/2024', 'dr. Hendra Pratama, Sp.OG', 'SP_OG', 'unit-vk', '0812-3456-7890', true, true),
('doc-02', 'SIP.446/SpOG-KFM-02/2023', 'dr. Maya Indriati, Sp.OG, Subsp. KFM', 'SP_OG_KFM', 'unit-vk', '0811-9876-5432', true, true),
('doc-03', 'SIP.446/DokterJaga-03/2025', 'dr. Aulia Rahman (Dokter Jaga PONEK)', 'DOKTER_UMUM_JAGA', 'unit-igd-ponek', '0813-1122-3344', true, true)
ON CONFLICT (doctor_id) DO NOTHING;

-- 5. Insert Data Master Bidan & Perawat
INSERT INTO master_midwives_nurses (staff_id, nip_str, full_name, profession, credential_level, unit_id, shift, active_status) VALUES
('stf-01', 'STR.BD-3273-00918', 'Bd. Ratna Kusuma, S.Tr.Keb', 'BIDAN', 'Bidan Ahli Pertama (PK III)', 'unit-vk', 'PAGI', true),
('stf-02', 'STR.BD-3273-00845', 'Bd. Siti Nurhaliza, A.Md.Keb', 'BIDAN', 'Bidan Pelaksana (PK II)', 'unit-vk', 'SIANG', true),
('stf-03', 'STR.PR-3273-00123', 'Ns. Dewi Sartika, S.Kep', 'PERAWAT', 'Perawat Klinis Maternitas (PK II)', 'unit-igd-ponek', 'MALAM', true)
ON CONFLICT (staff_id) DO NOTHING;

-- 6. Insert Data Master Fasilitas Perujuk
INSERT INTO master_referral_facilities (referral_id, code, facility_name, facility_type, district_city, contact_phone, active_status) VALUES
('ref-01', 'PKM-KC', 'Puskesmas PONED Kiaracondong', 'PUSKESMAS_PONED', 'Kota Bandung', '022-7201234', true),
('ref-02', 'PKM-IA', 'Puskesmas PONED Ibrahim Adjie', 'PUSKESMAS_PONED', 'Kota Bandung', '022-7305678', true),
('ref-03', 'KLN-BD', 'Klinik Pratama Bunda Sehat', 'KLINIK_PRATAMA', 'Kota Bandung', '0813-2211-9988', true),
('ref-04', 'RSUD-UB', 'RSUD Ujungberung (Tipe C)', 'RS_TIPE_C', 'Kota Bandung', '022-7800011', true),
('ref-05', 'NON-RUJUKAN', 'Datang Sendiri / Rujukan Mandiri', 'MANDIRI', 'Kota Bandung', '-', true)
ON CONFLICT (referral_id) DO NOTHING;

-- 7. Insert Data Master Template Keluhan Utama
INSERT INTO master_chief_complaints (complaint_id, code, category, label, default_text, active_status) VALUES
('cc-01', 'CC-INPARTU', 'INPARTU', 'Mules Teratur / Tanda Inpartu (His)', 'Pasien mengeluhkan perut kenceng-kenceng teratur sejak beberapa jam lalu disertai lendir bercampur darah.', true),
('cc-02', 'CC-KPD', 'KETUBAN', 'Keluar Air Ketuban dari Jalan Lahir', 'Pasien mengeluhkan keluar cairan bening/keruh mengalir dari jalan lahir mendadak tanpa disertai mules.', true),
('cc-03', 'CC-PE-SYM', 'PREEKLAMSIA', 'Rujukan Tensi Tinggi Disertai Pusing / Mata Kabur', 'Rujukan dengan tensi >= 140/90 mmHg, mengeluhkan pusing kepala hebat atau pandangan mata berkunang-kunang.', true),
('cc-04', 'CC-HPP-BLEED', 'POSTPARTUM', 'Perdarahan Banyak Pascapersalinan', 'Perdarahan aktif mengalir banyak dari jalan lahir setelah melahirkan di faskes perujuk.', true)
ON CONFLICT (complaint_id) DO NOTHING;

-- 8. Insert Data Master Template Komorbiditas
INSERT INTO master_comorbidities (comorbid_id, code, label, default_note, active_status) VALUES
('cm-01', 'CM-HT', 'Riwayat Hipertensi Kronis', 'Pasien memiliki riwayat tekanan darah tinggi sebelum kehamilan atau sebelum usia gestasi 20 minggu.', true),
('cm-02', 'CM-DM', 'Riwayat Diabetes Melitus / Gestasional', 'Riwayat hiperglikemia sebelum atau selama kehamilan dengan diet atau terapi insulin.', true),
('cm-03', 'CM-SC1', 'Riwayat Seksio Sesarea (SC) 1 Kali', 'Pernah operasi sesar 1 kali sebelumnya, jarak kehamilan terkontrol.', true),
('cm-04', 'CM-ANEMIA', 'Riwayat Anemia Defisiensi Besi', 'Kadar hemoglobin antenatal trimester 3 tercatat < 10.5 g/dL.', true)
ON CONFLICT (comorbid_id) DO NOTHING;

-- 9. Insert Data Master Faktor Risiko Klinis (PE & 4T)
INSERT INTO master_risk_factors (risk_factor_id, code, screening_pathway, domain_4t, risk_tier, default_weight, label, definition, clinical_rationale, active_status) VALUES
('rf-pe-01', 'RF_PE_HISTORY', 'PE', 'PE_HIGH_RISK', 'HIGH', 3, 'Riwayat Preeklamsia pada Kehamilan Sebelumnya', 'Pernah mengalami preeklamsia/eklamsia pada kehamilan terdahulu.', 'Faktor risiko mayor independen terkuat peningkatan risiko rekurensi PE.', true),
('rf-pe-02', 'RF_PE_MULTIPLE', 'PE', 'PE_MODERATE_RISK', 'MODERATE', 2, 'Kehamilan Ganda (Gemelli/Triplets)', 'Kehamilan dengan janin kembar dua atau lebih.', 'Massa plasenta lebih besar meningkatkan pelepasan faktor anti-angiogenik.', true),
('rf-pe-03', 'RF_PE_CHRONIC_HT', 'PE', 'PE_HIGH_RISK', 'HIGH', 3, 'Hipertensi Kronis Pramenopause', 'Riwayat hipertensi esensial sebelum usia kehamilan 20 minggu.', 'Disfungsi endotelial kronik memperberat iskemia plasenta.', true),
('rf-pe-04', 'RF_PE_NULLIPARITY', 'PE', 'PE_MODERATE_RISK', 'MODERATE', 1, 'Primigravida (Kehamilan Pertama)', 'Pertama kali hamil atau interval kehamilan > 10 tahun.', 'Kurangnya adaptasi imunologis maternal terhadap antigen paternal janin.', true),
('rf-hpp-01', 'RF_HPP_ATONIA_OVERDIST', 'HPP', 'TONUS', 'HIGH', 3, 'Overdistensi Uterus (Polihidramnion, Makrosomia, Gemelli)', 'Regangan otot rahim berlebihan yang mengganggu kontraktilitas pascapersalinan.', 'Penyebab 70-80% kasus atonia uteri perdarahan postpartum.', true),
('rf-hpp-02', 'RF_HPP_PROLONGED_LABOR', 'HPP', 'TONUS', 'MODERATE', 2, 'Partus Lama / Persalinan Kasep / Induksi Oksitosin Lama', 'Fase aktif atau kala 2 memanjang yang menyebabkan kelelahan miometrium.', 'Reseptor oksitosin desensitisasi dan miometrium mengalami kelelahan metabolik.', true),
('rf-hpp-03', 'RF_HPP_SC_PREVIOUS', 'HPP', 'TRAUMA', 'HIGH', 3, 'Riwayat Bekas Seksio Sesarea / Operasi Uterus', 'Adanya jaringan parut pada dinding rahim.', 'Peningkatan risiko plasenta akreta spectrum dan dehisensi jaringan parut.', true),
('rf-hpp-04', 'RF_HPP_RETAINED_PLACENTA', 'HPP', 'JARINGAN', 'HIGH', 3, 'Retensio Plasenta / Sisa Selaput Ketuban', 'Plasenta belum lahir > 30 menit pascapersalinan atau kotiledon tidak lengkap.', 'Mencegah oklusi mekanis pembuluh darah dasar plasenta.', true),
('rf-hpp-05', 'RF_HPP_COAGULOPATHY', 'HPP', 'TROMBIN', 'HIGH', 3, 'Trombositopenia / Gangguan Koagulasi Darah', 'Trombosit < 100.000/uL atau konsumsi faktor pembekuan darah.', 'Kegagalan pembentukan bekuan fibrin hemostatik primer dan sekunder.', true)
ON CONFLICT (risk_factor_id) DO NOTHING;

-- 10. Insert Data Versi Protokol Klinis Aktif
INSERT INTO clinical_protocols (protocol_id, version, status, title, legal_basis, cutoff_parameters, scoring_rules, approved_by, effective_date) VALUES
('prot-v1.2-2026', 'v1.2-2026.11', 'ACTIVE', 'Protokol Skrining Terpadu Preeklamsia & HPP (4T) SIGAP', 'PNPK POGI 2024 & WHO Recommendations on Maternal Emergency Care', 
'{"pe_high_criteria": {"high_risk_factors_count": 1, "moderate_risk_factors_count": 2, "bp_systolic_high": 160, "bp_diastolic_high": 110}, "hpp_high_criteria": {"blood_loss_trigger_ml": 500, "high_risk_tier_count": 1}}'::jsonb,
'{"scoring_engine": "SIGAP-DECISION-TABLE-2026", "concordance_standard": "GOLD_STANDARD_POGI"}'::jsonb,
'dr. Maya Indriati, Sp.OG, Subsp. KFM', '2026-11-01')
ON CONFLICT (protocol_id) DO NOTHING;

