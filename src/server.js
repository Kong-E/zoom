import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import livereloadMiddleware from "connect-livereload";
import livereload from "livereload";
import express from "express";
import path from "path";
const __dirname = path.resolve();
const liveServer = livereload.createServer({
  exts: ["js", "pug", "css"],
  delay: 1000,
});

liveServer.watch(__dirname);

const app = express();

app.use(livereloadMiddleware());

app.set("view engine", "pug");
app.set("views", __dirname + "/src/views");
app.use("/public", express.static(__dirname + "/src/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

// 2개가 같은 port에 있길 원해서 이렇게 한거고 wss만 만들어도 ok
const server = http.createServer(app);
// http 서버위에 ws 서버를 만듦
const wss = new WebSocketServer({ server });

const sockets = [];

wss.on("connection", (socket) => {
  sockets.push(socket);
  console.log("Connected to Browser ✅");
  socket.on("close", () => console.log("Disconnected from the Browser ❌"));
  socket.on("message", (msg) => {
    const message = JSON.parse(msg);
    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(`${socket.nickname}: ${message.payload}`)
        );
        break;
      case "nickname":
        socket["nickname"] = message.payload;
        break;
    }
  });
});

server.listen(3000, handleListen);
