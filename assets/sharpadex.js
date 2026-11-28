// SharpaDex held-out eval page: renders assets/media/sharpadex_heldout_compare/{eval.json, demo.json} (pushed from CoreWeave).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const D = "assets/media/sharpadex_heldout_compare/";
  const f1 = (v) => (v == null ? "–" : (+v).toFixed(1));
  const sgn = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
  // Model order and colours. The three generated models take the first three slots of the validated categorical palette
  // (valid for all-pairs forms such as dot plots); the "first frame repeated" reference is a neutral grey tick, not a series.
  let MODELS = [
    { key: "a14b_v4", short: "A14B + hand adapter", color: "#2a78d6", ours: true },
    // same A14B model fine-tuned on the same data without hand input: same hue as the adapter, hollow (shape encodes "no hands")
    { key: "a14b_lora", short: "A14B + LoRA, no hands", color: "#2a78d6", hollow: true },
    { key: "camlora", short: "1.3B camera + LoRA", color: "#eb6834" },
    { key: "base_a14b", short: "Plain A14B", color: "#1baf7a" },
    { key: "static", short: "First frame repeated", color: "#6b6463", ref: true },
  ];
  const METRICS = [["psnr", "Full frame"], ["psnr_hand", "Hand region"], ["psnr_outside", "Outside hands"]];
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  Promise.all([fetch(D + "eval.json", { cache: "no-store" }).then((r) => r.json()),
               fetch(D + "demo.json", { cache: "no-store" }).then((r) => r.json())]).then(([E, V]) => {
    const S = E.summary, clips = E.clips, P = S.paired;
    MODELS = MODELS.filter((x) => S.mean[x.key] && clips.every((c) => c[x.key]));   // a model appears once eval.json has it
    const pd = (other, m) => P[`a14b_v4_minus_${other}`][m];

    // ---- headline tiles
    const tile = (label, d, bg) => `<div class="card tile ${bg}"><div class="small muted">${esc(label)}</div>
      <div class="big">${sgn(d.mean_diff)} dB</div><div class="small">95% CI [${sgn(d.ci95[0])}, ${sgn(d.ci95[1])}] · better on ${d.wins} of ${d.n} clips</div></div>`;
    $("tiles").innerHTML = [
      ...(P.a14b_v4_minus_a14b_lora ? [tile("Hand region: adapter vs A14B + LoRA without hands", pd("a14b_lora", "psnr_hand"), "bg-coral-soft")] : []),
      tile("Hand region: adapter vs plain A14B", pd("base_a14b", "psnr_hand"), "bg-mint-soft"),
      tile("Hand region: adapter vs 1.3B camera + LoRA", pd("camlora", "psnr_hand"), "bg-sky-soft"),
      tile("Hand region: adapter vs first frame repeated", pd("static", "psnr_hand"), "bg-yellow-soft"),
    ].join("");

    // ---- mean table (model x metric), best generated model per column marked
    const bestOf = (m) => Math.max(...MODELS.filter((x) => !x.ref).map((x) => S.mean[x.key][m]));
    $("mean-table").innerHTML = `<tr><th>Mean PSNR (dB), ${S.n_clips} clips</th>${METRICS.map(([, l]) => `<th>${l}</th>`).join("")}</tr>` +
      MODELS.map((x) => `<tr class="${x.ref ? "ref" : ""}"><td>${esc(E.models[x.key] || x.short)}</td>${METRICS.map(([m]) => {
        const v = S.mean[x.key][m]; return !x.ref && v === bestOf(m) ? `<td class="best"><span>${f1(v)}</span></td>` : `<td>${f1(v)}</td>`;
      }).join("")}</tr>`).join("");

    // ---- paired table
    const others = [["a14b_lora", "A14B + LoRA, no hands"], ["base_a14b", "Plain A14B"], ["camlora", "1.3B camera + LoRA"], ["static", "First frame repeated"]].filter(([k]) => P[`a14b_v4_minus_${k}`]);
    $("paired-table").innerHTML = `<tr><th>A14B + hand adapter minus …</th>${METRICS.map(([, l]) => `<th>${l}</th>`).join("")}</tr>` +
      others.map(([k, l]) => `<tr><td>${esc(l)}</td>${METRICS.map(([m]) => { const d = pd(k, m);
        return `<td>${sgn(d.mean_diff)} <span class="muted small">[${sgn(d.ci95[0])}, ${sgn(d.ci95[1])}] · ${d.wins}/${d.n}</span></td>`; }).join("")}</tr>`).join("");
    $("paired-cap").textContent = `Paired per clip (same first frame, prompt and seed). 95% CI: bootstrap over the ${S.n_episodes} held-out episodes; "${S.n_clips}/${S.n_clips}" = clips where the adapter is better. The 1.3B camera + LoRA model never trained on SharpaDex; the A14B adapter trained on other SharpaDex episodes.`;

    // ---- per-episode dot plot (hand-region PSNR)
    const eps = [...new Set(clips.map((c) => c.episode))].sort((a, b) => a - b);
    const ep = eps.map((e) => { const cs = clips.filter((c) => c.episode === e);
      return { e, n: cs.length, v: Object.fromEntries(MODELS.map((x) => [x.key, mean(cs.map((c) => c[x.key].psnr_hand))])) }; });
    const W = 840, H = 320, L = 44, R = 178, T = 14, B = 40;
    const all = ep.flatMap((r) => MODELS.map((x) => r.v[x.key]));
    const y0 = Math.floor(Math.min(...all) - 0.5), y1 = Math.ceil(Math.max(...all) + 0.5);
    const bw = (W - L - R) / ep.length, X = (i) => L + bw * (i + 0.5), Y = (v) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
    let g = "";
    for (let t = Math.ceil(y0 / 2) * 2; t <= y1; t += 2)
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1"/>` +
           `<text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="var(--ink-2)">${t}</text>`;
    g += `<text x="12" y="${T + (H - T - B) / 2}" transform="rotate(-90 12 ${T + (H - T - B) / 2})" text-anchor="middle" font-size="11" fill="var(--ink-2)">hand-region PSNR (dB)</text>`;
    ep.forEach((r, i) => { g += `<text x="${X(i)}" y="${H - B + 16}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)">${r.e}</text>`; });
    g += `<text x="${L + (W - L - R) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-2)">held-out episode</text>`;
    const mark = (x, cx, cy) => x.ref
      ? `<line x1="${cx - 7}" x2="${cx + 7}" y1="${cy}" y2="${cy}" stroke="${x.color}" stroke-width="2.5" stroke-linecap="round"/>`
      : x.hollow ? `<circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--card)" stroke="${x.color}" stroke-width="2.5"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${x.ours ? 5.5 : 4.5}" fill="${x.color}" stroke="var(--card)" stroke-width="2"/>`;
    let marks = "";
    ep.forEach((r, i) => { [...MODELS].reverse().forEach((x) => { marks += mark(x, X(i), Y(r.v[x.key])); }); });
    // direct labels at the right edge, at each series' mean over episodes, nudged apart
    const lab = MODELS.map((x) => ({ x, y: Y(mean(ep.map((r) => r.v[x.key]))) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 15) lab[k].y = lab[k - 1].y + 15;
    const labels = lab.map(({ x, y }) => `${mark(x, W - R + 14, y)}<text x="${W - R + 26}" y="${y + 4}" font-size="11.5" fill="var(--ink)">${esc(x.short)}</text>`).join("");
    const hits = ep.map((r, i) => `<rect class="hit" data-i="${i}" x="${X(i) - bw / 2}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>`).join("");
    $("ep-chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mean hand-region PSNR per held-out SharpaDex episode for four models">
      ${g}<rect id="ep-hl" x="0" y="${T}" width="${bw}" height="${H - T - B}" fill="var(--grid)" opacity="0" />${marks}${labels}${hits}</svg><div class="tip" id="ep-tip"></div>`;
    const svg = $("ep-chart").querySelector("svg"), tip = $("ep-tip"), hl = $("ep-hl");
    svg.querySelectorAll(".hit").forEach((h) => {
      h.addEventListener("mousemove", (ev) => {
        const r = ep[+h.dataset.i], box = $("ep-chart").getBoundingClientRect();
        hl.setAttribute("x", X(+h.dataset.i) - bw / 2); hl.setAttribute("opacity", "0.45");
        tip.innerHTML = `<div><b>Episode ${r.e}</b> · ${r.n} clips</div>` + MODELS.map((x) =>
          `<div>${x.ref ? "–" : "●"} ${esc(x.short)}: <b>${f1(r.v[x.key])}</b> dB</div>`).join("");
        tip.style.display = "block";
        const tx = ev.clientX - box.left + 14, tw = tip.offsetWidth;
        tip.style.left = Math.min(tx, box.width - tw - 4) + "px"; tip.style.top = Math.max(0, ev.clientY - box.top - 20) + "px";
      });
      h.addEventListener("mouseleave", () => { tip.style.display = "none"; hl.setAttribute("opacity", "0"); });
    });
    $("ep-legend").innerHTML = MODELS.map((x) => `<span><svg viewBox="0 0 18 12">${x.ref
      ? `<line x1="2" x2="16" y1="6" y2="6" stroke="${x.color}" stroke-width="2.5" stroke-linecap="round"/>`
      : x.hollow ? `<circle cx="9" cy="6" r="4" fill="none" stroke="${x.color}" stroke-width="2.5"/>` : `<circle cx="9" cy="6" r="4.5" fill="${x.color}"/>`}</svg>${esc(x.short)}</span>`).join("");
    $("ep-table").innerHTML = `<tr><th>Episode</th><th>Clips</th>${MODELS.map((x) => `<th>${esc(x.short)}</th>`).join("")}</tr>` +
      ep.map((r) => `<tr><td>${r.e}</td><td>${r.n}</td>${MODELS.map((x) => `<td>${f1(r.v[x.key])}</td>`).join("")}</tr>`).join("");

    // ---- by task step: two simple groupings computed from the per-clip steps
    const groups = [
      ["Only picking up gears", (c) => c.steps.every((s) => s.action === "pick")],
      ["Includes inserting a gear", (c) => c.steps.some((s) => s.action === "insert")],
      ["Ends on gear 1", (c) => c.steps[c.steps.length - 1].gear === 1],
      ["Ends on gear 2", (c) => c.steps[c.steps.length - 1].gear === 2],
      ["Ends on gear 3", (c) => c.steps[c.steps.length - 1].gear === 3],
      ["Episode start (first window)", (c) => c.window_offset === 0],
    ];
    $("step-table").innerHTML = `<tr><th>Clips</th><th>n</th>${MODELS.map((x) => `<th>${esc(x.short)}</th>`).join("")}<th>Adapter − camera + LoRA</th></tr>` +
      groups.map(([l, fn]) => { const cs = clips.filter(fn); if (!cs.length) return "";
        const v = (k) => mean(cs.map((c) => c[k].psnr_hand));
        const best = Math.max(...MODELS.filter((x) => !x.ref).map((x) => v(x.key)));
        return `<tr><td>${esc(l)}</td><td>${cs.length}</td>${MODELS.map((x) => { const val = v(x.key);
          return !x.ref && val === best ? `<td class="best"><span>${f1(val)}</span></td>` : `<td${x.ref ? ' class="muted"' : ""}>${f1(val)}</td>`; }).join("")}
          <td>${sgn(mean(cs.map((c) => c.a14b_v4.psnr_hand - c.camlora.psnr_hand)))}</td></tr>`; }).join("");

    // ---- training-length curve (v4 milestones), change since the first milestone
    const SC = S.step_curve;
    if (SC && SC.keys && SC.keys.every((k) => S.mean[k])) {
      $("length").style.display = "";
      const LM = [{ m: "psnr_hand", label: "Hand region", color: "#2a78d6", w: 3 },
                  { m: "psnr", label: "Full frame", color: "#3e3a39", w: 2 },
                  { m: "psnr_outside", label: "Outside hands", color: "#6b6463", w: 2, dash: "6 4" }];
      const st = SC.steps, base = (m) => S.mean[SC.keys[0]][m];
      const dv = (k, m) => S.mean[k][m] - base(m);
      const vals = LM.flatMap((l) => SC.keys.map((k) => dv(k, l.m)));
      const W2 = 820, H2 = 280, L2 = 70, R2 = 130, T2 = 14, B2 = 40;
      const ya = Math.min(0, ...vals) - 0.1, yb = Math.max(...vals) + 0.15;
      const XS = (s) => L2 + (W2 - L2 - R2) * (s - st[0]) / (st[st.length - 1] - st[0]), YS = (v) => T2 + (H2 - T2 - B2) * (1 - (v - ya) / (yb - ya));
      let gg = "";
      for (let t = Math.ceil(ya * 4) / 4; t <= yb; t += 0.25)
        gg += `<line x1="${L2}" x2="${W2 - R2}" y1="${YS(t)}" y2="${YS(t)}" stroke="var(--grid)" stroke-width="${Math.abs(t) < 1e-9 ? 2 : 1}"/>` +
              `<text x="${L2 - 8}" y="${YS(t) + 4}" text-anchor="end" font-size="11" fill="var(--ink-2)">${t > 0 ? "+" : ""}${t.toFixed(2)}</text>`;
      st.forEach((s) => { gg += `<text x="${XS(s)}" y="${H2 - B2 + 16}" text-anchor="middle" font-size="11" fill="var(--ink-2)">${s.toLocaleString()}</text>`; });
      gg += `<text x="${L2 + (W2 - L2 - R2) / 2}" y="${H2 - 6}" text-anchor="middle" font-size="11" fill="var(--ink-2)">training step</text>`;
      gg += `<text x="13" y="${T2 + (H2 - T2 - B2) / 2}" transform="rotate(-90 13 ${T2 + (H2 - T2 - B2) / 2})" text-anchor="middle" font-size="11" fill="var(--ink-2)">PSNR change since 1,250 (dB)</text>`;
      let ln = "";
      LM.forEach((l) => {
        const pts = SC.keys.map((k, i) => [XS(st[i]), YS(dv(k, l.m))]);
        ln += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${l.color}" stroke-width="${l.w}" ${l.dash ? `stroke-dasharray="${l.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>` +
              pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${l.color}" stroke="var(--card)" stroke-width="2"/>`).join("");
      });
      const ends = LM.map((l) => ({ l, y: YS(dv(SC.keys[SC.keys.length - 1], l.m)) })).sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 15) ends[k].y = ends[k - 1].y + 15;
      const elab = ends.map(({ l, y }) => `<text x="${W2 - R2 + 12}" y="${y + 4}" font-size="11.5" fill="var(--ink)">${l.label}</text>`).join("");
      const hit2 = st.map((s, i) => `<rect class="hit2" data-i="${i}" x="${XS(s) - 40}" y="${T2}" width="80" height="${H2 - T2 - B2}" fill="transparent"/>`).join("");
      $("len-chart").innerHTML = `<svg viewBox="0 0 ${W2} ${H2}" role="img" aria-label="PSNR change versus training step for full frame, hand region and outside hands">${gg}${ln}${elab}${hit2}</svg><div class="tip" id="len-tip"></div>`;
      const tip2 = $("len-tip");
      $("len-chart").querySelectorAll(".hit2").forEach((h) => {
        h.addEventListener("mousemove", (ev) => { const i = +h.dataset.i, k = SC.keys[i], box = $("len-chart").getBoundingClientRect();
          tip2.innerHTML = `<div><b>Step ${st[i].toLocaleString()}</b></div>` + LM.map((l) => `<div>${l.label}: <b>${f1(S.mean[k][l.m])}</b> dB (${sgn(dv(k, l.m))})</div>`).join("");
          tip2.style.display = "block"; const tw = tip2.offsetWidth;
          tip2.style.left = Math.min(ev.clientX - box.left + 14, box.width - tw - 4) + "px"; tip2.style.top = Math.max(0, ev.clientY - box.top - 20) + "px"; });
        h.addEventListener("mouseleave", () => { tip2.style.display = "none"; });
      });
      $("len-abs").innerHTML = `<tr><th>Step</th>${LM.map((l) => `<th>${l.label} (dB)</th>`).join("")}</tr>` +
        SC.keys.map((k, i) => `<tr><td>${st[i].toLocaleString()}</td>${LM.map((l) => `<td>${(+S.mean[k][l.m]).toFixed(2)}</td>`).join("")}</tr>`).join("");
      // step-to-step paired changes (keys are "later_minus_earlier", except the last pair which is stored as 3750 - 5000)
      const pairs = [];
      for (let i = 1; i < SC.keys.length; i++) {
        const a = SC.keys[i - 1], b = SC.keys[i];
        let d = P[`${b}_minus_${a}`], flip = false;
        if (!d) { d = P[`${a}_minus_${b}`]; flip = true; }
        if (d) pairs.push({ from: st[i - 1], to: st[i], d, flip });
      }
      const cell = (x, flip) => { const m = flip ? -x.mean_diff : x.mean_diff, lo = flip ? -x.ci95[1] : x.ci95[0], hi = flip ? -x.ci95[0] : x.ci95[1];
        const sig = lo > 0 || hi < 0; return `<td${sig ? "" : ' style="color:var(--ink-2);opacity:.6"'}>${sgn(m)} <span class="muted small">[${sgn(lo)}, ${sgn(hi)}]</span></td>`; };
      $("len-table").innerHTML = `<tr><th>Paired change (later minus earlier)</th>${LM.map((l) => `<th>${l.label}</th>`).join("")}</tr>` +
        pairs.map((p) => `<tr><td>${p.from.toLocaleString()} → ${p.to.toLocaleString()}</td>${LM.map((l) => cell(p.d[l.m], p.flip)).join("")}</tr>`).join("");
      $("len-cap").textContent = "SharpaDex. 95% CI: bootstrap over the 20 held-out episodes; greyed = the interval includes 0. After 3,750 the full-frame gain comes from outside the hands (scene and background); hand-region PSNR stops improving here.";
      // HRDexDB step curve (same checkpoints); human clips split into held-out objects vs clips from the training set
      Promise.all([fetch("assets/media/hrdexdb_human_a14b/step_curve.json", { cache: "no-store" }).then((r) => r.json()),
                   fetch("assets/media/hrdexdb_human_a14b/demo.json", { cache: "no-store" }).then((r) => r.json())]).then(([H, HD]) => {
        const K = SC.keys, train = new Set((HD.items || []).filter((it) => /training set/.test(it.note || "")).map((it) => it.id));
        let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
        const boot = (d) => { const ms = []; for (let b = 0; b < 4000; b++) { let t = 0; for (let i = 0; i < d.length; i++) t += d[Math.floor(rnd() * d.length)]; ms.push(t / d.length); }
          ms.sort((x, y) => x - y); return [ms[Math.floor(0.025 * ms.length)], ms[Math.floor(0.975 * ms.length)]]; };
        const row = (label, pc, ids) => {
          const means = K.map((k) => mean(ids.map((c) => pc[k][c].psnr_hand)));
          const d = ids.map((c) => pc[K[K.length - 1]][c].psnr_hand - pc[K[K.length - 2]][c].psnr_hand), ci = boot(d), m = mean(d);
          const sig = ci[0] > 0 || ci[1] < 0;
          return `<tr><td>${esc(label)}</td><td>${ids.length}</td>${means.map((v) => `<td>${v.toFixed(2)}</td>`).join("")}<td${sig ? "" : ' style="color:var(--ink-2);opacity:.6"'}>${sgn(m)} <span class="muted small">[${sgn(ci[0])}, ${sgn(ci[1])}]</span></td></tr>`;
        };
        const hp = H.human.per_clip, rp = H.inspire_robot.per_clip, hid = Object.keys(hp[K[0]]), rid = Object.keys(rp[K[0]]);
        $("len-hrdex").innerHTML = `<tr><th>Hand-region PSNR (dB)</th><th>n</th>${st.map((s) => `<th>${s.toLocaleString()}</th>`).join("")}<th>3,750 → 5,000 (paired)</th></tr>` +
          row("Human hands, objects never seen in training", hp, hid.filter((c) => !train.has(c))) +
          row("Human hands, clips from the training set", hp, hid.filter((c) => train.has(c))) +
          row("Inspire robot hand (never seen in training)", rp, rid);
        $("len-hrdex-cap").textContent = "Seed 0; 95% CI: bootstrap over clips. On human hands the hand region keeps improving to 5,000, just as much on objects the model never saw, so it is not memorization. The robot curve dips at 3,750 and recovers (2,500 → 5,000 is flat within noise). Two of three test sets still improve at 5,000, so the curve has not clearly flattened yet.";
      }).catch(() => {});
    }

    // ---- side-by-side videos
    const byId = Object.fromEntries(clips.map((c) => [c.id, c]));
    const PL = V.panels || [];
    $("clip-list").innerHTML = (V.items || []).map((it) => { const c = byId[it.id] || {};
      const vals = it.psnr_hand || [];
      return `<figure class="demo">
        <div class="media vs4"><video src="${D}${esc(it.id)}.mp4" poster="${D}${esc(it.id)}.jpg" muted loop playsinline controls preload="none"></video>
          <div class="vlabelsN" style="grid-template-columns:repeat(${PL.length || 4},1fr)">${PL.map((p, i) => `<span class="${i === PL.length - 1 ? "ours" : i ? "mid" : ""}">${esc(p.label)}</span>`).join("")}</div></div>
        <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> ${c.step_label ? `<span class="badge plain">${esc(c.step_label)}</span>` : ""} <b>Prompt:</b> ${esc((it.prompt || "").replace(/^First-person view: /, ""))}
          ${vals.length === 4 ? `<br>Hand-region PSNR: first frame repeated ${f1(vals[0])} · plain A14B ${f1(vals[1])} · 1.3B camera + LoRA ${f1(vals[2])} · <b>A14B + hand adapter ${f1(vals[3])} dB</b>` : ""}</figcaption></figure>`; }).join("");
    $("notes").innerHTML = (E.notes || []).map((n) => `<li>${esc(n)}</li>`).join("");
    $("source").textContent = E.source || V.source || "";
  }).catch((e) => { $("tiles").innerHTML = `<div class="wip">Could not load the SharpaDex eval (${esc(e.message)}).</div>`; });
})();
