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
const scoresRef = ref(db, "qrcode-scores");

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
  const colors = ["#f5a623", "#e05252", "#5b7cf7", "#4caf7d", "#fff", "#cd7f32"];
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

// ── Sound effects ──
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTickSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 300 + Math.random() * 400;
    osc.type = "sine";
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) { /* silent fail */ }
}

function playDingSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Second harmonic for a nice "ding"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = "sine";
    gain2.gain.value = 0.06;
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) { /* silent fail */ }
}

// ── Haptic feedback ──
function haptic(duration) {
  try {
    if (navigator.vibrate) navigator.vibrate(duration || 10);
  } catch (e) { /* silent fail */ }
}

// ── Fun messages based on score ──
function getFunMessage(score) {
  if (score <= 10) return { text: "GOAT des GOAT ! Joue au loto 🏆", color: "#f5a623" };
  if (score <= 50) return { text: "INCROYABLE, reste là dessus tu feras pas mieux", color: "#f5a623" };
  if (score <= 200) return { text: "Tu fais parti des meilleurs, retiens ça", color: "#5b7cf7" };
  if (score <= 500) return { text: "C'est pas mal, mais y'a mieux quoi", color: "#4caf7d" };
  if (score <= 1000) return { text: "Respect, mais pas plus", color: "#4caf7d" };
  if (score <= 3000) return { text: "C'est bien d'avoir tenté...", color: "#7a8299" };
  if (score <= 5000) return { text: "Tu perds ton temps et tu m'en fais perdre", color: "#7a8299" };
  if (score <= 8000) return { text: "Azy toi... dommage", color: "#e05252" };
  if (score <= 9500) return { text: "ptdrrr merci quand même...", color: "#e05252" };
  return { text: "Tu peux pas faire PIRE, c'est nul nul nul !", color: "#e05252" };
}

// ── State ──
let hasPlayed = false;
let attempts = 0;

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

// ── Roll animation ──
let finalNumber = null;
let allScores = [];

function rollAnimation() {
  const rollEl = document.getElementById("roll-number");
  const card = rollEl.closest(".card");
  rollEl.classList.add("spinning-intense");
  document.getElementById("fun-message").textContent = "";
  finalNumber = Math.floor(Math.random() * 10000) + 1;
  const duration = 5500;
  const start = Date.now();
  let tickCount = 0;
  const baseFontSize = window.innerWidth <= 480 ? 56 : 72;

  // Vibrate pattern during roll
  haptic(50);

  function tick() {
    const elapsed = Date.now() - start;
    const progress = elapsed / duration; // 0 → 1

    if (elapsed < duration) {
      rollEl.textContent = Math.floor(Math.random() * 10000) + 1;

      // Progressive slowdown: starts fast (30ms), ends very slow (400ms)
      const delay = 30 + Math.pow(progress, 2.5) * 370;

      // Number grows during the roll
      const growFactor = 1 + progress * 0.35;
      rollEl.style.fontSize = Math.round(baseFontSize * growFactor) + "px";

      // Blur increases then clears in last 20%
      if (progress < 0.8) {
        rollEl.style.filter = "blur(" + Math.round(progress * 2) + "px)";
      } else {
        const clearProgress = (progress - 0.8) / 0.2;
        rollEl.style.filter = "blur(" + Math.round((1 - clearProgress) * 1.6) + "px)";
      }

      tickCount++;
      // Sound gets more frequent as we approach the end
      if (tickCount % Math.max(1, Math.floor(3 - progress * 2)) === 0) playTickSound();
      if (tickCount % Math.max(1, Math.floor(5 - progress * 4)) === 0) haptic(5 + Math.round(progress * 20));

      setTimeout(tick, delay);
    } else {
      // ── REVEAL ──
      rollEl.classList.remove("spinning-intense");
      rollEl.style.filter = "";
      rollEl.style.fontSize = "";

      // Flash effect
      const flash = document.getElementById("roll-flash");
      flash.classList.remove("active");
      void flash.offsetWidth; // force reflow
      flash.classList.add("active");

      // Screen shake
      card.classList.add("screen-shake");
      setTimeout(() => card.classList.remove("screen-shake"), 600);

      // Reveal animation on number
      rollEl.classList.add("reveal-flash");
      setTimeout(() => rollEl.classList.remove("reveal-flash"), 700);

      rollEl.textContent = finalNumber.toLocaleString("fr-FR");

      // Ding sound + strong haptic
      playDingSound();
      haptic(100);

      // Fun message with slight delay for dramatic effect
      setTimeout(() => {
        const msg = getFunMessage(finalNumber);
        const funEl = document.getElementById("fun-message");
        funEl.textContent = msg.text;
        funEl.style.color = msg.color;

        // Confetti for great scores
        if (finalNumber <= 200) {
          launchConfetti();
          if (finalNumber <= 50) haptic(200);
        }

        attempts++;
        if (attempts < 2) {
          // First attempt: show retry option
          document.getElementById("retry-section").classList.remove("hidden");
        } else {
          // Second attempt: must enter name
          document.getElementById("name-form").classList.remove("hidden");
          document.getElementById("name-input").focus();
        }
      }, 500);
    }
  }
  tick();
}

function saveScore(name, score) {
  return push(scoresRef, { name: name, score: score, date: Date.now() });
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
    listEl.innerHTML = entries.map((entry, i) => {
      const rank = i + 1;
      const topClass = rank <= 3 ? " top-" + rank : "";
      const medal = rank === 1 ? "\uD83E\uDD47" : rank === 2 ? "\uD83E\uDD48" : rank === 3 ? "\uD83E\uDD49" : "";
      const dateStr = new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
      const displayName = escapeHtml(entry.name);
      return '<div class="lb-row' + topClass + '"><div class="lb-rank">' + (medal || rank) + '</div><div class="lb-info"><div class="lb-name">' + displayName + '</div><div class="lb-date">' + dateStr + '</div></div><div class="lb-score">' + entry.score.toLocaleString("fr-FR") + '</div></div>';
    }).join("");
  }, { onlyOnce: true });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Event listeners ──
document.getElementById("btn-play").addEventListener("click", () => {
  if (hasPlayed) return;
  hasPlayed = true;
  haptic(15);
  document.getElementById("btn-play").disabled = true;
  document.getElementById("btn-play").textContent = "Déjà joué !";
  document.getElementById("roll-number").textContent = "\u2014";
  document.getElementById("name-form").classList.add("hidden");
  document.getElementById("save-msg").classList.add("hidden");
  document.getElementById("btn-to-leaderboard").classList.add("hidden");
  document.getElementById("rank-reveal").classList.add("hidden");
  document.getElementById("fun-message").textContent = "";
  document.getElementById("name-input").value = "";
  document.getElementById("btn-save").disabled = false;
  document.getElementById("btn-save").textContent = "Enregistrer mon score";
  document.getElementById("save-msg").style.color = "";
  finalNumber = null;
  showScreen("roll");
  setTimeout(rollAnimation, 300);
});

document.getElementById("btn-save").addEventListener("click", () => {
  haptic(10);
  const nameInput = document.getElementById("name-input");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.style.borderColor = "#e05252";
    nameInput.setAttribute("placeholder", "Entre ton pr\u00e9nom !");
    haptic(50);
    setTimeout(() => { nameInput.style.borderColor = ""; nameInput.setAttribute("placeholder", "Ton pr\u00e9nom"); }, 2000);
    return;
  }
  if (!finalNumber) return;
  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  btn.textContent = "Enregistrement...";
  saveScore(name, finalNumber).then(() => {
    document.getElementById("name-form").classList.add("hidden");
    const msg = document.getElementById("save-msg");
    msg.textContent = "Bravo " + name + " ! Ton score de " + finalNumber.toLocaleString("fr-FR") + " est enregistr\u00e9.";
    msg.style.color = "#4caf7d";
    msg.classList.remove("hidden");
    showRankReveal(finalNumber);
    document.getElementById("btn-to-leaderboard").classList.remove("hidden");
    haptic(20);
    // Auto-navigate to leaderboard after a short delay
    setTimeout(() => { showScreen("leaderboard"); }, 2500);
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = "Enregistrer mon score";
    const msg = document.getElementById("save-msg");
    msg.textContent = "Erreur, r\u00e9essaie !";
    msg.style.color = "#e05252";
    msg.classList.remove("hidden");
  });
});

// ── Retry (second chance) ──
document.getElementById("btn-retry").addEventListener("click", () => {
  haptic(15);
  document.getElementById("retry-section").classList.add("hidden");
  document.getElementById("roll-number").textContent = "\u2014";
  document.getElementById("fun-message").textContent = "";
  finalNumber = null;
  setTimeout(rollAnimation, 300);
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
