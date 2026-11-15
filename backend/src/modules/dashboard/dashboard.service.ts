import { loadDb } from "@/lib/store";

export class DashboardService {
  async getExecutiveSummary() {
    const db = loadDb();
    const activeAdmissions = db.admissions.filter((a) => a.status === "ACTIVE");
    const openAlerts = db.alerts.filter((al) => al.status !== "RESOLVED");

    return {
      kpiSummary: {
        totalPasienAktif: activeAdmissions.length,
        totalAlertKritis: openAlerts.filter((a) => a.severity === "CRITICAL_PRIORITY").length,
        kepatuhanSpoRate: "94.2%",
        kesiapanAkreditasi: "88%",
      },
      bedStatus: {
        totalBeds: 24,
        occupiedBeds: 16,
        availableBeds: 8,
        borPercent: 66.7,
      },
      alerts: openAlerts.slice(0, 5),
    };
  }
}

export const dashboardService = new DashboardService();
