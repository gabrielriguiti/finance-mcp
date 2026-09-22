## Why

`get_saldo` já está implementada, arquivada e estabeleceu o padrão de
código (conexão SQLite compartilhada, uma tool por arquivo, erro
estruturado, retorno compacto). `gastos_por_categoria` é a segunda das
cinco tools do escopo fechado da Fase 1 e responde a uma pergunta que
`get_saldo` não cobre: não "quanto eu tenho", mas "com o que eu gastei" —
agregado por categoria, no período que o usuário pedir.

## What Changes

- Implementar a tool `gastos_por_categoria` e registrá-la no servidor
  (`src/index.ts`): parâmetros `data_inicio` e `data_fim` (obrigatórios,
  formato `YYYY-MM-DD`, mesmo formato já usado em `transacoes.data`) e
  `conta` (opcional, nome exato da conta — mesma convenção de `get_saldo`).
  Sem `conta`, agrega transações de todas as contas.
- Total por categoria = soma do valor absoluto das transações com
  `valor < 0` (gastos) e `pendente = 0` (efetivadas), agrupadas por
  categoria, dentro do intervalo `[data_inicio, data_fim]` inclusivo.
- Transações sem categoria (`categoria_id NULL`) entram em um grupo
  "Sem categoria" — não podem ser silenciosamente descartadas do total.

## Capabilities

### New Capabilities
- `mcp-tools/gastos-por-categoria`: consulta de totais de gastos
  agregados por categoria, em um período e opcionalmente por conta, via
  tool MCP.

### Modified Capabilities
(nenhuma — `mcp-tools/get-saldo` não muda de comportamento)

## Impact

- `src/index.ts`: registro da nova tool no `ListToolsRequestSchema` e no
  `CallToolRequestSchema`.
- Nova tool `src/tools/gastos-por-categoria.ts` com schema de entrada
  (zod) e lógica de consulta, seguindo o mesmo padrão de
  `src/tools/get-saldo.ts`.
- Reaproveita `src/db/connection.ts` (conexão SQLite já compartilhada) —
  nenhuma mudança nesse módulo.
- Nenhuma mudança de schema SQL necessária (`categorias` e `transacoes`
  já existem).
