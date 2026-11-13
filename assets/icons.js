// Hand-drawn-style line icons. Usage: <span class="ico" data-i="sun"></span> (filled in on load).
(function () {
  const S = 'fill="none" stroke="#3e3a39" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
  const C = { coral: "#f2a598", yellow: "#f7d57a", sky: "#a8d2e6", mint: "#b9dba4", cream: "#fffcf6" };
  const I = {
    sun: `<circle cx="24" cy="24" r="8.5" fill="${C.yellow}" ${S}/>` +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        return `<line x1="${24 + 13 * c}" y1="${24 + 13 * s}" x2="${24 + 18 * c}" y2="${24 + 18 * s}" ${S}/>`; }).join(""),
    film: `<rect x="6" y="11" width="36" height="27" rx="6" fill="${C.coral}" ${S}/><path d="M6 18h36M6 31h36" ${S}/>` +
      `<path d="M12 11v7M20 11v7M28 11v7M36 11v7M12 31v7M20 31v7M28 31v7M36 31v7" ${S}/>`,
    bubble: `<path d="M8 12a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H22l-8 7v-7h-1a5 5 0 0 1-5-5z" fill="${C.yellow}" ${S}/>` +
      `<path d="M20 15.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.2-1.5 2.3" ${S}/><circle cx="24" cy="25.5" r=".6" fill="#3e3a39" ${S}/>`,
    warn: `<path d="M24 7 43 39H5z" fill="${C.coral}" ${S}/><path d="M24 19v9" ${S}/><circle cx="24" cy="33" r=".6" fill="#3e3a39" ${S}/>`,
    chart: `<rect x="6" y="7" width="36" height="34" rx="7" fill="${C.sky}" ${S}/><path d="M12 33l8-9 6 5 10-12" ${S}/><path d="M31 17h5v5" ${S}/>`,
    clip: `<rect x="10" y="9" width="28" height="33" rx="5" fill="${C.mint}" ${S}/><rect x="17" y="5" width="14" height="8" rx="3" fill="${C.cream}" ${S}/>` +
      `<path d="M17 27l5 5 9-10" ${S}/>`,
    team: `<circle cx="17" cy="17" r="6" fill="${C.coral}" ${S}/><circle cx="32" cy="19" r="5" fill="${C.sky}" ${S}/>` +
      `<path d="M6 39c0-7 5-12 11-12s11 5 11 12z" fill="${C.coral}" ${S}/><path d="M28 30c1.3-1.4 2.6-2 4-2 5 0 9 4.5 9 11H30" fill="${C.sky}" ${S}/>`,
    flag: `<path d="M12 42V7" ${S}/><path d="M12 9h24l-5 7 5 7H12" fill="${C.mint}" ${S}/>`,
    layers: `<path d="M24 7 42 16 24 25 6 16z" fill="${C.sky}" ${S}/><path d="M6 24l18 9 18-9" ${S}/><path d="M6 32l18 9 18-9" ${S}/>`,
    grid: `<rect x="7" y="7" width="15" height="15" rx="4" fill="${C.coral}" ${S}/><rect x="26" y="7" width="15" height="15" rx="4" fill="${C.yellow}" ${S}/>` +
      `<rect x="7" y="26" width="15" height="15" rx="4" fill="${C.sky}" ${S}/><rect x="26" y="26" width="15" height="15" rx="4" fill="${C.mint}" ${S}/>`,
    db: `<ellipse cx="24" cy="11" rx="15" ry="5" fill="${C.sky}" ${S}/><path d="M9 11v26c0 2.8 6.7 5 15 5s15-2.2 15-5V11" ${S}/>` +
      `<path d="M9 20c0 2.8 6.7 5 15 5s15-2.2 15-5M9 29c0 2.8 6.7 5 15 5s15-2.2 15-5" ${S}/>`,
    play: `<rect x="6" y="9" width="36" height="30" rx="8" fill="${C.coral}" ${S}/><path d="M20 17v14l11-7z" fill="${C.cream}" ${S}/>`,
    ruler: `<rect x="5" y="17" width="38" height="14" rx="4" fill="${C.yellow}" ${S}/><path d="M12 17v6M19 17v4M26 17v6M33 17v4M40 17v6" ${S}/>`,
    question: `<circle cx="24" cy="24" r="17" fill="${C.sky}" ${S}/><path d="M19 19a5 5 0 1 1 7 4.6c-1.3.6-2 1.5-2 2.9" ${S}/><circle cx="24" cy="32.5" r=".6" fill="#3e3a39" ${S}/>`,
    book: `<path d="M8 10c5-2 11-2 16 2v28c-5-4-11-4-16-2z" fill="${C.yellow}" ${S}/><path d="M40 10c-5-2-11-2-16 2v28c5-4 11-4 16-2z" fill="${C.mint}" ${S}/>`,
    hand: `<path d="M17 25V12a2.5 2.5 0 0 1 5 0v10M22 22V9a2.5 2.5 0 0 1 5 0v13M27 22V11a2.5 2.5 0 0 1 5 0v13M32 24v-8a2.5 2.5 0 0 1 5 0v12c0 8-5 13-12 13-5 0-8-3-11-7l-5-7a2.6 2.6 0 0 1 4-3.2L17 28" fill="${C.coral}" ${S}/>`,
    sunset: `<path d="M8 34a16 16 0 0 1 32 0z" fill="${C.yellow}" ${S}/><path d="M3 34h42" ${S}/><path d="M24 8v5M10 15l3 3M38 15l-3 3" ${S}/>`,
  };
  window.ICON = (name) => `<svg viewBox="0 0 48 48" aria-hidden="true">${I[name] || ""}</svg>`;
  const fill = () => document.querySelectorAll("[data-i]").forEach((el) => { if (!el.firstChild) el.innerHTML = window.ICON(el.dataset.i); });
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fill) : fill();
})();
