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
        this.apple = new Position();
        this.apple.lat = 47.4979; 
        this.apple.lng = 19.0402;
    }
}
schema.defineTypes(GameState, { players: { map: Player }, apple: Position });

module.exports = { GameState, Player, Position };