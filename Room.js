const colyseus = require("colyseus");
const { GameState, Player, Position } = require("./State");

class SnakeRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new GameState());
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

        this.onMessage("spawn", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.body.length === 0) {
                // Give player a custom property to track how many segments to grow
                player.pendingGrowth = 0; 
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
        this.state.apple.lat = baseLat + (Math.random() - 0.5) * 0.008;
        this.state.apple.lng = baseLng + (Math.random() - 0.5) * 0.008;
    }

    update(deltaTime) {
        const newHeads = new Map();

        this.state.players.forEach((player, sessionId) => {
            if (player.body.length > 0) {
                const head = player.body[0];
                const newHead = new Position();
                newHead.lat = head.lat;
                newHead.lng = head.lng;

                // Scale movement speed so the snake doesn't visually slow down when the map zooms out
                const score = player.body.length > 5 ? player.body.length - 5 : 0;
                const dynamicSpeed = 0.00015 + (score * 0.000005); 

                if (player.direction === "up") newHead.lat += dynamicSpeed;
                if (player.direction === "down") newHead.lat -= dynamicSpeed;
                if (player.direction === "left") newHead.lng -= dynamicSpeed;
                if (player.direction === "right") newHead.lng += dynamicSpeed;

                newHeads.set(sessionId, newHead);
            }
        });

        this.state.players.forEach((player, sessionId) => {
            if (!newHeads.has(sessionId)) return;
            
            const newHead = newHeads.get(sessionId);
            const mySize = player.body.length;
            let isDead = false;

            this.state.players.forEach((otherPlayer, otherSessionId) => {
                if (isDead || otherPlayer.body.length === 0) return;
                const otherSize = otherPlayer.body.length;
                const startIndex = (sessionId === otherSessionId) ? 1 : 0;
                
                for (let i = startIndex; i < otherPlayer.body.length; i++) {
                    const distLat = Math.abs(newHead.lat - otherPlayer.body[i].lat);
                    const distLng = Math.abs(newHead.lng - otherPlayer.body[i].lng);
                    
                    const hitBox = 0.00005 + (otherSize * 0.000002); 

                    if (distLat < hitBox && distLng < hitBox) {
                        if (sessionId !== otherSessionId && mySize >= otherSize * 2) {
                            while(otherPlayer.body.length > 0) otherPlayer.body.pop();
                        } else {
                            isDead = true;
                        }
                    }
                }
            });

            if (isDead) {
                while(player.body.length > 0) player.body.pop();
                player.pendingGrowth = 0;
            } else {
                player.body.unshift(newHead);

                const score = mySize > 5 ? mySize - 5 : 0;
                const appleHitbox = 0.0004 + (score * 0.00002); // Larger physical hitbox
                const distLat = Math.abs(newHead.lat - this.state.apple.lat);
                const distLng = Math.abs(newHead.lng - this.state.apple.lng);

                if (distLat < appleHitbox && distLng < appleHitbox) {
                    this.moveApple(newHead.lat, newHead.lng);
                    player.pendingGrowth = (player.pendingGrowth || 0) + 10; // Grows noticeably longer
                }

                // Process tail logic
                if (player.pendingGrowth > 0) {
                    player.pendingGrowth--;
                } else {
                    player.body.pop();
                }
            }
        });
    }
}
module.exports = { SnakeRoom };