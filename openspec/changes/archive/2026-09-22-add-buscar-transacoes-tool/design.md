## Context

Ver `proposal.md` para a motivação. Esta é a primeira tool do projeto
com busca de texto livre e com paginação — as duas decisões aqui
estabelecem o padrão que as tools seguintes (se precisarem de algo
parecido) devem reaproveitar, por isso valem um design.md mesmo a tool
não sendo complexa.

## Goals / Non-Goals

**Goals:**
- Definir como o texto de busca vira um filtro SQL seguro (sem
  interpretar caracteres de controle do `LIKE` fornecidos pelo usuário
  como wildcard).
- Definir a convenção de paginação (`pagina`/`tamanho_pagina`) e como
  ela retorna o total de resultados.
- Definir como os filtros combinam entre si (E lógico) e com a
  paginação.

**Non-Goals:**
- Busca full-text (FTS5, ranking por relevância) — substring simples
  basta para o volume de dados fictícios do projeto; FTS5 seria
  engenharia excessiva aqui.
- Ordenação customizável pelo cliente — fixa em data decrescente,
  suficiente para o caso de uso ("transações mais recentes primeiro").
- Qualquer coisa fora das 5 tools do escopo (ver `openspec/config.yaml`).

## Decisions

### Busca por substring com `LOWER()` explícito, não `LIKE` case-insensitive nativo
`LIKE` do SQLite já é case-insensitive por padrão, mas só para caracteres
ASCII — descrições do seed têm acento (`"Farmácia"`, `"Salário"`) que
não seriam corretamente comparados sem extensão ICU. A tool usa
`LOWER(descricao) LIKE LOWER(@pattern)` para garantir comparação
previsível independente de acentuação de caixa, mesmo que acentos em si
ainda exijam correspondência exata (não normaliza "á" vs "a" — fora de
escopo).

### Caracteres `%` e `_` do texto de busca são escapados antes de virar padrão LIKE
`texto` vem do usuário e é interpolado num padrão `%...%`. Sem escapar,
um texto contendo `%` ou `_` mudaria o significado da busca (wildcard
não intencional) em vez de ser tratado como texto literal. A tool
escapa `%`, `_` e o próprio caractere de escape antes de montar o
padrão, e usa `ESCAPE` na cláusula `LIKE`.

### Paginação: `pagina` (1-indexada) + `tamanho_pagina`, com total via COUNT separado
Alternativa considerada: `offset`/`limite` diretamente — descartada
porque exigiria o modelo calcular `offset = (pagina - 1) * tamanho`
manualmente para avançar página, com mais chance de erro de chamada.
`pagina`/`tamanho_pagina` é traduzido para `LIMIT`/`OFFSET` internamente
na query. O total de resultados (antes da paginação) vem de uma segunda
query `COUNT(*)` com os mesmos filtros — necessário para o modelo saber
se há mais páginas, já que a lista retornada por si só não diz isso.
`tamanho_pagina` tem teto de 100 (validado no schema zod) para evitar
que uma chamada acidental sem filtro nenhum retorne uma resposta grande
demais para o contexto do modelo.

### Filtros combinam com E lógico, construídos como cláusulas WHERE opcionais concatenadas
Cada filtro (`texto`, `data_inicio`, `data_fim`, `valor_min`,
`valor_max`) vira uma condição SQL independente, adicionada à query
apenas se o parâmetro foi informado; todas as condições presentes se
combinam com `AND`. Mesmo padrão de "filtro opcional vira cláusula
condicional" já usado em `gastos_por_categoria` (filtro por conta).

## Risks / Trade-offs

- [Busca por `LIKE '%texto%'` sem índice em `descricao` — table scan
  completo a cada busca] → risco aceito: dataset fictício da Fase 1 tem
  poucas dezenas de transações, sem impacto de performance perceptível;
  índice ou FTS5 fica para depois se o projeto crescer, via
  `backlog.md`.
- [Duas queries por chamada (COUNT + SELECT paginado) em vez de uma só
  com window function] → trade-off aceito por simplicidade e clareza de
  código sobre uma otimização que não importa nesse volume de dados.
