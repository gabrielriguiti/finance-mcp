## Why

`get_saldo`, `gastos_por_categoria`, `contas_a_pagar` e `buscar_transacoes`
já estão implementadas e arquivadas. `resumo_fatura` é a quinta e última
tool do escopo fechado da Fase 1: fechamento de fatura de um cartão de
crédito para um mês de referência — quando fecha, quando vence e quanto
totaliza.

O schema atual (`contas`) não guarda dia de fechamento nem de vencimento
por conta — só `nome`, `tipo` e `saldo_inicial`. As quatro tools
anteriores não precisaram dessa informação. Sem ela, "fechamento" e
"vencimento" não têm como ser calculados de verdade; a alternativa (datas
fixas arbitrárias, sem relação com a conta) seria menos honesta do que
modelar a informação que falta. Por isso esta change inclui uma mudança
de schema, a primeira desde o início da Fase 1.

## What Changes

- **Schema**: adicionar `dia_fechamento` e `dia_vencimento` (INTEGER,
  nulos) à tabela `contas` — dia do mês (1–31) em que a fatura fecha e
  em que vence. Relevantes só para contas com `tipo = 'cartao'`; `NULL`
  para contas correntes. Seed atualizado para popular esses valores na
  conta "Nubank Cartão" existente.
- Implementar a tool `resumo_fatura` e registrá-la no servidor
  (`src/index.ts`): parâmetros obrigatórios `cartao` (nome exato da
  conta, deve ser `tipo = 'cartao'`) e `mes_referencia` (formato
  `YYYY-MM`, mês em que a fatura fecha).
- O período de transações de uma fatura vai do dia seguinte ao
  fechamento do mês anterior até o fechamento do `mes_referencia`,
  inclusive. `total` é a soma dos gastos (transações com `valor < 0`)
  da conta dentro desse período — mesma convenção de sinal de
  `gastos_por_categoria`.
- `vencimento` cai no mesmo mês do fechamento se `dia_vencimento >=
  dia_fechamento`, ou no mês seguinte caso contrário — cobre o padrão
  comum de fatura que fecha perto do fim do mês e vence no início do
  mês seguinte.
- Dia de fechamento/vencimento além do último dia do mês (ex.: 31 em
  fevereiro) é ajustado para o último dia real do mês.

## Capabilities

### New Capabilities
- `mcp-tools/resumo-fatura`: fechamento de fatura de cartão de crédito
  para um mês de referência — total, data de fechamento e data de
  vencimento — via tool MCP.

### Modified Capabilities
(nenhuma — as quatro tools anteriores não mudam de comportamento; a
mudança de schema é aditiva, sem impacto nas queries existentes)

## Impact

- `src/db/schema.sql`: duas colunas novas em `contas` (`dia_fechamento`,
  `dia_vencimento`), nulas por padrão.
- `src/db/seed.ts`: valores de fechamento/vencimento para "Nubank
  Cartão"; contas correntes seguem sem esses valores.
- `src/index.ts`: registro da nova tool no `ListToolsRequestSchema` e no
  `CallToolRequestSchema`.
- Nova tool `src/tools/resumo-fatura.ts` com schema de entrada (zod),
  cálculo de ciclo de fatura (fechamento/vencimento/período) e consulta
  ao banco, seguindo o mesmo padrão das tools anteriores.
- Reaproveita `src/db/connection.ts` — nenhuma mudança nesse módulo.
