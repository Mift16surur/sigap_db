import { NextRequest } from "next/server";
import { monitoringService } from "./monitoring.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class MonitoringController {
  async recordBloodLoss(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const entry = await monitoringService.recordBloodLoss(userId, body);
      return successResponse({ entry }, "Catatan darah gravimetrik berhasil disimpan", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  async recordVitals(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const record = await monitoringService.recordVitals(userId, body);
      return successResponse({ record }, "Tanda vital & monitoring berhasil disimpan", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  async createSbar(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const sbar = await monitoringService.createSbarHandover(userId, body);
      return successResponse({ sbar }, "Handover SBAR berhasil dibuat", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const monitoringController = new MonitoringController();

