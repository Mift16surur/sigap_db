import { NextRequest } from "next/server";
import { admissionService } from "./admission.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class AdmissionController {
  async getAdmissions(req: NextRequest) {
    try {
      const data = await admissionService.getAdmissions();
      return successResponse(data, "Daftar admisi berhasil diambil");
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  }

  async registerPatient(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const patient = await admissionService.registerPatient(userId, body);
      return successResponse({ patient }, "Pasien berhasil didaftarkan", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  async createAdmission(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const admission = await admissionService.createAdmission(userId, body);
      return successResponse({ admission }, "Episode admisi baru berhasil dibuat", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const admissionController = new AdmissionController();

