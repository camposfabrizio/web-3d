import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/StoreProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Art Space 3D — Catálogo Digital",
  description:
    "Não apenas imprimimos objetos, materializamos ideias. Presentes, souvenirs, decoração e luminárias impressos em 3D. Ideias ganham forma em 3D.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
