## 1. Schema e seed

- [x] 1.1 Adicionar `dia_fechamento INTEGER` e `dia_vencimento INTEGER` (ambos nulos) à tabela `contas` em `src/db/schema.sql`. Verificar rodando `npm run seed` sem erro e conferindo as colunas com `sqlite3 finance.db ".schema contas"`.
- [x] 1.2 Popular `dia_fechamento`/`dia_vencimento` para a conta "Nubank Cartão" em `src/db/seed.ts` (contas correntes seguem sem esses valores). Verificar com `sqlite3 finance.db "select nome, dia_fechamento, dia_vencimento from contas;"` confirmando que só o cartão tem valores preenchidos.

## 2. Cálculo do ciclo de fatura

- [x] 2.1 Criar a função pura `calcularCicloFatura` (em `src/tools/resumo-fatura.ts` ou módulo próprio) que recebe `mes_referencia`, `dia_fechamento` e `dia_vencimento` e retorna `{ fechamento, inicioPeriodo, vencimento }` como strings `YYYY-MM-DD`. Verificar com chamadas diretas cobrindo: vencimento no mesmo mês do fechamento, vencimento no mês seguinte, e dia de fechamento/vencimento além do último dia do mês (ex.: 31 em fevereiro).

## 3. Tool resumo_fatura

- [x] 3.1 Criar `src/tools/resumo-fatura.ts` com schema zod (`cartao` string obrigatório; `mes_referencia` string obrigatório no formato `YYYY-MM`) e a validação da conta em três passos (existe / é tipo cartao / tem ciclo configurado), cada uma retornando `isError: true` com mensagem própria. Verificar chamando o handler com: conta inexistente, conta existente mas não-cartão, e conta cartão sem fechamento/vencimento configurado (usar uma conta de teste sem esses campos).
- [x] 3.2 Implementar a consulta do total: `SUM(-valor)` das transações da conta com `valor < 0` e `data` entre `inicioPeriodo` e `fechamento` (usando `calcularCicloFatura`). Verificar com o seed: fatura do cartão para o `mes_referencia` em que as transações de exemplo caem dentro do período, e para um `mes_referencia` sem nenhuma transação no período (total = 0, sem erro).
- [x] 3.3 Registrar `resumo_fatura` em `src/index.ts` (`ListToolsRequestSchema` e `CallToolRequestSchema`) com descrição explícita de que `mes_referencia` é o mês de fechamento e que `cartao` deve ser uma conta do tipo cartão. Verificar que `npm run dev` sobe sem erro e que a tool aparece na listagem MCP.

## 4. Validação manual e documentação

- [ ] 4.1 Validar `resumo_fatura` no Claude Desktop (já configurado via `claude_desktop_config.json`): fatura com transações no período, conta inexistente, conta corrente (não-cartão), e um `mes_referencia` em que o vencimento cai no mês seguinte ao fechamento.
- [ ] 4.2 Atualizar `README.md` (tabela de tools: marcar `resumo_fatura` como implementada, e marcar a Fase 1 como as 5 tools completas) e `ARCHITECTURE.md` (racional da assinatura da tool, a mudança de schema, e o cálculo do ciclo de fatura) com o que foi entregue.
