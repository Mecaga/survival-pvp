let playerName = "";
let currentRoomId = "";
let myPlayerId = "p_" + Math.random().toString(36).substring(2, 9);
let remotePlayers = {};

// iOS ve tüm cihazlar için güvenli giriş fonksiyonu
window.handleLogin = function() {
    const inputEl = document.getElementById('username-input');
    const inputVal = inputEl ? inputEl.value.trim() : "";
    
    if (inputVal.length < 2) { 
        alert("En az 2 harfli isim gir!"); 
        return; 
    }
    
    playerName = inputVal;
    document.getElementById('welcome-text').innerText = "Hoş Geldin, " + playerName;
    switchScreen('menu-screen');
};

// iOS Klavye ve Input odaklanma güvencesi
document.addEventListener("DOMContentLoaded", () => {
    const inputEl = document.getElementById('username-input');
    if (inputEl) {
        inputEl.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            inputEl.focus();
        }, { passive: true });
        
        inputEl.addEventListener('input', (e) => {
            playerName = e.target.value;
        });
    }
});

window.logout = function() { switchScreen('login-screen'); };

window.createRoom = function() {
    currentRoomId = "oda_" + Math.floor(Math.random() * 9000 + 1000);
    alert("Oda Kuruldu! Kodun: " + currentRoomId);
    startGame();
};

window.joinRoomPrompt = function() {
    let code = prompt("Oda Kodunu Gir:");
    if (code) {
        currentRoomId = code.trim();
        startGame();
    }
};

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeGame() {
    canvas.width = 600;
    canvas.height = 600;
    let scale = Math.min(window.innerWidth / 600, (window.innerHeight - 60) / 600) * 0.95;
    canvas.style.width = (600 * scale) + 'px';
    canvas.style.height = (600 * scale) + 'px';
}

let player = {
    x: 300, y: 300, radius: 15, speed: 3.2,
    hp: 100, hunger: 100, angle: 0,
    inventory: { wood: 8, stone: 5, iron: 2, diamond: 0, cookedFood: 1 }
};

let resources = [
    { x: 100, y: 100, type: 'wood', emoji: '🪵', radius: 18 },
    { x: 500, y: 120, type: 'stone', emoji: '🪨', radius: 16 },
    { x: 120, y: 480, type: 'iron', emoji: '🔩', radius: 15 },
    { x: 480, y: 450, type: 'diamond', emoji: '💎', radius: 12 }
];

let worldObjects = [];
let projectiles = [];

function startGame() {
    if (!currentRoomId) currentRoomId = "genel_oda";
    document.getElementById('room-code-display').innerText = currentRoomId;
    switchScreen('game-screen');
    resizeGame();
    updateUI();
    initFirebaseMultiplayer();
}

function initFirebaseMultiplayer() {
    const checkFB = setInterval(() => {
        if (window.FB) {
            clearInterval(checkFB);
            const { db, ref, onValue, remove } = window.FB;
            
            const roomPlayersRef = ref(db, 'rooms/' + currentRoomId + '/players');
            onValue(roomPlayersRef, (snapshot) => {
                const data = snapshot.val();
                remotePlayers = data || {};
            });

            window.addEventListener('beforeunload', () => {
                remove(ref(db, 'rooms/' + currentRoomId + '/players/' + myPlayerId));
            });
        }
    }, 100);
}

// iOS Uyumlu Touch / Joystick Mantığı
const jBase = document.getElementById('joystick-base');
const jKnob = document.getElementById('joystick-knob');
let joyActive = false;
let joyVector = { x: 0, y: 0 };
let activeTouchId = null;

jBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!joyActive) {
        let touch = e.changedTouches[0];
        joyActive = true;
        activeTouchId = touch.identifier;
        handleTouchMove(touch);
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!joyActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
            e.preventDefault();
            handleTouchMove(touch);
            break;
        }
    }
}, { passive: false });

function resetJoystick(e) {
    if (!joyActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
            joyActive = false;
            activeTouchId = null;
            joyVector = { x: 0, y: 0 };
            jKnob.style.transform = `translate(0px, 0px)`;
            break;
        }
    }
}

window.addEventListener('touchend', resetJoystick);
window.addEventListener('touchcancel', resetJoystick);

function handleTouchMove(touch) {
    const rect = jBase.getBoundingClientRect();
    let cx = rect.left + rect.width / 2;
    let cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    let dist = Math.hypot(dx, dy);
    let maxDist = 45;
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    jKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVector = dist < 5 ? { x: 0, y: 0 } : { x: dx / maxDist, y: dy / maxDist };
}

document.getElementById('btn-attack').addEventListener('touchstart', (e) => {
    e.preventDefault();
    projectiles.push({
        x: player.x, y: player.y,
        vx: Math.cos(player.angle) * 8, vy: Math.sin(player.angle) * 8,
        radius: 5, color: '#f1c40f'
    });
}, { passive: false });

document.getElementById('btn-inv').addEventListener('click', () => {
    let invList = document.getElementById('inv-list');
    invList.innerHTML = `
        <div class="item-row"><span>🪵 Odun: ${player.inventory.wood}</span></div>
        <div class="item-row"><span>🪨 Taş: ${player.inventory.stone}</span></div>
        <div class="item-row"><span>🔩 Demir: ${player.inventory.iron}</span></div>
        <div class="item-row"><span>💎 Elmas: ${player.inventory.diamond}</span></div>
    `;
    document.getElementById('inv-modal').style.display = 'flex';
});

window.placeWorkbench = function() {
    if (player.inventory.wood >= 5 && player.inventory.stone >= 3) {
        player.inventory.wood -= 5; player.inventory.stone -= 3;
        worldObjects.push({ x: player.x + 30, y: player.y, type: 'workbench' });
        updateUI(); window.closeModals();
        alert('Çalışma Masası kuruldu!');
    } else { alert('Yetersiz malzeme!'); }
};

let activeWorkbench = null;
function checkWorkbenchProximity() {
    let interactBtn = document.getElementById('btn-interact');
    activeWorkbench = null;
    worldObjects.forEach(obj => {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 45) activeWorkbench = obj;
    });
    interactBtn.style.display = activeWorkbench ? 'flex' : 'none';
}

document.getElementById('btn-interact').addEventListener('click', () => {
    if (activeWorkbench) document.getElementById('craft-modal').style.display = 'flex';
});

window.closeModals = function() {
    document.getElementById('craft-modal').style.display = 'none';
    document.getElementById('inv-modal').style.display = 'none';
};

window.craftItem = function(type, reqWood, reqIron) {
    if (player.inventory.wood >= reqWood && player.inventory.iron >= reqIron) {
        player.inventory.wood -= reqWood; player.inventory.iron -= reqIron;
        updateUI(); window.closeModals(); alert('Üretildi!');
    } else { alert('Yetersiz malzeme!'); }
};

function updateUI() {
    document.getElementById('hp-val').innerText = player.hp;
    document.getElementById('hunger-val').innerText = player.hunger;
    document.getElementById('i-wood').innerText = player.inventory.wood;
    document.getElementById('i-stone').innerText = player.inventory.stone;
    document.getElementById('i-iron').innerText = player.inventory.iron;
    document.getElementById('i-diamond').innerText = player.inventory.diamond;
}

let firebaseSyncTimer = 0;
function update() {
    if (joyVector.x !== 0 || joyVector.y !== 0) {
        player.x += joyVector.x * player.speed;
        player.y += joyVector.y * player.speed;
        player.angle = Math.atan2(joyVector.y, joyVector.x);
    }
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    firebaseSyncTimer++;
    if (firebaseSyncTimer > 3 && window.FB) {
        firebaseSyncTimer = 0;
        window.FB.set(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/players/' + myPlayerId), {
            name: playerName,
            x: player.x,
            y: player.y,
            angle: player.angle
        });
    }

    resources.forEach(res => {
        if (Math.hypot(player.x - res.x, player.y - res.y) < player.radius + res.radius) {
            if (res.type === 'wood') player.inventory.wood++;
            if (res.type === 'stone') player.inventory.stone++;
            if (res.type === 'iron') player.inventory.iron++;
            if (res.type === 'diamond') player.inventory.diamond++;
            res.x = Math.random() * 520 + 40; res.y = Math.random() * 520 + 40;
            updateUI();
        }
    });

    checkWorkbenchProximity();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) projectiles.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    for (let id in remotePlayers) {
        if (id === myPlayerId) continue;
        let p = remotePlayers[id];
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#fff"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y - 22);
    }

    worldObjects.forEach(obj => {
        ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🪵🛠️", obj.x, obj.y);
    });

    resources.forEach(res => {
        ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(res.emoji, res.x, res.y);
    });

    projectiles.forEach(p => {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    });

    ctx.save();
    ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(0, -4, player.radius + 10, 8);
    ctx.restore();

    ctx.fillStyle = "#2ecc71"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(playerName + " (Sen)", player.x, player.y - 22);
}

function loop() {
    if (document.getElementById('game-screen').classList.contains('active')) {
        update();
        draw();
    }
    requestAnimationFrame(loop);
}
loop();
