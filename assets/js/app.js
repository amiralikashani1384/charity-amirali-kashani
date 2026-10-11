/* ══════════════════════════════════════════════════════════════
   app.js — ایونت خیریهٔ «حلقهٔ آبی»
   • شمارش معکوس زنده تا روز ایونت
   • ماشین‌حساب اثر کمک + نوار هدف پویش
   • ثبت‌نام ۴ گامی، کارت ورود با QR، دیوار مهربانی، یادآوری تقویم
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ─────────── ابزارها ─────────── */
  var J = window.Jalali;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORE = "blue-circle-event-v1";
  var THEME_KEY = "blue-circle-theme";

  var nf = (function () {
    try { return new Intl.NumberFormat("fa-IR"); } catch (e) { return null; }
  })();
  function fa(n) {
    n = Math.round(+n || 0);
    if (nf) return nf.format(n);
    return J.toPersianDigits(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
  }
  function faDigits(s) { return J.toPersianDigits(s); }
  /* ارقام فارسی/عربی → انگلیسی (برای ورودی‌ها) */
  function enDigits(s) {
    return String(s == null ? "" : s)
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
  }

  /* ─────────── داده‌های ایونت (نمونه؛ قابل تغییر) ─────────── */
  var EVENT = {
    title: "ایونت خیریهٔ حلقهٔ آبی",
    dateLabel: "جمعه ۲۲ آبان ۱۴۰۵",
    start: new Date(2026, 10, 13, 9, 0, 0),   /* ۱۳ نوامبر ۲۰۲۶، ساعت ۹ صبح */
    endHour: 19,
    venue: "خانهٔ مهربانی، تهران",
    target: 500000000,                        /* هدف پویش: ۵۰۰ میلیون تومان */
    baseRaised: 318400000,                    /* جمع‌آوری‌شدهٔ نمونه */
    baseDonors: 142
  };

  var TIER_AMOUNT = { "همراه": 0, "یاور": 350000, "حامی": 1000000, "حامی حلقه": 5000000 };

  /* پلهٔ اثر کمک (تومانی، نمونه) */
  var IMPACTS = [
    { key: "tests", unit: 5000, tone: "tone-sky2", icon: "i-drop", title: "نوار تست قند خون", many: "عدد نوار تست قند" },
    { key: "glucometer", unit: 850000, tone: "tone-sky", icon: "i-sensor", title: "دستگاه گلوکومتر شخصی", many: "دستگاه گلوکومتر" },
    { key: "cgm", unit: 2400000, tone: "tone-violet", icon: "i-ring", title: "یک ماه پایش مداوم (CGM)", many: "ماه پایش با سنسور" },
    { key: "season", unit: 6000000, tone: "tone-pink", icon: "i-heartpulse", title: "فصل کامل مراقبت بیمار", many: "فصل مراقبت کامل" },
    { key: "year", unit: 12000000, tone: "tone-amber", icon: "i-medal", title: "یک سال همراهی کامل", many: "سال همراهی بیمار" }
  ];

  var SEED_DONORS = [
    "مهسا ر.", "خانوادهٔ احمدی", "علی و سارا", "گروه هنری نُتِ آبی", "آوا، ۷ ساله",
    "دکتر نیکنام", "بچه‌های محلهٔ سرسبز", "یک حامی ناشناس", "کافهٔ سپید", "خانم پارسا",
    "تیم دوچرخه‌سواران تهران", "استودیو آبی", "کلاس سوم ابتدایی دبستان مهر", "پدرام و نیلوفر"
  ];
  var SEED_MESSAGES = [
    { name: "به یاد بابا", msg: "برای بابا که ۲۰ سال با دیابت جنگید 💙" },
    { name: "یک مادر", msg: "برای همهٔ مادرانی که هر شب قند خون بچه‌شان را چک می‌کنند." }
  ];

  var BOOTH_BY_PLAN = {
    "پویش آبی ۵ کیلومتری": "ایستگاه پویش آبی",
    "کارگاه زبانِ قند خون": "سالن کارگاه",
    "غرفهٔ تست رایگان قند": "غرفهٔ پایش",
    "غرفهٔ کودکان": "غرفهٔ کودکان",
    "پنل زندگی با دیابت": "سالن اصلی",
    "اجرای زنده و حراج خیریه": "صحنهٔ اختتامیه"
  };

  /* ─────────── وضعیت ─────────── */
  var defaults = {
    step: 1,
    name: "", phone: "", companions: 0, volunteer: false,
    tier: "همراه", custom: false, customAmount: 250000,
    plans: [], wallNote: "",
    submitted: false, passCode: "", entryNo: ""
  };
  var state = JSON.parse(JSON.stringify(defaults));
  var wall = [];           /* حامیان محلی (این مرورگر) */
  var calcAmount = 350000;

  function pledge() {
    if (state.custom) return Math.round(+state.customAmount || 0);
    return TIER_AMOUNT[state.tier] || 0;
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ state: state, wall: wall })); } catch (e) { }
  }
  var saveSoon = (function () {
    var t = null;
    return function () { clearTimeout(t); t = setTimeout(save, 350); };
  })();

  /* ─────────── المان‌ها ─────────── */
  var el = {};
  function grab() {
    ["nav", "themeBtn", "helpBtn", "helpClose", "helpModal", "navCta", "heroCta", "finalCta",
      "cdDays", "cdHours", "cdMins", "cdSecs", "countdown",
      "raisedText", "targetText", "goalFill", "goalMark", "donorsCount", "myPledgeNote",
      "calcChips", "amountRange", "amountText", "calcPledge", "impactList",
      "wizard", "stepsList", "stepsFill", "inviteForm",
      "guestName", "guestPhone", "phoneStatus", "guestNameHint", "guestPhoneHint", "companions",
      "volunteer", "tiers", "customAmountToggle", "customAmountBox", "customAmount", "pledgeNoteText",
      "plans", "wallNote", "wallCount",
      "pass", "passName", "passTier", "passCode", "passSub", "passGuests", "passTags", "passAmount",
      "stampDate", "qrBox", "stubNo", "stubBooth",
      "printBtn", "icsBtn", "shareBtn", "copyBtn", "resetBtn",
      "prevBtn", "nextBtn", "nextLabel", "navHint", "toasts", "confetti",
      "wallSection", "wallGrid", "wallCountAll", "livePreview", "liveName", "liveTier"
    ].forEach(function (id) { el[id] = document.getElementById(id); });
    el.panes = $$(".pane");
    el.stepTabs = $$(".step");
  }

  /* ─────────── تُست ─────────── */
  var ICON = { ok: "i-checkcircle", warn: "i-heartfill", info: "i-sparkle" };
  function toast(msg, tone) {
    tone = tone || "info";
    if (!el.toasts) return;
    var node = document.createElement("div");
    node.className = "toast toast-" + tone;
    node.innerHTML = '<svg><use href="#' + (ICON[tone] || ICON.info) + '"/></svg><span></span>';
    node.querySelector("span").textContent = msg;
    el.toasts.appendChild(node);
    setTimeout(function () {
      node.classList.add("out");
      setTimeout(function () { node.remove(); }, 320);
    }, 4200);
  }

  /* ─────────── پوسته ─────────── */
  var THEMES = ["twilight", "day"];
  function applyTheme() {
    var t;
    try { t = localStorage.getItem(THEME_KEY) || "twilight"; } catch (e) { t = "twilight"; }
    if (THEMES.indexOf(t) === -1) t = "twilight";
    document.documentElement.setAttribute("data-theme", t);
    if (el.themeBtn) el.themeBtn.setAttribute("aria-pressed", t === "day" ? "true" : "false");
  }
  function toggleTheme() {
    var t;
    try { t = localStorage.getItem(THEME_KEY) || "twilight"; } catch (e) { t = "twilight"; }
    var next = t === "twilight" ? "day" : "twilight";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
    applyTheme();
    toast(next === "day" ? "پوستهٔ روز روشن شد ☀️" : "پوستهٔ شب روشن شد 🌙", "info");
  }

  /* ─────────── شمارش معکوس ─────────── */
  function tick() {
    var diff = EVENT.start - new Date();
    var done = diff <= 0;
    if (done) diff = 0;
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
      m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (el.cdDays) el.cdDays.textContent = faDigits(d);
    if (el.cdHours) el.cdHours.textContent = faDigits(h);
    if (el.cdMins) el.cdMins.textContent = faDigits(m);
    if (el.cdSecs) el.cdSecs.textContent = faDigits(sec);
    if (done && el.countdown && !el.countdown.dataset.done) {
      el.countdown.dataset.done = "1";
      var lab = el.countdown.querySelector(".countdown-label");
      if (lab) lab.innerHTML = '<svg><use href="#i-sparkle"/></svg> ایونت برگزار شد — ممنون که آمدی 💙';
    }
  }

  /* ─────────── هدف پویش ─────────── */
  function renderGoal(animate) {
    var raised = EVENT.baseRaised + (state.submitted ? pledge() : 0);
    var pct = Math.min(100, raised / EVENT.target * 100);
    if (el.raisedText) el.raisedText.textContent = fa(raised);
    if (el.targetText) el.targetText.textContent = fa(EVENT.target);
    if (el.goalFill) el.goalFill.style.width = pct.toFixed(2) + "%";
    if (el.goalMark) {
      el.goalMark.textContent = faDigits(pct.toFixed(0)) + "٪";
      el.goalMark.style.insetInlineStart = Math.min(97, pct) + "%";
    }
    if (el.donorsCount) el.donorsCount.textContent = fa(EVENT.baseDonors + wall.length);
    if (el.myPledgeNote) el.myPledgeNote.hidden = !state.submitted;
  }

  /* ─────────── شمارندهٔ کارت‌های آماری ─────────── */
  function animateCounters() {
    $$(".stat-num").forEach(function (node) {
      var target = +node.getAttribute("data-count") || 0;
      var suffix = node.getAttribute("data-suffix") || "";
      if (REDUCED) { node.textContent = faDigits(target) + " " + suffix; return; }
      var t0 = performance.now(), dur = 1100;
      function stepFn(now) {
        var k = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - k, 3);
        node.textContent = faDigits(Math.round(target * eased)) + " " + suffix;
        if (k < 1) requestAnimationFrame(stepFn);
      }
      requestAnimationFrame(stepFn);
    });
  }

  /* ─────────── ماشین‌حساب کمک ─────────── */
  function impactFor(amount) {
    return IMPACTS.map(function (it) {
      var n = Math.floor(amount / it.unit);
      return { def: it, count: n };
    }).filter(function (x) { return x.count > 0; });
  }

  function renderImpact() {
    if (!el.impactList) return;
    var items = impactFor(calcAmount);
    if (!items.length) {
      el.impactList.innerHTML = '<li class="impact-empty">مبلغ را کمی بالاتر ببر تا ببینی به چه چیزی تبدیل می‌شود 💙</li>';
      return;
    }
    el.impactList.innerHTML = items.map(function (x, i) {
      var d = x.def;
      return '<li class="impact-item" style="animation-delay:' + (i * 60) + 'ms">' +
        '<span class="impact-ico ' + d.tone + '"><svg><use href="#' + d.icon + '"/></svg></span>' +
        '<span class="impact-body"><b>' + d.title + '</b><small>با ' + fa(calcAmount) + ' تومان</small></span>' +
        '<span class="impact-count">' + faDigits(x.count) + '×</span>' +
        '</li>';
    }).join("");
  }

  function setCalcAmount(v, fromChip) {
    calcAmount = Math.max(50000, Math.min(15000000, Math.round(v)));
    if (el.amountRange) el.amountRange.value = String(calcAmount);
    if (el.amountText) el.amountText.textContent = fa(calcAmount);
    $$(".chip-btn", el.calcChips).forEach(function (b) {
      b.classList.toggle("is-on", +b.getAttribute("data-amount") === calcAmount);
    });
    renderImpact();
    if (fromChip !== false) { /* برای خوانایی، بدون ذخیره */ }
  }

  function applyCalcPledge() {
    state.custom = true;
    state.customAmount = calcAmount;
    state.tier = "همراه";
    if (el.customAmountToggle) el.customAmountToggle.checked = true;
    if (el.customAmountBox) el.customAmountBox.hidden = false;
    if (el.customAmount) el.customAmount.value = String(calcAmount);
    $$('input[name="tier"]', el.tiers).forEach(function (r) { r.checked = r.value === "همراه"; });
    updatePledgeNote();
    renderGoal();
    toast("ممنون! " + fa(calcAmount) + " تومان به نیت مهربانی‌ات ثبت شد 💙", "ok");
    goTo(2, { force: true });
    el.wizard.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  }

  /* ─────────── گام‌ها ─────────── */
  function paintStep() {
    el.panes.forEach(function (p) {
      var on = +p.getAttribute("data-step") === state.step;
      p.classList.toggle("is-active", on);
      p.hidden = !on;
    });
    el.stepTabs.forEach(function (t) {
      var n = +t.getAttribute("data-goto");
      t.classList.toggle("is-active", n === state.step);
      t.classList.toggle("is-done", n < state.step);
      if (n === state.step) t.setAttribute("aria-current", "step");
      else t.removeAttribute("aria-current");
    });
    if (el.stepsFill) el.stepsFill.style.width = (state.step / 4 * 100) + "%";
    if (el.prevBtn) el.prevBtn.hidden = state.step === 1;
    if (el.nextLabel) {
      el.nextLabel.textContent = state.step === 4
        ? (state.submitted ? "ثبت شد ✓" : "ثبت و ساخت کارت")
        : "گام بعد";
    }
    if (el.nextBtn) el.nextBtn.disabled = state.step === 4 && state.submitted;
    if (el.navHint) {
      el.navHint.textContent = state.step === 4
        ? "کارت را چاپ کن، به تقویم اضافه کن یا برای دوستت بفرست"
        : "با Enter هم می‌توانی جلو بروی ↩︎";
    }
  }

  function valid(n) {
    var bad = null;
    if (n === 1) {
      if (state.name.trim().length < 3) {
        hint(el.guestNameHint, "نامت را کامل بنویس (حداقل ۳ حرف).", "bad");
        bad = el.guestName;
      }
      var p = enDigits(el.guestPhone.value).replace(/\D/g, "");
      if (!/^09\d{9}$/.test(p)) {
        hint(el.guestPhoneHint, "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود.", "bad");
        bad = bad || el.guestPhone;
      }
    }
    if (bad) shake(bad.closest(".input-wrap") || bad);
    return !bad;
  }
  function hint(node, text, tone) {
    if (!node) return;
    node.textContent = text;
    node.className = "hint" + (tone ? " is-" + tone : "");
  }
  function shake(node) {
    if (!node || REDUCED) return;
    node.animate && node.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" });
  }

  function goTo(n, opts) {
    opts = opts || {};
    n = Math.max(1, Math.min(4, n));
    if (n > state.step && !opts.force) {
      for (var s = state.step; s < n; s++) if (!valid(s)) return false;
    }
    state.step = n;
    paintStep();
    if (n === 4) buildPass();
    saveSoon();
    return true;
  }

  function nextFrom() {
    if (state.step === 4) { submitAll(); return; }
    if (!valid(state.step)) return;
    goTo(state.step + 1);
  }

  /* ─────────── سطح همراهی ─────────── */
  function updatePledgeNote() {
    var amt = pledge();
    if (!el.pledgeNoteText) return;
    if (!amt) {
      el.pledgeNoteText.textContent = "با انتخاب «همراه» هیچ تعهدی نداری؛ فقط حضورت برای ما ارزشمند است 💙";
      return;
    }
    var items = impactFor(amt).slice(0, 2).map(function (x) {
      return faDigits(x.count) + " " + x.def.many;
    });
    el.pledgeNoteText.textContent = "با " + fa(amt) + " تومان، " + items.join(" و ") + " اهدا می‌کنی 💙";
  }

  /* ─────────── کارت ورود ─────────── */
  function ensureCodes() {
    var t = J.toJalaali(new Date());
    if (!state.passCode) state.passCode = "#BA-" + faDigits(t.jy) + "-" + faDigits(100 + Math.floor(Math.random() * 8900));
    if (!state.entryNo) state.entryNo = faDigits(1000 + Math.floor(Math.random() * 8999));
  }
  function suggestBooth() {
    for (var i = 0; i < state.plans.length; i++) {
      var b = BOOTH_BY_PLAN[state.plans[i]];
      if (b) return b;
    }
    return "پذیرش و راهنما";
  }
  function buildPass() {
    ensureCodes();
    if (el.passName) el.passName.textContent = state.name.trim() || "مهمان مهربان";
    if (el.passTier) el.passTier.textContent = state.tier + (state.volunteer ? " · داوطلب" : "");
    if (el.passCode) el.passCode.textContent = state.passCode;
    if (el.passSub) {
      el.passSub.textContent = "دعوت‌شده به " + EVENT.title + " — " + EVENT.dateLabel;
    }
    if (el.passGuests) el.passGuests.textContent = faDigits(state.companions + 1) + " نفر";
    if (el.passAmount) el.passAmount.textContent = pledge() ? fa(pledge()) + " تومان" : "رایگان 💙";
    if (el.stampDate) {
      var t = J.toJalaali(new Date());
      el.stampDate.textContent = J.formatShort(t.jy, t.jm, t.jd);
    }
    if (el.stubNo) el.stubNo.textContent = state.entryNo;
    if (el.stubBooth) el.stubBooth.textContent = suggestBooth();

    var tags = [];
    if (state.volunteer) tags.push({ t: "داوطلب", cls: "pink" });
    state.plans.forEach(function (p) { tags.push({ t: p, cls: "" }); });
    if (!tags.length) tags.push({ t: "همراه آزاد", cls: "ghost" });
    if (el.passTags) {
      el.passTags.innerHTML = tags.map(function (x) {
        return '<span class="tag ' + x.cls + '"><svg><use href="#i-check"/></svg>' + x.t + "</span>";
      }).join("");
    }
    renderQR();
  }

  function shareLink() {
    var base = location.origin + location.pathname;
    var q = [];
    if (state.name.trim()) q.push("from=" + encodeURIComponent(state.name.trim()));
    if (state.tier && state.tier !== "همراه") q.push("tier=" + encodeURIComponent(state.tier));
    return base + (q.length ? "?" + q.join("&") : "");
  }
  function renderQR() {
    if (!el.qrBox) return;
    var lib = window.QRCode;
    el.qrBox.innerHTML = "";
    if (!lib) return;
    try {
      new lib(el.qrBox, {
        text: shareLink(), width: 124, height: 124,
        colorDark: "#0A2350", colorLight: "#ffffff",
        correctLevel: lib.CorrectLevel ? lib.CorrectLevel.M : 0
      });
    } catch (e) { /* اگر QR نساخته شد، کارت بی‌نقص بماند */ }
  }

  /* ─────────── دیوار مهربانی ─────────── */
  function renderWall() {
    if (!el.wallGrid) return;
    var local = wall.map(function (w, i) {
      return '<span class="wall-chip is-me" style="animation-delay:' + (i * 40) + 'ms">' +
        '<svg><use href="#i-heartfill"/></svg>' + escapeHTML(w.name) +
        (w.amount ? ' <small>' + fa(w.amount) + ' تومان</small>' : "") + "</span>";
    });
    var seeds = SEED_DONORS.map(function (n) {
      return '<span class="wall-chip"><svg><use href="#i-heartfill"/></svg>' + n + "</span>";
    });
    var msgs = SEED_MESSAGES.map(function (m) {
      return '<span class="wall-chip is-msg"><svg><use href="#i-heartfill"/></svg>' +
        escapeHTML(m.msg) + " <small>— " + escapeHTML(m.name) + "</small></span>";
    });
    var mine = wall.filter(function (w) { return w.msg; }).map(function (w) {
      return '<span class="wall-chip is-msg is-me"><svg><use href="#i-heartfill"/></svg>' +
        escapeHTML(w.msg) + " <small>— " + escapeHTML(w.name) + "</small></span>";
    });
    el.wallGrid.innerHTML = local.concat(mine).join("") + msgs.join("") + seeds.join("") +
      '<span class="wall-more">و <b>' + fa(EVENT.baseDonors) + "</b> حامی دیگر…</span>";
    if (el.wallCountAll) el.wallCountAll.textContent = fa(EVENT.baseDonors + wall.length);
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ─────────── ثبت نهایی ─────────── */
  function submitAll() {
    if (!valid(1)) { goTo(1); return; }
    state.submitted = true;
    if (!wall.some(function (w) { return w.name === state.name.trim(); })) {
      wall.unshift({
        name: state.name.trim(),
        amount: pledge(),
        tier: state.tier,
        msg: state.wallNote.trim()
      });
    }
    buildPass();
    renderWall();
    renderGoal(true);
    paintStep();
    save();
    if (window.Confetti && !REDUCED) {
      var r = el.pass ? el.pass.getBoundingClientRect() : null;
      window.Confetti.celebrate(r ? { x: r.left + r.width / 2, y: r.top + r.height / 3 } : null);
    }
    toast("ثبت شد " + state.name.trim().split(" ")[0] + " جان! نامت روی دیوار مهربانی نشست 💙", "ok");
  }

  /* ─────────── خروجی‌ها ─────────── */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function icsStamp(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" +
      pad2(d.getHours()) + pad2(d.getMinutes()) + "00";
  }
  function downloadICS() {
    var start = new Date(EVENT.start.getTime());
    var end = new Date(EVENT.start.getTime());
    end.setHours(EVENT.endHour, 0, 0, 0);
    var desc = "کارت ورود: " + (state.passCode || "-") + "\\nمهمان: " + (state.name || "-") +
      "\\nسطح همراهی: " + state.tier + "\\nبرنامه‌ها: " + (state.plans.join("، ") || "آزاد") +
      "\\nغرفهٔ پیشنهادی: " + suggestBooth();
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Blue Circle Charity//Pulse Monitoring//FA",
      "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:" + (state.passCode || "bluecircle") + "@bluecircle",
      "DTSTAMP:" + icsStamp(new Date()),
      "DTSTART:" + icsStamp(start), "DTEND:" + icsStamp(end),
      "SUMMARY:" + EVENT.title + " — پویش پایش قند",
      "LOCATION:" + EVENT.venue,
      "DESCRIPTION:" + desc,
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY",
      "DESCRIPTION:فردا ایونت خیریهٔ حلقهٔ آبی است 💙", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ];
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "blue-circle-event-2026-11-13.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("یادآوری در تقویم‌ات ثبت شد 📅", "ok");
  }

  function summaryText() {
    return [
      "🔵 کارت ورود ایونت خیریهٔ حلقهٔ آبی",
      "کد ورود: " + (state.passCode || "-"),
      "نام: " + (state.name || "-"),
      "تاریخ: " + EVENT.dateLabel + " — ۹:۰۰ تا ۱۹:۰۰",
      "محل: " + EVENT.venue,
      "نفرات: " + faDigits(state.companions + 1) + " نفر",
      "سطح همراهی: " + state.tier + (pledge() ? " (" + fa(pledge()) + " تومان)" : ""),
      "برنامه‌ها: " + (state.plans.join("، ") || "آزاد"),
      "غرفهٔ پیشنهادی: " + suggestBooth(),
      "لینک دعوت: " + shareLink()
    ].join("\n");
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg, "ok"); },
        function () { fallback(text, okMsg); });
    } else fallback(text, okMsg);
  }
  function fallback(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(okMsg, "ok"); }
    catch (e) { toast("کپی نشد؛ متن را دستی انتخاب کن.", "warn"); }
    ta.remove();
  }

  function share() {
    var link = shareLink();
    var text = "من دارم می‌روم ایونت خیریهٔ «حلقهٔ آبی» — پویش پایش قند خون. تو هم بیا که تنهام نذاری 💙\n" + link;
    if (navigator.share) {
      navigator.share({ title: "ایونت خیریهٔ حلقهٔ آبی", text: text, url: link })
        .then(function () { toast("دعوت‌نامه برای دوستت رفت 💌", "ok"); })
        .catch(function () { });
    } else copyText(text, "لینک دعوت کپی شد؛ برای دوستت بفرست 💌");
  }

  /* ─────────── همگام‌سازی فرم ─────────── */
  function syncForm() {
    if (el.guestName) el.guestName.value = state.name;
    if (el.guestPhone) el.guestPhone.value = state.phone;
    if (el.volunteer) el.volunteer.checked = !!state.volunteer;
    if (el.wallNote) el.wallNote.value = state.wallNote;
    if (el.wallCount) el.wallCount.textContent = faDigits(state.wallNote.length);
    if (el.customAmountToggle) el.customAmountToggle.checked = !!state.custom;
    if (el.customAmountBox) el.customAmountBox.hidden = !state.custom;
    if (el.customAmount) el.customAmount.value = String(state.customAmount);

    $$("#companions .chip-btn").forEach(function (b) {
      var on = +b.getAttribute("data-count") === state.companions;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    $$('input[name="tier"]', el.tiers).forEach(function (r) { r.checked = r.value === state.tier; });
    $$('input[name="plan"]', el.plans).forEach(function (c) {
      c.checked = state.plans.indexOf(c.value) !== -1;
    });
    updatePledgeNote();
    paintLivePill();
  }

  function paintLivePill() {
    if (!el.livePreview) return;
    var show = state.name.trim().length >= 3;
    el.livePreview.hidden = !show;
    if (show) {
      el.liveName.textContent = state.name.trim().split(" ")[0] + " عزیز";
      el.liveTier.textContent = state.tier + (pledge() ? " · " + fa(pledge()) + " تومان" : "");
    }
  }

  /* ─────────── رویدادها ─────────── */
  function bind() {
    /* پوسته و راهنما */
    el.themeBtn.addEventListener("click", toggleTheme);
    var openHelp = function () {
      if (!el.helpModal) return;
      if (typeof el.helpModal.showModal === "function") el.helpModal.showModal();
      else el.helpModal.setAttribute("open", "");
    };
    el.helpBtn.addEventListener("click", openHelp);
    el.helpClose.addEventListener("click", function () { el.helpModal.close(); });
    el.helpModal.addEventListener("click", function (e) { if (e.target === el.helpModal) el.helpModal.close(); });

    /* CTAها */
    [el.navCta, el.heroCta, el.finalCta].forEach(function (b) {
      if (b) b.addEventListener("click", function () {
        el.wizard.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
        toast("خوش آمدی! ۴ گام کوتاه تا کارت ورودت 💙", "info");
      });
    });

    /* ماشین‌حساب */
    el.amountRange.addEventListener("input", function () { setCalcAmount(+el.amountRange.value); });
    el.calcChips.addEventListener("click", function (e) {
      var b = e.target.closest(".chip-btn[data-amount]");
      if (!b) return;
      setCalcAmount(+b.getAttribute("data-amount"));
    });
    el.calcPledge.addEventListener("click", applyCalcPledge);

    /* گام ۱ */
    el.guestName.addEventListener("input", function () {
      state.name = el.guestName.value;
      hint(el.guestNameHint, state.name.trim().length >= 3 ? "خوشحالیم که می‌آیی ✨" : "روی کارت ورود چاپ می‌شود، پس بامزه‌اش نکن 😄",
        state.name.trim().length >= 3 ? "good" : "");
      paintLivePill(); saveSoon();
    });
    el.guestPhone.addEventListener("input", function () {
      var clean = enDigits(el.guestPhone.value).replace(/\D/g, "").slice(0, 11);
      el.guestPhone.value = clean;
      state.phone = clean;
      var wrap = el.guestPhone.closest(".input-wrap");
      var ok = /^09\d{9}$/.test(clean);
      if (clean.length >= 10) {
        el.phoneStatus.className = "input-status show " + (ok ? "good" : "bad");
        wrap.classList.toggle("is-good", ok);
        wrap.classList.toggle("is-bad", !ok);
        hint(el.guestPhoneHint, ok ? "شماره معتبر است ✅" : "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود.", ok ? "good" : "bad");
      } else {
        el.phoneStatus.className = "input-status";
        wrap.classList.remove("is-good", "is-bad");
        hint(el.guestPhoneHint, "فقط برای یادآوری روز ایونت و اطلاع از تغییرات احتمالی.", "");
      }
      saveSoon();
    });
    el.companions.addEventListener("click", function (e) {
      var b = e.target.closest(".chip-btn[data-count]");
      if (!b) return;
      state.companions = +b.getAttribute("data-count");
      $$("#companions .chip-btn").forEach(function (x) {
        var on = x === b;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-checked", on ? "true" : "false");
      });
      saveSoon();
    });
    el.volunteer.addEventListener("change", function () {
      state.volunteer = el.volunteer.checked;
      if (state.volunteer) toast("چه عالی! داوطلبان یک روز قبل جلسهٔ توجیهی دارند 🤝", "ok");
      saveSoon();
    });

    /* گام ۲ */
    el.tiers.addEventListener("change", function (e) {
      if (e.target.name !== "tier") return;
      state.tier = e.target.value;
      state.custom = false;
      if (el.customAmountToggle) el.customAmountToggle.checked = false;
      if (el.customAmountBox) el.customAmountBox.hidden = true;
      updatePledgeNote(); paintLivePill(); renderGoal(); saveSoon();
    });
    el.customAmountToggle.addEventListener("change", function () {
      state.custom = el.customAmountToggle.checked;
      el.customAmountBox.hidden = !state.custom;
      if (state.custom) {
        state.customAmount = Math.max(10000, +enDigits(el.customAmount.value) || 250000);
        toast("مبلغ دلخواه فعال شد؛ هر چه دلت خواست 💙", "info");
      }
      updatePledgeNote(); paintLivePill(); renderGoal(); saveSoon();
    });
    el.customAmount.addEventListener("input", function () {
      state.customAmount = Math.max(0, +enDigits(el.customAmount.value) || 0);
      updatePledgeNote(); paintLivePill(); renderGoal(); saveSoon();
    });
    $$(".calc-chips.small .chip-btn", el.customAmountBox).forEach(function (b) {
      b.addEventListener("click", function () {
        state.customAmount = +b.getAttribute("data-amount");
        el.customAmount.value = String(state.customAmount);
        updatePledgeNote(); paintLivePill(); renderGoal(); saveSoon();
      });
    });

    /* گام ۳ */
    el.plans.addEventListener("change", function (e) {
      if (e.target.name !== "plan") return;
      var v = e.target.value;
      if (e.target.checked) { if (state.plans.indexOf(v) === -1) state.plans.push(v); }
      else state.plans = state.plans.filter(function (p) { return p !== v; });
      saveSoon();
    });
    el.wallNote.addEventListener("input", function () {
      state.wallNote = el.wallNote.value;
      el.wallCount.textContent = faDigits(state.wallNote.length);
      saveSoon();
    });

    /* ناوبری */
    el.nextBtn.addEventListener("click", nextFrom);
    el.prevBtn.addEventListener("click", function () { goTo(state.step - 1); });
    el.stepsList.addEventListener("click", function (e) {
      var t = e.target.closest(".step[data-goto]");
      if (t) goTo(+t.getAttribute("data-goto"));
    });
    el.inviteForm.addEventListener("submit", function (e) { e.preventDefault(); nextFrom(); });

    /* خروجی‌ها */
    el.printBtn.addEventListener("click", function () {
      toast("پنجرهٔ چاپ باز می‌شود؛ فقط کارت ورود چاپ می‌شود 🖨️", "info");
      setTimeout(function () { window.print(); }, 320);
    });
    el.icsBtn.addEventListener("click", downloadICS);
    el.shareBtn.addEventListener("click", share);
    el.copyBtn.addEventListener("click", function () { copyText(summaryText(), "خلاصهٔ کارت کپی شد 📋"); });
    el.resetBtn.addEventListener("click", function () {
      if (!window.confirm("اطلاعات این کارت پاک شود و از نو بسازیم؟")) return;
      state = JSON.parse(JSON.stringify(defaults));
      wall = [];
      try { localStorage.removeItem(STORE); } catch (e) { }
      syncForm(); renderWall(); renderGoal(); goTo(1, { force: true });
      toast("کارت تازه‌ای شروع شد ✨", "ok");
    });

    /* کیبورد */
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.key === "Escape") { if (el.helpModal && el.helpModal.open) el.helpModal.close(); return; }
      if (typing) {
        if (e.key === "Enter" && tag !== "textarea") { e.preventDefault(); nextFrom(); }
        return;
      }
      if (e.key.toLowerCase() === "t") { toggleTheme(); return; }
      if (/^[1-4]$/.test(e.key)) goTo(+e.key);
    });

    window.addEventListener("scroll", function () {
      if (el.nav) el.nav.classList.toggle("is-stuck", window.scrollY > 8);
    }, { passive: true });
  }

  /* ─────────── پیوند دعوت ─────────── */
  function handleParams() {
    var qp = new URLSearchParams(location.search);
    var from = qp.get("from"), tier = qp.get("tier");
    if (!from) return;
    if (tier && TIER_AMOUNT[tier] !== undefined) {
      state.tier = tier;
      $$('input[name="tier"]', el.tiers).forEach(function (r) { r.checked = r.value === tier; });
      updatePledgeNote();
    }
    setTimeout(function () {
      toast("💌 " + from + " تو را به ایونت خیریهٔ حلقهٔ آبی دعوت کرده!", "ok");
      el.wizard.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }, 700);
  }

  /* ─────────── راه‌اندازی ─────────── */
  function init() {
    grab();
    applyTheme();
    bind();

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { }
    if (saved && saved.state) {
      state = Object.assign(JSON.parse(JSON.stringify(defaults)), saved.state);
      wall = Array.isArray(saved.wall) ? saved.wall : [];
    }
    ensureCodes();

    if (el.confetti && window.Confetti) window.Confetti.init(el.confetti);

    setCalcAmount(350000, false);
    syncForm();
    renderWall();
    renderGoal(false);
    paintStep();
    tick();
    setInterval(tick, 1000);
    animateCounters();
    handleParams();

    if (saved && saved.state && saved.state.submitted) {
      setTimeout(function () { toast("خوش برگشتی! کارت ورودت همان‌جا منتظرت است 💙", "info"); }, 900);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
