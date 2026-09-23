## Why

`get_saldo`, `gastos_por_categoria` e `contas_a_pagar` já estão
implementadas e arquivadas. Nenhuma delas permite localizar uma
transação específica ou uma lista bruta de transações — todas retornam
agregados (saldo, totais por categoria, pendências). `buscar_transacoes`
é a quarta tool do escopo fechado da Fase 1 e cobre essa lacuna: busca
por texto na descrição, com filtros opcionais de período e faixa de
valor, retornando a lista de transações em si (não um agregado).

É também a primeira tool com resultado potencialmente grande o
suficiente para precisar de paginação — nenhuma das três anteriores
precisou, porque sempre retornavam agregados compactos.

## What Changes

- Implementar a tool `buscar_transacoes` e registrá-la no servidor
  (`src/index.ts`): parâmetros `texto` (opcional — busca por substring
  na descrição, case-insensitive), `data_inicio`/`data_fim` (opcionais,
  mesmo formato `YYYY-MM-DD` já usado em `gastos_por_categoria`),
  `valor_min`/`valor_max` (opcionais, comparam o valor da transação
  diretamente — negativo para gastos, positivo para receitas), `pagina`
  (opcional, default 1) e `tamanho_pagina` (opcional, default 20, teto
  100).
- Todos os filtros são combináveis e independentes; nenhum é
  obrigatório — chamar a tool sem parâmetro nenhum retorna a primeira
  página de todas as transações, mais recentes primeiro.
- Estabelece a convenção de paginação do projeto (`pagina` +
  `tamanho_pagina`, 1-indexada) — as próximas tools que precisarem de
  paginação devem seguir o mesmo padrão.
- Resultado inclui o total de transações que casam com os filtros (antes
  da paginação), para o modelo saber se há mais páginas.

## Capabilities

### New Capabilities
- `mcp-tools/buscar-transacoes`: busca de transações por texto, período
  e faixa de valor, com resultado paginado, via tool MCP.

### Modified Capabilities
(nenhuma — `get-saldo`, `gastos-por-categoria` e `contas-a-pagar` não
mudam de comportamento)

## Impact

- `src/index.ts`: registro da nova tool no `ListToolsRequestSchema` e no
  `CallToolRequestSchema`.
- Nova tool `src/tools/buscar-transacoes.ts` com schema de entrada (zod)
  e lógica de consulta, seguindo o mesmo padrão das tools anteriores.
- Reaproveita `src/db/connection.ts` — nenhuma mudança nesse módulo.
- Nenhuma mudança de schema SQL necessária (todas as colunas usadas —
  `descricao`, `data`, `valor` — já existem em `transacoes`).
