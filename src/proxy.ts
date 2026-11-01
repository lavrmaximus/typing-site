import { NextResponse, type NextRequest } from "next/server";
import { langFromAcceptLanguage } from "@/i18n/dict";

export function proxy(request: NextRequest) {
  const lang = langFromAcceptLanguage(request.headers.get("accept-language"));
  return NextResponse.redirect(new URL(`/${lang}/code`, request.url));
}

export const config = { matcher: ["/", "/ru", "/en"] };
