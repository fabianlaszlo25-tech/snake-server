const colyseus = require("colyseus");
const { GameState, Player, Position } = require("./State");

class SnakeRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new GameState());
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

        this.onMessage("spawn", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.body.length === 0) {
                player.pendingGrowth = 0; 
                for (let i = 0; i < 5; i++) {
                    const pos = new Position();
                    pos.lat = message.lat - (i * 0.00004);
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
        let newLat = baseLat + (Math.random() - 0.5) * 0.008;
        // Clamp apple spawns to prevent them from appearing in the pole kill zones
        this.state.apple.lat = Math.max(-79, Math.min(79, newLat));
        this.state.apple.lng = baseLng + (Math.random() - 0.5) * 0.008;
    }

    update(deltaTime) {
        const newHeads = new Map();
        const baseSpeed = 0.00004;

        this.state.players.forEach((player, sessionId) => {
            if (player.body.length > 0) {
                const head = player.body[0];
                const newHead = new Position();
                newHead.lat = head.lat;
                newHead.lng = head.lng;

                const score = player.body.length > 5 ? player.body.length - 5 : 0;
                const targetZoom = Math.max(3, 18 - (score * 0.06));
                const scaleFactor = Math.pow(2, 18 - targetZoom); 
                const dynamicSpeed = baseSpeed * scaleFactor;
                const latSpeed = dynamicSpeed * Math.cos(head.lat * Math.PI / 180);

                if (player.direction === "up") newHead.lat += latSpeed;
                if (player.direction === "down") newHead.lat -= latSpeed;
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

            // POLE KILL ZONE: Extreme latitudes trigger instant death
            if (Math.abs(newHead.lat) > 80) {
                isDead = true;
            }

            this.state.players.forEach((otherPlayer, otherSessionId) => {
                if (isDead || otherPlayer.body.length === 0) return;
                const otherSize = otherPlayer.body.length;
                const startIndex = (sessionId === otherSessionId) ? 25 : 0; 
                
                const otherScore = otherSize > 5 ? otherSize - 5 : 0;
                const otherTargetZoom = Math.max(3, 18 - (otherScore * 0.06));
                const scaleFactor = Math.pow(2, 18 - otherTargetZoom);
                const hitBox = baseSpeed * scaleFactor * 0.8; 

                for (let i = startIndex; i < otherPlayer.body.length; i++) {
                    const distLat = Math.abs(newHead.lat - otherPlayer.body[i].lat);
                    const distLng = Math.abs(newHead.lng - otherPlayer.body[i].lng);

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
                const targetZoom = Math.max(3, 18 - (score * 0.06));
                const scaleFactor = Math.pow(2, 18 - targetZoom);
                const appleHitbox = baseSpeed * scaleFactor * 3; 
                
                const distLat = Math.abs(newHead.lat - this.state.apple.lat);
                const distLng = Math.abs(newHead.lng - this.state.apple.lng);

                if (distLat < appleHitbox && distLng < appleHitbox) {
                    const spawnRadius = 0.003 * scaleFactor;
                    this.moveApple(newHead.lat + spawnRadius, newHead.lng + spawnRadius);
                    player.pendingGrowth = (player.pendingGrowth || 0) + 10;
                }

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