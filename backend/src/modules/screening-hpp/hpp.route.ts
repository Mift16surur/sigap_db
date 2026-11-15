import { NextRequest } from "next/server";
import { hppScreeningController } from "./hpp.controller";
import { errorResponse } from "@/core/utils/response";

export async function handleHppRoute(req: NextRequest) {
  if (req.method === "POST") {
    return await hppScreeningController.submit(req);
  }
  return errorResponse("Method tidak didukung pada hpp.route", 405);
}

