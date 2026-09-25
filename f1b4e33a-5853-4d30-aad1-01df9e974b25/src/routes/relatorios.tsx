import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { Tables } from "@/integrations/supabase/types";
import { consultaPosts } from "@/lib/queries";
import { REDES, formatarData, formatarHora, numeroCurto } from "@/lib/social";
import { cn, tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: tituloPagina("Relatórios") },
      {
        name: "description",
        content: "Compare alcance e engajamento por rede social e veja quais posts renderam mais.",
      },
      { property: "og:title", content: tituloPagina("Relatórios") },
      {
        property: "og:description",
        content: "Alcance e engajamento por rede, post a post.",
      },
    ],
  }),
  component: Relatorios,
});

type Post = Tables<"posts">;
type Periodo = "ano" | "mes" | "semana" | "hoje";
type ResumoRede = {
  rede: string;
  alcance: number;
  total: number;
  ultimo: Post | null;
  realizados: Post[];
  aguardando: Post[];
};

const PERIODOS: { valor: Periodo; rotulo: string; descricao: string }[] = [
  { valor: "ano", rotulo: "Ano", descricao: "nos últimos 12 meses" },
  { valor: "mes", rotulo: "Mês", descricao: "nos últimos 30 dias" },
  { valor: "semana", rotulo: "Semana", descricao: "nos últimos 7 dias" },
  { valor: "hoje", rotulo: "Hoje", descricao: "hoje, hora a hora" },
];

// Mesma identidade de cor dos selos e do calendário.
const COR_GRAFICO: Record<string, string> = {
  Instagram: "var(--volt)",
  TikTok: "var(--cyan)",
  LinkedIn: "var(--fg)",
  YouTube: "var(--destructive)",
};

function porcentagem(valor: number) {
  return `${Number(valor).toFixed(1).replace(".", ",")}%`;
}

// Realizado: publicado, ou agendado com a data já passada. O resto (futuros e rascunhos) aguarda.
function foiRealizado(post: Post, agora: number) {
  return (
    post.status === "publicado" ||
    (post.status === "agendado" && Date.parse(post.agendado_em) <= agora)
  );
}

function inicioPeriodo(periodo: Periodo, agora: Date) {
  const dia = (volta: number) =>
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - volta);
  if (periodo === "ano") return new Date(agora.getFullYear(), agora.getMonth() - 11, 1);
  if (periodo === "mes") return dia(29);
  if (periodo === "semana") return dia(6);
  return dia(0);
}

// Alcance somado por fatia do período: meses (ano), dias (mês/semana) ou horas (hoje).
function serieAlcance(posts: Post[], periodo: Periodo, agora: Date) {
  const inicio = inicioPeriodo(periodo, agora);
  let pontos: { rotulo: string; alcance: number }[];
  let indice: (data: Date) => number;

  if (periodo === "hoje") {
    pontos = Array.from({ length: 24 }, (_, h) => ({ rotulo: `${h}h`, alcance: 0 }));
    indice = (data) => (data >= inicio ? data.getHours() : -1);
  } else if (periodo === "ano") {
    pontos = Array.from({ length: 12 }, (_, i) => ({
      rotulo: new Date(inicio.getFullYear(), inicio.getMonth() + i, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      alcance: 0,
    }));
    indice = (data) =>
      (data.getFullYear() - inicio.getFullYear()) * 12 + data.getMonth() - inicio.getMonth();
  } else {
    const dias = periodo === "semana" ? 7 : 30;
    pontos = Array.from({ length: dias }, (_, i) => ({
      rotulo: new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + i,
      ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      alcance: 0,
    }));
    indice = (data) =>
      Math.round(
        (new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() -
          inicio.getTime()) /
          86400000,
      );
  }

  for (const post of posts) {
    const data = new Date(post.agendado_em);
    const ponto = pontos[indice(data)];
    if (ponto && data <= agora) ponto.alcance += post.alcance;
  }
  return pontos;
}

function Relatorios() {
  const { data: posts } = useQuery(consultaPosts);
  const [grafico, setGrafico] = useState<{ aberto: boolean; rede: string }>({
    aberto: false,
    rede: REDES[0],
  });

  const lista = posts ?? [];
  const agora = Date.now();
  const porRede: ResumoRede[] = REDES.map((rede) => {
    const doGrupo = lista.filter((p) => p.rede === rede);
    return {
      rede,
      alcance: doGrupo.reduce((s, p) => s + p.alcance, 0),
      total: doGrupo.length,
      // Último post criado na rede, em qualquer status.
      ultimo: doGrupo.reduce<Post | null>(
        (recente, p) =>
          !recente || Date.parse(p.created_at) > Date.parse(recente.created_at) ? p : recente,
        null,
      ),
      realizados: doGrupo
        .filter((p) => foiRealizado(p, agora))
        .sort((a, b) => Date.parse(b.agendado_em) - Date.parse(a.agendado_em)),
      aguardando: doGrupo
        .filter((p) => !foiRealizado(p, agora))
        .sort((a, b) => Date.parse(a.agendado_em) - Date.parse(b.agendado_em)),
    };
  });
  const maior = Math.max(1, ...porRede.map((r) => r.alcance));
  const melhores = [...lista].sort((a, b) => b.alcance - a.alcance).slice(0, 5);

  return (
    <AppShell titulo="Relatórios">
      <div className="grid gap-4 p-6 md:p-8 lg:grid-cols-[1fr_380px]">
        <section className="animate-rise panel-card p-5">
          <div className="font-display text-2xl uppercase tracking-tight">Alcance por rede</div>
          <div className="label-mono mt-1">
            clique em uma rede para ver o gráfico · a seta abre os posts
          </div>
          <div className="-mx-2 mt-4 space-y-1">
            {porRede.map((r) => (
              <LinhaRede
                key={r.rede}
                resumo={r}
                maior={maior}
                aoAbrirGrafico={(rede) => setGrafico({ aberto: true, rede })}
              />
            ))}
          </div>
        </section>
        <aside className="animate-rise panel-card p-5 [animation-delay:120ms]">
          <div className="font-display text-2xl uppercase tracking-tight">Melhores posts</div>
          <div className="label-mono mt-1">por alcance</div>
          <div className="mt-4 space-y-2">
            {melhores.length === 0 && (
              <p className="py-8 text-center text-sm text-mute">Ainda sem dados de desempenho.</p>
            )}
            {melhores.map((p) => (
              <div key={p.id} className="rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5">
                <div className="truncate text-sm">{p.titulo}</div>
                <div className="label-mono mt-1">
                  {p.rede} · {numeroCurto(p.alcance)} alcance · {porcentagem(p.engajamento)}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <GraficoAlcance
        aberto={grafico.aberto}
        rede={grafico.rede}
        posts={lista}
        aoTrocarRede={(rede) => setGrafico({ aberto: true, rede })}
        aoFechar={() => setGrafico((atual) => ({ ...atual, aberto: false }))}
      />
    </AppShell>
  );
}

// Linha de uma rede: clique abre o gráfico, o mouse mostra o último post e a seta abre as listas.
function LinhaRede({
  resumo,
  maior,
  aoAbrirGrafico,
}: {
  resumo: ResumoRede;
  maior: number;
  aoAbrirGrafico: (rede: string) => void;
}) {
  const { rede, alcance, total, ultimo, realizados, aguardando } = resumo;
  const [cartao, setCartao] = useState(false);
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="rounded-lg transition-colors hover:bg-fg/[0.02]">
      <div className="flex items-center gap-1">
        <Popover open={cartao} onOpenChange={setCartao}>
          <PopoverAnchor asChild>
            <button
              type="button"
              title={`Ver gráfico de alcance de ${rede}`}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setCartao(true);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") setCartao(false);
              }}
              onClick={() => {
                setCartao(false);
                aoAbrirGrafico(rede);
              }}
              className="min-w-0 flex-1 cursor-pointer rounded-lg px-2 py-2 text-left transition-colors hover:bg-fg/[0.04] focus-visible:bg-fg/[0.04] focus-visible:outline-none"
            >
              <div className="mb-1.5 flex justify-between gap-2 text-xs">
                <span>{rede}</span>
                <span className="text-mute">
                  {numeroCurto(alcance)} · {total} posts
                </span>
              </div>
              <div className="h-2 rounded-full bg-fg/8">
                <div
                  className="h-2 rounded-full bg-volt"
                  style={{ width: `${(alcance / maior) * 100}%` }}
                />
              </div>
            </button>
          </PopoverAnchor>
          <PopoverContent
            side="top"
            align="start"
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="pointer-events-none w-72 max-w-[calc(100vw-2rem)] border-line/70 bg-panel text-fg"
          >
            <div className="label-mono">último post · {rede}</div>
            {ultimo ? (
              <>
                <div className="mt-2 break-words text-sm font-medium">{ultimo.titulo}</div>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-mute">
                  {ultimo.conteudo || "Sem conteúdo."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line/60 pt-2 font-mono text-[10px] uppercase text-mute">
                  <span className="text-volt">{ultimo.status}</span>
                  <span>criado em {formatarData(ultimo.created_at)}</span>
                  <span>{numeroCurto(ultimo.alcance)} alcance</span>
                  <span>{porcentagem(ultimo.engajamento)} eng.</span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-mute">Nenhum post criado para {rede} ainda.</p>
            )}
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setExpandido((atual) => !atual)}
          aria-expanded={expandido}
          aria-label={`${expandido ? "Recolher" : "Ver"} os posts de ${rede}`}
          className="grid size-8 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-fg/5 hover:text-fg"
        >
          <ChevronDown className={cn("size-4 transition-transform", expandido && "rotate-180")} />
        </button>
      </div>
      {expandido && (
        <div className="grid gap-2 px-2 pb-3 pt-1 sm:grid-cols-2">
          <ListaPosts
            titulo="Realizados"
            posts={realizados}
            vazio="Nenhum post realizado."
            mostrarAlcance
          />
          <ListaPosts titulo="Aguardando" posts={aguardando} vazio="Nada aguardando publicação." />
        </div>
      )}
    </div>
  );
}

function ListaPosts({
  titulo,
  posts,
  vazio,
  mostrarAlcance = false,
}: {
  titulo: string;
  posts: Post[];
  vazio: string;
  mostrarAlcance?: boolean;
}) {
  const visiveis = posts.slice(0, 5);
  return (
    <div className="min-w-0 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5">
      <div className="label-mono mb-2">
        {titulo} · {posts.length}
      </div>
      {visiveis.length === 0 ? (
        <p className="text-xs text-mute">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((p) => (
            <li key={p.id} className="min-w-0">
              <div className="truncate text-sm" title={p.titulo}>
                {p.titulo}
              </div>
              <div className="label-mono mt-0.5">
                {formatarData(p.agendado_em)} · {formatarHora(p.agendado_em)} ·{" "}
                {mostrarAlcance ? `${numeroCurto(p.alcance)} alcance` : p.status}
              </div>
            </li>
          ))}
        </ul>
      )}
      {posts.length > visiveis.length && (
        <div className="label-mono mt-2">+ {posts.length - visiveis.length} posts</div>
      )}
    </div>
  );
}

function GraficoAlcance({
  aberto,
  rede,
  posts,
  aoTrocarRede,
  aoFechar,
}: {
  aberto: boolean;
  rede: string;
  posts: Post[];
  aoTrocarRede: (rede: string) => void;
  aoFechar: () => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const agora = new Date();
  const daRede = posts.filter((p) => p.rede === rede);
  const serie = serieAlcance(daRede, periodo, agora);
  const inicio = inicioPeriodo(periodo, agora).getTime();
  const realizadosNoPeriodo = daRede.filter(
    (p) => foiRealizado(p, agora.getTime()) && Date.parse(p.agendado_em) >= inicio,
  );
  const alcanceTotal = serie.reduce((s, p) => s + p.alcance, 0);
  const engajamento = realizadosNoPeriodo.length
    ? realizadosNoPeriodo.reduce((s, p) => s + Number(p.engajamento), 0) /
      realizadosNoPeriodo.length
    : 0;
  const config = {
    alcance: { label: "Alcance", color: COR_GRAFICO[rede] ?? "var(--mute)" },
  } satisfies ChartConfig;
  const descricao = PERIODOS.find((p) => p.valor === periodo)?.descricao ?? "";

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-line/70 bg-panel text-fg sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal uppercase tracking-tight">
            Alcance · {rede}
          </DialogTitle>
          <DialogDescription className="text-mute">
            Soma do alcance dos posts realizados {descricao}.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros numa linha, acima do gráfico: rede e período. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {REDES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === rede}
                onClick={() => aoTrocarRede(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  r === rede
                    ? "bg-volt/15 text-volt ring-1 ring-volt/25"
                    : "text-mute ring-1 ring-fg/10 hover:text-fg",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Período"
            className="flex gap-1 rounded-lg bg-ink p-1 ring-1 ring-fg/10"
          >
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                type="button"
                role="radio"
                aria-checked={p.valor === periodo}
                onClick={() => setPeriodo(p.valor)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  p.valor === periodo ? "bg-volt/15 text-volt" : "text-mute hover:text-fg",
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { rotulo: "alcance", valor: numeroCurto(alcanceTotal) },
            { rotulo: "posts realizados", valor: String(realizadosNoPeriodo.length) },
            { rotulo: "engajamento médio", valor: porcentagem(engajamento) },
          ].map((n) => (
            <div key={n.rotulo} className="rounded-lg bg-ink p-3 ring-1 ring-fg/10">
              <div className="label-mono">{n.rotulo}</div>
              <div className="mt-1 font-display text-2xl">{n.valor}</div>
            </div>
          ))}
        </div>

        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <BarChart
            data={serie}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barCategoryGap={2}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="rotulo"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(valor: number) => numeroCurto(valor)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="alcance"
              fill="var(--color-alcance)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
        {alcanceTotal === 0 && (
          <p className="text-center text-xs text-mute">Sem alcance registrado neste período.</p>
        )}

        {/* Mesmos dados em tabela, para leitores de tela. */}
        <table className="sr-only">
          <caption>
            Alcance de {rede} {descricao}
          </caption>
          <tbody>
            {serie.map((p) => (
              <tr key={p.rotulo}>
                <th scope="row">{p.rotulo}</th>
                <td>{p.alcance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
