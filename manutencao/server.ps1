# ============================================================
#  WL TEC — Servidor HTTP local para /manutencao/
#  Execute: .\server.ps1
#  Acesse:  http://localhost:3030
# ============================================================
$port   = 3030
$root   = "$PSScriptRoot"
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host ""
Write-Host "  =============================" -ForegroundColor Cyan
Write-Host "   WL TEC — Servidor iniciado!" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor Cyan
Write-Host "  Acesse: $prefix" -ForegroundColor Yellow
Write-Host "  Pressione Ctrl+C para parar."  -ForegroundColor Gray
Write-Host ""

# Abre o navegador automaticamente
Start-Process $prefix

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".json" = "application/json"
    ".woff2"= "font/woff2"
    ".woff" = "font/woff"
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $rawPath = $req.Url.LocalPath.TrimStart('/')
        if ($rawPath -eq "") { $rawPath = "index.html" }

        $filePath = Join-Path $root $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType   = $mime
            $res.ContentLength64 = $bytes.Length
            $res.StatusCode    = 200
            $res.OutputStream.Write($bytes, 0, $bytes.Length)

            Write-Host "  [200] $($req.Url.LocalPath)" -ForegroundColor Green
        } else {
            $msg   = [System.Text.Encoding]::UTF8.GetBytes("404 — Arquivo não encontrado: $rawPath")
            $res.StatusCode    = 404
            $res.ContentType   = "text/plain; charset=utf-8"
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)

            Write-Host "  [404] $($req.Url.LocalPath)" -ForegroundColor Red
        }

        $res.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "`n  Servidor encerrado." -ForegroundColor Gray
}
