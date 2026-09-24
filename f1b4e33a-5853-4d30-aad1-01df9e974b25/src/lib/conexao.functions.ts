import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Entrada = z.object({ contaId: z.string().uuid() });

// Devolve a URL de autorização da rede do perfil; o navegador segue para ela.
export const iniciarConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Entrada.parse(input))
  .handler(
    async ({ data, context }): Promise<{ url: string } | { erro: string }> => {
      const { data: conta } = await context.supabase
        .from("social_accounts")
        .select("id, rede")
        .eq("id", data.contaId)
        .maybeSingle();
      if (!conta) return { erro: "Perfil não encontrado." };
      const { montarUrlAutorizacao } = await import("./oauth.server");
      return montarUrlAutorizacao({
        id: conta.id,
        userId: context.userId,
        rede: conta.rede,
      });
    },
  );
