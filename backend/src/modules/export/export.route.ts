import { NextRequest } from "next/server";
import { exportController } from "./export.controller";

export async function handleExportRoute(req: NextRequest) {
  return await exportController.getExportData(req);
}

