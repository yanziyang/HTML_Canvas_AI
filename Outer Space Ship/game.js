(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const levelEl = document.getElementById('level');
    const messageEl = document.getElementById('message');

    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;

    // Global Level
    let Level = 1;
    function updateLevelUI() {
        levelEl.textContent = 'Level: ' + Level;
    }

    // ----- Input -----
    const keys = {};
    let spacePressed = false;
    let started = false;

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            spacePressed = true;
            e.preventDefault();
        }
        if (!started && (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space')) {
            started = true;
            messageEl.style.display = 'none';
        }
    });
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // ----- SpaceObject -----
    class SpaceObject {
        constructor(x, y, radius, type) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.angle = 0;
            this.radius = radius;
            this.type = type; // 'ship', 'station', 'plasma', 'shot'
            this.alive = true;
            this.age = 0;
        }

        update(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.age += dt;
        }

        draw(ctx) {}

        collidesWith(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const r = this.radius + other.radius;
            return (dx * dx + dy * dy) < (r * r);
        }
    }

    // ----- Stars (background, parallax) -----
    const stars = [];
    for (let i = 0; i < 220; i++) {
        stars.push({
            x: Math.random() * 3000 - 1500,
            y: Math.random() * 3000 - 1500,
            b: Math.random() * 0.7 + 0.3,
            s: Math.random() < 0.85 ? 1 : 2
        });
    }

    // ----- Ship pixel art (pointing up) -----
    // 14x14 grid; '#' = body, '.' = transparent, 'C' = cockpit, 'E' = engine
    const shipSprite = [
        '......##......',
        '.....####.....',
        '....######....',
        '...########...',
        '..##CCCCCC##..',
        '..#C######C#..',
        '..##########..',
        '...########...',
        '....E####E....',
        '....E####E....',
        '...########...',
        '..############.',
        '.##############',
    ];
    const SW = shipSprite[0].length;
    const SH = shipSprite.length;

    function drawPixelSprite(ctx, sprite, scale, offsetX, offsetY, angle) {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        if (angle !== undefined) ctx.rotate(angle);
        const w = sprite[0].length;
        const h = sprite.length;
        const ox = -w / 2;
        const oy = -h / 2;
        for (let y = 0; y < h; y++) {
            const row = sprite[y];
            for (let x = 0; x < w; x++) {
                const c = row[x];
                if (c === '.') continue;
                let color = null;
                if (c === '#') color = '#c8d4e0';
                else if (c === 'C') color = '#6fffe9';
                else if (c === 'E') color = '#ff8a3d';
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(Math.floor((ox + x) * scale), Math.floor((oy + y) * scale), scale, scale);
                }
            }
        }
        ctx.restore();
    }

    // ----- Player Ship -----
    class Ship extends SpaceObject {
        constructor(x, y) {
            super(x, y, 11, 'ship');
            this.angle = -Math.PI / 2; // pointing up
            this.rotSpeed = 3.2; // rad/s
            this.thrust = 260;   // px/s^2
            this.friction = 0.995;
            this.maxSpeed = 360;
            this.cooldown = 0;
            this.invuln = 0;
        }

        update(dt, spaceNow) {
            if (keys['ArrowLeft'])  this.angle -= this.rotSpeed * dt;
            if (keys['ArrowRight']) this.angle += this.rotSpeed * dt;

            if (keys['ArrowUp']) {
                this.vx += Math.cos(this.angle) * this.thrust * dt;
                this.vy += Math.sin(this.angle) * this.thrust * dt;
            }

            // cap speed
            const sp = Math.hypot(this.vx, this.vy);
            if (sp > this.maxSpeed) {
                this.vx = (this.vx / sp) * this.maxSpeed;
                this.vy = (this.vy / sp) * this.maxSpeed;
            }

            // light friction so player eventually stops
            this.vx *= Math.pow(this.friction, dt * 60);
            this.vy *= Math.pow(this.friction, dt * 60);

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            if (this.cooldown > 0) this.cooldown -= dt;
            if (this.invuln > 0) this.invuln -= dt;
        }

        tryShoot() {
            if (this.cooldown > 0) return;
            this.cooldown = 0.25;
            const muzzle = 12;
            const px = this.x + Math.cos(this.angle) * muzzle;
            const py = this.y + Math.sin(this.angle) * muzzle;
            const speed = 520;
            const p = new Plasma(px, py, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed);
            spaceObjects.push(p);
            playerShots.push(p);
        }

        draw(ctx) {
            // engine flame
            if (keys['ArrowUp']) {
                ctx.save();
                ctx.translate(CX, CY);
                ctx.rotate(this.angle);
                const flick = Math.random() * 4;
                ctx.fillStyle = '#ff5a1f';
                ctx.fillRect(-3, 8, 2, 8 + flick);
                ctx.fillRect(1, 8, 2, 8 + flick);
                ctx.fillStyle = '#ffd24a';
                ctx.fillRect(-3, 8, 2, 5 + flick);
                ctx.fillRect(1, 8, 2, 5 + flick);
                ctx.restore();
            }
            // ship body (centered)
            const blink = this.invuln > 0 && Math.floor(this.age * 20) % 2 === 0;
            if (!blink) drawPixelSprite(ctx, shipSprite, 2, CX, CY, this.angle);
        }
    }

    // ----- Plasma (player bullet) -----
    class Plasma extends SpaceObject {
        constructor(x, y, vx, vy) {
            super(x, y, 4, 'plasma');
            this.vx = vx;
            this.vy = vy;
            this.life = 1.6;
        }
        update(dt) {
            super.update(dt);
            this.life -= dt;
            if (this.life <= 0) this.alive = false;
        }
        draw(ctx) {
            const sx = this.x - cameraX + CX;
            const sy = this.y - cameraY + CY;
            // outer glow
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
            grad.addColorStop(0, 'rgba(180,255,255,0.9)');
            grad.addColorStop(0.4, 'rgba(80,200,255,0.5)');
            grad.addColorStop(1, 'rgba(80,200,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, 12, 0, Math.PI * 2);
            ctx.fill();
            // core
            ctx.fillStyle = '#e6ffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ----- Space Station -----
    class Station extends SpaceObject {
        constructor(x, y) {
            super(x, y, 32, 'station');
            this.angle = 0;
            this.fireCooldown = 1.5 + Math.random() * 1.5;
            this.hp = 3;
        }

        update(dt) {
            this.angle += 0.2 * dt;
            this.fireCooldown -= dt;
            if (this.fireCooldown <= 0) {
                this.fireCooldown = 1.4 + Math.random() * 1.2;
                this.shoot();
            }
        }

        shoot() {
            // aim at player
            const dx = ship.x - this.x;
            const dy = ship.y - this.y;
            const d = Math.hypot(dx, dy) || 1;
            const speed = 240;
            // small inaccuracy
            const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.15;
            const s = new Shot(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed);
            spaceObjects.push(s);
            enemyShots.push(s);
        }

        draw(ctx) {
            const sx = this.x - cameraX + CX;
            const sy = this.y - cameraY + CY;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(this.angle);

            // outer hex ring
            ctx.fillStyle = '#3a4252';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const px = Math.cos(a) * 30;
                const py = Math.sin(a) * 30;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#7a8aa0';
            ctx.lineWidth = 2;
            ctx.stroke();

            // inner hex
            ctx.fillStyle = '#1f2630';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
                const px = Math.cos(a) * 18;
                const py = Math.sin(a) * 18;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // core
            ctx.fillStyle = '#ff4d4d';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffb84d';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();

            // rotating gun arms
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2;
                ctx.save();
                ctx.rotate(a);
                ctx.fillStyle = '#a0b0c8';
                ctx.fillRect(18, -2, 14, 4);
                ctx.fillStyle = '#ff6';
                ctx.fillRect(30, -1, 3, 2);
                ctx.restore();
            }
            ctx.restore();
        }
    }

    // ----- Enemy Shot -----
    class Shot extends SpaceObject {
        constructor(x, y, vx, vy) {
            super(x, y, 3, 'shot');
            this.vx = vx;
            this.vy = vy;
            this.life = 4;
        }
        update(dt) {
            super.update(dt);
            this.life -= dt;
            if (this.life <= 0) this.alive = false;
        }
        draw(ctx) {
            const sx = this.x - cameraX + CX;
            const sy = this.y - cameraY + CY;
            ctx.fillStyle = '#ff5a3d';
            ctx.shadowColor = '#ff5a3d';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // ----- World -----
    let cameraX = 0;
    let cameraY = 0;
    const spaceObjects = [];
    const playerShots = [];
    const enemyShots = [];

    const ship = new Ship(0, 0);
    spaceObjects.push(ship);

    function spawnStation() {
        // spawn away from player
        let x, y, d;
        for (let tries = 0; tries < 30; tries++) {
            const a = Math.random() * Math.PI * 2;
            d = 360 + Math.random() * 360;
            x = ship.x + Math.cos(a) * d;
            y = ship.y + Math.sin(a) * d;
            // avoid overlapping others
            let ok = true;
            for (const o of spaceObjects) {
                if (o.type === 'station' && Math.hypot(o.x - x, o.y - y) < 220) { ok = false; break; }
            }
            if (ok) break;
        }
        spaceObjects.push(new Station(x, y));
    }

    // initial stations
    for (let i = 0; i < 2; i++) spawnStation();

    // ----- Collision handling -----
    function handleCollisions() {
        for (let i = 0; i < spaceObjects.length; i++) {
            const a = spaceObjects[i];
            if (!a.alive) continue;
            for (let j = i + 1; j < spaceObjects.length; j++) {
                const b = spaceObjects[j];
                if (!b.alive) continue;
                if (a.collidesWith(b)) {
                    a.alive = false;
                    b.alive = false;

                    if (a.type === 'station' || b.type === 'station') {
                        Level += 1;
                        updateLevelUI();
                    }
                    if (a.type === 'ship' || b.type === 'ship') {
                        if (ship.invuln <= 0) {
                            Level -= 1;
                            updateLevelUI();
                            respawnPlayer();
                        }
                    }
                }
            }
        }
    }

    function respawnPlayer() {
        ship.x = cameraX;
        ship.y = cameraY;
        ship.vx = 0;
        ship.vy = 0;
        ship.invuln = 1.5;
    }

    // ----- Render background -----
    function drawBackground() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // parallax stars (move opposite to ship velocity for depth)
        const parX = cameraX * 0.2;
        const parY = cameraY * 0.2;
        for (const s of stars) {
            const wx = s.x + parX;
            const wy = s.y + parY;
            // wrap
            const lx = ((wx % 3000) + 3000) % 3000 - 1500;
            const ly = ((wy % 3000) + 3000) % 3000 - 1500;
            const sx = lx - cameraX + CX + (cameraX - parX);
            const sy = ly - cameraY + CY + (cameraY - parY);
            // simple draw
            const px = lx - parX + CX;
            const py = ly - parY + CY;
            ctx.fillStyle = `rgba(255,255,255,${s.b})`;
            ctx.fillRect(px, py, s.s, s.s);
        }
    }

    // ----- Main loop -----
    let lastT = performance.now();
    function loop(now) {
        let dt = (now - lastT) / 1000;
        if (dt > 0.05) dt = 0.05;
        lastT = now;

        if (started) {
            ship.update(dt, spacePressed);
            if (spacePressed) ship.tryShoot();
            spacePressed = false;

            // update other objects
            for (const o of spaceObjects) {
                if (o !== ship) o.update(dt);
            }

            // camera tracks ship
            cameraX = ship.x;
            cameraY = ship.y;

            handleCollisions();

            // cleanup dead
            for (let i = spaceObjects.length - 1; i >= 0; i--) {
                if (!spaceObjects[i].alive) {
                    if (spaceObjects[i] === ship) {
                        // ship respawn handled; never remove ship
                        spaceObjects[i].alive = true;
                    } else {
                        spaceObjects.splice(i, 1);
                    }
                }
            }
            // remove from shot buckets
            for (let i = playerShots.length - 1; i >= 0; i--) {
                if (!playerShots[i].alive) playerShots.splice(i, 1);
            }
            for (let i = enemyShots.length - 1; i >= 0; i--) {
                if (!enemyShots[i].alive) enemyShots.splice(i, 1);
            }

            // keep at least one station around
            if (!spaceObjects.some(o => o.type === 'station')) {
                spawnStation();
            }
        }

        // draw
        drawBackground();

        // draw all objects
        for (const o of spaceObjects) {
            if (o.type === 'ship') {
                o.draw(ctx);
            } else {
                o.draw(ctx);
            }
        }

        requestAnimationFrame(loop);
    }

    updateLevelUI();
    messageEl.style.display = 'block';
    requestAnimationFrame(loop);
})();
