const express = require("express");
const cors = require("cors"); 
const { Server } = require("colyseus");
const { createServer } = require("http");
const { SnakeRoom } = require("./Room");

const app = express();
app.use(cors()); 
app.use(express.json());

app.get("/", (req, res) => {
    res.send("GEO SNAKE BACKEND IS ONLINE");
});

const httpServer = createServer(app);

// CRITICAL FIX: Colyseus requires its own CORS policy for the HTTP matchmaking phase
const gameServer = new Server({ 
    server: httpServer,
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"]
    }
});

gameServer.define("snake_room", SnakeRoom);

const port = process.env.PORT || 2567;
gameServer.listen(port);
console.log(`Server listening on port ${port}`);