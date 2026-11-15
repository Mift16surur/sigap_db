import { NextRequest } from "next/server";
import { monitoringController } from "./monitoring.controller";
import { errorResponse } from "@/core/utils/response";

export async function handleMonitoringRoute(req: NextRequest) {
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body.action === "RECORD_BLOOD_LOSS") {
      return await monitoringController.recordBloodLoss(req, body);
    }
    if (body.action === "RECORD_VITALS") {
      return await monitoringController.recordVitals(req, body);
    }
    if (body.action === "CREATE_SBAR") {
      return await monitoringController.createSbar(req, body);
    }
  }

  return errorResponse("Action/Method tidak didukung pada monitoring.route", 400);
}

