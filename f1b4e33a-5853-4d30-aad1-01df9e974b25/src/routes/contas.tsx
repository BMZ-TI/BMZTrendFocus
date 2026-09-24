import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { iniciarConexao } from "@/lib/conexao.functions";
import { consultaContas } from "@/lib/queries";
import { REDES, corDaRede, formatarData } from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

type BuscaContas = { conexao?: "ok" | "erro"; rede?: string; motivo?: string };

// Retorno do OAuth (src/lib/oauth.server.ts): a URL traz só o código do motivo.
const MOTIVOS: Record<string, string> = {
  cancelada: "A conexão foi cancelada ou recusada na rede.",
  invalida: "O link de conexão expirou ou é inválido. Tente novamente.",
  config: "A conexão com esta rede ainda não foi configurada no servidor.",
  perfil: "Perfil não encontrado.",
  falha: "Não foi possível concluir a conexão. Tente novamente.",
};

export const Route = createFileRoute("/contas")({
  validateSearch: (busca: Record<string, unknown>): BuscaContas => {
    const { conexao, rede, motivo } = busca;
    return {
      ...(conexao === "ok" || conexao === "erro" ? { conexao } : {}),
      ...(typeof rede === "string" ? { rede } : {}),
      ...(typeof motivo === "string" ? { motivo } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: tituloPagina("Contas") },
      {
        name: "description",
        content:
          "Cadastre os perfis de Instagram, TikTok, LinkedIn, YouTube e Facebook usados nos agendamentos.",
      },
      { property: "og:title", content: tituloPagina("Contas") },
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
  const navigate = useNavigate();
  const busca = Route.useSearch();
  const iniciar = useServerFn(iniciarConexao);
  const avisado = useRef(false);
  const [rede, setRede] = useState<string>(REDES[0]);
  const [handle, setHandle] = useState("");
  const [conectando, setConectando] = useState<string | null>(null);
  const { data: contas } = useQuery(consultaContas);

  // Volta do OAuth: avisa o resultado uma vez e limpa a URL.
  useEffect(() => {
    if (!busca.conexao || avisado.current) return;
    avisado.current = true;
    const nomeRede = REDES.find((r) => r === busca.rede) ?? "Perfil";
    if (busca.conexao === "ok")
      toast.success(`${nomeRede} conectado com sucesso.`);
    else
      toast.error(
        MOTIVOS[busca.motivo ?? ""] ?? "Não foi possível concluir a conexão.",
      );
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    navigate({ to: "/contas", search: {}, replace: true });
  }, [busca, navigate, queryClient]);

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

  async function conectar(id: string) {
    setConectando(id);
    try {
      const resultado = await iniciar({ data: { contaId: id } });
      if ("url" in resultado) {
        window.location.assign(resultado.url);
        return;
      }
      toast.error(resultado.erro);
    } catch {
      toast.error("Não foi possível iniciar a conexão.");
    }
    setConectando(null);
  }

  async function alternar(id: string, conectada: boolean) {
    const { error } = await supabase
      .from("social_accounts")
      .update({ conectada })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o perfil.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["contas"] });
  }

  async function remover(id: string) {
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível remover o perfil.");
      return;
    }
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
          <div className="label-mono mt-1">
            rede · usuário · conexão · status
          </div>
          <div className="mt-4 space-y-2">
            {(contas ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-mute">
                Nenhum perfil cadastrado ainda.
              </p>
            )}
            {(contas ?? []).map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-fg/5 sm:gap-3"
              >
                <span
                  className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(c.rede)}`}
                >
                  {c.rede}
                </span>
                <span className="min-w-0 truncate text-sm" title={c.handle}>
                  {c.handle}
                </span>
                {c.conectada_em ? (
                  <span
                    className="rounded-md bg-volt/15 px-2 py-1 font-mono text-[10px] uppercase text-volt ring-1 ring-volt/25"
                    title={`Conectado em ${formatarData(c.conectada_em)}${
                      c.usuario_externo ? ` como ${c.usuario_externo}` : ""
                    }`}
                  >
                    ✓ conectado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => conectar(c.id)}
                    disabled={conectando !== null}
                    className="rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {conectando === c.id ? "Abrindo…" : "Conectar agora"}
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {c.conectada_em && (
                    <button
                      type="button"
                      onClick={() => conectar(c.id)}
                      disabled={conectando !== null}
                      className="text-xs text-mute transition-colors hover:text-fg disabled:opacity-60"
                    >
                      {conectando === c.id ? "Abrindo…" : "Reconectar"}
                    </button>
                  )}
                  <button
                    onClick={() => alternar(c.id, !c.conectada)}
                    className={
                      c.conectada
                        ? "rounded-md bg-volt/15 px-2.5 py-1 font-mono text-[10px] uppercase text-volt ring-1 ring-volt/25"
                        : "rounded-md px-2.5 py-1 font-mono text-[10px] uppercase text-mute ring-1 ring-fg/10"
                    }
                  >
                    {c.conectada ? "ativa" : "pausada"}
                  </button>
                  <button
                    onClick={() => remover(c.id)}
                    className="text-xs text-mute transition-colors hover:text-destructive"
                  >
                    Remover
                  </button>
                </div>
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
          <p className="mt-4 text-xs leading-relaxed text-mute">
            Depois de adicionar, use “Conectar agora” para autorizar o acesso à
            conta na própria rede.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
