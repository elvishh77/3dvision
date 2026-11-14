// Data & model page: dataset charts from data_stats.json, sample gallery, conditioning strips, diagram glyphs.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n).toLocaleString();
  // palette validated against the cream surface (blue/green and blue/coral pairs pass CVD + contrast checks)
  const BLUE = "#3f86b8", GREEN = "#58a046", CORAL = "#d9654f", INK = "#3e3a39", MUTED = "#6b6463", GRID = "#e6dfd2";
  const tip = $("tip");
  const showTip = (ev, html) => { tip.innerHTML = html; tip.style.display = "block"; moveTip(ev); };
  const moveTip = (ev) => { const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8); tip.style.left = x + "px"; tip.style.top = ev.clientY + 14 + "px"; };
  const hideTip = () => (tip.style.display = "none");
  function wireTips(el) {
    el.querySelectorAll("[data-tip]").forEach((m) => {
      m.addEventListener("mousemove", (e) => showTip(e, m.dataset.tip));
      m.addEventListener("mouseleave", hideTip);
    });
  }

  // Horizontal bars. rows: [{label, value, color?, note?}] ; series: optional 2-series [{key,label,color}]
  function hbar(el, rows, opts = {}) {
    const series = opts.series || [{ key: "value", color: BLUE }];
    const W = 460, LW = opts.labelW || 130, barH = opts.barH || (series.length > 1 ? 10 : 16), gap = series.length > 1 ? 3 : 0, rowGap = 10;
    const rowH = series.length * barH + (series.length - 1) * gap;
    const H = rows.length * (rowH + rowGap) + 8;
    const max = Math.max(...rows.flatMap((r) => series.map((s) => r[s.key]))) || 1;
    const X = (v) => LW + (v / max) * (W - LW - 64);
    let g = "";
    rows.forEach((r, i) => {
      const y0 = 4 + i * (rowH + rowGap);
      g += `<text x="${LW - 8}" y="${y0 + rowH / 2 + 4}" text-anchor="end" fill="${INK}" font-size="12">${esc(r.label)}</text>`;
      series.forEach((s, j) => {
        const y = y0 + j * (barH + gap), v = r[s.key], w = Math.max(8, X(v) - LW), c = r.color || s.color;
        const txt = opts.pct ? `${(100 * v).toFixed(0)}%` : fmt(v);
        g += `<g data-tip="<b>${esc(r.label)}</b>${s.label ? " · " + esc(s.label) : ""}<br>${txt}${r.note ? "<br>" + esc(r.note) : ""}">
          <rect x="${LW}" y="${y - 2}" width="${W - LW}" height="${barH + 4}" fill="transparent"/>
          <path d="M${LW},${y} h${w - 4} a4,4 0 0 1 4,4 v${barH - 8} a4,4 0 0 1 -4,4 h-${w - 4} z" fill="${c}"/>
          <text x="${LW + w + 6}" y="${y + barH / 2 + 4}" fill="${MUTED}" font-size="11">${txt}${r.note && j === 0 ? " · " + esc(r.note) : ""}</text></g>`;
      });
    });
    const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join("")}</div>` : "";
    el.innerHTML = legend + `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || "bar chart")}">${g}</svg>`;
    wireTips(el);
  }

  // Vertical histogram
  function vbar(el, labels, values, opts = {}) {
    const W = 460, H = 190, L = 40, B = 34, T = 10, R = 8;
    const max = Math.max(...values) || 1, n = values.length, bw = (W - L - R) / n;
    const Y = (v) => T + (1 - v / max) * (H - T - B);
    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4;
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GRID}" stroke-dasharray="4 4"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" fill="${MUTED}" font-size="11">${fmt(Math.round(v))}</text>`;
    }
    values.forEach((v, i) => {
      const x = L + i * bw + 1, w = bw - 2, h = Math.max(v > 0 ? 6 : 0, H - B - Y(v)), y = H - B - h;
      g += `<g data-tip="<b>${esc(labels[i])}</b> of frames with contact<br>${fmt(v)} clips"><rect x="${x}" y="${T}" width="${w}" height="${H - B - T}" fill="transparent"/>
        <path d="M${x},${H - B} v-${Math.max(0, h - 4)} a4,4 0 0 1 4,-4 h${w - 8} a4,4 0 0 1 4,4 v${Math.max(0, h - 4)} z" fill="${BLUE}"/></g>`;
    });
    for (let k = 0; k <= n; k += 2) g += `<text x="${L + k * bw}" y="${H - B + 16}" text-anchor="middle" fill="${MUTED}" font-size="11">${Math.round(100 * k / n)}%</text>`;
    g += `<text x="${(L + W) / 2}" y="${H - 2}" text-anchor="middle" fill="${MUTED}" font-size="11">${esc(opts.xlabel || "")}</text>`;
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || "histogram")}">${g}</svg>`;
    wireTips(el);
  }

  const OUTCOME_LABEL = { lifted: "lifted", moved: "moved", placed: "set down", rotated: "rotated only", held: "held", handover: "handed over", "no object moved": "no object moved" };

  fetch("data_stats.json").then((r) => r.json()).then((d) => {
    const tiles = [
      ["bg-coral-soft", fmt(d.n_windows), "49-frame clips at 512 × 512, 16 fps"],
      ["bg-yellow-soft", `${fmt(d.split.train)} / ${fmt(d.split["held-out (P0015)"])}`, "training / held-out clips"],
      ["bg-sky-soft", d.n_participants, "participants (one held out)"],
      ["bg-mint-soft", `${Math.round(100 * d.contact_frac_mean)}%`, "of frames have a hand touching an object"],
    ];
    $("data-stats").innerHTML = tiles.map(([c, v, t]) => `<div class="card ${c}"><div class="stat">${esc(v)}</div><div class="muted">${esc(t)}</div></div>`).join("");
    hbar($("ch-part"), d.per_participant.map(([p, n]) => ({ label: p, value: n, color: p === "P0015" ? CORAL : BLUE, note: p === "P0015" ? "held out" : "" })), { labelW: 70, aria: "clips per participant" });
    hbar($("ch-outcome"), d.outcomes.map(([k, n]) => ({ label: OUTCOME_LABEL[k] || k, value: n })), { aria: "outcome types" });
    const ACT = { both: "both hands", right: "right only", left: "left only", none: "neither" };
    hbar($("ch-active"), d.active_hands.map(([k, n]) => ({ label: ACT[k] || k, value: n })), { aria: "active hands" });
    hbar($("ch-objects"), d.objects_top.slice(0, 12).map(([k, n]) => ({ label: k, value: n })), { labelW: 150, aria: "most handled objects" });
    const PARTS = ["palm", "thumb", "index", "middle", "ring", "pinky"];
    hbar($("ch-parts"), PARTS.map((p, i) => ({ label: p, L: d.part_contact_rate[0][i], R: d.part_contact_rate[1][i] })),
      { series: [{ key: "L", label: "left hand", color: BLUE }, { key: "R", label: "right hand", color: GREEN }], pct: true, labelW: 70, aria: "contact by hand part" });
    const h = d.contact_frac_hist;
    vbar($("ch-contact"), h.counts.map((_, i) => `${Math.round(100 * h.bins[i])}–${Math.round(100 * h.bins[i + 1])}%`), h.counts, { xlabel: "share of the clip's frames with contact", aria: "contact share histogram" });
  });

  fetch("assets/media/train_gallery.json").then((r) => r.json()).then((g) => {
    const ORDER = ["lifted", "placed", "moved", "rotated", "handover", "held"], BG = ["bg-coral", "bg-yellow", "bg-sky", "bg-mint", "bg-coral", "bg-yellow"];
    g.sort((a, b) => ORDER.indexOf(a.outcome) - ORDER.indexOf(b.outcome));
    $("gal").innerHTML = g.map((s, i) => `<figure style="margin:0">
      <div class="media"><video src="assets/media/train_${s.id}.mp4" poster="assets/media/train_${s.id}_poster.jpg" controls muted loop playsinline preload="none"></video></div>
      <figcaption class="cap"><span class="badge ${BG[i].replace("bg-", "") === "coral" ? "bad" : BG[i].replace("bg-", "") === "yellow" ? "warn" : BG[i].replace("bg-", "") === "sky" ? "info" : "ok"}">${esc(OUTCOME_LABEL[s.outcome] || s.outcome)}</span>
        <span class="badge plain">${esc(s.participant)}</span> <span class="badge plain">${esc(s.active === "both" ? "both hands" : s.active + " hand")}</span><br>
        <b>Prompt:</b> ${esc(s.prompt)}</figcaption></figure>`).join("");
  });

  const ROWS = [["video", "Video frame", "what the camera sees (shown for reference, not part of cond)"],
    ["identity", "Keypoint identity", "ch 0–55: each of the 42 joints writes its own fixed code (colour = code)"],
    ["surface", "Hand surface", "ch 58–59: all 778 MANO vertices; blue = left, green = right"],
    ["contact", "Contact", "ch 60–61: vertices within 10 mm of an object, in red"],
    ["depth", "Depth", "ch 62–63: distance of the keypoints from the camera"]];
  $("cond-rows").innerHTML = ROWS.map(([k, t, d]) => `<div class="condrow"><div class="cl"><b>${esc(t)}</b><div class="muted small">${esc(d)}</div></div>
    <img src="assets/media/cond/cond_${k}.png" alt="${esc(t)} at frames 0, 12, 24, 36, 48" loading="lazy"></div>`).join("");

  // frame packing diagram: 49 ticks -> 13 boxes
  (function () {
    const top = $("pk-top"), bot = $("pk-bot"), x0 = 8, fw = 9;
    let t = "", b = "";
    const COLS = ["#fbe4df", "#fcf1cf", "#e2f1f8", "#e7f3df"];
    for (let f = 0; f < 49; f++) {
      const lat = f === 0 ? 0 : Math.ceil(f / 4);
      t += `<rect x="${x0 + f * fw}" y="26" width="${fw - 2}" height="22" rx="2" fill="${COLS[lat % 4]}" stroke="#3e3a39" stroke-width="1.2"/>`;
    }
    for (let l = 0; l < 13; l++) {
      const f0 = l === 0 ? 0 : 4 * l - 3, f1 = l === 0 ? 0 : 4 * l;
      const xa = x0 + f0 * fw + (fw - 2) / 2, xb = x0 + f1 * fw + (fw - 2) / 2, bx = x0 + l * 34, bc = bx + 13;
      t += `<path d="M${(xa + xb) / 2},50 L${bc},96" stroke="#6b6463" stroke-width="1" fill="none"/>`;
      b += `<rect x="${bx}" y="96" width="26" height="20" rx="4" fill="${COLS[l % 4]}" stroke="#3e3a39" stroke-width="1.6"/><text x="${bc}" y="111" text-anchor="middle" style="font-size:11px">${l}</text>`;
    }
    top.innerHTML = t; bot.innerHTML = b;
  })();

  // diagram glyphs: 30 base blocks (1-8 highlighted) and 8 adapter blocks
  (function () {
    let g = "";
    for (let i = 0; i < 30; i++) {
      const r = Math.floor(i / 10), c = i % 10, x = 565 + c * 29, y = 96 + r * 70;
      g += `<rect x="${x}" y="${y}" width="24" height="52" rx="5" fill="${i < 8 ? "#e2f1f8" : "#fffcf6"}" stroke="#3e3a39" stroke-width="1.5"/>
        <text x="${x + 12}" y="${y + 31}" text-anchor="middle" style="font-size:11px">${i + 1}</text>`;
    }
    $("base-blocks").innerHTML = g;
    let a = "";
    for (let i = 0; i < 8; i++) {
      const x = 573 + i * 36;
      a += `<rect x="${x}" y="458" width="28" height="56" rx="5" fill="#fffcf6" stroke="#3e3a39" stroke-width="1.5"/><text x="${x + 14}" y="490" text-anchor="middle" style="font-size:11px">${i + 1}′</text>`;
    }
    $("ad-blocks").innerHTML = a;
  })();
})();
