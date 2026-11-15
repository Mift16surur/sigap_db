import { NextRequest } from "next/server";
import { authService } from "./auth.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class AuthController {
  async login(req: NextRequest, body: any) {
    try {
      const { username, password } = body;
      const result = await authService.login(username, password, false);
      return successResponse({ session: result, user: result.user }, "Login berhasil");
    } catch (err: any) {
      return errorResponse(err.message, 401);
    }
  }

  async adminLogin(req: NextRequest, body: any) {
    try {
      const { username, password } = body;
      const result = await authService.login(username, password, true);
      return successResponse({ session: result, user: result.user }, "Login Administrator berhasil");
    } catch (err: any) {
      return errorResponse(err.message, 401);
    }
  }

  async createUser(req: NextRequest, body: any) {
    try {
      const { userId } = verifyAuthHeader(req);
      const user = await authService.createUser(userId, body);
      return successResponse({ user }, "Akun berhasil dibuat", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const authController = new AuthController();

