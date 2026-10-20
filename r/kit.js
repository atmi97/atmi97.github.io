/* Shared helpers for research reports and slide decks: theme toggle, charts, tabs, slides. */
(function(){
  const NS = "http://www.w3.org/2000/svg";
  const PAL = ["--s1","--s2","--s3","--s4","--s5","--s6","--s7","--s8"].map(v=>`var(${v})`);

  /** Theme: follow system, allow manual override (remembered when storage works). */
  function initTheme(){
    let t; try { t = localStorage.getItem("theme"); } catch(e) {}
    if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    document.querySelectorAll(".theme").forEach(b=>{
      const label = ()=> b.textContent = document.documentElement.dataset.theme==="dark" ? "Light" : "Dark";
      label();
      b.addEventListener("click", ()=>{
        const n = document.documentElement.dataset.theme==="dark" ? "light" : "dark";
        document.documentElement.dataset.theme = n; label();
        try { localStorage.setItem("theme", n); } catch(e) {}
      });
    });
  }

  const el = (tag, attrs={}, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text!=null) e.textContent = text; return e; };
  const fmt = (v, o={}) => (o.prefix||"") + (Math.abs(v)>=100 ? Math.round(v).toLocaleString() : (+v.toFixed(o.dp??1)).toLocaleString()) + (o.suffix||"");

  /** Shared hover tooltip. */
  let tipEl;
  function tip(e, html){
    if (!tipEl){ tipEl = document.createElement("div"); tipEl.className = "chart tip"; tipEl.classList.add("tip"); document.body.appendChild(tipEl); }
    if (!html){ tipEl.style.opacity = 0; return; }
    tipEl.innerHTML = html; tipEl.style.opacity = 1;
    tipEl.style.left = Math.min(e.clientX + 12, innerWidth - 220) + "px"; tipEl.style.top = (e.clientY + 12) + "px";
  }

  /**
   * Horizontal bar chart. data: [{label, value, color?, note?}]. opts: {prefix, suffix, dp, max, sort}
   */
  function bars(target, data, opts={}){
    const host = typeof target==="string" ? document.querySelector(target) : target;
    host.classList.add("chart"); host.innerHTML = "";
    const rows = opts.sort===false ? data : [...data].sort((a,b)=>b.value-a.value);
    const W = 640, rowH = 30, labelW = opts.labelW || 170, H = rows.length*rowH + 6;
    const max = opts.max || Math.max(...rows.map(d=>Math.abs(d.value)), 0.0001);
    const min = Math.min(0, ...rows.map(d=>d.value));
    const span = max - min, x0 = labelW + (-min/span)*(W-labelW-70);
    const scale = v => (v/span)*(W-labelW-70);
    const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label": opts.title || "Bar chart"});
    rows.forEach((d,i)=>{
      const y = i*rowH + 4, w = scale(Math.abs(d.value)), x = d.value<0 ? x0-w : x0;
      svg.appendChild(el("text", {x:labelW-8, y:y+17, "text-anchor":"end"}, d.label));
      const r = el("rect", {x, y:y+4, width:Math.max(w,1.5), height:rowH-10, rx:4, fill: d.color || (d.value<0 ? "var(--bad)" : PAL[(opts.color??0)%8])});
      r.addEventListener("mousemove", e=>tip(e, `<b>${d.label}</b><br>${fmt(d.value,opts)}${d.note?`<br>${d.note}`:""}`));
      r.addEventListener("mouseleave", e=>tip(e));
      svg.appendChild(r);
      svg.appendChild(el("text", {class:"v", x: d.value<0 ? x-6 : x+w+6, y:y+17, "text-anchor": d.value<0?"end":"start"}, fmt(d.value,opts)));
    });
    host.appendChild(svg);
  }

  /**
   * Proportional stacked strip (share of a whole). data: [{label, value}]. Renders a legend.
   */
  function strip(target, data, opts={}){
    const host = typeof target==="string" ? document.querySelector(target) : target;
    host.classList.add("chart"); host.innerHTML = "";
    const total = data.reduce((s,d)=>s+d.value,0), W = 640, H = 56;
    const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label": opts.title || "Share chart"});
    let x = 0;
    data.forEach((d,i)=>{
      const w = d.value/total*W, c = d.color || PAL[i%8];
      const r = el("rect", {x:x+1, y:0, width:Math.max(w-2,1), height:H, rx:6, fill:c});
      r.addEventListener("mousemove", e=>tip(e, `<b>${d.label}</b><br>${fmt(d.value,opts)} · ${(d.value/total*100).toFixed(0)}%`));
      r.addEventListener("mouseleave", e=>tip(e));
      svg.appendChild(r);
      if (w > 60) svg.appendChild(el("text", {x:x+10, y:H/2+5, fill:"#fff", style:"fill:#fff;font-weight:600"}, `${(d.value/total*100).toFixed(0)}%`));
      x += w;
    });
    host.appendChild(svg);
    const lg = document.createElement("div"); lg.className = "legend";
    lg.innerHTML = data.map((d,i)=>`<span><i style="background:${d.color||PAL[i%8]}"></i>${d.label}</span>`).join("");
    host.appendChild(lg);
  }

  /**
   * Line chart. series: [{name, points:[[xLabel, value], ...]}]. opts: {prefix, suffix, dp}
   */
  function line(target, series, opts={}){
    const host = typeof target==="string" ? document.querySelector(target) : target;
    host.classList.add("chart"); host.innerHTML = "";
    const W = 640, H = 260, L = 48, B = 26, T = 10, R = 10;
    const xs = series[0].points.map(p=>p[0]);
    const vals = series.flatMap(s=>s.points.map(p=>p[1]));
    const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.08;
    const X = i => L + i*(W-L-R)/Math.max(xs.length-1,1), Y = v => T + (1-(v-lo)/(hi-lo))*(H-T-B);
    const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label": opts.title || "Line chart"});
    for (let k=0;k<=4;k++){ const v = lo + (hi-lo)*k/4;
      svg.appendChild(el("line", {x1:L, x2:W-R, y1:Y(v), y2:Y(v), stroke:"var(--rule)"}));
      svg.appendChild(el("text", {x:L-6, y:Y(v)+4, "text-anchor":"end"}, fmt(v,{...opts,dp:0}))); }
    const every = Math.ceil(xs.length/8);
    xs.forEach((x,i)=>{ if (i%every===0 || i===xs.length-1) svg.appendChild(el("text", {x:X(i), y:H-6, "text-anchor":"middle"}, x)); });
    series.forEach((s,si)=>{
      const c = s.color || PAL[si%8];
      svg.appendChild(el("polyline", {points:s.points.map((p,i)=>`${X(i)},${Y(p[1])}`).join(" "), fill:"none", stroke:c, "stroke-width":2.5, "stroke-linejoin":"round"}));
      s.points.forEach((p,i)=>{ const d = el("circle", {cx:X(i), cy:Y(p[1]), r:4, fill:c});
        d.addEventListener("mousemove", e=>tip(e, `<b>${s.name}</b> · ${p[0]}<br>${fmt(p[1],opts)}`)); d.addEventListener("mouseleave", e=>tip(e)); svg.appendChild(d); });
    });
    host.appendChild(svg);
    if (series.length>1){ const lg = document.createElement("div"); lg.className = "legend";
      lg.innerHTML = series.map((s,i)=>`<span><i style="background:${s.color||PAL[i%8]}"></i>${s.name}</span>`).join(""); host.appendChild(lg); }
  }

  /**
   * Tabs that redraw one chart from several views. views: {"Tab name": () => draw()}
   */
  function tabs(target, views){
    const host = typeof target==="string" ? document.querySelector(target) : target;
    const bar = document.createElement("div"); bar.className = "tabs";
    const names = Object.keys(views);
    bar.innerHTML = names.map((n,i)=>`<button aria-pressed="${i===0}">${n}</button>`).join("");
    host.prepend(bar);
    bar.addEventListener("click", e=>{ const b = e.target.closest("button"); if (!b) return;
      bar.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", x===b)); views[b.textContent](); });
    views[names[0]]();
  }

  /** Slide deck: arrow keys, swipe, buttons, #n deep links. */
  function deck(){
    const slides = [...document.querySelectorAll(".slide")]; if (!slides.length) return;
    const prog = document.querySelector(".progress i"), cnt = document.querySelector(".count");
    let i = Math.min(Math.max(parseInt(location.hash.slice(1))-1 || 0, 0), slides.length-1);
    const show = n => { i = Math.max(0, Math.min(slides.length-1, n));
      slides.forEach((s,k)=>s.classList.toggle("on", k===i));
      if (prog) prog.style.width = ((i+1)/slides.length*100)+"%";
      if (cnt) cnt.textContent = `${i+1} / ${slides.length}`;
      history.replaceState(null, "", "#"+(i+1)); };
    document.querySelector(".prev")?.addEventListener("click", ()=>show(i-1));
    document.querySelector(".next")?.addEventListener("click", ()=>show(i+1));
    addEventListener("keydown", e=>{ if (["ArrowRight","PageDown"," "].includes(e.key)){ e.preventDefault(); show(i+1); } if (["ArrowLeft","PageUp"].includes(e.key)) show(i-1); });
    let sx = null; addEventListener("touchstart", e=>sx = e.touches[0].clientX, {passive:true});
    addEventListener("touchend", e=>{ if (sx==null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx)>50) show(i + (dx<0?1:-1)); sx = null; });
    show(i);
  }

  window.Kit = {bars, strip, line, tabs, deck};
  document.addEventListener("DOMContentLoaded", ()=>{ initTheme(); deck(); });
})();
