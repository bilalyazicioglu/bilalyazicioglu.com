import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  createSessionToken,
  getAdminConfig,
  getClientIp,
  recordFailedAttempt,
  resetRateLimit,
  timingSafeCompare,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rate = checkRateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Çok fazla hatalı giriş denemesi. Güvenlik nedeniyle IP adresiniz geçici olarak engellendi. Lütfen ${rate.waitSeconds ?? 900} saniye sonra tekrar deneyin.`,
      },
      { status: 429 }
    );
  }

  const config = getAdminConfig();

  // Validate stealth access key from query or headers
  const providedKey =
    request.nextUrl.searchParams.get("key") ||
    request.headers.get("x-admin-key") ||
    "";

  if (!config.accessKey || !timingSafeCompare(providedKey, config.accessKey)) {
    return new NextResponse(null, { status: 404 });
  }

  let body: { username?: string; password?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { username = "", password = "", pin = "" } = body;

  const valid = verifyAdminCredentials(username, password, pin);
  if (!valid) {
    const failInfo = recordFailedAttempt(ip);
    const msg =
      failInfo.remainingAttempts > 0
        ? `Geçersiz kimlik bilgileri. Kalan deneme hakkı: ${failInfo.remainingAttempts}`
        : `Giriş deneme limitini aştınız. Lütfen ${failInfo.waitSeconds ?? 900} saniye bekleyin.`;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // Authentication succeeded, reset brute force counter
  resetRateLimit(ip);

  const token = createSessionToken(username.trim());
  const response = NextResponse.json({
    success: true,
    redirect: `/${config.secretSlug}`,
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
