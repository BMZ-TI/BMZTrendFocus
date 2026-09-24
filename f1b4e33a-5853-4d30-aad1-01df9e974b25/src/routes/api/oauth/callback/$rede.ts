import { createFileRoute } from "@tanstack/react-router";

// Retorno do OAuth de cada rede: /api/oauth/callback/instagram, /facebook, /tiktok, /linkedin, /youtube
export const Route = createFileRoute("/api/oauth/callback/$rede")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { concluirConexao } = await import("@/lib/oauth.server");
        return concluirConexao(request, params.rede);
      },
    },
  },
});
