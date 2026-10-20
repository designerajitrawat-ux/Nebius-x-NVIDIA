/* Fernhill: demo signup flow for FiveUsers. All state lives in sessionStorage. */
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
  function setText(sel, text) { $$(sel).forEach(function (el) { el.textContent = text; }); }

  var PLANS = {
    free: { name: 'Fernhill Free', short: 'Free plan', paid: false, price: 0,
      meta: 'Free forever. No card needed.',
      perks: ['Up to 3 projects', 'Up to 5 members', 'Boards and lists'] },
    starter: { name: 'Starter plan', short: 'Starter trial', paid: true, price: 8,
      perks: ['Up to 10 projects', 'Boards and lists', 'Up to 10 members', 'Email support'] },
    team: { name: 'Team plan', short: 'Team trial', paid: true, price: 14,
      perks: ['Unlimited projects', 'Timelines and dependencies', 'Guest access for clients', 'Automated Friday updates'] },
    business: { name: 'Business plan', short: 'Business trial', paid: true, price: 24,
      perks: ['Everything in Team', 'Single sign-on (SSO)', 'Portfolio reporting', 'Audit log and admin roles'] }
  };

  /* ---------- shared: mobile menu ---------- */
  $$('[data-menu-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var menu = $('.mobile-menu');
      if (!menu) return;
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- shared: cookie banner (marketing + signup pages) ---------- */
  function cookieBanner() {
    if (store.get('fh_cookie_choice', null)) return;
    var bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<p>We use cookies to keep Fernhill working, remember your preferences and understand how our site is used. ' +
      'See our <a href="#">Cookie Policy</a>.</p>' +
      '<div class="cookie-prefs"><label><input type="checkbox" checked disabled> Essential</label>' +
      '<label><input type="checkbox" id="ckAnalytics" checked> Analytics</label>' +
      '<label><input type="checkbox" id="ckMarketing" checked> Marketing</label></div>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-marigold" data-ck="accept">Accept all</button>' +
      '<button type="button" class="btn btn-cookie-ghost" data-ck="prefs">Manage preferences</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck]');
      if (!b) return;
      if (b.getAttribute('data-ck') === 'prefs' && !bar.classList.contains('show-prefs')) {
        bar.classList.add('show-prefs');
        b.textContent = 'Save choices';
        return;
      }
      store.set('fh_cookie_choice', { at: Date.now(), kind: b.getAttribute('data-ck') });
      bar.remove();
    });
  }

  /* ---------- pricing ---------- */
  function initPricing() {
    var buttons = $$('.billing-toggle button');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var period = btn.getAttribute('data-period');
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $$('[data-monthly]').forEach(function (el) { el.textContent = el.getAttribute('data-' + period); });
        $$('[data-plan-link]').forEach(function (a) {
          var base = a.getAttribute('href').split('&')[0];
          a.setAttribute('href', period === 'yearly' ? base + '&billing=yearly' : base);
        });
      });
    });
  }

  /* ---------- signup ---------- */
  function cardError(num, exp, cvc) {
    var digits = num.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(digits)) return 'Enter a valid card number.';
    var m = exp.replace(/\s/g, '').match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
    if (!m) return 'Enter the card expiry date.';
    var month = parseInt(m[1], 10);
    var year = parseInt(m[2], 10);
    if (year < 100) year += 2000;
    var now = new Date();
    if (month < 1 || month > 12) return 'Enter the card expiry date.';
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Your card has expired.';
    if (!/^\d{3,4}$/.test(cvc.trim())) return 'Enter the 3-digit security code.';
    return '';
  }

  function initSignup() {
    var params = new URLSearchParams(location.search);
    var planKey = params.get('plan');
    if (!PLANS[planKey]) planKey = 'team';
    var plan = PLANS[planKey];
    var yearly = params.get('billing') === 'yearly';

    $('#asideTitle').textContent = plan.name;
    $('#pillPlan').textContent = plan.short;
    $('#asideMeta').textContent = plan.paid
      ? '14-day free trial, then $' + (yearly ? Math.round(plan.price * 0.8) : plan.price) + ' per user / month' + (yearly ? ', billed yearly.' : '.')
      : plan.meta;
    $('#asideList').innerHTML = plan.perks.map(function (p) { return '<li>' + p + '</li>'; }).join('');
    $('#payBlock').hidden = !plan.paid;

    var form = $('#signupForm');
    var errorEl = $('#formError');
    var submitBtn = $('#submitBtn');

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.hidden = true;

      var name = $('#fullName').value.trim();
      var email = $('#email').value.trim();
      var password = $('#password').value;
      var slug = $('#slug').value.trim().toLowerCase();
      var problems = [];

      if (!name) problems.push('Full name is required.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('Email is invalid.');
      if (!password) problems.push('Password is required.');
      if (!slug) problems.push('Slug is required.');
      else if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) problems.push('Invalid slug.');
      if (plan.paid) {
        var ce = cardError($('#cardNumber').value, $('#cardExpiry').value, $('#cardCvc').value);
        if (ce) problems.push(ce);
      }
      if (!$('#terms').checked) problems.push('Terms must be accepted.');

      if (problems.length) {
        showError('Please correct the following: ' + problems.join(' '));
        return;
      }

      // "Server-side" password check: the page re-renders and the form comes back empty.
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        var strong = password.length >= 10 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
        if (!strong) {
          form.reset();
          showError('Password must be at least 10 characters and include a number and a symbol.');
          return;
        }
        store.set('fh_account', {
          name: name, email: email, slug: slug, plan: planKey, createdAt: Date.now()
        });
        location.href = 'projects.html';
      }, 650);
    });
  }

  /* ---------- logged-in pages ---------- */
  function account() {
    return store.get('fh_account', null) || { name: '', email: '', slug: 'my-team', plan: 'free' };
  }
  function fillAccount() {
    var acc = account();
    var first = (acc.name || '').split(/\s+/)[0] || 'there';
    var initials = (acc.name || 'Me').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    var wsName = acc.slug ? acc.slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : 'My workspace';
    setText('[data-first-name]', first);
    setText('[data-me-initials]', initials);
    setText('[data-me-initials-av]', initials);
    setText('[data-ws-name]', wsName);
    setText('[data-ws-initial]', wsName.charAt(0).toUpperCase());
    setText('[data-ws-url]', 'fernhill.app/' + (acc.slug || 'my-team'));
    var plan = PLANS[acc.plan] || PLANS.free;
    setText('[data-plan-name]', plan.paid ? plan.short.replace('trial', 'trial · 14 days left') : 'Free plan');
  }

  function initProjects() {
    fillAccount();
    var modal = $('#projectModal');
    var form = $('#projectForm');
    function open() {
      if (modal.classList.contains('open')) return;
      modal.classList.add('open');
      $('#projectName').focus();
    }
    function close() { modal.classList.remove('open'); }
    $('#newProjectBtn').addEventListener('click', open);
    $$('[data-close-modal]').forEach(function (b) { b.addEventListener('click', close); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    function fieldError(input, msg) {
      var holder = input.closest('.field');
      var existing = holder.querySelector('.field-error');
      if (existing) existing.remove();
      if (!msg) return;
      var p = document.createElement('span');
      p.className = 'field-error';
      p.textContent = msg;
      holder.appendChild(p);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = $('#projectName');
      var keyEl = $('#projectKey');
      var name = nameEl.value.trim();
      var key = keyEl.value.trim().toUpperCase();
      var ok = true;
      fieldError(nameEl, name ? '' : 'Project name is required.');
      if (!name) ok = false;
      if (!key) { fieldError(keyEl, 'Key is required.'); ok = false; }
      else if (!/^[A-Z]{2,5}$/.test(key)) { fieldError(keyEl, 'Key must be 2–5 letters.'); ok = false; }
      else fieldError(keyEl, '');
      if (!ok) return;
      var tpl = (form.querySelector('input[name="template"]:checked') || {}).value || 'Blank';
      store.set('fh_project', { name: name, key: key, template: tpl, createdAt: Date.now() });
      location.href = 'board.html';
    });
  }

  function initBoard() {
    fillAccount();
    var project = store.get('fh_project', null);
    if (!project) {
      document.title = 'Projects · Fernhill';
      $('#boardMain').innerHTML =
        '<h1>No project open</h1><p class="sub">You haven\'t created a project yet.</p>' +
        '<a class="btn btn-primary" href="projects.html">Go to Home</a>';
      $('[data-side-project]').innerHTML = '<p class="side-empty" style="margin:0">No projects</p>';
      return;
    }
    setText('[data-project-name]', project.name);
    setText('[data-project-key]', project.key);
    setText('[data-project-template]', project.template + ' template');
    $$('[data-task-id]').forEach(function (el) { el.textContent = project.key + '-' + el.getAttribute('data-task-id'); });
  }

  function initLogin() {
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#loginError');
      err.hidden = false;
      err.innerHTML = 'We couldn\'t find an account with that email. <a href="pricing.html">Create an account</a>';
    });
  }

  var page = document.body.getAttribute('data-page');
  if (page === 'home' || page === 'pricing' || page === 'signup' || page === 'login') cookieBanner();
  if (page === 'pricing') initPricing();
  if (page === 'signup') initSignup();
  if (page === 'projects') initProjects();
  if (page === 'board') initBoard();
  if (page === 'login') initLogin();
})();
