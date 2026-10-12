
const http = require("http");
const { WebSocketServer } = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Servidor Underfall online!");
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on("connection", (ws) => {
  let roomCode = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "join") {
        const code = String(data.code || "").trim().toUpperCase();
        if (!/^[A-Z0-9]{4,8}$/.test(code)) return;

        let room = rooms.get(code);
        if (!room) {
          room = new Set();
          rooms.set(code, room);
        }

        if (room.size >= 8) {
          ws.send(JSON.stringify({ type: "error", message: "Sala cheia" }));
          return;
        }

        if (roomCode) rooms.get(roomCode)?.delete(ws);
        roomCode = code;
        room.add(ws);

        ws.send(JSON.stringify({ type: "joined", code }));
        return;
      }

      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      for (const client of room) {
        if (client !== ws && client.readyState === 1) {
          client.send(message.toString());
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomCode);
  });
});

server.listen(process.env.PORT || 3000, "0.0.0.0");
