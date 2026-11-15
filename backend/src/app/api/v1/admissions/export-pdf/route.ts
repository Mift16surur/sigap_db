import { NextRequest, NextResponse } from "next/server";
import { getDb, resolveRequestUser } from "@/lib/store";
import { generateClinicalSummaryPdf } from "@/lib/clinical-summary-pdf";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const admissionId = searchParams.get("admission_id") || searchParams.get("id");

    if (!admissionId) {
      return NextResponse.json(
        { ok: false, error: "Parameter 'admission_id' wajib disertakan." },
        { status: 400 }
      );
    }

    const { pdfBuffer, filename } = generateClinicalSummaryPdf(db, admissionId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/admissions/export-pdf error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal menghasilkan dokumen PDF." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json().catch(() => ({}));
    const admissionId = body.admission_id || body.id;

    if (!admissionId) {
      return NextResponse.json(
        { ok: false, error: "Field 'admission_id' wajib disertakan pada request body." },
        { status: 400 }
      );
    }

    const { pdfBuffer, filename } = generateClinicalSummaryPdf(db, admissionId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("POST /api/v1/admissions/export-pdf error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal menghasilkan dokumen PDF." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
