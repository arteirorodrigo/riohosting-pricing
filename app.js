// RioHosting-Pricing · dashboard. Os dados vêm de dados.js, gerado pelo robô a cada rodada.
// ?final = mostra tudo já pronto, sem animação (para tirar a foto)
const FINAL = location.search.includes("final");
if (FINAL) { document.head.insertAdjacentHTML("beforeend", "<style>*{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}</style>"); window.setTimeout = f => f(); }
// Texto vindo do Airbnb é sempre tratado como texto (nunca como código da página)
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const linkAirbnb = u => /^https:\/\/www\.airbnb\.com(\.br)?\/rooms\/\d+$/.test(u) ? u : "#";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function resumo(ap) {
  const livres = ap.noites.filter(n => n.p && n.m);
  const media = k => livres.length ? Math.round(livres.reduce((s, n) => s + n[k], 0) / livres.length) : null;
  const seu = media("p"), mercado = media("m"), diaria = media("dl");
  const reservadas = ap.noites.filter(n => n.s === "reservado").length;
  const cont = s => ap.noites.filter(n => n.s === s).length;
  return { ...ap, seu, mercado, diaria, pct: seu && mercado ? seu / mercado - 1 : null,
    ocup: ap.noites.length ? reservadas / ap.noites.length : 0, reservadas, acima: cont("ACIMA"), abaixo: cont("ABAIXO"), namedia: cont("NA MÉDIA"),
    curto: ap.nome.replace(/^#RioLifeStyle \| /, "").split(/ [|—] /)[0].slice(0, 30) };
}
const APTOS = DADOS.aptos.map(resumo);
const TOTAL_NOITES = APTOS.reduce((s, a) => s + a.noites.length, 0);
const KPI = {
  aptos: APTOS.length,
  ocup: TOTAL_NOITES ? Math.round(100 * APTOS.reduce((s, a) => s + a.reservadas, 0) / TOTAL_NOITES) : 0,
  acima: APTOS.filter(a => a.pct !== null && a.pct > 0.2).length,
  abaixo: APTOS.filter(a => a.pct !== null && a.pct < -0.2).length,
  namedia: APTOS.filter(a => a.pct !== null && Math.abs(a.pct) <= 0.2).length,
  lotados: APTOS.filter(a => a.pct === null).length,
};
const reais = v => v === null ? "—" : "R$ " + v.toLocaleString("pt-BR");
const pctTxt = v => v === null ? "lotado" : (v > 0 ? "+" : "") + Math.round(v * 100) + "%";
function dataCurta(iso) { const [a, m, d] = iso.split("-"); const dia = new Date(+a, m - 1, +d); return { dm: d + "/" + m, sem: DIAS[dia.getDay()] }; }

function contar(el, alvo, sufixo = "", ms = 1200) {
  if (FINAL) { el.textContent = alvo + sufixo; return; }
  const t0 = performance.now();
  (function passo(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(alvo * e) + sufixo; if (k < 1) requestAnimationFrame(passo); })(t0);
}

// Gráfico de linhas: seu preço × média, desenhado da esquerda para a direita
function grafico(svg, ap, cores, aoClicar, escolhido) {
  const W = 760, H = 260, m = { l: 64, r: 16, t: 16, b: 34 };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg", el = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  const vals = ap.noites.flatMap(n => [n.p, n.m]).filter(Boolean);
  const max = Math.max(...vals, 100) * 1.1, n = Math.max(ap.noites.length, 2);
  const x = i => m.l + i * (W - m.l - m.r) / (n - 1), y = v => H - m.b - v / max * (H - m.t - m.b);
  const passo = (W - m.l - m.r) / (n - 1);
  ap.noites.forEach((nt, i) => { if (nt.s === "reservado") { const x0 = Math.max(m.l, x(i) - passo / 2), x1 = Math.min(W - m.r, x(i) + passo / 2);
    el("rect", { x: x0, y: m.t, width: x1 - x0, height: H - m.t - m.b, fill: cores.reservado }); } });
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: cores.grade, "stroke-width": 1 });
    el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: cores.eixo }).textContent = "R$ " + Math.round(v).toLocaleString("pt-BR"); }
  ap.noites.forEach((nt, i) => {
    if (i % 2 === 0 || n <= 14) { const d = dataCurta(nt.d); el("text", { x: x(i), y: H - 12, "text-anchor": "middle", "font-size": 10.5, fill: cores.eixo }).textContent = d.dm; }
  });
  const linha = (k, cor, larg) => {
    let d = "", pen = false;
    ap.noites.forEach((nt, i) => { if (nt[k]) { d += (pen ? "L" : "M") + x(i) + " " + y(nt[k]) + " "; pen = true; } else pen = false; });
    const p = el("path", { d, fill: "none", stroke: cor, "stroke-width": larg, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const L = p.getTotalLength ? p.getTotalLength() : 1000;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect();
    if (FINAL) p.style.strokeDashoffset = 0; else { p.style.transition = "stroke-dashoffset 1.4s ease-out"; requestAnimationFrame(() => p.style.strokeDashoffset = 0); }
    ap.noites.forEach((nt, i) => { if (nt[k]) { const c = el("circle", { cx: x(i), cy: y(nt[k]), r: 3.5, fill: cor }); if (!FINAL) { c.style.opacity = 0; c.style.transition = `opacity .3s ${0.1 * i}s`; requestAnimationFrame(() => c.style.opacity = 1); } } });
  };
  if (escolhido !== undefined) el("line", { x1: x(escolhido), x2: x(escolhido), y1: m.t, y2: H - m.b, stroke: cores.seu, "stroke-width": 1.5, "stroke-dasharray": "4 4" });
  linha("m", cores.media, 2.5); linha("p", cores.seu, 3);
  if (aoClicar) ap.noites.forEach((nt, i) => {  // área clicável de cada dia
    const r = el("rect", { x: x(i) - passo / 2, y: m.t, width: passo, height: H - m.t, fill: "transparent", style: "cursor:pointer" });
    r.addEventListener("click", () => aoClicar(i));
  });
}
const reais2 = v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- página ----
document.getElementById("quando").textContent = DADOS.atualizado;
[["k1",KPI.aptos,""],["k2",KPI.ocup,"%"],["k3",KPI.acima,""],["k4",KPI.abaixo,""]].forEach(([id,v,s])=>contar(document.getElementById(id),v,s));
const cor = s => ({ACIMA:"var(--acima)",ABAIXO:"var(--abaixo)","NA MÉDIA":"var(--media)",reservado:"var(--res)"})[s] || "#F3F8F7";
const cards = document.getElementById("cards");
APTOS.slice().sort((a,b)=>(b.pct??-9)-(a.pct??-9)).forEach((a,i)=>{
  const c = document.createElement("div"); c.className="card"; c.style.animationDelay=(.08*i)+"s";
  const tom = a.pct===null?"var(--suave)":a.pct>.2?"var(--acima)":a.pct<-.2?"var(--abaixo)":"var(--verde)";
  c.innerHTML=`<h3>${esc(a.nome)}</h3><div class="precos"><div>Seu<b>${reais(a.seu)}</b></div><div style="text-align:right">Média<b>${reais(a.mercado)}</b></div></div>${a.diaria?`<div class="mini">Diária ${reais(a.diaria)} sem limpeza</div>`:""}
   <div class="barra"><i style="background:${tom}"></i></div><span class="tag" style="color:${tom}">${a.pct===null?"sem noites livres para comparar":pctTxt(a.pct)+" vs. mercado"}</span>
   <div class="faixa">${a.noites.map((n,j)=>`<i title="${n.d} · ${esc(n.s)}" style="background:${cor(n.s)};animation-delay:${.6+.08*i+.03*j}s"></i>`).join("")}</div>`;
  c.onclick=()=>escolher(a,c); cards.appendChild(c);
  setTimeout(()=>c.querySelector(".barra i").style.width=(a.pct===null?100:Math.min(100,50+a.pct*40))+"%",300+80*i);
});
let atual=null;
function escolher(a,c){document.querySelectorAll(".card").forEach(x=>x.classList.remove("ativo"));c.classList.add("ativo");atual=a;
  document.getElementById("titulo").textContent="Dia a dia · "+a.nome;
  const livre=a.noites.findIndex(n=>n.p);verDia(livre<0?0:livre);}
function verDia(i){const a=atual,n=a.noites[i],d=dataCurta(n.d);
  grafico(document.getElementById("graf"),a,{grade:"#E6ECEB",eixo:"#4F6662",reservado:"#F3F8F7",seu:"#149C8B",media:"#F2B33D"},verDia,i);
  const corS={ACIMA:["#FBE8E3","#A8432E"],ABAIXO:["#E3F4F1","#0B7266"],"NA MÉDIA":["#EEF3F2","#4F6662"]}[n.s]||["#eee","#888"];
  const box=document.getElementById("detalhe");
  if(!n.p){box.innerHTML=`<div class="detalhe" style="display:block"><h3>${d.sem}, ${d.dm}<span class="chip" style="background:${corS[0]};color:${corS[1]}">${esc(n.s)}</span></h3><p class="comp">Sem comparação nesta noite.</p></div>`;return;}
  const N=DADOS.noites,mediaTot=n.mx*N,pct=Math.round((n.p/n.m-1)*100);
  box.innerHTML=`<div class="detalhe"><div>
    <h3>${d.sem}, ${d.dm}<span class="chip" style="background:${corS[0]};color:${corS[1]}">${esc(n.s)}</span></h3>
    <div class="dica">Estadia de ${N} noites a partir deste dia, ${DADOS.hospedes} hóspedes</div>
    <div class="conta"><div><span>${N} diárias de ${reais2(n.dlx)}</span><span>${reais2(n.diarias)}</span></div>
      <div><span>+ taxa de limpeza</span><span>${reais2(n.lp)}</span></div>
      <div class="tot"><span>Total pago pelo hóspede</span><span>${reais2(n.total)}</span></div>
      <small>= ${reais2(n.total/N)} por noite com limpeza</small></div>
    <div class="comp">Média dos ${n.n} concorrentes parecidos: <b>${reais2(n.mx)}</b> por noite (<b>${reais2(Math.round(mediaTot))}</b> na estadia, já com a limpeza deles).<br>Você está <b style="color:${corS[1]}">${pct>0?"+":""}${pct}%</b> em relação à média.</div></div>
    <div><table class="c"><tr><th>Concorrente</th><th>Nota</th><th class="n">Distância</th><th class="n">Por noite</th><th class="n">Total ${N} noites</th></tr>
    ${n.conc.map(c=>`<tr><td><a href="${linkAirbnb(c.url)}" target="_blank" rel="noopener">${esc(c.nome)}</a><br>${c.sh?'<span class="selo sh">Superhost</span>':''}${c.pf?'<span class="selo pf">Preferido dos hóspedes</span>':''}${c.res?'<span class="selo pf">'+(c.res==="hospedes"?"cabe mais gente":"sem nota")+'</span>':''}</td>
      <td>${c.nota?'★ '+c.nota.toLocaleString("pt-BR")+' <small style="color:var(--suave)">('+c.av+')</small>':'—'}</td><td class="n">${c.dist} m</td><td class="n">${reais2(c.noite)}</td><td class="n">${reais2(Math.round(c.noite*N))}</td></tr>`).join("")}
    </table><div class="dica">O Airbnb mostra só o total dos concorrentes: não dá para separar a limpeza deles.</div></div></div>`;}
if(cards.children.length){const ord=APTOS.slice().sort((a,b)=>(b.pct??-9)-(a.pct??-9));escolher(ord[0],cards.children[0]);}
else document.getElementById("cards").innerHTML="<p>Ainda não há noites analisadas. Rode o robô.</p>";
