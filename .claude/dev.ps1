param(
  [int]$Port = 5173
)

# Node.js a fost instalat prin winget; procesele deja pornite nu vad automat noul
# PATH din registry, asa ca il adaugam explicit aici, pentru acest proces si pentru
# tot ce porneste el (npm, vite, nodemon).
$nodeDir = "C:\Program Files\nodejs"
if ($env:Path -notlike "*$nodeDir*") {
  $env:Path = "$nodeDir;$env:Path"
}

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir
& npm run dev
