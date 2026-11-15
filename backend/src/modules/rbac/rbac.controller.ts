import { NextRequest } from "next/server";
import { rbacService } from "./rbac.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class RbacController {
  async getOverview(req: NextRequest) {
    try {
      const data = await rbacService.getRbacOverview();
      return successResponse(data, "Data 3-Kolom RBAC berhasil dimuat");
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  }

  async updateUserRole(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const user = await rbacService.updateUserRole(userId, body.target_user_id, body.role_id);
      return successResponse({ user }, "Role pengguna berhasil diperbarui");
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  async updateRolePermissions(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const role = await rbacService.updateRolePermissions(userId, body.role_id, body.permissions);
      return successResponse({ role }, "Hak akses menu role berhasil diperbarui");
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const rbacController = new RbacController();

