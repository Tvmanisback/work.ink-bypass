// ==UserScript==
// @name         worklink-bypasser
// @namespace    https://github.com/Tvmanisback/work.ink-bypass
// @version      2.1.0
// @description  Automatically detects destination links when Work.ink exposes them in the page.
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
      <button id="wlb-find" type="button">Check again</button>
      <p id="wlb-status" aria-live="polite">Watching this page for a destination link…</p>
      <div id="wlb-results"></div>
      <p id="wlb-note">Automatically detects destination URLs once the page exposes them (including after you finish the normal steps). It does not skip unlock steps or defeat CAPTCHA/access controls.</p>
    </section>
    <button id="wlb-fab" type="button" aria-label="Open worklink-bypasser" title="worklink-bypasser">${icon}</button>
  `;
  document.documentElement.appendChild(root);

  const panel = root.querySelector('#wlb-panel');
  const currentBox = root.querySelector('#wlb-current');
  const status = root.querySelector('#wlb-status');
  const results = root.querySelector('#wlb-results');
  const known = new Set();
  let lastRender = '';

  function addCandidate(set, raw) {
    if (typeof raw !== 'string' || !raw.trim()) return;
    try {
      const url = new URL(raw.trim().replace(/\\u0026/gi, '&').replace(/\\\//g, '/'), location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.hostname === 'work.ink' || url.hostname.endsWith('.work.ink')) return;
      if (url.hostname === location.hostname) return;
      if (/\.(?:png|jpe?g|gif|webp|svg|css|js|woff2?|ico)(?:$|\?)/i.test(url.pathname)) return;
      set.add(url.href);
    } catch (_) {}
  }

  function scanPage() {
    const found = new Set();

    document.querySelectorAll('a[href],area[href]').forEach(el => addCandidate(found, el.href || el.getAttribute('href')));
    document.querySelectorAll('*').forEach(el => {
      for (const attr of ['data-href','data-url','data-destination','data-redirect','href','action']) {
        if (el.hasAttribute(attr)) addCandidate(found, el.getAttribute(attr));
      }
    });

    document.querySelectorAll('meta[http-equiv="refresh" i]').forEach(meta => {
      const match = (meta.content || '').match(/url\s*=\s*['"]?([^'"]+)/i);
      if (match) addCandidate(found, match[1]);
    });

    // Read URLs from page data only; do not call hidden APIs or alter unlock behavior.
    document.querySelectorAll('script').forEach(script => {
      const type = (script.getAttribute('type') || '').toLowerCase();
      if (type !== 'application/json' && script.id !== '__NEXT_DATA__') return;
      const source = script.textContent || '';
      const matches = source.match(/https?:\\?\/\\?\/[a-z0-9.-]+(?::\d+)?[^\s"'<>\\]*/gi) || [];
      for (const value of matches) addCandidate(found, value);
    });

    return [...found];
  }

  function render(urls) {
    const signature = urls.join('\n');
    if (signature === lastRender) return;
    lastRender = signature;
    results.replaceChildren();

    if (!urls.length) {
      status.textContent = 'Still watching. Finish Work.ink’s normal steps; the destination will appear here if the page exposes it.';
      return;
    }

    status.textContent = `Destination candidate${urls.length === 1 ? '' : 's'} detected:`;
    for (const url of urls) {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const link = document.createElement('a');
      link.className = 'wlb-result';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = url;

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy';
      copy.style.cssText = 'border:0;border-radius:8px;padding:8px;background:#334155;color:#fff';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          copy.textContent = 'Copied';
        } catch (_) {
          copy.textContent = 'Copy blocked';
        }
      });

      row.append(link, copy);
      results.appendChild(row);
    }
  }

  function check() {
    currentBox.value = location.href;
    const urls = scanPage();
    urls.forEach(url => known.add(url));
    render([...known]);
  }

  function openPanel() {
    currentBox.value = location.href;
    panel.classList.add('wlb-open');
    check();
  }

  root.querySelector('#wlb-fab').addEventListener('click', () => {
    if (panel.classList.contains('wlb-open')) panel.classList.remove('wlb-open');
    else openPanel();
  });
  root.querySelector('#wlb-close').addEventListener('click', () => panel.classList.remove('wlb-open'));
  root.querySelector('#wlb-find').addEventListener('click', check);

  // Detect links inserted later by the page after its normal unlock flow.
  const observer = new MutationObserver(() => {
    if (panel.classList.contains('wlb-open')) check();
    else {
      const urls = scanPage();
      urls.forEach(url => known.add(url));
      if (urls.length) {
        lastRender = '';
        status.textContent = 'Destination detected. Open the button to view it.';
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['href','data-href','data-url','data-destination','data-redirect','content']
  });

  // A few delayed checks catch page state populated after initial rendering.
  let checks = 0;
  const timer = setInterval(() => {
    const urls = scanPage();
    urls.forEach(url => known.add(url));
    if (urls.length) {
      status.textContent = 'Destination detected. Open the button to view it.';
      clearInterval(timer);
    }
    if (++checks >= 120) clearInterval(timer);
  }, 1000);

  window.addEventListener('pageshow', check);
  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);
})();
