# TheSecondBrain

Painel pessoal de finanças e organização, desenvolvido com React, TypeScript, Vite, Tailwind CSS e Supabase.

## Desenvolvimento local

Requisitos: Node.js e npm.

```sh
npm install
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

Dados antigos salvos neste navegador sem identificação de conta exigem confirmação explícita antes de serem associados à conta aberta. Os módulos Trade, Desejos, Dream Board, sessões de pagamento, rotina, LifeGame e preferências de notificação passam a usar armazenamento local separado por conta. Esses módulos ainda não sincronizam com o Supabase e permanecem neste dispositivo.

## Funções de IA

As funções `analyze-income` e `income-coverage` exigem sessão autenticada, validam a entrada e consomem uma cota de cinco chamadas por hora, por função e usuário. Antes de implantá-las, aplique a migração `supabase/migrations/20260921210000_ai_quota.sql` no projeto Supabase correspondente e configure `LOVABLE_API_KEY` como segredo das Edge Functions. As alterações locais nessas funções não entram em produção apenas com o build do frontend.
