import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { corDaRede, formatarHora } from "@/lib/social";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Veja mês a mês tudo o que está agendado em cada rede social e reorganize sua semana.",
      },
      { property: "og:title", content: "Calendário — BMZ Trend Focus" },
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

  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("agendado_em");
      if (error) throw error;
      return data;
    },
  });

  const primeiroDia = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const diasNoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
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
  }

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
      <section className="animate-rise panel-card m-6 p-5 md:m-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-2xl uppercase tracking-tight">
            {ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
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

        <div className="mb-2 grid grid-cols-7 gap-2">
          {DIAS.map((d) => (
            <span key={d} className="label-mono">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {celulas.map((dia, i) => {
            if (dia === null)
              return <div key={`v${i}`} className="min-h-[104px] rounded-lg" />;
            const doDia = postsDoDia(dia);
            const eHoje =
              hoje.getDate() === dia &&
              hoje.getMonth() === ref.getMonth() &&
              hoje.getFullYear() === ref.getFullYear();
            return (
              <div
                key={dia}
                className={`min-h-[104px] rounded-lg bg-fg/[0.03] p-2 ring-1 ${
                  eHoje ? "ring-2 ring-volt/40" : "ring-fg/5"
                }`}
              >
                <div className="label-mono">{dia}</div>
                <div className="mt-1.5 space-y-1">
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
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-line/60 pt-3 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-volt" />
            Instagram
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-cyan" />
            TikTok
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-fg/25" />
            LinkedIn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-destructive" />
            YouTube
          </span>
        </div>
      </section>
    </AppShell>
  );
}
