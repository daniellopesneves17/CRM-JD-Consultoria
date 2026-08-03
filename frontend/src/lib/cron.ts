// Autorização comum dos cron jobs da Vercel.
import { NextResponse } from "next/server";
export function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return null;
}

