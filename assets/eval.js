// Eval page: worked-example switcher (examples.json), live results and probe table (status.json).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f = (v, d) => (v == null ? "–" : Number(v).toFixed(d));
  const ACT = { both: "both hands active", left: "left hand active", right: "right hand active", none: "no contact" };

  fetch("assets/media/eval/examples.json").then((r) => r.json()).then((ex) => {
    const tabs = $("ex-tabs"), BG = ["bg-coral", "bg-yellow", "bg-sky"];
    tabs.innerHTML = ex.map((e, i) => `<button class="pill ${BG[i % 3]}" role="tab" data-i="${i}" style="cursor:pointer;font:inherit">${esc(e.id)}</button>`).join("");
    function show(i) {
      const e = ex[i];
      tabs.querySelectorAll("button").forEach((b, j) => { b.setAttribute("aria-selected", j === i); b.style.boxShadow = j === i ? "3px 3px 0 #3e3a39" : "none"; });
      $("ex-prompt").textContent = e.prompt;
      $("ex-active").textContent = ACT[e.active] || e.active;
      for (const t of ["gt", "base"]) { const v = $(`ex-v-${t}`); v.src = `assets/media/eval/${t}_${e.id}.mp4`; v.poster = `assets/media/eval/${t}_${e.id}.jpg`; }
      const rows = [];
      for (const h of ["left", "right"]) {
        const g = e.rows.gt.hands[h], b = e.rows.base.hands[h];
        if (!g && !b) continue;
        const desc = g ? `${g.moving ? "moving" : "mostly still"}, in view ${g.frames}/49 frames` : "";
        const pair = (x, y, d) => `<td>${f(x, d)} → <b>${f(y, d)}</b></td>`;
        rows.push(`<tr><td><b>${h} hand</b><div class="small muted">${esc(desc)}</div></td>
          ${pair(g?.epe, b?.epe, 1)}${pair(g?.pck, b?.pck, 2)}${pair(g?.f1, b?.f1, 2)}${pair(g?.jitter, b?.jitter, 2)}</tr>`);
      }
      $("ex-hands").innerHTML = `<tr><th>Hand</th><th>Hand error, px ↓</th><th>PCK@25 ↑</th><th>Contact F1 ↑</th><th>Jitter (1 = real)</th></tr>` + rows.join("");
      const q = e.rows.base.questions;
      $("ex-q").innerHTML = `<tr><th>Question</th><th>Expected</th><th>P(yes)</th><th>Judge right?</th></tr>` + (q.length ? q.map((z) =>
        `<tr><td style="white-space:normal;max-width:520px">${esc(z.q)}</td><td>${z.expected ? "yes" : "no"}</td><td>${f(z.p, 2)}</td><td><span class="badge ${z.ok ? "ok" : "bad"}">${z.ok ? "yes" : "no"}</span></td></tr>`).join("")
        : `<tr><td colspan="4" class="muted">No outcome questions for this clip.</td></tr>`);
    }
    tabs.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) show(+b.dataset.i); });
    show(0);
  });

  const LABEL = { gt: "Real video (upper bound)", base: "Base model, no hand control" };
  const PRETTY = (t) => { const m = /^(.*?)_+adapter_step_0*(\d+)$/.exec(t || ""); return m ? `${m[1]} · ${Number(m[2]) / 1000}k steps` : t; };
  const M = [["epe_capped", "Hand error (px) ↓", 1], ["pck25", "PCK@25 ↑", 3], ["contact_f1_active", "Contact F1 ↑", 3], ["task_bacc", "Task acc ↑", 3], ["jitter_ratio", "Jitter (1 = real)", 2]];
  fetch("status.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((s) => {
    const rows = s.evals.map((e) => `<tr class="${e.tag in LABEL ? "ref" : ""}"><td>${esc(LABEL[e.tag] || PRETTY(e.tag))}</td><td>${e.seeds}</td>${M.map(([k, , d]) => `<td>${f(e[k], d)}</td>`).join("")}</tr>`);
    const trained = s.evals.filter((e) => !(e.tag in LABEL));
    if (!trained.length) rows.push(`<tr><td>Trained checkpoints</td><td colspan="${M.length + 1}" style="text-align:center"><span class="badge warn">waiting for the checkpoint files to reach the eval machine</span></td></tr>`);
    $("res").innerHTML = `<tr><th>Model</th><th>Seeds</th>${M.map((m) => `<th>${m[1]}</th>`).join("")}</tr>` + rows.join("");
    $("res-note").textContent = "Checkpoint selection uses the capped hand error only. A good adapter should move it from ~100 px (base) toward ~15 px (real).";
    const r = s.runs[0];
    if (!r) return;
    const last = r.probes[r.probes.length - 1]; const keep = r.probes.filter((p) => p.step === 500 || p.step % 2500 === 0 || p === last);
    const V = [["other_gain", "Another clip's trajectory", "main stop-rule signal"], ["shuffle_gain", "Frames shuffled in time", "uses the timing"], ["zero_gain", "Hands removed", "uses the conditioning at all"], ["swap_gain", "Left and right swapped", "≈ 0: ignores which hand is which"]];
    $("probe").innerHTML = `<tr><th>Change to the conditioning (${esc(r.run)})</th>${keep.map((p) => `<th>step ${p.step}</th>`).join("")}</tr>` +
      V.map(([k, t, d]) => `<tr><td>${esc(t)}<div class="small muted">${esc(d)}</div></td>${keep.map((p) => `<td>${p[k] == null ? "–" : (p[k] >= 0 ? "+" : "") + Number(p[k]).toFixed(3)}</td>`).join("")}</tr>`).join("");
  });
})();
