## Purpose

Permite a um cliente MCP (ex.: Claude Desktop) consultar quais
transações pendentes vencem dentro de uma janela de dias a partir de
hoje, sem precisar varrer todas as transações manualmente.

## ADDED Requirements

### Requirement: Consulta de pendências dentro de uma janela de dias
A tool `contas_a_pagar` SHALL aceitar um parâmetro obrigatório
`janela_dias` (inteiro positivo) e retornar todas as transações
pendentes (`pendente = 1`) cuja data seja maior ou igual a hoje e menor
ou igual a hoje + `janela_dias` dias, inclusive em ambas as pontas.

#### Scenario: Pendência dentro da janela
- **WHEN** o cliente chama `contas_a_pagar` com `janela_dias = 10` e
  existe uma transação pendente com vencimento daqui a 5 dias
- **THEN** essa transação aparece no resultado

#### Scenario: Pendência fora da janela
- **WHEN** o cliente chama `contas_a_pagar` com `janela_dias = 5` e
  existe uma transação pendente com vencimento daqui a 10 dias
- **THEN** essa transação não aparece no resultado

#### Scenario: Pendência já vencida
- **WHEN** existe uma transação pendente com data anterior a hoje
- **THEN** essa transação não aparece no resultado de `contas_a_pagar`,
  independentemente do valor de `janela_dias`

#### Scenario: Nenhuma pendência na janela
- **WHEN** o cliente chama `contas_a_pagar` com um `janela_dias` para o
  qual não há nenhuma transação pendente com vencimento no intervalo
- **THEN** a tool retorna uma lista vazia, sem erro

### Requirement: Transações não pendentes excluídas do resultado
O resultado SHALL incluir apenas transações com `pendente = 1`;
transações já efetivadas (`pendente = 0`) SHALL ser excluídas,
independentemente da data.

#### Scenario: Transação efetivada na janela de datas
- **WHEN** existe uma transação com `pendente = 0` cuja data cai dentro
  da janela de dias consultada
- **THEN** essa transação não aparece no resultado de `contas_a_pagar`

### Requirement: Resultado ordenado por vencimento
As pendências retornadas SHALL estar ordenadas por data de vencimento
crescente, da mais próxima para a mais distante.

#### Scenario: Múltiplas pendências na janela
- **WHEN** há mais de uma transação pendente dentro da janela de dias
  consultada, com vencimentos em datas diferentes
- **THEN** o resultado lista essas transações em ordem crescente de data

### Requirement: Retorno compacto e sem ambiguidade
A resposta da tool SHALL ser um JSON compacto — lista de pendências, cada
uma com conta, descrição, valor e data de vencimento —, e a descrição da
tool exposta ao modelo SHALL deixar claro que `janela_dias` é contado a
partir de hoje e que só transações pendentes entram no resultado.

#### Scenario: Descrição da tool sem ambiguidade
- **WHEN** um cliente MCP lista as tools disponíveis
- **THEN** a descrição de `contas_a_pagar` explicita que `janela_dias` é
  a partir de hoje e que o resultado é só de pendências
