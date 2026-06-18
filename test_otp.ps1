$headers = @{
    "Content-Type" = "application/json"
    "client-id" = "ADMIN"
    "client-type" = "MOBILE"
    "client-version" = "538"
}
$body = @{
    username = "8534848815"
    countryCode = "+91"
    organizationId = "5eb393ee95fab7468a79d189"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.penpencil.co/v3/users/send-otp" -Method Post -Headers $headers -Body $body
