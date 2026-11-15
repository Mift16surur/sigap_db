/**
 * SIGAP Frontend — Typed REST API Client Service
 * Berkomunikasi dengan Decoupled Backend API (default: http://localhost:4000/api/v1)
 * dan memiliki fallback otomatis apabila dijalankan dalam mode demo statis/offline.
 */

import type {
  Admission,
  ClinicalProtocol,
  HppScreening,
  Patient,
  PeScreening,
  ScreeningResult,
  SigapDatabase,
} from "@/lib/types";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, "");
    return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
  }
  return typeof window !== "undefined" ? "/api/v1" : "http://localhost:4000/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();

export interface EnrichedAdmission extends Admission {
  patient?: Patient;
  unit?: {
    unit_id: string;
    code: string;
    name: string;
    type: string;
  };
  pe_screening?: PeScreening;
  hpp_screening?: HppScreening;
  latest_pe_result: ScreeningResult | null;
  latest_hpp_result: ScreeningResult | null;
  bp_count: number;
  latest_bp: {
    systolic: number;
    diastolic: number;
    sequence_number: number;
    measured_at: string;
  } | null;
  cumulative_blood_loss_ml: number;
  active_alerts_count: number;
}

export interface BootstrapResponse {
  ok: boolean;
  active_protocol: ClinicalProtocol;
  enriched_admissions: EnrichedAdmission[];
  evaluation_metrics: {
    total_scenarios: number;
    concordant_count: number;
    observed_agreement_percent: number;
    cohens_kappa: number;
    avg_manual_seconds: number;
    avg_sigap_seconds: number;
    time_saved_percent: number;
    avg_sus_score: number;
  };
  db: SigapDatabase;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    userId?: string;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    userId = "usr-bidan-01",
    timeoutMs = 8000,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": userId,
  };

  if (typeof window !== "undefined") {
    try {
      const token =
        localStorage.getItem("sigap_auth_token") ||
        localStorage.getItem("sigap_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP Error ${res.status}`);
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(
        `Koneksi backend timeout (${timeoutMs}ms). Pastikan server backend SIGAP di port 4000 aktif.`
      );
    }
    throw err;
  }
}
