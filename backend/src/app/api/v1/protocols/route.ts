import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getDb,
  resolveRequestUser,
  saveDb,
  verifyRolePermission,
} from "@/lib/store";
import { ClinicalProtocol } from "@/lib/types";

export async function POST(req: Request) {
  const db = getDb();
  const { userId, user } = resolveRequestUser(req, db);
  const body = await req.json();
  const { action } = body;
  const now = new Date().toISOString();

  // 1. Buat & Sahkan Versi Protokol Klinis Baru (HANYA VALIDATOR KLINIS - SRS Bab 3 & FR-21)
  if (action === "PUBLISH_NEW_PROTOCOL_VERSION") {
    const perm = verifyRolePermission(db, userId, "PROTOCOL_APPROVE");
    if (!perm.allowed) {
      return NextResponse.json(
        { ok: false, error: perm.reason },
        { status: 403 }
      );
    }

    const currentActive =
      db.clinical_protocols.find((p) => p.status === "ACTIVE") ||
      db.clinical_protocols[0];

    // Arsipkan protokol lama
    for (const p of db.clinical_protocols) {
      if (p.status === "ACTIVE") p.status = "ARCHIVED";
    }

    const newProtocol: ClinicalProtocol = {
      protocol_version_id: `proto-${Date.now()}`,
      version: body.version || `v1.3-${now.slice(0, 10)}`,
      title:
        body.title ||
        "Protokol Skrining Admisi PE & HPP 4T Tervalidasi Komite Medik",
      source_guidelines:
        body.source_guidelines || currentActive.source_guidelines,
      effective_date: now.slice(0, 10),
      approved_by_user_id: user.user_id,
      approved_by_name: user.full_name,
      status: "ACTIVE",
      pe_config: {
        ...currentActive.pe_config,
        ...(body.pe_config || {}),
      },
      hpp_config: {
        ...currentActive.hpp_config,
        ...(body.hpp_config || {}),
      },
      readiness_checklists: {
        ...currentActive.readiness_checklists,
        ...(body.readiness_checklists || {}),
      },
      change_notes:
        body.change_notes ||
        "Pembaruan parameter ambang klinis dan tabel keputusan oleh Validator Klinis.",
      created_at: now,
    };

    db.clinical_protocols.unshift(newProtocol);

    appendAuditLog(db, {
      userId,
      entity: "clinical_protocols",
      entityId: newProtocol.protocol_version_id,
      action: "APPROVE_PROTOCOL",
      changeSummary: `Validator Klinis (${user.full_name}) mengesahkan versi algoritma baru ${newProtocol.version}: ${newProtocol.change_notes}`,
      protocolVersionRef: newProtocol.version,
    });

    saveDb(db);
    return NextResponse.json({
      ok: true,
      protocol: newProtocol,
    });
  }

  // 2. Pengaturan Privasi / Mode Anonim Prototipe (Admin RS - Keputusan Terbuka #1 Bab 16)
  if (action === "TOGGLE_ANONYMOUS_MODE") {
    const perm = verifyRolePermission(db, userId, "SETTINGS_MANAGE");
    if (!perm.allowed) {
      return NextResponse.json(
        { ok: false, error: perm.reason },
        { status: 403 }
      );
    }

    db.system_settings.default_anonymous_mode = Boolean(
      body.default_anonymous_mode
    );

    appendAuditLog(db, {
      userId,
      entity: "system_settings",
      entityId: "PRIVACY-MODE",
      action: "UPDATE",
      changeSummary: `Mengubah kebijakan tampilan identitas pasien prototipe menjadi: ${
        db.system_settings.default_anonymous_mode
          ? "MODE KODE ANONIM PENELITIAN (NFR-03)"
          : "MODE IDENTITAS TERBATAS REKAM MEDIS"
      }.`,
    });

    saveDb(db);
    return NextResponse.json({
      ok: true,
      system_settings: db.system_settings,
    });
  }

  // 3. Tambah Respons Kuesioner SUS (Bab 14 Usability Testing)
  if (action === "SUBMIT_SUS_SCORE") {
    const scores: number[] = Array.isArray(body.q_scores)
      ? body.q_scores.map(Number)
      : [5, 2, 5, 1, 5, 2, 4, 1, 5, 2];
    // Rumus Standar System Usability Scale (Brooke, 1996)
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const val = scores[i] || 3;
      if (i % 2 === 0) {
        sum += val - 1; // Item ganjil (1,3,5,7,9)
      } else {
        sum += 5 - val; // Item genap (2,4,6,8,10)
      }
    }
    const susScore = Number((sum * 2.5).toFixed(1));

    const entry = {
      sus_id: `sus-${Date.now()}`,
      respondent_code:
        body.respondent_code || `RESP-${db.sus_responses.length + 1}`,
      respondent_role: body.respondent_role || ("BIDAN" as const),
      unit_name: body.unit_name || "Kamar Bersalin (VK)",
      q_scores: scores,
      calculated_sus_score: susScore,
      submitted_at: now,
    };
    db.sus_responses.unshift(entry);
    saveDb(db);
    return NextResponse.json({ ok: true, sus_entry: entry });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid action" },
    { status: 400 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

