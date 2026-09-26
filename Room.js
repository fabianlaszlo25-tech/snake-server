const colyseus = require("colyseus");
const { GameState, Player, Position } = require("./State");

class SnakeRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new GameState());
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

    onJoin(client) {
        this.state.players.set(client.sessionId, new Player());
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
    }

    moveApple(baseLat, baseLng) {
        this.state.apple.lat = baseLat + (Math.random() - 0.5) * 0.006;
        this.state.apple.lng = baseLng + (Math.random() - 0.5) * 0.006;
    }

    update(deltaTime) {
        const baseMoveSpeed = 0.00015;
        const newHeads = new Map();

        // Calculate intended movement for all players
        this.state.players.forEach((player, sessionId) => {
            if (player.body.length > 0) {
                const head = player.body[0];
                const newHead = new Position();
                newHead.lat = head.lat;
                newHead.lng = head.lng;

                if (player.direction === "up") newHead.lat += baseMoveSpeed;
                if (player.direction === "down") newHead.lat -= baseMoveSpeed;
                if (player.direction === "left") newHead.lng -= baseMoveSpeed;
                if (player.direction === "right") newHead.lng += baseMoveSpeed;

                newHeads.set(sessionId, newHead);
            }
        });

        // Process collisions and map interactions
        this.state.players.forEach((player, sessionId) => {
            if (!newHeads.has(sessionId)) return;
            
            const newHead = newHeads.get(sessionId);
            const mySize = player.body.length;
            let isDead = false;

            this.state.players.forEach((otherPlayer, otherSessionId) => {
                if (isDead || otherPlayer.body.length === 0) return;
                const otherSize = otherPlayer.body.length;
                
                // Start at index 1 to avoid instantly colliding with our own head
                const startIndex = (sessionId === otherSessionId) ? 1 : 0;
                
                for (let i = startIndex; i < otherPlayer.body.length; i++) {
                    const distLat = Math.abs(newHead.lat - otherPlayer.body[i].lat);
                    const distLng = Math.abs(newHead.lng - otherPlayer.body[i].lng);
                    
                    const hitBox = 0.00005 + (otherSize * 0.000002); 

                    if (distLat < hitBox && distLng < hitBox) {
                        if (sessionId !== otherSessionId && mySize >= otherSize * 2) {
                            // Massive size difference: the small snake is crushed and wiped
                            while(otherPlayer.body.length > 0) otherPlayer.body.pop();
                        } else {
                            // Standard collision death
                            isDead = true;
                        }
                    }
                }
            });

            if (isDead) {
                // Kill player
                while(player.body.length > 0) player.body.pop();
            } else {
                player.body.unshift(newHead);

                // Apple scaling logic
                const appleHitbox = 0.0003 + (mySize * 0.00001);
                const distLat = Math.abs(newHead.lat - this.state.apple.lat);
                const distLng = Math.abs(newHead.lng - this.state.apple.lng);

                if (distLat < appleHitbox && distLng < appleHitbox) {
                    this.moveApple(newHead.lat, newHead.lng);
                } else {
                    player.body.pop();
                }
            }
        });
    }
}
module.exports = { SnakeRoom };