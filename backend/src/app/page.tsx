import React from "react";
import { getDb } from "@/lib/store";

export default function BackendStatusPage() {
  const db = getDb();
  const protocols = Array.isArray(db?.clinical_protocols) ? db.clinical_protocols : [];
  const activeProtocol =
    protocols.find((p) => p.status === "ACTIVE") ||
    protocols[0] || { version: "v2.0-RISE" };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 24,
          background: "#1e293b",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#059669",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          SIGAP BACKEND API ONLINE • VERCEL READY
        </div>
        <h1 style={{ marginTop: 12, marginBottom: 8 }}>
          SIGAP — Layanan Backend & Mesin Aturan Klinis Berversi
        </h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
          Layanan REST API terpisah (Decoupled Backend) yang menangani 18 entitas
          ERD, validasi Role-Based Access Control (5 Aktor), serta Mesin Aturan
          Tabel Keputusan Preeklamsia (PE) dan Hemoragia Postpartum (HPP 4T).
        </p>

        <div style={{ marginTop: 16 }}>
          <a
            href="/docs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#2563eb",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <span>📖 Buka Dokumentasi Interaktif Swagger UI (/docs)</span>
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          <div style={{ background: "#0f172a", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Protokol Klinis Aktif
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {activeProtocol.version}
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Episode Admisi Aktif
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {db?.admissions?.length || 0} Episode
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Faktor Risiko Terdaftar
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {db?.risk_factors?.length || 0} Variabel (PE & 4T)
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Rekaman Audit Log
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {db?.audit_logs?.length || 0} Entri
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Daftar Endpoint REST API (/api/v1/*)</h3>
        <ul style={{ lineHeight: 1.9, color: "#cbd5e1" }}>
          <li>
            <code>GET / POST /api/v1/bootstrap</code> — Mengambil seluruh
            state 18 entitas, metrik evaluasi Bab 14 (Cohen&apos;s Kappa, SUS,
            Waktu Pengisian), atau me-reset simulasi.
          </li>
          <li>
            <code>POST /api/v1/admissions</code> — Registrasi pasien (Mode
            Identitas / Anonim) & pembuatan Episode Admisi beserta riwayat
            obstetri (FR-03, FR-04, FR-05).
          </li>
          <li>
            <code>POST /api/v1/screening/pe</code> — Input pengukuran TD
            berulang append-only (FR-07), pemicu alert prioritas seketika
            (FR-12), & evaluasi mesin aturan PE (FR-06, FR-09, FR-10, FR-11).
          </li>
          <li>
            <code>POST /api/v1/screening/hpp</code> — Evaluasi domain 4T
            (Tonus, Trauma, Jaringan, Trombin) + Faktor Tambahan & Lab (FR-08,
            FR-09, FR-10, FR-11).
          </li>
          <li>
            <code>POST /api/v1/monitoring</code> — Monitoring tanda vital
            (FR-14), kalkulasi kehilangan darah objektif kumulatif & cegah
            duplikasi (FR-15), checklist kesiapan (FR-13), acknowledgment alert,
            dan eskalasi SBAR terverifikasi (FR-16).
          </li>
          <li>
            <code>POST /api/v1/protocols</code> — Pengesahan versi protokol
            klinis (eksklusif Validator Klinis - Bab 3 & FR-21), pengaturan
            mode anonim, dan kuesioner SUS.
          </li>
        </ul>
      </div>
    </main>
  );
}

