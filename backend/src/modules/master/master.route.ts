import { NextRequest } from "next/server";
import { masterController } from "./master.controller";

export async function handleMasterRoute(req: NextRequest) {
  if (req.method === "GET") {
    return await masterController.getMasters(req);
  }
  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.json().catch(() => ({}));
    return await masterController.updateSettings(req, body);
  }
  return masterController.getMasters(req);
}

