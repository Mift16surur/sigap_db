import { SimplePdfDocument } from "./pdf-generator";
import type { SigapDatabase, Admission } from "./types";
import { DEFAULT_CLINICAL_SCREENING_CRITERIA } from "./types";

export function generateClinicalSummaryPdf(db: SigapDatabase, admissionId: string): { pdfBuffer: Buffer; filename: string } {
  const adm = db.admissions.find((a) => a.admission_id === admissionId || a.admission_code === admissionId);
  if (!adm) {
    throw new Error(`Data admisi dengan ID ${admissionId} tidak ditemukan.`);
  }

  const patient = db.patients.find((p) => p.patient_id === adm.patient_id);
  const unit = db.units.find((u) => u.unit_id === adm.unit_id);
  const pe = db.pe_screenings.find((s) => s.admission_id === adm.admission_id);
  const hpp = db.hpp_screenings.find((s) => s.admission_id === adm.admission_id);

  const latestPe = db.screening_results
    .filter((e) => e.admission_id === adm.admission_id && e.screening_type === "PE")
    .sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())[0];

  const latestHpp = db.screening_results
    .filter((e) => e.admission_id === adm.admission_id && e.screening_type === "HPP")
    .sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())[0];

  const latestBp = db.bp_measurements
    .filter((b) => b.admission_id === adm.admission_id)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];

  // Hitung lama rawat (LOS)
  const entryTime = new Date(adm.admission_date || adm.created_at).getTime();
  const dischargeTime = adm.discharge_at ? new Date(adm.discharge_at).getTime() : Date.now();
  const diffHours = Math.max(1, Math.round((dischargeTime - entryTime) / (1000 * 60 * 60)));
  const diffDays = Math.floor(diffHours / 24);
  const losString = diffDays > 0 ? `${diffDays} hari ${diffHours % 24} jam` : `${diffHours} jam`;

  // Faktor risiko teridentifikasi PE (Response === "YA")
  const criteriaList = db.master_catalog?.clinical_screening_criteria || DEFAULT_CLINICAL_SCREENING_CRITERIA;
  const pePositiveFactors = db.screening_risk_details
    .filter((d) => d.admission_id === adm.admission_id && d.pathway === "PE" && d.response === "YA")
    .map((d) => {
      const factor = db.risk_factors.find((rf) => rf.risk_factor_id === d.risk_factor_id || rf.code === d.risk_factor_code);
      const criterion = criteriaList.find((c) => c.criterion_id === d.risk_factor_code || c.criterion_id === d.risk_factor_id || c.label === d.risk_factor_code);
      return {
        code: d.risk_factor_code || criterion?.criterion_id || factor?.code || "FR-PE",
        label: criterion?.label || factor?.label || d.note || d.risk_factor_code || d.risk_factor_id,
        tier: criterion?.risk_tier || (factor?.risk_tier === "HIGH" || factor?.risk_tier === "CRITICAL_IMMEDIATE" || factor?.domain_4t === "PE_HIGH_RISK" ? "HIGH" : "MODERATE"),
        note: d.note,
      };
    });

  // Faktor risiko teridentifikasi HPP (Response === "YA")
  const hppPositiveFactors = db.screening_risk_details
    .filter((d) => d.admission_id === adm.admission_id && d.pathway === "HPP" && d.response === "YA")
    .map((d) => {
      const factor = db.risk_factors.find((rf) => rf.risk_factor_id === d.risk_factor_id || rf.code === d.risk_factor_code);
      const criterion = criteriaList.find((c) => c.criterion_id === d.risk_factor_code || c.criterion_id === d.risk_factor_id || c.label === d.risk_factor_code);
      return {
        code: d.risk_factor_code || criterion?.criterion_id || factor?.code || "FR-HPP",
        label: criterion?.label || factor?.label || d.note || d.risk_factor_code || d.risk_factor_id,
        domain: d.domain || criterion?.domain_id || factor?.domain_4t || "TONUS",
        note: d.note,
      };
    });

  const doc = new SimplePdfDocument();
  const m = doc.margin;
  const w = doc.contentWidth;

  // =========================================================================
  // 1. KOP RESMI SIGAP APP
  // =========================================================================
  doc.drawRect(m, doc.currentY, w, 52, {
    fillColor: [0.97, 0.98, 1.0],
    strokeColor: [0.14, 0.34, 0.84], // Biru SIGAP
    lineWidth: 1.5,
  });

  // Logo Kotak Biru SIGAP (+)
  doc.drawRect(m + 8, doc.currentY + 8, 36, 36, {
    fillColor: [0.14, 0.34, 0.84],
    strokeColor: [0.14, 0.34, 0.84],
  });
  doc.drawText("+", m + 21, doc.currentY + 32, {
    bold: true,
    fontSize: 22,
    color: [1, 1, 1],
  });

  // Teks Header Instansi
  doc.drawText("SIGAP APP - PELAYANAN OBSTETRI", m + 52, doc.currentY + 20, {
    bold: true,
    fontSize: 12,
    color: [0.11, 0.25, 0.65],
  });
  doc.drawText("Instalasi Pelayanan Obstetri Maternal Perinatal - PONEK 24 Jam", m + 52, doc.currentY + 32, {
    fontSize: 8.5,
    color: [0.35, 0.4, 0.45],
  });
  doc.drawText("Sistem Pendukung Keputusan Klinis SIGAP (Protokol v1.2)", m + 52, doc.currentY + 43, {
    fontSize: 7.5,
    italic: true,
    color: [0.5, 0.55, 0.6],
  });

  // Badge Form di Kanan
  doc.drawRect(m + w - 128, doc.currentY + 10, 120, 18, {
    fillColor: [0.9, 0.94, 1.0],
    strokeColor: [0.3, 0.5, 0.9],
    lineWidth: 0.8,
  });
  doc.drawText("FORM RINGKASAN PASIEN", m + w - 124, doc.currentY + 22, {
    bold: true,
    fontSize: 7.5,
    color: [0.11, 0.25, 0.65],
  });
  doc.drawText(`NO. RM: ${patient?.mrn || "-"}`, m + w - 124, doc.currentY + 40, {
    bold: true,
    fontSize: 9,
    color: [0.14, 0.34, 0.84],
  });

  doc.currentY += 60;

  // Title Dokumen
  doc.drawText("RINGKASAN PASIEN (CLINICAL SUMMARY)", m, doc.currentY + 12, {
    bold: true,
    fontSize: 12,
    align: "center",
    width: w,
    color: [0.1, 0.1, 0.15],
  });
  doc.drawLine(m + 140, doc.currentY + 15, m + w - 140, doc.currentY + 15, {
    strokeColor: [0.1, 0.1, 0.15],
    lineWidth: 1,
  });
  doc.drawText("Rekapitulasi Klinis Terpadu Berdasarkan Inputan Pendaftaran dan Skrining Klinis", m, doc.currentY + 26, {
    fontSize: 8,
    align: "center",
    width: w,
    color: [0.45, 0.5, 0.55],
  });

  doc.currentY += 34;

  // =========================================================================
  // SEKSI I: IDENTITAS PASIEN
  // =========================================================================
  doc.drawSectionHeader("I. Identitas Pasien", "1");

  const startY1 = doc.currentY;
  const colW = (w - 20) / 4;

  doc.drawRect(m, startY1, w, 56, {
    fillColor: [0.99, 0.99, 1.0],
    strokeColor: [0.82, 0.87, 0.95],
    lineWidth: 0.8,
  });

  // Baris 1
  doc.drawField("NAMA LENGKAP PASIEN", (patient?.full_name || "-").toUpperCase(), m + 8, startY1 + 10, colW, true);
  doc.drawField("NOMOR REKAM MEDIS (RM)", patient?.mrn || "-", m + 8 + colW, startY1 + 10, colW, true);
  doc.drawField("TANGGAL LAHIR / USIA", `${patient?.tanggal_lahir || "-"} (${patient?.age_years || "-"} Th)`, m + 8 + colW * 2, startY1 + 10, colW);
  doc.drawField("GOLONGAN DARAH", patient?.golongan_darah || "Belum Diisi", m + 8 + colW * 3, startY1 + 10, colW, true);

  // Baris 2
  doc.drawField("NIK", patient?.nik_masked || (patient as any)?.nik || "-", m + 8, startY1 + 34, colW);
  doc.drawField("PENJAMIN / CARA BAYAR", adm.penjamin || "Umum / Pribadi", m + 8 + colW, startY1 + 34, colW);
  doc.drawField("KONTAK DARURAT", patient?.kontak_darurat || "-", m + 8 + colW * 2, startY1 + 34, colW);
  doc.drawField("ALAMAT DOMISILI", patient?.alamat_singkat || "-", m + 8 + colW * 3, startY1 + 34, colW);

  doc.currentY += 64;

  // =========================================================================
  // SEKSI II: RIWAYAT RAWAT & STATUS OBSTETRI
  // =========================================================================
  doc.drawSectionHeader("II. Status Admisi Masuk & Riwayat Obstetri", "2");

  const startY2 = doc.currentY;
  doc.drawRect(m, startY2, w, 98, {
    fillColor: [0.99, 0.99, 1.0],
    strokeColor: [0.82, 0.87, 0.95],
    lineWidth: 0.8,
  });

  // Baris 1: Kode, Tgl Masuk, Tgl Pulang, Lama Rawat
  doc.drawField("KODE ADMISI", adm.admission_code, m + 8, startY2 + 10, colW, true);
  doc.drawField("TANGGAL MASUK", new Date(adm.admission_date || adm.created_at).toLocaleString("id-ID"), m + 8 + colW, startY2 + 10, colW);
  doc.drawField("TANGGAL PULANG / STATUS", adm.discharge_at ? new Date(adm.discharge_at).toLocaleString("id-ID") : "Sedang Rawat", m + 8 + colW * 2, startY2 + 10, colW, true);
  doc.drawField("LAMA RAWAT", losString, m + 8 + colW * 3, startY2 + 10, colW);

  // Baris 2: Ruangan, Paritas, Usia Kehamilan, Riwayat SC
  const paritasStr = `G${adm.obstetric_history.gravida} P${adm.obstetric_history.para} A${adm.obstetric_history.abortus} (Hidup: ${adm.obstetric_history.living_children})`;
  const scStr = adm.obstetric_history.riwayat_sc_jumlah > 0 ? `${adm.obstetric_history.riwayat_sc_jumlah}x Seksio Sesarea` : "Tidak ada riwayat SC";
  doc.drawField("RUANGAN / UNIT", unit?.name || "Kamar Bersalin (VK)", m + 8, startY2 + 34, colW);
  doc.drawField("PARITAS (GPA)", paritasStr, m + 8 + colW, startY2 + 34, colW, true);
  doc.drawField("USIA KEHAMILAN", `${adm.usia_kehamilan_minggu} Mgg ${adm.usia_kehamilan_hari} Hr`, m + 8 + colW * 2, startY2 + 34, colW, true);
  doc.drawField("RIWAYAT SC", scStr, m + 8 + colW * 3, startY2 + 34, colW);

  // Baris 3: Antropometri, IMT, DPJP, Bidan
  const imtVal = adm.obstetric_history.imt_nilai || (adm.obstetric_history as any)?.imt_ibu || "-";
  const tbVal = (adm.obstetric_history as any)?.tb_cm ? `${(adm.obstetric_history as any).tb_cm} cm` : "-";
  const bbVal = (adm.obstetric_history as any)?.bb_saat_ini_kg ? `${(adm.obstetric_history as any).bb_saat_ini_kg} kg` : "-";
  doc.drawField("ANTROPOMETRI", `TB: ${tbVal} • BB: ${bbVal}`, m + 8, startY2 + 58, colW);
  doc.drawField("IMT IBU", `${imtVal} kg/m²`, m + 8 + colW, startY2 + 58, colW, true);
  doc.drawField("DOKTER DPJP", adm.attending_doctor_name || "dr. Spesialis Obstetri", m + 8 + colW * 2, startY2 + 58, colW);
  doc.drawField("BIDAN PENERIMA", adm.receiving_midwife_name || "Bidan Jaga", m + 8 + colW * 3, startY2 + 58, colW);

  // Baris 4: Keluhan Utama Masuk
  doc.drawText("KELUHAN UTAMA SAAT MASUK:", m + 8, startY2 + 81, { fontSize: 7.5, color: [0.45, 0.5, 0.55] });
  doc.drawText(`"${adm.keluhan_utama || "Tidak ada catatan keluhan khusus"}"`, m + 8, startY2 + 91, {
    fontSize: 8.5,
    italic: true,
    color: [0.15, 0.15, 0.2],
  });

  doc.currentY += 106;

  // =========================================================================
  // SEKSI III: HASIL EVALUASI SKRINING PREEKLAMSIA (PE)
  // =========================================================================
  doc.checkPageBreak(120);
  doc.drawSectionHeader("III. Hasil Evaluasi Skrining Preeklamsia (PE)", "3");

  const peRiskCat = latestPe?.category || "LOW";
  const peBoxColor: [number, number, number] = peRiskCat === "HIGH" ? [0.99, 0.92, 0.92] : peRiskCat === "MODERATE" ? [0.99, 0.96, 0.9] : [0.92, 0.98, 0.94];
  const peBorderColor: [number, number, number] = peRiskCat === "HIGH" ? [0.9, 0.3, 0.3] : peRiskCat === "MODERATE" ? [0.9, 0.6, 0.2] : [0.2, 0.7, 0.4];

  const startY3 = doc.currentY;
  doc.drawRect(m, startY3, w, 28, {
    fillColor: peBoxColor,
    strokeColor: peBorderColor,
    lineWidth: 1,
  });

  doc.drawText("TINGKAT RISIKO PREEKLAMSIA (PE):", m + 10, startY3 + 12, { fontSize: 8.5, bold: true, color: [0.2, 0.2, 0.2] });
  doc.drawText(`RISIKO ${peRiskCat}`, m + 190, startY3 + 13, {
    fontSize: 10,
    bold: true,
    color: peRiskCat === "HIGH" ? [0.8, 0.1, 0.1] : peRiskCat === "MODERATE" ? [0.8, 0.5, 0.0] : [0.1, 0.6, 0.2],
  });

  const peTimeStr = latestPe?.calculated_at ? new Date(latestPe.calculated_at).toLocaleString("id-ID") : pe?.screening_time ? new Date(pe.screening_time).toLocaleString("id-ID") : "-";
  doc.drawText(`Waktu Evaluasi: ${peTimeStr}`, m + w - 180, startY3 + 13, { fontSize: 8, color: [0.4, 0.45, 0.5] });

  // Baris Tensi
  if (latestBp) {
    const bpStr = `Tekanan Darah Terakhir: ${latestBp.systolic}/${latestBp.diastolic} mmHg (MAP: ${Math.round(latestBp.mean_arterial_pressure)} mmHg • HR: ${latestBp.heart_rate || "-"} bpm • Posisi: ${latestBp.position})`;
    doc.drawText(bpStr, m + 10, startY3 + 23, { fontSize: 8, bold: true, color: [0.15, 0.3, 0.6] });
  }

  doc.currentY += 34;

  // Daftar Butir Faktor Risiko YA
  doc.drawText(`Faktor Risiko Preeklamsia Teridentifikasi (Pilihan "YA"): ${pePositiveFactors.length} Faktor`, m, doc.currentY + 8, {
    fontSize: 8.5,
    bold: true,
    color: [0.2, 0.25, 0.3],
  });
  doc.currentY += 12;

  if (pePositiveFactors.length === 0) {
    doc.drawRect(m, doc.currentY, w, 18, { fillColor: [0.97, 0.98, 0.99], strokeColor: [0.85, 0.88, 0.92] });
    doc.drawText("Tidak ada faktor risiko PE terkonfirmasi (Semua butir anamnesis & observasi bernilai TIDAK / Normal).", m + 8, doc.currentY + 12, {
      fontSize: 8,
      italic: true,
      color: [0.4, 0.45, 0.5],
    });
    doc.currentY += 22;
  } else {
    for (const f of pePositiveFactors) {
      doc.checkPageBreak(20);
      const isHigh = f.tier === "HIGH";
      doc.drawRect(m, doc.currentY, w, 18, {
        fillColor: isHigh ? [0.99, 0.94, 0.94] : [0.99, 0.97, 0.92],
        strokeColor: isHigh ? [0.95, 0.7, 0.7] : [0.95, 0.8, 0.6],
        lineWidth: 0.6,
      });
      doc.drawText(`[${f.tier}]`, m + 6, doc.currentY + 12, {
        fontSize: 7.5,
        bold: true,
        color: isHigh ? [0.8, 0.1, 0.1] : [0.75, 0.45, 0.0],
      });
      doc.drawText(`${f.code} - ${f.label}`, m + 50, doc.currentY + 12, {
        fontSize: 8,
        bold: true,
        color: [0.15, 0.15, 0.2],
      });
      doc.currentY += 21;
    }
  }

  // Catatan Klinis PE
  const peNotes = pe?.clinical_notes || latestPe?.summary_headline || "Pemantauan tekanan darah dan tanda klinis berkala sesuai SOP.";
  doc.drawText(`Catatan Klinis PE: ${peNotes}`, m, doc.currentY + 8, { fontSize: 8, italic: true, color: [0.35, 0.4, 0.45] });
  doc.currentY += 16;

  // =========================================================================
  // SEKSI IV: HASIL EVALUASI SKRINING PERDARAHAN (HPP 4T)
  // =========================================================================
  doc.checkPageBreak(130);
  doc.drawSectionHeader("IV. Hasil Evaluasi Skrining Perdarahan (HPP 4T)", "4");

  const hppRiskCat = latestHpp?.category || "LOW";
  const hppBoxColor: [number, number, number] = hppRiskCat === "HIGH" ? [0.99, 0.92, 0.92] : hppRiskCat === "MODERATE" ? [0.99, 0.96, 0.9] : [0.92, 0.98, 0.94];
  const hppBorderColor: [number, number, number] = hppRiskCat === "HIGH" ? [0.9, 0.3, 0.3] : hppRiskCat === "MODERATE" ? [0.9, 0.6, 0.2] : [0.2, 0.7, 0.4];

  const startY4 = doc.currentY;
  doc.drawRect(m, startY4, w, 28, {
    fillColor: hppBoxColor,
    strokeColor: hppBorderColor,
    lineWidth: 1,
  });

  doc.drawText("TINGKAT RISIKO PERDARAHAN (HPP):", m + 10, startY4 + 12, { fontSize: 8.5, bold: true, color: [0.2, 0.2, 0.2] });
  doc.drawText(`RISIKO ${hppRiskCat}`, m + 195, startY4 + 13, {
    fontSize: 10,
    bold: true,
    color: hppRiskCat === "HIGH" ? [0.8, 0.1, 0.1] : hppRiskCat === "MODERATE" ? [0.8, 0.5, 0.0] : [0.1, 0.6, 0.2],
  });

  const hppTimeStr = latestHpp?.calculated_at ? new Date(latestHpp.calculated_at).toLocaleString("id-ID") : hpp?.screening_time ? new Date(hpp.screening_time).toLocaleString("id-ID") : "-";
  doc.drawText(`Waktu Evaluasi: ${hppTimeStr}`, m + w - 180, startY4 + 13, { fontSize: 8, color: [0.4, 0.45, 0.5] });

  const hppSummaryParams = `Perdarahan Aktif Masuk: ${hpp?.perdarahan_aktif_saat_admisi || "TIDAK"} • Rencana Persalinan: ${hpp?.rencana_metode_persalinan || "PERVAGINAM"} • Syok: ${hpp?.syok_hemodinamik_instabil || "TIDAK"}`;
  doc.drawText(hppSummaryParams, m + 10, startY4 + 23, { fontSize: 8, bold: true, color: [0.4, 0.2, 0.2] });

  doc.currentY += 34;

  // Daftar Butir Faktor Risiko HPP
  doc.drawText(`Faktor Risiko HPP Teridentifikasi (Pilihan "YA"): ${hppPositiveFactors.length} Faktor`, m, doc.currentY + 8, {
    fontSize: 8.5,
    bold: true,
    color: [0.2, 0.25, 0.3],
  });
  doc.currentY += 12;

  if (hppPositiveFactors.length === 0) {
    doc.drawRect(m, doc.currentY, w, 18, { fillColor: [0.97, 0.98, 0.99], strokeColor: [0.85, 0.88, 0.92] });
    doc.drawText("Tidak ada faktor risiko HPP terkonfirmasi (Semua butir anamnesis & observasi bernilai TIDAK / Normal).", m + 8, doc.currentY + 12, {
      fontSize: 8,
      italic: true,
      color: [0.4, 0.45, 0.5],
    });
    doc.currentY += 22;
  } else {
    for (const f of hppPositiveFactors) {
      doc.checkPageBreak(20);
      doc.drawRect(m, doc.currentY, w, 18, {
        fillColor: [0.99, 0.94, 0.94],
        strokeColor: [0.95, 0.7, 0.7],
        lineWidth: 0.6,
      });
      doc.drawText(`[4T: ${f.domain}]`, m + 6, doc.currentY + 12, {
        fontSize: 7.5,
        bold: true,
        color: [0.8, 0.1, 0.1],
      });
      doc.drawText(`${f.code} - ${f.label}`, m + 65, doc.currentY + 12, {
        fontSize: 8,
        bold: true,
        color: [0.15, 0.15, 0.2],
      });
      doc.currentY += 21;
    }
  }

  // Peringatan Kontraindikasi Uterotonika jika PE Tinggi
  if (peRiskCat === "HIGH") {
    doc.checkPageBreak(26);
    doc.drawRect(m, doc.currentY, w, 24, {
      fillColor: [1.0, 0.9, 0.9],
      strokeColor: [0.85, 0.2, 0.2],
      lineWidth: 1.2,
    });
    doc.drawText("PERINGATAN PROTOKOL UTEROTONIKA: PASIEN RISIKO TINGGI PREEKLAMSIA", m + 8, doc.currentY + 10, {
      bold: true,
      fontSize: 8,
      color: [0.8, 0.1, 0.1],
    });
    doc.drawText("KONTRAINDIKASI MUTLAK METILERGOMETRIN. Gunakan Oksitosin atau Misoprostol sesuai SPO rumah sakit.", m + 8, doc.currentY + 19, {
      bold: true,
      fontSize: 7.5,
      color: [0.6, 0.1, 0.1],
    });
    doc.currentY += 28;
  }

  // Catatan Klinis HPP
  const hppNotes = hpp?.clinical_notes || latestHpp?.summary_headline || "Manajemen aktif kala III dan kesiapsiagaan uterotonika disiapkan.";
  doc.drawText(`Catatan Klinis HPP: ${hppNotes}`, m, doc.currentY + 8, { fontSize: 8, italic: true, color: [0.35, 0.4, 0.45] });
  doc.currentY += 16;

  // =========================================================================
  // SEKSI V: RINGKASAN KEPULANGAN & INSTRUKSI NAKES
  // =========================================================================
  doc.checkPageBreak(120);
  doc.drawSectionHeader("V. Ringkasan Keluar & Instruksi Tindak Lanjut", "5");

  const startY5 = doc.currentY;
  const dischargeSummaryText = adm.discharge_summary || "Ibu dan bayi dalam kondisi stabil, tanda vital dalam rentang aman, involusi rahim dan lokia fisiologis, tidak dijumpai tanda bahaya nifas, dan dinyatakan pulang rawat jalan.";
  
  doc.drawRect(m, startY5, w, 52, {
    fillColor: [0.99, 0.99, 1.0],
    strokeColor: [0.82, 0.87, 0.95],
    lineWidth: 0.8,
  });

  doc.drawText("RESUME MEDIS KEPULANGAN:", m + 8, startY5 + 10, { fontSize: 7.5, bold: true, color: [0.35, 0.4, 0.45] });
  doc.drawWrappedText(dischargeSummaryText, m + 8, startY5 + 20, w - 16, { fontSize: 8.5, color: [0.15, 0.15, 0.2] });

  doc.drawText("Rencana Kontrol: Poli Kebidanan (1 minggu pascapersalinan) / Faskes Perujuk", m + 8, startY5 + 44, {
    fontSize: 8,
    bold: true,
    color: [0.11, 0.25, 0.65],
  });

  doc.currentY += 60;

  // =========================================================================
  // LEMBAR PENGESAHAN DOKTER DPJP & BIDAN (DATA ASLI)
  // =========================================================================
  doc.checkPageBreak(75);
  const signY = doc.currentY + 12;
  const halfW = w / 2;

  // Bidan Penerima
  doc.drawText("Bidan / Perawat Pelaksana,", m + 20, signY, { fontSize: 8.5, color: [0.4, 0.4, 0.4] });
  doc.drawText((adm.receiving_midwife_name || "Bidan Koordinator PONEK").toUpperCase(), m + 20, signY + 48, {
    fontSize: 9,
    bold: true,
    color: [0.1, 0.1, 0.15],
  });
  doc.drawLine(m + 20, signY + 50, m + 200, signY + 50, { strokeColor: [0.3, 0.3, 0.3], lineWidth: 0.8 });
  doc.drawText("SIPB / NIP Terdaftar", m + 20, signY + 59, { fontSize: 7.5, color: [0.5, 0.5, 0.5] });

  // Dokter DPJP
  const datePulangStr = adm.discharge_at ? new Date(adm.discharge_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  doc.drawText(`Banyumas, ${datePulangStr}`, m + halfW + 20, signY - 8, { fontSize: 8, color: [0.4, 0.4, 0.4] });
  doc.drawText("Dokter Penanggung Jawab Pelayanan (DPJP),", m + halfW + 20, signY, { fontSize: 8.5, color: [0.4, 0.4, 0.4] });
  doc.drawText((adm.attending_doctor_name || "dr. Spesialis Obstetri & Ginekologi").toUpperCase(), m + halfW + 20, signY + 48, {
    fontSize: 9,
    bold: true,
    color: [0.1, 0.1, 0.15],
  });
  doc.drawLine(m + halfW + 20, signY + 50, m + halfW + 210, signY + 50, { strokeColor: [0.3, 0.3, 0.3], lineWidth: 0.8 });
  doc.drawText("SIP / DPJP Obstetri", m + halfW + 20, signY + 59, { fontSize: 7.5, color: [0.5, 0.5, 0.5] });

  const pdfBuffer = doc.toBuffer();
  const safeName = (patient?.full_name || "Pasien").replace(/[^a-zA-Z0-9]/g, "_");
  const mrn = patient?.mrn || "NoRM";
  const filename = `Ringkasan_Pasien_${safeName}_${mrn}.pdf`;

  return { pdfBuffer, filename };
}
