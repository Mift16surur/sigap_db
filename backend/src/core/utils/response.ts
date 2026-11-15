import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export function successResponse<T>(data: T, message?: string, meta?: Record<string, any>, status = 200) {
  const body: ApiResponse<T> = { ok: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function errorResponse(message: string, status = 400) {
  const body: ApiResponse = { ok: false, error: message };
  return NextResponse.json(body, { status });
}

