## 1. Tool gastos_por_categoria

- [x] 1.1 Criar `src/tools/gastos-por-categoria.ts` com schema zod (`data_inicio`, `data_fim` obrigatórios no formato `YYYY-MM-DD`; `conta` opcional) e handler que consulta `transacoes` via `LEFT JOIN categorias` filtrando `valor < 0`, `pendente = 0` e `data BETWEEN data_inicio AND data_fim`, agrupando por categoria (usando `COALESCE(categorias.nome, 'Sem categoria')`). Verificar com uma chamada direta do handler cobrindo: período com gastos em múltiplas categorias, período sem gastos, e transação sem categoria.
- [x] 1.2 Implementar filtro opcional por `conta`, reaproveitando a mesma checagem de conta existente usada em `get_saldo` (retorno `isError: true` para conta inexistente). Verificar chamando o handler com conta existente, sem conta, e com conta inexistente.
- [x] 1.3 Verificar que transações pendentes e receitas (`valor > 0`) não entram nos totais — chamando o handler sobre um período do seed que contenha ambos os casos e conferindo que não aparecem na soma.
- [x] 1.4 Registrar `gastos_por_categoria` em `src/index.ts` (`ListToolsRequestSchema` e `CallToolRequestSchema`) com descrição explícita do formato de data, do parâmetro `conta` opcional, e de que o total é só de gastos. Verificar que `npm run dev` sobe sem erro e que a tool aparece na listagem MCP.

## 2. Validação manual e documentação

- [ ] 2.1 Validar `gastos_por_categoria` no Claude Desktop (já configurado via `claude_desktop_config.json`): período com gastos, período sem gastos, filtro por conta, e conta inexistente.
- [x] 2.2 Atualizar `README.md` (tabela de tools: marcar `gastos_por_categoria` como implementada) e `ARCHITECTURE.md` (racional da assinatura da tool, especialmente o formato de período escolhido e o agrupamento "Sem categoria") com o que foi entregue.
