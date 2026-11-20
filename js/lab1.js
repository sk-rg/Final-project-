/* ==========================================================================
   Lab 1 — Profile Dashboard (unrestricted file upload)
   Everything is simulated in the browser. Nothing is uploaded or executed.
   ========================================================================== */
(function () {
  'use strict';

  var LAB = 1;
  var S = window.Sentra;
  var sop = S.sopTracker();
  S.labStamp(LAB);

  var $ = function (id) { return document.getElementById(id); };
  var log = S.createConsole($('console'));
  var verdict = $('verdict');
  var mode;
  var state;

  var SIGNATURES = [[0xFF, 0xD8, 0xFF], [0x89, 0x50, 0x4E, 0x47], [0x47, 0x49, 0x46, 0x38]];

  var SAMPLES = {
    real: function () { return new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0])], 'photo.jpg', { type: 'image/jpeg' }); },
    p1: function () { return new File(['#!/bin/sh\n# demo text pretending to be a photo\n'], 'photo.jpg', { type: 'image/jpeg' }); },
    p2: function () { return new File(['#!/bin/sh\n# demo text pretending to be an avatar\n'], 'avatar.png', { type: 'image/png' }); }
  };

  function resetScene() {
    state = { files: [], msg: 'Choose a photo, or press a button above.', cls: '' };
  }

  function nameLooksLikeImage(name) { return /\.(jpe?g|png|gif)$/i.test(name); }

  function hasImageSignature(file) {
    return file.slice(0, 4).arrayBuffer().then(function (buf) {
      var head = new Uint8Array(buf);
      return SIGNATURES.some(function (sig) { return sig.every(function (b, i) { return head[i] === b; }); });
    });
  }

  function render() {
    var status = $('up-status');
    status.className = 'lookup-result' + (state.cls ? ' ' + state.cls : '');
    status.textContent = state.msg;

    var list = $('up-files');
    list.textContent = '';
    if (!state.files.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No uploads yet.';
      list.appendChild(empty);
    }
    state.files.forEach(function (f) {
      var li = document.createElement('li');
      if (!f.real) { li.className = 'forged'; }
      li.textContent = '/uploads/' + f.name;
      var small = document.createElement('small');
      small.textContent = f.real ? 'A real image' : 'Not an image: a script with a photo name';
      li.appendChild(small);
      list.appendChild(li);
    });
  }

  function upload(file) {
    var m = mode.get();
    log.add('req', '> POST /profile/photo   file ' + JSON.stringify(file.name) + '   (' + file.size + ' bytes)');
    hasImageSignature(file).then(function (real) {
      var accepted = m === 'vulnerable' ? nameLooksLikeImage(file.name) : real;
      log.add('info', '  server checked ' + (m === 'vulnerable' ? 'only the file name' : 'the first bytes of the file'));

      if (!accepted) {
        state.msg = 'Rejected: this is not an image.';
        state.cls = 'no';
        log.add('ok', '< 400 rejected');
        render();
        if (m === 'fixed') {
          S.setVerdict(verdict, 'good', 'Blocked: the file\'s real bytes are not an image.',
            ' Renaming a script to ' + file.name + ' no longer helps.');
          S.mark(LAB, 'blocked'); sop.light('retest');
        } else {
          S.setVerdict(verdict, 'neutral', 'Rejected: the name does not end in an image extension.', ' Try a file named like a photo.');
        }
        return;
      }

      state.files.push({ name: file.name, real: real });
      state.msg = 'Saved as /uploads/' + file.name;
      state.cls = 'ok';
      log.add('info', '< 201 saved /uploads/' + file.name);
      log.add('req', '> GET /uploads/' + file.name);
      render();

      if (real) {
        log.add('ok', '< 200 the browser shows it as a photo');
        S.setVerdict(verdict, 'neutral', 'A real photo is accepted.', m === 'fixed'
          ? ' The fix does not get in the way of normal users.' : ' This is the normal behaviour. Now press a payload.');
        return;
      }
      log.add('bad', '  the server runs the file as a script instead of showing it (simulated)');
      log.add('bad', '  shell session opened as www-data (scripted text, nothing real)');
      S.setVerdict(verdict, 'bad', 'Exploited: a script named like a photo was accepted and ran.',
        ' The server never looked at what was inside the file.');
      S.mark(LAB, 'exploited'); sop.light('detect');
    });
  }

  $('btn-control').addEventListener('click', function () { upload(SAMPLES.real()); });
  $('btn-p1').addEventListener('click', function () { upload(SAMPLES.p1()); });
  $('btn-p2').addEventListener('click', function () { upload(SAMPLES.p2()); });
  $('pick').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (f) { upload(f); }
    e.target.value = '';
  });

  /* ---------- Code panels and mode switch ---------- */

  function codeFor(fixed) {
    return [
      ['// upload.js: runs for every profile photo upload'],
      ['async function handleUpload(file) {'],
      fixed
        ? ['  const ok = await hasImageSignature(file);', 'good', 'the fix']
        : ['  const ok = /\\.(jpe?g|png|gif)$/i.test(file.name);', 'bad', 'the bug'],
      ['  if (!ok) return reject("Only images are allowed");'],
      ['  save("/uploads/" + file.name, file);'],
      ['  return accept();'],
      ['}'],
      [''],
      ['// hasImageSignature reads the first bytes of the file:'],
      ['// FF D8 FF = JPG, 89 50 4E 47 = PNG, 47 49 46 38 = GIF']
    ];
  }

  function paintFixCode(m) {
    S.renderCode($('code-fix'), codeFor(m === 'fixed'));
    $('fix-why').textContent = m === 'fixed'
      ? 'The server now reads the real first bytes of the file and compares them to known image signatures. A script renamed photo.jpg still starts with script text, so it is rejected.'
      : 'This is the vulnerable code from step 2. Switch to Fixed to see the one-line change.';
  }

  function onMode(m) {
    resetScene();
    log.clear();
    render();
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
  resetScene();
  render();
  paintFixCode('vulnerable');
  S.setVerdict(verdict, 'neutral', 'No payload yet.', ' The page accepts a normal photo.');
  log.add('info', 'Server log. Uploads appear here.');
})();
