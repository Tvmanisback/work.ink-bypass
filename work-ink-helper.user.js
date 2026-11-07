// ==UserScript==
// @name         Work.ink Helper
// @namespace    https://github.com/Tvmanisback/work.ink-bypass
// @version      1.0.0
// @description  Adds a small Work.ink button and popup that sends the current link to BypassLinks.
// @match        https://work.ink/*
// @match        https://*.work.ink/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  const RESOLVER = 'https://bypass-link.com/';
  const STYLE_ID = 'tv-workink-helper-style';
  const ROOT_ID = 'tv-workink-helper-root';

  if (window.top !== window.self || document.getElementById(ROOT_ID)) return;

  const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 4.8 13h5.7l-.8 8.5L19.2 11h-5.7l-.3-8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}, #${ROOT_ID} * { box-sizing:border-box; }
    #${ROOT_ID} { position:fixed; right:20px; bottom:20px; z-index:2147483647; font:14px/1.45 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#f8fafc; }
    #${ROOT_ID} button { font:inherit; cursor:pointer; }
    #tvwi-fab { width:54px;height:54px;border:1px solid #ffffff2b;border-radius:18px;background:linear-gradient(145deg,#2563eb,#7c3aed);color:white;box-shadow:0 12px 34px #0008;display:grid;place-items:center; }
    #tvwi-fab svg { width:25px;height:25px; }
    #tvwi-panel { display:none; position:absolute; right:0; bottom:66px; width:min(340px,calc(100vw - 32px)); padding:18px; border:1px solid #ffffff20; border-radius:18px; background:#111827; box-shadow:0 18px 55px #000b; }
    #tvwi-panel.tvwi-open { display:block; }
    #tvwi-head { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px; }
    #tvwi-title { font-size:16px;font-weight:750;letter-spacing:.1px; }
    #tvwi-close { width:30px;height:30px;border:0;border-radius:9px;background:#ffffff12;color:#cbd5e1;font-size:20px; }
    #tvwi-desc { margin:0 0 14px;color:#aebbd0;font-size:13px; }
    #tvwi-url { width:100%;height:76px;resize:none;border:1px solid #ffffff20;border-radius:10px;padding:10px;background:#0b1220;color:#e5e7eb;font:12px/1.4 ui-monospace,monospace;overflow-wrap:anywhere; }
    #tvwi-bypass { width:100%;margin-top:12px;padding:11px 14px;border:0;border-radius:10px;background:linear-gradient(100deg,#3b82f6,#8b5cf6);color:white;font-weight:750; }
    #tvwi-note { margin:10px 0 0;color:#8795aa;font-size:11px; }
  `;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section id="tvwi-panel" role="dialog" aria-modal="false" aria-label="Work.ink helper">
      <div id="tvwi-head"><div id="tvwi-title">Work.ink Helper</div><button id="tvwi-close" type="button" aria-label="Close">×</button></div>
      <p id="tvwi-desc">Your current Work.ink address is detected automatically.</p>
      <textarea id="tvwi-url" readonly aria-label="Detected Work.ink URL"></textarea>
      <button id="tvwi-bypass" type="button">Bypass link ↗</button>
      <p id="tvwi-note">Opens BypassLink in a new tab. The resolver's result is shown there; this script cannot read another site's result page directly.</p>
    </section>
    <button id="tvwi-fab" type="button" aria-label="Open Work.ink Helper" title="Work.ink Helper">${icon}</button>
  `;
  document.documentElement.appendChild(root);

  const panel = root.querySelector('#tvwi-panel');
  const urlBox = root.querySelector('#tvwi-url');
  const fab = root.querySelector('#tvwi-fab');

  function currentWorkInkUrl() {
    // Use the live address bar URL, preserving the full path and query string.
    return window.location.href;
  }

  function openPanel() {
    urlBox.value = currentWorkInkUrl();
    panel.classList.add('tvwi-open');
  }

  fab.addEventListener('click', () => {
    if (panel.classList.contains('tvwi-open')) panel.classList.remove('tvwi-open');
    else openPanel();
  });

  root.querySelector('#tvwi-close').addEventListener('click', () => panel.classList.remove('tvwi-open'));

  root.querySelector('#tvwi-bypass').addEventListener('click', () => {
    const current = currentWorkInkUrl();
    if (!/^https:\/\/([a-z0-9-]+\.)?work\.ink\//i.test(current)) {
      urlBox.value = 'This does not look like a Work.ink URL.';
      return;
    }
    const destination = RESOLVER + '?url=' + encodeURIComponent(current) + '&ref=workink-helper';
    window.open(destination, '_blank', 'noopener,noreferrer');
  });
})();
