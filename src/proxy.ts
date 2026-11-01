import { NextResponse, type NextRequest } from "next/server";
import { LAST_PATH_COOKIE, isLang, isRememberedPath, langFromAcceptLanguage } from "@/i18n/dict";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.slice(1);
  const last = request.cookies.get(LAST_PATH_COOKIE)?.value;
  let target: string;
  if (isLang(segment)) {
    // "/en" keeps its language; the mode comes from the last visit when it was in that language
    target = isRememberedPath(last) && last.startsWith(`/${segment}/`) ? last : `/${segment}/code`;
  } else {
    target = isRememberedPath(last) ? last : `/${langFromAcceptLanguage(request.headers.get("accept-language"))}/code`;
  }
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = { matcher: ["/", "/ru", "/en"] };
