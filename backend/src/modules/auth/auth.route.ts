import { NextRequest } from "next/server";
import { authController } from "./auth.controller";
import { errorResponse } from "@/core/utils/response";

/**
 * Route Dispatcher untuk Modul Auth
 */
export async function handleAuthRoute(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "LOGIN";

    switch (action) {
      case "ADMIN_LOGIN":
        return await authController.adminLogin(req, body);
      case "LOGIN":
        return await authController.login(req, body);
      case "CREATE_USER":
        return await authController.createUser(req, body);
      default:
        return errorResponse(`Action '${action}' tidak dikenal pada auth.route`, 400);
    }
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

