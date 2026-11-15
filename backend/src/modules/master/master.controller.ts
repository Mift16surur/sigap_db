import { NextRequest } from "next/server";
import { masterService } from "./master.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class MasterController {
  async getMasters(req: NextRequest) {
    try {
      const data = await masterService.getAllMasters();
      return successResponse(data, "Master data berhasil diambil");
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  }

  async updateSettings(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const settings = await masterService.updateSystemSettings(userId, body.settings);
      return successResponse({ settings }, "Pengaturan sistem berhasil diperbarui");
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const masterController = new MasterController();

