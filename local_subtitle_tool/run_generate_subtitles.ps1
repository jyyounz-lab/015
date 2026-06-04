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
  Write-Host "Virtual environment not found. Please run:" -ForegroundColor Yellow
  Write-Host "python -m venv .venv"
  Write-Host ".\.venv\Scripts\Activate.ps1"
  Write-Host "python -m pip install -r requirements.txt"
  exit 1
}

$ScriptPath = Join-Path $ScriptDir "generate_subtitles.py"

if ($OutputDir -ne "") {
  & $PythonExe $ScriptPath `
    --input $InputPath `
    --output-dir $OutputDir `
    --model $Model `
    --language $Language `
    --device $Device `
    --compute-type $ComputeType `
    --max-chars $MaxChars `
    --max-duration $MaxDuration
} else {
  & $PythonExe $ScriptPath `
    --input $InputPath `
    --model $Model `
    --language $Language `
    --device $Device `
    --compute-type $ComputeType `
    --max-chars $MaxChars `
    --max-duration $MaxDuration
}
