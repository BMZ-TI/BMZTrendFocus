// Conexão OAuth das contas sociais ("Conectar agora" em Contas).
// Somente servidor: usa os segredos dos apps de cada rede e grava os tokens com a service role.
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Json = Record<string, unknown>;

type Tokens = {
  accessToken: string;
  refreshToken: string | null;
  expiraEm: number | null;
  escopos: string | null;
  idExterno: string | null;
};

type Credenciais = { clientId: string; clientSecret: string };

type Provedor = {
  slug: string;
  env: string;
  autorizacao: string;
  paramCliente: "client_id" | "client_key";
  escopos: string;
  extras?: Record<string, string>;
  trocarCodigo: (
    dados: Credenciais & { code: string; redirectUri: string },
  ) => Promise<Tokens>;
  perfil: (
    accessToken: string,
  ) => Promise<{ id: string | null; usuario: string | null }>;
};

// c = conta, u = usuário, r = rede, e = expiração (ms), n = nonce
type Estado = { c: string; u: string; r: string; e: number; n: string };

// Códigos lidos pela página Contas; nunca texto livre na URL.
export type MotivoFalha =
  "cancelada" | "invalida" | "config" | "perfil" | "falha" | "rede";

const GRAPH = "v23.0";

function texto(valor: unknown) {
  if (typeof valor === "number") return String(valor);
  return typeof valor === "string" && valor ? valor : null;
}

function lista(valor: unknown) {
  return Array.isArray(valor) ? valor.join(",") : texto(valor);
}

function numero(valor: unknown) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function objeto(valor: unknown): Json {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Json)
    : {};
}

function primeiro(valor: unknown): Json {
  return objeto(Array.isArray(valor) ? valor[0] : valor);
}

async function pedirJson(url: string, init?: RequestInit): Promise<Json> {
  const resposta = await fetch(url, init);
  const corpo = objeto(await resposta.json().catch(() => null));
  const erro = corpo["error"];
  const codigo = typeof erro === "string" ? erro : texto(objeto(erro)["code"]);
  // O TikTok responde {"error": {"code": "ok"}} mesmo quando dá certo.
  if (!resposta.ok || (codigo !== null && codigo !== "ok")) {
    const detalhe =
      texto(corpo["error_description"]) ??
      texto(corpo["error_message"]) ??
      texto(objeto(erro)["message"]) ??
      codigo ??
      `HTTP ${resposta.status}`;
    throw new Error(`${new URL(url).host}: ${detalhe}`);
  }
  return corpo;
}

function formulario(campos: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(campos),
  };
}

function comBearer(accessToken: string): RequestInit {
  return { headers: { authorization: `Bearer ${accessToken}` } };
}

function exigirToken(corpo: Json, rede: string) {
  const token = texto(corpo["access_token"]);
  if (!token) throw new Error(`${rede} não devolveu o token de acesso.`);
  return token;
}

const PROVEDORES: Record<string, Provedor> = {
  Instagram: {
    slug: "instagram",
    env: "INSTAGRAM",
    autorizacao: "https://www.instagram.com/oauth/authorize",
    paramCliente: "client_id",
    escopos: "instagram_business_basic,instagram_business_content_publish",
    async trocarCodigo({ code, redirectUri, clientId, clientSecret }) {
      const resposta = await pedirJson(
        "https://api.instagram.com/oauth/access_token",
        formulario({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      );
      // A API atual devolve {"data": [{...}]}; versões antigas, o objeto direto.
      const curto = Array.isArray(resposta["data"])
        ? primeiro(resposta["data"])
        : resposta;
      // Troca o token curto (1 hora) pelo de longa duração (~60 dias).
      const longo = await pedirJson(
        `https://graph.instagram.com/access_token?${new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: clientSecret,
          access_token: exigirToken(curto, "Instagram"),
        })}`,
      );
      return {
        accessToken: exigirToken(longo, "Instagram"),
        refreshToken: null,
        expiraEm: numero(longo["expires_in"]),
        escopos: lista(curto["permissions"]),
        idExterno: texto(curto["user_id"]),
      };
    },
    async perfil(accessToken) {
      const eu = await pedirJson(
        `https://graph.instagram.com/${GRAPH}/me?${new URLSearchParams({
          fields: "user_id,username",
          access_token: accessToken,
        })}`,
      );
      return {
        id: texto(eu["user_id"]) ?? texto(eu["id"]),
        usuario: texto(eu["username"]),
      };
    },
  },
  Facebook: {
    slug: "facebook",
    env: "FACEBOOK",
    autorizacao: `https://www.facebook.com/${GRAPH}/dialog/oauth`,
    paramCliente: "client_id",
    escopos: "pages_show_list,pages_manage_posts,pages_read_engagement",
    async trocarCodigo({ code, redirectUri, clientId, clientSecret }) {
      const endpoint = `https://graph.facebook.com/${GRAPH}/oauth/access_token`;
      const curto = await pedirJson(
        `${endpoint}?${new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        })}`,
      );
      // Troca o token curto (horas) pelo de longa duração (~60 dias).
      const longo = await pedirJson(
        `${endpoint}?${new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: exigirToken(curto, "Facebook"),
        })}`,
      );
      return {
        accessToken: exigirToken(longo, "Facebook"),
        refreshToken: null,
        expiraEm: numero(longo["expires_in"]),
        escopos: null,
        idExterno: null,
      };
    },
    async perfil(accessToken) {
      const eu = await pedirJson(
        `https://graph.facebook.com/${GRAPH}/me?${new URLSearchParams({
          fields: "id,name",
          access_token: accessToken,
        })}`,
      );
      return { id: texto(eu["id"]), usuario: texto(eu["name"]) };
    },
  },
  TikTok: {
    slug: "tiktok",
    env: "TIKTOK",
    autorizacao: "https://www.tiktok.com/v2/auth/authorize/",
    paramCliente: "client_key",
    escopos: "user.info.basic,video.publish",
    async trocarCodigo({ code, redirectUri, clientId, clientSecret }) {
      const r = await pedirJson(
        "https://open.tiktokapis.com/v2/oauth/token/",
        formulario({
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      );
      return {
        accessToken: exigirToken(r, "TikTok"),
        refreshToken: texto(r["refresh_token"]),
        expiraEm: numero(r["expires_in"]),
        escopos: lista(r["scope"]),
        idExterno: texto(r["open_id"]),
      };
    },
    async perfil(accessToken) {
      const r = await pedirJson(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
        comBearer(accessToken),
      );
      const usuario = objeto(objeto(r["data"])["user"]);
      return {
        id: texto(usuario["open_id"]),
        usuario: texto(usuario["display_name"]),
      };
    },
  },
  LinkedIn: {
    slug: "linkedin",
    env: "LINKEDIN",
    autorizacao: "https://www.linkedin.com/oauth/v2/authorization",
    paramCliente: "client_id",
    escopos: "openid profile w_member_social",
    async trocarCodigo({ code, redirectUri, clientId, clientSecret }) {
      const r = await pedirJson(
        "https://www.linkedin.com/oauth/v2/accessToken",
        formulario({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      );
      return {
        accessToken: exigirToken(r, "LinkedIn"),
        refreshToken: texto(r["refresh_token"]),
        expiraEm: numero(r["expires_in"]),
        escopos: lista(r["scope"]),
        idExterno: null,
      };
    },
    async perfil(accessToken) {
      const r = await pedirJson(
        "https://api.linkedin.com/v2/userinfo",
        comBearer(accessToken),
      );
      return { id: texto(r["sub"]), usuario: texto(r["name"]) };
    },
  },
  YouTube: {
    slug: "youtube",
    env: "YOUTUBE",
    autorizacao: "https://accounts.google.com/o/oauth2/v2/auth",
    paramCliente: "client_id",
    escopos:
      "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
    // offline + consent garantem o refresh_token.
    extras: {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    },
    async trocarCodigo({ code, redirectUri, clientId, clientSecret }) {
      const r = await pedirJson(
        "https://oauth2.googleapis.com/token",
        formulario({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      );
      return {
        accessToken: exigirToken(r, "YouTube"),
        refreshToken: texto(r["refresh_token"]),
        expiraEm: numero(r["expires_in"]),
        escopos: lista(r["scope"]),
        idExterno: null,
      };
    },
    async perfil(accessToken) {
      const r = await pedirJson(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        comBearer(accessToken),
      );
      const canal = primeiro(r["items"]);
      const snippet = objeto(canal["snippet"]);
      return {
        id: texto(canal["id"]),
        usuario: texto(snippet["customUrl"]) ?? texto(snippet["title"]),
      };
    },
  },
};

const codificador = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function deBase64url(valor: string) {
  return Uint8Array.from(
    atob(valor.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}

async function chaveEstado() {
  const segredo =
    process.env["OAUTH_STATE_SECRET"] ||
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!segredo) return null;
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(`bmz-oauth-state:${segredo}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// O state leva conta e usuário assinados (HMAC): o retorno não depende da sessão do navegador.
async function assinarEstado(chave: CryptoKey, estado: Estado) {
  const corpo = base64url(codificador.encode(JSON.stringify(estado)));
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    codificador.encode(corpo),
  );
  return `${corpo}.${base64url(new Uint8Array(assinatura))}`;
}

async function lerEstado(valor: string | null): Promise<Estado | null> {
  const chave = await chaveEstado();
  const [corpo, assinatura] = (valor ?? "").split(".");
  if (!chave || !corpo || !assinatura) return null;
  try {
    const valido = await crypto.subtle.verify(
      "HMAC",
      chave,
      deBase64url(assinatura),
      codificador.encode(corpo),
    );
    if (!valido) return null;
    const estado = JSON.parse(
      new TextDecoder().decode(deBase64url(corpo)),
    ) as Estado;
    return estado.e > Date.now() ? estado : null;
  } catch {
    return null;
  }
}

// APP_URL fixa a origem atrás de proxy; precisa ser igual à URL de retorno cadastrada na rede.
function urlRetorno(provedor: Provedor, request: Request) {
  const origem =
    process.env["APP_URL"]?.replace(/\/+$/, "") || new URL(request.url).origin;
  return `${origem}/api/oauth/callback/${provedor.slug}`;
}

function credenciais(provedor: Provedor): Credenciais | null {
  const clientId = process.env[`${provedor.env}_CLIENT_ID`];
  const clientSecret = process.env[`${provedor.env}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export async function montarUrlAutorizacao(conta: {
  id: string;
  userId: string;
  rede: string;
}): Promise<{ url: string } | { erro: string }> {
  const provedor = PROVEDORES[conta.rede];
  if (!provedor)
    return { erro: `A conexão com ${conta.rede} ainda não é suportada.` };
  const cred = credenciais(provedor);
  if (!cred) {
    return {
      erro: `Conexão com ${conta.rede} ainda não configurada: defina ${provedor.env}_CLIENT_ID e ${provedor.env}_CLIENT_SECRET no servidor.`,
    };
  }
  const chave = await chaveEstado();
  if (!chave)
    return {
      erro: "Defina OAUTH_STATE_SECRET no servidor para habilitar as conexões.",
    };
  const state = await assinarEstado(chave, {
    c: conta.id,
    u: conta.userId,
    r: conta.rede,
    e: Date.now() + 10 * 60_000,
    n: base64url(crypto.getRandomValues(new Uint8Array(12))),
  });
  const params = new URLSearchParams({
    [provedor.paramCliente]: cred.clientId,
    redirect_uri: urlRetorno(provedor, getRequest()),
    response_type: "code",
    scope: provedor.escopos,
    state,
    ...provedor.extras,
  });
  return { url: `${provedor.autorizacao}?${params}` };
}

export async function concluirConexao(
  request: Request,
  slug: string,
): Promise<Response> {
  const url = new URL(request.url);
  const achado = Object.entries(PROVEDORES).find(([, p]) => p.slug === slug);
  const rede = achado?.[0] ?? "";
  const voltar = (motivo?: MotivoFalha) => {
    const busca = new URLSearchParams({
      conexao: motivo ? "erro" : "ok",
      rede,
    });
    if (motivo) busca.set("motivo", motivo);
    return new Response(null, {
      status: 302,
      headers: { location: `/contas?${busca}` },
    });
  };
  if (!achado) return voltar("rede");
  const provedor = achado[1];

  if (url.searchParams.get("error")) return voltar("cancelada");
  const code = url.searchParams.get("code");
  const estado = await lerEstado(url.searchParams.get("state"));
  if (!code || !estado || estado.r !== rede) return voltar("invalida");
  const cred = credenciais(provedor);
  if (!cred) return voltar("config");

  try {
    const { data: conta } = await supabaseAdmin
      .from("social_accounts")
      .select("id, user_id")
      .eq("id", estado.c)
      .maybeSingle();
    if (!conta || conta.user_id !== estado.u) return voltar("perfil");

    const tokens = await provedor.trocarCodigo({
      ...cred,
      code,
      redirectUri: urlRetorno(provedor, request),
    });
    const perfil = await provedor
      .perfil(tokens.accessToken)
      .catch((erro: unknown) => {
        console.error(erro);
        return { id: null, usuario: null };
      });
    const agora = new Date();
    const { error: erroToken } = await supabaseAdmin
      .from("social_tokens")
      .upsert({
        conta_id: conta.id,
        user_id: conta.user_id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expira_em: tokens.expiraEm
          ? new Date(agora.getTime() + tokens.expiraEm * 1000).toISOString()
          : null,
        escopos: tokens.escopos,
        id_externo: perfil.id ?? tokens.idExterno,
        atualizado_em: agora.toISOString(),
      });
    if (erroToken) throw erroToken;
    const { error: erroConta } = await supabaseAdmin
      .from("social_accounts")
      .update({
        conectada: true,
        conectada_em: agora.toISOString(),
        usuario_externo: perfil.usuario,
      })
      .eq("id", conta.id);
    if (erroConta) throw erroConta;
    return voltar();
  } catch (erro) {
    console.error(erro);
    return voltar("falha");
  }
}
