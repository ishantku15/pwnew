$h = @{
    'authorization' = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc'
    'client-id' = 'ADMIN'
    'client-type' = 'MOBILE'
    'client-version' = '538'
    'User-Agent' = 'Dalvik/2.1.0'
}

Write-Host "=== SUBJECT FIELDS ==="
$r = Invoke-RestMethod -Uri 'https://api.penpencil.co/v3/batches/6779345c20fa0756e4a7fd08/details' -Headers $h
$sub = $r.data.subjects[0]
Write-Host "Fields: $($sub.PSObject.Properties.Name -join ', ')"
Write-Host "imageIds: $(ConvertTo-Json $sub.imageIds -Depth 4)"
Write-Host "lectureCount: $($sub.lectureCount)"
Write-Host "subject name: $($sub.subject)"

Write-Host "`n=== FACULTY DETAILS ==="
$teachers = '60879b8eeb913f00448eeda8'
$t = Invoke-RestMethod -Uri "https://api.penpencil.co/v1/users/get-user-details-list?userIds=$teachers" -Headers $h
$t.data[0] | Select-Object firstName, lastName, imageId | ConvertTo-Json -Depth 4
