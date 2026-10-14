"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useStore } from "./StoreProvider";

const NAV = [
  { href: "/", label: "Catálogo" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const { cartCount, hydrated } = useStore();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-chumbo/10 bg-ice/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center" aria-label="Art Space 3D — início">
          <Image
            src="/brand/logo-horizontal-dark.png"
            alt="Art Space 3D"
            width={1813}
            height={1009}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-chumbo text-ice"
                    : "text-chumbo hover:bg-chumbo/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/carrinho"
            aria-label="Carrinho"
            className="relative ml-1 inline-flex items-center gap-2 rounded-full bg-copper px-4 py-2 text-sm font-semibold text-ice transition-colors hover:bg-copper-dark"
          >
            <CartIcon />
            <span className="hidden sm:inline">Carrinho</span>
            {hydrated && cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-graphite px-1 text-xs font-bold text-ice">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
