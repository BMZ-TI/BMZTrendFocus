import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Consultas compartilhadas entre páginas: mesma chave, mesma função e mesma ordem.
export const consultaPosts = queryOptions({
  queryKey: ["posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("agendado_em");
    if (error) throw error;
    return data;
  },
});

export const consultaContas = queryOptions({
  queryKey: ["contas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
