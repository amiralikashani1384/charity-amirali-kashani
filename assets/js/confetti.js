/* ══════════════════════════════════════════════════════════════
   confetti.js — کاغذرنگیِ «حلقهٔ آبی»
   شکل‌ها: حلقهٔ آبی، قلب و مربع کوچک — هم‌خوان با تم خیریه
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  var COLORS = ["#54A0FF", "#2E7BE0", "#7CC4FF", "#FF6FA5", "#FFC24D", "#9B8CFF", "#38D6EE", "#FFFFFF"];
  var SHAPES = ["ring", "heart", "square", "dot"];
  var canvas = null, ctx = null, dpr = 1, raf = null;
  var items = [];
  var reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    if (!canvas) return;
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(root.innerWidth * dpr);
    canvas.height = Math.floor(root.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(count, origin) {
    var ox = origin && origin.x != null ? origin.x : root.innerWidth / 2;
    var oy = origin && origin.y != null ? origin.y : root.innerHeight * 0.3;
    for (var i = 0; i < count; i++) {
      var angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      var power = rand(6, 15);
      items.push({
        x: ox + rand(-50, 50),
        y: oy + rand(-24, 24),
        vx: Math.cos(angle) * power * rand(.6, 1.2),
        vy: Math.sin(angle) * power * rand(.7, 1.3),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.2, 0.2),
        size: rand(8, 17),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: SHAPES[(Math.random() * SHAPES.length) | 0],
        life: 1,
        decay: rand(0.005, 0.011),
        wobble: rand(0, Math.PI * 2)
      });
    }
    if (!raf) raf = root.requestAnimationFrame(frame);
  }

  function heartPath(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.32);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.12, -s * 0.36, -s * 0.62, 0, -s * 0.28);
    ctx.bezierCurveTo(s * 0.36, -s * 0.62, s * 0.75, -s * 0.12, 0, s * 0.32);
    ctx.closePath();
  }

  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(p.life, 0);
    var s = p.size;

    if (p.shape === "ring") {
      /* حلقهٔ آبی — نماد جهانی دیابت */
      ctx.strokeStyle = p.color;
      ctx.lineWidth = s * 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === "heart") {
      ctx.fillStyle = p.color;
      heartPath(s);
      ctx.fill();
    } else if (p.shape === "square") {
      ctx.fillStyle = p.color;
      var w = s * 0.66, h = s * 0.66, r = s * 0.18;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function frame() {
    if (!ctx) { raf = null; return; }
    ctx.clearRect(0, 0, root.innerWidth, root.innerHeight);
    for (var i = items.length - 1; i >= 0; i--) {
      var p = items[i];
      p.wobble += 0.1;
      p.vy += 0.26;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > root.innerHeight + 60) items.splice(i, 1);
      else draw(p);
    }
    if (items.length) raf = root.requestAnimationFrame(frame);
    else { raf = null; ctx.clearRect(0, 0, root.innerWidth, root.innerHeight); }
  }

  function burst(count, origin) { if (!reduced && canvas) spawn(count || 120, origin); }
  function celebrate(origin) {
    if (reduced || !canvas) return;
    spawn(90, origin);
    root.setTimeout(function () { spawn(70, { x: root.innerWidth * 0.26, y: root.innerHeight * 0.32 }); }, 180);
    root.setTimeout(function () { spawn(70, { x: root.innerWidth * 0.74, y: root.innerHeight * 0.24 }); }, 330);
  }

  root.Confetti = {
    init: function (el) { canvas = el; ctx = canvas.getContext("2d"); resize(); root.addEventListener("resize", resize); },
    burst: burst,
    celebrate: celebrate
  };
})(window);
