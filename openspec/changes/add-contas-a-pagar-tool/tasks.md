## 1. Tool contas_a_pagar

- [x] 1.1 Criar `src/tools/contas-a-pagar.ts` com schema zod (`janela_dias`: inteiro positivo, obrigatório) e handler que calcula `hoje` (data real do sistema) e `hoje + janela_dias`, formata ambas como `YYYY-MM-DD` e consulta `transacoes` filtrando `pendente = 1` e `data BETWEEN hoje AND hoje + janela_dias`, ordenado por `data ASC`, com `JOIN contas` para incluir o nome da conta no retorno. Verificar com uma chamada direta do handler cobrindo: pendência dentro da janela, pendência fora da janela (data além do limite) e nenhuma pendência na janela.
- [x] 1.2 Verificar que transações não pendentes (`pendente = 0`) e pendências já vencidas (`data` anterior a hoje) não entram no resultado, independentemente de `janela_dias`. Verificar chamando o handler sobre dados de teste que contenham ambos os casos.
- [x] 1.3 Registrar `contas_a_pagar` em `src/index.ts` (`ListToolsRequestSchema` e `CallToolRequestSchema`) com descrição explícita de que `janela_dias` conta a partir de hoje e que o resultado é só de pendências. Verificar que `npm run dev` sobe sem erro e que a tool aparece na listagem MCP.

## 2. Validação manual e documentação

- [x] 2.1 Validar `contas_a_pagar` no Claude Desktop (já configurado via `claude_desktop_config.json`): janela que inclui pendências do seed, janela que não inclui nenhuma, e conferir que a ordenação por vencimento está correta. Se as datas fixas do seed já tiverem ficado no passado em relação à data real do teste (ver `design.md` — Riscos), anotar isso e, se necessário para validar de fato, rodar com uma janela grande o suficiente para cobrir uma pendência futura recriada manualmente no banco, sem alterar `seed.ts` fora desta tarefa.
- [x] 2.2 Atualizar `README.md` (tabela de tools: marcar `contas_a_pagar` como implementada) e `ARCHITECTURE.md` (racional da assinatura da tool, a decisão de reaproveitar `transacoes.data` como vencimento, e a definição de "hoje" como data real do sistema) com o que foi entregue.
