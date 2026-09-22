## 1. Seed de dados fictícios

- [x] 1.1 Popular `src/db/seed.ts` com contas fictícias plausíveis (ao menos duas, ex.: "Nubank" corrente e um cartão), categorias básicas e transações — incluindo pelo menos uma transação pendente (`pendente = 1`) e uma não pendente por conta, para exercitar os cenários do spec. Verificar rodando `npm run seed` e conferindo `finance.db` com `sqlite3 finance.db "select * from contas;"`.

## 2. Módulo de acesso a dados

- [x] 2.1 Criar `src/db/connection.ts` exportando uma conexão `better-sqlite3` única para `finance.db`. Verificar com um import de teste que a conexão abre sem erro.

## 3. Tool get_saldo

- [x] 3.1 Criar `src/tools/get-saldo.ts` com schema zod (`conta` opcional, string) e handler que calcula saldo_inicial + soma de transações não pendentes, por conta ou para todas as contas. Verificar com uma chamada direta do handler (script ou teste) cobrindo: conta existente, sem `conta`, e transação pendente não somada.
- [x] 3.2 Implementar retorno de erro estruturado (`isError: true`) quando `conta` informada não existe. Verificar chamando o handler com um nome de conta inexistente.
- [x] 3.3 Registrar `get_saldo` em `src/index.ts` (`ListToolsRequestSchema` e `CallToolRequestSchema`) com descrição explícita de que `conta` é opcional. Verificar que `npm run dev` sobe sem erro e que a tool aparece na listagem MCP.

## 4. Validação manual e documentação

- [ ] 4.1 Configurar o servidor no Claude Desktop (`claude_desktop_config.json`) e validar `get_saldo` end-to-end: com conta existente, sem conta, e com conta inexistente.
- [x] 4.2 Atualizar `README.md` (seção "Como rodar" e tabela de tools: marcar `get_saldo` como implementada) e `ARCHITECTURE.md` (racional da assinatura da tool e do módulo de conexão) com o que foi entregue.
