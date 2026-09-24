import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Painel" },
  { to: "/calendario", label: "Calendário" },
  { to: "/composicao", label: "Composição" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/contas", label: "Contas" },
] as const;

function agoraTexto() {
  return new Date().toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppShell({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  const { session, carregando } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!carregando && !session) navigate({ to: "/auth" });
  }, [carregando, session, navigate]);

  const { data: contas } = useQuery({
    queryKey: ["contas"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  if (carregando || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <span className="label-mono">carregando…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink font-body text-fg">
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line/70 p-5 md:flex">
        <div className="animate-sweep font-display text-2xl tracking-wide">
          BMZ TREND FOCUS<span className="text-volt">.</span>
        </div>
        <div className="label-mono mt-1">central de comando</div>

        <nav className="mt-9 space-y-1 text-sm">
          {NAV.map((item) => {
            const ativo = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  ativo
                    ? "flex items-center gap-3 rounded-lg bg-volt/10 px-3 py-2 font-medium text-volt ring-1 ring-volt/25"
                    : "flex items-center gap-3 rounded-lg px-3 py-2 text-mute transition-colors hover:bg-fg/5"
                }
              >
                {ativo && <span className="size-1.5 rounded-full bg-volt" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-line/70 pt-5">
          <div className="label-mono mb-2">Conectado</div>
          {(contas ?? []).length === 0 && (
            <p className="text-xs text-mute">Nenhuma rede conectada ainda.</p>
          )}
          {(contas ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span
                className={
                  c.conectada
                    ? "size-1.5 rounded-full bg-volt"
                    : "size-1.5 rounded-full bg-mute"
                }
              />
              {c.handle} · {c.rede}
            </div>
          ))}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="mt-4 w-full rounded-lg px-3 py-2 text-left text-xs text-mute transition-colors hover:bg-fg/5"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="relative overflow-hidden border-b border-line/70 bg-panel">
          <div className="pointer-events-none absolute -inset-8 -rotate-6 bg-gradient-to-br from-volt/15 via-transparent to-cyan/10" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-44 -skew-x-12 border-l border-volt/20 bg-volt/8" />
          <div className="relative flex items-end justify-between gap-4 px-6 py-7 md:px-8">
            <div>
              <div className="label-mono">{agoraTexto()}</div>
              <h1 className="animate-rise mt-2 font-display text-4xl uppercase tracking-tight md:text-5xl">
                {titulo}
              </h1>
            </div>
            {acao}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
