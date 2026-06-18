$html = Get-Content c:\Users\kumar\OneDrive\Desktop\pwww\notjitu.html -Raw
if ($html -match '(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)') {
    Write-Host 'Token Found:'
    Write-Host $matches[1]
} else {
    Write-Host 'No Token Found'
}
