## Purpose

Permite a um cliente MCP (ex.: Claude Desktop) consultar o fechamento de
uma fatura de cartão de crédito para um mês de referência: quando fecha,
quando vence e o total gasto no período, sem precisar somar transações
individuais manualmente.

## ADDED Requirements

### Requirement: Cálculo do fechamento e do vencimento da fatura
A tool `resumo_fatura` SHALL aceitar os parâmetros obrigatórios `cartao`
(nome exato de uma conta com `tipo = 'cartao'`) e `mes_referencia`
(formato `YYYY-MM`), e retornar a data de fechamento (dia
`dia_fechamento` da conta, no mês de `mes_referencia`) e a data de
vencimento (dia `dia_vencimento` da conta, no mesmo mês do fechamento se
`dia_vencimento >= dia_fechamento`, ou no mês seguinte caso contrário).

#### Scenario: Vencimento no mesmo mês do fechamento
- **WHEN** a conta tem `dia_fechamento = 5` e `dia_vencimento = 15`, e o
  cliente chama `resumo_fatura` com essa conta e `mes_referencia =
  "2026-09"`
- **THEN** o fechamento retornado é `2026-09-05` e o vencimento é
  `2026-09-15`

#### Scenario: Vencimento no mês seguinte ao fechamento
- **WHEN** a conta tem `dia_fechamento = 25` e `dia_vencimento = 5`, e o
  cliente chama `resumo_fatura` com essa conta e `mes_referencia =
  "2026-09"`
- **THEN** o fechamento retornado é `2026-09-25` e o vencimento é
  `2026-10-05`

#### Scenario: Dia de fechamento ou vencimento além do último dia do mês
- **WHEN** a conta tem `dia_fechamento = 31` e o `mes_referencia`
  informado é um mês com menos de 31 dias (ex.: `"2026-02"`)
- **THEN** o fechamento retornado usa o último dia real desse mês, não
  um dia inexistente

### Requirement: Total da fatura como soma dos gastos no período de fechamento
O período de uma fatura vai do dia seguinte ao fechamento do mês
anterior até o fechamento de `mes_referencia`, inclusive. A tool SHALL
retornar `total` como a soma dos gastos (transações com `valor < 0`) da
conta informada dentro desse período, como valor positivo.

#### Scenario: Transações dentro do período de fechamento
- **WHEN** a conta tem transações de gasto com `data` dentro do período
  entre o fechamento anterior (exclusive) e o fechamento de
  `mes_referencia` (inclusive)
- **THEN** o `total` retornado é a soma do valor absoluto dessas
  transações

#### Scenario: Transação fora do período (antes do fechamento anterior ou depois do fechamento atual)
- **WHEN** existe uma transação de gasto da conta com `data` anterior ao
  fechamento do mês anterior, ou posterior ao fechamento de
  `mes_referencia`
- **THEN** essa transação não entra no `total` da fatura consultada

#### Scenario: Nenhuma transação no período
- **WHEN** não há transações de gasto da conta dentro do período de
  fechamento consultado
- **THEN** a tool retorna `total = 0`, sem erro

### Requirement: Validação da conta informada
A tool SHALL retornar um erro claro, sem lançar exceção não tratada,
quando `cartao` não corresponde a nenhuma conta cadastrada, ou quando
corresponde a uma conta que não é do tipo `cartao`, ou quando corresponde
a uma conta `cartao` sem `dia_fechamento`/`dia_vencimento` configurados.

#### Scenario: Conta inexistente
- **WHEN** o cliente chama `resumo_fatura` com `cartao` que não
  corresponde a nenhuma conta cadastrada
- **THEN** a tool retorna um erro claro indicando que a conta não foi
  encontrada

#### Scenario: Conta existente mas não é cartão
- **WHEN** o cliente chama `resumo_fatura` com `cartao` correspondendo a
  uma conta com `tipo` diferente de `cartao`
- **THEN** a tool retorna um erro claro indicando que a conta não é um
  cartão de crédito

#### Scenario: Cartão sem fechamento/vencimento configurado
- **WHEN** o cliente chama `resumo_fatura` com uma conta `tipo = 'cartao'`
  cujos `dia_fechamento` ou `dia_vencimento` são `NULL`
- **THEN** a tool retorna um erro claro indicando que a conta não tem
  ciclo de fatura configurado

### Requirement: Retorno compacto e sem ambiguidade
A resposta da tool SHALL ser um JSON compacto com fechamento, vencimento
e total, e a descrição da tool exposta ao modelo SHALL deixar claro que
`mes_referencia` é o mês em que a fatura fecha (não necessariamente o
mês das transações) e que `cartao` deve ser uma conta do tipo cartão de
crédito.

#### Scenario: Descrição da tool sem ambiguidade
- **WHEN** um cliente MCP lista as tools disponíveis
- **THEN** a descrição de `resumo_fatura` explicita que `mes_referencia`
  é o mês de fechamento e que `cartao` deve ser uma conta do tipo cartão
