const http = require("http"), fs = require("fs"), path = require("path");
const dir = __dirname;
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  if(p === "/") p = "/index.html";
  const f = path.join(dir, p);
  fs.readFile(f, (err,data)=>{
    if(err){ res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(f);
    res.writeHead(200, {"Content-Type": {".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css"}[ext] || "application/octet-stream"});
    res.end(data);
  });
}).listen(8741, ()=>console.log("sayr on 8741"));
