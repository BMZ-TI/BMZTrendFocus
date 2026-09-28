import { createFileRoute } from "@tanstack/react-router";
import { API_REDES } from "@/lib/social";

// Retorno do OAuth de cada rede: /api/oauth/callback/instagram, /facebook, /tiktok, /linkedin, /youtube.
// Só repassa code/state para a página Contas, que conclui a conexão com a sessão do usuário.
// Os nomes oauth_code/oauth_state evitam que o cliente do Supabase confunda com o login dele.
export const Route = createFileRoute("/api/oauth/callback/$rede")({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const url = new URL(request.url);
        const rede = Object.keys(API_REDES).find((nome) => API_REDES[nome]?.slug === params.rede);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const busca = new URLSearchParams({ rede: rede ?? "" });
        if (url.searchParams.get("error")) {
          busca.set("conexao", "erro");
          busca.set("motivo", "cancelada");
        } else if (!rede || !code || !state) {
          busca.set("conexao", "erro");
          busca.set("motivo", "invalida");
        } else {
          busca.set("oauth_code", code);
          busca.set("oauth_state", state);
        }
        return new Response(null, { status: 302, headers: { location: `/contas?${busca}` } });
      },
    },
  },
});
