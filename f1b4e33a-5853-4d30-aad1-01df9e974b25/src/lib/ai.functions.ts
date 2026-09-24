import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const Entrada = z.object({
  ideia: z.string().min(3).max(600),
  rede: z.string().min(2).max(40),
  formato: z.string().min(2).max(40),
  tom: z.string().min(2).max(40),
});

export const gerarConteudo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Entrada.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Chave de IA ausente");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system:
        "Você é um estrategista de conteúdo brasileiro. Escreva em português do Brasil, direto, sem clichês de IA. Responda apenas com o texto final do post, incluindo hashtags quando fizer sentido.",
      prompt: `Rede: ${data.rede}\nFormato: ${data.formato}\nTom: ${data.tom}\nIdeia: ${data.ideia}\n\nEscreva o conteúdo pronto para publicar. Máximo de 120 palavras.`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const texto = await result.text;
    return { texto: texto.trim() };
  });
