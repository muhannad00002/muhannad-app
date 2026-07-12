const http = require("http"), fs = require("fs"), path = require("path");
const dir = __dirname;
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  if(p === "/") p = "/index.html";
  const f = path.join(dir, p);
  fs.readFile(f, (err,data)=>{
    if(err){ res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(f);
    res.writeHead(200, {"Content-Type": {".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webmanifest":"application/manifest+json",".png":"image/png",".svg":"image/svg+xml"}[ext] || "application/octet-stream"});
    res.end(data);
  });
}).listen(8742, ()=>console.log("zaffa on http://localhost:8742"));
