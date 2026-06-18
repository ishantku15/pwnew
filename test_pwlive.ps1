$headers = @{
    "Content-Type" = "application/json"
    "client-id" = "ADMIN"
    "client-type" = "WEB"
}
$body = @{
    username = "8534848815"
    countryCode = "+91"
    organizationId = "5eb393ee95fab7468a79d189"
} | ConvertTo-Json

$endpoints = @(
    "v3/users/send-otp",
    "v1/users/send-otp",
    "v2/users/send-otp",
    "v1/oauth/send-otp"
)

foreach ($ep in $endpoints) {
    $url = "https://api.pw.live/$ep"
    Write-Host "Testing $url"
    try {
        $res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
        Write-Host "Success! $($res | ConvertTo-Json -Compress)"
    } catch {
        Write-Host "Failed: $($_.Exception.Message)"
    }
}
