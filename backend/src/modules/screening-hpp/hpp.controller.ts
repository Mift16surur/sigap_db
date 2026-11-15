import { NextRequest } from "next/server";
import { hppScreeningService } from "./hpp.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class HppScreeningController {
  async submit(req: NextRequest) {
    try {
      const { userId } = verifyAuthHeader(req);
      const body = await req.json();
      const result = await hppScreeningService.submitHppScreening(userId, body);
      return successResponse(result, "Evaluasi skrining HPP berhasil diproses", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const hppScreeningController = new HppScreeningController();

