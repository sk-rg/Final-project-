/* ==========================================================================
   Lab 2 — Wanderly Travel (supply chain attack)
   A fake CDN serves either the real booking library or a modified build that
   copies the booking data. The vulnerable page runs whatever it gets. The
   fixed page pins the version and checks an integrity hash first.
   ========================================================================== */
(function () {
  'use strict';

  var LAB = 2;
  var S = window.Sentra;
  var R = window.WanderlyRegistry;
  var sop = S.sopTracker();
  S.labStamp(LAB);

  var $ = function (id) { return document.getElementById(id); };
  var log = S.createConsole($('console'));
  var verdict = $('verdict');

  /* Hash of the reviewed booking-lib 2.4.1 (whitespace removed).
     If you edit lib/booking-lib.js, regenerate it: node tools/print-hash.js */
  var PINNED_INTEGRITY = 'sha256-oyabdV6sK4+M5dwHIg/YSthvbYmJ8pO3GGNnadMqED0=';

  var BOOKINGS = [
    { name: 'Layla Haddad', email: 'layla.test@example.com', reference: 'GH-1001', destination: 'Petra, Jordan', card: '4111 1111 1111 1111' },
    { name: 'Omar Nasser', email: 'omar.test@example.com', reference: 'GH-2042', destination: 'Istanbul, Turkey', card: '5555 5555 5555 4444' }
  ];

  /* The simulated attacker: only the modified library calls this. Data stays in this tab. */
  var captured = [];
  window.simulatedAttackerCapture = function (d) {
    captured.push({ name: d.name, email: d.email, reference: d.reference, destination: d.destination, card: d.card });
  };

  function integrityOf(factory) { return S.sriOf(factory.toString().replace(/\s+/g, '')); }
  function short(h) { return h.slice(0, 14) + '...'; }

  /* ---------- Fake CDN (the outside world) ---------- */

  var cdn = {
    tampered: true,            /* the attacker already replaced the library on the CDN */
    serve: function () {
      var key = this.tampered ? '2.4.2-modified' : '2.4.1';
      return { build: this.tampered ? '2.4.2' : '2.4.1', factory: R.factories[key] };
    }
  };

  var mode, lib, status;

  function loadDependency() {
    var m = mode.get();
    var url = m === 'vulnerable'
      ? 'cdn.wanderly.example/booking-lib@latest/lib.js'
      : 'cdn.wanderly.example/booking-lib@2.4.1/lib.js';
    var got = cdn.serve();
    var gotHash = integrityOf(got.factory);

    log.add('req', '> GET ' + url);
    log.add('info', '< 200 OK   build ' + got.build + '   ' + short(gotHash));

    if (m === 'vulnerable') {
      log.add('bad', '  no integrity attribute: the browser runs it without checking');
      lib = got.factory();
      status = { cls: 'unchecked', text: 'not checked', blocked: false };
      return;
    }
    if (gotHash === PINNED_INTEGRITY) {
      log.add('ok', '  integrity ' + short(PINNED_INTEGRITY) + ' matches. Script runs.');
      lib = got.factory();
      status = { cls: 'ok', text: 'verified', blocked: false };
      return;
    }
    log.add('bad', '  integrity MISMATCH. expected ' + short(PINNED_INTEGRITY) + '  got ' + short(gotHash));
    log.add('ok', '  script BLOCKED by the browser. Using our own reviewed copy.');
    lib = R.factories['2.4.1']();
    status = { cls: 'blocked', text: 'modified build blocked', blocked: true };
  }

  /* ---------- Rendering ---------- */

  function render() {
    $('dep-version').textContent = 'v' + lib.version + '   integrity: ' + status.text;
    var chip = $('dep-chip');
    chip.className = 'dep-chip ' + status.cls;
    chip.textContent = status.cls === 'ok' ? 'OK' : (status.cls === 'blocked' ? 'BLOCKED' : 'UNVERIFIED');

    var list = $('stolen');
    list.textContent = '';
    if (!captured.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No data captured yet.';
      list.appendChild(empty);
    }
    captured.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'forged';
      li.textContent = c.name + ' | ' + c.email;
      var small = document.createElement('small');
      small.textContent = 'Ref ' + c.reference + ' | ' + c.destination;
      li.appendChild(small);
      var cardLine = document.createElement('small');
      cardLine.textContent = 'Card ' + c.card;
      li.appendChild(cardLine);
      list.appendChild(li);
    });
  }

  function reloadPage() {
    loadDependency();
    render();
  }

  function fill(b) {
    $('f-name').value = b.name;
    $('f-email').value = b.email;
    $('f-ref').value = b.reference;
    $('f-dest').value = b.destination;
    $('f-card').value = b.card;
  }

  function submit() {
    var data = {
      name: $('f-name').value || 'Layla Haddad',
      email: $('f-email').value || 'layla.test@example.com',
      reference: $('f-ref').value || 'GH-1001',
      destination: $('f-dest').value || 'Petra, Jordan',
      card: $('f-card').value || '4111 1111 1111 1111'
    };
    var before = captured.length;
    log.add('req', '> submit booking   ' + data.reference + ' / ' + data.destination);
    var conf = lib.processBooking(data);
    var leaked = captured.length > before;

    var result = $('result');
    result.className = 'lookup-result ok';
    result.textContent = conf.status + ' (' + conf.ref + ')';
    render();

    if (leaked) {
      log.add('bad', '  the library also sent the booking to the attacker (simulated)');
      S.setVerdict(verdict, 'bad', 'Exploited: the page ran code it never checked.',
        ' The booking page code did not change at all, yet the visitor\'s details, card number included, were copied.');
      S.mark(LAB, 'exploited'); sop.light('detect');
    } else if (cdn.tampered && status.blocked) {
      log.add('ok', '  nothing was copied: the modified library never ran');
      S.setVerdict(verdict, 'good', 'Blocked: the hash did not match, so the browser refused the file.',
        ' The booking works with the reviewed copy and the attacker panel stays empty.');
      S.mark(LAB, 'blocked'); sop.light('retest');
    }
  }

  function bookingButton(i) {
    fill(BOOKINGS[i]);
    submit();
  }

  /* the modified build is already on the CDN when the page loads */
  function announceCdn() {
    log.add('info', '// the attacker already replaced booking-lib on the CDN with a modified 2.4.2');
  }

  $('btn-b1').addEventListener('click', function () { bookingButton(0); });
  $('btn-b2').addEventListener('click', function () { bookingButton(1); });
  $('book-form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });

  /* ---------- Code panels and mode switch ---------- */

  function codeFor(fixed) {
    var tag = fixed
      ? [
        ['<script'],
        ['  src="https://cdn.wanderly.example/booking-lib@2.4.1/lib.js"'],
        ['  integrity="' + PINNED_INTEGRITY + '"', 'good', 'the fix'],
        ['  crossorigin="anonymous"></script>']
      ]
      : [['<script src="https://cdn.wanderly.example/booking-lib@latest/lib.js"></script>', 'bad', 'the bug']];
    return [['<!-- booking.html: third-party library loaded from a public CDN -->']].concat(tag, [
      [''],
      ['<script>'],
      ['  form.onsubmit = () => {'],
      ['    const result = BookingLib.processBooking(formData);   // sees every field'],
      ['    showConfirmation(result);'],
      ['  };'],
      ['</script>']
    ]);
  }

  function paintFixCode(m) {
    S.renderCode($('code-fix'), codeFor(m === 'fixed'));
    $('fix-why').textContent = m === 'fixed'
      ? 'The version is pinned to 2.4.1, and the integrity hash tells the browser exactly which bytes may run. If the CDN serves anything else, the browser refuses it. Keep a reviewed copy as a fallback and update it on purpose.'
      : 'This is the vulnerable code from step 2. Switch to Fixed to see the pinned version and the integrity hash.';
  }

  function onMode(m) {
    captured = [];
    $('result').className = 'lookup-result';
    $('result').textContent = '';
    log.clear();
    announceCdn();
    reloadPage();
    paintFixCode(m);
    if (m === 'fixed') {
      sop.light('fix');
      S.setVerdict(verdict, 'neutral', 'Fixed version loaded.',
        ' The CDN still serves the modified library, but the page refuses it. Submit the same booking again.');
    } else {
      S.setVerdict(verdict, 'neutral', 'Vulnerable version loaded.', ' Press a booking, or fill the form and submit.');
    }
  }

  S.renderCode($('code-vuln'), codeFor(false));
  mode = S.modeSwitch(onMode);
  announceCdn();
  reloadPage();
  paintFixCode('vulnerable');
  S.setVerdict(verdict, 'neutral', 'No booking yet.', ' Press a booking, or fill the form and submit.');
})();
