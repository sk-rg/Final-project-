/* ==========================================================================
   SENTRA // INCIDENT BOARD — shared helpers
   No backend, no external libraries. Everything here is a local simulation.
   ========================================================================== */
(function (global) {
  'use strict';

  var BRAND = 'SENTRA // INCIDENT BOARD';
  var FOOTER = 'SENTRA FORENSICS // 42 AMMAN & IRBID // GHURIR FINAL PROJECT. Every demo is a simulation. No real site is attacked.';
  var KEY = 'sentra.progress.v1';
  var TOTAL = 3;

  /* ---------- Progress (localStorage with in-memory fallback) ---------- */

  var memory = {};

  function readAll() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memory;
    } catch (e) {
      return memory;
    }
  }

  function writeAll(data) {
    memory = data;
    try { global.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  function labState(id) {
    var all = readAll();
    return all[id] || { exploited: false, blocked: false, closed: false };
  }

  function emit(detail) {
    document.dispatchEvent(new CustomEvent('sentra:progress', { detail: detail || {} }));
  }

  /* what: 'exploited' (payload worked on the vulnerable version) or 'blocked' (same payload failed on the fixed one) */
  function mark(id, what) {
    var all = readAll();
    var s = all[id] || { exploited: false, blocked: false, closed: false };
    var wasClosed = s.closed;
    s[what] = true;
    if (s.exploited && s.blocked) { s.closed = true; }
    all[id] = s;
    writeAll(all);
    emit({ id: id, justClosed: !wasClosed && s.closed });
  }

  function closedCount() {
    var n = 0;
    for (var i = 1; i <= TOTAL; i++) { if (labState(i).closed) { n++; } }
    return n;
  }

  function resetProgress() {
    writeAll({});
    emit({ reset: true });
  }

  /* ---------- Page chrome ---------- */

  function buildChrome() {
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a class="brand" href="index.html"><span class="brand-dot" aria-hidden="true"></span><span>' + BRAND + '</span></a>' +
      '<div class="header-meta">' +
        '<span>Cases closed: <strong id="closed-counter">0 / ' + TOTAL + '</strong></span>' +
        '<span><span class="lamp" aria-hidden="true"></span>Sandbox: simulation only</span>' +
      '</div>';
    document.body.insertBefore(header, document.body.firstChild);

    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    var p = document.createElement('span');
    p.textContent = FOOTER;
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset board';
    reset.addEventListener('click', function () {
      if (global.confirm('Clear your progress on all three cases?')) { resetProgress(); }
    });
    footer.appendChild(p);
    footer.appendChild(reset);
    document.body.appendChild(footer);

    updateCounter();
    document.addEventListener('sentra:progress', updateCounter);
  }

  function updateCounter() {
    var el = document.getElementById('closed-counter');
    if (el) { el.textContent = closedCount() + ' / ' + TOTAL; }
  }

  /* ---------- Small UI helpers ---------- */

  function renderCode(target, lines) {
    /* lines: [[text, kind?, note?], ...]. kind: 'bad' | 'good' | 'soft'. Text is set with textContent only. */
    target.textContent = '';
    var pre = document.createElement('pre');
    pre.className = 'code';
    pre.tabIndex = 0;
    var code = document.createElement('code');
    lines.forEach(function (l) {
      var s = document.createElement('span');
      s.className = 'ln' + (l[1] ? ' ' + l[1] : '');
      if (l[2]) { s.setAttribute('data-note', l[2]); }
      s.textContent = l[0] === '' ? ' ' : l[0];
      code.appendChild(s);
    });
    pre.appendChild(code);
    target.appendChild(pre);
  }

  function createConsole(el, max) {
    max = max || 18;
    return {
      clear: function () { el.textContent = ''; },
      add: function (kind, text) {
        var d = document.createElement('div');
        d.className = 'cl ' + kind;
        d.textContent = text;
        el.appendChild(d);
        while (el.children.length > max) { el.removeChild(el.firstChild); }
        el.scrollTop = el.scrollHeight;
      }
    };
  }

  function setVerdict(el, kind, title, text) {
    el.className = 'verdict ' + kind;
    el.textContent = '';
    var icon = document.createElement('span');
    icon.className = 'vicon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'bad' ? '!' : (kind === 'good' ? '\u2713' : 'i');
    var box = document.createElement('div');
    var strong = document.createElement('strong');
    strong.textContent = title;
    box.appendChild(strong);
    box.appendChild(document.createTextNode(text));
    el.appendChild(icon);
    el.appendChild(box);
  }

  /* Vulnerable / Fixed switch. Every [data-mode-switch] on the page stays in sync. */
  function modeSwitch(onChange) {
    var mode = 'vulnerable';
    var switches = document.querySelectorAll('[data-mode-switch]');

    function paint() {
      document.body.setAttribute('data-mode', mode);
      Array.prototype.forEach.call(switches, function (sw) {
        Array.prototype.forEach.call(sw.querySelectorAll('button'), function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode));
        });
      });
    }

    function set(next) {
      if (next === mode) { return; }
      mode = next;
      paint();
      onChange(mode);
    }

    Array.prototype.forEach.call(switches, function (sw) {
      sw.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-mode]');
        if (b) { set(b.getAttribute('data-mode')); }
      });
    });

    paint();
    return { get: function () { return mode; }, set: set };
  }

  /* Detect, analyze, fix, retest tracker */
  function sopTracker() {
    var items = {};
    Array.prototype.forEach.call(document.querySelectorAll('.sop [data-step]'), function (li) {
      items[li.getAttribute('data-step')] = li;
    });

    var target = document.getElementById('sec-line');
    if (target && 'IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { light('analyze'); io.disconnect(); }
        });
      }, { threshold: 0.6 });
      io.observe(target);
    }

    function light(step) {
      if (items[step]) { items[step].classList.add('done'); }
    }
    return { light: light };
  }

  /* Shows the CLOSED stamp on a lab page, with a slam animation the first time */
  function labStamp(id) {
    var el = document.getElementById('sheet-stamp');
    if (!el) { return; }
    function paint(animate) {
      var closed = labState(id).closed;
      el.className = 'stamp sheet-stamp ' + (closed ? 'closed' : 'open') + (closed && animate ? ' slam' : '');
      el.textContent = closed ? 'Closed' : 'Open';
    }
    paint(false);
    document.addEventListener('sentra:progress', function (e) {
      paint(Boolean(e.detail && e.detail.justClosed && e.detail.id === id));
    });
  }

  function fmtTime(ms) {
    if (ms < 1) { return ms.toFixed(3) + ' ms'; }
    if (ms < 1000) { return ms.toFixed(1) + ' ms'; }
    return (ms / 1000).toFixed(2) + ' s';
  }

  /* ---------- SHA-256 (pure JS, so Lab 2 works on http(s) and file://) ---------- */

  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256(bytes) {
    var H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    var len = bytes.length;
    var padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[len] = 0x80;
    var dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(len / 0x20000000));
    dv.setUint32(padded.length - 4, (len << 3) >>> 0);

    var w = new Uint32Array(64);
    for (var off = 0; off < padded.length; off += 64) {
      var i;
      for (i = 0; i < 16; i++) { w[i] = dv.getUint32(off + i * 4); }
      for (i = 16; i < 64; i++) {
        var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32);
    var ov = new DataView(out.buffer);
    for (var j = 0; j < 8; j++) { ov.setUint32(j * 4, H[j]); }
    return out;
  }

  /* Same text format a browser uses for the integrity attribute: "sha256-" + base64 digest */
  function sriOf(text) {
    var digest = sha256(new TextEncoder().encode(text));
    var bin = '';
    for (var i = 0; i < digest.length; i++) { bin += String.fromCharCode(digest[i]); }
    return 'sha256-' + global.btoa(bin);
  }

  /* ---------- Public API ---------- */

  global.Sentra = {
    mark: mark,
    labState: labState,
    closedCount: closedCount,
    resetProgress: resetProgress,
    renderCode: renderCode,
    createConsole: createConsole,
    setVerdict: setVerdict,
    modeSwitch: modeSwitch,
    sopTracker: sopTracker,
    labStamp: labStamp,
    fmtTime: fmtTime,
    sriOf: sriOf,
    sha256: sha256
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildChrome);
  } else {
    buildChrome();
  }
})(window);
