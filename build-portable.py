"""Build one portable HTML file from local assets; no network or build dependencies."""
from pathlib import Path
import base64, re
ROOT = Path(__file__).resolve().parent
html = (ROOT / 'index.html').read_text(encoding='utf-8')
def data_uri(name, mime):
    return 'data:' + mime + ';base64,' + base64.b64encode((ROOT / name).read_bytes()).decode()
for name, mime in [('assets/logo-centinela.jpg','image/jpeg'),('assets/logo-dimarza.png','image/png')]:
    html = html.replace('./'+name, data_uri(name,mime))
html = re.sub(r'<link rel="(?:manifest|apple-touch-icon)"[^>]*>', '', html)
html = re.sub(r'<link rel="stylesheet" href="\./([^"]+)">', lambda m:'<style>'+ (ROOT/m[1]).read_text(encoding='utf-8')+'</style>', html)
docx=base64.b64encode((ROOT/'assets/plantilla-informe.docx').read_bytes()).decode()
worker=base64.b64encode((ROOT/'assets/vendor/pdf.worker.min.js').read_bytes()).decode()
shim='''<script>
window.__EMBEDDED_DOCX_B64="DOCX_DATA";
window.__PDF_WORKER_B64="WORKER_DATA";
(function(){const original=window.fetch.bind(window);window.fetch=function(input,init){
 const url=typeof input==='string'?input:(input&&input.url)||'';
 if(url.includes('assets/plantilla-informe.docx')){const bytes=Uint8Array.from(atob(window.__EMBEDDED_DOCX_B64),c=>c.charCodeAt(0));return Promise.resolve(new Response(bytes,{status:200}));}
 return original(input,init);
};})();
</script>'''.replace('DOCX_DATA',docx).replace('WORKER_DATA',worker)
html=html.replace('</head>',shim+'</head>')
html=re.sub(r'<script src="\./([^"]+)"></script>', lambda m:'<script>'+(ROOT/m[1]).read_text(encoding='utf-8').replace('</script','<\\/script')+'</script>',html)
html=html.replace('./icons/icon-192.png', data_uri('icons/icon-192.png','image/png'))
out=ROOT/'ABRIR-PARADAS.html';out.write_text(html,encoding='utf-8');print(out.name,round(out.stat().st_size/1048576,1),'MB')
