import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { concluirConexao, iniciarConexao, salvarCredenciais } from "@/lib/conexao.functions";
import { consultaContas } from "@/lib/queries";
import { API_REDES, REDES, corDaRede, formatarData } from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

type BuscaContas = {
  conexao?: "erro";
  rede?: string;
  motivo?: string;
  oauth_code?: string;
  oauth_state?: string;
};

// Retorno com erro (src/routes/api/oauth/callback/$rede.ts): a URL traz só o código do motivo.
const MOTIVOS: Record<string, string> = {
  cancelada: "A conexão foi cancelada ou recusada na rede.",
  invalida: "O retorno da rede veio incompleto. Tente conectar novamente.",
};

const botaoPrimario =
  "rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60";
const botaoSecundario =
  "rounded-lg px-4 py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5";

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Copiado.");
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

export const Route = createFileRoute("/contas")({
  validateSearch: (busca: Record<string, unknown>): BuscaContas => {
    const saida: BuscaContas = {};
    for (const chave of ["rede", "motivo", "oauth_code", "oauth_state"] as const) {
      const valor = busca[chave];
      if (typeof valor === "string" && valor) saida[chave] = valor;
    }
    if (busca["conexao"] === "erro") saida.conexao = "erro";
    return saida;
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
  const concluir = useServerFn(concluirConexao);
  const retornoTratado = useRef(false);
  const [rede, setRede] = useState<string>(REDES[0]);
  const [handle, setHandle] = useState("");
  const [conectando, setConectando] = useState<string | null>(null);
  const [modalRede, setModalRede] = useState<string | null>(null);
  const { data: contas } = useQuery(consultaContas);
  const { data: credenciais, isError: erroCredenciais } = useQuery({
    queryKey: ["credenciais"],
    queryFn: async () => {
      // O navegador só lê rede e Client ID; o segredo fica cifrado e é usado apenas no servidor.
      const { data, error } = await supabase
        .from("social_credenciais")
        .select("rede, client_id, atualizado_em");
      if (error) throw error;
      return data;
    },
  });
  const credencialDa = (nome: string) => credenciais?.find((c) => c.rede === nome);

  // Volta do OAuth: conclui a conexão uma vez só (o code vale um único uso), avisa e limpa a URL.
  useEffect(() => {
    if (retornoTratado.current) return;
    const limparUrl = () => navigate({ to: "/contas", search: {}, replace: true });
    const { rede: nomeRede, oauth_code: code, oauth_state: state } = busca;
    if (nomeRede && code && state) {
      retornoTratado.current = true;
      concluir({ data: { rede: nomeRede, code, state } })
        .then((resultado) => {
          if ("erro" in resultado) toast.error(resultado.erro);
          else toast.success(`${nomeRede} conectado com sucesso.`);
          queryClient.invalidateQueries({ queryKey: ["contas"] });
        })
        .catch(() => toast.error("Não foi possível concluir a conexão."))
        .finally(limparUrl);
    } else if (busca.conexao === "erro") {
      retornoTratado.current = true;
      toast.error(MOTIVOS[busca.motivo ?? ""] ?? "Não foi possível concluir a conexão.");
      limparUrl();
    }
  }, [busca, concluir, navigate, queryClient]);

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
    toast.success(
      credencialDa(rede)
        ? "Perfil adicionado. Use “Conectar” para autorizar a conta."
        : `Perfil adicionado. Em “Conectar”, cadastre as credenciais da API do ${rede}.`,
    );
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

  async function removerCredenciais(nome: string) {
    const { error } = await supabase.from("social_credenciais").delete().eq("rede", nome);
    if (error) {
      toast.error("Não foi possível remover as credenciais.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["credenciais"] });
    toast.success(`Credenciais do ${nome} removidas.`);
  }

  async function alternar(id: string, conectada: boolean) {
    const { error } = await supabase.from("social_accounts").update({ conectada }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o perfil.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["contas"] });
  }

  async function remover(id: string) {
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
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
          <div className="font-display text-2xl uppercase tracking-tight">Perfis do workspace</div>
          <div className="label-mono mt-1">rede · usuário · conexão · status</div>
          {erroCredenciais && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/25">
              Não foi possível carregar as credenciais das redes. Verifique se a migração 0002 foi
              aplicada no banco.
            </p>
          )}
          <div className="mt-4 space-y-2">
            {(contas ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-mute">Nenhum perfil cadastrado ainda.</p>
            )}
            {(contas ?? []).map((c) => {
              const credencial = credencialDa(c.rede);
              return (
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
                  {/* modal={false}: o menu fecha sem travar o modal de credenciais que ele abre. */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={conectando !== null}
                        className="inline-flex items-center gap-1 rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
                      >
                        {conectando === c.id ? "Abrindo…" : "Conectar"}
                        <ChevronDown className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-64 border-line/70 bg-panel text-fg"
                    >
                      <DropdownMenuLabel className="label-mono">
                        {c.rede} · {credencial ? "credenciais cadastradas" : "sem credenciais"}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setModalRede(c.rede)}>
                        {credencial ? "Editar credenciais da API" : "Cadastrar credenciais da API"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!credencial} onSelect={() => conectar(c.id)}>
                        {c.conectada_em ? "Reconectar" : "Conectar agora"}
                      </DropdownMenuItem>
                      {credencial && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => removerCredenciais(c.rede)}
                            className="text-destructive focus:text-destructive"
                          >
                            Remover credenciais
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    !credencial && (
                      <span className="font-mono text-[10px] uppercase text-mute">
                        sem credenciais
                      </span>
                    )
                  )}
                  <div className="ml-auto flex items-center gap-3">
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
              );
            })}
          </div>
        </section>
        <aside className="animate-rise panel-card p-5 [animation-delay:120ms]">
          <div className="font-display text-2xl uppercase tracking-tight">Adicionar perfil</div>
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
            Depois de adicionar, abra “Conectar” no perfil para cadastrar as credenciais da API da
            rede e autorizar a conta.
          </p>
        </aside>
      </div>

      {modalRede && (
        <ModalCredenciais
          rede={modalRede}
          clientIdAtual={credencialDa(modalRede)?.client_id ?? null}
          aoFechar={() => setModalRede(null)}
        />
      )}
    </AppShell>
  );
}

// Cadastro das credenciais do app da rede. Os dois campos são obrigatórios e mascarados.
function ModalCredenciais({
  rede,
  clientIdAtual,
  aoFechar,
}: {
  rede: string;
  clientIdAtual: string | null;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const salvar = useServerFn(salvarCredenciais);
  const info = API_REDES[rede];
  const [clientId, setClientId] = useState(clientIdAtual ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [salvando, setSalvando] = useState(false);
  const completo = clientId.trim() !== "" && clientSecret.trim() !== "";
  const urlRetorno = `${window.location.origin}/api/oauth/callback/${info?.slug ?? ""}`;

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!completo) return;
    setSalvando(true);
    try {
      const resultado = await salvar({
        data: { rede, clientId: clientId.trim(), clientSecret: clientSecret.trim() },
      });
      if ("erro" in resultado) {
        toast.error(resultado.erro);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["credenciais"] });
      toast.success(`Credenciais do ${rede} cadastradas.`);
      aoFechar();
    } catch {
      toast.error("Não foi possível salvar as credenciais.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar();
      }}
    >
      {/* Tamanho fixo (32rem × 35rem; no celular, mais alto): cabeçalho e rodapé fixos e só o
          corpo rola, na vertical, se a tela for baixa demais. */}
      <DialogContent className="flex h-[min(88vh,44rem)] w-[calc(100vw-2rem)] sm:h-[min(88vh,35rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border-line/70 bg-panel p-0 text-fg">
        <DialogHeader className="shrink-0 space-y-2 border-b border-line/60 px-6 pb-4 pr-12 pt-6 text-left">
          <span
            className={`w-fit rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(rede)}`}
          >
            {rede}
          </span>
          <DialogTitle className="font-display text-2xl font-normal uppercase tracking-tight">
            Credenciais da API
          </DialogTitle>
          <DialogDescription className="text-mute">
            Valem para todos os perfis {rede} da sua conta. O segredo é guardado cifrado e não volta
            a ser exibido.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-credenciais"
          onSubmit={cadastrar}
          autoComplete="off"
          className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-5"
        >
          <CampoSecreto
            id="credencial-id"
            rotulo={info?.campoId ?? "Client ID"}
            valor={clientId}
            aoMudar={setClientId}
          />
          <CampoSecreto
            id="credencial-segredo"
            rotulo={info?.campoSegredo ?? "Client Secret"}
            valor={clientSecret}
            aoMudar={setClientSecret}
            placeholder={clientIdAtual ? "Digite o segredo novamente para salvar" : undefined}
          />
          <div>
            <div className="label-mono">url de retorno · cadastre no app da rede</div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-ink px-3 py-2 ring-1 ring-fg/10">
              <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">
                {urlRetorno}
              </code>
              <button
                type="button"
                onClick={() => copiar(urlRetorno)}
                aria-label="Copiar URL de retorno"
                className="shrink-0 text-mute transition-colors hover:text-fg"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
          {info && (
            <p className="break-words text-xs leading-relaxed text-mute">
              {info.requisitos}{" "}
              <a
                href={info.portal}
                target="_blank"
                rel="noreferrer"
                className="text-volt underline-offset-2 hover:underline"
              >
                Abrir portal de desenvolvedores
              </a>
            </p>
          )}
        </form>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t border-line/60 px-6 py-4 sm:space-x-0">
          <button type="button" onClick={aoFechar} className={botaoSecundario}>
            Cancelar
          </button>
          <button
            type="submit"
            form="form-credenciais"
            disabled={!completo || salvando}
            className={botaoPrimario}
          >
            {salvando ? "Salvando…" : "Cadastrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Campo obrigatório mascarado como senha, com botão para mostrar o valor e corrigir.
function CampoSecreto({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string | undefined;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div>
      <label className="label-mono" htmlFor={id}>
        {rotulo} *
      </label>
      <div className="mt-1.5 flex items-center rounded-lg bg-fg/[0.03] ring-1 ring-fg/10 focus-within:ring-volt/50">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          required
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={placeholder ?? rotulo}
          autoComplete="new-password"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar valor" : "Mostrar valor"}
          aria-pressed={visivel}
          className="grid size-9 shrink-0 place-items-center text-mute transition-colors hover:text-fg"
        >
          {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
