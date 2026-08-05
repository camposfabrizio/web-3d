import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
          Feito no litoral catarinense · Navegantes/SC
        </span>
        <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight">
          Sua rota vira um <span className="text-orange-400">troféu 3D</span>
        </h1>
        <p className="mt-5 text-lg text-white/60 max-w-2xl mx-auto">
          Transforme a corrida, o pedal ou a trilha do seu Strava em uma peça 3D
          única — com o relevo real do terreno e o seu percurso em destaque.
          Você personaliza, a gente imprime e envia na sua porta.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/criar"
            className="rounded-lg bg-orange-500 hover:bg-orange-600 px-6 py-3 font-medium transition">
            Criar meu troféu
          </Link>
          <a href="#como-funciona"
            className="rounded-lg border border-white/20 hover:bg-white/5 px-6 py-3 font-medium transition">
            Como funciona
          </a>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-2xl font-semibold text-center mb-10">Como funciona</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <Step n="1" title="Suba seu GPX"
            desc="Exporte a atividade do Strava, Garmin ou relógio e envie o arquivo GPX." />
          <Step n="2" title="Personalize em 3D"
            desc="Veja o modelo girando no navegador, ajuste tamanho, relevo e o estilo (terreno ou mapa urbano)." />
          <Step n="3" title="Receba impresso"
            desc="Finalize o pedido e produzimos a peça para chegar pronta na sua casa." />
        </div>
      </section>

      {/* Públicos */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-2xl font-semibold text-center mb-3">Feito para quem se move</h2>
        <p className="text-center text-white/50 mb-10 max-w-2xl mx-auto">
          Corrida de rua, trail run, ciclismo e eventos esportivos do litoral —
          públicos que valorizam a conquista e querem levá-la para a estante.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["Corrida de rua", "Trail run", "Ciclismo", "Eventos & assessorias"].map((t) => (
            <div key={t} className="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-sm font-medium">
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* Eventos / B2B */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/10 text-center">
        <h2 className="text-2xl font-semibold mb-3">Organiza um evento esportivo?</h2>
        <p className="text-white/60 max-w-2xl mx-auto mb-6">
          Ofereça o troféu 3D da rota como brinde premium ou item de kit para os
          participantes. Fale com a gente sobre parcerias para corridas, provas de
          ciclismo e boxes.
        </p>
        <a href="mailto:contato@rotasem3d.com.br"
          className="inline-block rounded-lg border border-white/20 hover:bg-white/5 px-6 py-3 font-medium transition">
          Falar sobre parceria
        </a>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
        Rotas em 3D · Navegantes/SC · impressão sob demanda
      </footer>
    </main>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="w-9 h-9 rounded-full bg-orange-500 grid place-items-center font-semibold">{n}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/55">{desc}</p>
    </div>
  );
}
