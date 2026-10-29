/* PiForge — site scripts */
(function () {
  'use strict';

  /* ===== Instellingen ===== */
  var CONFIG = {
    email: 'piforgeklantenservice@protonmail.com',
    gaId: '',                 // bv. 'G-ABC123XYZ' — leeg = geen analytics
    formEndpoint: ''          // bv. 'https://formspree.io/f/abcdwxyz' — leeg = opent e-mailprogramma
  };

  var CONSENT_KEY = 'piforge-consent';

  function loadAnalytics() {
    if (!CONFIG.gaId || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.gaId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.gaId, { anonymize_ip: true });
  }

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* negeren */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Jaartal */
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    /* Mobiel menu */
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('active');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') links.classList.remove('active');
      });
    }

    /* Cookiebanner — alleen tonen als er analytics is geconfigureerd */
    var banner = document.getElementById('cookie-banner');
    if (CONFIG.gaId) {
      var consent = getConsent();
      if (consent === 'granted') loadAnalytics();
      else if (!consent && banner) banner.classList.add('show');
    }
    if (banner) {
      var accept = banner.querySelector('[data-consent="granted"]');
      var deny = banner.querySelector('[data-consent="denied"]');
      if (accept) accept.addEventListener('click', function () { setConsent('granted'); banner.classList.remove('show'); loadAnalytics(); });
      if (deny) deny.addEventListener('click', function () { setConsent('denied'); banner.classList.remove('show'); });
    }
    document.querySelectorAll('[data-open-cookies]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (banner) banner.classList.add('show');
      });
    });

    /* Contactformulier */
    var form = document.getElementById('contact-form');
    if (form) {
      var status = form.querySelector('.form-status');
      var show = function (msg, isError) {
        if (!status) return;
        status.textContent = msg;
        status.className = 'form-status show' + (isError ? ' error' : '');
      };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = new FormData(form);
        if (data.get('website')) return; // honeypot
        var name = String(data.get('name') || '').trim();
        var email = String(data.get('email') || '').trim();
        var subject = String(data.get('subject') || '');
        var message = String(data.get('message') || '').trim();

        if (CONFIG.formEndpoint) {
          fetch(CONFIG.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
            .then(function (r) {
              if (!r.ok) throw new Error('http ' + r.status);
              form.reset();
              show('Bedankt! Je bericht is verzonden. We reageren binnen 1 werkdag.');
            })
            .catch(function () {
              show('Verzenden mislukt. Mail ons direct via ' + CONFIG.email + '.', true);
            });
        } else {
          var body = 'Naam: ' + name + '\nE-mail: ' + email + '\n\n' + message;
          window.location.href = 'mailto:' + CONFIG.email +
            '?subject=' + encodeURIComponent('[PiForge] ' + subject) +
            '&body=' + encodeURIComponent(body);
          show('Je e-mailprogramma wordt geopend. Zie je niets? Mail ons via ' + CONFIG.email + '.');
        }
      });
    }

    /* Klik-events (alleen na toestemming) */
    document.querySelectorAll('.btn-primary, .btn-ghost').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'cta_click', { label: btn.textContent.trim() });
        }
      });
    });
  });
})();
