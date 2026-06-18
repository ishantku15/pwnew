$html = Get-Content c:\Users\kumar\OneDrive\Desktop\pwww\notjitu.html -Raw
$matches = [regex]::Matches($html, '/_next/static/chunks/.*?\.js')
foreach ($m in $matches) {
    $url = 'https://www.notjitu.in' + $m.Value
    Write-Host "Fetching $url"
    try {
        $js = Invoke-RestMethod -Uri $url
        if ($js -match '(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)') {
            Write-Host 'FOUND TOKEN IN JS:'
            Write-Host $matches[1]
        }
    } catch {}
}
Write-Host 'Done.'
