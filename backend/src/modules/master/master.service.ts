import { loadDb, saveDb, appendAuditLog } from "@/lib/store";

export class MasterService {
  async getAllMasters() {
    const db = loadDb();
    return {
      units: db.units,
      roles: db.roles,
      master_catalog: db.master_catalog,
      clinical_protocols: db.clinical_protocols,
      system_settings: db.system_settings,
    };
  }

  async updateSystemSettings(userId: string, newSettings: any) {
    const db = loadDb();
    db.system_settings = { ...db.system_settings, ...newSettings };
    appendAuditLog(db, {
      userId,
      entity: "system_settings",
      entityId: "system_settings",
      action: "UPDATE",
      changeSummary: "Memperbarui konfigurasi master sistem.",
    });
    saveDb(db);
    return db.system_settings;
  }
}

export const masterService = new MasterService();

