import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { consultaContas } from "@/lib/queries";

const NAV = [
  { to: "/", label: "Painel" },
  { to: "/calendario", label: "Calendário" },
  { to: "/composicao", label: "Composição" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/contas", label: "Contas" },
] as const;

type ContaMenu = {
  id: string;
  rede: string;
  handle: string;
  conectada: boolean;
  conectada_em: string | null;
};

function agoraTexto() {
  return new Date().toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Marca() {
  return (
    <>
      BMZ TREND FOCUS<span className="text-volt">.</span>
    </>
  );
}

// Conteúdo do menu: barra lateral no desktop e gaveta no celular.
function ConteudoMenu({
  pathname,
  contas,
  aoNavegar,
  aoSair,
}: {
  pathname: string;
  contas: ContaMenu[];
  aoNavegar: () => void;
  aoSair: () => void;
}) {
  return (
    <>
      <div className="animate-sweep font-display text-2xl tracking-wide">
        <Marca />
      </div>
      <div className="label-mono mt-1">central de comando</div>
      <nav className="mt-9 space-y-1 text-sm">
        {NAV.map((item) => {
          const ativo = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={aoNavegar}
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
        <div className="label-mono mb-2">Contas</div>
        {contas.length === 0 && (
          <p className="text-xs text-mute">Nenhuma rede cadastrada ainda.</p>
        )}
        {contas.map((c) => {
          const conectada = c.conectada && Boolean(c.conectada_em);
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 text-xs"
              title={conectada ? "Conectada" : "Não conectada"}
            >
              <span
                className={
                  conectada
                    ? "size-1.5 shrink-0 rounded-full bg-volt"
                    : "size-1.5 shrink-0 rounded-full bg-mute"
                }
              />
              <span className="truncate">
                {c.handle} · {c.rede}
              </span>
            </div>
          );
        })}
        <button
          onClick={aoSair}
          className="mt-4 w-full rounded-lg px-3 py-2 text-left text-xs text-mute transition-colors hover:bg-fg/5"
        >
          Sair da conta
        </button>
      </div>
    </>
  );
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
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!carregando && !session) navigate({ to: "/auth" });
  }, [carregando, session, navigate]);

  const { data: contas } = useQuery({ ...consultaContas, enabled: !!session });

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (carregando || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <span className="label-mono">carregando…</span>
      </div>
    );
  }

  const menu = (
    <ConteudoMenu
      pathname={pathname}
      contas={contas ?? []}
      aoNavegar={() => setMenuAberto(false)}
      aoSair={sair}
    />
  );

  return (
    <div className="flex min-h-screen bg-ink font-body text-fg">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col overflow-y-auto border-r border-line/70 p-5 md:flex">
        {menu}
      </aside>
      <main className="min-w-0 flex-1">
        {/* Abaixo de md: barra superior com o menu em gaveta. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/70 bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/" className="truncate font-display text-xl tracking-wide">
            <Marca />
          </Link>
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className="grid size-10 shrink-0 place-items-center rounded-lg ring-1 ring-fg/10 transition-colors hover:bg-fg/5"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              aria-describedby={undefined}
              className="flex w-[272px] flex-col overflow-y-auto border-line/70 bg-ink p-5 text-fg"
            >
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              {menu}
            </SheetContent>
          </Sheet>
        </div>
        <header className="relative overflow-hidden border-b border-line/70 bg-panel">
          <div className="pointer-events-none absolute -inset-8 -rotate-6 bg-gradient-to-br from-volt/15 via-transparent to-cyan/10" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-44 -skew-x-12 border-l border-volt/20 bg-volt/8" />
          <div className="relative mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between md:px-8 md:py-7">
            <div className="min-w-0">
              <div className="label-mono">{agoraTexto()}</div>
              <h1 className="animate-rise mt-2 break-words font-display text-3xl uppercase tracking-tight sm:text-4xl md:text-5xl">
                {titulo}
              </h1>
            </div>
            {acao && <div className="shrink-0">{acao}</div>}
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
