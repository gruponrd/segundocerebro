# Segundo Cérebro

Painel pessoal de finanças e organização, desenvolvido com React, TypeScript, Vite, Tailwind CSS e Supabase.

## Desenvolvimento local

Requisitos: Node.js e npm.

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite (por padrão, `http://localhost:8080`). Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em um arquivo `.env.local`. Nunca coloque a chave `service_role` no frontend.

## Verificação

```sh
npm run lint
npm test
npm run build
```

## Dados e sincronização

Os dados financeiros ficam no Supabase, na tabela `user_financial_data`, com uma cópia local separada por conta. O aplicativo aguarda a leitura da nuvem antes de permitir edição. Se houver divergência com a cópia local, a pessoa escolhe qual versão recuperar. Uma alteração simultânea em outra sessão bloqueia a gravação e pede recarga para evitar sobrescrever dados silenciosamente.

Uma conta nova começa sem bancos, faturas, credores, objetivos ou receitas de exemplo. O calendário de meses começa vazio. O arquivo `src/data/financialData.ts` ainda contém dados de demonstração legados, mas o estado inicial do aplicativo não os carrega.

Cada registro de parcela/fatura representa um lançamento com vencimento próprio. A dívida dos cartões soma uma vez cada lançamento em aberto; `totalInstallments` informa a posição no plano, sem multiplicar o lançamento. O fluxo mensal inclui apenas os lançamentos cadastrados naquele mês. Parcelas futuras que ainda não foram cadastradas não são estimadas automaticamente.

Dados antigos salvos neste navegador sem identificação de conta não são oferecidos nem importados para contas novas. As cópias antigas permanecem intactas para recuperação; contas existentes continuam usando seus registros na nuvem e suas cópias locais identificadas. Os módulos Trade, Desejos, Dream Board, sessões de pagamento, rotina, LifeGame e preferências de notificação usam armazenamento local separado por conta. Esses módulos ainda não sincronizam continuamente com o Supabase e permanecem neste dispositivo. Ao trocar de conta, o estado em memória dos módulos é recriado.

## Cadastro de novas contas

Na tela de acesso, escolha **Criar uma conta nova** e informe nome, email e senha. O nome fica nos metadados da autenticação e no perfil da própria conta. O painel não usa o nome de um usuário existente como alternativa. Novas contas recebem somente um calendário vazio e configurações iniciais, sem dados financeiros de exemplo; um guia no painel aponta para renda, cartões e objetivos.

No Supabase, mantenha o cadastro por email habilitado e as políticas de acesso por `auth.uid()` nas tabelas de perfil e finanças. Se a confirmação de email estiver ativa, configure um SMTP capaz de enviar para usuários externos: o envio padrão do Supabase é restrito aos membros do projeto. Sem SMTP próprio, confirmação e recuperação de senha para convidados não estão prontas para uso. O frontend distingue confirmação pendente de uma conta com sessão já iniciada; não desativa a confirmação por conta própria.

## Telegram

O bot **@SecondB2Bot** pode registrar receitas, despesas e compras no crédito diretamente nos cartões, com confirmação, vinculação à conta e proteção contra duplicatas. A tela `/integracoes` mostra o status real da conexão; o bot depende da publicação das funções e da migração no Supabase correto. Consulte [ativação e testes](docs/telegram.md). Sem acesso administrativo ao projeto, o frontend pode ser publicado mas o bot continua inativo.

## Análises financeiras

A cobertura de renda, a saúde financeira e as projeções são calculadas no próprio aplicativo a partir dos registros cadastrados. Não enviam dados para um provedor de IA, não exigem chave adicional e não geram respostas com modelos de linguagem. As funções antigas de IA foram removidas.

## Hospedagem e independência

O código está no GitHub (`gruponrd/segundocerebro`), a publicação na Vercel e a autenticação e os dados financeiros no Supabase próprio (`wgtktyrmifchgfrpnchh`). O Telegram usa as funções desse mesmo Supabase. Não há serviço operacional ou ferramenta de desenvolvimento do Lovable.

Use npm com `package-lock.json` como fonte única de versões. Após validar uma mudança e enviar à branch `main`, confira o deploy na Vercel. O aplicativo está em https://segundo-cerebro-nrd10.vercel.app/.

A configuração Capacitor abre esse domínio com HTTPS. O identificador nativo original foi mantido para preservar a identidade de instalações existentes; ele não estabelece conexão com a plataforma anterior. Os registros históricos da migração estão em [migração do backend](docs/migracao-backend.md).
