import { NextResponse } from "next/server";
import swaggerDoc from "@/docs/swagger.json";

export async function GET() {
  return NextResponse.json(swaggerDoc, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

