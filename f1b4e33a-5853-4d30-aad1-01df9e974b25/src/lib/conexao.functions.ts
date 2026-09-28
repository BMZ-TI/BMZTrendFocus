import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REDES } from "@/lib/social";

const Rede = z.enum(REDES);

// Devolve a URL de autorização da rede do perfil; o navegador segue para ela.
export const iniciarConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ contaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string } | { erro: string }> => {
    const { data: conta } = await context.supabase
      .from("social_accounts")
      .select("id, rede")
      .eq("id", data.contaId)
      .maybeSingle();
    if (!conta) return { erro: "Perfil não encontrado." };
    const { montarUrlAutorizacao } = await import("./oauth.server");
    return montarUrlAutorizacao({ db: context.supabase, userId: context.userId, conta });
  });

// A página Contas recebe o code/state da rede e conclui a conexão com a sessão do usuário.
export const concluirConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        rede: Rede,
        code: z.string().min(1).max(4000),
        state: z.string().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { erro: string }> => {
    const { concluirConexao: concluir } = await import("./oauth.server");
    return concluir({ db: context.supabase, userId: context.userId, ...data });
  });

// Guarda o Client ID e o Client Secret do app da rede. O segredo é cifrado aqui e nunca volta
// ao navegador; as credenciais valem para todos os perfis daquela rede do usuário.
// Segredo em branco = manter o que já está guardado (troca só o Client ID).
export const salvarCredenciais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        rede: Rede,
        clientId: z.string().trim().min(1).max(500),
        clientSecret: z.string().trim().max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { erro: string }> => {
    if (!data.clientSecret) {
      const { data: linhas, error } = await context.supabase
        .from("social_credenciais")
        .update({ client_id: data.clientId, atualizado_em: new Date().toISOString() })
        .eq("user_id", context.userId)
        .eq("rede", data.rede)
        .select("rede");
      if (error) {
        console.error(error);
        return { erro: "Não foi possível salvar as credenciais." };
      }
      if (!linhas.length) return { erro: "Informe o segredo para cadastrar as credenciais." };
      return { ok: true };
    }
    const { cifrar } = await import("./oauth.server");
    const segredo = await cifrar(data.clientSecret);
    if (!segredo)
      return { erro: "Defina OAUTH_STATE_SECRET no servidor para guardar credenciais." };
    const { error } = await context.supabase.from("social_credenciais").upsert({
      user_id: context.userId,
      rede: data.rede,
      client_id: data.clientId,
      client_secret: segredo,
      atualizado_em: new Date().toISOString(),
    });
    if (error) {
      console.error(error);
      return { erro: "Não foi possível salvar as credenciais." };
    }
    return { ok: true };
  });
