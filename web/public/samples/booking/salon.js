/* Marlowe Studio, demo booking flow for FiveUsers. State lives in sessionStorage. */
(function () {
  'use strict';

  var store = {
    get: function (k, fallback) {
      try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var SERVICES = {
    'signature-cut': { name: 'Signature Cut & Finish', mins: 60, price: 68, from: true },
    'express-restyle': { name: 'Express Restyle', mins: 30, price: 42, from: true },
    'clipper-cut': { name: 'Clipper Cut & Detail', mins: 30, price: 38, from: true },
    'fringe-detail': { name: 'Fringe Detail', mins: 15, price: 15, from: false },
    'gloss-tone': { name: 'Gloss & Tone', mins: 45, price: 58, from: true },
    'root-retouch': { name: 'Root Retouch', mins: 75, price: 85, from: true },
    'balayage': { name: 'Lived-in Balayage', mins: 180, price: 210, from: true },
    'bond-repair': { name: 'Bond Repair Ritual', mins: 30, price: 45, from: false },
    'consultation': { name: 'Restyle Consultation', mins: 15, price: 0, from: false }
  };
  var STYLISTS = {
    any: { name: 'Any available stylist', extra: 0 },
    tess: { name: 'Tess Lindqvist (Associate)', extra: 0 },
    junie: { name: 'Junie Park (Senior)', extra: 12 },
    ravi: { name: 'Ravi Mensah (Director)', extra: 30 }
  };
  function priceText(svc, stylistKey) {
    if (!svc.price) return 'Free';
    var p = svc.price + ((STYLISTS[stylistKey] || STYLISTS.any).extra || 0);
    return (svc.from ? 'from $' : '$') + p;
  }

  /* ---------- dates ---------- */
  function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function longDate(d) { return DAYS_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function shortDate(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function isClosed(d) { return d.getDay() === 0 || d.getDay() === 1; }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Saturdays are popular: the early afternoon is already gone.
  var SAT_BOOKED = ['09:00', '09:30', '10:30', '11:00', '12:00', '12:30', '13:00', '13:30', '14:00', '15:00', '16:30'];
  function slotsFor(d) {
    if (isClosed(d)) return [];
    var sat = d.getDay() === 6;
    var start = sat ? 9 * 60 : 10 * 60, end = sat ? 17 * 60 : 18 * 60 + 30;
    var today = startOfToday().getTime() === d.getTime();
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var key = ymd(d), out = [];
    for (var m = start; m <= end; m += 30) {
      var t = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      var taken = sat ? SAT_BOOKED.indexOf(t) !== -1 : (hash(key + t) % 100) < 42;
      if (today && m < nowMin + 60) taken = true;
      out.push({ t: t, ok: !taken });
    }
    return out;
  }

  /* ---------- phone-only app promo ---------- */
  function appPromo() {
    if (store.get('ms_promo_closed', false)) return;
    var bar = document.createElement('div');
    bar.className = 'app-promo';
    bar.innerHTML = '<span class="icon" aria-hidden="true">M</span>' +
      '<p><strong>Book faster in the Marlowe app</strong>15% off your first visit</p>' +
      '<button type="button" class="get">Get the app</button>' +
      '<button type="button" class="x"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>';
    document.body.appendChild(bar);
    $('.x', bar).addEventListener('click', function () { store.set('ms_promo_closed', true); bar.remove(); });
    $('.get', bar).addEventListener('click', function () { $('.get', bar).textContent = 'Coming soon'; });
  }

  /* ---------- services ---------- */
  function initServices() {
    $$('[data-service]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = store.get('ms_booking', {}) || {};
        b.service = btn.getAttribute('data-service');
        b.time = null;
        store.set('ms_booking', b);
        location.href = 'time.html';
      });
    });
  }

  function chosenBox(b) {
    var svc = SERVICES[b.service];
    $('[data-chosen-name]').textContent = svc.name;
    $('[data-chosen-meta]').textContent = svc.mins + ' min · ' + priceText(svc, b.stylist);
  }

  /* ---------- date & time ---------- */
  function initTime() {
    var b = store.get('ms_booking', null);
    if (!b || !SERVICES[b.service]) { location.replace('services.html'); return; }
    b.stylist = b.stylist || 'any';
    chosenBox(b);

    var today = startOfToday();
    var maxWeek = 2;
    var state = { week: 0, date: null, time: null };

    if (b.date) {
      var saved = parseYmd(b.date);
      var diff = Math.round((saved - today) / 86400000);
      if (diff >= 0 && diff < (maxWeek + 1) * 7 && !isClosed(saved)) {
        state.week = Math.floor(diff / 7); state.date = b.date; state.time = b.time || null;
      }
    }
    if (!state.date) {
      for (var i = 0; i < 7; i++) {
        var d = addDays(today, i);
        if (slotsFor(d).some(function (s) { return s.ok; })) { state.date = ymd(d); break; }
      }
    }

    var sel = $('#stylist');
    sel.value = b.stylist;
    sel.addEventListener('change', function () { b.stylist = sel.value; chosenBox(b); });

    var daysEl = $('[data-days]'), slotsEl = $('[data-slots]');
    function paintDays() {
      var first = addDays(today, state.week * 7);
      var last = addDays(first, 6);
      $('[data-month]').textContent = first.getMonth() === last.getMonth()
        ? MONTHS[first.getMonth()] + ' ' + first.getFullYear()
        : MONTHS[first.getMonth()].slice(0, 3) + ' – ' + MONTHS[last.getMonth()].slice(0, 3) + ' ' + last.getFullYear();
      var html = '';
      for (var i = 0; i < 7; i++) {
        var d = addDays(first, i), key = ymd(d), closed = isClosed(d);
        html += '<button type="button" class="day' + (key === state.date ? ' is-on' : '') + '" data-date="' + key + '"' + (closed ? ' disabled' : '') + '>' +
          '<b>' + DAYS[d.getDay()] + '</b><span>' + d.getDate() + '</span><small>' + (closed ? 'Closed' : (i === 0 && state.week === 0 ? 'Today' : '')) + '</small></button>';
      }
      daysEl.innerHTML = html;
      $('[data-prev]').disabled = state.week === 0;
      $('[data-next]').disabled = state.week >= maxWeek;
    }
    function paintSlots() {
      if (!state.date) { slotsEl.innerHTML = ''; $('[data-slots-title]').textContent = 'Choose a day to see times'; return; }
      var d = parseYmd(state.date);
      var slots = slotsFor(d);
      $('[data-slots-title]').textContent = 'Available times · ' + longDate(d);
      slotsEl.innerHTML = slots.map(function (s) {
        return '<button type="button" class="slot' + (s.t === state.time ? ' is-on' : '') + '" data-time="' + s.t + '"' + (s.ok ? '' : ' disabled') + '>' + s.t + '</button>';
      }).join('');
      paintPicked();
    }
    function paintPicked() {
      var el = $('[data-picked]');
      if (state.date && state.time) el.innerHTML = 'Selected: <strong>' + esc(shortDate(parseYmd(state.date)) + ' at ' + state.time) + '</strong>';
      else el.textContent = 'No time selected yet.';
    }
    daysEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.day');
      if (!btn || btn.disabled) return;
      state.date = btn.getAttribute('data-date'); state.time = null;
      paintDays(); paintSlots();
    });
    slotsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.slot');
      if (!btn || btn.disabled) return;
      state.time = btn.getAttribute('data-time');
      $$('.slot', slotsEl).forEach(function (s) { s.classList.toggle('is-on', s === btn); });
      $('[data-time-error]').hidden = true;
      paintPicked();
    });
    $('[data-prev]').addEventListener('click', function () { if (state.week > 0) { state.week--; paintDays(); } });
    $('[data-next]').addEventListener('click', function () { if (state.week < maxWeek) { state.week++; paintDays(); } });

    $('[data-continue]').addEventListener('click', function () {
      if (!state.date || !state.time) { $('[data-time-error]').hidden = false; return; }
      b.date = state.date; b.time = state.time; b.stylist = sel.value;
      store.set('ms_booking', b);
      location.href = 'details.html';
    });
    paintDays(); paintSlots();
  }

  /* ---------- details (account) ---------- */
  function validDob(v) {
    var m = v.trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (!m) return false;
    var day = +m[1], month = +m[2], year = +m[3];
    if (month < 1 || month > 12 || day < 1) return false;
    var dim = new Date(year, month, 0).getDate();
    var nowY = new Date().getFullYear();
    return day <= dim && year >= 1900 && year <= nowY;
  }

  function initDetails() {
    var b = store.get('ms_booking', null);
    if (!b || !SERVICES[b.service] || !b.date || !b.time) { location.replace(b && b.service ? 'time.html' : 'services.html'); return; }
    var svc = SERVICES[b.service];
    $('[data-chosen-name]').textContent = svc.name;
    $('[data-chosen-meta]').textContent = shortDate(parseYmd(b.date)) + ' at ' + b.time + ' · ' + svc.mins + ' min · ' + priceText(svc, b.stylist);

    var loginToggle = $('[data-login-toggle]');
    loginToggle.addEventListener('click', function (e) {
      e.preventDefault();
      var box = $('[data-login-box]');
      box.hidden = !box.hidden;
    });
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('[data-login-error]');
      err.hidden = false;
      err.textContent = 'We couldn\'t find a Marlowe account for that email. Create one below.';
    });

    var form = $('#accountForm');
    function setErr(name, msg) {
      var input = form.elements[name];
      var field = input.closest('.field') || input.closest('.check');
      var old = field.querySelector('.err');
      if (old) old.remove();
      field.classList.toggle('bad', !!msg);
      if (msg) {
        var s = document.createElement('span'); s.className = 'err'; s.textContent = msg; field.appendChild(s);
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return (form.elements[n].value || '').trim(); };
      var errs = {};
      if (!v('firstName')) errs.firstName = 'Enter your first name.';
      if (!v('lastName')) errs.lastName = 'Enter your last name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errs.email = 'Enter a valid email address.';
      if (v('mobile').replace(/\D/g, '').length < 7) errs.mobile = 'Enter a valid mobile number.';
      if (!validDob(v('dob'))) errs.dob = 'Enter a valid date of birth.';
      if (form.elements.password.value.length < 8) errs.password = 'Use at least 8 characters.';
      if (form.elements.password2.value !== form.elements.password.value || !form.elements.password2.value) errs.password2 = 'Passwords don\'t match.';
      if (!form.elements.policy.checked) errs.policy = 'Please accept the booking policy.';
      ['firstName', 'lastName', 'email', 'mobile', 'dob', 'password', 'password2', 'policy'].forEach(function (n) { setErr(n, errs[n] || ''); });
      if (Object.keys(errs).length) {
        var firstBad = form.querySelector('.bad input');
        if (firstBad) firstBad.focus();
        return;
      }
      var btn = $('[data-proceed]');
      btn.disabled = true; btn.textContent = 'Confirming…';
      setTimeout(function () {
        store.set('ms_account', { firstName: v('firstName'), lastName: v('lastName'), email: v('email'), mobile: v('mobile') });
        b.confirmed = true; b.ref = 'MS-' + (4800 + (hash(b.date + b.time) % 180));
        store.set('ms_booking', b);
        location.href = 'booked.html';
      }, 700);
    });
  }

  /* ---------- confirmation ---------- */
  function initBooked() {
    var b = store.get('ms_booking', null);
    var acc = store.get('ms_account', null);
    if (!b || !b.confirmed || !acc) {
      document.title = 'No booking found, Marlowe Studio';
      $('[data-booked]').innerHTML = '<h1>No booking found</h1><p class="lead">We couldn\'t find a confirmed appointment in this session.</p>' +
        '<a class="btn" href="services.html">Book an appointment</a>';
      return;
    }
    var svc = SERVICES[b.service], d = parseYmd(b.date);
    $('[data-when]').textContent = longDate(d) + ' at ' + b.time;
    $('[data-email]').textContent = acc.email;
    $('[data-t-service]').textContent = svc.name + ' · ' + svc.mins + ' min';
    $('[data-t-date]').textContent = longDate(d) + ' ' + d.getFullYear();
    $('[data-t-time]').textContent = b.time;
    $('[data-t-stylist]').textContent = (STYLISTS[b.stylist] || STYLISTS.any).name;
    $('[data-t-price]').textContent = priceText(svc, b.stylist) + (svc.from ? ' (confirmed at your consultation)' : '');
    $('[data-t-ref]').textContent = b.ref;
    var cal = $('[data-cal]');
    cal.addEventListener('click', function () { cal.textContent = 'Saved to calendar'; });
  }

  var page = document.body.getAttribute('data-page');
  appPromo();
  if (page === 'services') initServices();
  if (page === 'time') initTime();
  if (page === 'details') initDetails();
  if (page === 'booked') initBooked();
})();
