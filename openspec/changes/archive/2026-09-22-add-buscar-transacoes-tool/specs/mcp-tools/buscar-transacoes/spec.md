## Purpose

Permite a um cliente MCP (ex.: Claude Desktop) localizar transações
específicas por texto na descrição, período e faixa de valor, com
resultado paginado, em vez de depender apenas dos agregados retornados
pelas outras tools.

## ADDED Requirements

### Requirement: Busca por texto na descrição
A tool `buscar_transacoes` SHALL aceitar um parâmetro opcional `texto`
e, quando informado, retornar apenas transações cuja `descricao` contenha
esse texto como substring, sem diferenciar maiúsculas de minúsculas.

#### Scenario: Texto encontrado em parte da descrição
- **WHEN** o cliente chama `buscar_transacoes` com `texto = "super"` e
  existe uma transação com descrição "Supermercado Extra"
- **THEN** essa transação aparece no resultado

#### Scenario: Busca sem diferenciar maiúsculas de minúsculas
- **WHEN** o cliente chama `buscar_transacoes` com `texto = "SUPER"` e
  existe uma transação com descrição "Supermercado Extra"
- **THEN** essa transação aparece no resultado

#### Scenario: Texto omitido
- **WHEN** o cliente chama `buscar_transacoes` sem o parâmetro `texto`
- **THEN** o resultado não é filtrado por descrição — apenas os demais
  filtros informados (se houver) se aplicam

### Requirement: Filtro opcional por período
A tool SHALL aceitar os parâmetros opcionais `data_inicio` e `data_fim`
(formato `YYYY-MM-DD`) e, quando informados, retornar apenas transações
com `data` dentro do intervalo, inclusive em ambas as pontas. Os dois
parâmetros são independentes — cada um pode ser informado sem o outro.

#### Scenario: Apenas data_inicio informada
- **WHEN** o cliente chama `buscar_transacoes` com `data_inicio =
  "2026-09-15"` e sem `data_fim`
- **THEN** o resultado inclui transações com `data >= "2026-09-15"`,
  sem limite superior

#### Scenario: Apenas data_fim informada
- **WHEN** o cliente chama `buscar_transacoes` com `data_fim =
  "2026-09-15"` e sem `data_inicio`
- **THEN** o resultado inclui transações com `data <= "2026-09-15"`,
  sem limite inferior

#### Scenario: Ambas as datas informadas
- **WHEN** o cliente chama `buscar_transacoes` com `data_inicio` e
  `data_fim`
- **THEN** o resultado inclui apenas transações com `data` entre os
  dois valores, inclusive

### Requirement: Filtro opcional por faixa de valor
A tool SHALL aceitar os parâmetros opcionais `valor_min` e `valor_max`
e, quando informados, retornar apenas transações cujo `valor` (positivo
para receita, negativo para gasto) esteja dentro da faixa, inclusive em
ambas as pontas. Os dois parâmetros são independentes.

#### Scenario: Faixa de valor incluindo apenas gastos
- **WHEN** o cliente chama `buscar_transacoes` com `valor_max = 0`
- **THEN** o resultado inclui apenas transações com `valor <= 0`

#### Scenario: Faixa de valor incluindo apenas receitas
- **WHEN** o cliente chama `buscar_transacoes` com `valor_min = 0`
- **THEN** o resultado inclui apenas transações com `valor >= 0`

### Requirement: Filtros combináveis
Quando mais de um filtro (`texto`, período, faixa de valor) é informado
na mesma chamada, a tool SHALL retornar apenas transações que satisfazem
todos os filtros informados simultaneamente (E lógico, não OU).

#### Scenario: Texto e período combinados
- **WHEN** o cliente chama `buscar_transacoes` com `texto = "mercado"` e
  um período em que existe uma transação de mercado dentro do período e
  outra de mercado fora do período
- **THEN** apenas a transação de mercado dentro do período aparece no
  resultado

### Requirement: Resultado paginado
A tool SHALL aceitar os parâmetros opcionais `pagina` (inteiro positivo,
default 1) e `tamanho_pagina` (inteiro positivo, default 20, máximo
100), e retornar apenas as transações da página pedida, ordenadas por
data decrescente (mais recentes primeiro). A resposta SHALL incluir o
total de transações que casam com os filtros, antes da paginação.

#### Scenario: Resultado maior que uma página
- **WHEN** os filtros informados casam com mais transações do que
  `tamanho_pagina`
- **THEN** o resultado retorna apenas `tamanho_pagina` transações da
  página pedida, e o campo de total reflete a contagem completa (não
  apenas as retornadas)

#### Scenario: Página sem resultados
- **WHEN** o cliente pede uma `pagina` além do total de páginas
  disponíveis para os filtros informados
- **THEN** a tool retorna uma lista vazia de transações, sem erro, com
  o total refletindo a contagem completa

#### Scenario: tamanho_pagina acima do teto
- **WHEN** o cliente chama `buscar_transacoes` com `tamanho_pagina`
  maior que 100
- **THEN** a tool rejeita a chamada com um erro claro, sem executar a
  busca

### Requirement: Retorno compacto e sem ambiguidade
A resposta da tool SHALL ser um JSON compacto — lista de transações
(cada uma com conta, descrição, valor, data e categoria) e o total de
resultados —, e a descrição da tool exposta ao modelo SHALL deixar claro
que todos os filtros são opcionais e combináveis, e como funciona a
paginação (`pagina` 1-indexada, `tamanho_pagina` com teto de 100).

#### Scenario: Descrição da tool sem ambiguidade
- **WHEN** um cliente MCP lista as tools disponíveis
- **THEN** a descrição de `buscar_transacoes` explicita que os filtros
  são opcionais e combináveis, e como usar `pagina`/`tamanho_pagina`
