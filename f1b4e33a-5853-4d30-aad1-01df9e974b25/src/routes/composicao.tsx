import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { gerarConteudo } from "@/lib/ai.functions";
import { consultaContas } from "@/lib/queries";
import {
  FORMATOS,
  REDES,
  TONS,
  corDaRede,
  formatarDataCompleta,
  paraInputLocal,
} from "@/lib/social";
import { tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/composicao")({
  head: () => ({
    meta: [
      { title: tituloPagina("Composição") },
      {
        name: "description",
        content:
          "Descreva a ideia e gere com IA o texto do post pronto para cada rede, depois agende em um clique.",
      },
      { property: "og:title", content: tituloPagina("Composição") },
      {
        property: "og:description",
        content: "Gere textos de post com IA e agende na hora.",
      },
    ],
  }),
  component: Composicao,
});

const botaoPrimario =
  "rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60";
const botaoSecundario =
  "rounded-lg px-4 py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5 disabled:opacity-60";

function Composicao() {
  const gerar = useServerFn(gerarConteudo);
  const queryClient = useQueryClient();
  const { data: contas } = useQuery(consultaContas);
  const [ideia, setIdeia] = useState("");
  const [rede, setRede] = useState<string>(REDES[0]);
  const [formato, setFormato] = useState<string>("Reels");
  const [tom, setTom] = useState<string>("Direto");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [quando, setQuando] = useState(() =>
    paraInputLocal(new Date(Date.now() + 3600000)),
  );
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);

  const perfil = contas?.find((c) => c.rede === rede)?.handle ?? "@seu.perfil";
  const dataPublicacao = new Date(quando);
  const dataInvalida = Number.isNaN(dataPublicacao.getTime());
  const noPassado = !dataInvalida && dataPublicacao.getTime() < Date.now();
  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  async function aoGerar() {
    if (ideia.trim().length < 3) {
      toast.error("Descreva a ideia do post primeiro.");
      return;
    }
    setGerando(true);
    try {
      const r = await gerar({ data: { ideia, rede, formato, tom } });
      setTexto(r.texto);
      if (!titulo) setTitulo(ideia.slice(0, 60));
      toast.success("Conteúdo gerado.");
    } catch {
      toast.error("A IA não respondeu agora. Tente novamente em instantes.");
    } finally {
      setGerando(false);
    }
  }

  function prontoParaSalvar() {
    if (!texto.trim() || !titulo.trim()) {
      toast.error("Dê um título e escreva o conteúdo antes de salvar.");
      return false;
    }
    if (dataInvalida) {
      toast.error("Escolha uma data de publicação válida.");
      return false;
    }
    return true;
  }

  async function salvar(status: "rascunho" | "agendado") {
    setSalvando(true);
    const { error } = await supabase.from("posts").insert({
      titulo,
      conteudo: texto,
      rede,
      status,
      agendado_em: dataPublicacao.toISOString(),
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    toast.success(status === "agendado" ? "Post agendado." : "Rascunho salvo.");
    return true;
  }

  // Agendar sempre passa pela pré-visualização do conteúdo completo.
  function abrirPreview() {
    if (prontoParaSalvar()) setPreviewAberto(true);
  }

  async function confirmarAgendamento() {
    if (dataPublicacao.getTime() < Date.now()) {
      toast.error("A data escolhida já passou. Ajuste a data para agendar.");
      return;
    }
    if (await salvar("agendado")) setPreviewAberto(false);
  }

  async function salvarRascunho() {
    if (prontoParaSalvar()) await salvar("rascunho");
  }

  async function salvarNaBiblioteca() {
    if (!texto.trim()) return;
    const { error } = await supabase.from("media_items").insert({
      titulo: titulo || ideia.slice(0, 60) || "Sem título",
      tipo: formato,
      conteudo: texto,
      rede,
    });
    if (error) {
      toast.error("Não foi possível salvar na biblioteca.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["biblioteca"] });
    toast.success("Salvo na biblioteca.");
  }

  return (
    <AppShell titulo="Composição">
      <div className="grid gap-4 p-6 md:p-8 lg:grid-cols-[1fr_380px]">
        <section className="animate-rise panel-card space-y-4 p-5">
          <div>
            <label className="label-mono" htmlFor="ideia">
              ideia do post
            </label>
            <textarea
              id="ideia"
              rows={4}
              value={ideia}
              onChange={(e) => setIdeia(e.target.value)}
              placeholder="Ex: lançamento do guia de reels para pequenos negócios"
              className="mt-1.5 w-full resize-none rounded-lg bg-fg/[0.03] p-3 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo
              label="rede"
              valor={rede}
              setValor={setRede}
              opcoes={[...REDES]}
            />
            <Campo
              label="formato"
              valor={formato}
              setValor={setFormato}
              opcoes={FORMATOS}
            />
            <Campo label="tom" valor={tom} setValor={setTom} opcoes={TONS} />
          </div>
          <button
            onClick={aoGerar}
            disabled={gerando}
            className="w-full rounded-lg bg-volt py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
          >
            {gerando
              ? "Gerando…"
              : texto
                ? "Gerar novamente com IA"
                : "Gerar conteúdo com IA"}
          </button>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className="label-mono" htmlFor="texto">
                conteúdo
              </label>
              <span className="label-mono">
                {texto.length} caracteres · {palavras} palavras
              </span>
            </div>
            <textarea
              id="texto"
              rows={10}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O texto gerado aparece aqui e pode ser editado."
              className="mt-1.5 w-full resize-y rounded-lg bg-fg/[0.03] p-3 text-sm leading-relaxed outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>
        </section>
        <aside className="animate-rise panel-card flex flex-col gap-4 p-5 [animation-delay:120ms]">
          <div>
            <div className="font-display text-2xl uppercase tracking-tight">
              Agendamento
            </div>
            <div className="label-mono mt-1">rede · data · hora</div>
          </div>
          <span
            className={`w-fit rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(rede)}`}
          >
            {rede}
          </span>
          <div>
            <label className="label-mono" htmlFor="titulo">
              título interno
            </label>
            <input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>
          <div>
            <label className="label-mono" htmlFor="quando">
              publicar em
            </label>
            <input
              id="quando"
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={abrirPreview}
              disabled={salvando}
              className={botaoPrimario}
            >
              Pré-visualizar e agendar
            </button>
            <button
              onClick={salvarRascunho}
              disabled={salvando}
              className={botaoSecundario}
            >
              Salvar rascunho
            </button>
            <button onClick={salvarNaBiblioteca} className={botaoSecundario}>
              Guardar na biblioteca
            </button>
          </div>
        </aside>
      </div>

      <Dialog open={previewAberto} onOpenChange={setPreviewAberto}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-line/70 bg-panel text-fg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal uppercase tracking-tight">
              Pré-visualização
            </DialogTitle>
            <DialogDescription className="text-mute">
              Confira o conteúdo completo antes de agendar.
            </DialogDescription>
          </DialogHeader>
          <article className="min-w-0 rounded-xl bg-ink p-4 ring-1 ring-fg/10">
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-volt/15 font-display text-volt ring-1 ring-volt/25">
                {(perfil.replace(/^@/, "").charAt(0) || "B").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{perfil}</div>
                <div className="label-mono mt-0.5">
                  {formato} · tom {tom.toLowerCase()}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] uppercase ${corDaRede(rede)}`}
              >
                {rede}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
              <TextoComHashtags texto={texto} />
            </p>
            <div className="label-mono mt-4 border-t border-line/60 pt-3">
              {texto.length} caracteres · {palavras} palavras
            </div>
          </article>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="label-mono">título interno</dt>
              <dd className="mt-1 break-words">{titulo}</dd>
            </div>
            <div>
              <dt className="label-mono">publicar em</dt>
              <dd className="mt-1 first-letter:uppercase">
                {dataInvalida ? "—" : formatarDataCompleta(dataPublicacao)}
              </dd>
            </div>
          </dl>
          {noPassado && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/25">
              A data escolhida já passou. Volte e ajuste a data para agendar.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setPreviewAberto(false)}
              className={botaoSecundario}
            >
              Voltar e editar
            </button>
            <button
              type="button"
              onClick={confirmarAgendamento}
              disabled={salvando || noPassado}
              className={botaoPrimario}
            >
              {salvando ? "Agendando…" : "Confirmar agendamento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// Destaca as hashtags do texto, como aparecem na rede.
function TextoComHashtags({ texto }: { texto: string }) {
  return texto.split(/(#[\p{L}\p{N}_]+)/u).map((parte, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-volt">
        {parte}
      </span>
    ) : (
      parte
    ),
  );
}

function Campo({
  label,
  valor,
  setValor,
  opcoes,
}: {
  label: string;
  valor: string;
  setValor: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <div>
      <label className="label-mono" htmlFor={label}>
        {label}
      </label>
      <select
        id={label}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-panel px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
      >
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
