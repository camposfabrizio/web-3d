# Rotas em 3D — troféus personalizados de rotas esportivas

Web app onde o cliente sobe o **GPX** de uma corrida/pedal/trilha, vê a rota
virar uma **peça 3D** no navegador (girar/zoom), personaliza e faz o pedido do
**impresso** — que chega pronto para produção. Foco em impressão sob demanda no
litoral catarinense (Navegantes/SC) e parcerias com eventos esportivos.

## Estado atual (MVP em construção)

Implementado nesta fase:

- **Landing** PT-BR (`app/page.tsx`) e página do **gerador** (`app/criar`).
- **Gerador 3D** ponta a ponta, client-side:
  - Upload e parse de GPX + métricas (distância, tempo, ganho) — `lib/gpx.ts`.
  - **Modo terreno**: relevo real via *terrain tiles* (Terrarium/AWS) decodificados
    no servidor — `app/api/elevation` + `lib/geo.ts`. Malha sólida *watertight*
    (topo + paredes + fundo) pronta para o slicer — `lib/mesh.ts`.
  - **Modo urbano**: vias, água, áreas verdes e quadras do OpenStreetMap
    (Overpass) — `app/api/osm` — para rotas planas (litoral), com a rota
    destacada por cima.
  - Preview interativo (`components/Viewer3D.tsx`, react-three-fiber) e
    controles de tamanho, base, exagero vertical e espessura da rota
    (`components/Generator.tsx`).
  - Export de **STL binário** (`lib/stl.ts`).

### Próximos passos (roadmap)

- Texto 3D em relevo na base (nome do evento/atleta/distância/tempo) — precisa de
  um asset de fonte (typeface).
- Contas, persistência e **checkout Pix/cartão** (Mercado Pago) + gravação do
  pedido/STL.
- **Painel de produção** (admin) com status novo → produzindo → enviado.
- Troféu paramétrico para esportes sem GPS (beach tennis, crossfit, Hyrox),
  portal de evento parceiro e download de STL/plano Pro para makers.

> Observação: em ambientes com egress restrito o Overpass (modo urbano) pode
> ficar indisponível; o app segue gerando base + rota e exibe um aviso. Em
> produção (Vercel) as feições do mapa são incluídas normalmente.

## Rodando localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS ·
three.js / react-three-fiber. Deploy alvo: Vercel.
