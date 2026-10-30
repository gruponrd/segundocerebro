# Revisão visual — 29/10/2026

Escopo: visão geral, Fluxo, Renda, Carteira, Dívidas, Objetivos, Trade, LifeGame, Desejos, Ferramentas, Integrações e acesso. Vistoria feita na prévia isolada; nenhuma inclusão, exclusão ou edição de registros em produção.

## Problemas corrigidos

- A regra antiga `:root:not(.light):not(.monochrome)` tinha prioridade sobre os novos tokens e mantinha ações e carregamentos azuis. A identidade laranja agora vence essa regra, inclusive no login.
- Contraste insuficiente de textos de ação e foco em cards claros. Esses cards passam a ter tokens próprios de texto, botão e foco, sem alterar cores dos dados.
- Cabeçalhos com títulos e controles desalinhados. Alinhamento vertical consistente, controles com quebra quando necessário e largura mínima adequada ao toque.
- Carregamento sem identidade. Novo estado compartilhado, centralizado, com ícone do projeto, mensagem acessível e movimento reduzido respeitado.
- Login visualmente separado do aplicativo. Nova composição laranja/preta, campos com rótulos visíveis, cadastro e recuperação na mesma linguagem. Removidos valores financeiros fictícios da apresentação do acesso.
- A prévia local mostrava “Dados sincronizados”. Agora informa explicitamente que o salvamento ocorre somente no navegador; a indicação de nuvem no aplicativo publicado é preservada.

## Regras preservadas

- Branco sobre laranja apenas nos atalhos do cabeçalho principal; botões nas faixas laranjas das seções permanecem escuros.
- Cores de marcas, cartões e séries comparativas podem continuar diferentes da cor de ação. Telegram, categorias e estados financeiros não foram recoloridos indiscriminadamente.
- Autenticação, sincronização, recuperação de conflitos, cálculos e integração Telegram mantêm seus fluxos anteriores.

## Verificação

- Navegação das onze áreas; largura de desktop e celular, sem transbordamento horizontal nas páginas verificadas.
- Login, cadastro e recuperação conferidos visualmente em desktop e celular sem submissões reais. Prévia isolada: `/proposta-acesso.html` no modo `design`.
- Testes do login verificam identificação dos campos, mostrar senha, chamada de autenticação e alternância entre formulários, usando mocks.
- Testes, tipos, lint e build pelo comando `npm run verify`; bancos de teste locais, sem gravações de teste em produção.
- Detector de design sem achados bloqueantes; avisos de paleta/tipografia comparados à documentação antiga, cuja atualização ampla ficou fora desta revisão.
