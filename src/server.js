import http from "http";
import { Server } from "socket.io";
// import WebSocket, { WebSocketServer } from "ws";
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

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer); //backend에 socket.io 설치

wsServer.on("connection", (socket) => {
  socket["nickname"] = "Anon";
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName); //방에 들어감
    //    console.log(socket.rooms);
    //{ socket.id(유저와 서버 사이의 프라이빗 방)), roomName(새로만든방) }
    done();
    socket.to(roomName).emit("welcome", `Welcome ${socket.nickname}!`);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", `${socket.nickname} left 🥹`)
    );
  });
  //new_message를 받으면
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
  socket.on("nickname", (name) => {
    socket["nickname"] = name;
  });
});
/* 
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
 */

const handleListen = () => console.log(`Listening on http://localhost:3000`);

httpServer.listen(3000, handleListen);
