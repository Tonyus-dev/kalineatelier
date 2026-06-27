import { StatusSection } from "./configuracoes/StatusSection";
import { OllamaSection } from "./configuracoes/OllamaSection";
import { WhisperSection } from "./configuracoes/WhisperSection";
import { IdentitySection } from "./configuracoes/IdentitySection";
import { SettingsForm } from "./configuracoes/SettingsForm";

/**
 * Aba de Configurações do Atelier. Apenas compõe as seções; cada uma busca seus próprios
 * dados e usa o health/offline compartilhado via `useAtelier()`.
 */
export function AtelierConfiguracoes() {
  return (
    <div className="space-y-4">
      <StatusSection />
      <OllamaSection />
      <WhisperSection />
      <IdentitySection />
      <SettingsForm />
    </div>
  );
}
