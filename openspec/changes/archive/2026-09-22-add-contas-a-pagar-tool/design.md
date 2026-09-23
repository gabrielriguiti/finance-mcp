## Context

Ver `proposal.md` para a motivação. O schema (`src/db/schema.sql`) não
tem uma coluna de vencimento separada — para uma transação pendente,
`transacoes.data` já é usada como a data em que ela vence (ver seed:
"IPTU (parcela)", "Conta de luz", faturas do cartão). `contas_a_pagar` é
a primeira tool que precisa de uma noção de "hoje" — `get_saldo` e
`gastos_por_categoria` não dependem da data atual do sistema.

## Goals / Non-Goals

**Goals:**
- Definir o que "hoje" significa para a tool (data real do sistema vs.
  data fixa/fictícia).
- Definir os limites da janela (o que conta como "dentro" da janela nas
  duas pontas).
- Reaproveitar `transacoes.data` como vencimento, sem alterar o schema.

**Non-Goals:**
- Notificação ou lembrete proativo — a tool só responde quando
  consultada, não empurra alertas.
- Qualquer coisa fora das 5 tools do escopo (ver `openspec/config.yaml`).

## Decisions

### "Hoje" é a data real do sistema (`new Date()`), não um valor fixo
Alternativa considerada: fixar uma data de referência no seed (ex.:
sempre tratar "hoje" como 2026-09-22, a data em que o seed foi escrito) —
descartada porque tornaria o comportamento da tool dependente de um
detalhe de implementação do seed, que o modelo (e um leitor do código)
não teria como adivinhar sem ler o seed. Usar a data real do sistema é o
que qualquer usuário esperaria de "contas a pagar nos próximos N dias".

### Janela inclusiva nas duas pontas: `hoje <= data <= hoje + janela_dias`
Uma pendência vencendo hoje mesmo deve aparecer mesmo com `janela_dias =
0` implícito — não faz sentido "contas a pagar nos próximos 7 dias"
excluir o que vence exatamente no dia 7. Pendências com `data` anterior a
hoje (já vencidas) ficam fora do resultado: essa tool responde "o que
vence em breve", não "o que está vencido" — item potencial para o
`backlog.md` se fizer falta depois.

### Cálculo de janela em SQL, comparando strings `YYYY-MM-DD`
Como `transacoes.data` já é armazenada em ISO 8601 (`YYYY-MM-DD`),
comparação lexicográfica de string é equivalente a comparação de data
nesse formato — mesmo padrão que `gastos_por_categoria` já usa para
`data_inicio`/`data_fim`. A tool calcula `hoje` e `hoje + janela_dias` em
JavaScript (`Date`) e formata como string antes de passar para a query
SQL, em vez de usar funções de data do SQLite — mantém a lógica de data
em um só lugar e testável fora do banco.

## Risks / Trade-offs

- [Seed tem datas fixas de setembro/2026 (ex.: pendências em
  2026-09-25, 2026-09-28); conforme o tempo passa, essas datas ficam no
  passado e deixam de aparecer em `contas_a_pagar` com qualquer
  `janela_dias` razoável, o que pode fazer a validação manual e o GIF de
  demonstração pararem de mostrar resultados] → risco aceito para a Fase
  1 (dataset fictício, sem pretensão de realismo perene); se o seed
  precisar ser revisto para manter a demo viva depois de outubro/2026,
  vira item no `backlog.md`, não replanejamento desta tool.
- [`janela_dias` negativo ou zero informado pelo cliente] → schema zod
  valida `janela_dias` como inteiro positivo (`> 0`); entrada inválida é
  rejeitada pelo próprio SDK MCP antes de chegar ao handler, sem
  necessidade de tratamento manual de erro.
