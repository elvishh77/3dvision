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

  // ---- browse all 32 clips ----
  fetch("assets/media/demo_all/demo.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((d) => {
    const items = d.items.map((it) => ({ ...it, gain: (it.epe.ctrl ?? 0) - (it.epe.ours ?? 0) }));
    const f = (v) => (v == null ? "–" : v.toFixed(1));
    function play(it) {
      const v = $("all-video"); v.src = `assets/media/demo_all/${it.id}.mp4?v=1`; v.poster = `assets/media/demo_all/${it.id}.jpg?v=1`; v.play().catch(() => {});
      $("all-cap").innerHTML = `<span class="badge plain">${esc(it.id)}</span> <span class="badge plain">${esc(ACT[it.active] || it.active)}</span> <b>Prompt:</b> ${esc(it.prompt)}<br>
        Hand error: real ${f(it.epe.real)} · base ${f(it.epe.base)} · no hand input ${f(it.epe.ctrl)} · <b>trained ${f(it.epe.ours)} px</b>`;
      document.querySelectorAll(".clipitem").forEach((el) => el.classList.toggle("sel", el.dataset.id === it.id));
    }
    function render(k) {
      const s = [...items].sort((a, b) => k === "id" ? a.id.localeCompare(b.id) : k === "gain" ? b.gain - a.gain : (a.epe.ours ?? 999) - (b.epe.ours ?? 999));
      $("all-list").innerHTML = s.map((it) => `<button class="clipitem" data-id="${esc(it.id)}">
          <img loading="lazy" src="assets/media/demo_all/${esc(it.id)}.jpg?v=1" alt="">
          <span class="ci-t"><b>${esc(it.id)}</b> · trained ${f(it.epe.ours)} px · no hand ${f(it.epe.ctrl)} · base ${f(it.epe.base)}</span>
          <span class="ci-p">${esc(it.prompt)}</span></button>`).join("");
      document.querySelectorAll(".sortbtn").forEach((b) => (b.style.boxShadow = b.dataset.k === k ? "3px 3px 0 #3e3a39" : "none"));
      $("all-list").querySelectorAll(".clipitem").forEach((el) => el.addEventListener("click", () => { play(items.find((x) => x.id === el.dataset.id)); $("all-viewer").scrollIntoView({ behavior: "smooth", block: "start" }); }));
    }
    document.querySelectorAll(".sortbtn").forEach((b) => b.addEventListener("click", () => render(b.dataset.k)));
    render("ours"); play([...items].sort((a, b) => (a.epe.ours ?? 999) - (b.epe.ours ?? 999))[0]);
  }).catch(() => {});
})();
