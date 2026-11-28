/* Test-rig simulators. Each project JSON has "sim":"<key>"; index.html lazy-loads this file and calls SIMS[key](el),
   which returns a stop() function. Add a new sim = add S.yourkey = el => {...} and "sim":"yourkey" in the project JSON. */
(() => {
const S = window.SIMS = {}, TAU = Math.PI * 2, D = Math.PI / 180, rnd = Math.random;
const C = {o:'#ff8a3d', w:'#ffc46b', p:'#9a5cff', m:'#ff4f9a', t:'#efe5d8', mu:'#a597b4', r:'#ff3b1f'};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Shared UI: canvas + sliders + readouts + note. o = {title,h,pre,sl:[[key,label,min,max,step,val,unit]],ro:[[key,label]],note,frame(R,dt)} */
function rig(el, o) {
  el.innerHTML = `<div class="rh"><span>◈ Test rig</span><b>${o.title}</b></div>${o.pre || ''}<canvas style="width:100%;height:${o.h}px;display:block"></canvas>
  <div class="rs">${o.sl.map(s => `<label><span>${s[1]}</span><output></output><input type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${s[5]}" data-k="${s[0]}"></label>`).join('')}</div>
  <div class="rr">${o.ro.map(r => `<div><span>${r[1]}</span><b data-r="${r[0]}">–</b></div>`).join('')}</div><p class="rn">${o.note}</p>`;
  const c = el.querySelector('canvas'), x = c.getContext('2d'), R = {c, x, el, v: {}, W: 0, H: o.h};
  const fit = () => { const d = devicePixelRatio || 1; R.W = c.clientWidth; c.width = R.W * d; c.height = o.h * d; x.setTransform(d, 0, 0, d, 0, 0); };
  fit();
  el.querySelectorAll('input[data-k]').forEach(i => {
    const u = o.sl.find(s => s[0] === i.dataset.k)[6] || '';
    i.oninput = () => { R.v[i.dataset.k] = +i.value; i.previousElementSibling.textContent = (+i.value) + u; };
    i.oninput();
  });
  R.set = (k, t) => { const e = el.querySelector(`[data-r="${k}"]`); if (e) e.textContent = t; };
  let raf, run = true, last = performance.now();
  const loop = t => { if (!run) return; const dt = Math.min(.05, (t - last) / 1000); last = t; if (c.clientWidth !== R.W) fit(); o.frame(R, dt); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  R.stop = () => { run = false; cancelAnimationFrame(raf); };
  return R;
}
const arrow = (x, X, Y, dx, dy, col) => { x.strokeStyle = x.fillStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx, Y + dy); x.stroke(); const a = Math.atan2(dy, dx); x.beginPath(); x.moveTo(X + dx, Y + dy); x.lineTo(X + dx - 8 * Math.cos(a - .4), Y + dy - 8 * Math.sin(a - .4)); x.lineTo(X + dx - 8 * Math.cos(a + .4), Y + dy - 8 * Math.sin(a + .4)); x.fill(); };

/* ---------- Self-balancing cube: inverted pendulum on an edge + reaction wheel ---------- */
S.cube = el => {
  const m = .6, l = .0707, I = .004, J = 7e-5, mgl = m * 9.81 * l, Wm = 1500;
  let th = 0, w = 0, W = 0, wa = 0, fell = 0, u = 0;
  const R = rig(el, {title: 'Reaction-wheel balance', h: 280,
    sl: [['kp', 'Controller gain', 1.5, 6, .1, 3, '×'], ['tl', 'Motor torque limit', .02, .1, .005, .045, ' N·m'], ['push', 'Push size', 1, 12, 1, 5, '°']],
    ro: [['th', 'Tilt'], ['rpm', 'Flywheel'], ['tq', 'Torque used'], ['st', 'Status']],
    note: 'Click left or right of the cube to tilt it that way. Simplified model: rigid cube pivoting on one edge, 100 g flywheel, PD + wheel-speed feedback, motor torque and speed limits. The ~5° recovery limit comes out of the torque limit, it is not hard-coded. Try lowering the limit or raising the push.',
    frame(R, dt) {
      const {x, W: cw, H, v} = R, Kp = v.kp * mgl, Kd = .08 * Math.sqrt(v.kp / 3), tl = v.tl;
      if (!fell) {
        for (let i = 0; i < 8; i++) {
          const h = dt / 8, c = Kp * th + Kd * w + 1e-4 * W, av = tl * Math.max(0, 1 - (Math.sign(c) === Math.sign(W) ? Math.abs(W) / Wm : 0));
          u = clamp(c, -av, av); w += (mgl * Math.sin(th) - u) / I * h; th += w * h; W += u / J * h;
          if (Math.abs(th) > .6) { fell = 1.3; break; }
        }
      } else { fell -= dt; u = 0; if (fell <= 0) { th = w = W = 0; fell = 0; } }
      wa += W * dt;
      x.clearRect(0, 0, cw, H);
      const px = cw / 2, py = H - 46, a = 100;
      x.strokeStyle = C.mu; x.lineWidth = 1; x.beginPath(); x.moveTo(20, py); x.lineTo(cw - 20, py); x.stroke();
      x.save(); x.translate(px, py); x.rotate(fell ? Math.sign(th) * 1.25 : th); x.translate(0, -a / Math.SQRT2); x.rotate(Math.PI / 4);
      x.fillStyle = 'rgba(154,92,255,.18)'; x.strokeStyle = C.p; x.lineWidth = 2; x.fillRect(-a / 2, -a / 2, a, a); x.strokeRect(-a / 2, -a / 2, a, a);
      x.rotate(-Math.PI / 4 + wa); x.strokeStyle = C.o; x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.stroke();
      x.fillStyle = C.w; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(Math.cos(i * TAU / 8) * 20, Math.sin(i * TAU / 8) * 20, 3, 0, TAU); x.fill(); }
      x.restore();
      x.fillStyle = C.w; x.beginPath(); x.arc(px, py, 4, 0, TAU); x.fill();
      if (!fell) { const ex = Math.abs(u) / tl; x.fillStyle = C.mu; x.font = '11px monospace'; x.fillText('motor torque', 24, 24); x.fillStyle = ex > .98 ? C.r : C.o; x.fillRect(24, 30, 120 * ex, 8); x.strokeStyle = C.mu; x.strokeRect(24, 30, 120, 8); }
      R.set('th', (th / D).toFixed(1) + '°'); R.set('rpm', Math.round(Math.abs(W) * 60 / TAU) + ' rpm'); R.set('tq', Math.round(Math.abs(u) / tl * 100) + '%'); R.set('st', fell ? 'FELL – resetting' : 'BALANCED');
    }});
  R.c.onpointerdown = e => { if (fell) return; const r = R.c.getBoundingClientRect(); th += ((e.clientX - r.left) < R.W / 2 ? -1 : 1) * R.v.push * D; };
  return R.stop;
};

/* ---------- Tesla coil: spark gap, capacitors, tuning -> visible spark ---------- */
S.tesla = el => {
  let bolts = [], tm = 0, flash = 0;
  const bolt = (x, y, a, a0, len, d, out) => {
    const p = [[x, y]];
    for (let L = 0; L < len; L += 6) {
      a += (a0 - a) * .12 + (rnd() - .5) * .9; x += Math.cos(a) * 6; y += Math.sin(a) * 6; p.push([x, y]);
      if (d < 2 && rnd() < .07) { const b = a + (rnd() - .5) * 1.8; bolt(x, y, b, b, (len - L) * (.35 + rnd() * .3), d + 1, out); }
    }
    out.push(p);
  };
  const R = rig(el, {title: 'Spark-gap Tesla coil', h: 300,
    sl: [['n', 'Capacitors in parallel', 1, 6, 1, 3, ''], ['gap', 'Spark-gap width', .3, 2.6, .1, 1.2, ' mm'], ['t', 'Primary turns tapped', 4, 14, 1, 8, '']],
    ro: [['f', 'Primary resonance'], ['tun', 'Tuning'], ['e', 'Energy per bang'], ['len', 'Spark length']],
    note: 'Assumes a ~4 kV (rms) transformer, 2 nF capacitors, air breakdown ≈ 3 kV/mm and a ~200 kHz secondary (placeholder, edit in sims.js). Spark length is scaled so the default settings give your measured ~4 cm. More capacitance = more energy per bang; a gap too wide never fires; a detuned primary wastes energy.',
    frame(R, dt) {
      const {x, W, H, v} = R, Cp = v.n * 2e-9, Vb = 3000 * v.gap, Vpk = 5657, Lp = 1.65e-6 * v.t * v.t;
      const fp = 1 / (TAU * Math.sqrt(Lp * Cp)), dtn = (fp - 2e5) / 2e5, eta = 1 / (1 + (dtn / .1) ** 2);
      const fire = Vb < Vpk, E = .5 * Cp * Vb * Vb, P = fire ? E * 100 * eta : 0, len = fire ? clamp(2.03 * Math.sqrt(P), 0, 11) : 0;
      R.set('f', (fp / 1e3).toFixed(0) + ' kHz'); R.set('tun', Math.round(eta * 100) + '% matched'); R.set('e', fire ? Math.round(E * 1e3) + ' mJ' : 'gap too wide'); R.set('len', len.toFixed(1) + ' cm');
      x.clearRect(0, 0, W, H);
      const bx = W * .3, by = H - 24, top = by - 92;
      for (let i = 0; i < v.t; i++) { x.strokeStyle = C.o; x.globalAlpha = .55; x.beginPath(); x.ellipse(bx, by, 20 + i * 4, 5 + i, 0, 0, TAU); x.stroke(); }
      x.globalAlpha = 1; x.fillStyle = 'rgba(255,138,61,.25)'; x.fillRect(bx - 9, top, 18, by - top);
      x.strokeStyle = C.o; for (let y = top; y < by; y += 3) { x.beginPath(); x.moveTo(bx - 9, y); x.lineTo(bx + 9, y); x.stroke(); }
      x.fillStyle = '#2a1840'; x.strokeStyle = C.w; x.beginPath(); x.ellipse(bx, top - 8, 26, 8, 0, 0, TAU); x.fill(); x.stroke();
      // capacitor bank + spark gap
      const cx0 = W * .56, gy = by - 6;
      for (let i = 0; i < v.n; i++) { x.fillStyle = 'rgba(154,92,255,.55)'; x.strokeStyle = C.p; x.fillRect(cx0 + i * 18, by - 44, 12, 34); x.strokeRect(cx0 + i * 18, by - 44, 12, 34); }
      const gx = cx0 + 6 * 18 + 24, gp = v.gap * 9;
      x.strokeStyle = C.t; x.lineWidth = 2; x.beginPath(); x.moveTo(bx + 30, gy); x.lineTo(cx0 - 6, gy); x.moveTo(cx0 - 6, gy); x.lineTo(cx0 - 6, by - 28); x.moveTo(gx - 20, gy); x.lineTo(gx - gp / 2, gy); x.moveTo(gx + gp / 2, gy); x.lineTo(gx + 40, gy); x.stroke(); x.lineWidth = 1;
      tm -= dt; if (tm <= 0) { tm = .045; flash = fire ? 1 : 0; bolts = []; if (fire) for (let i = 0, n = 1 + (P > 6) + (P > 14); i < n; i++) { const a = -Math.PI / 2 + (rnd() - .5) * .8; bolt(bx, top - 14, a, a, len * 17.5 * (1 - .2 * i * rnd()), 0, bolts); } }
      x.lineCap = 'round';
      [[6 + P * .15, .12, C.p], [3, .4, C.m], [1.2, .95, '#fff']].forEach(([lw, al, col]) => { x.lineWidth = lw; x.strokeStyle = col; x.globalAlpha = al; bolts.forEach(p => { x.beginPath(); p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); }); });
      x.globalAlpha = 1; x.lineWidth = 1;
      if (fire && flash) { x.strokeStyle = C.w; x.lineWidth = 2; x.beginPath(); x.moveTo(gx - gp / 2, gy); for (let i = 1; i < 5; i++) x.lineTo(gx - gp / 2 + gp * i / 5, gy + (rnd() - .5) * 8); x.lineTo(gx + gp / 2, gy); x.stroke(); x.lineWidth = 1; }
      // scope: capacitor voltage vs breakdown
      const sx = W - 212, sy = 26, sw = 198, sh = 56, u = Vb / Vpk;
      x.strokeStyle = C.mu; x.strokeRect(sx, sy, sw, sh); x.fillStyle = C.mu; x.font = '10px monospace'; x.fillText('capacitor volts vs gap breakdown', sx, sy - 8);
      x.strokeStyle = C.p; x.beginPath(); for (let i = 0; i <= sw; i++) { const s = Math.abs(Math.sin(i / sw * Math.PI * 3)); i ? x.lineTo(sx + i, sy + sh - s * sh) : x.moveTo(sx, sy + sh - s * sh); } x.stroke();
      for (let i = 0; i <= sw; i++) { const s = Math.abs(Math.sin(i / sw * Math.PI * 3)); if (s > u) { x.strokeStyle = C.o; x.beginPath(); x.moveTo(sx + i, sy + sh - u * sh); x.lineTo(sx + i, sy + sh - s * sh); x.stroke(); } }
      x.strokeStyle = fire ? C.w : C.r; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(sx, sy + sh - Math.min(u, 1) * sh); x.lineTo(sx + sw, sy + sh - Math.min(u, 1) * sh); x.stroke(); x.setLineDash([]);
      if (!fire) { x.fillStyle = C.r; x.font = '12px monospace'; x.fillText('NO SPARK – gap wider than the transformer can jump', bx - 70, 130); }
    }});
  return R.stop;
};

/* ---------- EOS drone: Joukowski airfoil potential flow (stand-in for SD7037) ---------- */
S.drone = el => {
  const cm = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cd = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const sq = a => { const r = Math.sqrt(Math.hypot(a[0], a[1])), t = Math.atan2(a[1], a[0]) / 2; return [r * Math.cos(t), r * Math.sin(t)]; };
  const K = {}, ps = [];
  const seed = (p, any) => { p.x = any ? -6.4 + rnd() * 13 : -6.4; p.y = (rnd() - .5) * 5; p.h = []; p.s = 1; return p; };
  for (let i = 0; i < 260; i++) ps.push(seed({}, 1));
  const wz = z => { // complex velocity in the airfoil plane: returns [u-iv parts, |dζ/dz|]
    const q = [z[0] - K.xc, z[1] - K.yc], q2 = cm(q, q), t = cd([Math.cos(K.al), Math.sin(K.al)], q2);
    const w = [Math.cos(K.al) - K.a * K.a * t[0], -Math.sin(K.al) - K.a * K.a * t[1]], g = cd([0, K.G / TAU], q);
    w[0] += g[0]; w[1] += g[1];
    const zi = cd([1, 0], cm(z, z)), zp = [1 - zi[0], -zi[1]], r = cd(w, zp); return [r[0], -r[1], Math.hypot(zp[0], zp[1])];
  };
  const vel = (X, Y) => {
    const s = sq([X * X - Y * Y - 4, 2 * X * Y]), z1 = [(X + s[0]) / 2, (Y + s[1]) / 2], z2 = [(X - s[0]) / 2, (Y - s[1]) / 2];
    const d1 = Math.hypot(z1[0] - K.xc, z1[1] - K.yc), d2 = Math.hypot(z2[0] - K.xc, z2[1] - K.yc);
    return Math.max(d1, d2) < K.a * 1.001 ? null : wz(d1 > d2 ? z1 : z2);
  };
  const R = rig(el, {title: 'Airfoil flow (centre wing)', h: 280,
    sl: [['a', 'Angle of attack', -4, 18, .5, 5, '°'], ['cm', 'Camber', 0, 9, .5, 4, ' %'], ['th', 'Thickness', 6, 16, .5, 9, ' %']],
    ro: [['cl', 'Lift coefficient'], ['sm', 'Stall margin'], ['cp', 'Peak suction (Cp)'], ['st', 'Flow']],
    note: 'Potential-flow Joukowski airfoil, a stand-in for the SD7037-092-88 (not its exact coordinates). Colour = speed (purple slow, orange fast). Lift comes from the Kutta condition; above ~14° real flow separates, so the sim shows a stall warning and a reduced Cl. A panel method on the real coordinates would be the next upgrade.',
    frame(R, dt) {
      const {x, W, H, v} = R, al = v.a * D; K.xc = -v.th / 120; K.yc = v.cm / 46; K.a = Math.hypot(1 - K.xc, K.yc); K.al = al;
      const be = Math.asin(K.yc / K.a), cl0 = TAU * K.a * Math.sin(al + be); K.G = 2 * TAU * K.a * Math.sin(al + be);
      const stall = v.a >= 14, cl = stall ? cl0 * .6 : cl0;
      let cp = 1; for (let i = 0; i < 180; i++) { const p = i / 180 * TAU, r = wz([K.xc + K.a * Math.cos(p), K.yc + K.a * Math.sin(p)]); if (r[2] > .08) cp = Math.min(cp, 1 - (r[0] * r[0] + r[1] * r[1])); }
      R.set('cl', cl.toFixed(2)); R.set('sm', stall ? 'stalled' : (14 - v.a).toFixed(1) + '° left'); R.set('cp', cp.toFixed(1)); R.set('st', stall ? 'SEPARATED' : 'attached');
      const s = Math.min(W / 13.5, 50), cx = W / 2, cy = H / 2, X = a => cx + a * s, Y = a => cy - a * s;
      x.clearRect(0, 0, W, H);
      ps.forEach(p => {
        const r = vel(p.x, p.y);
        if (!r || p.x > 6.6 || Math.abs(p.y) > 2.7) { seed(p); return; }
        let u = r[0], vv = r[1], sp = Math.hypot(u, vv); if (sp > 3) { u *= 3 / sp; vv *= 3 / sp; sp = 3; }
        if (stall && p.y > 0 && p.x > -1.5) { u *= .55; vv += (rnd() - .5) * 2.6; }
        p.x += u * dt * 1.3; p.y += vv * dt * 1.3; p.s = sp; p.h.push([p.x, p.y]); if (p.h.length > 9) p.h.shift();
        const t = clamp((sp - .6) / 1, 0, 1); x.strokeStyle = `rgb(${154 + 101 * t | 0},${92 + 46 * t | 0},${255 - 194 * t | 0})`; x.globalAlpha = .8; x.lineWidth = 1.4;
        x.beginPath(); p.h.forEach((q, i) => i ? x.lineTo(X(q[0]), Y(q[1])) : x.moveTo(X(q[0]), Y(q[1]))); x.stroke();
      });
      x.globalAlpha = 1; x.beginPath();
      for (let i = 0; i <= 120; i++) { const p = i / 120 * TAU, zx = K.xc + K.a * Math.cos(p), zy = K.yc + K.a * Math.sin(p), d = zx * zx + zy * zy, px = zx + zx / d, py = zy - zy / d; i ? x.lineTo(X(px), Y(py)) : x.moveTo(X(px), Y(py)); }
      x.fillStyle = '#1b1228'; x.fill(); x.strokeStyle = C.t; x.lineWidth = 2; x.stroke();
      arrow(x, cx - 20, cy, 0, -clamp(cl, -1.5, 2.5) * 34, C.w); x.fillStyle = C.w; x.font = '11px monospace'; x.fillText('lift', cx - 14, cy - clamp(cl, -1.5, 2.5) * 34 - 6);
      x.fillStyle = C.mu; x.fillText('airflow →  (freestream at ' + v.a + '° to chord)', 14, 20);
      if (stall) { x.fillStyle = C.r; x.font = 'bold 14px monospace'; x.fillText('STALL – flow separating', W - 210, 24); }
    }});
  return R.stop;
};

/* ---------- Go-kart: Ackermann steering geometry ---------- */
S.kart = el => {
  const R = rig(el, {title: 'Steering geometry (top view)', h: 300,
    sl: [['d', 'Inner wheel angle', 0, 35, 1, 20, '°'], ['A', 'Ackermann', 0, 150, 5, 100, ' %'], ['wb', 'Wheelbase', 900, 1300, 10, 1050, ' mm'], ['tw', 'Front track', 800, 1200, 10, 1040, ' mm']],
    ro: [['do', 'Outer wheel'], ['r', 'Turn radius'], ['sc', 'Tyre scrub'], ['g', 'Geometry']],
    note: '0 % = parallel steering, 100 % = true Ackermann (all wheel axes meet on the rear-axle line), >100 % = over-Ackermann. Tyre scrub is how far the outer wheel is from the ideal angle. Wheelbase 1050 mm is a placeholder; the track default is your rear-axle length (1040 mm). Swap in the real values.',
    frame(R) {
      const {x, W, H, v} = R, L = v.wb, T = v.tw, di = v.d * D, A = v.A / 100;
      const doI = di < .005 ? 0 : Math.atan(1 / (1 / Math.tan(di) + T / L)), dout = (1 - A) * di + A * doI, scrub = Math.abs(dout - doI) / D;
      const eq = di < .005 ? 0 : Math.atan(2 / (1 / Math.tan(di) + 1 / Math.tan(doI))), rad = eq ? L / Math.tan(eq) / 1000 : Infinity;
      R.set('do', (dout / D).toFixed(1) + '° (ideal ' + (doI / D).toFixed(1) + '°)'); R.set('r', isFinite(rad) ? rad.toFixed(1) + ' m' : 'straight'); R.set('sc', scrub.toFixed(1) + '°');
      R.set('g', scrub < .3 ? 'true Ackermann' : A < 1 ? 'toward parallel' : 'over-Ackermann');
      x.clearRect(0, 0, W, H);
      const s = .13, cx = W * .72, yr = H * .76, yf = yr - L * s, xl = cx - T * s / 2, xr = cx + T * s / 2;
      x.strokeStyle = C.mu; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(0, yr); x.lineTo(W, yr); x.stroke(); x.setLineDash([]);
      x.strokeStyle = C.p; x.lineWidth = 2; x.fillStyle = 'rgba(154,92,255,.12)'; x.fillRect(xl, yf, xr - xl, yr - yf); x.strokeRect(xl, yf, xr - xl, yr - yf); x.lineWidth = 1;
      const wheel = (X, Y, a, col) => { x.save(); x.translate(X, Y); x.rotate(-a); x.fillStyle = col; x.fillRect(-5, -13, 10, 26); x.restore(); };
      wheel(xl, yr, 0, C.mu); wheel(xr, yr, 0, C.mu);
      [[xl, di, C.o], [xr, dout, C.w]].forEach(([X, a, col]) => {
        wheel(X, yf, a, col); x.strokeStyle = col; x.globalAlpha = .6; x.beginPath(); x.moveTo(X, yf); x.lineTo(X - Math.cos(a) * 1400, yf + Math.sin(a) * 1400); x.stroke(); x.globalAlpha = 1;
        if (a > .005) { const px = X - (yr - yf) / Math.sin(a) * Math.cos(a); if (px > 6 && px < W - 6) { x.fillStyle = col; x.beginPath(); x.arc(px, yr, 5, 0, TAU); x.fill(); } }
      });
      x.fillStyle = C.mu; x.font = '11px monospace'; x.fillText('rear axle', 10, yr - 6); x.fillText('dots = where each front wheel axis meets the rear axle (should coincide)', 10, 20);
    }});
  return R.stop;
};

/* ---------- Repair-first screwdriver: bit recognition + torque clutch ---------- */
S.driver = el => {
  const TAGS = [['Phone back cover', 'PH00', .25], ['Laptop base', 'PH1', .5], ['Desk lamp base', 'T10', 1.2], ['Wall bracket', 'T25', 3.5], ['Bike stem', 'HEX4', 5]];
  const BITS = [['PH00', 1], ['PH1', 2.2], ['T10', 4.7], ['T25', 10], ['HEX4', 22]];
  let ang = 0, st = 0, hold = 0, fl = 0, tag = TAGS[0], bit = BITS[0];
  const R = rig(el, {title: 'Bit recognition + torque clutch', h: 240,
    pre: `<div class="rb"><label>Repair tag <select class="sg">${TAGS.map((t, i) => `<option value="${i}">${t[0]} (${t[1]})</option>`).join('')}</select></label><label>Bit in tool <select class="sb">${BITS.map((b, i) => `<option value="${i}">${b[0]}</option>`).join('')}</select></label></div>`,
    sl: [['tq', 'Torque setting (drag = hand dial)', .1, 6, .05, .25, ' N·m']],
    ro: [['bit', 'IR probe reads'], ['now', 'Torque now'], ['lim', 'Thread strips at'], ['s', 'Status']],
    note: 'Scanning a repair tag sets the torque; the bit is recognised from its resistor value (10 kΩ divider, 12-bit ADC). Press and hold on the screw to tighten: the clutch clicks at the set torque. Override the dial above the strip limit and you will strip it. Tag values, resistors and strip limits are illustrative, not the real design numbers.',
    frame(R, dt) {
      const {x, W, H, v} = R, ok = bit[0] === tag[1], Ts = tag[2] * 1.6, seat = 6, set = v.tq;
      if (st === 0 && hold && ok) { ang += 3 * dt; const t = clamp((ang - seat) / 1.5, 0, 9) * Ts; if (t >= Ts && set >= Ts) st = 2; else if (t >= set) st = 1; if (st) fl = 1; }
      if (st === 1) ang = seat + set / Ts * 1.5;
      const T = st === 1 ? set : st === 2 ? 0 : clamp((ang - seat) / 1.5, 0, 1.2) * Ts; fl = Math.max(0, fl - dt * 2.5);
      R.set('bit', `${bit[0]} · ${bit[1]}k · ADC ${Math.round(4095 * bit[1] / (bit[1] + 10))}`); R.set('now', T.toFixed(2) + ' N·m'); R.set('lim', Ts.toFixed(2) + ' N·m');
      R.set('s', !ok ? 'LOCKED – wrong bit' : st === 1 ? 'CLICK ✓ exact torque' : st === 2 ? 'STRIPPED ✗' : hold ? 'tightening…' : 'hold on the screw');
      x.clearRect(0, 0, W, H);
      const hx = W * .22, hy = H / 2 - 8; x.save(); x.translate(hx, hy + (st === 2 ? (rnd() - .5) * 3 : 0)); x.rotate(ang);
      x.fillStyle = '#1b1228'; x.strokeStyle = st === 2 ? C.r : C.mu; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 52, 0, TAU); x.fill(); x.stroke();
      x.strokeStyle = st === 2 ? C.r : C.o; x.lineWidth = 6; x.beginPath();
      const k = bit[0][0]; if (k === 'P') { x.moveTo(-26, 0); x.lineTo(26, 0); x.moveTo(0, -26); x.lineTo(0, 26); } else if (k === 'H') { for (let i = 0; i <= 6; i++) x.lineTo(Math.cos(i * TAU / 6) * 26, Math.sin(i * TAU / 6) * 26); } else { for (let i = 0; i <= 12; i++) { const r = i % 2 ? 11 : 28; x.lineTo(Math.cos(i * TAU / 12) * r, Math.sin(i * TAU / 12) * r); } }
      x.stroke(); x.restore();
      if (fl) { x.strokeStyle = C.w; x.globalAlpha = fl; x.lineWidth = 4; x.beginPath(); x.arc(hx, hy, 52 + (1 - fl) * 30, 0, TAU); x.stroke(); x.globalAlpha = 1; }
      const gx = W * .45, gw = W * .5, mx = Math.max(Ts, set) * 1.2, gy = H / 2 - 8;
      x.lineWidth = 1; x.strokeStyle = C.mu; x.strokeRect(gx, gy - 12, gw, 24); x.fillStyle = st === 2 ? C.r : C.o; x.fillRect(gx, gy - 12, gw * T / mx, 24);
      [[set, C.w, 'set'], [Ts, C.r, 'strips']].forEach(([val, col, lab], i) => { const X = gx + gw * val / mx; x.strokeStyle = col; x.beginPath(); x.moveTo(X, gy - 20); x.lineTo(X, gy + 20); x.stroke(); x.fillStyle = col; x.font = '11px monospace'; x.fillText(lab, X - 12, gy + 34 + i * 12); });
      x.fillStyle = C.mu; x.fillText('torque (N·m)', gx, gy - 28);
    }});
  const sg = el.querySelector('.sg'), sb = el.querySelector('.sb'), sl = el.querySelector('input[data-k="tq"]');
  sg.onchange = () => { tag = TAGS[+sg.value]; sl.value = tag[2]; sl.oninput(); st = 0; ang = 0; };
  sb.onchange = () => { bit = BITS[+sb.value]; st = 0; ang = 0; };
  R.c.onpointerdown = () => { if (st) { st = 0; ang = 0; } hold = 1; };
  R.c.onpointerup = R.c.onpointerleave = R.c.onpointercancel = () => { hold = 0; };
  return R.stop;
};

/* ---------- ML stock predictor: backtest explorer ----------
   Real data: put data/stock_trades.json next to index.html as [{"d":1,"p":0.82,"r":0.14}, ...]
   d = trading day (1..N), p = model probability, r = trade return as a fraction (0.14 = +14 %). Otherwise demo data is used. */
S.stock = el => {
  let rows = null, demo = true, key = '';
  const mk = () => { let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647, o = []; for (let d = 1; d <= 29; d++) for (let i = 0; i < 6; i++) { const p = .5 + .45 * r(), w = r() < .3 + .55 * (p - .5) / .45; o.push({d, p, r: w ? .04 + .12 * r() : -(.03 + .06 * r())}); } return o; };
  const R = rig(el, {title: 'Backtest explorer', h: 260,
    sl: [['th', 'Min. probability', .5, .95, .01, .6, ''], ['mx', 'Max trades per day', 1, 8, 1, 3, ''], ['c', 'Fees + slippage per trade', 0, 1.5, .05, .3, ' %']],
    ro: [['tr', 'Trades'], ['wn', 'Win rate'], ['fin', 'End value (from $10,000)'], ['dd', 'Max drawdown']],
    note: '', frame(R) {
      if (!rows) return;
      const {x, W, H, v} = R, k = JSON.stringify(v) + W; if (k === key) return; key = k;
      R.el.querySelector('.rn').textContent = demo ? 'DEMO DATA – random numbers, NOT the real backtest. Add data/stock_trades.json (see sims.js) to show the real trade log. Equal-weight positions each day, short simulation, not live trading.' : 'Replay of the real 29-day simulated backtest trade log. Equal-weight positions each day; a short simulation, not live trading.';
      const days = {}; rows.forEach(r => (days[r.d] = days[r.d] || []).push(r));
      let eq = 1e4, tr = 0, win = 0, pk = eq, dd = 0; const cv = [eq], pks = [eq];
      Object.keys(days).map(Number).sort((a, b) => a - b).forEach(d => {
        const t = days[d].filter(r => r.p >= v.th).sort((a, b) => b.p - a.p).slice(0, v.mx);
        if (t.length) { const rs = t.map(r => r.r - v.c / 100); eq *= 1 + rs.reduce((a, b) => a + b, 0) / rs.length; tr += t.length; win += rs.filter(r => r > 0).length; }
        pk = Math.max(pk, eq); dd = Math.max(dd, 1 - eq / pk); cv.push(eq); pks.push(pk);
      });
      R.set('tr', tr); R.set('wn', tr ? (win / tr * 100).toFixed(1) + '%' : '–'); R.set('fin', '$' + Math.round(eq).toLocaleString() + ` (${eq >= 1e4 ? '+' : ''}${((eq / 1e4 - 1) * 100).toFixed(1)}%)`); R.set('dd', '−' + (dd * 100).toFixed(1) + '%');
      x.clearRect(0, 0, W, H);
      const lo = Math.min(...cv, 1e4) * .95, hi = Math.max(...pks, 1e4) * 1.05, X = i => 40 + (W - 56) * i / (cv.length - 1), Y = e => H - 26 - (H - 46) * (e - lo) / (hi - lo);
      x.strokeStyle = C.mu; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(40, Y(1e4)); x.lineTo(W - 16, Y(1e4)); x.stroke(); x.setLineDash([]);
      x.fillStyle = 'rgba(255,59,31,.18)'; x.beginPath(); cv.forEach((e, i) => i ? x.lineTo(X(i), Y(pks[i])) : x.moveTo(X(i), Y(pks[i]))); for (let i = cv.length - 1; i >= 0; i--) x.lineTo(X(i), Y(cv[i])); x.fill();
      x.strokeStyle = C.o; x.lineWidth = 2; x.beginPath(); cv.forEach((e, i) => i ? x.lineTo(X(i), Y(e)) : x.moveTo(X(i), Y(e))); x.stroke(); x.lineWidth = 1;
      x.fillStyle = C.mu; x.font = '10px monospace'; x.fillText('$' + Math.round(hi).toLocaleString(), 2, 16); x.fillText('$' + Math.round(lo).toLocaleString(), 2, H - 28); x.fillText('day 0', 40, H - 8); x.fillText('day ' + (cv.length - 1), W - 56, H - 8);
      if (demo) { x.fillStyle = C.r; x.font = 'bold 12px monospace'; x.fillText('DEMO DATA', W - 110, 18); }
    }});
  fetch('data/stock_trades.json').then(r => r.ok ? r.json() : Promise.reject()).then(j => { rows = j; demo = false; key = ''; }).catch(() => { rows = mk(); key = ''; });
  return R.stop;
};
})();
