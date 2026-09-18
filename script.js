(() => {
  "use strict";

  const MOTION_OK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TILT_OK = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const stage = document.getElementById("stage");
  const layerGlow = document.getElementById("layerGlow");
  const layerStars = document.getElementById("layerStars");
  const layerDeco = document.getElementById("layerDeco");

  const inviteCard = document.getElementById("inviteCard");
  const confirmCard = document.getElementById("confirmCard");
  const confirmHeading = document.getElementById("confirmHeading");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const noPlaceholder = document.getElementById("noPlaceholder");
  const mapLink = document.getElementById("mapLink");
  const liveRegion = document.getElementById("liveRegion");
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");

  /* ---------------- Address / map link ---------------- */

  mapLink.href = "https://maps.app.goo.gl/PbNHBsBvqFsUjZvU8";

  /* ---------------- Decorative background ---------------- */

  function createStars(count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 65 + "%";
      s.style.setProperty("--size", (1 + Math.random() * 2).toFixed(2) + "px");
      s.style.setProperty("--delay", (Math.random() * 6).toFixed(2) + "s");
      s.style.setProperty("--dur", (3 + Math.random() * 4).toFixed(2) + "s");
      frag.appendChild(s);
    }
    layerStars.appendChild(frag);
  }

  function createDeco() {
    const items = ["❤️", "🍣", "✨", "💕", "🥢", "🌙", "🍱"];
    const count = window.innerWidth < 600 ? 8 : 14;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "deco-item";
      el.textContent = items[Math.floor(Math.random() * items.length)];
      el.style.left = 5 + Math.random() * 88 + "%";
      el.style.top = 6 + Math.random() * 84 + "%";
      el.style.setProperty("--size", (18 + Math.random() * 22) + "px");
      el.style.setProperty("--dur", (6 + Math.random() * 6).toFixed(2) + "s");
      el.style.setProperty("--delay", (Math.random() * 5).toFixed(2) + "s");
      el.style.opacity = (0.22 + Math.random() * 0.32).toFixed(2);
      frag.appendChild(el);
    }
    layerDeco.appendChild(frag);
  }

  createStars(window.innerWidth < 600 ? 30 : 50);
  createDeco();

  /* ---------------- Parallax + tilt ---------------- */

  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  function onPointer(x, y) {
    targetX = (x / window.innerWidth - 0.5) * 2;
    targetY = (y / window.innerHeight - 0.5) * 2;
  }

  window.addEventListener("mousemove", (e) => onPointer(e.clientX, e.clientY));
  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (t) onPointer(t.clientX, t.clientY);
    },
    { passive: true }
  );

  function parallaxTick() {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;

    layerGlow.style.transform = `translate3d(${curX * 10}px, ${curY * 10}px, 0)`;
    layerStars.style.transform = `translate3d(${curX * 20}px, ${curY * 20}px, 0)`;
    layerDeco.style.transform = `translate3d(${curX * 34}px, ${curY * 34}px, 0)`;

    if (TILT_OK) {
      stage.style.setProperty("--ry", curX * 6 + "deg");
      stage.style.setProperty("--rx", -curY * 6 + "deg");
    }

    requestAnimationFrame(parallaxTick);
  }

  if (MOTION_OK) requestAnimationFrame(parallaxTick);

  /* ---------------- The impossible NO button ---------------- */

  const NO_MESSAGES = [
    "No", "Sicura?", "Davvero?", "Riprova 😏", "Non credo proprio",
    "Nope!", "Ci riprovi? 😄", "Impossibile da premere 😅",
    "Il NO non esiste qui 💍", "Solo il SÌ è un'opzione ❤️"
  ];

  let msgIndex = 0;
  let dodgeCount = 0;
  let lastDodgeTime = 0;
  let hasPlacedInitial = false;
  let answered = false;
  const DODGE_COOLDOWN = 240;
  const APPROACH_THRESHOLD = 85;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function safeInset(name) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  /* Visible area in client coordinates (what `position: fixed` uses). */
  function getViewport() {
    const vv = window.visualViewport;
    if (!vv) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    return { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height };
  }

  function getBounds(w, h) {
    const margin = 14;
    const vp = getViewport();
    const btnW = w || noBtn.offsetWidth;
    const btnH = h || noBtn.offsetHeight;
    const minX = vp.left + margin + safeInset("--sai-left");
    const minY = vp.top + margin + safeInset("--sai-top");
    return {
      minX,
      minY,
      maxX: Math.max(minX, vp.left + vp.width - btnW - margin - safeInset("--sai-right")),
      maxY: Math.max(minY, vp.top + vp.height - btnH - margin - 12 - safeInset("--sai-bottom"))
    };
  }

  function rectsOverlap(a, b, pad) {
    return !(
      a.right + pad < b.left ||
      a.left - pad > b.right ||
      a.bottom + pad < b.top ||
      a.top - pad > b.bottom
    );
  }

  function pickNewPosition(avoidPoint) {
    const bounds = getBounds();
    const yesRect = yesBtn.getBoundingClientRect();
    const w = noBtn.offsetWidth;
    const h = noBtn.offsetHeight;
    let best = null;
    let bestScore = -1;

    for (let i = 0; i < 10; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      const candidate = { left: x, top: y, right: x + w, bottom: y + h };
      if (rectsOverlap(candidate, yesRect, 16)) continue;

      let score = Math.random();
      if (avoidPoint) {
        const dx = x + w / 2 - avoidPoint.x;
        const dy = y + h / 2 - avoidPoint.y;
        score = Math.hypot(dx, dy);
      }
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }

    if (!best) {
      best = {
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
      };
    }
    return best;
  }

  function dodge(avoidPoint) {
    const now = performance.now();
    if (now - lastDodgeTime < DODGE_COOLDOWN) return;
    lastDodgeTime = now;

    /* The initial placement locks the placeholder's size: release it so the
       longer messages size the pill instead of overflowing it. */
    if (noBtn.style.width) {
      noBtn.style.width = "";
      noBtn.style.height = "";
    }

    msgIndex = (msgIndex + 1) % NO_MESSAGES.length;
    noBtn.textContent = NO_MESSAGES[msgIndex];

    const pos = pickNewPosition(avoidPoint);
    noBtn.style.left = pos.x + "px";
    noBtn.style.top = pos.y + "px";

    dodgeCount++;

    noBtn.classList.remove("is-wiggling");
    void noBtn.offsetWidth;
    noBtn.classList.add("is-wiggling");
  }

  function placeInitial() {
    const rect = noPlaceholder.getBoundingClientRect();
    const bounds = getBounds(rect.width, rect.height);
    noBtn.style.transition = "none";
    noBtn.style.width = rect.width + "px";
    noBtn.style.height = rect.height + "px";
    noBtn.style.left = clamp(rect.left, bounds.minX, bounds.maxX) + "px";
    noBtn.style.top = clamp(rect.top, bounds.minY, bounds.maxY) + "px";
    void noBtn.offsetWidth;
    noBtn.style.transition = "";
    noBtn.classList.add("is-ready");
    hasPlacedInitial = true;
  }

  if (MOTION_OK) {
    let placed = false;
    const finalizePlacement = () => {
      if (placed) return;
      placed = true;
      placeInitial();
    };
    inviteCard.addEventListener("animationend", finalizePlacement, { once: true });
    setTimeout(finalizePlacement, 1000);
  } else {
    placeInitial();
  }

  function isOverYes(x, y) {
    const yesRect = yesBtn.getBoundingClientRect();
    return x >= yesRect.left && x <= yesRect.right && y >= yesRect.top && y <= yesRect.bottom;
  }

  document.addEventListener("mousemove", (e) => {
    if (!hasPlacedInitial || answered) return;
    if (isOverYes(e.clientX, e.clientY)) return;
    const rect = noBtn.getBoundingClientRect();
    const inZone =
      e.clientX >= rect.left - APPROACH_THRESHOLD &&
      e.clientX <= rect.right + APPROACH_THRESHOLD &&
      e.clientY >= rect.top - APPROACH_THRESHOLD &&
      e.clientY <= rect.bottom + APPROACH_THRESHOLD;
    if (inZone) dodge({ x: e.clientX, y: e.clientY });
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!hasPlacedInitial || answered) return;
      const t = e.touches[0];
      if (!t) return;
      if (isOverYes(t.clientX, t.clientY)) return;
      const rect = noBtn.getBoundingClientRect();
      const pad = 60;
      const inZone =
        t.clientX >= rect.left - pad &&
        t.clientX <= rect.right + pad &&
        t.clientY >= rect.top - pad &&
        t.clientY <= rect.bottom + pad;
      if (inZone) dodge({ x: t.clientX, y: t.clientY });
    },
    { passive: true }
  );

  ["pointerdown", "touchstart"].forEach((evt) => {
    noBtn.addEventListener(
      evt,
      (e) => {
        if (answered) return;
        e.preventDefault();
        const point = e.touches
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };
        dodge(point);
      },
      { passive: false }
    );
  });

  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (answered) return;
    dodge();
  });

  function keepInView() {
    if (answered || !hasPlacedInitial) return;
    if (dodgeCount === 0) {
      placeInitial();
      return;
    }
    const bounds = getBounds();
    const curLeft = parseFloat(noBtn.style.left) || 0;
    const curTop = parseFloat(noBtn.style.top) || 0;
    noBtn.style.left = clamp(curLeft, bounds.minX, bounds.maxX) + "px";
    noBtn.style.top = clamp(curTop, bounds.minY, bounds.maxY) + "px";
  }

  window.addEventListener("resize", keepInView);
  window.addEventListener("orientationchange", keepInView);
  window.addEventListener("scroll", keepInView, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", keepInView);
    window.visualViewport.addEventListener("scroll", keepInView);
  }

  /* ---------------- Confetti / hearts burst ---------------- */

  const SHAPES = ["❤️", "🍣", "✨", "💕", "🎊"];
  const CONFETTI_COLORS = ["#ff5da2", "#f4c869", "#8a5cff", "#ff8fc2", "#ffffff"];
  let particles = [];
  let rafId = null;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function fireConfetti() {
    const originRect = yesBtn.getBoundingClientRect();
    const ox = originRect.left + originRect.width / 2;
    const oy = originRect.top + originRect.height / 2;
    const count = MOTION_OK ? 90 : 30;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed * 0.6,
        vy: Math.sin(angle) * speed - 4,
        gravity: 0.14 + Math.random() * 0.08,
        size: 6 + Math.random() * 10,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 70 + Math.random() * 40,
        kind: Math.random() < 0.5 ? "emoji" : "confetti",
        emoji: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
      });
    }

    if (!rafId) rafId = requestAnimationFrame(confettiTick);
  }

  function confettiTick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.life++;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.kind === "emoji") {
        ctx.font = p.size * 1.8 + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });

    particles = particles.filter((p) => p.life < p.maxLife && p.y < window.innerHeight + 50);

    if (particles.length > 0) {
      rafId = requestAnimationFrame(confettiTick);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ---------------- YES flow ---------------- */

  function swapToConfirm() {
    inviteCard.classList.add("is-leaving");
    setTimeout(() => {
      inviteCard.hidden = true;
      confirmCard.hidden = false;
      requestAnimationFrame(() => confirmCard.classList.add("is-active"));
      liveRegion.textContent = "Hai risposto sì! Ecco i dettagli della cena.";
      confirmHeading.focus({ preventScroll: true });
    }, 380);
  }

  yesBtn.addEventListener("click", () => {
    answered = true;
    noBtn.hidden = true;
    fireConfetti();
    swapToConfirm();
    try {
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
    } catch (_) {
      /* vibration not supported, ignore */
    }
  });
})();
