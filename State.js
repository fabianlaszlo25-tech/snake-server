const schema = require("@colyseus/schema");
const { Schema, MapSchema, ArraySchema } = schema;

class Position extends Schema {}
schema.defineTypes(Position, { lat: "number", lng: "number" });

class Player extends Schema {
    constructor() {
        super();
        this.body = new ArraySchema();
        this.direction = "up";
    }
}
schema.defineTypes(Player, { body: [Position], direction: "string" });

class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        // Convert single apple to a dynamic Map for multiple apples
        this.apples = new MapSchema(); 
    }
}
schema.defineTypes(GameState, { players: { map: Player }, apples: { map: Position } });

module.exports = { GameState, Player, Position };