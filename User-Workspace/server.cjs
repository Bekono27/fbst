const http = require('node:http');
const { readFileSync } = require('node:fs');
const page = readFileSync(require('node:path').join(__dirname, 'index.html'));
http.createServer((req, res) => {
  res.writeHead(req.url === '/' ? 200 : 404, {'Content-Type':'text/html; charset=utf-8'});
  res.end(req.url === '/' ? page : 'Not found');
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('User Workspace running on localhost'));
