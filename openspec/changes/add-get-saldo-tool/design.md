## Context

Ver `proposal.md` para a motivação. `get_saldo` é a primeira tool
implementada e estabelece o padrão de acesso a dados e de organização de
código que as outras quatro tools do escopo vão seguir — por isso vale
registrar as decisões aqui, mesmo sendo uma tool simples.

## Goals / Non-Goals

**Goals:**
- Definir onde e como a conexão SQLite é aberta e compartilhada entre
  tools.
- Definir o formato de erro para "conta não encontrada" (usado por
  `get_saldo` e reaproveitável pelas próximas tools que recebem `conta`).
- Definir o layout de arquivo por tool (`src/tools/<nome>.ts`) que as
  próximas quatro tools também vão seguir.

**Non-Goals:**
- Pool de conexões ou concorrência — SQLite local single-user não precisa.
- Cache de saldo — dataset fictício é pequeno, consulta direta é suficiente.
- Qualquer coisa fora das 5 tools do escopo (ver `openspec/config.yaml`).

## Decisions

### Conexão SQLite única, módulo compartilhado
`src/db/connection.ts` abre uma única conexão `better-sqlite3` (API
síncrona) para `finance.db` e a exporta. Cada tool importa essa conexão em
vez de abrir a própria. Alternativa considerada: cada tool abre e fecha
sua própria conexão — descartada porque SQLite local não ganha nada com
isso e complica o teste manual (múltiplos handles no mesmo arquivo).

### Erro de "conta não encontrada" como retorno estruturado, não exceção MCP genérica
Quando `conta` é informada e não existe, a tool retorna um resultado MCP
de erro (`isError: true` no `CallToolResult`) com mensagem legível, em vez
de deixar a exceção do SQLite subir. Isso mantém o modelo capaz de
explicar o problema ao usuário em vez de receber um erro de protocolo
opaco.

### Uma tool = um arquivo em `src/tools/`
`src/tools/get-saldo.ts` exporta a definição da tool (schema zod +
handler). `src/index.ts` importa e registra. Alternativa considerada:
todas as tools em um único arquivo — descartada porque com 5 tools o
arquivo ficaria difícil de navegar e dificultaria revisar uma tool por
commit, como pede a regra de "uma proposal por tool".

## Risks / Trade-offs

- [Seed insuficiente para exercitar todos os cenários do spec — ex.:
  conta sem transação pendente vs. com pendente] → seed.ts inclui pelo
  menos uma conta com transação pendente e uma sem, cobrindo os cenários
  do spec.
- [Cálculo de saldo em JavaScript, iterando transações, não em SQL] →
  aceitável para o volume de dados fictícios; se o dataset crescer nas
  próximas tools, reavaliar com `SUM()` no SQL (fica no backlog, não
  bloqueia esta tool).
