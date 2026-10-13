$ErrorActionPreference='Stop'
$labDirectory=$PSScriptRoot
Set-Location -LiteralPath $labDirectory
& node server.mjs
