## Context

Ver `proposal.md` para a motivação da mudança de schema. Esta é a
primeira tool do projeto que precisa de dados de configuração por conta
(dia de fechamento/vencimento) em vez de só consultar transações — e a
primeira com uma janela de datas que depende de dois meses (fechamento
anterior e atual), não de um intervalo informado diretamente pelo
cliente como em `gastos_por_categoria` e `buscar_transacoes`.

## Goals / Non-Goals

**Goals:**
- Definir as duas colunas novas em `contas` e por que são nulas por
  padrão.
- Definir o algoritmo de cálculo do ciclo de fatura (fechamento,
  vencimento, período de transações) de forma pura e testável,
  incluindo os casos de borda de calendário.
- Definir a ordem de validação da conta (existe → é cartão → tem ciclo
  configurado) e a mensagem de erro para cada caso.

**Non-Goals:**
- Suporte a estorno/crédito no cartão alterando o total — `total` soma
  apenas gastos (`valor < 0`), mesma convenção de `gastos_por_categoria`;
  se fizer falta, vai para o `backlog.md`.
- Múltiplos cartões por consulta, ou histórico de faturas fechadas
  anteriormente — a tool responde uma fatura por chamada.
- Qualquer coisa fora das 5 tools do escopo (ver `openspec/config.yaml`).

## Decisions

### Novas colunas `dia_fechamento`/`dia_vencimento` em `contas`, nulas por padrão
Alternativa considerada: tabela separada `ciclos_fatura` (conta_id,
dia_fechamento, dia_vencimento) — descartada por ser normalização
desnecessária para uma relação 1:1 opcional; duas colunas nulas em
`contas` bastam e evitam um JOIN a mais em todas as outras tools que já
consultam `contas`. Nulas por padrão porque só fazem sentido para
`tipo = 'cartao'` — contas correntes não têm fatura.

### Ciclo de fatura calculado em uma função pura, fora do handler
`calcularCicloFatura(mesReferencia, diaFechamento, diaVencimento)` recebe
os três valores e devolve `{ fechamento, inicioPeriodo, vencimento }`
como strings `YYYY-MM-DD`, sem tocar o banco. Isolar essa lógica permite
testá-la diretamente com os casos de borda (mês curto, vencimento no mês
seguinte) sem precisar de dados no SQLite — mesmo padrão de
`formatarData`/cálculo de janela já usado em `contas_a_pagar`.

### Dia de fechamento/vencimento além do fim do mês é ajustado para o último dia real
Alternativa considerada: rejeitar `dia_fechamento`/`dia_vencimento` > 28
no cadastro — descartada porque cartões reais comumente fecham no dia 30
ou 31, e a conta "Nubank Cartão" do seed usa um desses valores. O ajuste
usa `new Date(ano, mes, 0).getDate()` para achar o último dia do mês e
faz `Math.min(dia, ultimoDia)`.

### Vencimento no mês seguinte quando `dia_vencimento < dia_fechamento`
Cobre o padrão mais comum de cartão (fecha perto do fim do mês, vence no
início do mês seguinte). Quando `dia_vencimento >= dia_fechamento`,
assume-se o mesmo mês — cobre o padrão menos comum mas também válido de
fechamento no início do mês com vencimento depois, ainda dentro do
mesmo mês.

### Validação da conta em três passos, cada um com mensagem própria
1. Conta existe? Se não, erro "conta não encontrada" (mesmo formato já
   usado em `get_saldo`/`gastos_por_categoria`).
2. Conta é `tipo = 'cartao'`? Se não, erro específico — evita que o
   modelo tente `resumo_fatura` numa conta corrente e receba um erro
   genérico sem explicação.
3. Conta cartão tem `dia_fechamento`/`dia_vencimento` configurados? Se
   não (NULL), erro específico — cobre o caso de uma conta cartão criada
   sem esses dados.

Cada passo tem sua própria mensagem porque cada um indica uma correção
diferente para quem (ou qual modelo) está chamando a tool.

### Total do período via query única com filtro de data calculado, não passado pelo cliente
`inicioPeriodo` e `fechamento` são calculados na função pura e usados
como parâmetros da query (`t.data BETWEEN @inicio AND @fechamento`),
mesmo padrão de filtro de período já usado em `gastos_por_categoria` e
`buscar_transacoes` — a diferença é que aqui o período vem de cálculo
interno, não de parâmetro direto da tool.

## Risks / Trade-offs

- [Seed populado com `dia_fechamento`/`dia_vencimento` fixos para
  "Nubank Cartão"; combinado com o risco já aceito em
  `add-contas-a-pagar-tool` sobre datas fixas do seed ficarem no
  passado, o período de uma fatura pedida para um `mes_referencia`
  muito distante da data real pode não ter nenhuma transação de
  exemplo] → risco aceito, mesmo racional já registrado: dataset
  fictício da Fase 1, sem pretensão de realismo perene.
- [`total` não distingue estorno/crédito de gasto normal — soma apenas
  `valor < 0`] → aceito, ver Non-Goals; documentar em README/ARCHITECTURE
  como no README já faz para `gastos_por_categoria`.
