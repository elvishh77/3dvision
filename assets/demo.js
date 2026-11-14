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
    $("cmp").innerHTML = d.items.map((it) => `<figure class="demo">
        <div class="media vs3"><video src="assets/media/demo/${it.id}.mp4?v=2" poster="assets/media/demo/${it.id}.jpg?v=2" muted loop playsinline controls preload="none"></video>
          <div class="vlabels3"><span>Real clip</span><span>Base model</span><span class="ours">Trained · ${esc(s)}</span></div></div>
        <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> <span class="badge plain">${esc(ACT[it.active] || it.active)}</span>
          <b>Prompt:</b> ${esc(it.prompt)}
          <br>Hand error: real ${n(it.epe.real)} · base ${n(it.epe.base)} · <b>trained ${n(it.epe.ours)}</b></figcaption>
      </figure>`).join("");
  }).catch(() => ($("cmp").innerHTML = `<div class="wip">No demo videos yet.</div>`));

  fetch("assets/media/demo/onehand.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !d.items || !d.items.length) return;
    $("oh").outerHTML = `<div id="oh">${d.note ? `<div class="cap" style="margin:0 0 14px">${esc(d.note)}</div>` : ""}${d.items.map((it) => `<figure class="demo">
        <div class="media vs3"><video src="assets/media/demo/${it.file}" poster="assets/media/demo/${it.poster}" muted loop playsinline controls preload="none"></video>
          <div class="vlabels3"><span>Both hands act</span><span>Only RIGHT acts</span><span>Only LEFT acts</span></div></div>
        <figcaption class="cap"><span class="badge plain">${esc(it.id)}</span> ${esc(it.caption || "")}</figcaption></figure>`).join("")}</div>`;
  }).catch(() => {});
})();
