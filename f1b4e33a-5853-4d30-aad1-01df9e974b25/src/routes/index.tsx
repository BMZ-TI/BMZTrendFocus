import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { corDaRede, formatarHora, numeroCurto } from "@/lib/social";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Acompanhe alcance, engajamento e os próximos posts agendados das suas redes sociais.",
      },
      { property: "og:title", content: "Painel — BMZ Trend Focus" },
      {
        property: "og:description",
        content: "Alcance, engajamento e próximos posts em um só lugar.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
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

  const lista = posts ?? [];
  const publicados = lista.filter((p) => p.status === "publicado");
  const agendados = lista.filter((p) => p.status === "agendado");
  const alcance = publicados.reduce((s, p) => s + p.alcance, 0);
  const engajamento = publicados.length
    ? publicados.reduce((s, p) => s + Number(p.engajamento), 0) / publicados.length
    : 0;

  const proximos = agendados
    .filter((p) => new Date(p.agendado_em) >= new Date(Date.now() - 86400000))
    .slice(0, 6);

  return (
    <AppShell
      titulo="Painel"
      acao={
        <Link
          to="/composicao"
          className="rounded-lg bg-volt px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
        >
          Nova composição
        </Link>
      }
    >
      <div className="grid gap-4 p-6 pb-4 md:grid-cols-3 md:p-8 md:pb-4">
        <div className="animate-rise panel-card p-5">
          <div className="label-mono">Alcance total</div>
          <div className="mt-2 font-display text-4xl">{numeroCurto(alcance)}</div>
          <div className="mt-1 text-[11px] font-medium text-volt">
            {publicados.length} posts publicados
          </div>
        </div>
        <div className="animate-rise panel-card p-5 [animation-delay:60ms]">
          <div className="label-mono">Engajamento médio</div>
          <div className="mt-2 font-display text-4xl">
            {engajamento.toFixed(1).replace(".", ",")}%
          </div>
          <div className="mt-1 text-[11px] font-medium text-volt">
            média das publicações
          </div>
        </div>
        <div className="animate-rise panel-card p-5 [animation-delay:120ms]">
          <div className="label-mono">Agendados</div>
          <div className="mt-2 font-display text-4xl">{agendados.length}</div>
          <div className="mt-1 text-[11px] text-mute">
            {lista.length} itens no total
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 pb-8 md:px-8 lg:grid-cols-[1fr_360px]">
        <section className="animate-rise panel-card p-5 [animation-delay:180ms]">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-display text-2xl uppercase tracking-tight">
              Próximos posts
            </div>
            <Link to="/calendario" className="label-mono hover:text-fg">
              ver calendário
            </Link>
          </div>

          {proximos.length === 0 ? (
            <p className="py-10 text-center text-sm text-mute">
              Nada agendado ainda. Crie sua primeira composição.
            </p>
          ) : (
            <div className="space-y-2">
              {proximos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5"
                >
                  <span
                    className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(p.rede)}`}
                  >
                    {p.rede}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{p.titulo}</div>
                    <div className="label-mono mt-0.5">
                      {new Date(p.agendado_em).toLocaleDateString("pt-BR")} ·{" "}
                      {formatarHora(p.agendado_em)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="animate-rise panel-card flex flex-col p-5 [animation-delay:240ms]">
          <div className="font-display text-2xl uppercase tracking-tight">
            Composição IA
          </div>
          <div className="label-mono mt-1">gerar legenda · roteiro</div>
          <p className="mt-4 min-h-[96px] rounded-lg bg-fg/[0.03] p-3 text-sm leading-relaxed ring-1 ring-fg/5">
            Descreva a ideia do post e a IA escreve o texto pronto para publicar,
            no tom e no formato de cada rede.
          </p>
          <Link
            to="/composicao"
            className="mt-3 rounded-lg bg-volt py-2 text-center text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
          >
            Abrir composição
          </Link>
          <Link
            to="/biblioteca"
            className="mt-2 rounded-lg py-2 text-center text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5"
          >
            Ver biblioteca
          </Link>
        </aside>
      </div>
    </AppShell>
  );
}
