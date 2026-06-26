# Plano

## Objetivo

Executar a varredura técnica completa do módulo Kuan-Yin e das rotas/migrações recentes, preparar o app para migração/self-host em Cloudflare, substituir os assets antigos pelos novos arquivos enviados com otimização forte (preferência por WebP), consolidar Kuan-Yin como rota principal ao lado de Kaline e Klio, e fechar com validação final funcional e visual.

## O que vou implementar

1. **Auditoria técnica e otimização estrutural**
   - Revisar e consolidar o estado atual das rotas, navegação, chat, funções server-side e integrações da faceta Kuan-Yin.
   - Corrigir pontos de fragilidade encontrados na auditoria já feita, especialmente o que afeta deploy fora da infraestrutura atual.
   - Remover acoplamentos restantes de Kuan-Yin ao chat geral quando ainda existirem.

2. **Preparação para Cloudflare**
   - Corrigir `src/lib/csp.ts` para não depender de `process.env` em nível de módulo, evitando falha silenciosa no Worker.
   - Atualizar `docs/self-host-cloudflare.md` com as variáveis realmente necessárias para o runtime atual, incluindo TTS/AI e URL pública.
   - Revisar padrões de server/runtime para manter compatibilidade com Worker e evitar regressões de deploy.

3. **Substituição e otimização dos novos assets**
   - Substituir os assets antigos correspondentes pelos novos arquivos enviados.
   - Converter os arquivos pesados para versões otimizadas, preferencialmente em WebP quando isso mantiver qualidade visual adequada.
   - Recortar/processar as maçãs para fundo removido.
   - Processar os avatares preservando cenário e círculo, removendo apenas o fundo externo quando aplicável.
   - Atualizar os ponteiros/referências do app para usar os novos assets otimizados.

4. **Kuan-Yin como rota principal de primeira classe**
   - Garantir que Kuan-Yin fique no mesmo nível de Kaline e Klio no sidebar e na navegação superior do chat.
   - Verificar que o fluxo de entrada, cabeçalho, links e seleção de facetas não deixem Kuan-Yin “embaixo” ou subordinada ao chat base.

5. **Modelo de uso híbrido para clientes**
   - Consolidar a base para os dois modos de acesso que você confirmou: login por cliente e portal por link/token.
   - Ajustar a estrutura do módulo Kuan-Yin para sustentar agenda integrada entre você, seus clientes e os clientes deles.
   - Validar que o chat de Kuan-Yin fique preparado para uso tanto seu quanto dos seus clientes na estruturação do negócio.

6. **Migrações e prontidão de dados**
   - Aplicar a revisão das migrações recentes com foco em integridade, índices, isolamento e suporte ao modelo híbrido.
   - Incluir a correção já identificada para `linked_user_id` em `kuanyin_clients` e os ajustes de portal/RLS necessários.
   - Confirmar que grants, políticas e estrutura fiquem coerentes com o uso autenticado e por portal.

7. **Verificação final**
   - Validar build/estabilidade após as mudanças.
   - Conferir navegação, tema por faceta, referências visuais e uso dos novos assets.
   - Fazer checagem final do estado funcional e do que ficou pronto para Cloudflare.

## Entregáveis

- Compatibilidade de runtime melhorada para Cloudflare/self-host.
- Documentação de self-host atualizada.
- Novo conjunto de assets substituindo os antigos, com compressão forte e uso preferencial de WebP.
- Maçãs recortadas sem fundo e avatares processados preservando cenário/círculo.
- Kuan-Yin consolidada como rota principal ao lado de Kaline e Klio.
- Estrutura de dados revisada para uso híbrido (login + portal).
- Verificação final do sistema.

## Detalhes técnicos

- Arquivos já identificados como prioritários: `src/lib/csp.ts`, `docs/self-host-cloudflare.md`, navegação/sidebar/chat relacionados à Kuan-Yin e migrações recentes de `kuanyin_*`.
- Os novos uploads têm arquivos entre ~1.1 MB e ~1.7 MB; a otimização vai focar em reduzir peso sem degradar excessivamente a nitidez visual.
- Quando houver diferença entre estética e performance, a regra será: WebP por padrão, mantendo qualidade suficiente para UI/avatar/ícone.
- Os assets antigos correspondentes serão substituídos, não mantidos em paralelo.
- A validação final incluirá conferência visual e técnica do fluxo principal.
