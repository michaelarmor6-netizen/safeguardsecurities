$apiKey = "re_bYa6Dkvc_BHQtbTz187XFiwdEobN237Qv"
$headers = @{ Authorization = "Bearer $apiKey" }
try {
  $r = Invoke-RestMethod -Method Get -Uri "https://api.resend.com/domains" -Headers $headers
  $r.data | Select-Object id,name,status,region,created_at | Format-Table -AutoSize
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow }
}
