## Why

O servidor MCP `finance-mcp` está com o scaffold pronto (transporte stdio,
schema SQLite, sem tools registradas) mas ainda não expõe nenhuma
funcionalidade. `get_saldo` é a primeira das cinco tools do escopo
fechado da Fase 1 e a mais simples — é o ponto de entrada natural para
estabelecer o padrão de implementação (acesso a dados, validação de
parâmetros com zod, formato de retorno) que as outras quatro tools vão
seguir.

## What Changes

- Popular o seed (`src/db/seed.ts`) com contas, categorias e transações
  fictícias plausíveis — hoje só cria o schema, sem dados. É pré-requisito
  para testar `get_saldo` (e as tools seguintes) manualmente.
- Implementar a tool `get_saldo` e registrá-la no servidor (`src/index.ts`):
  parâmetro opcional `conta` (nome da conta); sem o parâmetro, retorna o
  saldo de todas as contas.
- Saldo de uma conta = `saldo_inicial` + soma de `transacoes.valor` com
  `pendente = 0` associadas àquela conta.
- Adicionar módulo de acesso a dados (`src/db/`) para abrir a conexão
  SQLite e consultar contas/transações, reutilizável pelas próximas tools.

## Capabilities

### New Capabilities
- `mcp-tools/get-saldo`: consulta de saldo atual, por conta ou de todas as
  contas, via tool MCP.

### Modified Capabilities
(nenhuma — projeto novo, sem specs existentes)

## Impact

- `src/index.ts`: registro da tool no `ListToolsRequestSchema` e no
  handler de chamada de tool (`CallToolRequestSchema`).
- `src/db/seed.ts`: dados fictícios de contas, categorias e transações.
- Novo módulo `src/db/connection.ts` (ou similar) para abrir a conexão
  SQLite compartilhada.
- Nova tool `src/tools/get-saldo.ts` com schema de entrada (zod) e lógica
  de consulta.
- `finance.db` passa a ser gerado com dados de exemplo via `npm run seed`,
  necessário para validar a tool no Claude Desktop.
