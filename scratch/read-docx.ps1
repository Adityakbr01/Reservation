Add-Type -AssemblyName System.IO.Compression.FileSystem
$docPath = Resolve-Path "docs\changes\Booking portal feedback (1).docx"
$outDir = Join-Path $PSScriptRoot "extracted_docx"
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
[System.IO.Compression.ZipFile]::ExtractToDirectory($docPath, $outDir)

$docXmlPath = Join-Path $outDir "word\document.xml"
[xml]$doc = Get-Content -Raw -Encoding UTF8 $docXmlPath
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$paragraphs = $doc.SelectNodes("//w:p", $ns)
$lines = @()
foreach ($p in $paragraphs) {
    $parts = $p.SelectNodes(".//w:t", $ns)
    if ($parts) {
        $text = ($parts | ForEach-Object { $_.InnerText }) -join ""
        if ($text.Trim() -ne "") {
            $lines += $text.Trim()
        }
    }
}

$outputFile = Join-Path $PSScriptRoot "docx_text.txt"
$lines | Set-Content -Encoding UTF8 $outputFile
Write-Host "Extracted $($lines.Count) lines to $outputFile"

# Also check word/media files
$mediaDir = Join-Path $outDir "word\media"
if (Test-Path $mediaDir) {
    $mediaFiles = Get-ChildItem -Path $mediaDir
    Write-Host "Found $($mediaFiles.Count) media files in docx"
}

