$ErrorActionPreference = "Stop"

$ProjectName = "SanSebastian"
$Region = "sa-east-1"
$AdminEmail = "admin@sansebastian.com"
$AdminPassword = "SanSebastian2026!"
$OperadorEmail = "operador@sansebastian.com"
$OperadorPassword = "Operador2026!"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "=== San Sebastian - Setup Supabase ===" -ForegroundColor Cyan

function Invoke-SupabaseJson {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
  $allArgs = @("supabase") + $CliArgs + @("-o", "json")
  $raw = & npx @allArgs 2>&1 | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] -or $_.ToString() -notmatch 'Cannot find project ref' }
  $text = ($raw | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -and -not $text.StartsWith('[') -and -not $text.StartsWith('{')) {
    throw $text
  }
  return ($text | ConvertFrom-Json)
}

Write-Host "Verificando sesion de Supabase CLI..." -ForegroundColor Yellow
try {
  $orgs = Invoke-SupabaseJson "orgs" "list"
} catch {
  Write-Host ""
  Write-Host "No hay sesion activa. Ejecuta primero en esta carpeta:" -ForegroundColor Red
  Write-Host "  cd `"$Root`"" -ForegroundColor White
  Write-Host "  npx supabase login" -ForegroundColor White
  Write-Host ""
  Write-Host "Se abrira el navegador. Luego volve a correr:" -ForegroundColor Yellow
  Write-Host "  npm run setup:supabase" -ForegroundColor White
  exit 1
}

if (-not $orgs -or @($orgs).Count -eq 0) {
  throw "No se encontraron organizaciones en tu cuenta Supabase."
}

$orgId = $orgs[0].id
Write-Host "Organizacion: $($orgs[0].name) ($orgId)" -ForegroundColor Green

$projects = Invoke-SupabaseJson "projects" "list"
$existing = @($projects | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1)

if ($existing) {
  Write-Host "Proyecto '$ProjectName' ya existe (ref: $($existing.id))." -ForegroundColor Yellow
  $projectRef = $existing.id
} else {
  $dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  $dbPassword += "A1!"
  $dbPassword | Out-File -FilePath (Join-Path $Root ".supabase-db-password.local") -Encoding utf8 -Force
  Write-Host "Creando proyecto '$ProjectName' en $Region..." -ForegroundColor Yellow
  Write-Host "Password de DB guardada en .supabase-db-password.local" -ForegroundColor DarkYellow

  $created = Invoke-SupabaseJson "projects" "create" $ProjectName "--org-id" $orgId "--db-password" $dbPassword "--region" $Region
  $projectRef = $created.id
  Write-Host "Proyecto creado. Ref: $projectRef - esperando provision..." -ForegroundColor Green

  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 10
    $projects = Invoke-SupabaseJson "projects" "list"
    $proj = @($projects | Where-Object { $_.id -eq $projectRef } | Select-Object -First 1)
    if ($proj -and $proj.status -eq "ACTIVE_HEALTHY") {
      Write-Host "Proyecto listo." -ForegroundColor Green
      break
    }
    Write-Host "  Esperando... ($($i + 1)/60)" -ForegroundColor DarkGray
    if ($i -eq 59) { throw "Timeout esperando que el proyecto este activo." }
  }
}

if (-not (Test-Path (Join-Path $Root "supabase\config.toml"))) {
  Write-Host "Inicializando supabase/ local..." -ForegroundColor Yellow
  & npx supabase init 2>&1 | Out-Null
}

Write-Host "Enlazando proyecto..." -ForegroundColor Yellow
& npx supabase link --project-ref $projectRef --yes 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Error al enlazar proyecto." }

Write-Host "Aplicando schema.sql..." -ForegroundColor Yellow
& npx supabase db query --linked -f (Join-Path $Root "schema.sql") 2>&1
if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar schema.sql" }

Write-Host "Obteniendo API keys..." -ForegroundColor Yellow
$keysRaw = & npx supabase projects api-keys --project-ref $projectRef -o json 2>&1
if ($LASTEXITCODE -ne 0) { throw ($keysRaw | Out-String) }
$keys = ($keysRaw | Out-String | ConvertFrom-Json)

$anonKey = ($keys | Where-Object { $_.name -match "anon" } | Select-Object -First 1).api_key
$serviceKey = ($keys | Where-Object { $_.name -match "service_role" } | Select-Object -First 1).api_key

if (-not $anonKey) { throw "No se pudo obtener la anon key." }

$supabaseUrl = "https://$projectRef.supabase.co"
$envContent = "VITE_SUPABASE_URL=$supabaseUrl`nVITE_SUPABASE_ANON_KEY=$anonKey`n"

$envPath = Join-Path $Root ".env"
$envContent | Out-File -FilePath $envPath -Encoding utf8 -Force
Write-Host ".env creado en $envPath" -ForegroundColor Green

if ($serviceKey) {
  function New-AuthUser {
    param([string]$Email, [string]$Password, [string]$Nombre, [string]$Rol)
    $body = @{
      email = $Email
      password = $Password
      email_confirm = $true
      user_metadata = @{
        nombre = $Nombre
        rol = $Rol
      }
    } | ConvertTo-Json -Depth 3

    try {
      Invoke-RestMethod `
        -Uri "$supabaseUrl/auth/v1/admin/users" `
        -Method Post `
        -Headers @{
          Authorization = "Bearer $serviceKey"
          apikey = $anonKey
          "Content-Type" = "application/json"
        } `
        -Body $body | Out-Null
      Write-Host "Usuario creado: $Email ($Rol)" -ForegroundColor Green
    } catch {
      Write-Host "Usuario $Email : $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
  }

  Write-Host "Creando usuarios de prueba..." -ForegroundColor Yellow
  New-AuthUser -Email $AdminEmail -Password $AdminPassword -Nombre "Administrador" -Rol "Administrador"
  New-AuthUser -Email $OperadorEmail -Password $OperadorPassword -Nombre "Operador Demo" -Rol "Operador"
}

Write-Host ""
Write-Host "=== SETUP COMPLETO ===" -ForegroundColor Cyan
Write-Host "URL:      $supabaseUrl"
Write-Host "Admin:    $AdminEmail / $AdminPassword"
Write-Host "Operador: $OperadorEmail / $OperadorPassword"
Write-Host ""
Write-Host "Reinicia el servidor de desarrollo:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
