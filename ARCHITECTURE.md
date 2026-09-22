# Arquitetura

## Visão geral

```
Cliente MCP (ex.: Claude Desktop)
        │  stdio
        ▼
  finance-mcp (Node/TypeScript)
        │
        ▼
   SQLite (finance.db)
```

Servidor único, transporte stdio, sem estado além do arquivo SQLite local.

## Decisões e racional

### Transporte: stdio (não HTTP/SSE)
- Contexto: MCP suporta múltiplos transportes.
- Alternativas consideradas: HTTP/SSE (necessário para servidores remotos
  multiusuário).
- Escolha: stdio, por ser o caso de uso local de um único usuário
  (Claude Desktop).
- Trade-offs: não serve para deploy remoto — decisão consciente, ver
  README "o que ficou de fora".

### Banco: SQLite via better-sqlite3
- Contexto: precisa de um banco simples, sem infraestrutura extra, com
  API síncrona (evita complexidade de callbacks/promises no boot).
- Alternativas consideradas: Postgres (overkill para dataset fictício
  local), arquivo JSON (sem suporte a queries agregadas).
- Escolha: SQLite.
- Trade-offs: não escala para múltiplos usuários concorrentes — não é o
  objetivo deste projeto.

### Organização do código das tools
- Uma tool por arquivo em `src/tools/` (ex.: `get-saldo.ts`), exportando a
  definição (nome, descrição, `inputSchema`) e o handler. `src/index.ts`
  importa e registra cada uma no `ListToolsRequestSchema` e no
  `CallToolRequestSchema`.
- Alternativa considerada: todas as tools em um único arquivo — descartada
  porque dificultaria revisar/commitar uma tool por vez, como pede o
  processo (uma proposal OpenSpec por tool).
- Conexão SQLite: `src/db/connection.ts` abre uma única conexão
  `better-sqlite3` compartilhada por todas as tools. SQLite local
  single-user não ganha nada com múltiplas conexões, e uma conexão única
  simplifica o teste manual.

### get_saldo — racional da assinatura
- Parâmetro único opcional `conta` (nome exato da conta). Ausência do
  parâmetro retorna o saldo de todas as contas — evita obrigar o modelo a
  descobrir nomes de conta antes de poder responder "quanto eu tenho".
  A descrição da tool deixa esse comportamento explícito para não haver
  chamada ambígua.
- Saldo = `saldo_inicial` + soma de `transacoes.valor` com `pendente = 0`,
  calculado via `SUM()`/`GROUP BY` no SQL (mais simples e correto que
  agregar em JavaScript).
- Conta inexistente retorna um resultado MCP de erro (`isError: true`)
  com mensagem legível, em vez de deixar uma exceção do SQLite subir —
  mantém o modelo capaz de explicar o problema ao usuário.
- Retorno compacto: `{ nome, saldo }` para uma conta, `{ contas: [...] }`
  para a lista de todas.

### gastos_por_categoria — racional da assinatura
- "Período" é `data_inicio` + `data_fim` (formato `YYYY-MM-DD`, ambos
  inclusive) em vez de mês/ano — mais flexível (permite recortes fora de
  mês calendário) e sem ambiguidade de fuso ou de "mês corrente".
  Alternativa considerada: `{ mes, ano }` — descartada por ser menos
  flexível sem ganho real de clareza para o modelo.
- Mesma convenção de `conta` opcional de `get_saldo` (nome exato; ausência
  agrega todas as contas), incluindo o mesmo formato de erro estruturado
  para conta inexistente.
- Total por categoria = soma do valor absoluto de transações com
  `valor < 0` e `pendente = 0`, via `SUM()`/`GROUP BY`/`LEFT JOIN` no SQL,
  seguindo o mesmo padrão de `get_saldo`.
- Transações sem `categoria_id` são agrupadas como `"Sem categoria"`
  (`COALESCE` no SQL) em vez de descartadas — omitir gastos reais do total
  seria pior que um grupo "sem categoria" explícito.

## O que foi cortado de escopo

- Autenticação, deploy, API real, escrita de dados — ver README.
- Ideias adicionais vão para o `backlog.md` do portfólio (fora deste
  repositório).
