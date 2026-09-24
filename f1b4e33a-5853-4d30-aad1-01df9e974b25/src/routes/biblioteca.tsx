import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FORMATOS, REDES, corDaRede, formatarData } from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: tituloPagina("Biblioteca") },
      {
        name: "description",
        content:
          "Guarde legendas, roteiros e ideias aprovadas para reaproveitar em qualquer rede.",
      },
      { property: "og:title", content: tituloPagina("Biblioteca") },
      {
        property: "og:description",
        content: "Legendas, roteiros e ideias salvas para reuso.",
      },
    ],
  }),
  component: Biblioteca,
});

type Item = Tables<"media_items">;
type Edicao = { titulo: string; tipo: string; rede: string; conteudo: string };

const TIPOS = ["legenda", "roteiro", "hook", "hashtags", ...FORMATOS];

const campo =
  "mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50";
const botaoPrimario =
  "rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60";
const botaoSecundario =
  "rounded-lg px-4 py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5";

function paraEdicao(item: Item): Edicao {
  return {
    titulo: item.titulo,
    tipo: item.tipo,
    rede: item.rede ?? "",
    conteudo: item.conteudo,
  };
}

function Biblioteca() {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState<Item | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);
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

  function abrir(item: Item, editar = false) {
    setAberto(item);
    setEdicao(editar ? paraEdicao(item) : null);
  }

  function fechar() {
    setAberto(null);
    setEdicao(null);
  }

  async function salvarEdicao() {
    if (!aberto || !edicao) return;
    if (!edicao.titulo.trim() || !edicao.conteudo.trim()) {
      toast.error("Título e conteúdo não podem ficar vazios.");
      return;
    }
    setSalvando(true);
    const { data, error } = await supabase
      .from("media_items")
      .update({
        titulo: edicao.titulo.trim(),
        tipo: edicao.tipo.trim() || "legenda",
        rede: edicao.rede || null,
        conteudo: edicao.conteudo,
      })
      .eq("id", aberto.id)
      .select()
      .single();
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar as alterações.");
      return;
    }
    setAberto(data);
    setEdicao(null);
    queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success("Item atualizado.");
  }

  async function remover(id: string) {
    const { error } = await supabase.from("media_items").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    if (aberto?.id === id) fechar();
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((item, i) => (
              <article
                key={item.id}
                className="animate-rise panel-card relative flex flex-col p-5 transition-colors hover:bg-fg/[0.02]"
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
                  {/* O ::after cobre o cartão inteiro: clicar em qualquer ponto abre o item. */}
                  <button
                    type="button"
                    onClick={() => abrir(item)}
                    className="cursor-pointer text-left uppercase transition-colors after:absolute after:inset-0 hover:text-volt focus-visible:outline-none focus-visible:after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-volt/50"
                  >
                    {item.titulo}
                  </button>
                </h2>
                <p className="mb-4 mt-2 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-mute">
                  {item.conteudo}
                </p>
                <div className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                  <span className="label-mono">
                    {formatarData(item.created_at)}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => abrir(item, true)}
                      className="text-xs text-mute transition-colors hover:text-fg"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remover(item.id)}
                      className="text-xs text-mute transition-colors hover:text-destructive"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={aberto !== null}
        onOpenChange={(abrirDialogo) => {
          if (!abrirDialogo) fechar();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-line/70 bg-panel text-fg sm:max-w-2xl">
          {aberto && edicao && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-normal uppercase tracking-tight">
                  Editar item
                </DialogTitle>
                <DialogDescription className="text-mute">
                  As alterações ficam salvas na biblioteca.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="label-mono" htmlFor="edicao-titulo">
                    título
                  </label>
                  <input
                    id="edicao-titulo"
                    value={edicao.titulo}
                    onChange={(e) =>
                      setEdicao({ ...edicao, titulo: e.target.value })
                    }
                    className={campo}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-mono" htmlFor="edicao-tipo">
                      tipo
                    </label>
                    <input
                      id="edicao-tipo"
                      list="tipos-biblioteca"
                      value={edicao.tipo}
                      onChange={(e) =>
                        setEdicao({ ...edicao, tipo: e.target.value })
                      }
                      className={campo}
                    />
                    <datalist id="tipos-biblioteca">
                      {TIPOS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label-mono" htmlFor="edicao-rede">
                      rede
                    </label>
                    <select
                      id="edicao-rede"
                      value={edicao.rede}
                      onChange={(e) =>
                        setEdicao({ ...edicao, rede: e.target.value })
                      }
                      className={`${campo} bg-panel`}
                    >
                      <option value="">Geral</option>
                      {REDES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label-mono" htmlFor="edicao-conteudo">
                    conteúdo
                  </label>
                  <textarea
                    id="edicao-conteudo"
                    rows={12}
                    value={edicao.conteudo}
                    onChange={(e) =>
                      setEdicao({ ...edicao, conteudo: e.target.value })
                    }
                    className={`${campo} resize-y p-3 leading-relaxed`}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setEdicao(null)}
                  className={botaoSecundario}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarEdicao}
                  disabled={salvando}
                  className={botaoPrimario}
                >
                  {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
              </DialogFooter>
            </>
          )}
          {aberto && !edicao && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <span
                    className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(aberto.rede ?? "")}`}
                  >
                    {aberto.rede ?? "Geral"}
                  </span>
                  <span className="label-mono">
                    {aberto.tipo} · {formatarData(aberto.created_at)}
                  </span>
                </div>
                <DialogTitle className="break-words pt-2 font-display text-2xl font-normal uppercase tracking-tight">
                  {aberto.titulo}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Conteúdo completo do item da biblioteca.
                </DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap break-words rounded-xl bg-ink p-4 text-sm leading-relaxed ring-1 ring-fg/10">
                {aberto.conteudo || "Sem conteúdo."}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => remover(aberto.id)}
                  className={`${botaoSecundario} hover:text-destructive`}
                >
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => setEdicao(paraEdicao(aberto))}
                  className={botaoPrimario}
                >
                  Editar
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
