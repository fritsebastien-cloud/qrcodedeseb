import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBkw6ox4lZx5G3Suo2HIWj6oq-mUaVii-E",
  authDomain: "map-concept-761a5.firebaseapp.com",
  databaseURL: "https://map-concept-761a5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "map-concept-761a5",
  storageBucket: "map-concept-761a5.firebasestorage.app",
  messagingSenderId: "1099257545089",
  appId: "1:1099257545089:web:02577e8c279d2f6393a880"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);
const scoresRef = ref(db, "qrcode-scores-v6");

const ACCESS_CODE_HASH = "c18eab1d848cc0fef69adaf999c36afc0f42a2c33408f61ac5cf4e9684041426";

async function hashCode(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateGameToken(score, timestamp) {
  const secret = timestamp.toString(36) + score.toString(36) + "bras";
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    const char = secret.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ── Wheel segments (scrambled for excitement) ──
const WHEEL_SEGMENTS = [
  1, 165, 14, 190, 36, 145, 6, 198, 50, 120,
  27, 178, 70, 200, 3, 155, 40, 186, 85, 22,
  150, 60, 196, 32, 130, 75, 192, 105, 45, 183,
  90, 160, 110, 199, 65, 140, 100, 194, 55, 170,
  80, 188, 10, 175, 95, 180, 18, 135, 115, 125
];

function getSegmentColor(value) {
  if (value <= 10) return "#c9962a";
  if (value <= 50) return "#2d8f4e";
  if (value <= 100) return "#2a6b9b";
  if (value <= 150) return "#6b4a8a";
  return "#9b2525";
}

// ── Wheel drawing ──
let currentRotation = 0;
let isSpinning = false;

function initWheel() {
  const canvas = document.getElementById("wheel-canvas");
  if (!canvas) return;
  const container = canvas.parentElement;
  const size = container.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWheel(currentRotation);
}

// ── Sound effects ──
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTickSound(speed) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600 + Math.random() * 300;
    osc.type = "square";
    const vol = speed ? Math.min(0.06, 0.02 + (1 - speed / 0.25) * 0.04) : 0.03;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

function playRevealSound() {
  try {
    const ctx = getAudioCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.value = 0.07;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8 + i * 0.1);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.8 + i * 0.1);
    });
  } catch (e) {}
}

function drawWheel(rotation) {
  const canvas = document.getElementById("wheel-canvas");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.width / dpr;
  const ctx = canvas.getContext("2d");
  const center = size / 2;
  const ringWidth = Math.round(size * 0.025);
  const radius = center - ringWidth - 2;
  const segCount = WHEEL_SEGMENTS.length;
  const segAngle = (2 * Math.PI) / segCount;

  ctx.clearRect(0, 0, size, size);

  // Outer metallic ring
  const ringGrad = ctx.createLinearGradient(0, 0, size, size);
  ringGrad.addColorStop(0, "#c0c0c0");
  ringGrad.addColorStop(0.25, "#f0f0f0");
  ringGrad.addColorStop(0.5, "#888");
  ringGrad.addColorStop(0.75, "#e8e8e8");
  ringGrad.addColorStop(1, "#aaa");
  ctx.beginPath();
  ctx.arc(center, center, radius + ringWidth, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(center, center, radius + ringWidth + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Segments
  WHEEL_SEGMENTS.forEach((value, i) => {
    const startAngle = rotation + i * segAngle;
    const endAngle = startAngle + segAngle;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();

    const baseColor = getSegmentColor(value);
    ctx.fillStyle = i % 2 === 0 ? baseColor : lightenColor(baseColor, 25);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + segAngle / 2);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    ctx.font = "bold " + Math.round(size * 0.028) + "px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(value.toString(), radius * 0.68, 0);
    ctx.fillStyle = "#fff";
    ctx.fillText(value.toString(), radius * 0.68, 0);
    ctx.restore();
  });

  // Pins at segment boundaries
  WHEEL_SEGMENTS.forEach((_, i) => {
    const angle = rotation + i * segAngle;
    const pinR = radius + ringWidth * 0.5;
    const px = center + Math.cos(angle) * pinR;
    const py = center + Math.sin(angle) * pinR;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, size * 0.006), 0, Math.PI * 2);
    ctx.fillStyle = "#f0d060";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  // Glossy light reflection overlay
  const glossGrad = ctx.createLinearGradient(center * 0.3, center * 0.3, center * 1.5, center * 1.5);
  glossGrad.addColorStop(0, "rgba(255,255,255,0.18)");
  glossGrad.addColorStop(0.4, "rgba(255,255,255,0.05)");
  glossGrad.addColorStop(0.6, "rgba(0,0,0,0)");
  glossGrad.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = glossGrad;
  ctx.fill();

  // Center hub – metallic gradient
  const hubRadius = radius * 0.14;
  const hubGrad = ctx.createRadialGradient(center - hubRadius * 0.3, center - hubRadius * 0.3, 0, center, center, hubRadius);
  hubGrad.addColorStop(0, "#e0e0e0");
  hubGrad.addColorStop(0.4, "#999");
  hubGrad.addColorStop(0.8, "#555");
  hubGrad.addColorStop(1, "#333");
  ctx.beginPath();
  ctx.arc(center, center, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hub inner shine
  ctx.beginPath();
  ctx.arc(center - hubRadius * 0.2, center - hubRadius * 0.25, hubRadius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

let isStopping = false;
let spinSpeed = 0;
let lastSegIndex = -1;

function startSpin() {
  if (isSpinning) return;
  isSpinning = true;
  isStopping = false;
  spinSpeed = 0.25;
  lastSegIndex = -1;
  document.getElementById("score-reveal").classList.add("hidden");
  document.getElementById("retry-section").classList.add("hidden");
  haptic(50);

  const btn = document.getElementById("btn-spin");
  btn.textContent = "STOP !";
  btn.classList.add("btn-stop-mode");
  btn.disabled = false;

  function animate() {
    currentRotation += spinSpeed;
    drawWheel(currentRotation);

    const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
    let angle = ((-Math.PI / 2 - currentRotation) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI);
    const segIndex = Math.floor(angle / segAngle);
    if (segIndex !== lastSegIndex) {
      lastSegIndex = segIndex;
      if (isStopping) {
        haptic(8 + Math.round((1 - spinSpeed / 0.25) * 30));
        playTickSound(spinSpeed);
      }
    }

    if (isStopping) {
      spinSpeed *= 0.97;
      if (spinSpeed < 0.001) {
        isSpinning = false;
        isStopping = false;
        const winIndex = Math.floor(angle / segAngle) % WHEEL_SEGMENTS.length;
        finalNumber = WHEEL_SEGMENTS[winIndex];
        btn.classList.remove("btn-stop-mode");
        revealScore();
        return;
      }
    }

    requestAnimationFrame(animate);
  }
  animate();
}

function stopSpin() {
  if (!isSpinning || isStopping) return;
  isStopping = true;
  haptic(30);
  const btn = document.getElementById("btn-spin");
  btn.disabled = true;
  btn.textContent = "...";
  btn.classList.remove("btn-stop-mode");
}

function revealScore() {
  document.getElementById("btn-spin").classList.add("hidden");
  const rollEl = document.getElementById("roll-number");
  const scoreReveal = document.getElementById("score-reveal");

  // Flash effect
  const flash = document.getElementById("roll-flash");
  flash.classList.remove("active");
  void flash.offsetWidth;
  flash.classList.add("active");

  haptic(100);
  playRevealSound();

  rollEl.textContent = finalNumber;
  rollEl.classList.add("reveal-flash");
  setTimeout(() => rollEl.classList.remove("reveal-flash"), 700);
  scoreReveal.classList.remove("hidden");

  setTimeout(() => {
    const msg = getFunMessage(finalNumber);
    const funEl = document.getElementById("fun-message");
    funEl.textContent = msg.text;
    funEl.style.color = msg.color;

    if (finalNumber <= 15) {
      launchConfetti();
      if (finalNumber <= 5) haptic(200);
    }

    attempts++;
    if (attempts < 2) {
      document.getElementById("retry-section").classList.remove("hidden");
    } else {
      document.getElementById("name-form").classList.remove("hidden");
      document.getElementById("name-input").focus();
    }
  }, 500);
}

// ── Particles background ──
function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  const PARTICLE_COUNT = 50;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 166, 35, " + p.alpha + ")";
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
}
initParticles();

// ── Confetti ──
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiRunning = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener("resize", resizeConfetti);

function launchConfetti() {
  confettiPieces = [];
  const isMobile = window.innerWidth <= 768;
  const colors = isMobile
    ? ["#1a2744", "#2a3a5c", "#1b3a2a", "#0d1f3c", "#2c4a3a", "#162038"]
    : ["#f5a623", "#e05252", "#5b7cf7", "#4caf7d", "#fff", "#cd7f32"];
  for (let i = 0; i < 120; i++) {
    confettiPieces.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2,
      r: Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 12,
      dy: Math.random() * -14 - 4,
      gravity: 0.25,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1
    });
  }
  if (!confettiRunning) {
    confettiRunning = true;
    drawConfetti();
  }
}

function drawConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let alive = false;
  confettiPieces.forEach(p => {
    if (p.alpha <= 0) return;
    alive = true;
    p.x += p.dx;
    p.dy += p.gravity;
    p.y += p.dy;
    p.dx *= 0.98;
    p.rotation += p.rotSpeed;
    p.alpha -= 0.008;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(0, p.alpha);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
    confettiCtx.restore();
  });
  if (alive) {
    requestAnimationFrame(drawConfetti);
  } else {
    confettiRunning = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ── Haptic feedback ──
function haptic(duration) {
  try {
    if (navigator.vibrate) navigator.vibrate(duration || 10);
  } catch (e) { /* silent fail */ }
}

// ── Fun messages based on score (1-200) ──
function getFunMessage(score) {
  if (score <= 5) return { text: "GOAT des GOAT ! Joue au loto 🏆", color: "#f5a623" };
  if (score <= 15) return { text: "INCROYABLE, reste là dessus tu feras pas mieux", color: "#f5a623" };
  if (score <= 40) return { text: "Tu fais parti des meilleurs, retiens ça", color: "#5b7cf7" };
  if (score <= 70) return { text: "C'est pas mal, mais y'a mieux quoi", color: "#4caf7d" };
  if (score <= 100) return { text: "Respect, mais pas plus", color: "#4caf7d" };
  if (score <= 130) return { text: "C'est bien d'avoir tenté...", color: "#7a8299" };
  if (score <= 155) return { text: "Tu perds ton temps et tu m'en fais perdre", color: "#7a8299" };
  if (score <= 175) return { text: "Azy toi... dommage", color: "#e05252" };
  if (score <= 195) return { text: "ptdrrr merci quand même...", color: "#e05252" };
  return { text: "Tu peux pas faire PIRE, c'est nul nul nul !", color: "#e05252" };
}

// ── State ──
let hasPlayed = false;
let attempts = 0;
let gameStartTime = null;
let gameValid = false;
let finalNumber = null;

// ── Screens ──
const screens = {
  welcome: document.getElementById("screen-welcome"),
  roll: document.getElementById("screen-roll"),
  leaderboard: document.getElementById("screen-leaderboard")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  if (name === "leaderboard") loadLeaderboard();
  if (name === "roll") {
    setTimeout(initWheel, 50);
  }
  if (name === "welcome") {
    loadScanCount();
    if (hasPlayed) {
      document.getElementById("already-played").classList.remove("hidden");
    }
  }
}

// ── Scan counter on welcome ──
function loadScanCount() {
  onValue(scoresRef, (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;
    const el = document.getElementById("scan-counter");
    if (count > 0) {
      el.innerHTML = "Déjà <span>" + count + "</span> personne" + (count > 1 ? "s" : "") + " ont scanné le tatouage";
    } else {
      el.textContent = "";
    }
  }, { onlyOnce: true });
}
loadScanCount();

function saveScore(name, score) {
  const cleanName = name.replace(/[<>"'&]/g, "").substring(0, 30).trim();
  if (!cleanName || cleanName.length < 1) return Promise.reject("Invalid name");
  if (!Number.isInteger(score) || score < 1 || score > 200) return Promise.reject("Invalid score");
  if (!gameValid || !gameStartTime) return Promise.reject("Game not played");
  const elapsed = Date.now() - gameStartTime;
  if (elapsed < 5000) return Promise.reject("Too fast");

  const timestamp = Date.now();
  const token = generateGameToken(score, timestamp);
  gameValid = false;
  return push(scoresRef, {
    name: cleanName,
    score: score,
    date: timestamp,
    duration: elapsed,
    token: token,
    v: 6
  });
}

// ── Rank reveal ──
function showRankReveal(score) {
  onValue(scoresRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    const entries = Object.values(data);
    entries.sort((a, b) => a.score - b.score);
    const rank = entries.findIndex(e => e.score >= score) + 1;
    const total = entries.length;
    const el = document.getElementById("rank-reveal");
    el.innerHTML = "Tu es <strong>" + rank + (rank === 1 ? "er" : "e") + "</strong> sur <strong>" + total + "</strong> joueur" + (total > 1 ? "s" : "") + " !";
    el.classList.remove("hidden");
  }, { onlyOnce: true });
}

// ── Leaderboard ──
function loadLeaderboard() {
  const listEl = document.getElementById("leaderboard-list");
  listEl.innerHTML = '<p class="loading-text">Chargement...</p>';
  onValue(scoresRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      listEl.innerHTML = '<p class="lb-empty">Aucun joueur pour le moment. Sois le premier !</p>';
      document.getElementById("total-players").textContent = "";
      return;
    }
    const entries = Object.values(data);
    entries.sort((a, b) => a.score - b.score);
    document.getElementById("total-players").textContent = entries.length + " joueur" + (entries.length > 1 ? "s" : "") + " au total";
    listEl.innerHTML = "";
    entries.forEach((entry, i) => {
      if (typeof entry.name !== "string" || typeof entry.score !== "number") return;
      if (entry.score < 1 || entry.score > 200) return;
      const rank = i + 1;
      const topClass = rank <= 3 ? " top-" + rank : "";
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
      const dateStr = new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
      const row = document.createElement("div");
      row.className = "lb-row" + topClass;
      const rankDiv = document.createElement("div");
      rankDiv.className = "lb-rank";
      rankDiv.textContent = medal || rank;
      const infoDiv = document.createElement("div");
      infoDiv.className = "lb-info";
      const nameDiv = document.createElement("div");
      nameDiv.className = "lb-name";
      nameDiv.textContent = entry.name.substring(0, 30);
      const dateDiv = document.createElement("div");
      dateDiv.className = "lb-date";
      dateDiv.textContent = dateStr;
      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(dateDiv);
      const scoreDiv = document.createElement("div");
      scoreDiv.className = "lb-score";
      scoreDiv.textContent = entry.score;
      row.appendChild(rankDiv);
      row.appendChild(infoDiv);
      row.appendChild(scoreDiv);
      listEl.appendChild(row);
    });
  }, { onlyOnce: true });
}

// ── Code modal ──
function openCodeModal() {
  document.getElementById("code-input").value = "";
  document.getElementById("code-error").classList.add("hidden");
  document.getElementById("code-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("code-input").focus(), 100);
}

function closeCodeModal() {
  document.getElementById("code-modal").classList.add("hidden");
}

function startGame() {
  hasPlayed = true;
  gameStartTime = Date.now();
  gameValid = true;
  haptic(15);
  document.getElementById("btn-play").disabled = true;
  document.getElementById("btn-play").textContent = "Déjà joué !";
  document.getElementById("score-reveal").classList.add("hidden");
  document.getElementById("name-form").classList.add("hidden");
  document.getElementById("save-msg").classList.add("hidden");
  document.getElementById("btn-to-leaderboard").classList.add("hidden");
  document.getElementById("rank-reveal").classList.add("hidden");
  document.getElementById("fun-message").textContent = "";
  document.getElementById("name-input").value = "";
  document.getElementById("btn-save").disabled = false;
  document.getElementById("btn-save").textContent = "Enregistrer mon score";
  document.getElementById("save-msg").style.color = "";
  const spinBtn = document.getElementById("btn-spin");
  spinBtn.disabled = false;
  spinBtn.textContent = "Tourner la roue";
  spinBtn.classList.remove("hidden");
  spinBtn.classList.remove("btn-stop-mode");
  finalNumber = null;
  isSpinning = false;
  isStopping = false;
  attempts = 0;
  showScreen("roll");
}

// ── Event listeners ──
document.getElementById("btn-play").addEventListener("click", () => {
  if (hasPlayed) return;
  openCodeModal();
});

document.getElementById("btn-code-ok").addEventListener("click", async () => {
  const code = document.getElementById("code-input").value.trim();
  const codeHash = await hashCode(code);
  if (codeHash === ACCESS_CODE_HASH) {
    closeCodeModal();
    startGame();
  } else {
    document.getElementById("code-error").classList.remove("hidden");
    document.getElementById("code-input").value = "";
    document.getElementById("code-input").focus();
    haptic(50);
  }
});

document.getElementById("btn-code-cancel").addEventListener("click", () => {
  closeCodeModal();
});

document.getElementById("code-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-code-ok").click();
});

document.getElementById("btn-spin").addEventListener("click", () => {
  getAudioCtx();
  if (!isSpinning) {
    startSpin();
  } else if (!isStopping) {
    stopSpin();
  }
});

document.getElementById("btn-save").addEventListener("click", () => {
  haptic(10);
  const nameInput = document.getElementById("name-input");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.style.borderColor = "#e05252";
    nameInput.setAttribute("placeholder", "Entre ton prénom !");
    haptic(50);
    setTimeout(() => { nameInput.style.borderColor = ""; nameInput.setAttribute("placeholder", "Ton prénom"); }, 2000);
    return;
  }
  if (!finalNumber) return;
  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  btn.textContent = "Enregistrement...";
  saveScore(name, finalNumber).then(() => {
    document.getElementById("name-form").classList.add("hidden");
    const msg = document.getElementById("save-msg");
    msg.textContent = "Bravo " + name + " ! Ton score de " + finalNumber + " est enregistré.";
    msg.style.color = "#4caf7d";
    msg.classList.remove("hidden");
    showRankReveal(finalNumber);
    document.getElementById("btn-to-leaderboard").classList.remove("hidden");
    haptic(20);
    setTimeout(() => { showScreen("leaderboard"); }, 2500);
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = "Enregistrer mon score";
    const msg = document.getElementById("save-msg");
    msg.textContent = "Erreur, réessaie !";
    msg.style.color = "#e05252";
    msg.classList.remove("hidden");
  });
});

// ── Retry (second chance) ──
document.getElementById("btn-retry").addEventListener("click", () => {
  haptic(15);
  document.getElementById("retry-section").classList.add("hidden");
  document.getElementById("score-reveal").classList.add("hidden");
  document.getElementById("fun-message").textContent = "";
  finalNumber = null;
  const btn = document.getElementById("btn-spin");
  btn.disabled = false;
  btn.textContent = "Tourner la roue";
  btn.classList.remove("hidden");
  btn.classList.remove("btn-stop-mode");
});

document.getElementById("btn-keep").addEventListener("click", () => {
  haptic(10);
  document.getElementById("retry-section").classList.add("hidden");
  document.getElementById("name-form").classList.remove("hidden");
  document.getElementById("name-input").focus();
});

document.getElementById("name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-save").click();
});
document.getElementById("btn-to-leaderboard").addEventListener("click", () => { haptic(10); showScreen("leaderboard"); });
document.getElementById("btn-back").addEventListener("click", () => { haptic(10); showScreen("welcome"); });

window.addEventListener("resize", () => {
  if (screens.roll.classList.contains("active") && !isSpinning) {
    initWheel();
  }
});
