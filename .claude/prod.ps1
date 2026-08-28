$nodeDir = "C:\Program Files\nodejs"
if ($env:Path -notlike "*$nodeDir*") {
  $env:Path = "$nodeDir;$env:Path"
}

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir
& npm run start
