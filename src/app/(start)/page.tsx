import Link from "next/link";
import { StartRedirect } from "@/ui/StartRedirect";

export default function Start() {
  return (
    <>
      <StartRedirect lang={null} />
      <noscript>
        <Link href="/ru/code">Русский</Link> · <Link href="/en/code">English</Link>
      </noscript>
    </>
  );
}
