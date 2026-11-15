import { NextRequest } from "next/server";
import { admissionController } from "./admission.controller";
import { errorResponse } from "@/core/utils/response";

export async function handleAdmissionRoute(req: NextRequest) {
  if (req.method === "GET") {
    return await admissionController.getAdmissions(req);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body.action === "REGISTER_PATIENT") {
      return await admissionController.registerPatient(req, body);
    }
    return await admissionController.createAdmission(req, body);
  }

  return errorResponse("Method tidak didukung pada admission.route", 405);
}

