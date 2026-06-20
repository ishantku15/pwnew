$h = @{
    'authorization' = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc'
    'client-id' = 'ADMIN'
    'client-type' = 'MOBILE'
    'client-version' = '538'
    'User-Agent' = 'Dalvik/2.1.0'
}

Write-Host "=== DPP API test ==="
$batchId = '6779345c20fa0756e4a7fd08'
# Get first subject ID
$r = Invoke-RestMethod -Uri "https://api.penpencil.co/v3/batches/$batchId/details" -Headers $h
$subjectId = $r.data.subjects[0]._id
Write-Host "SubjectId: $subjectId"

$dpp = Invoke-RestMethod -Uri "https://api.penpencil.co/v3/test-service/tests/dpp?batchId=$batchId&batchSubjectId=$subjectId&isSubjective=false&page=1" -Headers $h
Write-Host "DPP count: $($dpp.data.Count)"
if($dpp.data.Count -gt 0) {
    $dpp.data[0] | ConvertTo-Json -Depth 4
}

Write-Host "`n=== TESTS FILTER API ==="
$tf = Invoke-RestMethod -Uri "https://api.penpencil.co/v3/test-service/tests/filters?batchId=$batchId" -Headers $h
Write-Host "categorySection count: $($tf.data.categorySection.Count)"
$tf.data | ConvertTo-Json -Depth 3
