import { NextRequest } from "next/server";
import { exportService } from "./export.service";
import { successResponse } from "@/core/utils/response";

export class ExportController {
  async getExportData(req: NextRequest) {
    const data = await exportService.generateClinicalReportData();
    return successResponse(data, "Data ekspor laporan siap diunduh");
  }
}

export const exportController = new ExportController();

