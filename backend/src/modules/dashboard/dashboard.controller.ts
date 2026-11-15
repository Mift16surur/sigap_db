import { NextRequest } from "next/server";
import { dashboardService } from "./dashboard.service";
import { successResponse, errorResponse } from "@/core/utils/response";

export class DashboardController {
  async getSummary(req: NextRequest) {
    try {
      const summary = await dashboardService.getExecutiveSummary();
      return successResponse(summary, "Dashboard executive summary berhasil diambil");
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  }
}

export const dashboardController = new DashboardController();

