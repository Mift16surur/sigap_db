import { loadDb } from "@/lib/store";

export class ExportService {
  async generateClinicalReportData() {
    const db = loadDb();
    return {
      exportedAt: new Date().toISOString(),
      format: "JSON_SUMMARY",
      totalPatients: db.patients.length,
      totalAdmissions: db.admissions.length,
      totalAlerts: db.alerts.length,
    };
  }
}

export const exportService = new ExportService();

