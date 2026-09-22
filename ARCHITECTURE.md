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

### Design das tools (a decidir durante a Fase 1)
- Cada tool terá: descrição sem ambiguidade para o modelo, parâmetros que
  evitem chamadas inúteis, retorno compacto. Este arquivo será atualizado
  com o racional de cada assinatura conforme forem implementadas.

## O que foi cortado de escopo

- Autenticação, deploy, API real, escrita de dados — ver README.
- Ideias adicionais vão para o `backlog.md` do portfólio (fora deste
  repositório).
