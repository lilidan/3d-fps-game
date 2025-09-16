class FPSGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.player = {
            position: new THREE.Vector3(0, 1.6, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            health: 100,
            ammo: 30,
            maxAmmo: 90,
            score: 0
        };
        
        this.enemies = [];
        this.bullets = [];
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.isPointerLocked = false;
        this.gameStarted = false;
        
        this.init();
    }
    
    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);
        
        this.setupScene();
        this.setupControls();
        this.setupEventListeners();
        
        this.animate();
    }
    
    setupScene() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        this.createWalls();
        this.createObstacles();
        this.spawnEnemies();
        
        this.camera.position.copy(this.player.position);
    }
    
    createWalls() {
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const walls = [
            { pos: [0, 2.5, -100], size: [200, 5, 1] },
            { pos: [0, 2.5, 100], size: [200, 5, 1] },
            { pos: [-100, 2.5, 0], size: [1, 5, 200] },
            { pos: [100, 2.5, 0], size: [1, 5, 200] }
        ];
        
        walls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }
    
    createObstacles() {
        const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.BoxGeometry(
                2 + Math.random() * 3,
                1 + Math.random() * 4,
                2 + Math.random() * 3
            );
            const obstacle = new THREE.Mesh(geometry, obstacleMaterial);
            obstacle.position.set(
                (Math.random() - 0.5) * 180,
                geometry.parameters.height / 2,
                (Math.random() - 0.5) * 180
            );
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            this.scene.add(obstacle);
        }
    }
    
    spawnEnemies() {
        const enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
        
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BoxGeometry(1, 2, 1);
            const enemy = new THREE.Mesh(geometry, enemyMaterial);
            const angle = (i / 5) * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            
            enemy.position.set(
                Math.cos(angle) * distance,
                1,
                Math.sin(angle) * distance
            );
            enemy.castShadow = true;
            enemy.userData = { 
                health: 100,
                speed: 0.02,
                lastShot: 0
            };
            
            this.enemies.push(enemy);
            this.scene.add(enemy);
        }
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyR') {
                this.reload();
            }
            
            if (e.code === 'Escape') {
                this.toggleMenu();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isPointerLocked) return;
            
            this.mouse.x -= e.movementX * 0.002;
            this.mouse.y -= e.movementY * 0.002;
            this.mouse.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouse.y));
        });
        
        document.addEventListener('click', (e) => {
            if (!this.isPointerLocked) return;
            this.shoot();
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });
    }
    
    shoot() {
        if (this.player.ammo <= 0) return;
        
        this.player.ammo--;
        this.updateHUD();
        
        const bulletGeometry = new THREE.SphereGeometry(0.1);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bullet.position.copy(this.camera.position);
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        bullet.userData = { direction: direction, speed: 2, life: 100 };
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
        
        this.checkHit(direction);
    }
    
    checkHit(direction) {
        const raycaster = new THREE.Raycaster(this.camera.position, direction);
        const intersects = raycaster.intersectObjects(this.enemies);
        
        if (intersects.length > 0) {
            const enemy = intersects[0].object;
            enemy.userData.health -= 50;
            
            if (enemy.userData.health <= 0) {
                this.scene.remove(enemy);
                this.enemies = this.enemies.filter(e => e !== enemy);
                this.player.score += 100;
                this.updateHUD();
                
                if (this.enemies.length === 0) {
                    this.spawnEnemies();
                }
            }
        }
    }
    
    reload() {
        const needed = 30 - this.player.ammo;
        const available = Math.min(needed, this.player.maxAmmo);
        this.player.ammo += available;
        this.player.maxAmmo -= available;
        this.updateHUD();
    }
    
    updateMovement() {
        if (!this.gameStarted) return;
        
        const moveSpeed = 0.1;
        const direction = new THREE.Vector3();
        
        if (this.keys['KeyW']) direction.z -= 1;
        if (this.keys['KeyS']) direction.z += 1;
        if (this.keys['KeyA']) direction.x -= 1;
        if (this.keys['KeyD']) direction.x += 1;
        
        if (direction.length() > 0) {
            direction.normalize();
            direction.applyQuaternion(this.camera.quaternion);
            direction.y = 0;
            direction.normalize();
            
            this.player.position.add(direction.multiplyScalar(moveSpeed));
        }
        
        this.camera.position.copy(this.player.position);
        this.camera.rotation.set(this.mouse.y, this.mouse.x, 0);
    }
    
    updateEnemies() {
        if (!this.gameStarted) return;
        
        this.enemies.forEach(enemy => {
            const direction = new THREE.Vector3()
                .subVectors(this.player.position, enemy.position)
                .normalize();
            
            enemy.position.add(direction.multiplyScalar(enemy.userData.speed));
            enemy.lookAt(this.player.position);
            
            const distance = enemy.position.distanceTo(this.player.position);
            if (distance < 2 && Date.now() - enemy.userData.lastShot > 1000) {
                this.player.health -= 10;
                enemy.userData.lastShot = Date.now();
                this.updateHUD();
                
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        });
    }
    
    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.position.add(bullet.userData.direction.clone().multiplyScalar(bullet.userData.speed));
            bullet.userData.life--;
            
            if (bullet.userData.life <= 0) {
                this.scene.remove(bullet);
                return false;
            }
            return true;
        });
    }
    
    updateHUD() {
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('ammo').textContent = this.player.ammo;
        document.getElementById('score').textContent = this.player.score;
    }
    
    toggleMenu() {
        const menu = document.getElementById('menu');
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            document.exitPointerLock();
            this.gameStarted = false;
        } else {
            menu.classList.add('hidden');
        }
    }
    
    gameOver() {
        alert(`Game Over! Final Score: ${this.player.score}`);
        this.player.health = 100;
        this.player.ammo = 30;
        this.player.maxAmmo = 90;
        this.player.score = 0;
        this.player.position.set(0, 1.6, 0);
        this.updateHUD();
        this.toggleMenu();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateMovement();
        this.updateEnemies();
        this.updateBullets();
        
        this.renderer.render(this.scene, this.camera);
    }
}

let game;

function startGame() {
    document.getElementById('menu').classList.add('hidden');
    
    if (!game) {
        game = new FPSGame();
    }
    
    game.gameStarted = true;
    game.renderer.domElement.requestPointerLock();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}