"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logout } from "@/lib/actions";

const LINKS = [
  { href: "/", label: "Översikt" },
  { href: "/schema", label: "Schema" },
  { href: "/sales", label: "Försäljning" },
  { href: "/lager", label: "Lager" },
];

export function Shell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const shop = params.get("shop") || (params.get("view") && params.get("view") !== "both" ? params.get("view") : "");
  const links = role === "ADMIN" ? [...LINKS, { href: "/staff", label: "Staff" }] : LINKS;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const hrefFor = (href: string) => (shop && href !== "/staff" ? `${href}${href.includes("?") ? "&" : "?"}shop=${shop}` : href);
  return (
    <>
      <header className="top">
        <Link href="/" className="wordmark">
          Stora <span>schema</span>
        </Link>
        <nav className="app-nav">
          {links.map((link) => (
            <Link key={link.href} href={hrefFor(link.href)} className={`pill ${active(link.href) ? "active" : ""}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <span className="who">{name}</span>
        <form action={logout}>
          <button className="btn btn-ghost" type="submit">
            Log out
          </button>
        </form>
      </header>
      <main>{children}</main>
      <nav className="bottom-nav">
        {links.map((link) => (
          <Link key={link.href} href={hrefFor(link.href)} className={active(link.href) ? "active" : ""}>
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
