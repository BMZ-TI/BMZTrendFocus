import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { corDaRede, formatarData } from "@/lib/social";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Guarde legendas, roteiros e ideias aprovadas para reaproveitar em qualquer rede.",
      },
      { property: "og:title", content: "Biblioteca — BMZ Trend Focus" },
      {
        property: "og:description",
        content: "Legendas, roteiros e ideias salvas para reuso.",
      },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const queryClient = useQueryClient();

  const { data: itens } = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remover(id: string) {
    const { error } = await supabase.from("media_items").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success("Item removido.");
  }

  const lista = itens ?? [];

  return (
    <AppShell
      titulo="Biblioteca"
      acao={
        <Link
          to="/composicao"
          className="rounded-lg bg-volt px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
        >
          Criar conteúdo
        </Link>
      }
    >
      <div className="p-6 md:p-8">
        {lista.length === 0 ? (
          <div className="animate-rise panel-card p-10 text-center">
            <p className="text-sm text-mute">
              Nada guardado ainda. Gere um texto na composição e clique em
              “Guardar na biblioteca”.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((item, i) => (
              <article
                key={item.id}
                className="animate-rise panel-card flex flex-col p-5"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(item.rede ?? "")}`}
                  >
                    {item.rede ?? "Geral"}
                  </span>
                  <span className="label-mono">{item.tipo}</span>
                </div>
                <h2 className="mt-3 font-display text-xl uppercase tracking-tight">
                  {item.titulo}
                </h2>
                <p className="mt-2 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-mute">
                  {item.conteudo}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                  <span className="label-mono">
                    {formatarData(item.created_at)}
                  </span>
                  <button
                    onClick={() => remover(item.id)}
                    className="text-xs text-mute transition-colors hover:text-destructive"
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
