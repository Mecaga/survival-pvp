const ADMIN_PASSWORD = "1234";
let isAdmin = localStorage.getItem('blokdiyar_admin') === 'true';
const profileEmojis = ['👤', '🐱', '🐤', '⚽', '🤓', '🦊', '🤖', '⭐', '🚀'];

// Aktif seçilen durum filtresi (Varsayılan: 'all')
let currentStatusFilter = 'all';

const firebaseConfig = {
  databaseURL: "https://survival-pvp-game-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const suggestionsRef = db.ref('suggestions');
const mainVotesRef = db.ref('announcement_votes');

let suggestionsData = {};
let localVotes = JSON.parse(localStorage.getItem('blokdiyar_votes') || '{}');

// Arka Planda Hareket Eden Emojileri Başlat
function initFloatingEmojis() {
  const bgContainer = document.getElementById('emojiBackground');
  if (!bgContainer) return;

  const emojis = ['🧱', '⛏️', '💎', '⭐', '🚀', '🌲', '🛠️', '💡'];
  const count = 15; // Ekranda aynı anda süzülecek emoji sayısı

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'floating-emoji';
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Rastgele konum ve hız ayarları
    span.style.left = Math.random() * 100 + 'vw';
    span.style.animationDuration = (10 + Math.random() * 15) + 's';
    span.style.animationDelay = -(Math.random() * 15) + 's';
    span.style.fontSize = (1.2 + Math.random() * 1.5) + 'rem';

    bgContainer.appendChild(span);
  }
}

// Sayfa açıldığında emojileri başlat
window.addEventListener('DOMContentLoaded', initFloatingEmojis);

// Admin Modu
function toggleAdminMode() {
  if (isAdmin) {
    if (confirm("Admin modundan çıkmak istiyor musunuz?")) {
      isAdmin = false;
      localStorage.removeItem('blokdiyar_admin');
      updateAdminUI();
      renderSuggestions();
    }
  } else {
    const password = prompt("Admin Şifresini Girin:");
    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      localStorage.setItem('blokdiyar_admin', 'true');
      alert("Admin girişi başarılı!");
      updateAdminUI();
      renderSuggestions();
    } else if (password !== null) {
      alert("Hatalı şifre!");
    }
  }
}

function updateAdminUI() {
  const btn = document.getElementById('adminToggleBtn');
  const icon = document.getElementById('adminIcon');
  const text = document.getElementById('adminText');

  if (isAdmin) {
    btn.classList.add('active');
    icon.className = 'fa-solid fa-unlock-keyhole';
    text.textContent = 'Çıkış';
  } else {
    btn.classList.remove('active');
    icon.className = 'fa-solid fa-lock';
    text.textContent = 'Admin';
  }
}

// Durum Değiştirme
function changeStatus(id, newStatus) {
  if (!isAdmin) return;
  suggestionsRef.child(id).update({ status: newStatus });
}

// Öneri Silme
function deleteSuggestion(id) {
  if (!isAdmin) return;
  if (confirm("Bu öneriyi kalıcı olarak silmek istediğinize emin misiniz?")) {
    suggestionsRef.child(id).remove();
  }
}

// Sekmelere tıklandığında durumu filtrele
function filterByStatus(status, btnElement) {
  currentStatusFilter = status;
  
  // Butonların aktiflik sınıfını güncelle
  document.querySelectorAll('.status-tab-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');

  renderSuggestions();
}

// Yorumları Aç/Kapat
function toggleComments(id) {
  const container = document.getElementById('comments-' + id);
  container.classList.toggle('open');
}

// Yorum Formunu Aç/Kapat (+)
function toggleCommentForm(id) {
  const formBox = document.getElementById('comment-form-box-' + id);
  formBox.classList.toggle('open');
}

// Yorum Ekleme
function addComment(suggestionId) {
  const nameInput = document.getElementById('comment-name-' + suggestionId);
  const textInput = document.getElementById('comment-text-' + suggestionId);

  const author = nameInput.value.trim();
  const text = textInput.value.trim();

  if (!author) {
    alert('Lütfen bir takma ad girin!');
    return;
  }
  if (!text) {
    alert('Lütfen bir yorum yazın!');
    return;
  }

  let emojiIndex = 0;
  for (let i = 0; i < author.length; i++) {
    emojiIndex += author.charCodeAt(i);
  }
  const assignedEmoji = profileEmojis[emojiIndex % profileEmojis.length];

  const now = new Date();
  const timeStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const commentRef = suggestionsRef.child(suggestionId).child('comments').push();
  commentRef.set({
    author: author,
    emoji: assignedEmoji,
    text: text,
    time: timeStr,
    isAdminComment: isAdmin
  }).then(() => {
    textInput.value = '';
    document.getElementById('comment-form-box-' + suggestionId).classList.remove('open');
    document.getElementById('comments-' + suggestionId).classList.add('open');
  });
}

// Bağlantı Kontrolü
db.ref('.info/connected').on('value', (snap) => {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (snap.val() === true) {
    dot.style.backgroundColor = 'var(--green)';
    text.textContent = 'Canlı Veritabanı Bağlı';
  } else {
    dot.style.backgroundColor = 'var(--red)';
    text.textContent = 'Bağlantı Bekleniyor...';
  }
});

// Tema Değiştirici
function setTheme(theme) {
  document.body.className = 'theme-' + theme;
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.theme-btn.t-${theme}`).classList.add('active');
}

// Duyuru Beğeni (Geri Alma ve Değiştirme)
function voteMain(type) {
  const voteKey = 'main_announcement';
  const currentVote = localVotes[voteKey];

  if (currentVote === type) {
    mainVotesRef.child(type).transaction((current) => Math.max(0, (current || 0) - 1));
    delete localVotes[voteKey];
  } else {
    if (currentVote) {
      mainVotesRef.child(currentVote).transaction((current) => Math.max(0, (current || 0) - 1));
    }
    mainVotesRef.child(type).transaction((current) => (current || 0) + 1);
    localVotes[voteKey] = type;
  }

  localStorage.setItem('blokdiyar_votes', JSON.stringify(localVotes));
  updateMainVoteUI();
}

mainVotesRef.on('value', (snapshot) => {
  const votes = snapshot.val() || { like: 0, dislike: 0 };
  document.getElementById('mainLikeCount').textContent = votes.like || 0;
  document.getElementById('mainDislikeCount').textContent = votes.dislike || 0;
  updateMainVoteUI();
});

function updateMainVoteUI() {
  const userVote = localVotes['main_announcement'];
  const likeBtn = document.getElementById('mainLikeBtn');
  const dislikeBtn = document.getElementById('mainDislikeBtn');

  likeBtn.classList.remove('active-like');
  dislikeBtn.classList.remove('active-dislike');

  if (userVote === 'like') likeBtn.classList.add('active-like');
  if (userVote === 'dislike') dislikeBtn.classList.add('active-dislike');
}

// Öneri Ekleme
function addSuggestion() {
  const nicknameInput = document.getElementById('nicknameInput');
  const categoryInput = document.getElementById('categoryInput');
  const contentInput = document.getElementById('contentInput');

  const nickname = nicknameInput.value.trim();
  const category = categoryInput.value;
  const content = contentInput.value.trim();

  if (!nickname) {
    alert('Lütfen takma adını gir!');
    return;
  }
  if (!content) {
    alert('Lütfen öneri içeriğini yaz!');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const newRef = suggestionsRef.push();
  newRef.set({
    nickname: nickname,
    category: category,
    content: content,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    formattedDate: dateStr,
    likes: 0,
    dislikes: 0,
    status: 'pending'
  }).then(() => {
    contentInput.value = '';
  }).catch((error) => {
    alert('Gönderilirken hata oluştu: ' + error.message);
  });
}

// Oy Verme (Geri Alma ve Değiştirme)
function voteSuggestion(id, type) {
  const voteKey = 'suggestion_' + id;
  const currentVote = localVotes[voteKey];

  if (currentVote === type) {
    suggestionsRef.child(id).child(type === 'like' ? 'likes' : 'dislikes').transaction((current) => Math.max(0, (current || 0) - 1));
    delete localVotes[voteKey];
  } else {
    if (currentVote) {
      suggestionsRef.child(id).child(currentVote === 'like' ? 'likes' : 'dislikes').transaction((current) => Math.max(0, (current || 0) - 1));
    }
    suggestionsRef.child(id).child(type === 'like' ? 'likes' : 'dislikes').transaction((current) => (current || 0) + 1);
    localVotes[voteKey] = type;
  }

  localStorage.setItem('blokdiyar_votes', JSON.stringify(localVotes));
}

// Veritabanı Dinleyici
suggestionsRef.on('value', (snapshot) => {
  suggestionsData = snapshot.val() || {};
  renderSuggestions();
});

function getStatusBadgeHtml(status, id) {
  const st = status || 'pending';
  if (isAdmin) {
    return `
      <select class="admin-status-select" onchange="changeStatus('${id}', this.value)">
        <option value="pending" ${st === 'pending' ? 'selected' : ''}>⏳ İnceleniyor</option>
        <option value="planned" ${st === 'planned' ? 'selected' : ''}>🚀 Planlanıyor</option>
        <option value="added" ${st === 'added' ? 'selected' : ''}>✅ Eklendi</option>
        <option value="rejected" ${st === 'rejected' ? 'selected' : ''}>❌ Reddedildi</option>
        <option value="failed" ${st === 'failed' ? 'selected' : ''}>⚠️ Yapılamadı</option>
      </select>
    `;
  }
  switch(st) {
    case 'planned': return `<span class="status-tag planned"><i class="fa-solid fa-rocket"></i> Planlanıyor</span>`;
    case 'added': return `<span class="status-tag added"><i class="fa-solid fa-circle-check"></i> Eklendi</span>`;
    case 'rejected': return `<span class="status-tag rejected"><i class="fa-solid fa-circle-xmark"></i> Reddedildi</span>`;
    case 'failed': return `<span class="status-tag failed"><i class="fa-solid fa-triangle-exclamation"></i> Yapılamadı</span>`;
    default: return `<span class="status-tag pending"><i class="fa-solid fa-hourglass-half"></i> İnceleniyor</span>`;
  }
}

// Listeleme, Sekme Filtreleme ve Sıralama
function renderSuggestions() {
  const listEl = document.getElementById('suggestionsList');
  const sortType = document.getElementById('sortSelect').value;
  const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

  const keys = Object.keys(suggestionsData);
  
  let items = keys.map(key => ({
    id: key,
    ...suggestionsData[key]
  }));

  // Durum Sekmesi Filtresi (Tümü veya seçilen durum)
  if (currentStatusFilter !== 'all') {
    items = items.filter(item => (item.status || 'pending') === currentStatusFilter);
  }

  // Arama Filtresi
  if (searchQuery) {
    items = items.filter(item => {
      const contentMatch = (item.content || '').toLowerCase().includes(searchQuery);
      const nicknameMatch = (item.nickname || '').toLowerCase().includes(searchQuery);
      return contentMatch || nicknameMatch;
    });
  }

  document.getElementById('totalCount').textContent = items.length;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-comments fa-2x" style="margin-bottom: 8px;"></i>
        <p>Bu sekmede henüz öneri bulunmuyor.</p>
      </div>
    `;
    return;
  }

  // Sıralama Mantığı
  items.sort((a, b) => {
    if (sortType === 'likes') {
      const scoreA = (a.likes || 0) - (a.dislikes || 0);
      const scoreB = (b.likes || 0) - (b.dislikes || 0);
      return scoreB - scoreA;
    } else if (sortType === 'newest') {
      return (b.timestamp || 0) - (a.timestamp || 0);
    } else if (sortType === 'oldest') {
      return (a.timestamp || 0) - (b.timestamp || 0);
    }
  });

  listEl.innerHTML = items.map(item => {
    const userVote = localVotes['suggestion_' + item.id];
    const likeActiveClass = userVote === 'like' ? 'active-like' : '';
    const dislikeActiveClass = userVote === 'dislike' ? 'active-dislike' : '';

    const deleteButtonHtml = isAdmin ? `
      <button class="delete-btn" onclick="deleteSuggestion('${item.id}')" title="Öneriyi Sil">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    ` : '';

    const commentsObj = item.comments || {};
    const commentKeys = Object.keys(commentsObj);
    const commentCount = commentKeys.length;

    const commentsHtml = commentKeys.map(cKey => {
      const com = commentsObj[cKey];
      const authorClass = com.isAdminComment ? 'comment-author admin-author' : 'comment-author';
      const badgeText = com.isAdminComment ? ' [Geliştirici]' : '';
      const userEmoji = com.emoji || '👤';
      return `
        <div class="comment-item">
          <div class="comment-header">
            <span class="${authorClass}">${userEmoji} ${escapeHtml(com.author)}${badgeText}</span>
            <span>${com.time || ''}</span>
          </div>
          <div>${escapeHtml(com.text)}</div>
        </div>
      `;
    }).join('');

    const categoryName = item.category || 'Öneri';

    return `
      <div class="suggestion-card">
        <div class="suggestion-top-row">
          <div class="suggestion-main">
            <div class="suggestion-header">
              <span class="nickname-tag">👤 ${escapeHtml(item.nickname)}</span>
              <span class="category-tag">${escapeHtml(categoryName)}</span>
              ${getStatusBadgeHtml(item.status, item.id)}
              <span class="date-tag"><i class="fa-regular fa-clock"></i> ${item.formattedDate || ''}</span>
            </div>
            <div class="suggestion-content">
              <strong>${escapeHtml(item.nickname)}</strong> | ${escapeHtml(item.content)}
            </div>
          </div>
          <div class="suggestion-actions">
            <button class="vote-btn ${likeActiveClass}" onclick="voteSuggestion('${item.id}', 'like')" title="Beğen / Geri Al">
              <i class="fa-regular fa-thumbs-up"></i>
              <span>${item.likes || 0}</span>
            </button>
            <button class="vote-btn ${dislikeActiveClass}" onclick="voteSuggestion('${item.id}', 'dislike')" title="Beğenme / Geri Al">
              <i class="fa-regular fa-thumbs-down"></i>
              <span>${item.dislikes || 0}</span>
            </button>
            ${deleteButtonHtml}
          </div>
        </div>

        <!-- Yorumlar Bölümü -->
        <div class="comments-section">
          <div class="comments-bar-row">
            <button class="toggle-comments-btn" onclick="toggleComments('${item.id}')">
              <i class="fa-regular fa-comment-dots"></i> Yorumlar (${commentCount})
            </button>
            <button class="add-comment-toggle-btn" onclick="toggleCommentForm('${item.id}')" title="Yorum Yaz (+) ">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <!-- Yorum Yazma Alanı -->
          <div class="comment-form-box" id="comment-form-box-${item.id}">
            <div class="comment-form">
              <input type="text" id="comment-name-${item.id}" class="input-field comment-input-name" placeholder="Takma adın..." maxlength="15">
              <input type="text" id="comment-text-${item.id}" class="input-field comment-input-text" placeholder="Yorumunu yaz...">
              <button class="comment-send-btn" onclick="addComment('${item.id}')">Gönder</button>
            </div>
          </div>

          <!-- Yorum Listesi -->
          <div class="comments-container" id="comments-${item.id}">
            ${commentsHtml || '<p style="font-size:0.85rem; color:var(--text-muted);">Henüz yorum yapılmamış.</p>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}

updateAdminUI();
