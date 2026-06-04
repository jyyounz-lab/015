param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$OutputDir = "",
  [string]$Model = "small",
  [string]$Language = "zh",
  [string]$Device = "auto",
  [string]$ComputeType = "int8",
  [int]$MaxChars = 32,
  [double]$MaxDuration = 6
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
  Write-Host "找不到虛擬環境，請先執行：" -ForegroundColor Yellow
  Write-Host "python -m venv .venv"
  Write-Host ".\.venv\Scripts\Activate.ps1"
  Write-Host "python -m pip install -r requirements.txt"
  exit 1
}

$ArgsList = @(
  (Join-Path $ScriptDir "generate_subtitles.py"),
  "--input", $InputPath,
  "--model", $Model,
  "--language", $Language,
  "--device", $Device,
  "--compute-type", $ComputeType,
  "--max-chars", $MaxChars,
  "--max-duration", $MaxDuration
)

if ($OutputDir -ne "") {
  $ArgsList += @("--output-dir", $OutputDir)
}

& $PythonExe @ArgsList
