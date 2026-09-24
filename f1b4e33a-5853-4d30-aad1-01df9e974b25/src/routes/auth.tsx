import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { tituloPagina } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: tituloPagina("Entrar") },
      {
        name: "description",
        content:
          "Acesse o BMZ Trend Focus para agendar posts, gerar conteúdo com IA e acompanhar suas redes.",
      },
      { property: "og:title", content: tituloPagina("Entrar") },
      {
        property: "og:description",
        content: "Acesse sua central de comando de redes sociais.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { session, carregando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!carregando && session) navigate({ to: "/" });
  }, [carregando, session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada. Confirme pelo e-mail para entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível continuar.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComDemo() {
    setEnviando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@prisma.app",
        password: "Prisma#Demo2026",
      });
      if (error) throw error;
      navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível entrar com a conta demo.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-6 font-body text-fg">
      <div className="pointer-events-none absolute -left-24 -top-24 size-[520px] -rotate-6 bg-gradient-to-br from-volt/15 via-transparent to-cyan/10" />

      <div className="relative w-full max-w-sm">
        <div className="animate-sweep font-display text-3xl tracking-wide">
          BMZ TREND FOCUS<span className="text-volt">.</span>
        </div>
        <div className="label-mono mt-1">central de comando</div>

        <form
          onSubmit={enviar}
          className="animate-rise panel-card mt-6 space-y-4 p-6"
        >
          <div>
            <label className="label-mono" htmlFor="email">
              e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>
          <div>
            <label className="label-mono" htmlFor="senha">
              senha
            </label>
            <input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1.5 w-full rounded-lg bg-fg/[0.03] px-3 py-2 text-sm outline-none ring-1 ring-fg/10 focus:ring-volt/50"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-volt py-2.5 text-sm font-semibold text-ink ring-1 ring-black/10 transition hover:brightness-110 disabled:opacity-60"
          >
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={entrarComGoogle}
            className="w-full rounded-lg py-2.5 text-sm text-mute ring-1 ring-fg/10 transition hover:bg-fg/5"
          >
            Continuar com o Google
          </button>

          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="w-full text-center text-xs text-mute hover:text-fg"
          >
            {modo === "entrar"
              ? "Ainda não tem conta? Criar agora"
              : "Já tenho conta. Entrar"}
          </button>
        </form>

        <div className="animate-rise panel-card mt-4 p-4">
          <div className="label-mono">conta de demonstração</div>
          <p className="mt-1.5 text-xs text-mute">
            demo@prisma.app · Prisma#Demo2026
          </p>
          <button
            type="button"
            disabled={enviando}
            onClick={entrarComDemo}
            className="mt-3 w-full rounded-lg py-2 text-sm text-volt ring-1 ring-volt/30 transition hover:bg-volt/10 disabled:opacity-60"
          >
            Entrar com a conta demo
          </button>
        </div>
      </div>
    </div>
  );
}
