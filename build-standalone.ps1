$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out = Join-Path $root 'Curva-S-App-Standalone.html'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Text($rel) { [IO.File]::ReadAllText((Join-Path $root $rel), $utf8) }
function To-DataUri($rel, $mime) { "data:$mime;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root $rel))) }

$html = Read-Text 'index.html'

# Logos como data URI (en el HTML y en window.BRANDING)
$logoC = To-DataUri 'assets/logo-centinela.jpg' 'image/jpeg'
$logoD = To-DataUri 'assets/logo-dimarza.png' 'image/png'
$html = $html.Replace('./assets/logo-centinela.jpg', $logoC).Replace('./assets/logo-dimarza.png', $logoD)

# Quitar manifest / iconos (no aplican a un archivo suelto)
$html = [regex]::Replace($html, '<link rel="(manifest|apple-touch-icon)"[^>]*>', '')

# CSS externo -> <style>
$html = [regex]::Replace($html, '<link rel="stylesheet" href="\./([^"]+)">', {
  param($m) '<style>' + (Read-Text $m.Groups[1].Value) + '</style>'
})

# Plantilla Word embebida + fetch que la sirve desde memoria
$docxB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'assets/plantilla-informe.docx')))
$pdfWorkerB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'assets/vendor/pdf.worker.min.js')))
$shim = @"
<script>
window.__EMBEDDED_DOCX_B64 = "$docxB64";
window.__PDF_WORKER_B64 = "$pdfWorkerB64";
(function () {
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('assets/plantilla-informe.docx') !== -1) {
      const bin = atob(window.__EMBEDDED_DOCX_B64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return Promise.resolve(new Response(bytes.buffer, { status: 200 }));
    }
    return realFetch(input, init);
  };
})();
</script>
"@
$html = $html.Replace('</head>', $shim + '</head>')

# <script src="./x.js"></script> -> inline
$html = [regex]::Replace($html, '<script src="\./([^"]+)"></script>', {
  param($m)
  $js = (Read-Text $m.Groups[1].Value).Replace('</script', '<\/script')
  '<script>' + $js + '</script>'
})

[IO.File]::WriteAllText($out, $html, $utf8)
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Listo: $out ($mb MB)"
