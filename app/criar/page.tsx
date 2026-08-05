import Link from "next/link";
import Generator from "@/components/Generator";

export default function CriarPage() {
  return (
    <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
      <header className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-white/60 hover:text-white">← Início</Link>
        <h1 className="text-lg font-semibold">Gerador de troféu 3D</h1>
        <span className="w-16" />
      </header>
      <div className="flex-1 min-h-[70vh]">
        <Generator />
      </div>
    </main>
  );
}
