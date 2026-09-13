import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminConfig } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const config = getAdminConfig();
  const response = NextResponse.json({
    success: true,
    redirect: `/${config.secretSlug}`,
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

