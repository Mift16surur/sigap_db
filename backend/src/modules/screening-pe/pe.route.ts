import { NextRequest } from "next/server";
import { peScreeningController } from "./pe.controller";
import { errorResponse } from "@/core/utils/response";

export async function handlePeRoute(req: NextRequest) {
  if (req.method === "POST") {
    return await peScreeningController.submit(req);
  }
  return errorResponse("Method tidak didukung pada pe.route", 405);
}

