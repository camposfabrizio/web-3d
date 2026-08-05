import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rotas em 3D — troféus personalizados de corrida e bike",
  description:
    "Transforme sua rota do Strava/Garmin em uma peça 3D e receba o troféu impresso em casa. Corridas, trilhas e eventos do litoral catarinense.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0b0f17] text-white">{children}</body>
    </html>
  );
}
