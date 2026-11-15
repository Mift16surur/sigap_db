import { loadDb } from "@/lib/store";

export class NotificationService {
  async getUnreadAlertNotifications() {
    const db = loadDb();
    const openAlerts = db.alerts.filter((a) => a.status !== "RESOLVED");
    return openAlerts.map((a) => ({
      notificationId: `notif-${a.alert_id}`,
      title: a.title,
      severity: a.severity,
      message: a.message,
      triggeredAt: a.triggered_at,
    }));
  }
}

export const notificationService = new NotificationService();

