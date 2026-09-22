## Purpose

Permite a um cliente MCP (ex.: Claude Desktop) consultar o saldo atual de
uma conta específica ou de todas as contas cadastradas, sem precisar
inferir o cálculo a partir de transações individuais.

## Requirements

### Requirement: Consulta de saldo por conta
A tool `get_saldo` SHALL aceitar um parâmetro opcional `conta` (nome da
conta) e retornar o saldo atual daquela conta, calculado como o saldo
inicial da conta somado ao valor de todas as suas transações não
pendentes.

#### Scenario: Conta informada e existente
- **WHEN** o cliente chama `get_saldo` com `conta = "Nubank"` e a conta
  "Nubank" existe
- **THEN** a tool retorna o nome da conta e o saldo atual (saldo_inicial
  + soma das transações com `pendente = 0` daquela conta)

#### Scenario: Conta informada e inexistente
- **WHEN** o cliente chama `get_saldo` com `conta` que não corresponde a
  nenhuma conta cadastrada
- **THEN** a tool retorna um erro claro indicando que a conta não foi
  encontrada, sem lançar exceção não tratada

### Requirement: Consulta de saldo de todas as contas
A tool `get_saldo` SHALL, quando chamada sem o parâmetro `conta`, retornar
o saldo atual de cada conta cadastrada.

#### Scenario: Nenhuma conta informada
- **WHEN** o cliente chama `get_saldo` sem o parâmetro `conta`
- **THEN** a tool retorna uma lista com o nome e o saldo atual de cada
  conta cadastrada no banco

### Requirement: Transações pendentes não afetam o saldo
O cálculo de saldo SHALL considerar apenas transações com `pendente = 0`;
transações pendentes (contas a pagar em aberto) SHALL ser excluídas do
saldo atual.

#### Scenario: Conta com transação pendente
- **WHEN** uma conta tem uma transação com `pendente = 1` associada
- **THEN** o valor dessa transação não é somado ao saldo atual retornado
  por `get_saldo`

### Requirement: Retorno compacto e sem ambiguidade
A resposta da tool SHALL ser um JSON compacto (nome da conta e saldo
numérico, ou lista de pares nome/saldo), e a descrição da tool exposta ao
modelo SHALL deixar claro que o parâmetro `conta` é opcional e o que
acontece quando ele é omitido.

#### Scenario: Descrição da tool sem ambiguidade
- **WHEN** um cliente MCP lista as tools disponíveis
- **THEN** a descrição de `get_saldo` explicita que `conta` é opcional e
  que a ausência dele retorna o saldo de todas as contas
