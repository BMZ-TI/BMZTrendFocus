import { Fragment, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FORMATOS, REDES, corDaRede, formatarData } from "@/lib/social";
import { cn, tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: tituloPagina("Biblioteca") },
      {
        name: "description",
        content:
          "Guarde legendas, roteiros, ideias e prompts aprovados para reaproveitar em qualquer rede.",
      },
      { property: "og:title", content: tituloPagina("Biblioteca") },
      {
        property: "og:description",
        content: "Legendas, roteiros, ideias e prompts salvos para reuso.",
      },
    ],
  }),
  component: Biblioteca,
});

type Item = Tables<"media_items">;
type Aba = "todos" | "prompts" | (typeof REDES)[number];
type Formulario = {
  id: string | null;
  categoria: "conteudo" | "prompt";
  titulo: string;
  tipo: string;
  rede: string;
  conteudo: string;
};

// Prompts ficam na mesma tabela (media_items), marcados pelo tipo.
const TIPO_PROMPT = "prompt";
const TIPOS = ["legenda", "roteiro", "hook", "hashtags", ...FORMATOS];
const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  ...REDES.map((rede) => ({ valor: rede, rotulo: rede })),
  { valor: "prompts", rotulo: "Prompts" },
];

const campo =
  "mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50";
const botaoPrimario =
  "rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60";
const botaoSecundario =
  "rounded-lg px-4 py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5";
const seloPrompt = "border border-dashed border-fg/30 text-fg";

function ehPrompt(item: Item) {
  return item.tipo.toLowerCase() === TIPO_PROMPT;
}

// Conteúdos e prompts são domínios separados: prompts só aparecem na aba Prompts.
function pertenceAba(item: Item, aba: Aba) {
  if (aba === "prompts") return ehPrompt(item);
  if (ehPrompt(item)) return false;
  return aba === "todos" || item.rede === aba;
}

function abaDoItem(item: Item): Aba {
  if (ehPrompt(item)) return "prompts";
  return REDES.find((rede) => rede === item.rede) ?? "todos";
}

function Biblioteca() {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<Aba>("todos");
  const [visualizando, setVisualizando] = useState<Item | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
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

  const lista = itens ?? [];
  const daAba = lista.filter((item) => pertenceAba(item, aba));

  function alterar<K extends keyof Formulario>(chave: K, valor: Formulario[K]) {
    setForm((atual) => (atual ? { ...atual, [chave]: valor } : atual));
  }

  function novo() {
    setForm({
      id: null,
      categoria: aba === "prompts" ? "prompt" : "conteudo",
      titulo: "",
      tipo: "legenda",
      rede: aba === "todos" || aba === "prompts" ? "" : aba,
      conteudo: "",
    });
  }

  function editar(item: Item) {
    setVisualizando(null);
    setForm({
      id: item.id,
      categoria: ehPrompt(item) ? "prompt" : "conteudo",
      titulo: item.titulo,
      tipo: ehPrompt(item) ? "legenda" : item.tipo,
      rede: item.rede ?? "",
      conteudo: item.conteudo,
    });
  }

  async function salvar() {
    if (!form) return;
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error("Título e conteúdo não podem ficar vazios.");
      return;
    }
    const dados = {
      titulo: form.titulo.trim(),
      tipo: form.categoria === "prompt" ? TIPO_PROMPT : form.tipo.trim() || "legenda",
      rede: form.rede || null,
      conteudo: form.conteudo,
    };
    setSalvando(true);
    const { data, error } = form.id
      ? await supabase.from("media_items").update(dados).eq("id", form.id).select().single()
      : await supabase.from("media_items").insert(dados).select().single();
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setForm(null);
    // Se a aba atual não mostra o item salvo, leva o usuário até onde ele aparece.
    if (!pertenceAba(data, aba)) setAba(abaDoItem(data));
    queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success(form.id ? "Item atualizado." : "Item adicionado à biblioteca.");
  }

  async function remover(id: string) {
    const { error } = await supabase.from("media_items").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    if (visualizando?.id === id) setVisualizando(null);
    queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success("Item removido.");
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const mensagemVazia =
    aba === "prompts"
      ? "Nenhum prompt salvo ainda. Guarde aqui os prompts que funcionaram."
      : aba === "todos"
        ? "Nada guardado ainda. Gere um texto na composição ou adicione um item manualmente."
        : `Nenhum item de ${aba} ainda.`;

  return (
    <AppShell
      titulo="Biblioteca"
      acao={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/composicao"
            className="rounded-lg px-4 py-2.5 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5"
          >
            Criar com IA
          </Link>
          <button
            type="button"
            onClick={novo}
            className="rounded-lg bg-volt px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110"
          >
            Adicionar novo
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-6 md:p-8">
        <Tabs value={aba} onValueChange={(valor) => setAba(valor as Aba)}>
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-panel p-1 text-mute ring-1 ring-fg/5">
            {ABAS.map(({ valor, rotulo }) => (
              <Fragment key={valor}>
                {valor === "prompts" && (
                  <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />
                )}
                <TabsTrigger
                  value={valor}
                  className="shrink-0 gap-2 rounded-lg px-3 py-1.5 data-[state=active]:bg-volt/15 data-[state=active]:text-volt data-[state=active]:shadow-none"
                >
                  {rotulo}
                  <span className="font-mono text-[10px] opacity-70">
                    {lista.filter((item) => pertenceAba(item, valor)).length}
                  </span>
                </TabsTrigger>
              </Fragment>
            ))}
          </TabsList>
        </Tabs>

        {daAba.length === 0 ? (
          <div className="animate-rise panel-card p-10 text-center">
            <p className="text-sm text-mute">{mensagemVazia}</p>
            <button type="button" onClick={novo} className={cn("mt-4", botaoPrimario)}>
              Adicionar novo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {daAba.map((item, i) => {
              const prompt = ehPrompt(item);
              return (
                <article
                  key={item.id}
                  className="animate-rise panel-card relative flex flex-col p-5 transition-colors hover:bg-fg/[0.02]"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 font-mono text-[10px] uppercase",
                        prompt ? seloPrompt : corDaRede(item.rede ?? ""),
                      )}
                    >
                      {prompt ? "Prompt" : (item.rede ?? "Geral")}
                    </span>
                    <span className="label-mono">
                      {prompt ? (item.rede ?? "qualquer rede") : item.tipo}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl uppercase tracking-tight">
                    {/* O ::after cobre o cartão inteiro: clicar em qualquer ponto abre o item. */}
                    <button
                      type="button"
                      onClick={() => setVisualizando(item)}
                      className="cursor-pointer text-left uppercase transition-colors after:absolute after:inset-0 hover:text-volt focus-visible:outline-none focus-visible:after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-volt/50"
                    >
                      {item.titulo}
                    </button>
                  </h2>
                  <p
                    className={cn(
                      "mb-4 mt-2 line-clamp-6 whitespace-pre-line leading-relaxed text-mute",
                      prompt ? "font-mono text-xs" : "text-sm",
                    )}
                  >
                    {item.conteudo}
                  </p>
                  <div className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                    <span className="label-mono">{formatarData(item.created_at)}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => copiar(item.conteudo)}
                        className="text-xs text-mute transition-colors hover:text-fg"
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => editar(item)}
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
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={visualizando !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setVisualizando(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-line/70 bg-panel text-fg sm:max-w-2xl">
          {visualizando && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-[10px] uppercase",
                      ehPrompt(visualizando) ? seloPrompt : corDaRede(visualizando.rede ?? ""),
                    )}
                  >
                    {ehPrompt(visualizando) ? "Prompt" : (visualizando.rede ?? "Geral")}
                  </span>
                  <span className="label-mono">
                    {ehPrompt(visualizando)
                      ? (visualizando.rede ?? "qualquer rede")
                      : visualizando.tipo}{" "}
                    · {formatarData(visualizando.created_at)}
                  </span>
                </div>
                <DialogTitle className="break-words pt-2 font-display text-2xl font-normal uppercase tracking-tight">
                  {visualizando.titulo}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Conteúdo completo do item da biblioteca.
                </DialogDescription>
              </DialogHeader>
              <div
                className={cn(
                  "whitespace-pre-wrap break-words rounded-xl bg-ink p-4 leading-relaxed ring-1 ring-fg/10",
                  ehPrompt(visualizando) ? "font-mono text-xs" : "text-sm",
                )}
              >
                {visualizando.conteudo || "Sem conteúdo."}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => remover(visualizando.id)}
                  className={cn(botaoSecundario, "hover:text-destructive")}
                >
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => copiar(visualizando.conteudo)}
                  className={botaoSecundario}
                >
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={() => editar(visualizando)}
                  className={botaoPrimario}
                >
                  Editar
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={form !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setForm(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-line/70 bg-panel text-fg sm:max-w-2xl">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-normal uppercase tracking-tight">
                  {form.id ? "Editar item" : "Adicionar novo"}
                </DialogTitle>
                <DialogDescription className="text-mute">
                  {form.categoria === "prompt"
                    ? "Guarde um prompt que funcionou para reutilizar depois."
                    : "O item fica registrado na biblioteca."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div
                  role="radiogroup"
                  aria-label="Categoria"
                  className="flex gap-1 rounded-lg bg-ink p-1 ring-1 ring-fg/10"
                >
                  {(["conteudo", "prompt"] as const).map((categoria) => (
                    <button
                      key={categoria}
                      type="button"
                      role="radio"
                      aria-checked={form.categoria === categoria}
                      onClick={() => alterar("categoria", categoria)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-sm transition-colors",
                        form.categoria === categoria
                          ? "bg-volt/15 text-volt"
                          : "text-mute hover:text-fg",
                      )}
                    >
                      {categoria === "prompt" ? "Prompt" : "Conteúdo"}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label-mono" htmlFor="form-titulo">
                    título
                  </label>
                  <input
                    id="form-titulo"
                    value={form.titulo}
                    onChange={(e) => alterar("titulo", e.target.value)}
                    className={campo}
                  />
                </div>
                <div className={form.categoria === "conteudo" ? "grid gap-3 sm:grid-cols-2" : ""}>
                  {form.categoria === "conteudo" && (
                    <div>
                      <label className="label-mono" htmlFor="form-tipo">
                        tipo
                      </label>
                      <input
                        id="form-tipo"
                        list="tipos-biblioteca"
                        value={form.tipo}
                        onChange={(e) => alterar("tipo", e.target.value)}
                        className={campo}
                      />
                      <datalist id="tipos-biblioteca">
                        {TIPOS.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                  )}
                  <div>
                    <label className="label-mono" htmlFor="form-rede">
                      rede
                    </label>
                    <select
                      id="form-rede"
                      value={form.rede}
                      onChange={(e) => alterar("rede", e.target.value)}
                      className={cn(campo, "bg-panel")}
                    >
                      <option value="">
                        {form.categoria === "prompt" ? "Qualquer rede" : "Geral"}
                      </option>
                      {REDES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label-mono" htmlFor="form-conteudo">
                    {form.categoria === "prompt" ? "prompt" : "conteúdo"}
                  </label>
                  <textarea
                    id="form-conteudo"
                    rows={12}
                    value={form.conteudo}
                    onChange={(e) => alterar("conteudo", e.target.value)}
                    placeholder={
                      form.categoria === "prompt"
                        ? "Cole aqui o prompt que deu certo."
                        : "Texto, legenda, roteiro…"
                    }
                    className={cn(
                      campo,
                      "resize-y p-3 leading-relaxed",
                      form.categoria === "prompt" && "font-mono text-xs",
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <button type="button" onClick={() => setForm(null)} className={botaoSecundario}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvar}
                  disabled={salvando}
                  className={botaoPrimario}
                >
                  {salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Adicionar"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
