"use client";

import Link from "next/link";
import Image from "next/image";
import { useStore } from "./StoreProvider";

export function Footer() {
  const { settings } = useStore();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-graphite text-ice">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Image
            src="/brand/logo-horizontal-light.png"
            alt="Art Space 3D"
            width={1813}
            height={1009}
            className="h-12 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm text-ice/70">
            Do digital ao real. A gente torna possível.
          </p>
        </div>

        <div className="text-sm">
          <h3 className="mb-3 font-semibold text-copper">Navegação</h3>
          <ul className="space-y-2 text-ice/80">
            <li>
              <Link href="/" className="hover:text-copper">
                Catálogo
              </Link>
            </li>
            <li>
              <Link href="/carrinho" className="hover:text-copper">
                Carrinho
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-copper">
                Área administrativa
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h3 className="mb-3 font-semibold text-copper">Contato</h3>
          <ul className="space-y-2 text-ice/80">
            {settings.city && <li>{settings.city}</li>}
            {settings.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${settings.instagram.replace(
                    /^@/,
                    "",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-copper"
                >
                  {settings.instagram}
                </a>
              </li>
            )}
            {settings.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-copper"
                >
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-ice/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ice/50">
          © {year} {settings.storeName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
