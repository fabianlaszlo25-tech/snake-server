const express = require("express");
const cors = require("cors"); 
const { Server } = require("colyseus");
const { createServer } = require("http");
const { SnakeRoom } = require("./Room");

const app = express();
app.use(cors({ origin: "*" })); 
app.use(express.json());

// HEALTH CHECK: If you visit the Render URL in a browser, you should see this text.
app.get("/", (req, res) => {
    res.send("GEO SNAKE BACKEND IS ONLINE AND ROUTING TRAFFIC");
});

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("snake_room", SnakeRoom);

const port = process.env.PORT || 2567;
gameServer.listen(port);

console.log(`Server is listening on port ${port}`);