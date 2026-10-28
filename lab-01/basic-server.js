const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Hello");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Basic HTTP server running on port ${PORT}`);
});
