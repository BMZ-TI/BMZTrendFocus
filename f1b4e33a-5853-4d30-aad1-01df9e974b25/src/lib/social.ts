export const REDES = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Facebook",
] as const;

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

export const FORMATOS = [
  "Reels",
  "Carrossel",
  "Post estático",
  "Story",
  "Artigo",
];

export const TONS = [
  "Direto",
  "Amigável",
  "Provocativo",
  "Técnico",
  "Inspirador",
];

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
