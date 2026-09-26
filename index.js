const express = require("express");
const cors = require("cors"); 
const { Server } = require("colyseus");
const { createServer } = require("http");
const { SnakeRoom } = require("./Room");

const app = express();
app.use(cors({ origin: "*" })); 
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("snake_room", SnakeRoom);

// CRITICAL FIX: Binds to the cloud host's dynamic port, defaulting to 2567 for local tests
const port = process.env.PORT || 2567;
gameServer.listen(port);

console.log(`Server is listening on port ${port}`);