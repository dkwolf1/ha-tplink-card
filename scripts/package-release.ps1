$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Push-Location (Join-Path $PSScriptRoot '..')
try {
    node scripts/package.mjs
    $releaseVersion = (Get-Content -Raw -LiteralPath package.json | ConvertFrom-Json).version
    $entries = [ordered]@{
        'tplink-deco-mesh-card.js' = 'dist/tplink-deco-mesh-card.js'
        'LICENSE' = 'LICENSE'
    }
    $folder = New-Item -ItemType Directory -Path release -Force
    $zipPath = Join-Path $folder.FullName "ha-tplink-card-v$releaseVersion.zip"
    Compress-Archive -LiteralPath @($entries.Values) -DestinationPath $zipPath -Force
    $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        if ($archive.Entries.Count -ne $entries.Count) { throw 'Unexpected ZIP entries' }
        foreach ($name in $entries.Keys) {
            $entry = $archive.GetEntry($name)
            if (-not $entry) { throw "Missing ZIP entry: $name" }
            $stream = $entry.Open()
            try {
                $archivedHash = (Get-FileHash -InputStream $stream -Algorithm SHA256).Hash
                $sourceHash = (Get-FileHash -LiteralPath $entries[$name] -Algorithm SHA256).Hash
                if ($archivedHash -ne $sourceHash) { throw "ZIP content differs: $name" }
            } finally { $stream.Dispose() }
        }
    } finally { $archive.Dispose() }
    Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
} finally { Pop-Location }
