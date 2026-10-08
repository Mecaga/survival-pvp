let playerName = "Maceracı";
let currentRoomId = "";
let myPlayerId = "p_" + Math.random().toString(36).substring(2, 9);
let remotePlayers = {};

// iOS ve TÜM cihazlar için %100 kusursuz çalışan prompt giriş yöntemi
window.handleLogin = function() {
    let name = prompt("Kullanıcı adınızı girin:", "Maceracı");
    if (name && name.trim().length >= 2) {
        playerName = name.trim();
        document.getElementById('welcome-text').innerText = "Hoş Geldin, " + playerName;
        switchScreen('menu-screen');
    } else {
        alert("En az 2 harfli geçerli bir isim girmelisin!");
    }
};

window.logout = function() { switchScreen('login-screen'); };

window.createRoom = function() {
    if (!window.FB) { alert("Firebase yükleniyor..."); return; }
    currentRoomId = "oda_" + Math.floor(Math.random() * 9000 + 1000);
    
    window.FB.set(window.FB.ref(window.FB.db, 'activeRooms/' + currentRoomId), { 
        host: playerName, 
        createdAt: Date.now() 
    }).then(() => {
        alert("Oda Kuruldu! Kodun: " + currentRoomId);
        startGame();
    }).catch((err) => {
        alert("Hata: " + err.message);
    });
};

window.joinRoomPrompt = function() {
    let code = prompt("Katılmak istediğin Oda Kodunu Gir:");
    if (code) {
        let cleanCode = code.trim();
        if (window.FB) {
            window.FB.get(window.FB.ref(window.FB.db, 'activeRooms/' + cleanCode)).then((snapshot) => {
                if (snapshot.exists()) {
                    currentRoomId = cleanCode;
                    startGame();
                } else {
                    alert("Böyle bir oda bulunamadı!");
                }
            });
        }
    }
};

window.openRoomList = function() {
    const modal = document.getElementById('room-list-modal');
    const container = document.getElementById('active-rooms-container');
    container.innerHTML = "Yükleniyor...";
    modal.style.display = 'flex';

    if (window.FB) {
        window.FB.get(window.FB.ref(window.FB.db, 'activeRooms')).then((snapshot) => {
            let roomsData = snapshot.val() || {};
            container.innerHTML = "";
            let keys = Object.keys(roomsData);
            if (keys.length === 0) {
                container.innerHTML = "<div class='item-row'>Aktif oda yok.</div>";
                return;
            }
            keys.forEach(roomId => {
                let room = roomsData[roomId];
                container.innerHTML += `
                    <div class="item-row">
                        <span>Oda: ${roomId} (Kurucu: ${room.host || 'Bilinmiyor'})</span>
                        <button class="craft-btn" onclick="joinSpecificRoom('${roomId}')">Katıl</button>
                    </div>
                `;
            });
        });
    }
};

window.closeRoomList = function() {
    document.getElementById('room-list-modal').style.display = 'none';
};

window.joinSpecificRoom = function(roomId) {
    currentRoomId = roomId;
    closeRoomList();
    startGame();
};

window.returnToMainMenu = function() {
    if (window.FB && currentRoomId) {
        window.FB.remove(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/players/' + myPlayerId));
    }
    currentRoomId = "";
    remotePlayers = {};
    switchScreen('menu-screen');
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

// Oyuncu ve Envanter (Her odada sıfırdan ve bomboş başlar)
let player = {
    x: 1000, y: 1000, radius: 15, speed: 3.5,
    hp: 100, hunger: 100, angle: 0,
    inventory: { wood: 0, stone: 0, iron: 0, diamond: 0 }
};

let worldResources = [];
let worldObjects = [];
let projectiles = [];
let generatedChunks = {};
const CHUNK_SIZE = 400;

function startGame() {
    if (!currentRoomId) currentRoomId = "genel_oda";
    player.inventory = { wood: 0, stone: 0, iron: 0, diamond: 0 };
    let codeEl = document.getElementById('room-code-display');
    if (codeEl) codeEl.innerText = currentRoomId;
    
    switchScreen('game-screen');
    resizeGame();
    updateUI();
    initFirebaseMultiplayer();
}

// Minecraft Mantığı: Ortak Dünya Kaynakları Firebase'den Senkronize Edilir
function initFirebaseMultiplayer() {
    const checkFB = setInterval(() => {
        if (window.FB) {
            clearInterval(checkFB);
            const { db, ref, onValue, remove, set } = window.FB;
            
            // 1. Oyuncuları Dinle
            const roomPlayersRef = ref(db, 'rooms/' + currentRoomId + '/players');
            onValue(roomPlayersRef, (snapshot) => {
                const data = snapshot.val() || {};
                remotePlayers = data;
                
                if (data[myPlayerId] && data[myPlayerId].hp !== undefined) {
                    player.hp = data[myPlayerId].hp;
                    if (player.hp <= 0) {
                        alert("Öldün! Ana menüye dönülüyor.");
                        window.returnToMainMenu();
                    }
                }
            });

            // 2. Ortak Dünya Kaynaklarını (Maden/Odun) Dinle (Minecraft Ortak Harita)
            const worldResRef = ref(db, 'rooms/' + currentRoomId + '/worldResources');
            onValue(worldResRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    worldResources = Object.values(data);
                } else {
                    // Oda ilk açıldıysa harita kaynaklarını üret ve Firebase'e yaz
                    generateInitialWorldResources();
                }
            });

            // 3. Mermileri Dinle (Ateş Etme Sistemi)
            const projectilesRef = ref(db, 'rooms/' + currentRoomId + '/projectiles');
            onValue(projectilesRef, (snapshot) => {
                const data = snapshot.val() || {};
                projectiles = Object.values(data);
            });

            window.addEventListener('beforeunload', () => {
                remove(ref(db, 'rooms/' + currentRoomId + '/players/' + myPlayerId));
            });
        }
    }, 100);
}

function generateInitialWorldResources() {
    let initialRes = {};
    let types = [
        { type: 'wood', emoji: '🪵' },
        { type: 'stone', emoji: '🪨' },
        { type: 'iron', emoji: '🔩' },
        { type: 'diamond', emoji: '💎' }
    ];

    // Başlangıç etrafında 30 ortak kaynak üret
    for (let i = 0; i < 30; i++) {
        let id = 'res_' + i + '_' + Math.random().toString(36).substring(2, 6);
        let item = types[Math.floor(Math.random() * types.length)];
        initialRes[id] = {
            id: id,
            x: 800 + Math.random() * 400,
            y: 800 + Math.random() * 400,
            type: item.type,
            emoji: item.emoji,
            radius: 16
        };
    }
    window.FB.set(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/worldResources'), initialRes);
}

// Joystick
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

// ATEŞ ETME / MERMİ SİSTEMİ (⚔️ Butonuna basınca mermi fırlatır ve diğer oyuncuları vurur)
document.getElementById('btn-attack').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (window.FB && currentRoomId) {
        let bulletId = 'b_' + Math.random().toString(36).substring(2, 9);
        let bulletData = {
            id: bulletId,
            x: player.x,
            y: player.y,
            vx: Math.cos(player.angle) * 10,
            vy: Math.sin(player.angle) * 10,
            shooter: myPlayerId
        };
        window.FB.set(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/projectiles/' + bulletId), bulletData);
    }
}, { passive: false });

document.getElementById('btn-inv').addEventListener('click', () => {
    let invList = document.getElementById('inv-list');
    if (invList) {
        invList.innerHTML = `
            <div class="item-row"><span>🪵 Odun: ${player.inventory.wood}</span></div>
            <div class="item-row"><span>🪨 Taş: ${player.inventory.stone}</span></div>
            <div class="item-row"><span>🔩 Demir: ${player.inventory.iron}</span></div>
            <div class="item-row"><span>💎 Elmas: ${player.inventory.diamond}</span></div>
        `;
    }
    let modal = document.getElementById('inv-modal');
    if (modal) modal.style.display = 'flex';
});

window.placeWorkbench = function() {
    if (player.inventory.wood >= 5 && player.inventory.stone >= 3) {
        player.inventory.wood -= 5; player.inventory.stone -= 3;
        worldObjects.push({ x: player.x, y: player.y, type: 'workbench' });
        updateUI(); window.closeModals();
        alert('Çalışma Masası kuruldu!');
    } else { alert('Yetersiz malzeme! (5 Odun, 3 Taş gerekli)'); }
};

let activeWorkbench = null;
function checkWorkbenchProximity() {
    let interactBtn = document.getElementById('btn-interact');
    if (!interactBtn) return;
    activeWorkbench = null;
    worldObjects.forEach(obj => {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 45) activeWorkbench = obj;
    });
    interactBtn.style.display = activeWorkbench ? 'flex' : 'none';
}

document.getElementById('btn-interact').addEventListener('click', () => {
    if (activeWorkbench) {
        let modal = document.getElementById('craft-modal');
        if (modal) modal.style.display = 'flex';
    }
});

window.closeModals = function() {
    let craftModal = document.getElementById('craft-modal');
    let invModal = document.getElementById('inv-modal');
    if (craftModal) craftModal.style.display = 'none';
    if (invModal) invModal.style.display = 'none';
};

window.craftItem = function(type, reqWood, reqIron) {
    if (player.inventory.wood >= reqWood && player.inventory.iron >= reqIron) {
        player.inventory.wood -= reqWood; player.inventory.iron -= reqIron;
        updateUI(); window.closeModals(); alert('Demir Kılıç üretildi!');
    } else { alert('Yetersiz malzeme!'); }
};

function updateUI() {
    let hpEl = document.getElementById('hp-val');
    let coordX = document.getElementById('coord-x');
    let coordY = document.getElementById('coord-y');
    let woodEl = document.getElementById('i-wood');
    let stoneEl = document.getElementById('i-stone');
    let ironEl = document.getElementById('i-iron');
    let diamondEl = document.getElementById('i-diamond');

    if (hpEl) hpEl.innerText = player.hp;
    if (coordX) coordX.innerText = Math.floor(player.x);
    if (coordY) coordY.innerText = Math.floor(player.y);
    if (woodEl) woodEl.innerText = player.inventory.wood;
    if (stoneEl) stoneEl.innerText = player.inventory.stone;
    if (ironEl) ironEl.innerText = player.inventory.iron;
    if (diamondEl) diamondEl.innerText = player.inventory.diamond;
}

let firebaseSyncTimer = 0;
function update() {
    if (joyVector.x !== 0 || joyVector.y !== 0) {
        player.x += joyVector.x * player.speed;
        player.y += joyVector.y * player.speed;
        player.angle = Math.atan2(joyVector.y, joyVector.x);
        updateUI();
    }

    // Konum ve Can Senkronizasyonu
    firebaseSyncTimer++;
    if (firebaseSyncTimer > 3 && window.FB && currentRoomId) {
        firebaseSyncTimer = 0;
        window.FB.set(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/players/' + myPlayerId), {
            name: playerName,
            x: player.x,
            y: player.y,
            angle: player.angle,
            inventory: player.inventory,
            hp: player.hp
        });
    }

    // Ortak Maden / Eşya Toplama (Minecraft Mantığı: Biri alırsa herkesten yok olur)
    for (let i = 0; i < worldResources.length; i++) {
        let res = worldResources[i];
        if (Math.hypot(player.x - res.x, player.y - res.y) < player.radius + res.radius) {
            if (res.type === 'wood') player.inventory.wood++;
            if (res.type === 'stone') player.inventory.stone++;
            if (res.type === 'iron') player.inventory.iron++;
            if (res.type === 'diamond') player.inventory.diamond++;
            
            // Firebase'den bu kaynağı tamamen sil ki diğerlerinde de yok olsun
            if (window.FB && currentRoomId) {
                window.FB.remove(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/worldResources/' + res.id));
            }
            updateUI();
            break;
        }
    }

    // Mermi Hareketleri ve Vuruş Kontrolü
    if (window.FB && currentRoomId) {
        projectiles.forEach((b, index) => {
            b.x += b.vx;
            b.y += b.vy;

            // Eğer mermi beni vurduysa ve atan ben değilsem canım azalır
            if (b.shooter !== myPlayerId) {
                let dist = Math.hypot(player.x - b.x, player.y - b.y);
                if (dist < 20) {
                    player.hp -= 15;
                    updateUI();
                    // Mermiyi ortadan kaldır
                    window.FB.remove(window.FB.ref(window.FB.db, 'rooms/' + currentRoomId + '/projectiles/' + b.id));
                }
            }
        });
    }

    checkWorkbenchProximity();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

    // Harita zemin ızgarası
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    let startX = Math.floor((player.x - canvas.width) / 50) * 50;
    let endX = startX + canvas.width * 2;
    let startY = Math.floor((player.y - canvas.height) / 50) * 50;
    let endY = startY + canvas.height * 2;

    for (let x = startX; x < endX; x += 50) { ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke(); }
    for (let y = startY; y < endY; y += 50) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke(); }

    worldObjects.forEach(obj => {
        ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🪵🛠️", obj.x, obj.y);
    });

    // Ortak Kaynakları Çiz (Herkes aynı anda aynı kaynakları görür, toplanınca kaybolur)
    worldResources.forEach(res => {
        ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(res.emoji, res.x, res.y);
    });

    // Diğer Oyuncular
    for (let id in remotePlayers) {
        if (id === myPlayerId) continue;
        let p = remotePlayers[id];
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        let remoteHp = p.hp !== undefined ? p.hp : 100;
        ctx.fillText(`${p.name || "Oyuncu"} (❤️${remoteHp})`, p.x, p.y - 22);
    }

    // Mermiler
    projectiles.forEach(b => {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    });

    // Kendi Oyuncumuz
    ctx.save();
    ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(0, -4, player.radius + 10, 8);
    ctx.restore();

    ctx.fillStyle = "#2ecc71"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(playerName + " (Sen)", player.x, player.y - 22);

    ctx.restore();
}

function loop() {
    if (document.getElementById('game-screen').classList.contains('active')) {
        update();
        draw();
    }
    requestAnimationFrame(loop);
}
loop();
