# Proposta Clareza — somente local

Abra `http://127.0.0.1:8094/proposta-clareza.html` com `npm run dev:design` ativo.

- Visão geral alternativa solicitada em 29/10/2026. Não substituir nem publicar a versão atual.
- Referência enviada pelo usuário: cards planos, quase retos, bordas finas, preto, números claros e cores semânticas. Sem vidro, sombras ou efeitos 3D.
- Destaque conjunto para o resultado do mês e a soma das sobras futuras; linguagem simples, números completos e previsões identificadas.
- Entrada independente; não altera App.tsx, rotas, cálculos ou registros de produção. A página só renderiza no modo local `design`.
- Usa FinanceProvider e a proteção de prévia existentes. Dados de exemplo por padrão; se a aba já optou por uma cópia autenticada, a proteção de design continua impedindo escritas na nuvem.
- Seletor de mês, gráfico por mês/acumulado, limite final da projeção e memória de cálculo funcionais. Links abrem as seções existentes da prévia local.
- Roboto local, fundo #000, superfícies #08090a, bordas #292b2e; verde para sobra/entradas, rosa para saídas, azul para ações.
- A previsão começa no mês escolhido e termina, por padrão, no último mês com contas ou faturas pendentes. Reutiliza as hipóteses de projeção existentes e explica a origem dos valores.
- O caminho do dinheiro: entradas reunidas antes de se distribuir por categoria, cartões e sobra. Não inventa vínculos de pagamento entre uma renda específica e uma despesa. Faixas proporcionais com valores sempre escritos, destaque por mouse/teclado/toque e composição completa expansível.
- Em meses negativos, a diferença aparece como “Valor que falta”, nunca como renda. No celular, as conexões viram um fluxo vertical com barras proporcionais.

## Segunda variação, ainda local

O usuário gostou do topo, mas pediu outra alternativa ao flow e cards mais coloridos. A versão aberta agora usa um gráfico em cascata: entradas, descontos por categoria e sobra final. Cards com fundos verdes e vermelhos escuros, mantendo o fundo geral preto. Dívida total promovida ao bloco principal, com cartões/credores separados e explicação de que ela não é descontada novamente do resultado mensal. O fluxo anterior permanece em arquivos separados para comparação futura, sem ser renderizado.

## Variação com cores sólidas
Cards principais com preenchimentos opacos em verde e vermelho. Sobra e dívida no topo; pendências divididas em dois cards compactos. Comparação horizontal na mesma escala para entradas, saídas e resultado, com categorias disponíveis em detalhes. Continua isolada no ambiente local, sem alteração dos dados ou publicação.

## Comparação temporal azul e amarelo-lima
Substitui as barras por duas linhas mensais: três meses anteriores, mês de referência e três seguintes. Cada mês pode ser consultado por clique, toque ou teclado. Futuro tracejado; meses sem lançamentos não são interpolados nem estimados. Totais usam o mesmo cálculo de despesas e parcelas. Preserva os cards sólidos aprovados como direção de teste.

## Retorno ao visual discreto
Removida a comparação gráfica principal. Cards retornam à mesma superfície escura neutra do card E nos próximos meses, com bordas finas e cor somente nos valores. Mantidos números, dívida, pendências e projeção já existente. Sem publicação ou alteração dos dados.

Restaurada a barra de proporção abaixo dos totais: saídas comprometidas em vermelho e sobra prevista em verde, com legenda e percentual. Mantido o tratamento existente para déficit e meses sem entradas.

## Sparkline dentro do resumo
Adicionada uma linha compacta de sobra mensal dentro do card de resultado. Exibe três meses antes, referência e três depois, com futuro tracejado e seleção por teclado, toque ou mouse. Meses sem dados não são estimados. Barra de comprometimento preservada. Apenas proposta local.

Sparkline ajustada para duas séries na mesma escala: entradas verdes e saídas vermelhas, mantendo sete meses, futuro tracejado e consulta dos dois totais por mês.

## Contadores rápidos
Valores monetários entram com contagem de aproximadamente 540 ms e leve subida. Ao mudar mês, horizonte, modo da projeção ou mês da sparkline, interpolam a partir do valor exibido. Trocas interrompem a animação anterior. Movimento reduzido apresenta o total imediatamente; leitores de tela recebem apenas o valor final. Nenhum dado ou cálculo persistido é alterado.

## Dívida e visão aberta
Dívida em superfície azul sólida, total maior e score de saúde financeira em três faixas, preservando a fórmula do componente original em uma variante isolada da proposta. Memória de cálculo da projeção sempre aberta e lista completa das pendências do mês, sem controles de expandir. Sem alterações na aplicação publicada ou registros financeiros.

## Compactação dos cards de apoio
Reduzidos preenchimentos, intervalos e altura da projeção e da lista de pendências. Em telas amplas, explicação e tabela ficam lado a lado, e pendências em duas colunas. Totais e todas as linhas continuam visíveis, sem controles de expansão. Preservados alvos de toque e tamanho de texto. Alteração apenas local.

## Direção laranja e branco
Laranja sólido #ff572a, branco quente #f7f5f0 e fundo preto. Saudação personalizada pelo horário de São Paulo, atalhos reais com desenhos vetoriais de carteira, gráfico e alvo. Cards principais alternados, cantos chanfrados e score preservado em área de contraste. Mantidos contadores, dados reais em prévia sem gravação e demais funcionalidades. Sem publicação.

## Versão aprovada para publicação — 29/10/2026

A direção laranja/branco/preto passa a ser utilizada pelo aplicativo principal após autorização explícita. A entrada HTML da proposta continua separada e restrita ao modo de design. A aplicação principal usa BrowserRouter com os caminhos originais; autenticação, AccountWorkspace, MigratedModulesGate, FinanceProvider, recuperação e sincronização permanecem montados sem migrações ou alterações de registros.

Cabeçalho mais fino e três atalhos ilustrados menores, com movimento preservado e navegação real para Fluxo, Carteira e Objetivos. Score em grafite. Todas as dez seções usam o vocabulário visual compartilhado e seus formulários originais. Busca, novo lançamento, exportação XLSX e logout com estado de erro permanecem acessíveis. Relatórios e ferramentas anteriores da visão geral continuam abaixo do novo resumo, abertos e sem botão de expandir.

Conferência visual da navegação das dez seções, visão geral e Fluxo em desktop e celular. Verificação completa: 178 testes unitários/componentes e 29 verificações de banco local, tipos, lint sem erros e build de produção. Nenhum teste grava no banco de produção. Avisos existentes: react-refresh, Browserslist e tamanho de chunks.

## Regra de contraste dos controles
Botões e seletores sobre superfícies laranjas usam grafite com texto claro, incluindo hover, foco e desabilitado. O cabeçalho principal ilustrado é a única exceção para atalhos brancos sobre laranja. Textos brancos e ícones estáticos permanecem permitidos.
