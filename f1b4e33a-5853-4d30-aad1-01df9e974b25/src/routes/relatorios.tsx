import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import type { Tables } from "@/integrations/supabase/types";
import { consultaPosts } from "@/lib/queries";
import { REDES, formatarData, numeroCurto } from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: tituloPagina("Relatórios") },
      {
        name: "description",
        content:
          "Compare alcance e engajamento por rede social e veja quais posts renderam mais.",
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
type ResumoRede = {
  rede: string;
  alcance: number;
  total: number;
  ultimo: Post | null;
};

function porcentagem(valor: number) {
  return `${Number(valor).toFixed(1).replace(".", ",")}%`;
}

function Relatorios() {
  const { data: posts } = useQuery(consultaPosts);

  const lista = posts ?? [];
  const porRede: ResumoRede[] = REDES.map((rede) => {
    const doGrupo = lista.filter((p) => p.rede === rede);
    return {
      rede,
      alcance: doGrupo.reduce((s, p) => s + p.alcance, 0),
      total: doGrupo.length,
      // Último post criado na rede, em qualquer status.
      ultimo: doGrupo.reduce<Post | null>(
        (recente, p) =>
          !recente || Date.parse(p.created_at) > Date.parse(recente.created_at)
            ? p
            : recente,
        null,
      ),
    };
  });
  const maior = Math.max(1, ...porRede.map((r) => r.alcance));
  const melhores = [...lista].sort((a, b) => b.alcance - a.alcance).slice(0, 5);

  return (
    <AppShell titulo="Relatórios">
      <div className="grid gap-4 p-6 md:p-8 lg:grid-cols-[1fr_380px]">
        <section className="animate-rise panel-card p-5">
          <div className="font-display text-2xl uppercase tracking-tight">
            Alcance por rede
          </div>
          <div className="label-mono mt-1">
            soma de todos os posts · passe o mouse ou toque em uma rede para ver
            o último post
          </div>
          <div className="-mx-2 mt-4 space-y-1">
            {porRede.map((r) => (
              <LinhaRede key={r.rede} resumo={r} maior={maior} />
            ))}
          </div>
        </section>
        <aside className="animate-rise panel-card p-5 [animation-delay:120ms]">
          <div className="font-display text-2xl uppercase tracking-tight">
            Melhores posts
          </div>
          <div className="label-mono mt-1">por alcance</div>
          <div className="mt-4 space-y-2">
            {melhores.length === 0 && (
              <p className="py-8 text-center text-sm text-mute">
                Ainda sem dados de desempenho.
              </p>
            )}
            {melhores.map((p) => (
              <div
                key={p.id}
                className="rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5"
              >
                <div className="truncate text-sm">{p.titulo}</div>
                <div className="label-mono mt-1">
                  {p.rede} · {numeroCurto(p.alcance)} alcance ·{" "}
                  {porcentagem(p.engajamento)}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

// Linha de uma rede: o cartão com o último post abre ao passar o mouse (ou ao tocar, no celular).
function LinhaRede({ resumo, maior }: { resumo: ResumoRede; maior: number }) {
  const { rede, alcance, total, ultimo } = resumo;
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  const porToque = useRef(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverAnchor asChild>
        <button
          ref={ancora}
          type="button"
          aria-expanded={aberto}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setAberto(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setAberto(false);
          }}
          onPointerDown={(e) => {
            porToque.current = e.pointerType !== "mouse";
          }}
          onClick={() =>
            setAberto((atual) => (porToque.current ? !atual : true))
          }
          className="block w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-fg/[0.04] focus-visible:bg-fg/[0.04] focus-visible:outline-none"
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
        onInteractOutside={(e) => {
          // Toques na própria linha já alternam o cartão pelo onClick.
          if (ancora.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className="w-72 max-w-[calc(100vw-2rem)] border-line/70 bg-panel text-fg"
      >
        <div className="label-mono">último post · {rede}</div>
        {ultimo ? (
          <>
            <div className="mt-2 break-words text-sm font-medium">
              {ultimo.titulo}
            </div>
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
          <p className="mt-2 text-xs text-mute">
            Nenhum post criado para {rede} ainda.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
