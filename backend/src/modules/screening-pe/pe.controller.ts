import { NextRequest } from "next/server";
import { peScreeningService } from "./pe.service";
import { successResponse, errorResponse } from "@/core/utils/response";
import { verifyAuthHeader } from "@/core/middlewares/auth.middleware";

export class PeScreeningController {
  async submit(req: NextRequest) {
    try {
      const { userId } = verifyAuthHeader(req);
      const body = await req.json();
      const result = await peScreeningService.submitPeScreening(userId, body);
      return successResponse(result, "Evaluasi skrining PE berhasil diproses", undefined, 201);
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }
}

export const peScreeningController = new PeScreeningController();

