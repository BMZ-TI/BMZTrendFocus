-- CREDENCIAIS DOS APPS DAS REDES (cadastradas na tela Contas, uma por usuário e rede)
CREATE TABLE public.social_credenciais (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rede text NOT NULL,
  client_id text NOT NULL,
  -- Cifrado pelo servidor (AES-GCM com OAUTH_STATE_SECRET): o navegador só vê texto cifrado.
  client_secret text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rede)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_credenciais TO authenticated;
GRANT ALL ON public.social_credenciais TO service_role;
ALTER TABLE public.social_credenciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credenciais proprias" ON public.social_credenciais FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tokens passam a ser gravados com a sessão do próprio usuário (sem service role), já cifrados.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_tokens TO authenticated;
CREATE POLICY "tokens proprios" ON public.social_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
