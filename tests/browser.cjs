const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
exports.run=async function(fn){
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root)){res.writeHead(403);return res.end()};fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);return res.end('Not found')};const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})[ext]||'application/octet-stream');res.end(buf)})});
 await new Promise(r=>server.listen(8765,'0.0.0.0',r));
 const b=await chromium.launch({headless:true, ...(process.env.PARADAS_TEST_CHROMIUM ? {executablePath:process.env.PARADAS_TEST_CHROMIUM,args:['--no-sandbox']} : {})});
 try{await fn(b)}finally{await b.close();server.close()}
};
