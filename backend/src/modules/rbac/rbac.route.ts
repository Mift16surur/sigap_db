import { NextRequest } from "next/server";
import { rbacController } from "./rbac.controller";
import { errorResponse } from "@/core/utils/response";

export async function handleRbacRoute(req: NextRequest) {
  if (req.method === "GET") {
    return await rbacController.getOverview(req);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body.action === "UPDATE_USER_RBAC") {
      return await rbacController.updateUserRole(req, body);
    }
    if (body.action === "UPDATE_ROLE_PERMISSIONS") {
      return await rbacController.updateRolePermissions(req, body);
    }
  }

  return errorResponse("Method/Action tidak didukung pada rbac.route", 400);
}

