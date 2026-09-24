import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { consultaPosts } from "@/lib/queries";
import { REDES, corDaRede, corPontoRede, formatarHora } from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: tituloPagina("Calendário") },
      {
        name: "description",
        content:
          "Veja mês a mês tudo o que está agendado em cada rede social e reorganize sua semana.",
      },
      { property: "og:title", content: tituloPagina("Calendário") },
      {
        property: "og:description",
        content: "Todos os posts agendados por rede, mês a mês.",
      },
    ],
  }),
  component: Calendario,
});

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function Calendario() {
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selecionado, setSelecionado] = useState<number | null>(() =>
    new Date().getDate(),
  );
  const { data: posts } = useQuery(consultaPosts);

  const primeiroDia = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const diasNoMes = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0,
  ).getDate();
  const offset = (primeiroDia.getDay() + 6) % 7;
  const celulas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  const hoje = new Date();

  function postsDoDia(dia: number) {
    return (posts ?? []).filter((p) => {
      const d = new Date(p.agendado_em);
      return (
        d.getFullYear() === ref.getFullYear() &&
        d.getMonth() === ref.getMonth() &&
        d.getDate() === dia
      );
    });
  }

  function mover(delta: number) {
    setRef(new Date(ref.getFullYear(), ref.getMonth() + delta, 1));
    setSelecionado(null);
  }

  const doSelecionado = selecionado === null ? [] : postsDoDia(selecionado);

  return (
    <AppShell
      titulo="Calendário"
      acao={
        <Link
          to="/composicao"
          className="rounded-lg bg-volt px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
        >
          Novo post
        </Link>
      }
    >
      <section className="animate-rise panel-card m-4 p-3 sm:m-6 sm:p-5 md:m-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-xl uppercase tracking-tight sm:text-2xl">
            {ref.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="flex gap-1 font-mono text-xs">
            <button
              onClick={() => mover(-1)}
              className="rounded-md bg-fg/5 px-2.5 py-1 text-mute hover:text-fg"
            >
              anterior
            </button>
            <button
              onClick={() => mover(1)}
              className="rounded-md bg-volt/15 px-2.5 py-1 text-volt ring-1 ring-volt/25"
            >
              próximo
            </button>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
          {DIAS.map((d) => (
            <span key={d} className="label-mono text-center sm:text-left">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {celulas.map((dia, i) => {
            if (dia === null)
              return (
                <div key={`v${i}`} className="min-h-[52px] sm:min-h-[104px]" />
              );
            const doDia = postsDoDia(dia);
            const eHoje =
              hoje.getDate() === dia &&
              hoje.getMonth() === ref.getMonth() &&
              hoje.getFullYear() === ref.getFullYear();
            const ativo = selecionado === dia;
            return (
              <button
                key={dia}
                type="button"
                onClick={() => setSelecionado(dia)}
                aria-pressed={ativo}
                aria-label={`Dia ${dia}: ${doDia.length} ${doDia.length === 1 ? "post" : "posts"}`}
                className={`min-h-[52px] min-w-0 rounded-lg bg-fg/[0.03] p-1 text-left transition-colors hover:bg-fg/[0.06] sm:min-h-[104px] sm:p-2 ${
                  ativo
                    ? "ring-2 ring-volt/60"
                    : eHoje
                      ? "ring-2 ring-volt/30"
                      : "ring-1 ring-fg/5"
                }`}
              >
                <div className="label-mono">{dia}</div>
                {/* Celular: um ponto por post, na cor da rede. */}
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {doDia.map((p) => (
                    <span
                      key={p.id}
                      className={`size-1.5 rounded-full ${corPontoRede(p.rede)}`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 hidden space-y-1 sm:block">
                  {doDia.map((p) => (
                    <div
                      key={p.id}
                      title={p.titulo}
                      className={`truncate rounded px-1.5 py-1 text-[10px] ${corDaRede(p.rede)}`}
                    >
                      {p.titulo} · {formatarHora(p.agendado_em)}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {selecionado !== null && (
          <div className="mt-4 border-t border-line/60 pt-4">
            <div className="label-mono mb-2">
              {new Date(
                ref.getFullYear(),
                ref.getMonth(),
                selecionado,
              ).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            {doSelecionado.length === 0 ? (
              <p className="text-sm text-mute">Nenhum post neste dia.</p>
            ) : (
              <div className="space-y-2">
                {doSelecionado.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5 sm:gap-3"
                  >
                    <span
                      className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(p.rede)}`}
                    >
                      {p.rede}
                    </span>
                    <span
                      className="min-w-0 flex-1 basis-40 truncate text-sm"
                      title={p.titulo}
                    >
                      {p.titulo}
                    </span>
                    <span className="label-mono">
                      {formatarHora(p.agendado_em)} · {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line/60 pt-3 text-[11px] text-mute">
          {REDES.map((r) => (
            <span key={r} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${corPontoRede(r)}`} />
              {r}
            </span>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
