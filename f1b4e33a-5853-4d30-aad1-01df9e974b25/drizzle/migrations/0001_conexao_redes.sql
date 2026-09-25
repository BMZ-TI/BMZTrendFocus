-- CONEXÃO REAL (OAUTH) DAS CONTAS SOCIAIS
ALTER TABLE public.social_accounts
  ADD COLUMN conectada_em timestamptz,
  ADD COLUMN usuario_externo text;

-- Tokens ficam fora do alcance do navegador: sem políticas RLS, só o servidor (service_role) acessa.
CREATE TABLE public.social_tokens (
  conta_id uuid PRIMARY KEY REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expira_em timestamptz,
  escopos text,
  id_externo text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.social_tokens FROM anon, authenticated;
GRANT ALL ON public.social_tokens TO service_role;
ALTER TABLE public.social_tokens ENABLE ROW LEVEL SECURITY;