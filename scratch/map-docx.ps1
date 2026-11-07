$docXml = [xml](Get-Content -Raw -Encoding UTF8 'scratch\extracted_docx\word\document.xml')
$relsXml = [xml](Get-Content -Raw -Encoding UTF8 'scratch\extracted_docx\word\_rels\document.xml.rels')

$relMap = @{}
foreach ($rel in $relsXml.Relationships.Relationship) {
    $relMap[$rel.Id] = Split-Path $rel.Target -Leaf
}

$ns = New-Object System.Xml.XmlNamespaceManager($docXml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')

$paragraphs = $docXml.SelectNodes('//w:p', $ns)
$report = @()
$pIndex = 0
foreach ($p in $paragraphs) {
    $textParts = $p.SelectNodes('.//w:t', $ns)
    $text = if ($textParts) { ($textParts | ForEach-Object { $_.InnerText }) -join '' } else { '' }
    
    $blips = $p.SelectNodes('.//a:blip', $ns)
    $images = @()
    if ($blips) {
        foreach ($blip in $blips) {
            $embedId = $blip.GetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
            if ($embedId -and $relMap.ContainsKey($embedId)) {
                $images += $relMap[$embedId]
            }
        }
    }
    
    if ($text.Trim() -ne '' -or $images.Count -gt 0) {
        Write-Host "[$pIndex] Text: '$($text.Trim())' | Images: $($images -join ', ')"
    }
    $pIndex++
}
