# TCG 运营后台冒烟测试
# 使用方法：pwsh -File scripts/test-tcg-admin.ps1
$base = 'http://localhost:3000'
$s = $null
$body = @{ email = 'tcg-super@chenze.com'; password = 'tcg123456' } | ConvertTo-Json

Write-Host '--- 1. 登录 ---' -ForegroundColor Cyan
$login = Invoke-WebRequest -Method POST -Uri "$base/api/tcg/admin/auth/login" -ContentType 'application/json; charset=utf-8' -Body $body -SessionVariable s
Write-Host $login.Content

Write-Host ''
Write-Host '--- 2. 获取当前运营 ---' -ForegroundColor Cyan
(Invoke-WebRequest -Uri "$base/api/tcg/admin/auth/me" -WebSession $s).Content

Write-Host ''
Write-Host '--- 3. 仪表盘统计 ---' -ForegroundColor Cyan
(Invoke-WebRequest -Uri "$base/api/tcg/admin/stats" -WebSession $s).Content

Write-Host ''
Write-Host '--- 4. 卡池列表（前 3 张） ---' -ForegroundColor Cyan
(Invoke-WebRequest -Uri "$base/api/tcg/admin/cards?page=1&pageSize=3" -WebSession $s).Content

Write-Host ''
Write-Host '--- 5. 玩家列表 ---' -ForegroundColor Cyan
(Invoke-WebRequest -Uri "$base/api/tcg/admin/players?page=1&pageSize=5" -WebSession $s).Content

Write-Host ''
Write-Host '--- 6. 战报列表 ---' -ForegroundColor Cyan
(Invoke-WebRequest -Uri "$base/api/tcg/admin/matches?page=1&pageSize=5" -WebSession $s).Content

Write-Host ''
Write-Host '--- 7. 登出 ---' -ForegroundColor Cyan
(Invoke-WebRequest -Method POST -Uri "$base/api/tcg/admin/auth/logout" -WebSession $s).Content
