// Hook simples para ler/escrever o perfil local (Kaline Offline, sem multiusuário).
//
// Simplificação deliberada em relação à versão online: não há Storage local
// no `local-server`, então o avatar é salvo como data URL (base64) dentro do
// próprio registro de settings (chave "profile"), em vez de em um bucket
// separado com URL assinada.
import { useEffect, useState, useCallback } from "react";
import { getLocalSetting, putLocalSetting } from "@/lib/local/local-api-client";

export type Gender = "feminino" | "masculino" | "neutro";

export type Profile = {
  id: "local";
  display_name: string | null;
  avatar_url: string | null; // data URL (base64) ou null
  gender: Gender | null;
};

const SETTINGS_KEY = "profile";

function parseProfile(value: unknown): Profile {
  const raw = (value ?? {}) as Partial<Profile>;
  return {
    id: "local",
    display_name: typeof raw.display_name === "string" ? raw.display_name : null,
    avatar_url: typeof raw.avatar_url === "string" ? raw.avatar_url : null,
    gender:
      raw.gender === "feminino" || raw.gender === "masculino" || raw.gender === "neutro"
        ? raw.gender
        : null,
  };
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { value } = await getLocalSetting(SETTINGS_KEY);
    setProfile(parseProfile(value));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, avatarSignedUrl: profile?.avatar_url ?? null, loading, reload: load };
}

export async function saveProfile(patch: {
  display_name?: string | null;
  avatar_url?: string | null;
  gender?: Gender | null;
}) {
  const { value } = await getLocalSetting(SETTINGS_KEY);
  const current = parseProfile(value);
  await putLocalSetting(SETTINGS_KEY, { ...current, ...patch });
}

export async function uploadAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

// Helpers de pronome de tratamento baseado em gênero.
// Default: neutro/feminino quando desconhecido (histórico do app é feminino).
export function welcomeGreeting(gender: Gender | null | undefined): string {
  if (gender === "masculino") return "Bem-vindo de volta.";
  if (gender === "neutro") return "Bem-vinde de volta.";
  return "Bem-vinda de volta.";
}
