const colyseus = require("colyseus");
const { GameState, Player, Position } = require("./State");

class SnakeRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new GameState());
        
        // Increased to ~30 FPS for smooth Mapbox rendering
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

        this.onMessage("spawn", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.body.length === 0) {
                for (let i = 0; i < 5; i++) {
                    const pos = new Position();
                    pos.lat = message.lat - (i * 0.0001);
                    pos.lng = message.lng;
                    player.body.push(pos);
                }
                this.moveApple(message.lat, message.lng);
            }
        });

        this.onMessage("direction", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.body.length > 0) {
                if (message === "up" && player.direction !== "down") player.direction = message;
                if (message === "down" && player.direction !== "up") player.direction = message;
                if (message === "left" && player.direction !== "right") player.direction = message;
                if (message === "right" && player.direction !== "left") player.direction = message;
            }
        });
    }

    onJoin(client, options) {
        this.state.players.set(client.sessionId, new Player());
    }

    onLeave(client, consented) {
        this.state.players.delete(client.sessionId);
    }

    moveApple(baseLat, baseLng) {
        // Spawns the apple within a randomized city-block radius
        this.state.apple.lat = baseLat + (Math.random() - 0.5) * 0.004;
        this.state.apple.lng = baseLng + (Math.random() - 0.5) * 0.004;
    }

    update(deltaTime) {
        const moveSpeed = 0.00015; // Scaled for 30 FPS
        const appleHitbox = 0.0003; 

        this.state.players.forEach((player, sessionId) => {
            if (player.body.length > 0) {
                const head = player.body[0];
                const newHead = new Position();
                newHead.lat = head.lat;
                newHead.lng = head.lng;

                if (player.direction === "up") newHead.lat += moveSpeed;
                if (player.direction === "down") newHead.lat -= moveSpeed;
                if (player.direction === "left") newHead.lng -= moveSpeed;
                if (player.direction === "right") newHead.lng += moveSpeed;

                player.body.unshift(newHead);

                const distLat = Math.abs(newHead.lat - this.state.apple.lat);
                const distLng = Math.abs(newHead.lng - this.state.apple.lng);
                
                if (distLat < appleHitbox && distLng < appleHitbox) {
                    // Apple eaten: move apple, DO NOT pop the tail (snake grows)
                    this.moveApple(newHead.lat, newHead.lng);
                } else {
                    // Normal movement
                    player.body.pop();
                }
            }
        });
    }
}
module.exports = { SnakeRoom };