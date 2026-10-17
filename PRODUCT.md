# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas que organizam suas finanças pessoais e seus objetivos. O proprietário já usa o aplicativo no dia a dia; outras pessoas podem criar contas próprias e começar sem dados de terceiros.

## Product Purpose

Segundo Cérebro reúne receitas, despesas, compras e parcelas de cartões, dívidas e objetivos para acompanhar os compromissos e a sobra prevista de cada período. Também inclui desejos, rotina e LifeGame.

## Operating Context

Uso no computador e no celular, com autenticação no aplicativo e dados isolados por conta. Há integração conectada ao Telegram @SecondB2Bot para registrar lançamentos, inclusive compras no crédito, e lembretes opcionais.

## Capabilities and Constraints

- Código React/TypeScript com Vite, Tailwind e componentes Radix/shadcn existentes.
- Preservar integralmente funções, cálculos financeiros úteis, dados reais, lançamentos, IDs, autenticação, sessões, persistência e integração Telegram.
- Infraestrutura própria: Supabase, GitHub e Vercel. Não reintroduzir dependência operacional do Lovable.
- Não adicionar serviços pagos ou novas credenciais.
- Propostas visuais são locais. Não fazer push, deploy ou atualizar o domínio sem nova autorização.
- A prévia de design em 127.0.0.1:8094 usa perfil e dados demonstrativos locais, sem escrita no Supabase. Manter a proposta atual disponível ao apresentar uma alternativa.
- Nova proposta solicitada para o projeto inteiro, começando pela visão geral; o usuário escolheu avaliar diretamente um protótipo navegável.
- Na visão geral, manter no topo o saldo projetado, entradas/saídas e sobra mensal. Equilibrar o entendimento do que pode sobrar com o que falta pagar. Objetivos e relatórios completos continuam acessíveis como informação secundária.
- Projeções devem se distinguir de valores realizados e de saldo bancário. Não apresentar cobertura de meta como dinheiro já guardado.

## Brand Commitments

Nome Segundo Cérebro; português brasileiro; comunicação direta e compreensível. O usuário definiu fundo preto puro, superfícies escuras, azul como referência principal, cores semânticas para entradas/saídas e cores próprias nos cartões. Solicita informação compacta sem perder o essencial, tipografia refinada e animações discretas.

## Evidence on Hand

Em 17/10/2026, após a revisão de espaçamentos, o usuário autorizou a publicação definitiva da versão original revisada. Essa autorização substitui a restrição de manter apenas local para esta versão aprovada. Régua e Essencial continuam como propostas locais separadas. A publicação mantém autenticação e persistência normais de produção; os atalhos de design permanecem exclusivos do desenvolvimento.

Em 17/10/2026, o usuário pediu para retomar a prévia anterior mostrada nas capturas: navegação lateral, saldo projetado no topo, gráficos de entradas/saídas e sobra mensal lado a lado, três indicadores abaixo e fluxo com Central de Cartões. Essa é novamente a base de trabalho visual, nas rotas `/` e `/fluxo` do modo design. Régua e Essencial são alternativas separadas de avaliação, não substituem essa base. A escolha não autoriza publicação nem alteração de dados.

Código e prévia local existentes; PREVIA-VISUAL.md registra escopo e verificações da revisão anterior. As referências visuais enviadas pelo usuário orientam o estilo, sem cópia literal. Dados de exemplo identificados como demonstrativos não comprovam a situação financeira real do usuário.

## Product Principles

- Separar previsão, registro e dinheiro efetivamente guardado.
- Tornar compromissos e decisões financeiras fáceis de localizar.
- Manter todas as funções alcançáveis no computador e no celular.
- Melhorar o visual sem alterar dados ou publicar uma proposta ainda em avaliação.

## Accessibility & Inclusion

Preservar navegação por teclado, nomes acessíveis, foco visível, alternativas textuais para gráficos, responsividade e preferência por movimento reduzido.
