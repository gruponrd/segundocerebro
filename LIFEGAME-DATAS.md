# Correção de datas do LifeGame

## Problemas encontrados

- O campo de data usava o dia em UTC como valor inicial e máximo. Depois das 21h em Brasília, esse dia já podia ser o seguinte.
- O início era transformado de data local para timestamp UTC. A contagem por blocos de 24h também podia divergir da quantidade de dias do calendário, inclusive em mudanças históricas de horário de verão.
- O salvamento por efeito regravava o estado completo. Uma ação em uma aba desatualizada podia substituir a data mais recente presente no armazenamento.

## Comportamento corrigido

- Novas datas são persistidas literalmente como `AAAA-MM-DD`.
- O dia atual e as viradas de dia seguem `America/Sao_Paulo` em qualquer dispositivo.
- Timestamps antigos continuam legíveis pela sua parte de data, sem migrar, regravar ou deslocar os valores existentes automaticamente.
- Montar o estado não executa salvamento. Cada ação lê a cópia mais recente da conta antes de aplicar sua alteração. Alterações de outra aba são refletidas por evento de armazenamento.
- Atualizações automáticas de recorde e marcos verificam se ainda correspondem à mesma jornada.
- Datas vazias, impossíveis ou futuras não iniciam uma jornada. A data de início aparece no cabeçalho para conferência.

## Preservação e limite atual

Nenhuma data real foi ajustada para um valor presumido, nenhuma jornada foi reiniciada e nenhum registro de produção foi usado para testes. A alteração não muda cálculos financeiros ou a integração Telegram.

O progresso do LifeGame continua usando o armazenamento da conta **neste navegador**. Esta correção não cria sincronização desse módulo entre dispositivos. A sincronização financeira existente permanece independente.

## Testes

Casos de regressão para horário após 21h, virada de dia em Brasília, datas inválidas/futuras, ano bissexto, horário de verão histórico, leitura de ISO legado, montagem sem regravação, ação de aba antiga, eventos entre abas e isolamento entre contas. Testes da página confirmam o valor inicial, a data salva literalmente e a preservação de uma jornada existente ao reabrir.
