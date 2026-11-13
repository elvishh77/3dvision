// Renders status.json (built by scripts/site/build_status.py) into index.html.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "–";
  const rel = (iso) => {
    if (!iso) return "";
    const m = Math.round((new Date(iso) - Date.now()) / 60000), a = Math.abs(m);
    const s = a < 60 ? `${a} min` : a < 48 * 60 ? `${Math.floor(a / 60)} h ${a % 60} min` : `${Math.round(a / 1440)} days`;
    return m >= 0 ? `in ${s}` : `${s} ago`;
  };
  const HEALTH = { healthy: "ok", done: "ok", queued: "info", stalled: "warn", idle: "plain", unhealthy: "bad" };
  const STOP = { pass: "ok", "on track": "ok", warning: "warn", "not yet": "plain" };

  function item(cls, t, d, extra) {
    return `<div class="item ${cls}"><div class="t"><span>${esc(t)}</span>${extra || ""}</div><div class="d">${esc(d)}</div></div>`;
  }

  function lineChart(series, opts) {
    // series: [{pts:[[x,y]], color, label}]
    const W = window.innerWidth < 600 ? 330 : 440, H = window.innerWidth < 600 ? 140 : 150, L = 44, R = 10, T = 10, B = 22;
    const all = series.flatMap((s) => s.pts);
    if (all.length < 2) return `<div class="empty">${esc(opts.empty || "No data yet.")}</div>`;
    let x0 = opts.xmin ?? Math.min(...all.map((p) => p[0])), x1 = opts.xmax ?? Math.max(...all.map((p) => p[0]));
    let y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
    if (opts.zero) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    if (y1 === y0) { y1 += 1e-3; y0 -= 1e-3; }
    const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
    const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R), Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    let g = "";
    for (let i = 0; i <= 3; i++) {
      const v = y0 + ((y1 - y0) * i) / 3;
      g += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${v.toFixed(opts.dec ?? 3)}</text>`;
    }
    for (const xv of opts.xticks || []) if (xv >= x0 && xv <= x1)
      g += `<text x="${X(xv)}" y="${H - 6}" text-anchor="middle">${xv >= 1000 ? xv / 1000 + "k" : xv}</text>`;
    if (opts.zero) g += `<line class="zero" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    const paths = series.map((s) => {
      const d = s.pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
      const dots = s.dots ? s.pts.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3" fill="${s.color}"><title>step ${p[0]}: ${p[1]}</title></circle>`).join("") : "";
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.w || 1.6}" stroke-linejoin="round" opacity="${s.op || 1}"/>${dots}`;
    }).join("");
    const legend = series.filter((x) => x.label).length > 1 ? `<div class="small muted">${series.map((s) => `<span class="nowrap"><span style="display:inline-block;width:10px;height:3px;background:${s.color};vertical-align:middle;margin-right:4px"></span>${esc(s.label)}</span>`).join(" &nbsp; ")}</div>` : "";
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || "chart")}">${g}${paths}</svg>${legend}`;
  }

  function smooth(pts, k) {
    return pts.map((p, i) => { const w = pts.slice(Math.max(0, i - k), i + 1); return [p[0], w.reduce((a, q) => a + q[1], 0) / w.length]; });
  }

  const RUN_BG = ["bg-sky", "bg-coral", "bg-mint", "bg-yellow"];
  // Short time: "Sat 5:17 PM" within the next 6 days, otherwise "Nov 20, 5:17 PM".
  const fmtShort = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso), soon = Math.abs(d - Date.now()) < 6 * 86400e3;
    return d.toLocaleString(undefined, soon ? { weekday: "short", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  // Zoom the x axis to the data early in training; show the full run once it is far enough along.
  function xRange(lastStep, total) {
    const xmax = Math.min(total, Math.max(1000, Math.ceil((lastStep * 1.25) / 500) * 500));
    const step = xmax <= 2000 ? 250 : xmax <= 5000 ? 1000 : 2500;
    const ticks = []; for (let x = 0; x <= xmax; x += step) ticks.push(x);
    return { xmin: 0, xmax, xticks: ticks };
  }
  function runCard(r, evals, idx) {
    const pct = Math.min(100, (100 * r.step) / r.steps_total);
    const css = getComputedStyle(document.documentElement);
    const c1 = css.getPropertyValue("--series-1").trim(), c2 = css.getPropertyValue("--series-2").trim();
    const job = r.job || {};
    const gpu = job.gpu_type ? `${job.gpus}× ${job.gpu_type}` : job.gpus ? `${job.gpus} × A6000 / Ada` : "–";
    const weights = r.loss_weights && r.loss_weights.w_hand ? `weighted loss (hand ${r.loss_weights.w_hand}, contact ${r.loss_weights.w_contact})` : "plain loss";
    const startLine = job.state === "PENDING" ? `Slurm estimates the start at ${fmtShort(job.est_start)} (${rel(job.est_start)}).` : "";
    const loss = (r.loss_curve || []).map((p) => [p.step, p.mse]);
    const probes = (r.probes || []).filter((p) => p.other_gain != null).map((p) => [p.step, p.other_gain]);
    const xr = xRange(r.step, r.steps_total);
    const ms = (r.milestones || []).map((m) => {
      const ev = evals.find((e) => e.tag === `${r.run}_adapter_step_${String(m.step).padStart(7, "0")}`);
      const evTxt = ev ? `hand err ${ev.epe_capped?.toFixed(1)} px` : m.saved ? "saved · eval pending" : fmtShort(m.eta);
      return `<div class="${m.saved ? "done" : ""}"><div class="k">${m.step / 1000}k</div><div>${esc(evTxt)}</div></div>`;
    }).join("");
    return `<div class="card run-card">
      <div class="run-head ${RUN_BG[idx % RUN_BG.length]}">
        <div><div class="run-name">${esc(r.run)}</div><div class="small">${esc(weights)}</div></div>
        <span class="badge ${HEALTH[r.health] || "plain"}" title="${esc(r.health_reason)}">${esc(r.health)}</span>
      </div>
      <div class="run-body">
        <div>
          <div class="progress" role="progressbar" aria-valuenow="${r.step}" aria-valuemin="0" aria-valuemax="${r.steps_total}"><div style="width:${pct}%"></div></div>
          <div class="small"><b>${r.step.toLocaleString()}</b> / ${r.steps_total.toLocaleString()} steps (${pct.toFixed(1)}%) · <span class="muted">${esc(r.health_reason)}</span></div>
          ${startLine ? `<div class="small muted" style="margin-top:2px">${esc(startLine)}</div>` : ""}
          <div class="facts">
            <div class="fact"><div class="k">Job</div><div class="v">${esc(job.job_id || "–")}</div><div class="small muted">${esc((job.state || "").toLowerCase())}</div></div>
            <div class="fact"><div class="k">GPUs</div><div class="v">${esc(gpu)}</div></div>
            <div class="fact"><div class="k">Speed</div><div class="v">${r.s_per_step ? r.s_per_step + " s/step" : "–"}</div></div>
            <div class="fact"><div class="k">Finishes</div><div class="v">${fmtShort(r.eta_finish)}</div><div class="small muted">${rel(r.eta_finish)}${r.eta_assumes_ada ? " (est.)" : ""}</div></div>
            <div class="fact"><div class="k">Last log line</div><div class="v">${r.last_log_age_min != null ? rel(r.last_log) : "–"}</div></div>
            <div class="fact"><div class="k">Stop rule</div><div class="v"><span class="badge ${STOP[r.stop_rule] || "bad"}">${esc(r.stop_rule)}</span></div></div>
          </div>
          ${r.errors && r.errors.length ? `<div class="item high"><div class="t">Errors in the job log</div><div class="d mono">${r.errors.map(esc).join("<br>")}</div></div>` : ""}
          <div class="chart-title">Checkpoints (ETA, or score once evaluated)</div>
          <div class="ms">${ms}</div>
        </div>
        <div>
          <div class="chart-title" style="margin-top:0">Training loss · unweighted MSE (thin = raw, bold = smoothed)</div>
          ${lineChart([{ pts: loss, color: c1, op: 0.3, w: 1 }, { pts: smooth(loss, 8), color: c1, w: 2.5 }], { ...xr, empty: "No training steps logged yet." })}
          <div class="chart-title">Held-out hand-conditioning gain (σ = 0.8) · must be &gt; 0 and rising</div>
          ${lineChart([{ pts: probes, color: c2, dots: true, w: 2.5 }], { ...xr, zero: true, dec: 3, empty: "First probe at step 500." })}
        </div>
      </div>
    </div>`;
  }

  const METRICS = [
    ["epe_capped", "Hand err px ↓", 1, "min"], ["pck25", "PCK@25 ↑", 3, "max"], ["contact_f1_active", "Contact F1 ↑", 3, "max"],
    ["task_bacc", "Task acc ↑", 3, "max"], ["jitter_ratio", "Jitter (1 = real)", 2, null], ["idle_vlm_fgr", "Idle grip ↓", 3, "min"],
  ];
  const LABEL = { gt: "Real video (upper bound)", base: "Base model, no adapter" };

  function evalTable(evals) {
    if (!evals.length) return `<tr><td class="empty">No scores yet.</td></tr>`;
    const models = evals.filter((e) => !(e.tag in LABEL));
    const best = {};
    for (const [k, , , dir] of METRICS) {
      const pool = models.length ? models : [];
      const vals = pool.map((e) => e[k]).filter((v) => v != null);
      if (dir && vals.length) best[k] = dir === "min" ? Math.min(...vals) : Math.max(...vals);
    }
    const head = `<tr><th>Checkpoint</th><th>Seeds</th>${METRICS.map((m) => `<th>${m[1]}</th>`).join("")}</tr>`;
    const rows = evals.map((e) => {
      const ref = e.tag in LABEL;
      return `<tr class="${ref ? "ref" : ""}"><td>${esc(LABEL[e.tag] || e.tag)}</td><td>${e.seeds}</td>${METRICS.map(([k, , d]) =>
        (!ref && best[k] === e[k] ? `<td class="best"><span>${Number(e[k]).toFixed(d)}</span></td>` : `<td>${e[k] != null ? Number(e[k]).toFixed(d) : "–"}</td>`)).join("")}</tr>`;
    }).join("");
    return head + rows;
  }

  function render(s) {
    const m = s.manual, p = m.project;
    document.title = "HandCtrl Video Dashboard";
    $("pills").innerHTML = [["Phase 1 · human hands", "bg-yellow"], [`${s.runs.length} training runs`, "bg-mint"], ["Target Nov 13", "bg-sky"]]
      .map(([t, c]) => `<span class="pill ${c}">${esc(t)}</span>`).join("");
    $("lead").textContent = p.one_liner;
    const ageMin = (Date.now() - new Date(s.generated)) / 60000;
    $("updated").innerHTML = `Data rebuilt <b title="${esc(s.generated)}">${esc(rel(s.generated))}</b>`;
    if (ageMin > 75) { $("stale").style.display = "block"; $("stale").textContent = `This data is ${Math.round(ageMin)} min old: the 30-minute updater may have stopped.`; }
    else $("stale").style.display = "none";
    const it = s.iteration || {};
    ETA = it.eta ? new Date(it.eta) : null; tick();
    $("eta-line").textContent = it.eta ? `${fmtTime(it.eta)} · both runs to 10k steps + ${it.final_eval_overhead_h} h of final evaluation` : "No ETA yet: a run has no start estimate.";

    const active = m.stages.findIndex((x) => x.status === "active");
    $("k-stage").textContent = active >= 0 ? m.stages[active].name : "–";
    $("k-stage-sub").textContent = `Stage ${active + 1} of ${m.stages.length}`;
    const done = s.runs.reduce((a, r) => a + r.step, 0), total = s.runs.reduce((a, r) => a + r.steps_total, 0);
    $("k-prog").textContent = `${(100 * done / (total || 1)).toFixed(1)}%`;
    $("k-prog-sub").textContent = s.runs.map((r) => `${r.run}: ${r.health}`).join(" · ");
    $("k-input").textContent = m.needs_input.length;
    $("k-input-sub").textContent = m.needs_input.length ? m.needs_input[0].title : "nothing waiting on you";
    const high = m.blockers.filter((b) => b.severity === "high").length;
    $("k-block").textContent = m.blockers.length;
    $("k-block-sub").textContent = high ? `${high} high severity` : "none high severity";
    $("stage-note").innerHTML = active >= 0 ? `<div class="t">Now: ${esc(m.stages[active].name)}</div><div class="d">${esc(m.stages[active].detail)}</div>` : "";

    $("stepper").innerHTML = m.stages.map((x, i) => `<div class="step ${x.status}" title="${esc(x.detail)}"><div class="n">${i + 1} · ${x.status === "done" ? "done ✓" : x.status === "active" ? "now ★" : "next"}</div><div class="t">${esc(x.name)}</div><div class="s">${esc(x.detail)}</div></div>`).join("");
    $("input-list").innerHTML = m.needs_input.length ? m.needs_input.map((x) => item("input", x.title, x.detail, x.since ? `<span class="badge plain">since ${esc(x.since)}</span>` : "")).join("") : `<div class="empty">Nothing needs you right now.</div>`;
    $("block-list").innerHTML = m.blockers.length ? m.blockers.map((b) => item(b.severity, b.title, b.detail, `<span class="badge ${b.severity === "high" ? "bad" : b.severity === "medium" ? "warn" : "plain"}">${esc(b.severity)}</span>`)).join("") : `<div class="empty">No blockers.</div>`;

    $("run-cards").innerHTML = s.runs.map((r, i) => runCard(r, s.evals, i)).join("");
    $("eval-table").innerHTML = evalTable(s.evals);
    $("eval-jobs").textContent = s.eval_jobs.length ? "Eval jobs in queue: " + s.eval_jobs.map((j) => `${j.name} (${j.state.toLowerCase()})`).join(", ") : "";
    const TS = { active: "ok", scheduled: "info", off: "plain" };
    $("team-list").innerHTML = m.team.map((t) => `<div class="item low"><div class="t">${esc(t.role)} <span class="badge ${TS[t.state] || "plain"}">${esc(t.state)}</span></div><div class="d">${esc(t.detail)}</div></div>`).join("");
    $("next").innerHTML = m.next_actions.map((a) => `<li>${esc(a)}</li>`).join("");
    $("decisions").innerHTML = m.decisions.map((d) => `<li><span class="date">${esc(d.date)}</span><span>${esc(d.text)}</span></li>`).join("");
  }

  let ETA = null;
  function tick() {
    const pad = (n) => String(n).padStart(2, "0");
    if (!ETA) { ["c-d", "c-h", "c-m", "c-s"].forEach((k) => ($(k).textContent = "–")); return; }
    let t = Math.max(0, Math.floor((ETA - Date.now()) / 1000));
    $("c-d").textContent = pad(Math.floor(t / 86400)); t %= 86400;
    $("c-h").textContent = pad(Math.floor(t / 3600)); t %= 3600;
    $("c-m").textContent = pad(Math.floor(t / 60)); $("c-s").textContent = pad(t % 60);
  }
  setInterval(tick, 1000);

  async function load() {
    try {
      const r = await fetch("status.json?t=" + Date.now(), { cache: "no-store" });
      render(await r.json());
    } catch (e) {
      $("updated").textContent = "Could not load status.json";
      console.error(e);
    }
  }
  load();
  setInterval(load, 5 * 60 * 1000);
})();
