/* ============================================
   GOSPINIT — MAIN.JS
   ============================================ */

// ── State ──────────────────────────────────
let entries = [];
let spinning = false;
let currentAngle = 0;
let winner = null;
let logoImage = null;
let soundEnabled = true;
let isDark = false;
let idleAnimFrame = null;

// ── Wheel colors ───────────────────────────
const WHEEL_COLORS_DEFAULT = [
  '#c0392b',
  '#d4652a',
  '#e8a020',
  '#c8c832',
  '#7ab648',
  '#4aaa6a',
  '#5abcaa',
  '#7ab8d8',
  '#8090cc',
  '#9a78b8',
  '#c87898',
  '#d4826a'
];

const WHEEL_COLORS_DARK = [
  '#2dd4bf',
  '#818cf8',
  '#34d399',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#38bdf8',
  '#fb923c',
  '#4ade80',
  '#e879f9',
  '#f43f5e'
];

function getWheelColors() {
  return isDark ? WHEEL_COLORS_DARK : WHEEL_COLORS_DEFAULT;
}

// ── DOM refs ───────────────────────────────
const canvas = document.getElementById('wheelCanvas');
canvas.width = 600;
canvas.height = 600;
const ctx = canvas.getContext('2d');
const showTitle = document.getElementById('showTitle');
const wheelTitle = document.getElementById('wheelTitle');
const titleCharCount = document.getElementById('titleCharCount');
const wheelTitleDisplay = document.getElementById('wheelTitleDisplay');
const wheelTitleText = document.getElementById('wheelTitleText');
const spinDuration = document.getElementById('spinDuration');
const spinDurationLabel = document.getElementById('spinDurationLabel');
const nameInput = document.getElementById('nameInput');
const loadBtn = document.getElementById('loadBtn');
const entryCount = document.getElementById('entryCount');
const winnerCard = document.getElementById('winnerCard');
const winnerCardMsg = document.getElementById('winnerCardMsg');
const winnerCardName = document.getElementById('winnerCardName');
const wheelPointer = document.getElementById('wheelPointer');
const keepBtn = document.getElementById('keepBtn');
const removeBtn = document.getElementById('removeBtn');
const historyList = document.getElementById('historyList');
const clearHistory = document.getElementById('clearHistory');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const logoUpload = document.getElementById('logoUpload');
const clearLogo = document.getElementById('clearLogo');
const winMessage = document.getElementById('winMessage');
const embedCode = document.getElementById('embedCode');
const copyEmbed = document.getElementById('copyEmbed');
const noDuplicates = document.getElementById('noDuplicates');

// ── Sounds ─────────────────────────────────
const spinSound = new Audio(
  'https://assets.mixkit.co/active_storage/sfx/1489/1489-preview.mp3'
);
const cheerSound = new Audio(
  'https://assets.mixkit.co/active_storage/sfx/2028/2028-preview.mp3'
);
spinSound.preload = 'auto';
cheerSound.preload = 'auto';

function playSound(audio) {
  if (!soundEnabled) return;
  audio.currentTime = 0;
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch(() => {});
  }
}

// ── Theme ──────────────────────────────────
function setTheme(dark) {
  isDark = dark;
  document.body.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('theme-default', !dark);
  themeToggle.querySelector('.theme-icon').textContent = dark ? '☀️' : '🌙';
  drawWheel();
}

themeToggle.addEventListener('click', () => setTheme(!isDark));

// ── Spin duration ──────────────────────────
spinDuration.addEventListener('input', () => {
  spinDurationLabel.textContent = `${spinDuration.value}s`;
});

// ── Logo upload ────────────────────────────
logoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      drawWheel();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

clearLogo.addEventListener('click', () => {
  logoImage = null;
  logoUpload.value = '';
  drawWheel();
});

// ── Load names ─────────────────────────────
loadBtn.addEventListener('click', loadNames);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) loadNames();
});

nameInput.addEventListener('input', () => {
  const raw = nameInput.value
    .split(/[\n,]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const count = raw.length;
  entryCount.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;

  const seen = new Set();
  const dupes = new Set();
  raw.forEach((n) => {
    if (seen.has(n.toLowerCase())) dupes.add(n);
    else seen.add(n.toLowerCase());
  });

  const warning = document.getElementById('duplicateWarning');
  if (warning) {
    if (noDuplicates.checked && dupes.size > 0) {
      const list = [...dupes].join(', ');
      warning.textContent = `⚠️ Duplicate${dupes.size > 1 ? 's' : ''}: ${list}`;
    } else {
      warning.textContent = '';
    }
  }
});

function loadNames() {
  const raw = nameInput.value
    .split(/[\n,]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  let unique;
  if (noDuplicates.checked) {
    const seen = new Set();
    const dupes = new Set();
    raw.forEach((n) => {
      if (seen.has(n.toLowerCase())) dupes.add(n);
      else seen.add(n.toLowerCase());
    });
    unique = [...seen];
    const warning = document.getElementById('duplicateWarning');
    if (warning) {
      if (dupes.size > 0) {
        warning.textContent = `⚠️ ${dupes.size} duplicate${dupes.size > 1 ? 's' : ''} removed.`;
        setTimeout(() => {
          warning.textContent = '';
        }, 3000);
      } else {
        warning.textContent = '';
      }
    }
  } else {
    unique = raw;
    const warning = document.getElementById('duplicateWarning');
    if (warning) warning.textContent = '';
  }

  const cap = Math.min(unique.length, 100);
  entries = unique.slice(0, cap);

  stopIdleAnimation();
  updateEntryCount();
  drawWheel();
  hideWinner();
  updateEmbedCode();
  renderEntriesPreview(entries);
}

function updateEntryCount() {
  const c = entries.length;
  entryCount.textContent = `${c} ${c === 1 ? 'entry' : 'entries'}`;
}

// ── Idle animation ─────────────────────────
const IDLE_SEGMENTS = 12;

function startIdleAnimation() {
  if (idleAnimFrame) return;
  function idleFrame() {
    currentAngle += 0.003;
    drawIdleWheel();
    idleAnimFrame = requestAnimationFrame(idleFrame);
  }
  idleAnimFrame = requestAnimationFrame(idleFrame);
}

function stopIdleAnimation() {
  if (idleAnimFrame) {
    cancelAnimationFrame(idleAnimFrame);
    idleAnimFrame = null;
  }
}

function drawIdleWheel() {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const colors = getWheelColors();
  const arc = (Math.PI * 2) / IDLE_SEGMENTS;

  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < IDLE_SEGMENTS; i++) {
    const start = currentAngle + i * arc;
    const end = start + arc;
    const color = colors[i % colors.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `600 16px Fredoka, sans-serif`;
    ctx.fillText('?', r - 20, 6);
    ctx.restore();
  }

  drawHub(cx, cy);
}

// ── Draw Wheel ─────────────────────────────
function drawWheel() {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  ctx.clearRect(0, 0, size, size);

  if (entries.length === 0) {
    return;
  }

  const colors = getWheelColors();
  const arc = (Math.PI * 2) / entries.length;

  entries.forEach((name, i) => {
    const start = currentAngle + i * arc;
    const end = start + arc;
    const color = colors[i % colors.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const fontSize = entries.length > 12 ? 11 : entries.length > 8 ? 13 : 15;
    ctx.font = `600 ${fontSize}px Fredoka, sans-serif`;
    const maxLen = 14;
    const label = name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 3;
    ctx.fillText(label, r - 14, fontSize / 3);
    ctx.restore();
  });

  drawHub(cx, cy);
}

function drawHub(cx, cy) {
  const hubR = canvas.width * 0.09;

  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#0e1117' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = isDark ? '#2a3548' : '#e8e0d5';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (logoImage) {
    const logoSize = hubR * 1.4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hubR - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      logoImage,
      cx - logoSize / 2,
      cy - logoSize / 2,
      logoSize,
      logoSize
    );
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, hubR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#2dd4bf' : '#d4924a';
    ctx.fill();

    // Click to spin hint
    if (!spinning) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
      ctx.font = `600 ${hubR * 0.3}px Fredoka, sans-serif`;
      ctx.fillText('click wheel', cx, cy - hubR * 0.18);
      ctx.fillText('to spin', cx, cy + hubR * 0.18);
      ctx.restore();
    }
  }
}

function renderEntriesPreview(list) {
  const preview = document.getElementById('entriesPreview');
  if (!preview) return;
  if (list.length === 0) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = list
    .map(
      (name, i) =>
        `<div class="entries-preview-item">
      <span class="entries-preview-num">#${i + 1}</span>
      <span>${name}</span>
    </div>`
    )
    .join('');
}

// ── Spin ───────────────────────────────────
canvas.addEventListener('click', spin);
canvas.style.cursor = 'pointer';

function spin() {
  if (spinning) return;
  if (entries.length < 2) {
    const w = document.getElementById('wheelWarning');
    w.style.display = 'block';
    setTimeout(() => {
      w.style.display = 'none';
    }, 2500);
    return;
  }

  spinning = true;
  canvas.style.cursor = 'not-allowed';
  hideWinner();
  playSound(spinSound);

  const totalSpin = Math.PI * 2 * (8 + Math.random() * 8);
  const duration = (parseInt(spinDuration.value) || 5) * 1000;
  const startAngle = currentAngle;
  const startTime = performance.now();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    currentAngle = startAngle + totalSpin * easeOut(t);
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      currentAngle = currentAngle % (Math.PI * 2);
      spinning = false;
      canvas.style.cursor = 'pointer';
      revealWinner();
    }
  }

  requestAnimationFrame(frame);
}

// ── Winner detection ───────────────────────
function revealWinner() {
  const arc = (Math.PI * 2) / entries.length;
  const normalized =
    (Math.PI * 1.5 - (currentAngle % (Math.PI * 2)) + Math.PI * 2) %
    (Math.PI * 2);
  const idx = Math.floor(normalized / arc) % entries.length;
  winner = entries[idx];

  const msg = winMessage.value.trim() || '🎉 Winner!';
  winnerCardMsg.textContent = msg;
  winnerCardName.textContent = winner;

  wheelPointer.style.opacity = '0';
  winnerCard.classList.add('visible');

  addToHistory(winner);
  playSound(cheerSound);
  launchConfetti();
}

function hideWinner() {
  winner = null;
  winnerCard.classList.remove('visible');
  wheelPointer.style.opacity = '1';
}

// ── Keep / Remove ──────────────────────────
keepBtn.addEventListener('click', () => hideWinner());

removeBtn.addEventListener('click', () => {
  if (winner) {
    entries = entries.filter((e) => e !== winner);
    updateEntryCount();
    drawWheel();
    updateEmbedCode();
    if (entries.length === 0) startIdleAnimation();
  }
  hideWinner();
  renderEntriesPreview(entries);
});

// ── History ────────────────────────────────
let spinHistory = [];

function addToHistory(name) {
  spinHistory.unshift(name);
  renderHistory();
}

function renderHistory() {
  if (spinHistory.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No spins yet...</li>';
    return;
  }
  historyList.innerHTML = spinHistory
    .map(
      (name, i) =>
        `<li><span style="color:var(--text-muted);font-size:12px;min-width:20px;">#${i + 1}</span>${name}</li>`
    )
    .join('');
}

clearHistory.addEventListener('click', () => {
  spinHistory = [];
  renderHistory();
});

// ── Embed code ─────────────────────────────
function updateEmbedCode() {
  const params =
    entries.length > 0
      ? '?entries=' + encodeURIComponent(entries.join(','))
      : '';
  const url = `${window.location.origin}${params}`;
  embedCode.value = `<iframe src="${url}" width="600" height="700" frameborder="0" style="border-radius:16px;"></iframe>`;
}

copyEmbed.addEventListener('click', () => {
  embedCode.select();
  navigator.clipboard.writeText(embedCode.value).catch(() => {
    document.execCommand('copy');
  });
  copyEmbed.textContent = '✓ Copied!';
  setTimeout(() => {
    copyEmbed.textContent = 'Copy code';
  }, 2000);
});

// ── Sound toggle ───────────────────────────
soundToggle.addEventListener('change', () => {
  soundEnabled = soundToggle.checked;
});

// ── Confetti ───────────────────────────────
function launchConfetti() {
  const canvas2 = document.getElementById('confettiCanvas');
  if (!canvas2) return;
  const ctx2 = canvas2.getContext('2d');
  canvas2.width = window.innerWidth;
  canvas2.height = window.innerHeight;

  const colors = getWheelColors();
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas2.width,
    y: Math.random() * -canvas2.height * 0.5,
    r: Math.random() * 8 + 4,
    d: Math.random() * 3 + 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    tiltSpeed: Math.random() * 0.1 + 0.05,
    angle: 0
  }));

  let frameCount = 0;
  const maxFrames = 270;

  function draw() {
    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    pieces.forEach((p) => {
      p.y += p.d + 1;
      p.x += Math.sin(p.angle) * 1.5;
      p.angle += 0.05;
      p.tilt += p.tiltSpeed;
      ctx2.beginPath();
      ctx2.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt, 0, Math.PI * 2);
      ctx2.fillStyle = p.color;
      ctx2.globalAlpha = Math.max(0, 1 - frameCount / maxFrames);
      ctx2.fill();
    });
    frameCount++;
    if (frameCount < maxFrames) requestAnimationFrame(draw);
    else {
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
      ctx2.globalAlpha = 1;
    }
  }
  requestAnimationFrame(draw);
}

// ── URL param loading ──────────────────────
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const e = params.get('entries');
  if (e) {
    const names = decodeURIComponent(e)
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length > 0) {
      entries = names.slice(0, 100);
      nameInput.value = entries.join('\n');
      updateEntryCount();
      stopIdleAnimation();
      drawWheel();
      updateEmbedCode();
      return;
    }
  }
  startIdleAnimation();
}

// ── Modals ─────────────────────────────────
const customiseModal = document.getElementById('customiseModal');
const shareModal = document.getElementById('shareModal');

showTitle.addEventListener('change', () => {
  const enabled = showTitle.checked;
  wheelTitle.disabled = !enabled;
  wheelTitle.style.opacity = enabled ? '1' : '0.5';
  wheelTitleDisplay.style.display =
    enabled && wheelTitle.value.trim() ? 'block' : 'none';
});

wheelTitle.addEventListener('input', () => {
  const val = wheelTitle.value;
  titleCharCount.textContent = `${val.length} / 100`;
  wheelTitleText.textContent = val;
  wheelTitleDisplay.style.display =
    showTitle.checked && val.trim() ? 'block' : 'none';
});

document.getElementById('customiseBtn').addEventListener('click', () => {
  customiseModal.classList.add('open');
});
document.getElementById('shareBtn').addEventListener('click', () => {
  updateEmbedCode();
  shareModal.classList.add('open');
});
document.getElementById('closeCustomise').addEventListener('click', () => {
  customiseModal.classList.remove('open');
});
document.getElementById('closeShare').addEventListener('click', () => {
  shareModal.classList.remove('open');
});

[customiseModal, shareModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    customiseModal.classList.remove('open');
    shareModal.classList.remove('open');
  }
});

// ── Init ───────────────────────────────────
setTheme(false);
renderHistory();
updateEmbedCode();
loadFromURL();
