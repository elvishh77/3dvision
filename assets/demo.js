// Qualitative results page: renders assets/media/demo/demo.json (and onehand.json when present).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ACT = { both: "both hands", left: "left hand", right: "right hand", none: "no contact" };
  const step = (tag) => { const m = /adapter_step_0*(\d+)/.exec(tag || ""); return m ? `${Number(m[1]) / 1000}k` : "trained"; };
  const n = (v) => (v == null ? "pending" : `${v.toFixed(1)} px`);

  fetch("assets/media/demo/demo.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((d) => {
    const s = step(d.ckpt);
    $("pills").innerHTML = [["held-out participant P0015", "bg-yellow"], [`trained model: v1_K8_h100 @ ${s} steps`, "bg-mint"], [`${d.items.length} clips`, "bg-sky"]]
      .map(([t, c]) => `<span class="pill ${c}">${esc(t)}</span>`).join("");
    if (d.summary) $("cmp-sub").textContent = d.summary + " Click a clip to play it.";
    let lastGroup = null;
    $("cmp").innerHTML = d.items.map((it) => { const head = it.group && it.group !== lastGroup ? `<h3 class="grp">${esc(it.group)}</h3>` : ""; lastGroup = it.group || lastGroup; return head + `<figure class="demo">
        <div class="media vs3"><video src="assets/media/demo/${it.id}.mp4?v=4" poster="assets/media/demo/${it.id}.jpg?v=4" muted loop playsinline controls preload="none"></video>
          ${d.ctrl ? `<div class="vlabels4"><span>Real clip</span><span>Base model</span><span class="ctrl">Fine-tuned, no hand input</span><span class="ours">Trained · ${esc(s)}</span></div>`
                   : `<div class="vlabels3"><span>Real clip</span><span>Base model</span><span class="ours">Trained · ${esc(s)}</span></div>`}</div>
        <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> <span class="badge plain">${esc(ACT[it.active] || it.active)}</span>
          <b>Prompt:</b> ${esc(it.prompt)}
          <br>Hand error: real ${n(it.epe.real)} · base ${n(it.epe.base)}${d.ctrl ? ` · no hand input ${n(it.epe.ctrl)}` : ""} · <b>trained ${n(it.epe.ours)}</b>
          ${it.note ? `<div class="item ${it.group === "Failures" ? "high" : "input"}" style="margin-top:8px;padding:8px 12px"><div class="d" style="margin:0;color:var(--ink)">${esc(it.note)}</div></div>` : ""}</figcaption>
      </figure>`; }).join("");
  }).catch(() => ($("cmp").innerHTML = `<div class="wip">No demo videos yet.</div>`));

  fetch("assets/media/qual/qual.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((q) => {
    const li = (xs) => `<ul class="qlist">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    $("qual-sum").innerHTML = `<div class="card bg-mint-soft"><h3>What works</h3>${li(q.summary.works)}</div>
      <div class="card bg-coral-soft"><h3>What doesn't yet</h3>${li(q.summary.fails)}</div>
      <div class="cap" style="grid-column:1/-1;margin-top:0">${esc(q.summary.caveat)}</div>`;
    $("qual-items").innerHTML = q.items.map((it) => `<div class="card qitem">
        <div class="qhead"><h3>${esc(it.title)}</h3><span class="badge plain">${esc(it.id)}</span><span class="badge plain">trained hand error ${it.epe.toFixed(1)} px</span>
          ${it.tags.map(([t, c]) => `<span class="badge ${c}">${esc(t)}</span>`).join("")}</div>
        <div class="media" style="background:#fffcf6;box-shadow:none;border-width:2px"><img loading="lazy" src="assets/media/qual/${it.id}.jpg?v=2" alt="${esc(it.title)}: real, base and trained frames"></div>
        <div class="qrows">
          <div><b>Real</b><span>${esc(it.real)}</span></div>
          <div class="bg-coral-soft"><b>Base</b><span>${esc(it.base)}</span></div>
          ${it.ctrl ? `<div class="bg-sky-soft"><b>No hand input${it.ctrl_epe != null ? ` · ${it.ctrl_epe.toFixed(1)} px` : ""}</b><span>${esc(it.ctrl)}</span></div>` : ""}
          <div class="bg-mint-soft"><b>Trained</b><span>${esc(it.ours)}</span></div>
        </div></div>`).join("");
  }).catch(() => {});

  fetch("assets/media/demo/onehand.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !d.items || !d.items.length) return;
    $("oh").outerHTML = `<div id="oh">${d.note ? `<div class="cap" style="margin:0 0 14px">${esc(d.note)}</div>` : ""}${d.items.map((it) => `<figure class="demo">
        <div class="media vs3"><video src="assets/media/demo/${it.file}" poster="assets/media/demo/${it.poster}" muted loop playsinline controls preload="none"></video>
          <div class="vlabels3"><span>Both hands act</span><span>Only RIGHT acts</span><span>Only LEFT acts</span></div></div>
        <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> ${esc(it.caption || "")}</figcaption></figure>`).join("")}</div>`;
  }).catch(() => {});

  // ---- browse all 32 clips (one or more comparison sets) ----
  const SETS = [{ key: "demo_all", name: "Hand input vs none" }, { key: "demo_v2", name: "v1 vs v2 (EMA + cosine)" }];
  const DEFAULT_PANELS = [{ label: "Real clip" }, { label: "Base model" }, { label: "Fine-tuned, no hand input" }, { label: "Trained · 10k" }];
  const loaded = {};
  let cur = null, sortKey = "last";
  const fx = (v) => (v == null ? "–" : v.toFixed(1));
  function norm(key, d) {   // old demo_all/demo.json has epe {real, base, ctrl, ours}; new sets have epe [real, p1, p2, ...]
    const panels = d.panels || DEFAULT_PANELS;
    const items = d.items.map((it) => ({ ...it, e: Array.isArray(it.epe) ? it.epe : [it.epe.real, it.epe.base, it.epe.ctrl, it.epe.ours] }));
    return { key, panels, items };
  }
  function labels(panels) {
    return `<div class="vlabelsN" style="grid-template-columns:repeat(${panels.length},1fr)">${panels.map((p, i) =>
      `<span class="${i === panels.length - 1 ? "ours" : i === 0 ? "" : "mid"}">${esc(p.label)}</span>`).join("")}</div>`;
  }
  function play(it) {
    const s = cur, v = $("all-video");
    v.src = `assets/media/${s.key}/${it.id}.mp4?v=2`; v.poster = `assets/media/${s.key}/${it.id}.jpg?v=2`; v.play().catch(() => {});
    $("all-labels").innerHTML = labels(s.panels);
    $("all-cap").innerHTML = `<span class="badge plain">${esc(it.id)}</span> <span class="badge plain">${esc(ACT[it.active] || it.active)}</span> <b>Prompt:</b> ${esc(it.prompt)}<br>
      Hand error: ${s.panels.map((p, i) => (i === s.panels.length - 1 ? `<b>${esc(p.label)} ${fx(it.e[i])} px</b>` : `${esc(p.label)} ${fx(it.e[i])}`)).join(" · ")}`;
    document.querySelectorAll(".clipitem").forEach((el) => el.classList.toggle("sel", el.dataset.id === it.id));
  }
  function render() {
    const s = cur, L = s.panels.length - 1;
    const key = (it) => sortKey === "id" ? 0 : sortKey === "gain" ? -((it.e[L - 1] ?? 0) - (it.e[L] ?? 0)) : (it.e[L] ?? 999);
    const arr = [...s.items].sort((a, b) => sortKey === "id" ? a.id.localeCompare(b.id) : key(a) - key(b));
    $("all-list").innerHTML = arr.map((it) => `<button class="clipitem" data-id="${esc(it.id)}">
        <img loading="lazy" src="assets/media/${s.key}/${esc(it.id)}.jpg?v=2" alt="">
        <span class="ci-t"><b>${esc(it.id)}</b> · ${s.panels.slice(1).map((p, i) => `${esc(p.label)} ${fx(it.e[i + 1])}`).reverse().join(" · ")}</span>
        <span class="ci-p">${esc(it.prompt)}</span></button>`).join("");
    $("all-list").querySelectorAll(".clipitem").forEach((el) => el.addEventListener("click", () => {
      play(s.items.find((x) => x.id === el.dataset.id)); $("all-viewer").scrollIntoView({ behavior: "smooth", block: "start" }); }));
    document.querySelectorAll(".sortbtn").forEach((b) => (b.style.boxShadow = b.dataset.k === sortKey ? "3px 3px 0 #3e3a39" : "none"));
    const gb = document.querySelector('.sortbtn[data-k="gain"]');
    if (gb) gb.textContent = `gain of "${s.panels[L].label}" over "${s.panels[L - 1].label}"`;
    const lb = document.querySelector('.sortbtn[data-k="last"]'); if (lb) lb.textContent = `${s.panels[L].label} error`;
  }
  function useSet(key) {
    const go = (s) => { cur = s; document.querySelectorAll(".setbtn").forEach((b) => (b.style.boxShadow = b.dataset.k === key ? "3px 3px 0 #3e3a39" : "none"));
      render(); play([...s.items].sort((a, b) => (a.e[s.panels.length - 1] ?? 999) - (b.e[s.panels.length - 1] ?? 999))[0]); };
    if (loaded[key]) return go(loaded[key]);
    fetch(`assets/media/${key}/demo.json?t=` + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((d) => go(loaded[key] = norm(key, d))).catch(() => {});
  }
  // assets/media/sets.json lists the comparison sets that exist (avoids 404 probes for sets not built yet)
  fetch("assets/media/sets.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : ["demo_all"])).catch(() => ["demo_all"]).then((have) => {
    const sets = SETS.filter((s) => have.includes(s.key));
    $("all-sets").innerHTML = sets.length > 1 ? `<span class="small muted">Compare:</span>` + sets.map((s, i) =>
      `<button class="pill ${["bg-coral", "bg-sky"][i % 2]} setbtn" data-k="${s.key}">${esc(s.name)}</button>`).join("") : "";
    document.querySelectorAll(".setbtn").forEach((b) => b.addEventListener("click", () => useSet(b.dataset.k)));
    document.querySelectorAll(".sortbtn").forEach((b) => b.addEventListener("click", () => { sortKey = b.dataset.k; render(); }));
    if (sets.length) useSet(sets[0].key);
  });

  // ---- robot / HRDexDB sets (pushed from CoreWeave; section stays hidden until they exist) ----
  const RSETS = [{ key: "hrdexdb_robot", name: "Robot hand (zero-shot)" }, { key: "hrdexdb_human", name: "Human hand, held-out objects" }];
  Promise.all(RSETS.map((s) => fetch(`assets/media/${s.key}/demo.json?t=` + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => (d ? { ...s, d } : null)).catch(() => null))).then((sets) => {
    sets = sets.filter(Boolean); if (!sets.length) return;
    $("robot").style.display = "";
    const show = (s) => {
      document.querySelectorAll(".rsetbtn").forEach((b) => (b.style.boxShadow = b.dataset.k === s.key ? "3px 3px 0 #3e3a39" : "none"));
      const P = s.d.panels || [];
      $("robot-list").innerHTML = (s.d.items || []).map((it) => `<figure class="demo">
          <div class="media vs3"><video src="assets/media/${s.key}/${esc(it.id)}.mp4" poster="assets/media/${s.key}/${esc(it.id)}.jpg" muted loop playsinline controls preload="none"></video>
            <div class="vlabelsN" style="grid-template-columns:repeat(${P.length || 3},1fr)">${P.map((p, i) => `<span class="${i === P.length - 1 ? "ours" : i ? "mid" : ""}">${esc(p.label)}</span>`).join("")}</div></div>
          <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> <b>Prompt:</b> ${esc(it.prompt || "")}
            ${it.psnr_hand ? `<br>Hand-region PSNR: static reference ${(+it.psnr_hand[0]).toFixed(1)} dB · <b>generated ${(+it.psnr_hand[1]).toFixed(1)} dB</b>` : ""}
            ${it.note ? `<div class="item input" style="margin-top:8px;padding:8px 12px"><div class="d" style="margin:0;color:var(--ink)">${esc(it.note)}</div></div>` : ""}</figcaption></figure>`).join("");
      $("robot-credit").innerHTML = [s.d.metric_note, s.d.source].filter(Boolean).map(esc).join("<br>");
    };
    $("robot-sets").innerHTML = sets.length > 1 ? `<span class="small muted">Show:</span>` + sets.map((s, i) => `<button class="pill ${["bg-sky", "bg-mint"][i % 2]} rsetbtn" data-k="${s.key}">${esc(s.name)}</button>`).join("") : "";
    document.querySelectorAll(".rsetbtn").forEach((b) => b.addEventListener("click", () => show(sets.find((x) => x.key === b.dataset.k))));
    show(sets[0]);
  });
})();
