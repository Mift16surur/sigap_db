import { NextRequest } from "next/server";
import { dashboardController } from "./dashboard.controller";

export async function handleDashboardRoute(req: NextRequest) {
  return await dashboardController.getSummary(req);
}

