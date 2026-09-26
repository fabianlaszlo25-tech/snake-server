const express = require("express");
const cors = require("cors"); 
const { Server } = require("colyseus");
const { createServer } = require("http");
const { SnakeRoom } = require("./Room");

const app = express();

// Setting origin to true automatically echoes the requesting origin (GitHub Pages) 
// to satisfy the strict credentials policy without a wildcard.
const corsOptions = {
    origin: true, 
    credentials: true
};

app.use(cors(corsOptions)); 

// CRITICAL: No app.use(express.json()) here. 
// We are leaving the HTTP stream untouched so Colyseus can parse it.

app.get("/", (req, res) => {
    res.send("GEO SNAKE BACKEND IS ONLINE");
});

const httpServer = createServer(app);

const gameServer = new Server({ 
    server: httpServer,
    cors: corsOptions
});

gameServer.define("snake_room", SnakeRoom);

const port = process.env.PORT || 2567;
gameServer.listen(port);
console.log(`Server listening on port ${port}`);