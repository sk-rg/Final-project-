/* Home page: yarn between the pins, OPEN/CLOSED stamps, final report. */
(function () {
  'use strict';

  var board = document.getElementById('board');
  var svg = document.getElementById('yarn');
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- Stamps and report ---------- */

  function paintStamps() {
    for (var i = 1; i <= 3; i++) {
      var el = document.getElementById('stamp-' + i);
      var closed = Sentra.labState(i).closed;
      el.className = 'stamp ' + (closed ? 'closed' : 'open');
      el.textContent = closed ? 'Closed' : 'Open';
    }

    var all = Sentra.closedCount() === 3;
    document.getElementById('report-locked').hidden = all;
    document.getElementById('report-open').hidden = !all;
    var tag = document.getElementById('report-tag');
    tag.textContent = all ? 'UNLOCKED' : 'LOCKED';
    tag.style.background = all ? '#dcfce7' : '#e7e5e4';
    tag.style.color = all ? '#166534' : '#44403c';
  }

  /* ---------- Yarn ---------- */

  function rel(el) {
    var b = board.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }

  function pinPoint(id) {
    var pin = document.querySelector('#' + id + ' .pin');
    var r = rel(pin);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function bottomPoint(id) {
    var r = rel(document.getElementById(id));
    return { x: r.x + r.w / 2, y: r.y + r.h - 6 };
  }

  function addPath(a, b, bend, thin) {
    var path = document.createElementNS(NS, 'path');
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var cx = mx + (bend.x || 0);
    var cy = my + (bend.y || 0);
    path.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' Q ' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y);
    if (thin) { path.setAttribute('class', 'thin'); }
    svg.appendChild(path);
  }

  function addKnot(p) {
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', 4);
    c.setAttribute('fill', '#8e0000');
    svg.appendChild(c);
  }

  function drawYarn() {
    if (window.getComputedStyle(svg).display === 'none') { return; }
    var b = board.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + b.width + ' ' + b.height);
    svg.textContent = '';

    var protocol = pinPoint('card-protocol');
    var c1 = pinPoint('card-1');
    var c2 = pinPoint('card-2');
    var c3 = pinPoint('card-3');
    var rep = pinPoint('card-report');
    var c1Bottom = bottomPoint('card-1');
    var protoBottom = bottomPoint('card-protocol');
    var c2Bottom = bottomPoint('card-2');

    addPath(protocol, c1, { y: -46 });
    addPath(c1, c2, { y: -52 });
    addPath(c1Bottom, c3, { x: -22, y: 8 });
    addPath(protoBottom, c3, { x: 40, y: 30 }, true);
    addPath(c2Bottom, rep, { x: 24, y: 6 });

    [protocol, c1, c2, c3, rep, c1Bottom, c2Bottom].forEach(addKnot);
  }

  var timer = null;
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(drawYarn, 80);
  }

  paintStamps();
  document.addEventListener('sentra:progress', paintStamps);
  window.addEventListener('resize', schedule);
  window.addEventListener('load', drawYarn);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(drawYarn); }
  drawYarn();
})();
