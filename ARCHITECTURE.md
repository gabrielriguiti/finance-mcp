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

### contas_a_pagar — racional da assinatura
- Parâmetro único obrigatório `janela_dias` (inteiro positivo). Retorna
  as transações pendentes (`pendente = 1`) com vencimento entre hoje e
  hoje + `janela_dias` dias, ambos inclusive.
- O schema não tem coluna de vencimento separada: para uma transação
  pendente, `transacoes.data` já é usada como data de vencimento (ver
  seed). A tool reaproveita esse campo, sem alterar o schema.
- "Hoje" é a data real do sistema (`new Date()`) no momento da chamada,
  não um valor fixo ou fictício. Alternativa considerada: fixar uma data
  de referência no seed — descartada porque tornaria o comportamento da
  tool dependente de um detalhe de implementação que ninguém fora do
  seed conseguiria adivinhar.
- Pendências já vencidas (vencimento anterior a hoje) ficam fora do
  resultado — a tool responde "o que vence em breve", não "o que está
  em atraso"; item potencial para o `backlog.md` se fizer falta depois.
- Comparação de datas feita como string `YYYY-MM-DD` (mesma convenção de
  `gastos_por_categoria`), com `hoje` e o limite da janela calculados em
  JavaScript e formatados usando componentes de data local (não
  `toISOString()`) para evitar deslocamento de dia por fuso horário.
- Resultado ordenado por vencimento crescente e inclui o nome da conta
  (`JOIN contas`), retorno compacto: `{ pendencias: [...] }`.

### buscar_transacoes — racional da assinatura
- Todos os filtros (`texto`, `data_inicio`/`data_fim`,
  `valor_min`/`valor_max`) são opcionais e combináveis por E lógico —
  cada um vira uma cláusula `WHERE` condicional, adicionada só se o
  parâmetro foi informado. Sem nenhum filtro, retorna todas as
  transações, mais recentes primeiro.
- Busca por texto usa `LOWER(descricao) LIKE LOWER(@pattern)` em vez do
  `LIKE` case-insensitive nativo do SQLite, que só cobre ASCII —
  descrições do seed têm acento ("Farmácia", "Salário").
- O texto de busca tem `%`, `_` e `\` escapados antes de virar padrão
  `LIKE` (com `ESCAPE '\'`), para que um texto de usuário contendo esses
  caracteres seja tratado como literal, não como wildcard não
  intencional — testado explicitamente (busca por `"%"` e `"_"`
  sozinhos retorna vazio, não a tabela inteira).
- Paginação: `pagina` (1-indexada) + `tamanho_pagina` (default 20, teto
  100) — não `offset`/`limite`, porque exigiria o modelo calcular o
  offset manualmente para avançar página. Essa é a primeira tool
  paginada do projeto e estabelece a convenção para as demais.
  `tamanho_pagina` acima do teto é rejeitado pelo próprio schema zod,
  sem executar a busca.
- O total de resultados (antes da paginação) vem de uma query `COUNT(*)`
  separada com os mesmos filtros — a lista retornada por si só não diz
  ao modelo se há mais páginas.
- Sem índice em `descricao` nem FTS5: dataset fictício da Fase 1 é
  pequeno o bastante para um table scan não ter impacto perceptível;
  otimização fica para o `backlog.md` se o projeto crescer.

### resumo_fatura — racional da assinatura
- Parâmetros obrigatórios `cartao` (nome exato de uma conta `tipo =
  'cartao'`) e `mes_referencia` (`YYYY-MM`) — o mês em que a fatura
  **fecha**, não o mês das transações; ambíguo o suficiente para valer
  explicitar na descrição da tool.
- Primeira e única mudança de schema da Fase 1: `contas` ganhou
  `dia_fechamento`/`dia_vencimento` (nulos, só para `tipo = 'cartao'`).
  Alternativa considerada: datas fixas arbitrárias sem relação com a
  conta, ou tabela separada `ciclos_fatura` — a primeira seria menos
  honesta que modelar o dado que falta, a segunda é normalização
  desnecessária para uma relação 1:1 opcional.
- Ciclo de fatura calculado por `calcularCicloFatura`, função pura sem
  acesso ao banco (mesmo padrão de `formatarData`/cálculo de janela de
  `contas_a_pagar`): o período de uma fatura vai do dia seguinte ao
  fechamento do mês anterior até o fechamento de `mes_referencia`,
  inclusive.
- Vencimento cai no mesmo mês do fechamento se `dia_vencimento >=
  dia_fechamento`, ou no mês seguinte caso contrário — cobre o padrão
  comum de cartão (fecha perto do fim do mês, vence no início do
  seguinte) sem exigir configuração adicional.
- Dia de fechamento/vencimento além do último dia do mês (ex.: 31 em
  fevereiro) é ajustado para o último dia real, via
  `new Date(ano, mes, 0).getDate()`.
- Validação da conta em três passos, cada um com mensagem própria: conta
  existe → é do tipo `cartao` → tem `dia_fechamento`/`dia_vencimento`
  configurados. Passos separados porque cada erro pede uma correção
  diferente de quem chama a tool.
- `total` é a soma dos gastos (`valor < 0`) no período, arredondada a 2
  casas decimais — sem o arredondamento, a soma em ponto flutuante gera
  ruído como `340.09999999999997` em vez de `340.1`, encontrado durante
  a validação manual desta tool.
- Não considera estorno/crédito no cartão (mesma convenção de soma
  apenas de gastos usada em `gastos_por_categoria`); item potencial para
  o `backlog.md`.

## O que foi cortado de escopo

- Autenticação, deploy, API real, escrita de dados — ver README.
- Ideias adicionais vão para o `backlog.md` do portfólio (fora deste
  repositório).
