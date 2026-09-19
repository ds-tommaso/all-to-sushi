(() => {
  "use strict";

  const MOTION_OK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const layerGlow = document.getElementById("layerGlow");
  const layerStars = document.getElementById("layerStars");
  const layerDeco = document.getElementById("layerDeco");
  const layerHearts = document.getElementById("layerHearts");

  const inviteCard = document.getElementById("inviteCard");
  const confirmCard = document.getElementById("confirmCard");
  const confirmHeading = document.getElementById("confirmHeading");
  const confirmSubtitle = document.getElementById("confirmSubtitle");
  const inviteEyebrow = document.getElementById("inviteEyebrow");
  const inviteTitle = document.getElementById("inviteTitle");
  const inviteTime = document.getElementById("inviteTime");
  const inviteLine = document.getElementById("inviteLine");
  const inviteLineSoft = document.getElementById("inviteLineSoft");
  const inviteQuestion = document.getElementById("inviteQuestion");
  const inviteFlexible = document.getElementById("inviteFlexible");
  const emojiRow = document.getElementById("emojiRow");
  const heartEmoji = document.getElementById("heartEmoji");
  const waInviteWrap = document.getElementById("waInviteWrap");
  const actions = document.getElementById("actions");
  const yesBtn = document.getElementById("yesBtn");
  const waInvite = document.getElementById("waInvite");
  const noBtn = document.getElementById("noBtn");
  const noPlaceholder = document.getElementById("noPlaceholder");
  const thanksNote = document.getElementById("thanksNote");
  const countdown = document.getElementById("countdown");
  const infoPlace = document.getElementById("infoPlace");
  const infoTime = document.getElementById("infoTime");
  const infoFlexible = document.getElementById("infoFlexible");
  const mapLink = document.getElementById("mapLink");
  const siteLink = document.getElementById("siteLink");
  const signature = document.getElementById("signature");
  const liveRegion = document.getElementById("liveRegion");
  const closeConfirm = document.getElementById("closeConfirm");
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");

  /* setTimeout silently fires straight away past this delay, so any deadline
     further out than ~24 days is simply re-checked on the next visit. */
  const MAX_TIMEOUT = 2147483647;

  /* ---------------- Config: date/time, place, links ---------------- */

  const CONFIG = window.APP_CONFIG || {};
  const D = CONFIG.eventDate || { year: 2026, month: 9, day: 19, hour: 21, minute: 0 };

  const DINNER_AT = new Date(D.year, D.month - 1, D.day, D.hour, D.minute, 0);

  /* Under 12 ore all'evento: solo SÌ. Evento passato: l'invito diventa una
     proposta aperta (nessuna data fissa, si sceglie insieme). */
  const THANKS_AT = new Date(DINNER_AT.getTime() - 12 * 60 * 60 * 1000);
  const ALWAYS_OPEN_AT = DINNER_AT;

  const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const DAY_NAME = WEEKDAYS[DINNER_AT.getDay()];
  const DAY_NAME_CAP = DAY_NAME.charAt(0).toUpperCase() + DAY_NAME.slice(1);
  const TIME_STR = String(D.hour).padStart(2, "0") + ":" + String(D.minute).padStart(2, "0");

  /* Tra le 12 e le 15 è pranzo, altrimenti cena. */
  const IS_LUNCH = D.hour >= 12 && D.hour < 15;
  const MEAL_WORD = IS_LUNCH ? "pranzo" : "cena";
  const MEAL_ARTICLE = IS_LUNCH ? "un" : "una";
  const MEAL_PREP = IS_LUNCH ? "del" : "della";

  const FOOD_EMOJI = CONFIG.foodEmoji || "🍣";
  const FOOD_NAME = CONFIG.foodName || "sushi";
  const FOOD_ARTICLE = CONFIG.foodArticle || "il";

  if (CONFIG.eventPlace) {
    infoPlace.innerHTML = FOOD_EMOJI + " <strong>" + CONFIG.eventPlace + "</strong>";
    siteLink.textContent = "Sito di " + CONFIG.eventPlace + " ↗";
  }

  inviteTime.innerHTML = "Ore <strong>" + TIME_STR + "</strong>";
  confirmSubtitle.textContent = DAY_NAME_CAP + " ore " + TIME_STR + ". Preparati.";
  infoTime.textContent = DAY_NAME_CAP + " · ore " + TIME_STR;
  emojiRow.textContent = FOOD_EMOJI + " ❤️";
  inviteFlexible.textContent = FOOD_EMOJI + " Il posto lo scegliamo insieme.";
  infoFlexible.textContent = FOOD_EMOJI + " Il posto lo scegliamo insieme.";
  if (heartEmoji) heartEmoji.textContent = "❤️" + FOOD_EMOJI;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "Un invito speciale per " + MEAL_ARTICLE + " " + MEAL_WORD + " " + FOOD_NAME + " da " + (CONFIG.eventPlace || "AllTo") + "."
    );
  }
  inviteLine.textContent = (IS_LUNCH ? "Un " : "Una ") + MEAL_WORD + " " + FOOD_NAME + ", tu e io.";

  function pickRandom(list, fallback) {
    if (!list || !list.length) return fallback;
    return list[Math.floor(Math.random() * list.length)];
  }

  const HER_NAME = pickRandom(CONFIG.herNames, "Polpetta");
  const HIS_NAME = pickRandom(CONFIG.hisNames, "Tommasino");

  document.title = HER_NAME + ", " + DAY_NAME + " sera... " + FOOD_EMOJI + "❤️";
  signature.textContent = "— " + HIS_NAME;

  const favicon = document.getElementById("favicon");
  if (favicon) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>" + FOOD_EMOJI + "</text></svg>";
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  /* ---------------- Address / map link ---------------- */

  mapLink.href = CONFIG.eventPlaceMap || "#";
  if (CONFIG.eventUrl) siteLink.href = CONFIG.eventUrl;

  /* ---------------- Always open: once the dinner time itself has passed ---------------- */

  /* Once that moment is behind us the invitation stops being about one
     evening: there is always room for it. Nothing is fixed any more — not
     the hour, not the place — so there is nothing left to answer with a
     button: the SI and the NO go, and the WhatsApp number becomes the way to
     settle when and where. Local time of the device, as she reads it. */
  const ALWAYS_OPEN_TITLE = [HER_NAME + ", c’è ", "sempre spazio", " per " + FOOD_ARTICLE + " " + FOOD_NAME + "."];

  let alwaysOpen = false;
  let countdownTimer = null;

  function setInviteTitle(before, accent, after) {
    inviteTitle.textContent = before;
    const span = document.createElement("span");
    span.className = "accent";
    span.textContent = accent;
    inviteTitle.append(span, after);
  }

  setInviteTitle(HER_NAME + ", ", DAY_NAME + " sera", " hai un impegno.");

  function goAlwaysOpen() {
    if (alwaysOpen) return;
    alwaysOpen = true;

    inviteEyebrow.textContent = "✨ L’invito resta aperto ✨";
    setInviteTitle(ALWAYS_OPEN_TITLE[0], ALWAYS_OPEN_TITLE[1], ALWAYS_OPEN_TITLE[2]);
    inviteTime.hidden = true;
    inviteLineSoft.textContent = "Quando vuoi tu: il giorno lo scegliamo insieme.";
    inviteQuestion.textContent = "Quando ci andiamo?";

    /* No date to say yes to, so no SI and no NO. The NO is already gone on
       its own by now: THANKS_AT falls 12 hours earlier. */
    actions.hidden = true;
    noBtn.hidden = true;
    noBtn.classList.remove("is-ready");

    /* The WhatsApp link is the only way in now, so it stops being a footnote
       and becomes the button — with the place left open. */
    inviteFlexible.hidden = false;
    waInviteWrap.classList.add("is-cta");

    confirmSubtitle.textContent = "Nessuna scadenza: c’è sempre spazio per " + FOOD_ARTICLE + " " + FOOD_NAME + ".";

    /* No date to count down to any more. */
    countdown.hidden = true;
    countdown.textContent = "";
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    /* Only the WhatsApp number stays: the place is up for discussion. */
    infoPlace.hidden = true;
    infoTime.hidden = true;
    mapLink.hidden = true;
    siteLink.hidden = true;
    infoFlexible.hidden = false;
  }

  /* True when the page is already past the date; otherwise it flips on its
     own should the page be open when midnight comes. */
  function checkAlwaysOpen() {
    const remaining = ALWAYS_OPEN_AT.getTime() - Date.now();
    if (remaining <= 0) {
      goAlwaysOpen();
      return true;
    }
    if (remaining < MAX_TIMEOUT) setTimeout(goAlwaysOpen, remaining);
    return false;
  }

  checkAlwaysOpen();

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
    const items = ["❤️", FOOD_EMOJI, "✨", "💕", "🥢", "🌙", "🍱"];
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

  function createHearts() {
    const shapes = ["\u2764\ufe0f", "\ud83d\udc95", "\ud83d\udc97", "\ud83d\udc96"];
    const count = window.innerWidth < 600 ? 7 : 12;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "float-heart";
      el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      el.style.left = 3 + Math.random() * 92 + "%";
      el.style.setProperty("--size", (14 + Math.random() * 20).toFixed(0) + "px");
      el.style.setProperty("--dur", (14 + Math.random() * 12).toFixed(2) + "s");
      el.style.setProperty("--delay", (Math.random() * 16).toFixed(2) + "s");
      el.style.setProperty("--peak", (0.3 + Math.random() * 0.35).toFixed(2));
      frag.appendChild(el);
    }
    layerHearts.appendChild(frag);
  }

  createStars(window.innerWidth < 600 ? 30 : 50);
  createDeco();
  if (MOTION_OK) createHearts();

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
    layerHearts.style.transform = `translate3d(${curX * 26}px, ${curY * 26}px, 0)`;

    requestAnimationFrame(parallaxTick);
  }

  if (MOTION_OK) requestAnimationFrame(parallaxTick);

  /* ---------------- The impossible NO button ---------------- */

  const NO_MESSAGES = [
    "No", "Sicura?", "Davvero?", "Riprova 😏", "Non credo proprio",
    "Nope!", "Ci riprovi? 😄", "Impossibile da premere 😅",
    "Il NO non esiste qui 💍", "Solo il SÌ è un'opzione ❤️"
  ];

  /* From THANKS_AT onward (12 hours before dinner) the NO button retires:
     only the yes is left, plus a thank-you. */
  const THANKS_HEADING = "Grazie. \u2764\ufe0f" + FOOD_EMOJI;

  let msgIndex = 0;
  let dodgeCount = 0;
  let noRetired = false;
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

  /* Places the NO must never cover: they are the two things she may want
     to tap. */
  function keepClearOf() {
    return [yesBtn.getBoundingClientRect(), waInvite.getBoundingClientRect()];
  }

  function pickNewPosition(avoidPoint) {
    const bounds = getBounds();
    const blocked = keepClearOf();
    const w = noBtn.offsetWidth;
    const h = noBtn.offsetHeight;
    let best = null;
    let bestScore = -1;

    const isFree = (x, y) => {
      const candidate = { left: x, top: y, right: x + w, bottom: y + h };
      return !blocked.some((rect) => rectsOverlap(candidate, rect, 16));
    };

    for (let i = 0; i < 40; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      if (!isFree(x, y)) continue;

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
      /* Random sampling found nothing free (very tight viewport): the four
         corners are the spots farthest from anything centred, so try those
         before ever letting the button land on the SI or WhatsApp link. */
      const corners = [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.minX, y: bounds.maxY },
        { x: bounds.maxX, y: bounds.maxY }
      ];
      best = corners.find((c) => isFree(c.x, c.y)) || null;
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
    relocateNoButton(pos.x, pos.y);

    dodgeCount++;

    noBtn.classList.remove("is-wiggling");
    void noBtn.offsetWidth;
    noBtn.classList.add("is-wiggling");
  }

  let pointerEventsTimer = null;

  /* The button slides to its new spot over ~0.32s and can pass right over
     the SI or WhatsApp buttons on the way. Its destination is always clear
     of them (pickNewPosition), but a click landing mid-flight would still
     hit whatever it happens to be crossing — so it stops accepting clicks
     for the whole trip and only re-arms once it has actually arrived. */
  function relocateNoButton(x, y) {
    noBtn.style.left = x + "px";
    noBtn.style.top = y + "px";
    noBtn.style.pointerEvents = "none";
    clearTimeout(pointerEventsTimer);
    pointerEventsTimer = setTimeout(() => {
      if (!answered && !noRetired) noBtn.style.pointerEvents = "";
    }, 340);
  }

  function placeInitial() {
    const rect = noPlaceholder.getBoundingClientRect();
    /* Layout metrics, so a card still mid-entrance (scaled, translated)
       cannot hand us a shrunken slot; the visual centre still positions it. */
    const w = noPlaceholder.offsetWidth || rect.width;
    const h = noPlaceholder.offsetHeight || rect.height;
    const bounds = getBounds(w, h);
    noBtn.style.transition = "none";
    noBtn.style.width = w + "px";
    noBtn.style.height = h + "px";
    noBtn.style.left = clamp(rect.left + rect.width / 2 - w / 2, bounds.minX, bounds.maxX) + "px";
    noBtn.style.top = clamp(rect.top + rect.height / 2 - h / 2, bounds.minY, bounds.maxY) + "px";
    void noBtn.offsetWidth;
    noBtn.style.transition = "";
    noBtn.classList.add("is-ready");
    hasPlacedInitial = true;
  }

  function retireNo() {
    if (noRetired) return;
    noRetired = true;
    noBtn.hidden = true;
    noBtn.classList.remove("is-ready");
    noPlaceholder.hidden = true;
    thanksNote.hidden = false;
    confirmHeading.textContent = THANKS_HEADING;
  }

  /* True when the NO is already gone; otherwise it retires on its own if the
     page happens to be open when the deadline passes. */
  function checkDeadline() {
    const remaining = THANKS_AT.getTime() - Date.now();
    if (remaining <= 0) {
      retireNo();
      return true;
    }
    if (remaining < MAX_TIMEOUT) setTimeout(retireNo, remaining);
    return false;
  }

  /* The reveal is a nicety; the invitation showing up is not. Re-measuring
     once it is over keeps the NO exactly on its slot on slow devices. */
  setTimeout(() => {
    inviteCard.classList.add("reveal-done");
    keepInView();
  }, 2500);

  if (!checkDeadline()) {
    if (MOTION_OK) {
      let placed = false;
      /* Wait for the actions row itself: the NO should arrive once the yes
         has finished fading in, not in the middle of the reveal. */
      const finalizePlacement = (e) => {
        if (e && e.target !== actions) return;
        if (placed) return;
        placed = true;
        inviteCard.removeEventListener("animationend", finalizePlacement);
        placeInitial();
      };
      inviteCard.addEventListener("animationend", finalizePlacement);
      setTimeout(finalizePlacement, 1800);
    } else {
      placeInitial();
    }
  }

  function isOverSafeZone(x, y) {
    return keepClearOf().some(
      (r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    );
  }

  document.addEventListener("mousemove", (e) => {
    if (!hasPlacedInitial || answered || noRetired) return;
    if (isOverSafeZone(e.clientX, e.clientY)) return;
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
      if (!hasPlacedInitial || answered || noRetired) return;
      const t = e.touches[0];
      if (!t) return;
      if (isOverSafeZone(t.clientX, t.clientY)) return;
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
        if (answered || noRetired) return;
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
    if (answered || noRetired) return;
    dodge();
  });

  function keepInView() {
    if (answered || noRetired || !hasPlacedInitial) return;
    if (dodgeCount === 0) {
      placeInitial();
      return;
    }
    const bounds = getBounds();
    const curLeft = parseFloat(noBtn.style.left) || 0;
    const curTop = parseFloat(noBtn.style.top) || 0;
    let left = clamp(curLeft, bounds.minX, bounds.maxX);
    let top = clamp(curTop, bounds.minY, bounds.maxY);

    /* A resize/orientation change can leave the clamped spot sitting on top
       of the SI or WhatsApp button: jump away rather than stay stuck there. */
    const rect = { left, top, right: left + noBtn.offsetWidth, bottom: top + noBtn.offsetHeight };
    if (keepClearOf().some((r) => rectsOverlap(rect, r, 16))) {
      const pos = pickNewPosition();
      left = pos.x;
      top = pos.y;
    }
    relocateNoButton(left, top);
  }

  window.addEventListener("resize", keepInView);
  window.addEventListener("orientationchange", keepInView);
  window.addEventListener("scroll", keepInView, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", keepInView);
    window.visualViewport.addEventListener("scroll", keepInView);
  }

  /* ---------------- Countdown to the table ---------------- */

  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function updateCountdown() {
    const diff = DINNER_AT.getTime() - Date.now();
    if (diff <= 0) {
      countdown.textContent = "\u00c8 adesso. \u2764\ufe0f";
      return;
    }
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days) parts.push(plural(days, "giorno", "giorni"));
    if (hours) parts.push(plural(hours, "ora", "ore"));
    if (minutes || !parts.length) parts.push(plural(minutes, "minuto", "minuti"));

    const tail = parts.length > 1 ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1] : parts[0];
    countdown.textContent = "\u23f3 Manca poco: " + tail + ".";
  }

  if (!alwaysOpen) {
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 30000);
  }

  /* ---------------- Confetti / hearts burst ---------------- */

  const SHAPES = ["❤️", "💕", "❤️", FOOD_EMOJI, "✨", "💖", "🎊"];
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
      liveRegion.textContent = "Hai risposto sì! Ecco i dettagli " + MEAL_PREP + " " + MEAL_WORD + ".";
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

  if (closeConfirm) {
    closeConfirm.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
})();
