import { NextRequest } from "next/server";
import { notificationService } from "./notification.service";
import { successResponse } from "@/core/utils/response";

export class NotificationController {
  async getNotifications(req: NextRequest) {
    const list = await notificationService.getUnreadAlertNotifications();
    return successResponse(list, "Daftar notifikasi alert berhasil dimuat");
  }
}

export const notificationController = new NotificationController();

