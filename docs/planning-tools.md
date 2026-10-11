# Importação, planejamento e verificação

## Gráfico diário do mês

Na dashboard e no **Fluxo**, o gráfico de linhas acompanha o mês e o ano selecionados. **Todos** inclui receitas e despesas previstas ou confirmadas; **Recebidos / pagos** inclui apenas os registros marcados como recebidos/pagos. As saídas incluem cada parcela de cartão registrada com vencimento no período, inclusive as pagas, excluindo cartões cancelados. Não são projetadas parcelas adicionais nem somados saldos de meses anteriores.

Os pontos representam valores diários, sem acumular. Usa-se primeiro a data do lançamento; sem ela, a atribuição explícita nas sessões de pagamento ou uma referência única como “dia 5” ou “5° Dia” na descrição. Números de parcelas, descrições com dias ambíguos ou referências a dia útil sem calendário de feriados não viram datas. Dia 30/31 em mês mais curto usa o último dia como referência, com identificação na lista. Datas inválidas ou de outro mês e registros sem dia ficam separados das linhas, mas continuam nos totais do Fluxo.

As datas das parcelas são seus vencimentos, e marcar como pago/recebido não fornece uma data efetiva de liquidação. **Ver lançamentos por dia** oferece os mesmos dados em uma lista com filtro, valores, origem e situação. As atribuições existentes por conta/dispositivo são preservadas e atualizam o gráfico imediatamente. A visualização não grava nem modifica lançamentos financeiros.

## Extratos CSV

Em **Ferramentas**, selecione CSV com cabeçalho, até 1 MB e 1.000 lançamentos. Confirme o mapeamento de data, descrição, valor e tipo opcional. Aceita UTF-8 e Windows-1252, separadores vírgula, ponto e vírgula ou tabulação, e campos entre aspas.

Datas: DD/MM/AAAA ou AAAA-MM-DD. Escolha o formato monetário brasileiro (1.234,56) ou decimal (1234.56). Sem coluna de tipo, o padrão é negativo = despesa e positivo = receita; para fatura com valores positivos, escolha **Todos são despesas**.

A prévia não grava nada. Linhas inválidas e possíveis duplicatas ficam excluídas: data, descrição normalizada, valor e natureza; registros antigos sem data são comparados por mês. A checagem se repete na inclusão contra o estado mais recente. Linhas iguais dentro do arquivo são conservadoramente tratadas como duplicatas. Podem existir operações legítimas iguais; nesses casos, revise a descrição antes da importação.

Os registros selecionados são acrescentados ao Fluxo, sem alterar registros anteriores. Cada lote tem identificador para **Desfazer lote**, inclusive após reabrir o app. Isso remove apenas os registros importados daquele lote e eventuais edições neles. Importações de fatura não criam parcelas na Carteira: evite incluir despesas já representadas pelas parcelas.

## Economia entre metas

Em **Objetivos**, informe a economia mensal e o valor reservado para cada meta. A soma é limitada ao orçamento, com cálculo em centavos. **Dividir igualmente** distribui o último centavo de forma determinística entre as metas abertas. A projeção de cada meta utiliza sua parcela, sem repetir integralmente o mesmo orçamento em cada objetivo.

Nenhum saldo guardado, valor alvo ou identificador é alterado ao abrir a tela. Metas antigas ficam sem parcela até salvar o plano. Metas concluídas deixam de consumir orçamento. Se a economia for reduzida em outra seção e a divisão passar do limite, as projeções ficam suspensas até ajustar o plano. Não são feitas transferências automáticas.

## Verificação antes de publicar

`npm run verify` executa TypeScript do app e configuração, ESLint, Vitest, três suítes PostgreSQL descartáveis e build. GitHub Actions executa o mesmo comando em push na main e pull requests, além de Deno check nas funções. `vercel.json` exige o mesmo comando durante a construção; uma falha impede a nova versão de ser publicada e mantém a versão anterior.

O workflow usa somente configurações públicas fictícias para testes. Não recebe segredos do banco. A Vercel continua usando as variáveis reais já configuradas para o build do aplicativo.

Verificação manual sugerida: importar CSV fictício apenas em prévia local isolada; conferir duplicatas e erros; salvar e desfazer o lote; criar metas locais, distribuir orçamento e tentar exceder o limite; revisar desktop e celular. Não inserir lançamentos fictícios em produção.
