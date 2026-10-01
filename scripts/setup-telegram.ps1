param(
  [ValidatePattern('^[a-z]{20}$')][string]$ProjectRef = 'wgtktyrmifchgfrpnchh',
  [ValidatePattern('^[A-Za-z][A-Za-z0-9_]{4,31}$')][string]$BotUsername = 'SecondB2Bot',
  [ValidatePattern('^https://[A-Za-z0-9.-]+$')][string]$AppOrigin = 'https://segundo-cerebro-nrd10.vercel.app'
)

# Run only after applying the Telegram SQL migration to this exact project.
# Prompts hide secrets; neither bot token nor Supabase access token are printed.
$ErrorActionPreference = 'Stop'
$telegramRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$telegramSecretFile = Join-Path $telegramRoot ('.telegram-secrets-' + [guid]::NewGuid().ToString('N') + '.local')
$telegramOldAccess = $env:SUPABASE_ACCESS_TOKEN
$telegramOldNodeOptions = $env:NODE_OPTIONS
$telegramToken = $null

function Read-TelegramSecret([string]$Label) {
  $telegramSecureInput = Read-Host $Label -AsSecureString
  $telegramPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($telegramSecureInput)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($telegramPointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($telegramPointer); $telegramSecureInput.Dispose() }
}

function Invoke-TelegramApi([string]$Method, [hashtable]$Body) {
  try {
    $telegramResponse = Invoke-RestMethod -Method Post -Uri ('https://api.telegram.org/bot' + $telegramToken + '/' + $Method) -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10 -Compress)
    if (-not $telegramResponse.ok) { throw 'API error' }
    return $telegramResponse.result
  } catch { throw ('Falha ao chamar Telegram (' + $Method + '). O token não foi exibido.') }
}

try {
  $telegramToken = Read-TelegramSecret 'Token do BotFather'
  if ($telegramToken -notmatch '^\d+:[A-Za-z0-9_-]{30,}$') { throw 'Formato de token inválido.' }
  $telegramMe = Invoke-TelegramApi 'getMe' @{}
  if ($telegramMe.username -ine $BotUsername) { throw 'O token pertence a outro bot. Confira o BotFather.' }
  if (-not $env:SUPABASE_ACCESS_TOKEN) { $env:SUPABASE_ACCESS_TOKEN = Read-TelegramSecret 'Access token da conta administradora do Supabase' }
  $env:NODE_OPTIONS = ($telegramOldNodeOptions + ' --use-system-ca').Trim()
  Push-Location $telegramRoot
  try {
    & npx --yes supabase functions list --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { throw 'Sem acesso administrativo ao projeto informado. Nenhuma configuração foi alterada.' }
    $telegramRandom = New-Object byte[] 32
    $telegramRng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $telegramRng.GetBytes($telegramRandom) } finally { $telegramRng.Dispose() }
    $telegramSecret = -join ($telegramRandom | ForEach-Object { $_.ToString('x2') })
    $telegramLines = @("TELEGRAM_BOT_TOKEN=$telegramToken", "TELEGRAM_WEBHOOK_SECRET=$telegramSecret", "TELEGRAM_BOT_USERNAME=$BotUsername", "APP_ORIGIN=$AppOrigin")
    [IO.File]::WriteAllLines($telegramSecretFile, $telegramLines, (New-Object Text.UTF8Encoding($false)))
    & npx --yes supabase secrets set --project-ref $ProjectRef --env-file $telegramSecretFile
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível configurar os segredos.' }
    & npx --yes supabase functions deploy telegram-account --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível publicar telegram-account.' }
    & npx --yes supabase functions deploy telegram-webhook --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível publicar telegram-webhook.' }
    $telegramWebhook = 'https://' + $ProjectRef + '.supabase.co/functions/v1/telegram-webhook'
    # Negative update id is ignored. This verifies deployment without creating a draft.
    try {
      $telegramProbe = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $telegramWebhook -Headers @{ 'X-Telegram-Bot-Api-Secret-Token' = $telegramSecret } -ContentType 'application/json' -Body '{"update_id":-1}'
      if ($telegramProbe.StatusCode -ne 200) { throw 'Probe failed' }
    } catch { throw 'A função não respondeu ao teste. O webhook do Telegram ainda não foi alterado.' }
    $null = Invoke-TelegramApi 'setWebhook' @{ url = $telegramWebhook; secret_token = $telegramSecret; allowed_updates = @('message', 'callback_query'); max_connections = 5 }
    $null = Invoke-TelegramApi 'setMyCommands' @{ commands = @(
      @{ command = 'gasto'; description = 'Registrar uma despesa com confirmação' },
      @{ command = 'receita'; description = 'Registrar uma receita com confirmação' },
      @{ command = 'credito'; description = 'Registrar uma compra no cartão com confirmação' },
      @{ command = 'cartoes'; description = 'Consultar seus cartões disponíveis' },
      @{ command = 'saldo'; description = 'Consultar a projeção do mês' },
      @{ command = 'ajuda'; description = 'Exemplos e instruções' }
    ) }
    $telegramInfo = Invoke-TelegramApi 'getWebhookInfo' @{}
    if ($telegramInfo.url -ne $telegramWebhook) { throw 'Webhook não confirmado.' }
    Write-Host "Bot @$BotUsername configurado. Abra $AppOrigin/integracoes para vincular sua conta."
  } finally { Pop-Location }
} finally {
  # Verify the resolved temporary file is inside the intended workspace before removal.
  $telegramResolvedSecretFile = [IO.Path]::GetFullPath($telegramSecretFile)
  if ($telegramResolvedSecretFile.StartsWith($telegramRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $telegramResolvedSecretFile)) {
    Remove-Item -LiteralPath $telegramResolvedSecretFile -Force
  }
  $env:SUPABASE_ACCESS_TOKEN = $telegramOldAccess
  $env:NODE_OPTIONS = $telegramOldNodeOptions
  $telegramToken = $null
  $telegramSecret = $null
  $telegramLines = $null
}
