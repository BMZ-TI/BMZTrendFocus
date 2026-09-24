import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { gerarConteudo } from "@/lib/ai.functions";
import { REDES, corDaRede } from "@/lib/social";

export const Route = createFileRoute("/composicao")({
  head: () => ({
    meta: [
      { title: "Composição — BMZ Trend Focus" },
      {
        name: "description",
        content:
          "Descreva a ideia e gere com IA o texto do post pronto para cada rede, depois agende em um clique.",
      },
      { property: "og:title", content: "Composição — BMZ Trend Focus" },
      {
        property: "og:description",
        content: "Gere textos de post com IA e agende na hora.",
      },
    ],
  }),
  component: Composicao,
});

const FORMATOS = ["Reels", "Carrossel", "Post estático", "Story", "Artigo"];
const TONS = ["Direto", "Amigável", "Provocativo", "Técnico", "Inspirador"];

function Composicao() {
  const gerar = useServerFn(gerarConteudo);
  const queryClient = useQueryClient();

  const [ideia, setIdeia] = useState("");
  const [rede, setRede] = useState<string>(REDES[0]);
  const [formato, setFormato] = useState<string>("Reels");
  const [tom, setTom] = useState<string>("Direto");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [quando, setQuando] = useState(() =>
    new Date(Date.now() + 3600000).toISOString().slice(0, 16),
  );
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

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

  async function agendar(status: "rascunho" | "agendado") {
    if (!texto.trim() || !titulo.trim()) {
      toast.error("Dê um título e escreva o conteúdo antes de salvar.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("posts").insert({
      titulo,
      conteudo: texto,
      rede,
      status,
      agendado_em: new Date(quando).toISOString(),
    });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    toast.success(status === "agendado" ? "Post agendado." : "Rascunho salvo.");
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
            <Campo label="rede" valor={rede} setValor={setRede} opcoes={[...REDES]} />
            <Campo label="formato" valor={formato} setValor={setFormato} opcoes={FORMATOS} />
            <Campo label="tom" valor={tom} setValor={setTom} opcoes={TONS} />
          </div>

          <button
            onClick={aoGerar}
            disabled={gerando}
            className="w-full rounded-lg bg-volt py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
          >
            {gerando ? "Gerando…" : "Gerar conteúdo com IA"}
          </button>

          <div>
            <label className="label-mono" htmlFor="texto">
              conteúdo
            </label>
            <textarea
              id="texto"
              rows={10}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O texto gerado aparece aqui e pode ser editado."
              className="mt-1.5 w-full resize-none rounded-lg bg-fg/[0.03] p-3 text-sm leading-relaxed outline-none ring-1 ring-fg/10 focus:ring-volt/50"
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
              onClick={() => agendar("agendado")}
              disabled={salvando}
              className="rounded-lg bg-volt py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
            >
              Agendar
            </button>
            <button
              onClick={() => agendar("rascunho")}
              disabled={salvando}
              className="rounded-lg py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5"
            >
              Salvar rascunho
            </button>
            <button
              onClick={salvarNaBiblioteca}
              className="rounded-lg py-2 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5"
            >
              Guardar na biblioteca
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
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
