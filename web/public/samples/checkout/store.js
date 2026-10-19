/* Larkspur Supply, demo store for FiveUsers. State lives in sessionStorage. No real payments. */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var store = {
    get: function (k, fallback) {
      try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return '$' + n.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  /* ---------- catalog ---------- */
  var C = {
    BON: { name: 'Bone', hex: '#ECE5D6' }, BLK: { name: 'Black', hex: '#262523' }, HTH: { name: 'Heather', hex: '#A3A19C' },
    HRB: { name: 'Harbor', hex: '#2F67B1' }, MOS: { name: 'Moss', hex: '#6B7A4A' }, OAT: { name: 'Oat', hex: '#D8C8A8' },
    RST: { name: 'Rust', hex: '#A2502E' }, SLT: { name: 'Slate', hex: '#5F6B77' }, CHR: { name: 'Charcoal', hex: '#3C3B39' },
    FOR: { name: 'Forest', hex: '#2F4A3A' }, TOB: { name: 'Tobacco', hex: '#8A5A33' }, OLV: { name: 'Olive', hex: '#6E6A3C' },
    CLY: { name: 'Clay', hex: '#B9785A' }
  };
  var PRODUCTS = [
    { id: 'everyday-tee', sku: 'EVT', name: 'The Everyday Tee', price: 28, type: 'tee', isNew: true,
      colors: ['BON', 'BLK', 'HTH', 'HRB', 'MOS'], sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], soldOut: ['XXL'],
      desc: 'Our most-worn shirt, re-cut for this season. A slightly boxy fit in 240 gsm organic cotton jersey that holds its shape wash after wash, with a ribbed crew neck that won\'t stretch out. Garment-dyed for a soft, lived-in hand from the first wear. Pairs with everything you already own.' },
    { id: 'pocket-tee', sku: 'HPT', name: 'Heavyweight Pocket Tee', price: 36, type: 'pocket',
      colors: ['OAT', 'BLK', 'RST'], sizes: ['S', 'M', 'L', 'XL'], soldOut: [],
      desc: 'A dense 300 gsm workwear tee with a reinforced chest pocket, side vents and a slightly dropped shoulder.' },
    { id: 'long-sleeve-tee', sku: 'LST', name: 'Long-Sleeve Rib Tee', price: 34, type: 'longsleeve',
      colors: ['BON', 'SLT', 'BLK'], sizes: ['XS', 'S', 'M', 'L', 'XL'], soldOut: ['XS'],
      desc: 'A fine rib knit with long cuffs, cut close to the body for layering under shirts and knitwear.' },
    { id: 'merino-crew', sku: 'MCR', name: 'Merino Crew', price: 98, type: 'crew',
      colors: ['OAT', 'FOR', 'CHR'], sizes: ['S', 'M', 'L', 'XL'], soldOut: [],
      desc: 'Extra-fine merino in a classic crew. Warm without the bulk, and it doesn\'t itch.' },
    { id: 'canvas-overshirt', sku: 'COS', name: 'Canvas Overshirt', price: 118, type: 'overshirt',
      colors: ['TOB', 'OLV'], sizes: ['S', 'M', 'L', 'XL'], soldOut: [],
      desc: 'Washed cotton canvas with two chest pockets and corozo buttons. A shirt that works as a light jacket.' },
    { id: 'loopback-hoodie', sku: 'LBH', name: 'Loopback Hoodie', price: 84, type: 'hoodie',
      colors: ['HTH', 'BLK', 'CLY'], sizes: ['XS', 'S', 'M', 'L', 'XL'], soldOut: [],
      desc: 'Midweight loopback cotton with a double-layer hood and a roomy front pocket.' }
  ];
  function product(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }

  /* ---------- illustrations ---------- */
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function lum(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }
  function bgFor(hex) { return lum(hex) > 0.72 ? '#D9D1C3' : '#E9E3D8'; }
  var uid = 0;

  var NECK_FRONT = 'C166 82 182 90 200 90 C218 90 234 82 250 64';
  var NECK_BACK = 'C166 71 182 75 200 75 C218 75 234 71 250 64';
  function bodyPath(type, back) {
    var neck = back ? NECK_BACK : NECK_FRONT;
    if (type === 'tee' || type === 'pocket') {
      return 'M150 64 ' + neck + ' L304 84 L354 132 L322 182 L292 162 L295 384 C258 393 142 393 105 384 L108 162 L78 182 L46 132 L96 84 Z';
    }
    return 'M150 64 ' + neck + ' L306 86 C320 94 328 108 332 126 L360 336 L326 344 L292 180 L295 384 C258 393 142 393 105 384 L108 180 L74 344 L40 336 L68 126 C72 108 80 94 94 86 Z';
  }

  function garment(type, hex, opts) {
    opts = opts || {};
    var back = !!opts.back;
    var id = 'g' + (++uid);
    var dark = shade(hex, -0.22), darker = shade(hex, -0.35), light = shade(hex, 0.12);
    var long = type !== 'tee' && type !== 'pocket';
    var d = bodyPath(type, back);
    var s = '<svg viewBox="0 0 400 440" role="img" aria-label="' + esc(opts.label || 'Product image') + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>';
    if (type === 'hoodie') {
      s += '<path d="M134 80 C118 30 160 6 200 6 C240 6 282 30 266 80 C242 66 158 66 134 80 Z" fill="' + dark + '"/>';
    }
    s += '<path d="' + d + '" fill="' + hex + '" stroke="' + dark + '" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<path d="' + d + '" fill="url(#' + id + ')"/>';
    // soft folds
    s += '<path d="M148 200 C158 262 150 320 158 378" stroke="#000" stroke-opacity=".025" stroke-width="22" fill="none" stroke-linecap="round"/>';
    s += '<path d="M252 214 C246 270 256 320 248 376" stroke="#fff" stroke-opacity=".035" stroke-width="20" fill="none" stroke-linecap="round"/>';
    // hem stitching
    s += '<path d="M108 372 C146 380 254 380 292 372" stroke="' + darker + '" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="4 4" fill="none"/>';
    if (!long) {
      s += '<path d="M55 127 L87 176 M345 127 L313 176" stroke="' + darker + '" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="4 4"/>';
    } else {
      s += '<path d="M43 321 L77 329 M357 321 L323 329" stroke="' + darker + '" stroke-width="2" stroke-opacity=".6"/>';
      s += '<path d="M44 314 L78 322 M356 314 L322 322" stroke="' + darker + '" stroke-width="1" stroke-opacity=".35"/>';
    }
    if (type === 'crew') {
      s += '<path d="M105 384 C142 393 258 393 295 384 L295 360 C258 368 142 368 105 360 Z" fill="' + shade(hex, -0.08) + '" stroke="' + dark + '" stroke-width="1"/>';
      for (var x = 112; x < 292; x += 9) s += '<path d="M' + x + ' 364 L' + x + ' 386" stroke="' + darker + '" stroke-opacity=".25" stroke-width="1"/>';
    }
    if (type === 'hoodie') {
      s += '<path d="M105 384 C142 393 258 393 295 384 L295 364 C258 372 142 372 105 364 Z" fill="' + shade(hex, -0.08) + '"/>';
      s += '<path d="M138 292 L262 292 L282 356 C240 362 160 362 118 356 Z" fill="none" stroke="' + dark + '" stroke-width="2"/>';
      s += '<path d="M150 64 C162 104 238 104 250 64 C236 84 164 84 150 64 Z" fill="' + darker + '"/>';
      s += '<path d="M186 96 L182 168 M214 96 L218 168" stroke="' + light + '" stroke-width="3" stroke-linecap="round"/>';
    } else if (type === 'overshirt') {
      s += '<path d="M150 62 L200 108 L178 132 L132 86 Z M250 62 L200 108 L222 132 L268 86 Z" fill="' + shade(hex, -0.06) + '" stroke="' + dark + '" stroke-width="1.5" stroke-linejoin="round"/>';
      s += '<path d="M200 110 L200 388" stroke="' + dark + '" stroke-width="2"/>';
      for (var y = 150; y < 380; y += 48) s += '<circle cx="207" cy="' + y + '" r="4.5" fill="' + darker + '"/>';
      s += '<path d="M128 168 h44 v50 h-44 Z M228 168 h44 v50 h-44 Z" fill="none" stroke="' + dark + '" stroke-width="1.6"/>';
      s += '<path d="M128 168 h44 v14 h-44 Z M228 168 h44 v14 h-44 Z" fill="' + shade(hex, -0.06) + '" stroke="' + dark + '" stroke-width="1.6"/>';
    } else {
      if (!back) s += '<path d="M150 64 C166 74 184 78 200 78 C216 78 234 74 250 64 C234 61 216 60 200 60 C184 60 166 61 150 64 Z" fill="' + darker + '"/>';
      s += '<path d="M150 64 ' + (back ? NECK_BACK : NECK_FRONT) + '" stroke="' + dark + '" stroke-width="' + (type === 'crew' ? 12 : 8) + '" fill="none" stroke-linecap="round"/>';
    }
    if (type === 'pocket' && !back) {
      s += '<path d="M228 148 h46 v46 c0 6 -4 10 -10 10 h-26 c-6 0 -10 -4 -10 -10 Z" fill="' + shade(hex, -0.04) + '" stroke="' + dark + '" stroke-width="1.6"/>';
      s += '<path d="M228 156 h46" stroke="' + darker + '" stroke-opacity=".5" stroke-dasharray="3 3"/>';
    }
    if (back) {
      s += '<rect x="186" y="84" width="28" height="14" rx="1" fill="#F4F1EB" stroke="' + dark + '" stroke-width=".8"/>' +
        '<path d="M191 91 h18" stroke="#1C1B19" stroke-width="1.6" stroke-opacity=".7"/>';
    }
    return s + '</svg>';
  }

  function fabric(hex, label) {
    var id = 'k' + (++uid);
    var dark = shade(hex, -0.14), light = shade(hex, 0.08);
    return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><pattern id="' + id + '" width="12" height="14" patternUnits="userSpaceOnUse">' +
      '<path d="M0 0 L6 10 L12 0" fill="none" stroke="' + dark + '" stroke-width="2.4"/>' +
      '<path d="M0 4 L6 14 L12 4" fill="none" stroke="' + light + '" stroke-width="1"/></pattern></defs>' +
      '<rect width="400" height="400" fill="' + hex + '"/><rect width="400" height="400" fill="url(#' + id + ')"/>' +
      '<path d="M-20 60 C120 30 260 50 420 20 L420 -20 L-20 -20 Z" fill="' + shade(hex, -0.18) + '"/>' +
      '<path d="M-20 60 C120 30 260 50 420 20" stroke="' + shade(hex, -0.3) + '" stroke-width="3" stroke-dasharray="6 5" fill="none" transform="translate(0 14)"/>' +
      '<g transform="translate(150 96) rotate(-3)"><rect width="104" height="44" fill="#F4F1EB" stroke="#CFC6B6"/>' +
      '<text x="52" y="20" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="11" letter-spacing="2.4" font-weight="700" fill="#1C1B19">LARKSPUR</text>' +
      '<text x="52" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" letter-spacing="1.6" fill="#5E5951">SUPPLY · PORTO</text></g>' +
      '</svg>';
  }

  function folded(hex, label) {
    var dark = shade(hex, -0.2), darker = shade(hex, -0.34);
    return '<svg viewBox="0 0 400 440" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="200" cy="356" rx="150" ry="16" fill="#000" fill-opacity=".08"/>' +
      '<path d="M86 132 L314 132 L322 340 L78 340 Z" fill="' + hex + '" stroke="' + dark + '" stroke-width="1.5"/>' +
      '<path d="M86 132 L120 132 L104 340 L78 340 Z M314 132 L280 132 L296 340 L322 340 Z" fill="#000" fill-opacity=".05"/>' +
      '<path d="M160 132 C170 160 230 160 240 132" fill="' + darker + '" stroke="' + dark + '" stroke-width="7"/>' +
      '<path d="M86 300 L322 300" stroke="#000" stroke-opacity=".07" stroke-width="10"/>' +
      '<path d="M84 326 L320 326" stroke="' + darker + '" stroke-opacity=".5" stroke-dasharray="4 4"/>' +
      '</svg>';
  }

  function swatchImg(hex) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="' + hex + '" stroke="#00000022" stroke-width="1"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ---------- bag ---------- */
  function getBag() { return store.get('ls_bag', []); }
  function setBag(bag) { store.set('ls_bag', bag); renderBadge(); }
  function bagCount() { return getBag().reduce(function (n, l) { return n + l.qty; }, 0); }
  function bagSubtotal() {
    return getBag().reduce(function (sum, l) { var p = product(l.id); return sum + (p ? p.price * l.qty : 0); }, 0);
  }
  function variantCode(l) { var p = product(l.id); return (p ? p.sku : 'SKU') + '-' + l.color + '-' + l.size; }
  function renderBadge() {
    var n = bagCount();
    $$('[data-bag-count]').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
  }

  function lineThumb(l) {
    var p = product(l.id), c = C[l.color];
    return garment(p.type, c.hex, { label: p.name });
  }

  function renderDrawer() {
    var holder = $('[data-drawer-items]');
    if (!holder) return;
    var bag = getBag();
    if (!bag.length) {
      holder.innerHTML = '<p class="empty-bag">Your bag is empty.</p>';
    } else {
      holder.innerHTML = bag.map(function (l, i) {
        var p = product(l.id);
        return '<div class="line">' +
          '<div class="line-img" style="background:' + bgFor(C[l.color].hex) + '">' + lineThumb(l) + '</div>' +
          '<div><div class="line-name">' + esc(p.name) + '</div>' +
          '<div class="line-var">SKU variant: ' + variantCode(l) + '</div>' +
          '<div class="qty"><button type="button" data-qty="-1" data-i="' + i + '">−</button><span>' + l.qty + '</span>' +
          '<button type="button" data-qty="1" data-i="' + i + '">+</button></div></div>' +
          '<div class="line-price">' + money(p.price * l.qty) + '<button type="button" class="link-btn line-remove" data-remove="' + i + '">Remove</button></div>' +
          '</div>';
      }).join('');
    }
    $('[data-drawer-subtotal]').textContent = money(bagSubtotal());
    $('[data-drawer-checkout]').style.display = bag.length ? '' : 'none';
    $('[data-drawer-title]').textContent = 'Your bag (' + bagCount() + ')';
  }

  function mountDrawer() {
    var wrap = document.createElement('div');
    wrap.className = 'drawer-backdrop';
    wrap.setAttribute('data-drawer', '');
    wrap.innerHTML =
      '<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="bagTitle">' +
      '<div class="drawer-head"><h2 id="bagTitle" data-drawer-title>Your bag</h2>' +
      '<button type="button" class="icon-btn" aria-label="Close bag" data-close-bag><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="#1C1B19" stroke-width="1.6" stroke-linecap="round"/></svg></button></div>' +
      '<div class="drawer-items" data-drawer-items></div>' +
      '<div class="drawer-foot"><div class="row"><span>Subtotal</span><span data-drawer-subtotal>$0.00</span></div>' +
      '<p class="small">Taxes calculated at checkout.</p>' +
      '<a class="btn btn-block" href="checkout.html" data-drawer-checkout>Checkout</a>' +
      '<button type="button" class="link-btn" data-close-bag>Continue shopping</button></div>' +
      '</aside>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-close-bag]')) { wrap.classList.remove('open'); return; }
      var q = e.target.closest('[data-qty]');
      if (q) {
        var bag = getBag(), i = +q.getAttribute('data-i');
        bag[i].qty += +q.getAttribute('data-qty');
        if (bag[i].qty < 1) bag.splice(i, 1);
        setBag(bag); renderDrawer(); return;
      }
      var r = e.target.closest('[data-remove]');
      if (r) { var b2 = getBag(); b2.splice(+r.getAttribute('data-remove'), 1); setBag(b2); renderDrawer(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') wrap.classList.remove('open'); });
    $$('[data-open-bag]').forEach(function (b) {
      b.addEventListener('click', function () { renderDrawer(); wrap.classList.add('open'); });
    });
  }

  function mountHeaderExtras() {
    var menu = $('[data-menu]');
    if (menu) {
      menu.addEventListener('click', function () {
        var nav = $('.mobile-nav');
        nav.hidden = !nav.hidden;
        menu.setAttribute('aria-expanded', nav.hidden ? 'false' : 'true');
      });
    }
    var search = $('[data-search]');
    if (search) {
      search.addEventListener('click', function () {
        var row = $('.search-row');
        if (row) { row.remove(); return; }
        row = document.createElement('div');
        row.className = 'search-row';
        row.innerHTML = '<div class="wrap"><input type="search" aria-label="Search the store" placeholder="Search tees, knitwear, outerwear…"></div>';
        $('.site-header').appendChild(row);
        $('input', row).focus();
        $('input', row).addEventListener('keydown', function (e) { if (e.key === 'Enter') location.href = 'index.html#shop'; });
      });
    }
    var acct = $('[data-account]');
    if (acct) {
      acct.addEventListener('click', function () {
        var pop = $('.popover');
        if (pop) { pop.remove(); return; }
        pop = document.createElement('div');
        pop.className = 'popover';
        pop.innerHTML = '<p><strong>Accounts are coming soon.</strong></p><p style="color:#5E5951">You can check out as a guest in the meantime.</p>';
        $('.site-header').appendChild(pop);
      });
    }
  }

  /* ---------- pages ---------- */
  function initHome() {
    var grid = $('[data-grid]');
    grid.innerHTML = PRODUCTS.map(function (p) {
      var c = C[p.colors[0]];
      return '<a class="card" href="product.html?id=' + p.id + '">' +
        '<div class="card-img" style="background:' + bgFor(c.hex) + '">' + garment(p.type, c.hex, { label: p.name }) + '</div>' +
        '<div class="card-name"><span>' + esc(p.name) + (p.isNew ? '<span class="badge-new">New colors</span>' : '') + '</span><span>' + money(p.price).replace('.00', '') + '</span></div>' +
        '<div class="card-meta">' + p.colors.length + ' colors</div></a>';
    }).join('');
    var hero = $('[data-hero-art]');
    if (hero) hero.innerHTML = garment('tee', C.HRB.hex, { label: 'The Everyday Tee' });
  }

  function initProduct() {
    var params = new URLSearchParams(location.search);
    var p = product(params.get('id')) || PRODUCTS[0];
    document.title = p.name + ', Larkspur Supply';
    var state = { color: p.colors[0], size: null };

    $('[data-crumb]').textContent = p.name;
    $('[data-name]').textContent = p.name;
    $('[data-price]').textContent = money(p.price).replace('.00', '');
    $('[data-desc]').textContent = p.desc;

    function paintGallery() {
      var hex = C[state.color].hex, bg = bgFor(hex);
      var g = $('[data-gallery]');
      g.innerHTML =
        '<figure style="background:' + bg + '">' + garment(p.type, hex, { label: p.name + ', front' }) + '</figure>' +
        '<figure style="background:' + bg + '">' + garment(p.type, hex, { label: p.name + ', back', back: true }) + '</figure>' +
        '<figure class="fill">' + fabric(hex, p.name + ', fabric detail') + '</figure>' +
        '<figure style="background:' + shade(bg, -0.04) + '">' + folded(hex, p.name + ', folded') + '</figure>';
    }

    var sw = $('[data-swatches]');
    sw.innerHTML = p.colors.map(function (code) {
      return '<button type="button" class="swatch" data-color="' + code + '"><img src="' + swatchImg(C[code].hex) + '"></button>';
    }).join('');
    function paintSwatches() {
      $$('.swatch', sw).forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-color') === state.color); });
      $('[data-color-name]').textContent = C[state.color].name;
    }
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch');
      if (!b) return;
      state.color = b.getAttribute('data-color');
      paintSwatches(); paintGallery();
    });

    var sz = $('[data-sizes]');
    sz.innerHTML = p.sizes.map(function (s) {
      var out = p.soldOut.indexOf(s) !== -1;
      return '<button type="button" class="size" data-size="' + s + '"' + (out ? ' disabled' : '') + '>' + s + '</button>';
    }).join('');
    sz.addEventListener('click', function (e) {
      var b = e.target.closest('.size');
      if (!b || b.disabled) return;
      state.size = b.getAttribute('data-size');
      $$('.size', sz).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      $('[data-size-error]').hidden = true;
    });

    $('[data-add]').addEventListener('click', function () {
      if (!state.size) { $('[data-size-error]').hidden = false; return; }
      var bag = getBag();
      var hit = null;
      bag.forEach(function (l) { if (l.id === p.id && l.color === state.color && l.size === state.size) hit = l; });
      if (hit) hit.qty += 1; else bag.push({ id: p.id, color: state.color, size: state.size, qty: 1 });
      setBag(bag);
    });

    var more = $('[data-more]');
    if (more) {
      more.innerHTML = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 3).map(function (x) {
        var c = C[x.colors[0]];
        return '<a class="card" href="product.html?id=' + x.id + '"><div class="card-img" style="background:' + bgFor(c.hex) + '">' +
          garment(x.type, c.hex, { label: x.name }) + '</div><div class="card-name"><span>' + esc(x.name) + '</span><span>' +
          money(x.price).replace('.00', '') + '</span></div></a>';
      }).join('');
    }
    paintSwatches(); paintGallery();
  }

  /* checkout summary */
  function fees(method) {
    var sub = bagSubtotal();
    var ship = sub >= 75 ? 0 : (method === 'express' ? 19.95 : 9.95);
    var handling = 3.5;
    var tax = Math.round(sub * 0.09 * 100) / 100;
    return { sub: sub, ship: ship, handling: handling, tax: tax, total: Math.round((sub + ship + handling + tax) * 100) / 100 };
  }
  function summaryHTML(withFees, method) {
    var bag = getBag();
    var f = fees(method);
    var lines = bag.map(function (l) {
      var p = product(l.id);
      return '<div class="sum-line"><div class="sum-img">' + lineThumb(l) + '<em>' + l.qty + '</em></div>' +
        '<div><div class="sum-name">' + esc(p.name) + '</div><div class="sum-var">' + variantCode(l) + '</div></div>' +
        '<div>' + money(p.price * l.qty) + '</div></div>';
    }).join('');
    var rows = '<div><span>Subtotal</span><span>' + money(f.sub) + '</span></div>';
    var total = f.sub;
    if (withFees) {
      rows += '<div><span>Shipping</span><span>' + (f.ship ? money(f.ship) : 'Free') + '</span></div>' +
        '<div><span>Handling fee</span><span>' + money(f.handling) + '</span></div>' +
        '<div><span>Estimated tax</span><span>' + money(f.tax) + '</span></div>';
      total = f.total;
    }
    return lines + '<div class="sum-rows">' + rows + '</div>' +
      '<div class="sum-total"><span>Total</span><span><small>USD</small><strong>' + money(total) + '</strong></span></div>';
  }
  function paintSummary(withFees, method) {
    var html = summaryHTML(withFees, method);
    $$('[data-summary]').forEach(function (el) { el.innerHTML = html; });
    var t = withFees ? fees(method).total : bagSubtotal();
    $$('[data-summary-total]').forEach(function (el) { el.textContent = money(t); });
  }
  function emptyCheckout() {
    var main = $('.co-main');
    main.innerHTML = '<h1>Your bag is empty</h1><p>Add something to your bag before checking out.</p><a class="btn" href="index.html">Continue shopping</a>';
  }

  function initCheckout() {
    if (!getBag().length) { emptyCheckout(); paintSummary(false); return; }
    paintSummary(false);
    var saved = store.get('ls_shipping', null);
    var form = $('#shippingForm');
    if (saved) Object.keys(saved).forEach(function (k) { var el = form.elements[k]; if (el && el.type !== 'checkbox') el.value = saved[k]; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return (form.elements[n].value || '').trim(); };
      var bad = [];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) bad.push('email');
      ['firstName', 'lastName', 'address', 'city'].forEach(function (n) { if (!v(n)) bad.push(n); });
      if (!v('state')) bad.push('state');
      if (!/^[A-Za-z0-9 -]{3,10}$/.test(v('zip'))) bad.push('zip');
      if (v('phone').replace(/\D/g, '').length < 7) bad.push('phone');

      $$('.f', form).forEach(function (f) { f.classList.remove('invalid'); });
      bad.forEach(function (n) { var el = form.elements[n]; if (el) el.closest('.f').classList.add('invalid'); });
      var alert = $('#checkoutAlert');
      if (bad.length) { alert.hidden = false; return; }
      alert.hidden = true;
      var data = {};
      ['email', 'firstName', 'lastName', 'address', 'apt', 'city', 'state', 'zip', 'phone'].forEach(function (n) { data[n] = v(n); });
      store.set('ls_shipping', data);
      location.href = 'payment.html';
    });
  }

  function cardProblems(f) {
    var out = {};
    var digits = f.number.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(digits)) out.cardNumber = 'Enter a valid card number.';
    if (!f.name.trim()) out.cardName = 'Enter the name on the card.';
    var m = f.exp.replace(/\s/g, '').match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
    if (!m) out.cardExpiry = 'Enter a valid expiration date.';
    else {
      var month = +m[1], year = +m[2];
      if (year < 100) year += 2000;
      var now = new Date();
      if (month < 1 || month > 12) out.cardExpiry = 'Enter a valid expiration date.';
      else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) out.cardExpiry = 'This card has expired.';
    }
    if (!/^\d{3,4}$/.test(f.cvc.trim())) out.cardCvc = 'Enter the security code.';
    return out;
  }

  function initPayment() {
    var ship = store.get('ls_shipping', null);
    if (!getBag().length || !ship) {
      if (!getBag().length) { emptyCheckout(); paintSummary(false); return; }
      location.replace('checkout.html'); return;
    }
    $('[data-ship-contact]').textContent = ship.email;
    $('[data-ship-to]').textContent = [ship.address, ship.apt, ship.city, ship.state + ' ' + ship.zip].filter(Boolean).join(', ');
    var form = $('#paymentForm');
    function method() { var r = form.querySelector('input[name="shipMethod"]:checked'); return r ? r.value : 'standard'; }
    paintSummary(true, method());
    $$('input[name="shipMethod"]', form).forEach(function (r) { r.addEventListener('change', function () { paintSummary(true, method()); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var probs = cardProblems({
        number: form.elements.cardNumber.value, name: form.elements.cardName.value,
        exp: form.elements.cardExpiry.value, cvc: form.elements.cardCvc.value
      });
      ['cardNumber', 'cardName', 'cardExpiry', 'cardCvc'].forEach(function (n) {
        var holder = form.elements[n].closest('.f');
        var msg = holder.querySelector('.msg');
        if (msg) msg.remove();
        holder.classList.toggle('invalid', !!probs[n]);
        if (probs[n]) {
          msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = probs[n]; holder.appendChild(msg);
        }
      });
      if (Object.keys(probs).length) return;
      var btn = $('#payBtn');
      btn.disabled = true; btn.textContent = 'Processing…';
      var f = fees(method());
      var digits = form.elements.cardNumber.value.replace(/\D/g, '');
      setTimeout(function () {
        store.set('ls_order', {
          number: 1042, items: getBag(), shipping: ship, method: method(), fees: f,
          last4: digits.slice(-4), placedAt: Date.now()
        });
        store.set('ls_bag', []);
        location.href = 'confirmed.html';
      }, 900);
    });
  }

  function initConfirmed() {
    var o = store.get('ls_order', null);
    var main = $('[data-confirm]');
    if (!o) {
      document.title = 'No recent order, Larkspur Supply';
      main.innerHTML = '<h1>No recent order</h1><p class="lead">We couldn\'t find an order from this session.</p><a class="btn" href="index.html">Continue shopping</a>';
      return;
    }
    $('[data-first]').textContent = o.shipping.firstName;
    $('[data-email]').textContent = o.shipping.email;
    $('[data-address]').innerHTML = esc(o.shipping.firstName + ' ' + o.shipping.lastName) + '<br>' + esc(o.shipping.address) +
      (o.shipping.apt ? ', ' + esc(o.shipping.apt) : '') + '<br>' + esc(o.shipping.city + ', ' + o.shipping.state + ' ' + o.shipping.zip);
    var d = new Date(); var add = o.method === 'express' ? 2 : 7;
    while (add > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) add--; }
    $('[data-eta]').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('[data-method]').textContent = (o.method === 'express' ? 'Express' : 'Standard') + ' shipping · Card ending ' + o.last4;
    $('[data-items]').innerHTML = o.items.map(function (l) {
      var p = product(l.id);
      return '<div class="sum-line"><div class="sum-img">' + lineThumb(l) + '<em>' + l.qty + '</em></div>' +
        '<div><div class="sum-name">' + esc(p.name) + '</div><div class="sum-var">' + C[l.color].name + ' / ' + l.size + '</div></div>' +
        '<div>' + money(p.price * l.qty) + '</div></div>';
    }).join('') +
      '<div class="sum-rows"><div><span>Subtotal</span><span>' + money(o.fees.sub) + '</span></div>' +
      '<div><span>Shipping</span><span>' + (o.fees.ship ? money(o.fees.ship) : 'Free') + '</span></div>' +
      '<div><span>Handling fee</span><span>' + money(o.fees.handling) + '</span></div>' +
      '<div><span>Tax</span><span>' + money(o.fees.tax) + '</span></div></div>' +
      '<div class="sum-total"><span>Total paid</span><span><small>USD</small><strong>' + money(o.fees.total) + '</strong></span></div>';
  }

  /* ---------- boot ---------- */
  var page = document.body.getAttribute('data-page');
  if (page === 'home' || page === 'product') { mountDrawer(); mountHeaderExtras(); renderBadge(); }
  if (page === 'home') initHome();
  if (page === 'product') initProduct();
  if (page === 'checkout') initCheckout();
  if (page === 'payment') initPayment();
  if (page === 'confirmed') initConfirmed();
})();
