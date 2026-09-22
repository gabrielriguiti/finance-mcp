## Purpose

Permite a um cliente MCP (ex.: Claude Desktop) consultar quanto foi
gasto em cada categoria dentro de um período, opcionalmente restrito a
uma conta, sem precisar somar transações individuais manualmente.

## ADDED Requirements

### Requirement: Totais de gasto agregados por categoria em um período
A tool `gastos_por_categoria` SHALL aceitar os parâmetros obrigatórios
`data_inicio` e `data_fim` (formato `YYYY-MM-DD`) e retornar, para cada
categoria com gasto no período, o total gasto (soma do valor absoluto
das transações com `valor < 0`) entre `data_inicio` e `data_fim`,
inclusive.

#### Scenario: Período com gastos em múltiplas categorias
- **WHEN** o cliente chama `gastos_por_categoria` com
  `data_inicio = "2026-09-01"` e `data_fim = "2026-09-30"`, e há
  transações de gasto em mais de uma categoria nesse intervalo
- **THEN** a tool retorna o total gasto de cada categoria com pelo menos
  um gasto no período

#### Scenario: Período sem nenhum gasto
- **WHEN** o cliente chama `gastos_por_categoria` com um período em que
  não há transações de gasto
- **THEN** a tool retorna uma lista vazia de categorias, sem erro

### Requirement: Filtro opcional por conta
A tool `gastos_por_categoria` SHALL aceitar um parâmetro opcional `conta`
(nome exato da conta). Quando informado, os totais SHALL considerar
apenas transações daquela conta; quando omitido, SHALL agregar
transações de todas as contas.

#### Scenario: Conta informada e existente
- **WHEN** o cliente chama `gastos_por_categoria` com `conta = "Nubank"`
  e um período
- **THEN** os totais por categoria retornados incluem apenas transações
  de gasto da conta "Nubank" naquele período

#### Scenario: Conta informada e inexistente
- **WHEN** o cliente chama `gastos_por_categoria` com `conta` que não
  corresponde a nenhuma conta cadastrada
- **THEN** a tool retorna um erro claro indicando que a conta não foi
  encontrada, sem lançar exceção não tratada

#### Scenario: Conta omitida
- **WHEN** o cliente chama `gastos_por_categoria` sem o parâmetro `conta`
- **THEN** os totais por categoria retornados agregam transações de
  todas as contas cadastradas

### Requirement: Transações pendentes e receitas excluídas do total
O cálculo SHALL considerar apenas transações não pendentes (`pendente =
0`) com valor negativo (gastos); transações pendentes e transações com
valor positivo (receitas) SHALL ser excluídas dos totais por categoria.

#### Scenario: Transação pendente no período
- **WHEN** uma transação de gasto no período informado tem
  `pendente = 1`
- **THEN** o valor dessa transação não é somado ao total da sua
  categoria

#### Scenario: Receita no período
- **WHEN** há uma transação com `valor > 0` (receita) no período
  informado
- **THEN** essa transação não é somada a nenhum total por categoria

### Requirement: Transações sem categoria agrupadas explicitamente
Transações de gasto sem categoria associada (`categoria_id` nulo) SHALL
ser somadas em um grupo identificado como "Sem categoria", nunca
descartadas silenciosamente do resultado.

#### Scenario: Gasto sem categoria no período
- **WHEN** há uma transação de gasto sem `categoria_id` no período
  informado
- **THEN** o valor dela aparece no total do grupo "Sem categoria" na
  resposta da tool

### Requirement: Retorno compacto e sem ambiguidade
A resposta da tool SHALL ser um JSON compacto — lista de pares
categoria/total —, e a descrição da tool exposta ao modelo SHALL deixar
claro o formato esperado de `data_inicio`/`data_fim`, que `conta` é
opcional, e que os totais representam apenas gastos (não receitas).

#### Scenario: Descrição da tool sem ambiguidade
- **WHEN** um cliente MCP lista as tools disponíveis
- **THEN** a descrição de `gastos_por_categoria` explicita o formato de
  data esperado, que `conta` é opcional e que o total é apenas de gastos
