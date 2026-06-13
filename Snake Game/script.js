const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartBtn = document.getElementById('restartBtn');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 100; // milliseconds per frame

let snake = [];
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let apple = { x: 0, y: 0 };
let score = 0;
let highScore = 0;
let gameRunning = false;
let lastRenderTime = 0;
let animationFrameId = null;

function init() {
    loadHighScore();
    resetGame();
    window.addEventListener('keydown', handleKeyDown);
    restartBtn.addEventListener('click', resetGame);
}

function loadHighScore() {
    const stored = localStorage.getItem('snakeHighScore');
    highScore = stored ? parseInt(stored, 10) : 0;
    highScoreElement.textContent = highScore;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
}

function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    gameRunning = true;
    gameOverScreen.classList.add('hidden');
    spawnApple();

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    lastRenderTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnApple() {
    let validPosition = false;
    while (!validPosition) {
        apple.x = Math.floor(Math.random() * TILE_COUNT);
        apple.y = Math.floor(Math.random() * TILE_COUNT);
        validPosition = !snake.some(segment => segment.x === apple.x && segment.y === apple.y);
    }
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();

    // Prevent page scrolling with arrow keys and space
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
    }

    if (!gameRunning) return;

    switch (key) {
        case 'arrowup':
        case 'w':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'arrowdown':
        case 's':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'arrowleft':
        case 'a':
            if (direction.x === 0) {
                nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'arrowright':
        case 'd':
            if (direction.x === 0) {
                nextDirection = { x: 1, y: 0 };
            }
            break;
    }
}

function gameLoop(currentTime) {
    if (!gameRunning) return;

    animationFrameId = requestAnimationFrame(gameLoop);

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < GAME_SPEED / 1000) return;

    lastRenderTime = currentTime;
    update();
    draw();
}

function update() {
    direction = nextDirection;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Apple collision
    if (head.x === apple.x && head.y === apple.y) {
        score += 10;
        scoreElement.textContent = score;
        saveHighScore();
        spawnApple();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0d0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw apple
    drawApple();

    // Draw snake
    drawSnake();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? '#39ff14' : '#2eb511';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = isHead ? 20 : 10;
        ctx.fillRect(
            segment.x * GRID_SIZE + 1,
            segment.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
    });
    ctx.shadowBlur = 0;
}

function drawApple() {
    const centerX = apple.x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = apple.y * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 3;

    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameOver() {
    gameRunning = false;
    saveHighScore();
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

init();
