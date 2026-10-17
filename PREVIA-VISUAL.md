# Revisão visual local — dark azul

Status: em revisão. Não publicar, fazer push ou atualizar o domínio antes de nova autorização.

## Abrir

Execute `npm run dev:design` e acesse http://127.0.0.1:8094/ no mesmo computador. Mantenha o terminal em execução. O servidor atende somente em 127.0.0.1.

Por padrão, este modo usa perfil isolado e dados demonstrativos identificados no topo. Alterações financeiras e módulos ficam no armazenamento desse navegador e dessa origem. Não importa automaticamente dados antigos e não salva no Supabase. Não é a versão para seus lançamentos financeiros reais. No modo de exemplos, login/cadastro/recuperação em /acesso são prévias visuais sem envio. Telegram e exportação da conta real ficam indisponíveis nesta prévia.

### Visualizar os dados da sua conta

Em 17/10/2026 foi adicionado o botão **Carregar meus dados**, também acessível por http://127.0.0.1:8094/?conta=1. Exige autenticação normal na mesma conta do aplicativo. A sessão do domínio publicado não é copiada. Após entrar, a prévia lê `user_financial_data` da própria conta e aplica os cálculos já existentes. A nuvem é a fonte ao abrir/recarregar; alterações de teste ficam em chaves locais próprias `fin_design_account_*`, sem substituir caches normais `fin_user_*` ou `fin_account_*`. Recarregar volta à cópia atual da nuvem; os testes financeiros locais não são reenviados.

Os módulos migrados disponíveis no servidor são lidos para chaves próprias da prévia, com marcadores também isolados. Dados de módulos que existam somente no navegador do aplicativo publicado não são transferidos automaticamente. O botão **Usar exemplos** volta ao perfil demonstrativo. O opt-in vale por aba, é bloqueado fora do modo design em desenvolvimento e não habilita salvamento na nuvem. Cadastro e recuperação permanecem no app publicado.

Verificação da cópia autenticada: 17 testes pertinentes aprovados, incluindo exigência de sessão, preferência pela nuvem, ausência de insert/update financeiro, preservação do cache normal, isolamento de módulos e recarregamento. Valores do panorama comparados visualmente ao app publicado sem editar registros reais.

Nenhum deploy, push, migração, alteração de registro real ou importação de backup foi feito nesta revisão. O login e a sincronização de produção continuam no fluxo normal fora deste modo de desenvolvimento. O modo design é desativado nos builds de produção.

## Direção aplicada

### Revisão de espaçamentos — 17/10/2026

Mantida a composição original escolhida. O panorama usa intervalos de 12 px entre cards relacionados, 16 px entre módulos secundários e 20 px entre grupos. Os links de detalhamento dos dois gráficos ficam alinhados na base. Em larguras intermediárias com a barra lateral, o primeiro indicador ocupa uma linha e os outros dois dividem a seguinte, evitando as quebras de valores observadas; o resumo de saldo também se adapta em duas colunas entre 1024 e 1199 px. No celular, valor da meta, unidade mensal e lápis ficam juntos, com controle de pelo menos 44 px de altura.

Conferência visual da visão geral em desktop, 900, 1100 e 390 px, além da estrutura desktop de Fluxo e Carteira. As duas falhas visuais apontadas na avaliação independente foram resolvidas nos estados capturados. Editor da meta aberto e fechado por Escape sem salvar; ausência de rolagem horizontal em 390 px. Tipos, ESLint dos arquivos TSX alterados, build e detector de layout aprovados. Permanecem os avisos de bundle grande. Valores monetários extremos, zoom e todas as demais rotas não foram revalidados nesta revisão pontual.

Sugestão futura: manter o formulário de lançamento rápido do Fluxo acessível durante a rolagem. Não implementada nesta revisão. Evidências privadas em `.impeccable/review/spacing/`. Sem publicação, alteração de cálculo ou gravação de dados reais.

### Horizonte do panorama — março de 2027

Os gráficos de entradas/saídas e sobra mensal exibem o horizonte até mar/2027. O eixo usa períodos numéricos para posicionar uma linha divisória exatamente entre dez/2026 e jan/2027, com a indicação 2027. O primeiro e último mês permanecem legíveis; dezembro é incluído nos ticks disponíveis, sujeitos à redução de rótulos do Recharts nas telas estreitas.

Lançamentos de 2027 já cadastrados têm prioridade. Nos meses de jan–mar/2027 sem receitas ou despesas manuais, a visualização estima esses dois componentes a partir do último mês com lançamentos até o mês atual e soma as parcelas reais previstas para cada mês. Não repete a receita sazonal de dezembro como base se ela ainda está no futuro. Hipóteses aparecem em texto, tooltip e tabelas; calendário e registros salvos não são modificados. O saldo e os indicadores do mês selecionado continuam usando exclusivamente os registros originais.

Verificado: oito testes de horizonte/projeção, tipos, ESLint sem erros e build; conferência visual desktop e 390px, com corte de ano e mar/2027 visíveis. Valores de jan–mar e identificação de estimativa conferidos na tabela. Nada publicado.

### Movimento — 17/10/2026

Transições de navegação de 180 ms sem deslocar texto; ao trocar o mês, os dois gráficos do panorama revelam o novo horizonte juntos em 320 ms e o resumo recebe uma confirmação luminosa de 240 ms. Valores financeiros mudam imediatamente, sem contagem artificial. Expansores abrem em 220 ms, botões confirmam o toque em 120 ms, seleções em 150 ms e barras de progresso acompanham seu valor em 300 ms. Modais preservam as transições Radix existentes.

`WorkspaceMotion` atua apenas na apresentação, sem chaves que remontem formulários ou provedores. Movimentos em andamento são cancelados na próxima interação, na desmontagem e ao ativar movimento reduzido. Não há biblioteca nova, observador de rolagem, efeito contínuo ou alteração de cálculo/persistência. Usuários com preferência por movimento reduzido recebem os estados finais diretamente.

Verificado: tipos, build, seis testes pertinentes (incluindo cancelamento, rascunhos preservados, movimento reduzido e isolamento de dados), ESLint sem erros e detector Impeccable sem achados. Conferência visual de navegação, troca de mês e expansores por teclado; desktop e celular de 390 px sem transbordamento. Capturas estáticas documentam a integridade do layout, não a fluidez temporal. Nada publicado.

Manrope, preto neutro, superfícies grafite, azul nas ações, verde para receitas e coral para despesas. Componentes compartilhados em todas as rotas, cabeçalho, navegação, cartões, formulários, estados vazios e gráficos. Cores/IDs dos cartões e dados originais preservados. Menu mobile com Sheet acessível, suporte a Escape e foco; acesso direto a Fluxo; ação de novo lançamento no topo sem cobrir conteúdo. Temas alternativos mantidos.

As seções detalhadas e ferramentas existentes continuam disponíveis; a composição resumida do dashboard não remove funções. Visual pode ser ajustado livremente antes de decidir a publicação.

## Verificações desta revisão

Tipos e build aprovados; ESLint sem erros (11 avisos de Fast Refresh já presentes). 118 testes de aplicação e 29 testes de banco em ambiente isolado aprovados. Teste adicional confirma a persistência local, ausência de leitura/escrita no Supabase durante a prévia e preservação das chaves de outras contas. Nenhum dado de produção foi usado para testar.

Conferência visual das onze seções no desktop e em 375 px; verificações adicionais em 320 px nas telas principais e login. Menu mobile com Escape, modal de lançamento e formulário de compra no crédito conferidos; alteração demonstrativa de renda persistiu após recarregar e foi restaurada.

## Ajuste de prioridade do dashboard

Saldo projetado permanece no topo, seguido imediatamente do gráfico e dos três cards do panorama financeiro. Vencimentos e objetivos ficam depois desse bloco. O gráfico de detalhamento mensal e a reorganização das demais seções continuam disponíveis, sem duplicar o panorama. Nenhum cálculo ou dado foi alterado.

## Revisão midnight pelas novas referências

Superfícies reduzidas para preto grafite, bordas suaves e glow estático pontual: ação principal, navegação ativa e indicadores do panorama. Valores principais brancos, cores semânticas e cores individuais dos cartões preservadas. Gráfico com linhas finas e textura pontilhada discreta.

Na visão geral, vencimentos/objetivos e relatórios completos ficam em expansores nativos acessíveis. Saldo e panorama continuam abertos e no topo; detalhes, gráficos e reorganização permanecem disponíveis ao expandir. Nenhuma mudança de cálculos, registros ou publicação.

## Gráficos compactos do panorama

Entradas/saídas e sobra mensal aparecem em dois cards lado a lado no desktop; os indicadores ficam abaixo. No celular os gráficos são empilhados. A sobra usa os totais do panorama (receitas menos saídas, que já incluem as parcelas), sem acumular saldos. Meses futuros usam tracejado e uma tabela permite consultar os valores. Sem mudanças de dados ou publicação.

## Correções após a crítica de usabilidade — 16/10/2026

Aprovadas as cinco prioridades, com equilíbrio entre quanto pode sobrar e o que falta pagar. Aplicadas somente no código da prévia local, sem push ou publicação.

- O relatório agora se chama **Fluxo acumulado previsto**: parte de zero, explica que inclui valores pagos e pendentes e não representa saldo bancário. O horizonte acompanha o mês selecionado e mostra os seis meses seguintes. Usa lançamentos existentes (inclusive parcelas fora do calendário de fluxo) e só estima meses sem registros pela média dos últimos três meses disponíveis. A faixa arbitrária de ±15% foi removida. A tabela informa a origem de cada valor.
- Vencimentos e objetivos continuam recolhidos inicialmente, com quantidade, total pendente, próximo vencimento e alerta de atraso quando houver. Valores sem data continuam sem vencimento presumido.
- Botões de cartões, parcelas e credores têm nomes e controles por teclado; cartões e seções podem ser reordenados por setas, além do arraste, com anúncio da nova posição. Gráficos do panorama têm tabelas acessíveis e marcação do período selecionado.
- Meta mensal mantém o formulário e o valor ao rejeitar entradas inválidas, mostra erro associado ao campo e aceita envio por Enter e cancelamento por Escape, devolvendo o foco ao botão de edição.
- A barra da meta indica **cobertura prevista**, sem sugerir que o valor foi guardado. O detalhamento do fluxo explicita que cartões já estão incluídos nas saídas.
- Ajustados espaços dos eixos, cartões sem corte de limite/dívida e linhas de parcelas no celular. Dados, identificadores, autenticação, persistência e integrações não foram alterados.

Verificação completa: tipos, ESLint (zero erros, os 11 avisos anteriores de Fast Refresh), 126 testes de aplicação, 29 testes de banco local isolado e build aprovados. Após os ajustes finais, passaram os 9 testes direcionados de projeção/interação, tipos, lint e build. Resultado confirmado visualmente em desktop e 375 px, sem rolagem horizontal. A conferência por teclado usa apenas os dados demonstrativos locais, restaura as ordens de cartões/seções e mantém a meta anterior. Produção não foi usada para testes. Permanecem os avisos prévios de tamanho de bundle e Browserslist desatualizado.
