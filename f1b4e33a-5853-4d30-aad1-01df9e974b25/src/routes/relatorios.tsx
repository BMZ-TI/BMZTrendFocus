import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { REDES, numeroCurto } from "@/lib/social";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Compare alcance e engajamento por rede social e veja quais posts renderam mais.",
      },
      { property: "og:title", content: "Relatórios — BMZ Trend Focus" },
      {
        property: "og:description",
        content: "Alcance e engajamento por rede, post a post.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("agendado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const lista = posts ?? [];
  const porRede = REDES.map((r) => {
    const doGrupo = lista.filter((p) => p.rede === r);
    const alcance = doGrupo.reduce((s, p) => s + p.alcance, 0);
    return { rede: r, alcance, total: doGrupo.length };
  });
  const maior = Math.max(1, ...porRede.map((r) => r.alcance));

  const melhores = [...lista]
    .sort((a, b) => b.alcance - a.alcance)
    .slice(0, 5);

  return (
    <AppShell titulo="Relatórios">
      <div className="grid gap-4 p-6 md:p-8 lg:grid-cols-[1fr_380px]">
        <section className="animate-rise panel-card p-5">
          <div className="font-display text-2xl uppercase tracking-tight">
            Alcance por rede
          </div>
          <div className="label-mono mt-1">soma de todos os posts</div>

          <div className="mt-5 space-y-4">
            {porRede.map((r) => (
              <div key={r.rede}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{r.rede}</span>
                  <span className="text-mute">
                    {numeroCurto(r.alcance)} · {r.total} posts
                  </span>
                </div>
                <div className="h-2 rounded-full bg-fg/8">
                  <div
                    className="h-2 rounded-full bg-volt"
                    style={{ width: `${(r.alcance / maior) * 100}%` }}
                  />
                </div>
              </div>
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
                  {Number(p.engajamento).toFixed(1).replace(".", ",")}%
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
