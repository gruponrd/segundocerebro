# Telegram · Segundo Cérebro

Bot escolhido: **@SecondB2Bot**. A publicação do frontend não ativa as Edge Functions: é necessário acesso administrativo ao mesmo Supabase usado pelo aplicativo.

Em 30/09/2026, as funções foram instaladas no Supabase próprio **wgtktyrmifchgfrpnchh**, o token foi salvo diretamente pelo usuário e o registro do webhook foi verificado no primeiro link de conexão. O app publicado consulta o status sem erro. Cada usuário ainda precisa concluir seu vínculo pelo botão **Iniciar** no Telegram.

## Ativação

1. Confira `VITE_SUPABASE_URL` no ambiente Production da Vercel. O destino validado e publicado é **wgtktyrmifchgfrpnchh**. Não substitua por outro projeto sem backup e conferência dos dados e da autenticação.
2. A migração `20260930010000_telegram_integration.sql` já foi aplicada em **wgtktyrmifchgfrpnchh**, e as duas Edge Functions foram publicadas pelo dashboard. Não executar novamente as migrações instaladas. Em um novo destino, executar a migração Telegram somente após preparar a estrutura financeira.
3. Na instalação pelo dashboard, salve o token do **@SecondB2Bot** em **Edge Functions → Secrets → TELEGRAM_BOT_TOKEN**. Não é necessário um access token administrativo para esse caminho: as funções já foram publicadas. O segredo do webhook é derivado no servidor; ao clicar em conectar no aplicativo, a função valida a identidade do bot, registra o webhook e verifica a URL antes de devolver o link pessoal.

   Como alternativa para uma instalação pela CLI, com uma conta que administra esse projeto, execute no PowerShell:

   ```powershell
   .\scripts\setup-telegram.ps1
   ```

   O script solicita o token do BotFather e, se necessário, um access token administrativo do Supabase em campos ocultos. Não envie tokens pelo chat, não os coloque no frontend, no Git ou em variáveis `VITE_*`. O arquivo temporário `.local` é ignorado pelo Git e removido ao terminar. Os segredos definitivos ficam nas Edge Functions.
4. Abra `/integracoes` no app autenticado, gere um link e toque em **Iniciar** no Telegram. O link é pessoal, expira em 10 minutos e só pode ser usado uma vez.
5. Confira o status conectado. Para validar o percurso sem alterar dados reais, envie uma mensagem e **cancele a prévia**. A primeira gravação real deve ser um lançamento legítimo confirmado pelo usuário; não crie lançamentos fictícios em produção.

Se não houver acesso ao projeto, a integração permanece em preparação. Não se deve apontar o app para um banco vazio para contornar isso. Se o backend for gerenciado pelo Lovable, siga o plano de [migração para Supabase próprio](migracao-backend.md) antes de ativar o bot no novo projeto.

## Uso

```text
/gasto 45,90 mercado
/receita 3000 salário
/gasto 120 internet | contas | pendente
/receita 500 freelance | 10/2026 | pendente
/saldo
/saldo 09/2026
/ajuda
```

O bot registra receitas e despesas do **Fluxo**, após confirmação. O padrão é pago/recebido e mês da mensagem no fuso America/Sao_Paulo. As prévias mostram a categoria sugerida, o mês, o valor e a situação; expiram em 15 minutos. `| pendente` registra uma previsão. Categoria explícita pode ser moradia, alimentacao, transporte, lazer, saude, educacao, assinaturas, compras, contas, investimento ou outros.

Compras no crédito, parcelas, áudios e fotos não são suportados nesta versão. O comando `/saldo` mostra a projeção mensal com receitas, despesas do fluxo e parcelas de cartões; não representa um saldo bancário obtido de instituições.

## Proteções de dados

- Endpoint de conta verifica o JWT com `auth.getUser`; tabelas têm RLS e permissões mínimas.
- O histórico consulta apenas colunas concedidas ao app; RLS aplica o filtro de proprietário. O teste PostgreSQL verifica que essa leitura funciona com as permissões mínimas e não expõe o histórico de outra conta.
- Webhook exige o cabeçalho secreto do Telegram e aceita apenas conversa privada com remetente igual ao ID do chat.
- O código de vinculação é aleatório; apenas seu hash fica no banco. Um Telegram não se vincula a duas contas e uma conta vinculada não é substituída por outro link.
- Confirmar bloqueia a conexão, a prévia e a linha financeira na transação SQL. A função acrescenta apenas um item ao mês apropriado na versão mais recente dos dados.
- `update_id` único e estado da prévia impedem duplicatas em reentregas e cliques repetidos. Limite de 200 prévias por conta por dia.
- Desconectar cancela prévias e revoga a conexão, preservando os lançamentos já salvos e seu histórico.
- O app busca mudanças ao voltar ao foco e a cada minuto quando visível. Uma edição local não salva é preservada e sinaliza conflito; não é substituída silenciosamente. A cópia local que estava sincronizada pode receber a versão mais recente da nuvem.
- Nenhum JWT, token, link de vinculação ou conteúdo financeiro deve ser impresso em logs.

## Verificação local

```sh
npm test
npm run test:telegram-db
npm run build
```

Os testes de banco usam PostgreSQL em memória via PGlite, com dados fictícios e sem conexão ao Supabase. Verificam preservação dos registros, idempotência, usuário incorreto, expiração, cancelamento, novo mês, permissões e desconexão. A simulação local não substitui o teste de ponta a ponta após a ativação.

Custos: API de bots do Telegram gratuita; funções e banco sujeitos às cotas do plano Supabase. Esta versão não usa API de IA paga.
