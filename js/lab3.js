/* ==========================================================================
   Lab 3 — CitizenHub licence lookup (ReDoS)
   The regex really runs, inside a Web Worker that stands in for a
   single-threaded server. A safety timer stops it after 20 seconds.
   ========================================================================== */
(function () {
  'use strict';

  var LAB = 3;
  var CAP_MS = 20000;     /* safety timer: kill the worker after this long */
  var PING_MS = 400;      /* another citizen looks up a licence this often */
  var MAX_LANES = 60;

  var S = window.Sentra;
  var sop = S.sopTracker();
  S.labStamp(LAB);

  var $ = function (id) { return document.getElementById(id); };
  var log = S.createConsole($('console'));
  var verdict = $('verdict');

  /* The code the "server" runs. Kept as text so it can live in a Blob worker (works on file:// too). */
  var WORKER_SRC =
    'var VULN = /^([A-Z0-9]+)+$/;' +
    'var FIXED = /^[A-Z0-9]{6,12}$/;' +
    'onmessage = function (e) {' +
    '  var d = e.data, t0 = performance.now(), ok;' +
    '  if (d.mode === "fixed") { ok = d.input.length <= 12 && FIXED.test(d.input); }' +
    '  else { ok = VULN.test(d.input); }' +
    '  postMessage({ id: d.id, ok: ok, ms: performance.now() - t0 });' +
    '};';

  var worker = null;
  var pending = {};
  var nextId = 1;
  var mode;
  var run = null;          /* the attack or lookup currently being processed */
  var capTimer = null;
  var clockTimer = null;
  var runs = [];

  /* ---------- Worker ---------- */

  function startWorker() {
    if (worker) { worker.terminate(); }
    var url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = onResult;
  }

  function post(kind, input, extra) {
    var id = nextId++;
    var entry = { kind: kind, t0: performance.now(), input: input };
    if (extra) { for (var k in extra) { entry[k] = extra[k]; } }
    pending[id] = entry;
    worker.postMessage({ id: id, mode: mode.get(), input: input });
    return id;
  }

  /* ---------- Other citizens (the victims) ---------- */

  function addLane() {
    var lanes = $('lanes');
    var cell = document.createElement('span');
    cell.className = 'lane';
    lanes.appendChild(cell);
    while (lanes.children.length > MAX_LANES) { lanes.removeChild(lanes.firstChild); }
    return cell;
  }

  function ping() {
    if (!worker) { return; }
    post('ping', 'AB123456', { cell: addLane() });
  }

  function tickPending() {
    var now = performance.now();
    for (var id in pending) {
      var p = pending[id];
      if (p.kind !== 'ping') { continue; }
      var waited = now - p.t0;
      p.cell.className = 'lane ' + (waited > 1000 ? 'stuck' : (waited > 250 ? 'slow' : ''));
    }
  }

  /* ---------- Results ---------- */

  function onResult(e) {
    var d = e.data;
    var p = pending[d.id];
    if (!p) { return; }
    delete pending[d.id];
    var latency = performance.now() - p.t0;

    if (p.kind === 'ping') {
      p.cell.className = 'lane ' + (latency > 1000 ? 'stuck' : (latency > 250 ? 'slow' : 'fast'));
      return;
    }
    finishRun(p, d, 'done');
  }

  function label(input) {
    var m = /^(A+)!$/.exec(input);
    return m ? 'A x ' + m[1].length + ' + !' : (input.length > 14 ? input.slice(0, 14) + '...' : input);
  }

  function addRunRow(text, ms, fixed) {
    runs.push({ text: text, ms: ms, fixed: fixed });
    var list = $('runs');
    list.textContent = '';
    runs.slice(-6).forEach(function (r) {
      var li = document.createElement('li');
      if (r.fixed) { li.className = 'fixed'; }
      var a = document.createElement('span'); a.textContent = r.text;
      var b = document.createElement('span'); b.textContent = S.fmtTime(r.ms);
      var bar = document.createElement('span'); bar.className = 'bar';
      var fill = document.createElement('span');
      fill.style.width = Math.min(100, (r.ms / CAP_MS) * 100) + '%';
      bar.appendChild(fill);
      li.appendChild(a); li.appendChild(b); li.appendChild(bar);
      list.appendChild(li);
    });
  }

  function stopClock() {
    window.clearInterval(clockTimer);
    window.clearTimeout(capTimer);
    clockTimer = null;
    $('clock-box').classList.remove('busy');
    $('stop').hidden = true;
    setButtons(false);
  }

  function setButtons(disabled) {
    ['btn-valid', 'btn-p28', 'btn-p32'].forEach(function (id) { $(id).disabled = disabled; });
  }

  function finishRun(p, d, how) {
    var fixed = mode.get() === 'fixed';
    var ms = how === 'done' ? d.ms : (performance.now() - p.t0);
    stopClock();
    $('clock').textContent = S.fmtTime(how === 'done' ? d.ms : ms);
    run = null;

    var result = $('lookup-result');
    var shown = p.input.length > 30 ? p.input.slice(0, 30) + '...' : p.input;
    var showText = shown + '   ';

    if (how !== 'done') {
      addRunRow(label(p.input), ms, fixed);
      result.className = 'lookup-result no';
      result.textContent = showText + 'No answer: stopped.';
      log.add('bad', '! worker stopped after ' + S.fmtTime(ms) + ' (' + (how === 'cap' ? 'safety timer' : 'Stop button') + ')');
      if (p.payload) {
        S.setVerdict(verdict, 'bad', 'Exploited: one short input kept the server busy for ' + S.fmtTime(ms) + '.',
          ' It had not finished when the lab stopped it. A real server has no safety timer. Look at the other citizens: their lookups were stuck behind it.');
        S.mark(LAB, 'exploited'); sop.light('detect');
      }
      return;
    }

    result.className = 'lookup-result ' + (d.ok ? 'ok' : 'no');
    result.textContent = showText + (d.ok ? 'Valid format.' : 'Invalid format.');
    log.add(d.ok ? 'ok' : 'info', '< ' + (d.ok ? 'valid' : 'invalid') + ' in ' + S.fmtTime(d.ms) + '   input ' + JSON.stringify(label(p.input)));

    if (!p.payload) { return; }
    addRunRow(label(p.input), d.ms, fixed);

    if (p.control) {
      S.setVerdict(verdict, 'neutral', 'A real licence number is accepted in ' + S.fmtTime(d.ms) + '.',
        fixed ? ' The fix does not get in the way of normal users.' : ' This is the normal behaviour. Now press a payload.');
    } else if (!fixed) {
      if (d.ms >= 150) {
        S.setVerdict(verdict, 'bad', 'Exploited: one short input kept the server busy for ' + S.fmtTime(d.ms) + '.',
          ' It was rejected in the end, but only after trying every way to split the A\'s. Other citizens\' lookups waited behind it.');
        S.mark(LAB, 'exploited'); sop.light('detect');
      } else {
        S.setVerdict(verdict, 'neutral', 'Only ' + S.fmtTime(d.ms) + ' on this computer.',
          ' Try the big payload. Each extra character roughly doubles the time.');
      }
    } else {
      S.setVerdict(verdict, 'good', 'Blocked: rejected in ' + S.fmtTime(d.ms) + '.',
        ' The length guard stops it before the regex runs, and the new pattern has no nested repeat. Other citizens did not notice.');
      S.mark(LAB, 'blocked'); sop.light('retest');
    }
  }

  /* ---------- Running a lookup ---------- */

  function lookup(input, opts) {
    if (run) { return; }
    opts = opts || {};
    var started = performance.now();
    var id = post('attack', input, { payload: Boolean(opts.payload), control: Boolean(opts.control) });
    run = { id: id, started: started };
    log.add('req', '> POST /licence/lookup   input ' + JSON.stringify(label(input)));
    $('clock-box').classList.add('busy');
    $('stop').hidden = false;
    setButtons(true);
    $('lookup-result').className = 'lookup-result';
    $('lookup-result').textContent = 'Checking...';

    clockTimer = window.setInterval(function () {
      $('clock').textContent = S.fmtTime(performance.now() - started);
    }, 50);
    capTimer = window.setTimeout(function () { halt('cap'); }, CAP_MS);
  }

  function halt(how) {
    if (!run) { return; }
    var p = pending[run.id];
    delete pending[run.id];
    /* Everything waiting behind it is lost when the server is restarted. */
    for (var id in pending) {
      if (pending[id].kind === 'ping') { pending[id].cell.className = 'lane dropped'; }
    }
    pending = {};
    startWorker();
    finishRun(p, null, how);
  }

  function attackOf(n) { return 'A'.repeat(n) + '!'; }

  $('btn-valid').addEventListener('click', function () { $('lic').value = 'AB123456'; lookup('AB123456', { payload: true, control: true }); });
  $('btn-p28').addEventListener('click', function () { $('lic').value = attackOf(28); lookup(attackOf(28), { payload: true }); });
  $('btn-p32').addEventListener('click', function () { $('lic').value = attackOf(32); lookup(attackOf(32), { payload: true }); });
  $('stop').addEventListener('click', function () { halt('stop'); });
  $('lookup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    lookup($('lic').value, {});
  });

  /* ---------- Code panels and mode switch ---------- */

  function codeFor(fixed) {
    return [
      ['// licence-check.js: runs for every lookup request'],
      fixed
        ? ['const licenceRegex = /^[A-Z0-9]{6,12}$/;', 'good', 'the fix']
        : ['const licenceRegex = /^([A-Z0-9]+)+$/;', 'bad', 'the bug'],
      [''],
      ['function isValidLicence(input) {'],
      fixed
        ? ['  if (typeof input !== "string" || input.length > 12) return false;', 'soft', 'extra layer']
        : null,
      ['  return licenceRegex.test(input);'],
      ['}'],
      [''],
      ['function lookupLicence(input) {'],
      ['  if (!isValidLicence(input)) return { error: "Invalid format" };'],
      ['  return database.find(input);'],
      ['}']
    ].filter(Boolean);
  }

  function paintFixCode(m) {
    S.renderCode($('code-fix'), codeFor(m === 'fixed'));
    $('fix-why').textContent = m === 'fixed'
      ? 'A licence number is 6 to 12 letters or digits, so the pattern now says exactly that, with no repeat inside a repeat. The length check rejects long input before the regex even starts.'
      : 'This is the vulnerable code from step 2. Switch to Fixed to see the safer pattern and the length guard.';
  }

  function onMode(m) {
    if (run) { halt('stop'); }
    log.clear();
    runs = [];
    $('runs').textContent = '';
    $('lanes').textContent = '';
    $('clock').textContent = '0.00 s';
    $('lookup-result').className = 'lookup-result';
    $('lookup-result').textContent = 'Enter a licence number, or press a payload above.';
    paintFixCode(m);
    if (m === 'fixed') {
      sop.light('fix');
      S.setVerdict(verdict, 'neutral', 'Fixed version loaded.', ' Press the same payloads again.');
    } else {
      S.setVerdict(verdict, 'neutral', 'Vulnerable version loaded.', ' Press a payload.');
    }
  }

  S.renderCode($('code-vuln'), codeFor(false));
  mode = S.modeSwitch(onMode);
  paintFixCode('vulnerable');

  try {
    startWorker();
    window.setInterval(ping, PING_MS);
    window.setInterval(tickPending, 100);
    S.setVerdict(verdict, 'neutral', 'No payload yet.', ' The lookup is healthy. Other citizens are answered instantly.');
    log.add('info', 'Server log. Lookups appear here.');
  } catch (err) {
    setButtons(true);
    S.setVerdict(verdict, 'bad', 'Web Workers are not available here.',
      ' Open the site from a web server (GitHub Pages or "python3 -m http.server") in a current browser.');
  }
})();
