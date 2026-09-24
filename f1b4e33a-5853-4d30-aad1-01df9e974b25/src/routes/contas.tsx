import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { REDES, corDaRede } from "@/lib/social";

export const Route = createFileRoute("/contas")({
  head: () => ({
    meta: [
      { title: "Contas — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Cadastre os perfis de Instagram, TikTok, LinkedIn, YouTube e Facebook usados nos agendamentos.",
      },
      { property: "og:title", content: "Contas — BMZ Trend Focus" },
      {
        property: "og:description",
        content: "Gerencie os perfis conectados ao seu painel.",
      },
    ],
  }),
  component: Contas,
});

function Contas() {
  const queryClient = useQueryClient();
  const [rede, setRede] = useState<string>(REDES[0]);
  const [handle, setHandle] = useState("");

  const { data: contas } = useQuery({
    queryKey: ["contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    const { error } = await supabase
      .from("social_accounts")
      .insert({ rede, handle: handle.trim() });
    if (error) {
      toast.error("Não foi possível adicionar o perfil.");
      return;
    }
    setHandle("");
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    toast.success("Perfil adicionado.");
  }

  async function alternar(id: string, conectada: boolean) {
    await supabase.from("social_accounts").update({ conectada }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["contas"] });
  }

  async function remover(id: string) {
    await supabase.from("social_accounts").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    toast.success("Perfil removido.");
  }

  return (
    <AppShell titulo="Contas">
      <div className="grid gap-4 p-6 md:p-8 lg:grid-cols-[1fr_360px]">
        <section className="animate-rise panel-card p-5">
          <div className="font-display text-2xl uppercase tracking-tight">
            Perfis do workspace
          </div>
          <div className="label-mono mt-1">rede · usuário · status</div>

          <div className="mt-4 space-y-2">
            {(contas ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-mute">
                Nenhum perfil cadastrado ainda.
              </p>
            )}
            {(contas ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5"
              >
                <span
                  className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(c.rede)}`}
                >
                  {c.rede}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{c.handle}</span>
                <button
                  onClick={() => alternar(c.id, !c.conectada)}
                  className={
                    c.conectada
                      ? "rounded-md bg-volt/15 px-2.5 py-1 font-mono text-[10px] uppercase text-volt ring-1 ring-volt/25"
                      : "rounded-md px-2.5 py-1 font-mono text-[10px] uppercase text-mute ring-1 ring-fg/10"
                  }
                >
                  {c.conectada ? "conectada" : "pausada"}
                </button>
                <button
                  onClick={() => remover(c.id)}
                  className="text-xs text-mute transition-colors hover:text-destructive"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="animate-rise panel-card p-5 [animation-delay:120ms]">
          <div className="font-display text-2xl uppercase tracking-tight">
            Adicionar perfil
          </div>
          <form onSubmit={adicionar} className="mt-4 space-y-3">
            <div>
              <label className="label-mono" htmlFor="rede">
                rede
              </label>
              <select
                id="rede"
                value={rede}
                onChange={(e) => setRede(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-panel px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
              >
                {REDES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-mono" htmlFor="handle">
                usuário do perfil
              </label>
              <input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@seu.perfil"
                className="mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-volt py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
            >
              Adicionar
            </button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
