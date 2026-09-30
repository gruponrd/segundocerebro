# Migração do backend para Supabase próprio

## Situação verificada

- O frontend está no GitHub e na Vercel; seu layout não precisa ser reconstruído.
- O app usa atualmente o projeto `mwlkilckycgbjfrjeovu`.
- A conta Supabase acessível mostra o projeto `adllwvpomotbqnutxlsk`. Ainda não foi validado como destino da migração.
- Não houve troca da conexão de produção nem alteração de lançamentos durante esta preparação.
- A integração Telegram está preparada no código e depende da instalação no backend definitivo.

## Recuperar a origem

### Alternativa pelo aplicativo autenticado

Quando a conta do Lovable não estiver acessível, abrir **Ferramentas → Cópia dos seus dados → Baixar backup JSON** no aplicativo publicado. A exportação lê somente a linha financeira da conta autenticada e preserva o JSON original, sem normalização. Inclui uma cópia separada do cache financeiro e dos módulos conhecidos que pertencem à conta neste navegador. Não inclui dados legados sem proprietário, outras contas, tokens ou senhas.

Esse arquivo permite migrar os lançamentos para uma nova conta no Supabase próprio. Não substitui um backup completo do backend: o login precisará ser cadastrado no destino, os IDs de propriedade precisam ser mapeados para a nova conta e arquivos de imagem precisam de tratamento separado. Antes da importação, comparar os registros e conferir se houve lançamentos depois da exportação. A exportação não altera dados na origem.

1. Abrir o projeto original no Lovable e confirmar em Cloud que ele usa o banco atual.
2. Em **More → Cloud → Overview → Advanced settings → Export project data**, solicitar a exportação completa do banco. Baixar o arquivo quando estiver disponível.
3. Guardar o backup fora do Git, em local privado. Ele contém dados financeiros, contas e hashes de senhas. Nunca publicar esse arquivo ou incluí-lo em um commit.
4. Conferir Storage separadamente: o backup do banco não inclui os arquivos armazenados. Baixar os arquivos necessários e registrar seus caminhos.
5. Inventariar autenticação, funções, segredos, integrações e eventuais tarefas agendadas.

## Preparar e validar o destino

1. Confirmar a propriedade e o conteúdo do projeto de destino antes de restaurar. Se houver dados de outra aplicação, usar um projeto separado.
2. Inspecionar o formato do backup para escolher o procedimento de restauração. Uma exportação completa já inclui o esquema; não executar as migrações iniciais por cima de tabelas restauradas.
3. Restaurar os registros com seus IDs originais, incluindo usuários e identidades de autenticação. Configurar novamente provedores, URLs de redirecionamento e chaves do novo projeto.
4. Comparar origem e destino: tabelas, quantidade de registros, IDs, conteúdo integral do JSON financeiro, políticas RLS, funções e relacionamentos. A conferência dos dados deve ser somente leitura.
5. Migrar arquivos de Storage e ajustar referências apenas quando necessário, sem substituir os lançamentos do usuário.
6. Instalar as funções do aplicativo e aplicar apenas as migrações ainda ausentes, incluindo a integração Telegram.
7. Validar em uma prévia separada: login, leitura dos registros, isolamento entre contas e gravação em conta de teste. Não criar lançamentos fictícios na conta real.

## Dependência adicional de IA

As funções `analyze-income` e `income-coverage` usam o gateway de IA do Lovable e o segredo `LOVABLE_API_KEY`. Migrar apenas o banco não remove essa dependência. Para independência completa, definir um provedor substituto ou uma alternativa local para essas funções antes de declarar a migração concluída. O bot Telegram não depende desse gateway.

## Troca da aplicação publicada

1. Coordenar uma breve pausa nos lançamentos e capturar o estado final da origem; a exportação anterior pode não incluir edições feitas depois dela.
2. Confirmar a restauração desse estado e o login no destino.
3. Atualizar as variáveis Supabase da Vercel e do ambiente local, além de `supabase/config.toml`; gerar um novo deploy.
4. Conferir o app no domínio atual e validar a leitura em outro dispositivo. Sessões antigas exigirão novo login.
5. Ativar o bot com `scripts/setup-telegram.ps1 -ProjectRef <projeto-destino>` depois da instalação do SQL.
6. Manter a origem disponível até confirmar a migração. Remover Cloud apaga o backend antigo permanentemente e deve ser tratado como uma decisão separada.

Se precisar retornar à origem após novos lançamentos no destino, primeiro preservar e reconciliar essas alterações. Uma simples troca de variáveis não transfere dados entre bancos.

## Referências

- [Exportação completa, contas e senhas](https://docs.lovable.dev/features/advanced-settings)
- [Migração para hospedagem externa](https://docs.lovable.dev/tips-tricks/external-deployment-hosting)
- [Identificar backend Lovable Cloud ou Supabase próprio](https://supabase.com/docs/guides/troubleshooting/identify-lovable-cloud-or-supabase-backend)
