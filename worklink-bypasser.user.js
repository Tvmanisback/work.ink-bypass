// ==UserScript==
// @name         worklink-bypasser
// @namespace    https://github.com/Tvmanisback/work.ink-bypass
// @version      2.0.0
// @description  Finds destination URLs already exposed by the current Work.ink page.
// @match        https://work.ink/*
// @match        https://*.work.ink/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  const ROOT_ID = 'worklink-bypasser-root';
  if (window.top !== window.self || document.getElementById(ROOT_ID)) return;

  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 4.8 13h5.7l-.8 8.5L19.2 11h-5.7l-.3-8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  const style = document.createElement('style');
  style.textContent = `
    #${ROOT_ID},#${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483647;font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc}
    #${ROOT_ID} button{font:inherit;cursor:pointer}
    #wlb-fab{width:54px;height:54px;border:1px solid #ffffff30;border-radius:18px;background:linear-gradient(145deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 12px 34px #0008;display:grid;place-items:center}
    #wlb-fab svg{width:25px;height:25px}
    #wlb-panel{display:none;position:absolute;right:0;bottom:66px;width:min(390px,calc(100vw - 28px));max-height:75vh;overflow:auto;padding:18px;border:1px solid #ffffff20;border-radius:18px;background:#111827;box-shadow:0 18px 55px #000b}
    #wlb-panel.wlb-open{display:block}
    #wlb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    #wlb-title{font-size:16px;font-weight:750}
    #wlb-close{width:30px;height:30px;border:0;border-radius:9px;background:#ffffff12;color:#cbd5e1;font-size:20px}
    #wlb-desc{margin:0 0 12px;color:#aebbd0;font-size:13px}
    #wlb-current{width:100%;height:58px;resize:none;border:1px solid #ffffff20;border-radius:10px;padding:9px;background:#0b1220;color:#e5e7eb;font:11px/1.4 ui-monospace,monospace;overflow-wrap:anywhere}
    #wlb-find{width:100%;margin-top:11px;padding:11px 14px;border:0;border-radius:10px;background:linear-gradient(100deg,#3b82f6,#8b5cf6);color:#fff;font-weight:750}
    #wlb-status{margin:11px 0 7px;color:#aebbd0;font-size:12px}
    #wlb-results{display:grid;gap:8px}
    .wlb-result{display:block;padding:10px;border:1px solid #ffffff20;border-radius:10px;background:#0b1220;color:#bfdbfe;text-decoration:none;overflow-wrap:anywhere;font-size:12px}
    #wlb-note{margin:10px 0 0;color:#8795aa;font-size:11px}
  `;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section id="wlb-panel" role="dialog" aria-label="worklink-bypasser">
      <div id="wlb-head"><div id="wlb-title">worklink-bypasser</div><button id="wlb-close" type="button" aria-label="Close">×</button></div>
      <p id="wlb-desc">Current Work.ink link</p>
      <textarea id="wlb-current" readonly></textarea>
      <button id="wlb-find" type="button">Find destination</button>
      <p id="wlb-status" aria-live="polite">Press the button to check for destination URLs exposed by this page.</p>
      <div id="wlb-results"></div>
      <p id="wlb-note">This checks links and page data available in your browser. It does not defeat Work.ink unlock steps, CAPTCHA, or access controls; if Work.ink has not exposed the destination yet, complete its official steps first.</p>
    </section>
    <button id="wlb-fab" type="button" aria-label="Open worklink-bypasser" title="worklink-bypasser">${icon}</button>
  `;
  document.documentElement.appendChild(root);

  const panel = root.querySelector('#wlb-panel');
  const currentBox = root.querySelector('#wlb-current');
  const status = root.querySelector('#wlb-status');
  const results = root.querySelector('#wlb-results');

  function currentUrl() {
    return window.location.href;
  }

  function openPanel() {
    currentBox.value = currentUrl();
    panel.classList.add('wlb-open');
  }

  function addCandidate(set, raw) {
    if (typeof raw !== 'string' || !raw.trim()) return;
    try {
      const url = new URL(raw.trim(), location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.hostname === 'work.ink' || url.hostname.endsWith('.work.ink')) return;
      if (url.hostname === location.hostname) return;
      set.add(url.href);
    } catch (_) {}
  }

  function scanPage() {
    const found = new Set();

    document.querySelectorAll('a[href],area[href]').forEach(el => addCandidate(found, el.getAttribute('href')));
    document.querySelectorAll('[data-href],[data-url],[data-destination]').forEach(el => {
      addCandidate(found, el.getAttribute('data-href'));
      addCandidate(found, el.getAttribute('data-url'));
      addCandidate(found, el.getAttribute('data-destination'));
    });

    document.querySelectorAll('meta[http-equiv="refresh" i]').forEach(meta => {
      const match = (meta.content || '').match(/url\s*=\s*['"]?([^'"]+)/i);
      if (match) addCandidate(found, match[1]);
    });

    // Inspect embedded JSON/page state for absolute external URLs, without executing it.
    document.querySelectorAll('script[type="application/json"],script#__NEXT_DATA__').forEach(script => {
      const text = script.textContent || '';
      const matches = text.match(/https?:\\?\/\\?\/[a-z0-9.-]+(?::\d+)?[^\s"'<>\\]*/gi) || [];
      for (const value of matches) addCandidate(found, value.replace(/\\\//g, '/').replace(/\\u0026/g, '&'));
    });

    return [...found];
  }

  root.querySelector('#wlb-fab').addEventListener('click', () => {
    if (panel.classList.contains('wlb-open')) panel.classList.remove('wlb-open');
    else openPanel();
  });
  root.querySelector('#wlb-close').addEventListener('click', () => panel.classList.remove('wlb-open'));

  root.querySelector('#wlb-find').addEventListener('click', () => {
    currentBox.value = currentUrl();
    results.replaceChildren();
    const urls = scanPage();

    if (!urls.length) {
      status.textContent = 'No destination URL is exposed on this page yet. Work.ink may only reveal it after its normal unlock process.';
      return;
    }

    status.textContent = `Found ${urls.length} possible destination link${urls.length === 1 ? '' : 's'}:`;
    for (const url of urls) {
      const link = document.createElement('a');
      link.className = 'wlb-result';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = url;
      results.appendChild(link);
    }
  });
})();
