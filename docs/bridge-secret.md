# Olhar de Kairós — chave local

A Kaline Local usa `KALINE_BRIDGE_SHARED_KEY` para pareamento com a Totalidade/online.

Quando a variável não é definida, o `local-server` gera uma chave local e a salva em:

```txt
local-server/data/bridge-shared-key.txt
```

ou no caminho equivalente definido por `KALINE_DATA_DIR`.

Por segurança, a chave não é impressa automaticamente nos logs.

Para visualizar manualmente:

```bash
cat local-server/data/bridge-shared-key.txt
```

Use essa chave apenas em ambiente confiável. Não publique em GitHub, prints, issues ou logs compartilhados.

## Imprimir a chave manualmente (opcional)

Se precisar que o `local-server` imprima a chave no console ao iniciar, defina:

```env
KALINE_BRIDGE_PRINT_SECRET_ON_START=true
```

Atenção: isso pode gravar a chave em logs (ex.: `~/.kaline/logs/local-server.log` se redirecionado via `scripts/start-kaline-mint.sh`). Use apenas em ambiente controlado.