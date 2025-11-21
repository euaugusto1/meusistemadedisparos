# Script PowerShell para testar webhook do Mercado Pago

$headers = @{
    "Content-Type" = "application/json"
    "x-signature" = "test"
    "x-request-id" = "test-123"
}

$body = @{
    action = "payment.updated"
    api_version = "v1"
    data = @{
        id = "123456"
    }
    date_created = "2021-11-01T02:02:02Z"
    id = 123456
    live_mode = $false
    type = "payment"
    user_id = "222539465"
} | ConvertTo-Json

Write-Host "Testando webhook do Mercado Pago..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "https://dev.wpp.sistemabrasil.online/api/webhooks/mercadopago" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing

    Write-Host "✅ Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Cyan
    }
}
