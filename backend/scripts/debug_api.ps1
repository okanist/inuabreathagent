# Load .env manually
$envFile = "c:\Code\InuaBreath\backend\.env"
Get-Content $envFile | ForEach-Object {
    if ($_ -match "(.+)=(.+)") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

$key = $env:IOINTELLIGENCE_API_KEY
if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Host "ERROR: Key is empty"
    exit
}

Write-Host "Key loaded: $($key.Substring(0, 10))... (Length: $($key.Length))"

# Test 1: GET Models
Write-Host "`n--- Test 1: GET Models ---"
try {
    $response = Invoke-RestMethod -Method Get -Uri "https://api.intelligence.io.solutions/api/v1/models" -Headers @{Authorization=("Bearer " + $key)}
    Write-Host "Success! Found $($response.data.Count) models:"
    $response.data | ForEach-Object { Write-Host " - $($_.id)" }
} catch {
    Write-Host "Failed: $_"
    exit
}

# Test 2a: POST Chat (Standard)
Write-Host "`n--- Test 2a: POST Chat (/api/v1/chat/completions) ---"
$body = @{
    model = "Llama-4-Maverick-17B-128E-Instruct-FP8"
    messages = @(
        @{role="system"; content="You are a helpful assistant."},
        @{role="user"; content="Hello"}
    )
} | ConvertTo-Json -Depth 3

try {
    $r = Invoke-RestMethod -Method Post -Uri "https://api.intelligence.io.solutions/api/v1/chat/completions" -Headers @{Authorization=("Bearer " + $key); "Content-Type"="application/json"} -Body $body
    Write-Host "Success! Response: $($r | ConvertTo-Json -Depth 2)"
} catch { Write-Host "Failed: $($_.Exception.Message)" }

# Test 3: POST Workflows (Probe)
Write-Host "`n--- Test 3: POST Workflows (/api/v1/workflows/run) ---"
$body = @{
    objective = "Test connectivity"
    agent_names = @("linear_agent") 
    args = @{
        type = "custom"
        name = "test"
    }
} | ConvertTo-Json -Depth 3

try {
    $r = Invoke-RestMethod -Method Post -Uri "https://api.intelligence.io.solutions/api/v1/workflows/run" -Headers @{Authorization=("Bearer " + $key); "Content-Type"="application/json"} -Body $body
    Write-Host "Success! Response: $($r | ConvertTo-Json -Depth 2)"
} catch { 
    Write-Host "Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
