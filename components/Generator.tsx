"use client";

// Orquestra o fluxo do gerador: upload de GPX -> busca dados (elevação/OSM) ->
// monta a malha 3D -> preview interativo -> personalização -> export STL / pedido.

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { parseGpx, formatDuration, type ParsedRoute } from "@/lib/gpx";
import { boundsOf, type BBox } from "@/lib/geo";
import {
  buildModel,
  DEFAULT_COLORS,
  DEFAULT_FEATURES,
  type BuildOptions,
  type ElementColors,
  type Heightmap,
  type MapFeatures,
  type OsmData,
} from "@/lib/mesh";
import { downloadSTL } from "@/lib/stl";
import { type StravaActivity } from "@/lib/strava";

const Viewer3D = dynamic(() => import("./Viewer3D"), { ssr: false });
const MapPreview = dynamic(() => import("./MapPreview"), { ssr: false });

const DEFAULTS: BuildOptions = {
  mode: "terrain",
  sizeMM: 120,
  baseHeightMM: 4,
  exaggeration: 3,
  routeWidthMM: 2.5,
  routeHeightMM: 1.4,
  colors: DEFAULT_COLORS,
  features: DEFAULT_FEATURES,
};

const FEATURE_LABELS: { key: keyof MapFeatures; label: string }[] = [
  { key: "roads", label: "Vias" },
  { key: "buildings", label: "Quadras" },
  { key: "green", label: "Áreas verdes" },
  { key: "water", label: "Água" },
];

// Conta cores de impressão distintas entre os elementos ativos no modo atual.
function countPrintColors(o: BuildOptions): number {
  const active: string[] = [];
  if (o.mode === "terrain") {
    active.push(o.colors.terrain, o.colors.route);
  } else {
    active.push(o.colors.base, o.colors.route);
    if (o.features.roads) active.push(o.colors.roads);
    if (o.features.buildings) active.push(o.colors.building);
    if (o.features.green) active.push(o.colors.green);
    if (o.features.water) active.push(o.colors.water);
  }
  return new Set(active.map((c) => c.toLowerCase())).size;
}

// Elementos coloríveis por modo (para o painel de cores)
const COLOR_FIELDS: Record<"terrain" | "urban", { key: keyof ElementColors; label: string }[]> = {
  terrain: [
    { key: "terrain", label: "Terreno" },
    { key: "route", label: "Rota" },
  ],
  urban: [
    { key: "base", label: "Base" },
    { key: "roads", label: "Vias" },
    { key: "building", label: "Quadras" },
    { key: "green", label: "Áreas verdes" },
    { key: "water", label: "Água" },
    { key: "route", label: "Rota" },
  ],
};

export default function Generator() {
  const [route, setRoute] = useState<ParsedRoute | null>(null);
  const [opts, setOpts] = useState<BuildOptions>(DEFAULTS);
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [eventName, setEventName] = useState("");
  const [athlete, setAthlete] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Strava
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[] | null>(null);
  const [stravaBusy, setStravaBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Cache dos dados buscados (evita refetch ao mexer nos sliders)
  const bboxRef = useRef<BBox | null>(null);
  const heightRef = useRef<Heightmap | null>(null);
  const osmRef = useRef<OsmData | null>(null);
  const dataKeyRef = useRef<string>("");

  // Aplica uma rota (vinda de GPX ou do Strava) e reseta os caches de dados.
  const applyRoute = (parsed: ParsedRoute) => {
    setError(null); setWarning(null); setGroup(null);
    heightRef.current = null; osmRef.current = null; dataKeyRef.current = "";
    setRoute(parsed);
    bboxRef.current = boundsOf(parsed.points, 0.6); // margem p/ o hexágono cobrir a área
    if (parsed.stats.name) setEventName(parsed.stats.name);
  };

  const onFile = async (file: File) => {
    try {
      applyRoute(parseGpx(await file.text()));
    } catch (e) {
      setRoute(null);
      setError(e instanceof Error ? e.message : "Falha ao ler o GPX.");
    }
  };

  // Carrega o estado de conexão + atividades do Strava.
  const loadStrava = useCallback(async () => {
    setStravaBusy(true);
    try {
      const res = await fetch("/api/strava/activities");
      if (res.status === 401) {
        setStravaConnected(false);
        setStravaActivities(null);
        return;
      }
      const data = await res.json();
      setStravaConnected(true);
      setStravaActivities(data.activities || []);
    } catch {
      /* silencioso: mantém o fluxo por GPX disponível */
    } finally {
      setStravaBusy(false);
    }
  }, []);

  const pickStrava = async (id: number) => {
    setStravaBusy(true); setError(null);
    try {
      const res = await fetch(`/api/strava/activity?id=${id}`);
      if (res.status === 401) { setStravaConnected(false); throw new Error("Sessão do Strava expirada. Conecte novamente."); }
      if (!res.ok) throw new Error("Falha ao carregar a rota do Strava.");
      applyRoute((await res.json()) as ParsedRoute);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no Strava.");
    } finally {
      setStravaBusy(false);
    }
  };

  // Ao montar: verifica retorno do OAuth e carrega atividades se já conectado.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("strava");
    if (p === "conectado") setNotice("Conta do Strava conectada.");
    else if (p === "erro") setNotice("Não foi possível conectar ao Strava. Tente novamente.");
    else if (p === "nao_configurado") setNotice("Integração com Strava ainda não configurada neste ambiente.");
    if (p) window.history.replaceState(null, "", "/criar");
    loadStrava();
  }, [loadStrava]);

  const ensureData = useCallback(async () => {
    if (!route || !bboxRef.current) return;
    const bbox = bboxRef.current;
    const key = `${opts.mode}:${bbox.minLng.toFixed(4)},${bbox.minLat.toFixed(4)}`;
    if (key === dataKeyRef.current) return; // já temos os dados

    if (opts.mode === "terrain") {
      const res = await fetch("/api/elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bbox, grid: 150 }),
      });
      if (!res.ok) throw new Error("Falha ao buscar elevação.");
      heightRef.current = (await res.json()) as Heightmap;
    } else {
      const res = await fetch("/api/osm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bbox }),
      });
      if (!res.ok) throw new Error("Falha ao buscar feições do mapa.");
      const data = await res.json();
      if (data.warning) setWarning(data.warning); else setWarning(null);
      osmRef.current = data as OsmData;
    }
    dataKeyRef.current = key;
  }, [route, opts.mode]);

  const rebuild = useCallback(() => {
    if (!route) return;
    const bbox = bboxRef.current!;
    const g = buildModel(
      route.points,
      bbox,
      opts,
      opts.mode === "terrain" ? heightRef.current : null,
      opts.mode === "urban" ? osmRef.current : null
    );
    setGroup(g);
  }, [route, opts]);

  const generate = async () => {
    if (!route) return;
    setLoading(true); setError(null);
    try {
      await ensureData();
      rebuild();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o modelo.");
    } finally {
      setLoading(false);
    }
  };

  // Reconstrói localmente ao mexer nos sliders/cores (sem refetch), se já há dados
  useEffect(() => {
    if (group && dataKeyRef.current) rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.sizeMM, opts.baseHeightMM, opts.exaggeration, opts.routeWidthMM, opts.routeHeightMM, opts.colors, opts.features]);

  const set = (patch: Partial<BuildOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const setColor = (key: keyof ElementColors, value: string) =>
    setOpts((o) => ({ ...o, colors: { ...o.colors, [key]: value } }));
  const toggleFeature = (key: keyof MapFeatures) =>
    setOpts((o) => ({ ...o, features: { ...o.features, [key]: !o.features[key] } }));

  const download = () => {
    if (!group) return;
    const slug = (eventName || route?.stats.name || "rota")
      .normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40);
    downloadSTL(group, `trofeu-${slug}`);
  };

  const stats = route?.stats;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 h-full">
      {/* Preview */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0f1420] min-h-[420px] lg:min-h-0">
        {group ? (
          <Viewer3D object={group} />
        ) : route ? (
          <MapPreview route={route} routeColor={opts.colors.route} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center p-8 text-white/50">
            <div>
              <p className="text-lg font-medium text-white/70">Pré-visualização</p>
              <p className="mt-2 text-sm">Suba um GPX ou conecte o Strava, escolha a rota e clique em “Gerar modelo 3D”.</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-orange-500 animate-spin" />
              <p className="text-white/80 text-sm">Gerando modelo 3D…</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel */}
      <div className="space-y-5 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium mb-2">Arquivo GPX (Strava/Garmin)</label>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,text/xml"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-orange-600 file:cursor-pointer"
          />
        </div>

        {/* Strava */}
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/30 mb-2">
            <span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" />
          </div>
          {!stravaConnected ? (
            <a
              href="/api/strava/auth"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#fc4c02] hover:brightness-110 px-4 py-2.5 font-medium text-white transition"
            >
              Conectar com Strava
            </a>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Suas atividades no Strava</span>
                <button onClick={loadStrava} disabled={stravaBusy}
                  className="text-xs text-white/50 hover:text-white disabled:opacity-50">Atualizar</button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                {stravaBusy && !stravaActivities ? (
                  <div className="px-3 py-3 text-xs text-white/40">Carregando…</div>
                ) : stravaActivities && stravaActivities.length > 0 ? (
                  stravaActivities.map((a) => (
                    <button key={a.id} onClick={() => pickStrava(a.id)} disabled={stravaBusy}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 disabled:opacity-50">
                      <div className="text-sm truncate">{a.name}</div>
                      <div className="text-[11px] text-white/40">
                        {a.type} · {a.distanceKm.toFixed(1)} km · {new Date(a.date).toLocaleDateString("pt-BR")}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-white/40">Nenhuma atividade com GPS encontrada.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {notice && <p className="text-xs text-white/60 bg-white/5 rounded-lg p-2">{notice}</p>}
        {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</p>}

        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Distância" value={`${stats.distanceKm.toFixed(1)} km`} />
            <Stat label="Tempo" value={formatDuration(stats.durationSec) ?? "—"} />
            <Stat label="Ganho" value={stats.ascentM ? `${stats.ascentM} m` : "—"} />
          </div>
        )}

        {route && (
          <>
            {/* Modo */}
            <div>
              <label className="block text-sm font-medium mb-2">Estilo da peça</label>
              <div className="grid grid-cols-2 gap-2">
                <ModeBtn active={opts.mode === "terrain"} onClick={() => set({ mode: "terrain" })}
                  title="Terreno 3D" desc="trilha / serra" />
                <ModeBtn active={opts.mode === "urban"} onClick={() => set({ mode: "urban" })}
                  title="Mapa urbano" desc="ruas / praia" />
              </div>
              <p className="mt-1 text-xs text-white/40">
                {opts.mode === "terrain"
                  ? "Relevo real do terreno com a rota em cima."
                  : "Vias, água e áreas verdes do mapa, com a rota destacada — ideal p/ litoral plano."}
              </p>
            </div>

            {/* Feições do mapa (liga/desliga) — modo urbano */}
            {opts.mode === "urban" && (
              <div>
                <label className="block text-sm font-medium mb-2">Feições do mapa</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_LABELS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 cursor-pointer text-sm">
                      <input type="checkbox" checked={opts.features[f.key]}
                        onChange={() => toggleFeature(f.key)} className="accent-orange-500" />
                      <span className="text-white/70">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Slider label="Tamanho (mm)" min={60} max={200} step={5}
              value={opts.sizeMM} onChange={(v) => set({ sizeMM: v })} />
            <Slider label="Espessura da base (mm)" min={2} max={10} step={0.5}
              value={opts.baseHeightMM} onChange={(v) => set({ baseHeightMM: v })} />
            {opts.mode === "terrain" && (
              <Slider label="Exagero vertical" min={1} max={8} step={0.5}
                value={opts.exaggeration} onChange={(v) => set({ exaggeration: v })} />
            )}
            <Slider label="Espessura da rota (mm)" min={1} max={5} step={0.25}
              value={opts.routeWidthMM} onChange={(v) => set({ routeWidthMM: v })} />

            {/* Cores por elemento (impressoras costumam trabalhar com até 4 cores) */}
            <div>
              <label className="block text-sm font-medium mb-2">Cores</label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_FIELDS[opts.mode].map((f) => (
                  <label key={f.key} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 cursor-pointer">
                    <input type="color" value={opts.colors[f.key]}
                      onChange={(e) => setColor(f.key, e.target.value)}
                      className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                    <span className="text-xs text-white/70">{f.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                Cada elemento é uma peça separada — atribua uma cor de filamento a cada um.
              </p>
              {(() => {
                const n = countPrintColors(opts);
                const over = n > 4;
                return (
                  <p className={`mt-2 text-xs rounded-lg p-2 ${over ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-white/60"}`}>
                    Total de cores: <span className="font-semibold">{n}</span>
                    {over ? " — acima de 4; a maioria das impressoras troca de filamento (ou use AMS/multicolor)." : " — cabe em impressoras de até 4 cores."}
                  </p>
                );
              })()}
            </div>

            <button onClick={generate} disabled={loading}
              className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-4 py-2.5 font-medium text-white transition">
              {group ? "Atualizar modelo 3D" : "Gerar modelo 3D"}
            </button>

            {warning && <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2">{warning}</p>}

            {/* Personalização (metadado do pedido) */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <p className="text-sm font-medium">Personalização</p>
              <Field label="Nome do evento" value={eventName} onChange={setEventName} placeholder="Ex.: Maratona de Navegantes" />
              <Field label="Atleta" value={athlete} onChange={setAthlete} placeholder="Seu nome" />
              <Field label="Data" value={eventDate} onChange={setEventDate} placeholder="dd/mm/aaaa" />
            </div>

            {group && (
              <div className="space-y-2 pt-2">
                <button onClick={download}
                  className="w-full rounded-lg border border-white/20 hover:bg-white/5 px-4 py-2.5 font-medium transition">
                  Baixar STL
                </button>
                <button
                  onClick={() => alert("Checkout em breve — o pedido será enviado para produção.")}
                  className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 font-medium text-white transition">
                  Pedir impresso e receber em casa
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}

function ModeBtn({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${
        active ? "border-orange-500 bg-orange-500/10" : "border-white/15 hover:bg-white/5"
      }`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-white/50">{desc}</div>
    </button>
  );
}

function Slider({ label, min, max, step, value, onChange }:
  { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span><span className="text-white/50">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-orange-500" />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-orange-500" />
    </div>
  );
}
