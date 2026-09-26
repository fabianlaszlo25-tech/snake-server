const express = require("express");
const cors = require("cors");
const { Server } = require("colyseus");
const { createServer } = require("http");
const { SnakeRoom } = require("./Room");

const app = express();

// Engedélyezi a böngésző számára a más portokról érkező hálózati kéréseket
app.use(cors()); 

// KRITIKUS JAVÍTÁS: Lehetővé teszi az Express számára a beérkező JSON formátumú helyfoglalási kérések értelmezését
app.use(express.json()); 

const httpServer = createServer(app);

const gameServer = new Server({
    server: httpServer
});

gameServer.define("snake_room", SnakeRoom);

gameServer.listen(2567);

console.log("Server is listening on ws://localhost:2567");