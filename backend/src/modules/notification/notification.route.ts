import { NextRequest } from "next/server";
import { notificationController } from "./notification.controller";

export async function handleNotificationRoute(req: NextRequest) {
  return await notificationController.getNotifications(req);
}

