## Why

`get_saldo` e `gastos_por_categoria` já estão implementadas, arquivadas e
estabeleceram o padrão de código (conexão SQLite compartilhada, uma tool
por arquivo, erro estruturado, retorno compacto). `contas_a_pagar` é a
terceira das cinco tools do escopo fechado da Fase 1 e responde a uma
pergunta que nenhuma das duas anteriores cobre: não "quanto eu tenho" ou
"com o que gastei", mas "o que vence em breve" — as transações pendentes
(`pendente = 1`) dentro de uma janela de dias a partir de hoje.

## What Changes

- Implementar a tool `contas_a_pagar` e registrá-la no servidor
  (`src/index.ts`): parâmetro obrigatório `janela_dias` (inteiro
  positivo) — retorna as transações pendentes cuja data de vencimento
  cai entre hoje e hoje + `janela_dias` dias, inclusive.
- O schema não tem uma coluna de vencimento separada: para transações
  pendentes (`pendente = 1`), a coluna `transacoes.data` já é usada como
  data de vencimento (ver seed: "IPTU (parcela)", "Conta de luz"). A tool
  reaproveita esse campo, sem alterar o schema.
- "Hoje" é a data real do sistema no momento da chamada (`new Date()`),
  não um valor fixo — a tool não tem noção de tempo fictício.
- Retorno lista cada pendência com conta, descrição, valor e data de
  vencimento, ordenadas por data crescente (a mais próxima primeiro).

## Capabilities

### New Capabilities
- `mcp-tools/contas-a-pagar`: consulta de transações pendentes com
  vencimento dentro de uma janela de dias a partir de hoje, via tool MCP.

### Modified Capabilities
(nenhuma — `get-saldo` e `gastos-por-categoria` não mudam de comportamento)

## Impact

- `src/index.ts`: registro da nova tool no `ListToolsRequestSchema` e no
  `CallToolRequestSchema`.
- Nova tool `src/tools/contas-a-pagar.ts` com schema de entrada (zod) e
  lógica de consulta, seguindo o mesmo padrão de `src/tools/get-saldo.ts`
  e `src/tools/gastos-por-categoria.ts`.
- Reaproveita `src/db/connection.ts` (conexão SQLite já compartilhada) —
  nenhuma mudança nesse módulo.
- Nenhuma mudança de schema SQL necessária (`transacoes.pendente` e
  `transacoes.data` já existem e já são usadas pelo seed para representar
  vencimento de pendências).
