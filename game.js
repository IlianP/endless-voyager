// Basic Three.js scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Player cube
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(player);

// Forward ray
const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5)
]);
const forwardRay = new THREE.Line(rayGeometry, rayMaterial);
player.add(forwardRay); // Attach ray to the player

// Ground plane with grid
const gridHelper = new THREE.GridHelper(200, 100);
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

camera.position.set(0, 3, 7);
camera.lookAt(player.position);

// Game variables
let score = 0;
let gameOver = false;
const obstacles = [];
const initialPlayerZ = 0;
let playerSpeed = 0.1;
const keys = {};
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];
// Filter high scores to keep only 526 and 215 (this line will only run once to clean up old scores)
highScores = highScores.filter(score => score.score === 526 || score.score === 215);

// UI Elements
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const newHighscoreForm = document.getElementById('new-highscore-form');
const playerNameInput = document.getElementById('player-name');
const saveScoreButton = document.getElementById('save-score-button');
const highscoreList = document.getElementById('highscore-list');

function updateHighscoreDisplay() {
    highscoreList.innerHTML = '';
    highScores.slice(0, 5).forEach(score => {
        const li = document.createElement('li');
        li.textContent = `${score.name}: ${score.score}`;
        highscoreList.appendChild(li);
    });
}

function saveHighScore() {
    const name = playerNameInput.value.trim();
    if (name) {
        highScores.push({ name, score });
        highScores.sort((a, b) => b.score - a.score);
        localStorage.setItem('highScores', JSON.stringify(highScores));
        updateHighscoreDisplay();
        newHighscoreForm.style.display = 'none';
    }
}

function resetGame() {
    gameOver = false;
    score = 0;
    player.position.set(0, 0, 0);
    camera.position.set(0, 3, 7);
    playerSpeed = 0.1;

    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles.length = 0;

    gameOverElement.style.display = 'none';
    newHighscoreForm.style.display = 'none';

    animate();
}

function createObstacle() {
    const isWobbler = score > 150 && Math.random() < 0.3;
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshStandardMaterial({
        color: isWobbler ? 0x0000ff : 0xff0000, // Blue for wobbler, red for static
        emissive: isWobbler ? 0x0000ff : 0xff0000
    });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    obstacle.position.x = (Math.random() - 0.5) * 20;
    obstacle.position.z = player.position.z - 40 - (Math.random() * 20);
    
    if (isWobbler) {
        obstacle.isWobbler = true;
        obstacle.initialX = obstacle.position.x;
        obstacle.wobbleOffset = Math.random() * Math.PI * 2; // Random start phase
    }

    scene.add(obstacle);
    obstacles.push(obstacle);
}

function animate() {
    if (gameOver) {
        return;
    }

    requestAnimationFrame(animate);

    // Handle controls
    if (keys['arrowleft'] || keys['a']) {
        player.position.x = Math.max(player.position.x - 0.15, -10);
    }
    if (keys['arrowright'] || keys['d']) {
        player.position.x = Math.min(player.position.x + 0.15, 10);
    }
    if (keys['arrowup'] || keys['w']) {
        playerSpeed = 0.2;
    } else if (keys['arrowdown'] || keys['s']) {
        playerSpeed = 0.05;
    } else {
        playerSpeed = 0.1;
    }

    player.position.z -= playerSpeed;

    obstacles.forEach((obstacle, index) => {
        // Handle wobbler movement
        if (obstacle.isWobbler) {
            obstacle.position.x = obstacle.initialX + Math.sin(Date.now() * 0.005 + obstacle.wobbleOffset) * 3;
        }

        if (player.position.distanceTo(obstacle.position) < 1) {
            gameOver = true;
            gameOverElement.style.display = 'flex';
            if (score > 0 && (highScores.length < 5 || score > highScores[4].score)) {
                newHighscoreForm.style.display = 'block';
            }
        }

        if (obstacle.position.z > camera.position.z) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }
    });

    const difficulty = Math.min(0.1, 0.03 + score / 10000);
    if (Math.random() < difficulty) {
        createObstacle();
    }

    score = Math.max(0, Math.floor(initialPlayerZ - player.position.z));
    scoreElement.innerText = `Score: ${score}`;

    gridHelper.position.z = player.position.z;
    camera.position.z = player.position.z + 7;

    renderer.render(scene, camera);
}

// Event Listeners
document.addEventListener('keydown', (event) => { keys[event.key.toLowerCase()] = true; });
document.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
restartButton.addEventListener('click', resetGame);
saveScoreButton.addEventListener('click', saveHighScore);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial setup
updateHighscoreDisplay();
animate();