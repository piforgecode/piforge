/* PiForge webshop — single-page app met hash-routing (werkt op elke statische host) */
(function () {
  'use strict';
  const CFG = window.PIFORGE_CONFIG || {};
  const main = document.getElementById('main');
  let DATA = null;
  const IMG = (k) => `assets/img/${k}.jpg`;
  const eur = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Winkelwagen (bewaard in window.name, blijft staan bij herladen in hetzelfde tabblad) ---------- */
  const cart = {
    items: [],
    load() { try { const d = JSON.parse(window.name || '{}'); if (Array.isArray(d.piforgeCart)) this.items = d.piforgeCart; } catch (e) { /* leeg */ } },
    save() { try { window.name = JSON.stringify({ piforgeCart: this.items }); } catch (e) {} updateCount(); },
    add(line) {
      const key = lineKey(line);
      const found = this.items.find((i) => lineKey(i) === key);
      if (found) found.qty += line.qty; else this.items.push(line);
      this.save();
    },
    setQty(idx, q) { if (q < 1) this.items.splice(idx, 1); else this.items[idx].qty = Math.min(q, 10); this.save(); },
    clear() { this.items = []; this.save(); },
    count() { return this.items.reduce((a, i) => a + i.qty, 0); }
  };
  const lineKey = (l) => [l.id, l.ram, l.storage, l.os, (l.extras || []).slice().sort().join('+')].join('|');

  function linePrice(l) {
    const p = DATA.products.find((x) => x.id === l.id);
    if (!p) return 0;
    let price = p.price;
    const r = p.ram.find((x) => x.id === l.ram); if (r) price += r.add;
    const s = p.storage.find((x) => x.id === l.storage); if (s) price += s.add;
    (l.extras || []).forEach((eid) => { const e = (p.extras || []).find((x) => x.id === eid); if (e) price += e.add; });
    return price;
  }
  function totals(country) {
    const sub = cart.items.reduce((a, l) => a + linePrice(l) * l.qty, 0);
    const zone = DATA.shipping[country || 'NL'];
    const ship = sub === 0 ? 0 : (sub >= zone.freeFrom ? 0 : zone.cost);
    return { sub, ship, total: sub + ship, zone, btw: (sub + ship) - (sub + ship) / 1.21 };
  }
  function updateCount() {
    const el = document.querySelector('[data-cart-count]');
    const n = cart.count();
    el.textContent = n; el.dataset.zero = String(n === 0);
  }
  const osName = (id) => (DATA.os.find((o) => o.id === id) || {}).name || id;

  /* ---------- Hulpjes ---------- */
  const toastEl = document.querySelector('[data-toast]');
  let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }
  const check = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    return { parts: (path || '').split('/').filter(Boolean), params };
  }

  /* ---------- Componenten ---------- */
  function productCard(p) {
    return `<article class="prod-card">
      <a href="#/product/${p.id}" class="prod-media" aria-label="${esc(p.name)} bekijken">
        <img src="${IMG(p.image)}" alt="${esc(p.name)}: ${esc(p.tagline)}" loading="lazy" width="800" height="600" />
        ${p.badge ? `<span class="tag ${p.badge === 'Populair' ? 'hot' : ''}">${esc(p.badge)}</span>` : ''}
      </a>
      <div class="prod-body">
        <span class="mono">${esc(p.board)} &middot; ${esc(osName(p.defaultOs))}</span>
        <h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
        <p>${esc(p.tagline)}</p>
        <div class="prod-foot">
          <span class="price"><small>vanaf</small>${eur(p.price)}</span>
          <a href="#/product/${p.id}" class="link-arrow">Samenstellen &rarr;</a>
        </div>
      </div>
    </article>`;
  }

  const audienceCards = [
    { id: 'gaming', title: 'Gamers', text: 'Retro-console met controllers, Batocera of RetroPie. Aansluiten op de tv en spelen.', img: 'gaming', span: 'span-7', tag: 'Arcade' },
    { id: 'smarthome', title: 'Smart home', text: 'Home Assistant met Zigbee. Lampen, sensoren en je slimme meter lokaal geregeld.', img: 'smarthome', span: 'span-5', tag: 'Home Assistant' },
    { id: 'opslag', title: 'Opslag & NAS', text: 'Eigen netwerkopslag met OpenMediaVault en automatische back-ups.', img: 'nas', span: 'span-4', tag: 'OpenMediaVault' },
    { id: 'media', title: 'Foto & video', text: "Immich en Jellyfin: je foto's en films privé, zonder abonnement.", img: 'media', span: 'span-4', tag: 'Immich' },
    { id: 'linux', title: 'Linux & developers', text: 'Raspberry Pi OS of Ubuntu op NVMe. Een zuinige werkplek of dev-box.', img: 'desktop', span: 'span-4', tag: 'Debian 13' },
    { id: 'server', title: 'Eigen server & VPN', text: 'Docker, CasaOS, WireGuard en Pi-hole. Je eigen cloud en een veilig netwerk, 24/7 aan voor ongeveer 5 watt.', img: 'hero', span: 'span-12', tag: 'Self-hosting' }
  ];

  /* ---------- Pagina's ---------- */
  function pageHome() {
    const featured = ['forge-arcade', 'forge-smarthome', 'forge-vault', 'forge-desktop'].map((id) => DATA.products.find((p) => p.id === id));
    const tick = ['Raspberry Pi OS 64-bit', 'Pi OS Lite', 'Pi OS Full', 'Ubuntu 26.04 LTS', 'Home Assistant OS', 'OpenMediaVault', 'LibreELEC', 'RetroPie', 'Batocera', 'Recalbox', 'Pi-hole', 'WireGuard', 'CasaOS', 'Immich'];
    const tickHtml = tick.map((t) => `<span><b>&#9656;</b>${t}</span>`).join('');
    return `
    <section class="hero">
      <div class="hero-media"><img src="${IMG('hero')}" alt="Raspberry Pi in een zwarte aluminium behuizing op een werkbank met vonken" width="1600" height="900" fetchpriority="high" /></div>
      <div class="wrap hero-inner">
        <span class="eyebrow">Voorgeflasht &middot; getest &middot; klaar voor gebruik</span>
        <h1>Raspberry Pi, <em>gesmeed</em> voor jouw project.</h1>
        <p class="lead">Kies je toepassing, je geheugen en elk standaard OS-image. Wij bouwen, flashen en testen je set in Arnhem. Jij hoeft alleen de stekker erin te steken.</p>
        <div class="hero-cta">
          <a href="#/shop" class="btn btn-primary">Bekijk alle sets</a>
          <a href="#/doelgroepen" class="btn btn-ghost">Wat wil je bouwen?</a>
        </div>
        <div class="hero-stats">
          <div><strong>17</strong><span>OS-images naar keuze</span></div>
          <div><strong>&lt; 16:00</strong><span>besteld, vandaag verzonden</span></div>
          <div><strong>2 jaar</strong><span>garantie op hardware</span></div>
        </div>
      </div>
    </section>
    <div class="ticker" aria-hidden="true"><div class="ticker-track">${tickHtml}${tickHtml}</div></div>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow">Toepassingen</span><h2>Eén board, ontelbare rollen.</h2></div>
          <p>Van gamer tot thuisautomatiseerder: elke set is afgestemd op wat je ermee wilt doen, met de juiste hardware en software al ingesteld.</p>
        </div>
        <div class="aud-grid">
          ${audienceCards.map((a) => `<a href="#/shop?doel=${a.id}" class="aud-card ${a.span}">
            <img src="${IMG(a.img)}" alt="" loading="lazy" />
            <span class="tag">${a.tag}</span>
            <h3>${a.title}</h3><p>${a.text}</p>
          </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow">Bestsellers</span><h2>Populaire sets</h2></div>
          <a href="#/shop" class="link-arrow">Alle ${DATA.products.length} sets bekijken &rarr;</a>
        </div>
        <div class="prod-grid">${featured.map(productCard).join('')}</div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">Zo werkt het</span><h2>Van bestelling tot boot.</h2></div></div>
        <div class="steps">
          <div class="step"><span class="mono">01 / KIES</span><h3>Kies je set</h3><p>Selecteer je toepassing, geheugen, opslag en een van de standaard OS-images.</p></div>
          <div class="step"><span class="mono">02 / BETAAL</span><h3>Betaal veilig</h3><p>Met iDEAL, Bancontact, creditcard via Mollie, of met PayPal.</p></div>
          <div class="step"><span class="mono">03 / SMEED</span><h3>Wij bouwen</h3><p>We monteren, flashen de nieuwste image en draaien een stresstest.</p></div>
          <div class="step"><span class="mono">04 / BOOT</span><h3>Stekker erin</h3><p>Je ontvangt de set met een Nederlandstalige snelstartgids.</p></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="banner">
          <div>
            <span class="eyebrow">Altijd up-to-date</span>
            <h2>Alle standaard images, vers geflasht.</h2>
            <p>We gebruiken de officiële Raspberry Pi OS-releases op basis van Debian 13 Trixie, plus de bekende systemen uit Raspberry Pi Imager. Liever iets anders? Mail ons gerust.</p>
            <div class="hero-cta"><a href="#/images" class="btn btn-ghost">Bekijk alle OS-images</a></div>
          </div>
          <ul>
            <li>${check}<span><strong>Raspberry Pi OS</strong> 64-bit, Lite, Full, 32-bit en Legacy</span></li>
            <li>${check}<span><strong>Ubuntu</strong> Desktop en Server 26.04 LTS</span></li>
            <li>${check}<span><strong>Home Assistant OS</strong> en <strong>OpenMediaVault</strong></span></li>
            <li>${check}<span><strong>LibreELEC</strong>, <strong>RetroPie</strong>, <strong>Batocera</strong> en <strong>Recalbox</strong></span></li>
            <li>${check}<span><strong>Pi-hole + WireGuard</strong> en <strong>CasaOS + Docker</strong></span></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">Veelgestelde vragen</span><h2>Goed om te weten</h2></div></div>
        ${faqHtml()}
      </div>
    </section>`;
  }

  function faqHtml() {
    const qa = [
      ['Moet ik zelf nog iets installeren?', 'Nee. Je set is voorgeflasht met het gekozen image en getest. Bij servers en NAS-sets stel je alleen nog je eigen wachtwoord en gebruikers in via de snelstartgids.'],
      ['Kan ik later een ander OS kiezen?', 'Ja. Elke Raspberry Pi kan met Raspberry Pi Imager opnieuw worden geflasht. Een extra voorgeflashte microSD kun je bijbestellen via e-mail.'],
      ['Leveren jullie ook games mee bij de Arcade-set?', 'Nee. Uit respect voor auteursrecht leveren we de emulatiesoftware zonder games. Je voegt zelf je legaal verkregen back-ups toe.'],
      ['Hoeveel stroom verbruikt een thuisserver?', 'Een Raspberry Pi 5 verbruikt in rust ongeveer 3 tot 5 watt. Dat is een fractie van een gewone pc of NAS.'],
      ['Wat als er iets kapot gaat?', 'Je hebt 2 jaar garantie op de hardware. Mail ons via ' + esc(CFG.email) + ' en we lossen het snel op.']
    ];
    return `<div class="faq">${qa.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
  }

  function pageShop(params) {
    const active = params.get('doel') || 'alle';
    const list = active === 'alle' ? DATA.products : DATA.products.filter((p) => p.audiences.includes(active));
    const aud = DATA.audiences.find((a) => a.id === active);
    return `
    <section class="page-head"><div class="wrap">
      <span class="eyebrow">Shop</span>
      <h1>${aud ? 'Sets voor ' + esc(aud.name.toLowerCase()) : 'Alle Raspberry Pi-sets'}</h1>
      <p>Alle prijzen zijn inclusief 21% btw. Elke set wordt voorgeflasht met het image dat jij kiest.</p>
      <div class="chip-row" style="margin-top:var(--space-6)" role="group" aria-label="Filter op toepassing">
        <button class="chip" data-filter="alle" aria-pressed="${active === 'alle'}">Alle</button>
        ${DATA.audiences.map((a) => `<button class="chip" data-filter="${a.id}" aria-pressed="${active === a.id}">${esc(a.name)}</button>`).join('')}
      </div>
    </div></section>
    <section class="section" style="padding-top:var(--space-10)"><div class="wrap">
      <p class="muted small" style="margin-bottom:var(--space-5)">${list.length} ${list.length === 1 ? 'set' : 'sets'}</p>
      <div class="prod-grid">${list.map(productCard).join('')}</div>
    </div></section>`;
  }

  function pageProduct(id) {
    const p = DATA.products.find((x) => x.id === id);
    if (!p) return page404();
    const osOpts = p.os.map((oid) => DATA.os.find((o) => o.id === oid)).filter(Boolean);
    const groups = {};
    osOpts.forEach((o) => { (groups[o.group] = groups[o.group] || []).push(o); });
    const radio = (name, arr) => arr.map((o, i) => `<input type="radio" name="${name}" id="${name}-${o.id}" value="${o.id}" ${i === 0 ? 'checked' : ''} />
      <label for="${name}-${o.id}">${esc(o.label)}<span>${o.add ? '+ ' + eur(o.add) : 'inbegrepen'}</span></label>`).join('');
    return `
    <div class="wrap">
      <nav class="crumbs" aria-label="Kruimelpad"><a href="#/">Home</a><span>/</span><a href="#/shop">Shop</a><span>/</span><span>${esc(p.name)}</span></nav>
      <div class="pdp">
        <div class="pdp-media"><img src="${IMG(p.image)}" alt="${esc(p.name)}" width="1200" height="900" /></div>
        <form class="pdp-info" data-pdp="${p.id}" novalidate>
          <span class="mono muted">${esc(p.board)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="tagline">${esc(p.tagline)}</p>
          <p class="summary">${esc(p.summary)}</p>
          <p class="price-big"><span data-price>${eur(p.price)}</span><small>incl. btw</small></p>

          ${p.ram.length > 1 ? `<fieldset class="opt"><legend>Werkgeheugen</legend><div class="opt-row">${radio('ram', p.ram)}</div></fieldset>` : `<input type="hidden" name="ram" value="${p.ram[0].id}" />`}
          <fieldset class="opt"><legend>Opslag</legend><div class="opt-row">${radio('storage', p.storage)}</div></fieldset>
          <div class="opt">
            <label for="os-select">Besturingssysteem (voorgeflasht)</label>
            <select class="select" id="os-select" name="os">
              ${Object.keys(groups).map((g) => `<optgroup label="${esc(g)}">${groups[g].map((o) => `<option value="${o.id}" ${o.id === p.defaultOs ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</optgroup>`).join('')}
            </select>
            <p class="os-note" data-os-note></p>
          </div>
          ${(p.extras || []).length ? `<fieldset class="opt"><legend>Extra's</legend>${p.extras.map((e) => `<label class="check"><input type="checkbox" name="extra" value="${e.id}" /> ${esc(e.label)} <span class="muted">+ ${eur(e.add)}</span></label>`).join('')}</fieldset>` : ''}

          <div class="buy-row">
            <div class="qty" aria-label="Aantal"><button type="button" data-q="-1" aria-label="Minder">&minus;</button><span data-qty>1</span><button type="button" data-q="1" aria-label="Meer">+</button></div>
            <button type="submit" class="btn btn-primary">In winkelwagen</button>
          </div>
          <div class="usp-mini">
            <div><strong>Vandaag verzonden</strong>bij bestelling voor 16:00</div>
            <div><strong>14 dagen</strong>bedenktijd</div>
            <div><strong>2 jaar</strong>garantie</div>
          </div>
          <div class="includes">
            <h2>Wat zit erin</h2>
            <ul>${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          </div>
        </form>
      </div>
    </div>`;
  }

  function bindProduct() {
    const form = document.querySelector('[data-pdp]');
    if (!form) return;
    const p = DATA.products.find((x) => x.id === form.dataset.pdp);
    let qty = 1;
    const read = () => ({
      id: p.id,
      ram: (form.querySelector('[name=ram]:checked') || form.querySelector('[name=ram]')).value,
      storage: form.querySelector('[name=storage]:checked').value,
      os: form.querySelector('[name=os]').value,
      extras: [...form.querySelectorAll('[name=extra]:checked')].map((x) => x.value),
      qty
    });
    const upd = () => {
      const l = read();
      form.querySelector('[data-price]').textContent = eur(linePrice(l));
      const o = DATA.os.find((x) => x.id === l.os);
      form.querySelector('[data-os-note]').textContent = o ? o.desc : '';
    };
    form.addEventListener('change', upd);
    form.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(10, qty + Number(b.dataset.q)));
      form.querySelector('[data-qty]').textContent = qty;
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      cart.add(read());
      toast(`${p.name} toegevoegd aan je winkelwagen`);
    });
    upd();
  }

  function lineMeta(l) {
    const p = DATA.products.find((x) => x.id === l.id);
    const r = p.ram.find((x) => x.id === l.ram), s = p.storage.find((x) => x.id === l.storage);
    const ex = (l.extras || []).map((id) => ((p.extras || []).find((e) => e.id === id) || {}).label).filter(Boolean);
    return [r && r.label + ' RAM', s && s.label, osName(l.os)].concat(ex).filter(Boolean).join(' · ');
  }

  function summaryHtml(country, withCta) {
    const t = totals(country);
    const left = Math.max(0, t.zone.freeFrom - t.sub);
    const pct = Math.min(100, (t.sub / t.zone.freeFrom) * 100);
    return `<aside class="summary-box" data-summary>
      <h2>Overzicht</h2>
      <div class="sum-row"><span>Subtotaal</span><span>${eur(t.sub)}</span></div>
      <div class="sum-row"><span>Verzending (${esc(t.zone.name)})</span><span>${t.ship === 0 ? 'Gratis' : eur(t.ship)}</span></div>
      <div class="free-bar">${left > 0 ? `Nog ${eur(left)} tot gratis verzending` : 'Je bestelling wordt gratis verzonden'}<div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="sum-row total"><span>Totaal</span><span>${eur(t.total)}</span></div>
      <div class="sum-row"><span class="muted small">waarvan btw (21%)</span><span class="muted small">${eur(t.btw)}</span></div>
      ${withCta ? `<a href="#/afrekenen" class="btn btn-primary btn-block" style="margin-top:var(--space-5)">Afrekenen</a>
      <p class="muted small" style="margin-top:var(--space-3);text-align:center">iDEAL &middot; Bancontact &middot; creditcard &middot; PayPal</p>` : ''}
    </aside>`;
  }

  function pageCart() {
    if (!cart.items.length) {
      return `<div class="wrap"><div class="empty"><span class="eyebrow">Winkelwagen</span><h2 style="margin-top:var(--space-3)">Je winkelwagen is nog leeg</h2><p>Kies een set die past bij wat je wilt bouwen, van retro-console tot thuisserver.</p><a href="#/shop" class="btn btn-primary">Naar de shop</a></div></div>`;
    }
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">Winkelwagen</span><h1>Je bestelling</h1></div></section>
    <div class="wrap cart-layout">
      <div>${cart.items.map((l, i) => {
        const p = DATA.products.find((x) => x.id === l.id);
        return `<div class="cart-item">
          <img src="${IMG(p.image)}" alt="" />
          <div><h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3><p class="meta">${esc(lineMeta(l))}</p>
            <div class="actions"><div class="qty"><button type="button" data-cq="${i}" data-d="-1" aria-label="Minder">&minus;</button><span>${l.qty}</span><button type="button" data-cq="${i}" data-d="1" aria-label="Meer">+</button></div>
            <button class="remove" data-rm="${i}">Verwijderen</button></div></div>
          <div class="price line-price">${eur(linePrice(l) * l.qty)}</div>
        </div>`;
      }).join('')}
      <a href="#/shop" class="link-arrow" style="margin-top:var(--space-6)">&larr; Verder winkelen</a></div>
      ${summaryHtml('NL', true)}
    </div>`;
  }
  function bindCart() {
    main.querySelectorAll('[data-cq]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.cq; cart.setQty(i, cart.items[i].qty + Number(b.dataset.d)); render(); }));
    main.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { cart.setQty(+b.dataset.rm, 0); render(); toast('Artikel verwijderd'); }));
  }

  function pageCheckout() {
    if (!cart.items.length) return pageCart();
    const f = (name, label, opts = {}) => `<div class="field ${opts.full ? 'full' : ''}"><label for="f-${name}">${label}</label>
      <input class="input" id="f-${name}" name="${name}" type="${opts.type || 'text'}" autocomplete="${opts.ac || 'on'}" ${opts.req === false ? '' : 'required'} ${opts.pattern ? `pattern="${opts.pattern}"` : ''} />
      <p class="err">${opts.err || 'Vul dit veld in'}</p></div>`;
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">Afrekenen</span><h1>Gegevens en betaling</h1></div></section>
    <div class="wrap cart-layout">
      <form data-checkout novalidate>
        <h2 class="fieldset-title">Contact</h2>
        <div class="form-grid">
          ${f('email', 'E-mailadres', { type: 'email', ac: 'email', full: true, err: 'Vul een geldig e-mailadres in' })}
          ${f('phone', 'Telefoon (optioneel)', { type: 'tel', ac: 'tel', req: false, full: true })}
        </div>
        <h2 class="fieldset-title">Bezorgadres</h2>
        <div class="form-grid">
          ${f('firstName', 'Voornaam', { ac: 'given-name' })}
          ${f('lastName', 'Achternaam', { ac: 'family-name' })}
          ${f('street', 'Straat en huisnummer', { ac: 'street-address', full: true })}
          ${f('postal', 'Postcode', { ac: 'postal-code' })}
          ${f('city', 'Plaats', { ac: 'address-level2' })}
          <div class="field full"><label for="f-country">Land</label>
            <select class="select" id="f-country" name="country">${Object.entries(DATA.shipping).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></div>
        </div>
        <h2 class="fieldset-title">Betaalmethode</h2>
        <div class="pay-methods">
          <label class="pay-opt"><input type="radio" name="pay" value="ideal" checked /><div><strong>iDEAL</strong><span>Direct betalen via je eigen bank</span></div><div class="logos"><b>iDEAL</b></div></label>
          <label class="pay-opt"><input type="radio" name="pay" value="bancontact" /><div><strong>Bancontact</strong><span>Voor klanten in België</span></div><div class="logos"><b>Bancontact</b></div></label>
          <label class="pay-opt"><input type="radio" name="pay" value="creditcard" /><div><strong>Creditcard</strong><span>Veilig via Mollie</span></div><div class="logos"><b>Visa</b><b>MC</b><b>Amex</b></div></label>
          <label class="pay-opt"><input type="radio" name="pay" value="paypal" /><div><strong>PayPal</strong><span>Betalen met je PayPal-account</span></div><div class="logos"><b>PayPal</b></div></label>
        </div>
        <label class="check" style="margin-top:var(--space-6)"><input type="checkbox" name="terms" required /> <span>Ik ga akkoord met de <a href="#/voorwaarden" style="color:var(--color-primary)">algemene voorwaarden</a> en het <a href="#/privacy" style="color:var(--color-primary)">privacybeleid</a>.</span></label>
        <p class="err" data-terms-err style="color:var(--color-error);font-size:var(--text-xs);display:none;margin-top:var(--space-2)">Ga akkoord met de voorwaarden om verder te gaan</p>
        <div data-pay-area style="margin-top:var(--space-6)">
          <button type="submit" class="btn btn-primary btn-block" data-pay-btn>Betalen met Mollie</button>
        </div>
        <div id="paypal-buttons"></div>
        <div data-pay-msg></div>
      </form>
      <div data-summary-wrap>${summaryHtml('NL', false)}</div>
    </div>`;
  }

  function collectCustomer(form) {
    const g = (n) => (form.querySelector(`[name=${n}]`) || {}).value || '';
    return { email: g('email').trim(), phone: g('phone').trim(), firstName: g('firstName').trim(), lastName: g('lastName').trim(), street: g('street').trim(), postal: g('postal').trim(), city: g('city').trim(), country: g('country') };
  }
  function validate(form) {
    let ok = true;
    form.querySelectorAll('.input[required]').forEach((inp) => {
      const field = inp.closest('.field');
      let valid = inp.value.trim() !== '';
      if (inp.type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
      field.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    const terms = form.querySelector('[name=terms]');
    form.querySelector('[data-terms-err]').style.display = terms.checked ? 'none' : 'block';
    if (!terms.checked) ok = false;
    if (!ok) { const first = form.querySelector('.invalid .input') || terms; first.focus(); }
    return ok;
  }
  const orderPayload = (form) => ({ customer: collectCustomer(form), items: cart.items.map((l) => ({ id: l.id, ram: l.ram, storage: l.storage, os: l.os, extras: l.extras || [], qty: l.qty })) });

  function bindCheckout() {
    const form = document.querySelector('[data-checkout]');
    if (!form) return;
    const btn = form.querySelector('[data-pay-btn]');
    const msg = form.querySelector('[data-pay-msg]');
    const ppBox = document.getElementById('paypal-buttons');
    const setMethod = () => {
      const m = form.querySelector('[name=pay]:checked').value;
      msg.innerHTML = '';
      if (m === 'paypal') { btn.style.display = 'none'; mountPayPal(form, ppBox, msg); }
      else { btn.style.display = ''; ppBox.innerHTML = ''; btn.textContent = `Betalen met ${m === 'ideal' ? 'iDEAL' : m === 'bancontact' ? 'Bancontact' : 'creditcard'}`; }
    };
    form.addEventListener('change', (e) => {
      if (e.target.name === 'pay') setMethod();
      if (e.target.name === 'country') document.querySelector('[data-summary-wrap]').innerHTML = summaryHtml(e.target.value, false);
      if (e.target.closest('.field')) e.target.closest('.field').classList.remove('invalid');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const method = form.querySelector('[name=pay]:checked').value;
      if (method === 'paypal') return;
      btn.disabled = true; btn.textContent = 'Betaling voorbereiden…';
      try {
        const res = await fetch(CFG.apiBase + 'mollie-create.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...orderPayload(form), method }) });
        const data = await res.json();
        if (!res.ok || !data.checkoutUrl) throw new Error(data.error || 'Onbekende fout');
        window.location.href = data.checkoutUrl;
      } catch (err) {
        btn.disabled = false; setMethod();
        msg.innerHTML = `<div class="notice warn"><strong>Betalen via Mollie is nog niet actief.</strong><br />Dit gebeurt als de PHP-map <code>api/</code> niet draait of de Mollie API-sleutel nog niet is ingevuld in <code>api/config.php</code>. Zie README.md.</div>`;
        console.warn('Mollie:', err);
      }
    });
    setMethod();
  }

  let paypalLoading = null;
  function loadPayPal() {
    if (window.paypal) return Promise.resolve();
    if (paypalLoading) return paypalLoading;
    paypalLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CFG.paypalClientId)}&currency=${CFG.paypalCurrency || 'EUR'}&locale=nl_NL&disable-funding=card,sepa,bancontact,ideal`;
      s.onload = resolve; s.onerror = () => { paypalLoading = null; reject(new Error('PayPal kon niet laden')); };
      document.head.appendChild(s);
    });
    return paypalLoading;
  }
  function mountPayPal(form, box, msg) {
    box.innerHTML = '';
    if (!CFG.paypalClientId) {
      msg.innerHTML = '<div class="notice warn"><strong>PayPal is nog niet gekoppeld.</strong><br />Vul je PayPal Client ID in bij <code>paypalClientId</code> in <code>assets/js/config.js</code>. Daarna verschijnt hier de PayPal-knop.</div>';
      return;
    }
    loadPayPal().then(() => {
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay' },
        onClick: (d, actions) => (validate(form) ? actions.resolve() : actions.reject()),
        createOrder: (d, actions) => {
          const t = totals(form.querySelector('[name=country]').value);
          return actions.order.create({ purchase_units: [{ description: 'PiForge bestelling', amount: { currency_code: 'EUR', value: t.total.toFixed(2) } }] });
        },
        onApprove: async (d, actions) => {
          const details = await actions.order.capture();
          let orderId = details.id;
          try {
            const r = await fetch(CFG.apiBase + 'paypal-confirm.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...orderPayload(form), paypalOrderId: details.id }) });
            const j = await r.json(); if (j.orderId) orderId = j.orderId;
          } catch (e) { /* backend niet beschikbaar: betaling is wel ontvangen */ }
          cart.clear();
          location.hash = `#/bedankt?order=${encodeURIComponent(orderId)}&via=paypal`;
        },
        onError: () => { msg.innerHTML = '<div class="notice warn">Er ging iets mis met PayPal. Probeer het opnieuw of kies een andere betaalmethode.</div>'; }
      }).render(box);
    }).catch((e) => { msg.innerHTML = `<div class="notice warn">${esc(e.message)}. Kies een andere betaalmethode.</div>`; });
  }

  function pageThanks(params) {
    const order = params.get('order');
    return `<div class="wrap"><div class="empty" data-thanks="${esc(order || '')}">
      <span class="eyebrow">Bestelling</span>
      <h2 style="margin-top:var(--space-3)" data-thanks-title>Bedankt voor je bestelling</h2>
      <p data-thanks-text>${order ? 'We controleren de status van je betaling…' : 'Je ontvangt een bevestiging per e-mail.'}</p>
      ${order ? `<p class="mono">Bestelnummer: ${esc(order)}</p>` : ''}
      <p>Vragen? Mail ons via <a class="mail-link" href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a></p>
      <a href="#/shop" class="btn btn-ghost">Verder winkelen</a>
    </div></div>`;
  }
  async function bindThanks(params) {
    const order = params.get('order'); if (!order) return;
    const title = main.querySelector('[data-thanks-title]'), txt = main.querySelector('[data-thanks-text]');
    if (params.get('via') === 'paypal') { txt.textContent = 'Je PayPal-betaling is ontvangen. We gaan direct voor je aan de slag en je ontvangt een bevestiging per e-mail.'; return; }
    try {
      const r = await fetch(CFG.apiBase + 'order-status.php?order=' + encodeURIComponent(order));
      const j = await r.json();
      if (j.status === 'paid') { cart.clear(); txt.textContent = 'Je betaling is gelukt. We bouwen en testen je set en sturen een bevestiging per e-mail.'; }
      else if (j.status === 'open' || j.status === 'pending') { txt.textContent = 'Je betaling wordt nog verwerkt. Je ontvangt bericht zodra die is afgerond.'; }
      else { title.textContent = 'Betaling niet afgerond'; txt.textContent = 'De betaling is geannuleerd of verlopen. Er is niets afgeschreven. Je kunt je bestelling opnieuw plaatsen.'; }
    } catch (e) { txt.textContent = 'Je ontvangt een bevestiging per e-mail zodra je betaling is verwerkt.'; }
  }

  function pageAudiences() {
    const detail = {
      gaming: ['PiForge Arcade', 'forge-arcade', 'Batocera, RetroPie of Recalbox met twee draadloze controllers. Speel klassiekers op de tv, sla voortgang op en speel samen op de bank.'],
      smarthome: ['PiForge SmartHome Hub', 'forge-smarthome', 'Home Assistant OS met een Zigbee/Thread-stick. Koppel lampen, sensoren, je slimme meter en zonnepanelen, en houd alles lokaal en privé.'],
      opslag: ['PiForge Vault NAS', 'forge-vault', 'OpenMediaVault met twee SSD-sloten. Gedeelde mappen voor het hele gezin, Time Machine-back-ups en optioneel RAID 1.'],
      media: ['PiForge PhotoVault', 'forge-photovault', "Immich maakt automatisch back-ups van de foto's op je telefoon, Jellyfin streamt je films. Geen maandelijkse cloudkosten."],
      linux: ['PiForge Desktop', 'forge-desktop', 'Raspberry Pi OS of Ubuntu op een snelle NVMe-SSD. Een stille werkplek voor browsen, kantoorwerk en programmeren.'],
      server: ['PiForge HomeServer', 'forge-server', 'Docker en CasaOS: installeer Nextcloud, Vaultwarden, Gitea of je eigen website met één klik. Ongeveer 5 watt verbruik.']
    };
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">Toepassingen</span><h1>Wat wil jij bouwen?</h1><p>Elke doelgroep heeft andere wensen. Daarom stellen we per toepassing de juiste hardware samen en flashen we het passende image.</p></div></section>
    <section class="section"><div class="wrap" style="display:grid;gap:var(--space-16)">
      ${audienceCards.map((a, i) => { const d = detail[a.id]; return `<div class="banner" style="grid-template-columns:${i % 2 ? '1fr 1.1fr' : '1.1fr 1fr'}">
        <div style="order:${i % 2 ? 2 : 1}"><span class="eyebrow">${a.tag}</span><h2 style="margin-top:var(--space-3)">${a.title}</h2><p>${d[2]}</p>
        <div class="hero-cta"><a href="#/product/${d[1]}" class="btn btn-primary">Bekijk ${d[0]}</a><a href="#/shop?doel=${a.id}" class="btn btn-ghost">Alle sets</a></div></div>
        <div style="order:${i % 2 ? 1 : 2};border-radius:var(--radius-lg);overflow:hidden;aspect-ratio:4/3"><img src="${IMG(a.img)}" alt="${a.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover" /></div>
      </div>`; }).join('')}
      <div class="banner"><div><span class="eyebrow">Privacy &amp; VPN</span><h2 style="margin-top:var(--space-3)">Veilig online, ook onderweg</h2><p>PiForge Shield combineert een WireGuard-VPN met Pi-hole. Log veilig in op je thuisnetwerk vanaf openbare wifi en blokkeer advertenties en trackers op al je apparaten.</p><div class="hero-cta"><a href="#/product/forge-shield" class="btn btn-primary">Bekijk PiForge Shield</a></div></div>
      <div><span class="eyebrow">Leren &amp; onderwijs</span><h2 style="margin-top:var(--space-3)">Begin klein</h2><p>De PiForge Zero Kit is perfect om Linux, Python en elektronica te leren. Voor scholen en clubs maken we graag een offerte op maat.</p><div class="hero-cta"><a href="#/product/forge-zero" class="btn btn-ghost">Bekijk Zero Kit</a></div></div></div>
    </div></section>`;
  }

  function pageImages() {
    const groups = {};
    DATA.os.forEach((o) => { (groups[o.group] = groups[o.group] || []).push(o); });
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">OS-images</span><h1>Alle standaard images, vers geflasht</h1><p>Bij elke set kies je het besturingssysteem. We flashen altijd de nieuwste stabiele release vlak voor verzending. Raspberry Pi OS is gebaseerd op Debian 13 Trixie; de Legacy-versie op Debian 12 Bookworm.</p></div></section>
    <section class="section" style="padding-top:var(--space-4)"><div class="wrap">
      ${Object.keys(groups).map((g) => `<h2 class="os-group-title">${esc(g)}</h2><div class="os-grid">${groups[g].map((o) => {
        const fits = DATA.products.filter((p) => p.os.includes(o.id)).length;
        return `<div class="os-item"><h3>${esc(o.name)}</h3><p>${esc(o.desc)}</p><p class="mono" style="margin-top:var(--space-3)">Beschikbaar op ${fits} ${fits === 1 ? 'set' : 'sets'}</p></div>`;
      }).join('')}</div>`).join('')}
      <div class="notice" style="margin-top:var(--space-10)">Mis je een image? Mail naar <a class="mail-link" href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a>. Zolang het officieel op de Raspberry Pi draait, flashen we het voor je.</div>
    </div></section>`;
  }

  function prosePage(eyebrow, title, intro, sections) {
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${intro ? `<p>${intro}</p>` : ''}</div></section>
    <div class="wrap prose-layout">
      <nav class="toc" aria-label="Inhoud">${sections.map((s, i) => `<button type="button" data-jump="s${i}">${s[0]}</button>`).join('')}</nav>
      <article class="prose">${sections.map((s, i) => `<h2 id="s${i}">${s[0]}</h2>${s[1]}`).join('')}</article>
    </div>`;
  }

  function pageShipping() {
    const rows = Object.values(DATA.shipping).map((z) => `<tr><td>${z.name}</td><td>${eur(z.cost)}</td><td>vanaf ${eur(z.freeFrom)}</td><td>${z.name === 'Nederland' ? '1–2 werkdagen' : '2–4 werkdagen'}</td></tr>`).join('');
    return prosePage('Service', 'Verzending &amp; retourneren', 'Elke set wordt in Arnhem gebouwd, voorgeflasht en getest voordat we hem verzenden.', [
      ['Verzendkosten', `<div class="table-wrap"><table class="table"><thead><tr><th>Land</th><th>Kosten</th><th>Gratis</th><th>Levertijd</th></tr></thead><tbody>${rows}</tbody></table></div><p>Alle bedragen zijn inclusief btw. We verzenden met PostNL of DHL, altijd met track &amp; trace.</p>`],
      ['Levertijd', '<p>Bestellingen die op werkdagen <strong>vóór 16:00</strong> zijn betaald, verzenden we dezelfde dag. Daarna gaat je pakket de volgende werkdag de deur uit. Voor maatwerk of grote aantallen (bijvoorbeeld voor scholen) spreken we de levertijd vooraf met je af.</p>'],
      ['Track &amp; trace', '<p>Zodra je pakket is verzonden, ontvang je een e-mail met de trackinglink. Ben je niet thuis? Dan wordt het pakket bij de buren of een afhaalpunt bezorgd.</p>'],
      ['Herroepingsrecht (14 dagen)', '<p>Je hebt <strong>14 dagen bedenktijd</strong> vanaf de dag nadat je de bestelling hebt ontvangen. Binnen die termijn kun je zonder opgave van reden afzien van de aankoop.</p><p>Meld een retour binnen 14 dagen via <a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a> met je bestelnummer. Daarna heb je nog 14 dagen om het product terug te sturen.</p>'],
      ['Voorwaarden voor retour', '<ul><li>Stuur het product compleet en goed verpakt terug, bij voorkeur in de originele verpakking.</li><li>Je mag het product uitproberen zoals je dat in een winkel zou doen. Bij schade door meer dan normaal gebruik kunnen we een waardevermindering in rekening brengen.</li><li>De kosten voor het terugsturen zijn voor jouw rekening, tenzij het product defect is of we een fout hebben gemaakt.</li></ul>'],
      ['Terugbetaling', '<p>We betalen het aankoopbedrag inclusief de oorspronkelijke verzendkosten binnen <strong>14 dagen</strong> na je melding terug, via dezelfde betaalmethode (Mollie of PayPal). We mogen wachten met terugbetalen tot we het product hebben ontvangen.</p>'],
      ['Garantie en defecten', '<p>Op alle hardware heb je minimaal <strong>2 jaar garantie</strong>. Werkt je set niet zoals verwacht? Mail ons, dan helpen we je eerst op afstand. Is het product defect, dan repareren of vervangen we het kosteloos, inclusief verzendkosten.</p>'],
      ['Modelformulier voor herroeping', `<p>Je mag dit formulier gebruiken, maar dat hoeft niet. Een e-mail met dezelfde gegevens is ook voldoende.</p><p><strong>Aan:</strong> RaspBuilders, ${esc(CFG.address)}, ${esc(CFG.email)}<br />Ik deel u hierbij mede dat ik onze overeenkomst betreffende de verkoop van de volgende producten herroep: [product]<br />Besteld op / ontvangen op: [datum]<br />Bestelnummer: [nummer]<br />Naam en adres consument: [gegevens]<br />Datum en handtekening (alleen bij papier): [ ]</p>`]
    ]);
  }

  function pageTerms() {
    const c = `RaspBuilders, handelend onder de naam PiForge, gevestigd te ${esc(CFG.city)}, KvK ${esc(CFG.kvk)}, btw ${esc(CFG.btw)}, e-mail <a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a>`;
    return prosePage('Juridisch', 'Algemene voorwaarden', 'Deze voorwaarden gelden voor iedere bestelling bij PiForge. Laatst bijgewerkt: november 2026.', [
      ['Artikel 1 · Identiteit', `<p>${c}.</p>`],
      ['Artikel 2 · Toepasselijkheid', '<p>Deze voorwaarden zijn van toepassing op elk aanbod van PiForge en op elke overeenkomst op afstand tussen PiForge en de klant. Voordat de overeenkomst wordt gesloten, stellen we de tekst van deze voorwaarden beschikbaar op deze website.</p>'],
      ['Artikel 3 · Het aanbod', '<p>Het aanbod bevat een volledige en nauwkeurige omschrijving van de producten, inclusief gekozen geheugen, opslag en besturingssysteem. Afbeeldingen zijn een getrouwe weergave, maar kleine afwijkingen in kleur of behuizing zijn mogelijk. Kennelijke vergissingen of fouten in het aanbod binden ons niet.</p>'],
      ['Artikel 4 · De overeenkomst', '<p>De overeenkomst komt tot stand op het moment dat de klant het aanbod aanvaardt en de betaling is gelukt. We bevestigen de bestelling direct per e-mail.</p>'],
      ['Artikel 5 · Prijzen', '<p>Alle prijzen zijn in euro en inclusief 21% btw. Verzendkosten worden vóór het afronden van de bestelling duidelijk vermeld.</p>'],
      ['Artikel 6 · Betaling', '<p>Betalen kan met iDEAL, Bancontact en creditcard via onze betaalprovider Mollie, of via PayPal. We verwerken een bestelling nadat de betaling is bevestigd.</p>'],
      ['Artikel 7 · Levering', '<p>We leveren zo snel mogelijk en uiterlijk binnen 30 dagen, tenzij anders afgesproken. Bij vertraging laten we dit weten en mag de klant de overeenkomst kosteloos ontbinden. Het risico van beschadiging of verlies gaat over op het moment van bezorging. Zie ook <a href="#/verzending">Verzending &amp; retourneren</a>.</p>'],
      ['Artikel 8 · Herroepingsrecht', '<p>De consument kan een overeenkomst gedurende 14 dagen na ontvangst zonder opgave van redenen ontbinden. Tijdens deze bedenktijd gaat de consument zorgvuldig om met het product. Het voorgeflashte besturingssysteem is vrij verkrijgbare software en heeft geen invloed op het herroepingsrecht.</p>'],
      ['Artikel 9 · Software en content', '<p>De meegeleverde besturingssystemen zijn open-source of gratis software van derden, zoals Raspberry Pi OS, Ubuntu, Home Assistant OS en LibreELEC. Hierop gelden de licenties van de betreffende makers. PiForge levert geen auteursrechtelijk beschermde games, films of andere content mee.</p>'],
      ['Artikel 10 · Conformiteit en garantie', '<p>We staan ervoor in dat de producten voldoen aan de overeenkomst en de redelijke verwachtingen van de klant. Daarnaast geven we 2 jaar garantie op de hardware. Deze garantie beperkt de wettelijke rechten van de consument niet.</p>'],
      ['Artikel 11 · Aansprakelijkheid', '<p>PiForge is niet aansprakelijk voor gegevensverlies. We raden aan altijd een back-up te bewaren van belangrijke bestanden, ook op een NAS- of fotoset. Onze aansprakelijkheid is beperkt tot het factuurbedrag van het betreffende product, behalve bij opzet of grove schuld.</p>'],
      ['Artikel 12 · Klachten', `<p>Klachten kun je binnen een redelijke termijn melden via <a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a>. We reageren binnen 14 dagen. Komen we er samen niet uit, dan kun je ook gebruikmaken van het Europese ODR-platform.</p>`],
      ['Artikel 13 · Toepasselijk recht', '<p>Op deze voorwaarden en alle overeenkomsten is Nederlands recht van toepassing.</p>']
    ]);
  }

  function pagePrivacy() {
    return prosePage('Juridisch', 'Privacybeleid', 'We verwerken alleen de gegevens die nodig zijn om je bestelling te leveren. Laatst bijgewerkt: november 2026.', [
      ['Welke gegevens', '<p>Naam, adres, e-mailadres, optioneel telefoonnummer en je bestelgegevens. Betaalgegevens worden verwerkt door Mollie of PayPal; wij zien geen volledige kaart- of bankgegevens.</p>'],
      ['Waarvoor', '<p>Om je bestelling te verwerken en te verzenden, contact met je op te nemen over je bestelling en om te voldoen aan onze wettelijke administratieplicht.</p>'],
      ['Delen met derden', '<p>We delen gegevens alleen met partijen die nodig zijn voor de levering: onze betaalproviders (Mollie, PayPal) en de vervoerder (PostNL of DHL). We verkopen nooit gegevens.</p>'],
      ['Bewaartermijn', '<p>Bestel- en factuurgegevens bewaren we 7 jaar vanwege de fiscale bewaarplicht. Contactberichten verwijderen we na afhandeling, uiterlijk na 1 jaar.</p>'],
      ['Cookies', '<p>Deze website gebruikt geen tracking- of advertentiecookies. De betaalproviders kunnen tijdens het afrekenen functionele cookies plaatsen.</p>'],
      ['Jouw rechten', `<p>Je kunt je gegevens inzien, laten corrigeren of laten verwijderen. Stuur hiervoor een e-mail naar <a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a>. Je hebt ook het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens.</p>`]
    ]);
  }

  function pageContact() {
    return `<section class="page-head"><div class="wrap"><span class="eyebrow">Contact</span><h1>Vragen? We denken graag mee.</h1><p>Twijfel je welke set past, wil je een offerte voor school of bedrijf, of heb je hulp nodig bij je installatie? Stuur ons een bericht.</p></div></section>
    <div class="wrap contact-grid">
      <div>
        <div class="contact-card"><h3>E-mail</h3><p>We reageren op werkdagen binnen 24 uur.</p><p style="margin-top:var(--space-3)"><a class="mail-link" href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a></p></div>
        <div class="contact-card"><h3>Werkplaats</h3><p>RaspBuilders, ${esc(CFG.city)}<br />Alleen verzending, geen afhaalbalie.</p></div>
        <div class="contact-card"><h3>Retour of defect</h3><p>Vermeld je bestelnummer. Bekijk ook <a href="#/verzending" style="color:var(--color-primary)">verzending &amp; retour</a>.</p></div>
      </div>
      <form class="contact-card" data-contact novalidate style="margin:0">
        <div class="form-grid">
          <div class="field"><label for="c-name">Naam</label><input class="input" id="c-name" name="name" required autocomplete="name" /><p class="err">Vul je naam in</p></div>
          <div class="field"><label for="c-email">E-mailadres</label><input class="input" id="c-email" name="email" type="email" required autocomplete="email" /><p class="err">Vul een geldig e-mailadres in</p></div>
          <div class="field full"><label for="c-subject">Onderwerp</label><select class="select" id="c-subject" name="subject"><option>Advies over een set</option><option>Vraag over mijn bestelling</option><option>Retour of garantie</option><option>Offerte voor school of bedrijf</option><option>Anders</option></select></div>
          <div class="field full"><label for="c-msg">Bericht</label><textarea class="textarea input" id="c-msg" name="message" required></textarea><p class="err">Schrijf een bericht</p></div>
        </div>
        <label class="check" style="display:none" aria-hidden="true"><input type="checkbox" name="website" tabindex="-1" /> laat leeg</label>
        <button class="btn btn-primary" type="submit" style="margin-top:var(--space-5)" data-c-btn>Bericht versturen</button>
        <div data-c-msg></div>
      </form>
    </div>`;
  }
  function bindContact() {
    const form = document.querySelector('[data-contact]');
    if (!form) return;
    form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[required]').forEach((i) => { let v = i.value.trim() !== ''; if (i.type === 'email') v = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()); i.closest('.field').classList.toggle('invalid', !v); if (!v) ok = false; });
      if (!ok) return;
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('[data-c-btn]'), msg = form.querySelector('[data-c-msg]');
      btn.disabled = true; btn.textContent = 'Versturen…';
      try {
        const r = await fetch(CFG.apiBase + 'contact.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json(); if (!r.ok || !j.ok) throw new Error();
        form.reset(); msg.innerHTML = '<div class="notice ok">Bedankt, je bericht is verstuurd. We reageren binnen 24 uur.</div>';
      } catch (err) {
        const href = `mailto:${CFG.email}?subject=${encodeURIComponent('[PiForge] ' + data.subject)}&body=${encodeURIComponent(data.message + '\n\n' + data.name + ' <' + data.email + '>')}`;
        msg.innerHTML = `<div class="notice warn">Het formulier kon niet direct verzenden. <a class="mail-link" href="${href}">Open je e-mailprogramma</a> om het bericht naar ${esc(CFG.email)} te sturen.</div>`;
      }
      btn.disabled = false; btn.textContent = 'Bericht versturen';
    });
  }

  function page404() {
    return `<div class="wrap"><div class="empty"><span class="eyebrow">404</span><h2 style="margin-top:var(--space-3)">Deze pagina bestaat niet</h2><p>Misschien is de link verouderd. Ga terug naar de shop.</p><a href="#/shop" class="btn btn-primary">Naar de shop</a></div></div>`;
  }

  /* ---------- Router ---------- */
  const titles = { '': 'Raspberry Pi kant-en-klaar', shop: 'Shop', product: '', doelgroepen: 'Toepassingen', images: 'OS-images', winkelwagen: 'Winkelwagen', afrekenen: 'Afrekenen', bedankt: 'Bedankt', verzending: 'Verzending & retour', voorwaarden: 'Algemene voorwaarden', privacy: 'Privacybeleid', contact: 'Contact' };
  function render() {
    const { parts, params } = parseHash();
    const r = parts[0] || '';
    let html;
    switch (r) {
      case '': html = pageHome(); break;
      case 'shop': html = pageShop(params); break;
      case 'product': html = pageProduct(parts[1]); break;
      case 'doelgroepen': html = pageAudiences(); break;
      case 'images': html = pageImages(); break;
      case 'winkelwagen': html = pageCart(); break;
      case 'afrekenen': html = pageCheckout(); break;
      case 'bedankt': html = pageThanks(params); break;
      case 'verzending': html = pageShipping(); break;
      case 'voorwaarden': html = pageTerms(); break;
      case 'privacy': html = pagePrivacy(); break;
      case 'contact': html = pageContact(); break;
      default: html = page404();
    }
    main.innerHTML = `<div class="fade-in">${html}</div>`;
    const prod = r === 'product' && DATA.products.find((p) => p.id === parts[1]);
    document.title = `${prod ? prod.name : (titles[r] !== undefined ? titles[r] : 'Pagina niet gevonden')} | PiForge`;
    document.querySelectorAll('.main-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + r));
    // pagina-specifieke koppelingen
    if (r === 'shop') main.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.filter === 'alle' ? '#/shop' : '#/shop?doel=' + b.dataset.filter; }));
    if (r === 'product') bindProduct();
    if (r === 'winkelwagen') bindCart();
    if (r === 'afrekenen') bindCheckout();
    if (r === 'bedankt') bindThanks(params);
    if (r === 'contact') bindContact();
    main.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth' }); }));
  }

  /* ---------- Start ---------- */
  const menuBtn = document.querySelector('[data-menu-btn]'), mnav = document.querySelector('[data-mobile-nav]');
  menuBtn.addEventListener('click', () => { const open = mnav.hidden; mnav.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); });
  window.addEventListener('hashchange', () => { mnav.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); render(); window.scrollTo(0, 0); });
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  document.querySelector('[data-kvk]').textContent = `KvK ${CFG.kvk} · btw ${CFG.btw}`;

  fetch('assets/data/products.json').then((r) => r.json()).then((d) => {
    DATA = d; cart.load(); updateCount(); render();
  }).catch(() => { main.innerHTML = '<div class="wrap"><div class="empty"><h2>De shop kon niet laden</h2><p>Herlaad de pagina. Blijft het probleem? Mail ' + esc(CFG.email) + '.</p></div></div>'; });
})();
