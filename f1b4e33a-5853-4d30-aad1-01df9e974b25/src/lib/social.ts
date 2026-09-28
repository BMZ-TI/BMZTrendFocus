export const REDES = ["Instagram", "TikTok", "LinkedIn", "YouTube", "Facebook"] as const;

export type Rede = (typeof REDES)[number];

export const STATUS = ["rascunho", "agendado", "publicado"] as const;

export function corDaRede(rede: string) {
  switch (rede) {
    case "Instagram":
      return "bg-volt/15 text-volt ring-1 ring-volt/25";
    case "TikTok":
      return "bg-cyan/15 text-cyan ring-1 ring-cyan/25";
    case "LinkedIn":
      return "bg-fg/10 text-fg ring-1 ring-fg/15";
    case "YouTube":
      return "bg-destructive/15 text-destructive ring-1 ring-destructive/25";
    default:
      return "bg-fg/5 text-mute ring-1 ring-fg/10";
  }
}

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function numeroCurto(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

export const FORMATOS = ["Reels", "Carrossel", "Post estático", "Story", "Artigo"];

export const TONS = ["Direto", "Amigável", "Provocativo", "Técnico", "Inspirador"];

// Cor sólida da rede, para marcadores pequenos (pontos do calendário, legenda).
export function corPontoRede(rede: string) {
  switch (rede) {
    case "Instagram":
      return "bg-volt";
    case "TikTok":
      return "bg-cyan";
    case "LinkedIn":
      return "bg-fg/40";
    case "YouTube":
      return "bg-destructive";
    default:
      return "bg-mute";
  }
}

export function formatarDataCompleta(data: Date | string) {
  return new Date(data).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Valor aceito por <input type="datetime-local">, no fuso do navegador.
export function paraInputLocal(data: Date) {
  const deslocamento = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16);
}

// O que cada rede exige para a conexão OAuth: nomes dos campos no portal, onde criar o app,
// o que habilitar e o caminho de retorno (<origem>/api/oauth/callback/<slug>).
export const API_REDES: Record<
  string,
  { slug: string; campoId: string; campoSegredo: string; portal: string; requisitos: string }
> = {
  Instagram: {
    slug: "instagram",
    campoId: "Instagram App ID",
    campoSegredo: "Instagram App Secret",
    portal: "https://developers.facebook.com/apps",
    requisitos:
      "App da Meta com o produto Instagram (login empresarial) e as permissões instagram_business_basic e instagram_business_content_publish. Só funciona com contas Business ou Creator.",
  },
  Facebook: {
    slug: "facebook",
    campoId: "App ID",
    campoSegredo: "App Secret",
    portal: "https://developers.facebook.com/apps",
    requisitos:
      "App da Meta com Facebook Login for Business e as permissões pages_show_list, pages_manage_posts e pages_read_engagement.",
  },
  TikTok: {
    slug: "tiktok",
    campoId: "Client Key",
    campoSegredo: "Client Secret",
    portal: "https://developers.tiktok.com/apps",
    requisitos:
      "App com Login Kit e Content Posting API, com os escopos user.info.basic e video.publish.",
  },
  LinkedIn: {
    slug: "linkedin",
    campoId: "Client ID",
    campoSegredo: "Client Secret",
    portal: "https://www.linkedin.com/developers/apps",
    requisitos:
      "App com os produtos Sign In with LinkedIn using OpenID Connect e Share on LinkedIn.",
  },
  YouTube: {
    slug: "youtube",
    campoId: "Client ID",
    campoSegredo: "Client Secret",
    portal: "https://console.cloud.google.com/apis/credentials",
    requisitos:
      "Cliente OAuth do tipo Aplicativo da Web no Google Cloud, com a YouTube Data API v3 ativada e a tela de consentimento configurada.",
  },
};
