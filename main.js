/* Shared behaviour for the home page and the product pages. Data lives in data.js. */
(function(){
  const { WHATSAPP, COUNTRIES, PRODUCTS } = window.SITE;
  const $ = s => document.querySelector(s);
  const root = document.body.dataset.root || "";
  const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
  const waLink = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  let current = "NG", filter = "All";

  /* Work out the visitor's country: their own choice first, then their device time zone, then browser language. */
  const TZ = {"Africa/Lagos":"NG","Africa/Accra":"GH","Africa/Nairobi":"KE","Africa/Kampala":"UG","Africa/Dar_es_Salaam":"TZ",
    "Africa/Lusaka":"ZM","Africa/Douala":"CM","Africa/Johannesburg":"ZA","Africa/Windhoek":"NA","Africa/Gaborone":"BW",
    "Europe/London":"GB","America/Toronto":"CA","America/Vancouver":"CA","America/Edmonton":"CA","America/Winnipeg":"CA",
    "America/Halifax":"CA","America/Regina":"CA","America/St_Johns":"CA","America/New_York":"US","America/Chicago":"US",
    "America/Denver":"US","America/Los_Angeles":"US","America/Phoenix":"US","America/Anchorage":"US","Pacific/Honolulu":"US",
    "America/Detroit":"US","America/Indiana/Indianapolis":"US","America/Boise":"US"};
  function detectCountry(){
    try { const saved = localStorage.getItem("country"); if (saved && COUNTRIES[saved]) return saved; } catch(e){}
    try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ[z]) return TZ[z]; } catch(e){}
    for (const l of (navigator.languages || [navigator.language || ""])) {
      const r = (l.split("-")[1] || "").toUpperCase(); if (COUNTRIES[r]) return r;
    }
    return "OTHER";
  }
  current = detectCountry();

  const sel = $("#country");
  for (const [code,c] of Object.entries(COUNTRIES)) sel.add(new Option(c.name, code));
  sel.value = current;
  const country = () => COUNTRIES[current];
  const placeName = () => country().name === "Another country" ? "my country" : country().name;

  /* Prices are set in naira. For other countries we show an estimate using today's exchange rate. */
  let rates = null;
  function money(n, cur){
    try { return new Intl.NumberFormat(undefined, {style:"currency", currency:cur, currencyDisplay: cur === "NGN" ? "narrowSymbol" : "symbol", maximumFractionDigits: n >= 1000 ? 0 : 2}).format(n); }
    catch(e){ return cur + " " + Math.round(n).toLocaleString(); }
  }
  const fmt = n => money(n, "NGN");
  function loadRates(){
    try {
      const c = JSON.parse(localStorage.getItem("ngnRates") || "null");
      if (c && Date.now() - c.t < 12*3600e3) { rates = c.r; return Promise.resolve(); }
    } catch(e){}
    return fetch("https://open.er-api.com/v6/latest/NGN").then(r=>r.json()).then(j=>{
      if (j && j.result === "success") { rates = j.rates; try { localStorage.setItem("ngnRates", JSON.stringify({t:Date.now(), r:rates})); } catch(e){} }
    }).catch(()=>{});
  }

  function priceHtml(p){
    const c = country();
    if (current === "NG") return `<div class="prices"><span class="retail">${fmt(p.retail)}</span><span class="member">Member price ${fmt(p.dist)}</span></div>`;
    const r = rates && rates[c.currency];
    if (r) return `<div class="prices"><span class="retail">About ${money(p.retail*r, c.currency)}</span><span class="member">Member price about ${money(p.dist*r, c.currency)}</span><span class="est">Estimate from Nigeria prices. Your exact ${esc(c.currency)} price shows at checkout.</span></div>`;
    return `<div class="prices"><span class="price">Price in ${esc(c.currency)} shown at checkout</span></div>`;
  }
  function actionHtml(p){
    const c = country();
    if (p.soldOut) return `<span class="soldout">Temporarily sold out</span><a class="btn btn-ghost" href="${waLink(`Hi Petros, please tell me when ${p.name} (${p.size}) is back in stock.`)}" target="_blank" rel="noopener">Notify me on WhatsApp</a>`;
    const href = c.shop || waLink(`Hi Petros, I'm in ${placeName()} and I'd like to order ${p.name} (${p.size}).`);
    return `<a class="btn btn-leaf" href="${href}" target="_blank" rel="noopener">${c.shop ? "Order on official shop" : "Order on WhatsApp"}</a>${c.shop ? `<span class="hint">Opens my NeoLife shop. Check that ${esc(c.name)} is selected as your country there.</span>` : ""}`;
  }
  function card(p){
    return `<article class="prod"><a class="pimg" href="${root}products/${p.slug}.html" tabindex="-1" aria-hidden="true"><img src="${root}images/products/${p.slug}.jpg" alt="" loading="lazy" width="160" height="160"></a><span class="need">${esc(p.need)}</span><h3><a class="plink" href="${root}products/${p.slug}.html">${esc(p.name)}</a></h3><span class="size">${esc(p.size)}</span><p>${esc(p.desc)}</p>${priceHtml(p)}<div class="acts">${actionHtml(p)}<a class="more" href="${root}products/${p.slug}.html">Full details →</a></div></article>`;
  }

  function renderShop(){
    const shelf = $("#shelf"); if (!shelf) return;
    const needs = ["All", ...new Set(PRODUCTS.map(p=>p.need))];
    $("#chips").innerHTML = needs.map(n=>`<button class="chip" type="button" aria-pressed="${n===filter}" data-need="${esc(n)}">${esc(n)}</button>`).join("");
    const q = ($("#q").value||"").trim().toLowerCase();
    const list = PRODUCTS.filter(p=>(filter==="All"||p.need===filter) && (!q || (p.name+" "+p.need+" "+p.desc+" "+p.features.join(" ")).toLowerCase().includes(q)));
    $("#count").textContent = list.length + (list.length===1?" product":" products");
    shelf.innerHTML = list.length ? list.map(card).join("")
      : `<p class="lead">No products match that search. Try another word, or <a href="${waLink("Hi Petros, I'm looking for a product to help with: ")}" target="_blank" rel="noopener">ask me on WhatsApp</a>.</p>`;
  }

  function renderProduct(){
    const box = $("#productBuy"); if (!box) return;
    const p = PRODUCTS.find(x=>x.slug===document.body.dataset.slug); if (!p) return;
    box.innerHTML = priceHtml(p) + `<div class="acts">${actionHtml(p)}<a class="btn btn-ghost" href="${waLink(`Hi Petros, I have a question about ${p.name} (${p.size}).`)}" target="_blank" rel="noopener">Ask a question</a></div>`;
    const rel = $("#related");
    if (rel) rel.innerHTML = PRODUCTS.filter(x=>x.need===p.need && x.slug!==p.slug).slice(0,3).map(card).join("") || "";
    const relWrap = $("#relatedWrap"); if (relWrap) relWrap.hidden = !rel.innerHTML;
  }

  function render(){
    const c = country();
    document.querySelectorAll("[data-cname]").forEach(el=>el.textContent = c.name === "Another country" ? "your country" : c.name);
    const reg = $("#regBtn");
    if (reg){
      reg.href = c.register || waLink("Hi Petros, I want to register but my country isn't listed. Can you help?");
      reg.textContent = c.register ? `Register through my link (${c.name})` : "Ask me about your country";
    }
    renderShop(); renderProduct();
  }

  sel.addEventListener("change", ()=>{ current = sel.value; try{localStorage.setItem("country",current)}catch(e){} render(); });
  const q = $("#q"); if (q) q.addEventListener("input", renderShop);
  const chips = $("#chips"); if (chips) chips.addEventListener("click", e=>{ const b = e.target.closest(".chip"); if(!b) return; filter = b.dataset.need; renderShop(); });

  const form = $("#leadForm");
  if (form) form.addEventListener("submit", e=>{
    e.preventDefault();
    const name = $("#lname").value.trim(), phone = $("#lphone").value.trim();
    const ok = $("#leadOk"); ok.hidden = false;
    if(!name || !phone){ ok.textContent = "Please enter your name and WhatsApp number so I can send the guide."; return; }
    const msg = `Hi Petros, I'm ${name} (${phone}) from ${country().name}. I've got your free beginner's guide. I'm interested in: ${$("#linterest").value}.`;
    ok.innerHTML = `<strong>Thanks, ${esc(name)}. Your guide is ready.</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><a class="btn btn-leaf" href="${root}guide.html">Read the guide</a><a class="btn btn-ghost" href="${waLink(msg)}" target="_blank" rel="noopener">Send my details on WhatsApp</a></div><p style="margin-top:8px;font-size:.85rem">Sending your details lets me answer your questions and add you to the next free training.</p>`;
  });

  const wa = $("#wa"); if (wa) wa.textContent = "+" + WHATSAPP.replace(/^(\d{3})(\d{3})(\d{3})(\d{4})$/,"$1 $2 $3 $4");
  render();
  if (current !== "NG") loadRates().then(render);
  sel.addEventListener("change", ()=>{ if (current !== "NG" && !rates) loadRates().then(render); });
})();
