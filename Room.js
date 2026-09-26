const colyseus = require("colyseus");
const { GameState, Player, Position } = require("./State");

class SnakeRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new GameState());
        
        this.setPatchRate(16); 
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 16);

        this.onMessage("spawn", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.body.length === 0) {
                player.pendingGrowth = 0; 
                for (let i = 0; i < 5; i++) {
                    const pos = new Position();
                    pos.lat = message.lat - (i * 0.000018); 
                    pos.lng = message.lng;
                    player.body.push(pos);
                }
                
                this.moveApple(client.sessionId + '_1', message.lat, message.lng, 0.008);
                this.moveApple(client.sessionId + '_2', message.lat, message.lng, 0.008);
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
        
        const a1 = new Position(); a1.lat = 0; a1.lng = 0;
        const a2 = new Position(); a2.lat = 0; a2.lng = 0;
        
        this.state.apples.set(client.sessionId + '_1', a1);
        this.state.apples.set(client.sessionId + '_2', a2);
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        this.state.apples.delete(client.sessionId + '_1');
        this.state.apples.delete(client.sessionId + '_2');
    }

    moveApple(appleId, baseLat, baseLng, spawnRadius) {
        const apple = this.state.apples.get(appleId);
        if (apple) {
            let newLat = baseLat + (Math.random() > 0.5 ? 1 : -1) * (spawnRadius + Math.random() * spawnRadius);
            apple.lat = Math.max(-70, Math.min(70, newLat));
            apple.lng = baseLng + (Math.random() > 0.5 ? 1 : -1) * (spawnRadius + Math.random() * spawnRadius);
        }
    }

    update(deltaTime) {
        const newHeads = new Map();
        const baseSpeed = 0.000018;

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

            if (Math.abs(newHead.lat) > 80) {
                isDead = true;
            }

            this.state.players.forEach((otherPlayer, otherSessionId) => {
                if (isDead || otherPlayer.body.length === 0) return;
                const otherSize = otherPlayer.body.length;
                const startIndex = (sessionId === otherSessionId) ? 15 : 0; 
                
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
                const finalScore = mySize > 5 ? mySize - 5 : 0;
                while(player.body.length > 0) player.body.pop();
                player.pendingGrowth = 0;
                
                const deadClient = this.clients.find(c => c.sessionId === sessionId);
                if (deadClient) deadClient.send("died", finalScore);
            } else {
                player.body.unshift(newHead);

                const score = mySize > 5 ? mySize - 5 : 0;
                const targetZoom = Math.max(3, 18 - (score * 0.06));
                const scaleFactor = Math.pow(2, 18 - targetZoom);
                const appleHitbox = baseSpeed * scaleFactor * 3.5; 
                
                this.state.apples.forEach((apple, appleId) => {
                    const distLat = Math.abs(newHead.lat - apple.lat);
                    const distLng = Math.abs(newHead.lng - apple.lng);

                    if (distLat < appleHitbox && distLng < appleHitbox) {
                        const spawnRadius = 0.003 * scaleFactor;
                        const ownerId = appleId.split('_')[0];
                        const owner = this.state.players.get(ownerId);
                        
                        if (owner && owner.body.length > 0) {
                            this.moveApple(appleId, owner.body[0].lat, owner.body[0].lng, spawnRadius);
                        } else {
                            this.moveApple(appleId, newHead.lat, newHead.lng, spawnRadius);
                        }
                        
                        player.pendingGrowth = (player.pendingGrowth || 0) + 10;
                    }
                });

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