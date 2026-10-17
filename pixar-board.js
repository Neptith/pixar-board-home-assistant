/*!
 * Pixar Board pour Home Assistant — tableau de bord tablette « une page fixe » (1280×800 / 1200×750).
 * Un seul fichier : carte `custom:pixar-board`, stratégie de vue `custom:pixar-board`, animations et finitions,
 * mode nuit (sun.sun) et thèmes saisonniers (Halloween, Noël).
 * Installation et options : voir README.md.
 */
/* Pixar Board — tableau de bord tablette « une page fixe » pour Home Assistant.
   Toutes les entités se règlent dans la config (clé `entities`) ; voir README.md. */
const P2_CACHE = {};
async function p2Slices(url) {
  if (P2_CACHE[url]) return P2_CACHE[url];
  const img = new Image();
  img.src = url;
  await img.decode();
  const W = img.naturalWidth, cs = W / 5, S = 256, M = 3;
  const cw = Math.floor(cs) - 2 * M;
  const cell = document.createElement("canvas");
  cell.width = cell.height = cw;
  const g = cell.getContext("2d", { willReadFrequently: true });
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d");
  const out = {};
  const seg = (arr) => {
    const segs = []; let cur = null, gap = 0;
    for (let i = 0; i <= arr.length; i++) {
      const on = i < arr.length && arr[i] > 2;
      if (on) { if (!cur) cur = { a: i, b: i }; cur.b = i; gap = 0; }
      else if (cur) { gap++; if (gap >= 3 || i === arr.length) { segs.push(cur); cur = null; gap = 0; } }
    }
    const keep = segs.filter((s) => s.b - s.a >= 14);
    return keep.length ? { a: Math.min(...keep.map((s) => s.a)), b: Math.max(...keep.map((s) => s.b)) } : null;
  };
  for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) {
    g.clearRect(0, 0, cw, cw);
    g.drawImage(img, Math.floor(k * cs) + M, Math.floor(r * cs) + M, cw, cw, 0, 0, cw, cw);
    const d = g.getImageData(0, 0, cw, cw).data;
    const col = new Array(cw).fill(0), row = new Array(cw).fill(0);
    for (let y = 0; y < cw; y++) for (let xx = 0; xx < cw; xx++) if (d[(y * cw + xx) * 4 + 3] > 40) { col[xx]++; row[y]++; }
    const sx = seg(col), sy = seg(row);
    if (!sx || !sy) continue;
    g.clearRect(0, 0, sx.a, cw); g.clearRect(sx.b + 1, 0, cw, cw);
    g.clearRect(0, 0, cw, sy.a); g.clearRect(0, sy.b + 1, cw, cw);
    const side = Math.max(sx.b - sx.a, sy.b - sy.a) * 1.06;
    x.clearRect(0, 0, S, S);
    x.drawImage(cell, (sx.a + sx.b) / 2 - side / 2, (sy.a + sy.b) / 2 - side / 2, side, side, 0, 0, S, S);
    out[r + "," + k] = c.toDataURL("image/webp", 0.9);
  }
  P2_CACHE[url] = out;
  return out;
}
const P2_ICON = {
  soleil: "0,0", nuage: "0,1", pluie: "0,2", lune: "0,3", porte: "0,4", garage: "1,0", frigo: "1,1",
  climat: "1,2", plante: "1,3", maison: "1,4", arbre: "2,0", volet: "2,1", lit: "2,2", chat: "2,3",
  voiture: "2,4", cloche: "3,0", reveil: "3,1", poubelle: "3,2", tv: "3,3", fumee: "3,4", solaire: "4,0", barbecue: "4,1"
};
const P2_COND = {
  "clear-night": "Nuit claire", cloudy: "Nuageux", exceptional: "Exceptionnel", fog: "Brouillard", hail: "Grêle",
  lightning: "Orage", "lightning-rainy": "Orage", partlycloudy: "Éclaircies", pouring: "Averses", rainy: "Pluie",
  snowy: "Neige", "snowy-rainy": "Neige fondue", sunny: "Ensoleillé", windy: "Venteux", "windy-variant": "Venteux"
};
/* Entités par défaut (génériques) : chacune se remplace dans la config, clé `entities`. Laisser "" pour masquer une fonction optionnelle. */
const PB_DEFAULTS = {
  weather: "weather.home",
  outdoor_temp: "sensor.outdoor_temperature",
  door_lock: "lock.front_door",
  door_contact: "binary_sensor.front_door_contact",
  garage: "cover.garage_door",
  shutters: ["cover.living_room_shutter", "cover.bedroom_shutter"],
  smoke: ["binary_sensor.smoke_detector"],
  alerts_count: "",
  indoor_temp: "sensor.living_room_temperature",
  indoor_humidity: "sensor.living_room_humidity",
  co2: "sensor.living_room_co2",
  bedrooms: ["sensor.bedroom_temperature"],
  bedrooms_tap: "",
  grid_power: "sensor.grid_power",
  solar_power: "sensor.solar_power",
  house_power: "sensor.house_power",
  grid_energy_today: "sensor.grid_energy_today",
  virtual_batteries: [],
  car: { name: "Voiture", battery: "sensor.car_battery", charging: "binary_sensor.car_charging", plugged: "binary_sensor.car_plugged" },
  fridges: [
    { entity: "sensor.fridge_temperature", name: "Frigo", warn: 5, bad: 6, ge: true, warn_delay: 10, bad_delay: 20 },
    { entity: "sensor.freezer_temperature", name: "Congélateur", warn: -18, bad: -15, warn_delay: 15, bad_delay: 30 }
  ],
  grill: "",
  dinner_watch: "",
  hurry_button: "input_button.hurry_up",
  sound_watch: "",
  litter: { status: "", count: "", threshold: "" },
  bins: { weekday: 1, yellow_reference: "2026-01-05", yellow_every_weeks: 2 },
  tv: "media_player.living_room_tv",
  tv_app: "",
  speakers: [{ entity: "media_player.soundbar", name: "Barre son" }]
};
function pbConf(c) {
  const e = Object.assign({}, PB_DEFAULTS, (c && c.entities) || {});
  if (c && c.weather) e.weather = c.weather;
  e.car = Object.assign({}, PB_DEFAULTS.car, e.car || {});
  e.litter = Object.assign({}, PB_DEFAULTS.litter, e.litter || {});
  e.bins = Object.assign({}, PB_DEFAULTS.bins, e.bins || {});
  e.fridges = (e.fridges || []).map((f) => ({ e: f.entity, n: f.name || f.entity, warn: f.warn, bad: f.bad, ge: !!f.ge, wd: f.warn_delay ?? 10, bd: f.bad_delay ?? 20 }));
  e.virtual_batteries = (e.virtual_batteries || []).map((b) => Object.assign({ name: "Batterie virtuelle" }, b));
  return e;
}
if (!document.getElementById("p2-font")) {
  const l = document.createElement("link");
  l.id = "p2-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap";
  document.head.appendChild(l);
}
const P2_SWEAT = `<svg class="sweat" viewBox="0 0 24 32"><path d="M12 2C12 2 3 14 3 20a9 9 0 0 0 18 0C21 14 12 2 12 2z" fill="#7fd3ff" stroke="#fff" stroke-width="1.5"/><ellipse cx="8.5" cy="19" rx="2" ry="3.5" fill="#fff" opacity=".7"/></svg>`;
const P2_ZZZ = `<svg class="zzz" viewBox="0 0 60 50"><text x="4" y="44" font-family="Nunito,sans-serif" font-weight="900" font-size="22" fill="#fff" opacity=".85">z</text><text x="22" y="30" font-family="Nunito,sans-serif" font-weight="900" font-size="17" fill="#fff" opacity=".7">z</text><text x="38" y="16" font-family="Nunito,sans-serif" font-weight="900" font-size="13" fill="#fff" opacity=".55">z</text></svg>`;
const P2_CSS = `
:host{display:block;position:relative;height:100vh;box-sizing:border-box;font-family:Nunito,system-ui,sans-serif;color:#F5F7FF;-webkit-tap-highlight-color:transparent;--r:26px}
*{box-sizing:border-box}
.wrap{height:100%;padding:12px;display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:12px}
.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;min-height:0}
.top{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.card{position:relative;min-height:0;border-radius:var(--r);padding:12px 14px;display:flex;flex-direction:column;cursor:pointer;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 38%),radial-gradient(120% 70% at 15% 0%,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 55%),linear-gradient(165deg,var(--a),var(--b));
  border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.3),inset 0 -16px 28px rgba(0,0,0,.24),0 12px 26px rgba(0,0,0,.5);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.card:active{transform:scale(.98)}
.card.attn{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.3),0 0 0 1.5px rgba(255,200,87,.65),0 12px 26px rgba(0,0,0,.5)}
.card.alarm{animation:alarm 1.4s ease-in-out infinite}
@keyframes alarm{50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 0 5px rgba(255,82,82,.85),0 10px 24px rgba(0,0,0,.45)}}
.hd{position:relative;z-index:1;padding-right:92px;min-height:0}
.hd .t{font-size:17px;font-weight:900;letter-spacing:.3px;opacity:.95}
.hd .st{margin-top:2px;font-size:13px;font-weight:800;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hd .st.warn{color:#FFD27A;opacity:1}.hd .st.bad{color:#FF8A8A;opacity:1}.hd .st.good{color:#A8F0B8;opacity:1}
.hero{position:absolute;right:8px;top:6px;width:96px;height:96px;filter:drop-shadow(0 10px 12px rgba(0,0,0,.45));pointer-events:none;z-index:0;transition:filter .6s;transform-origin:50% 90%;animation:idle 12s ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes idle{0%,82%,100%{transform:translateY(0) rotate(0) scale(1)}86%{transform:translateY(-8px) rotate(-5deg) scale(1.04,.98)}90%{transform:translateY(0) rotate(3deg) scale(1.03,.95)}94%{transform:translateY(-3px) rotate(-1deg) scale(1)}97%{transform:translateY(0) scale(1.01,.99)}}
.hero-wrap::after{animation:shadow 12s ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes shadow{0%,82%,100%{transform:scale(1);opacity:1}86%{transform:scale(.8);opacity:.6}90%{transform:scale(1.05)}}
.hero-wrap{position:absolute;right:0;top:0;width:110px;height:118px;pointer-events:none;z-index:0}
.hero-wrap::before{content:"";position:absolute;right:2px;top:-2px;width:108px;height:108px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,214,150,.30),rgba(255,214,150,0));z-index:-1;transition:background .8s,opacity .8s}
.tvon .hero{filter:drop-shadow(0 0 14px rgba(130,205,255,.75)) drop-shadow(0 10px 12px rgba(0,0,0,.45))}
.tvon .hero-wrap::before{background:radial-gradient(closest-side,rgba(130,205,255,.55),rgba(130,205,255,0));animation:tvglow 4s ease-in-out infinite}
@keyframes tvglow{50%{opacity:.6}}
.asleep .hero-wrap::before{opacity:.15}
.lit .hero-wrap::before{background:radial-gradient(closest-side,rgba(255,190,90,.55),rgba(255,190,90,0))}
.watching .hero{animation:ponder 4s ease-in-out infinite}
@keyframes ponder{0%,100%{transform:rotate(0)}40%{transform:rotate(-7deg) translateY(-2px)}60%{transform:rotate(-7deg) translateY(-2px)}}
.watching .hero-wrap::before{background:radial-gradient(closest-side,rgba(255,200,87,.5),rgba(255,200,87,0))}
.worried .hero-wrap::before{background:radial-gradient(closest-side,rgba(255,90,90,.55),rgba(255,90,90,0))}
.blind .hero{filter:grayscale(.6) brightness(.8) drop-shadow(0 10px 12px rgba(0,0,0,.45))}
.secu .hd .st{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25;height:2.5em}
/* jauge batterie virtuelle */
.vb{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;padding-bottom:2px}
.vb .h{display:flex;align-items:baseline;justify-content:space-between;gap:6px;font-size:12px;font-weight:800;white-space:nowrap}
.vb .h span{opacity:.8;overflow:hidden;text-overflow:ellipsis}
.vb .h b{font-size:21px;font-weight:900}
.vbs .tx{flex:1}.vbs .gauge{display:block;height:7px;margin-top:3px}
.gauge{height:13px;border-radius:999px;background:rgba(0,0,0,.3);box-shadow:inset 0 2px 3px rgba(0,0,0,.4),0 1px 0 rgba(255,255,255,.12);overflow:hidden}
.gauge i{display:block;height:100%;min-width:8px;border-radius:999px;background:linear-gradient(180deg,#C9F7A8,#4CAF50);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}
.gauge.low i{background:linear-gradient(180deg,#FFE2A3,#E89A2C)}
/* fenêtre de détails */
.modal{position:absolute;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(5,8,20,.6);backdrop-filter:blur(3px)}
.modal.open{display:flex;animation:fade .2s}
@keyframes fade{from{opacity:0}}
.sheet{width:min(600px,92%);max-height:92%;overflow:hidden;border-radius:26px;padding:16px 22px 18px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 40%),linear-gradient(165deg,var(--a,#B98B3E),var(--b,#6A4418));border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.3),0 20px 50px rgba(0,0,0,.6);animation:pop .3s cubic-bezier(.34,1.56,.64,1)}
.sheet h3{margin:0 0 6px;font-size:22px;font-weight:900}
.sheet .r2{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:15px;font-weight:800}
.sheet .r2 small{display:block;font-size:11.5px;font-weight:700;opacity:.7}
.sheet .r2 > span:last-child{text-align:right;font-weight:900;white-space:nowrap}
.sheet p{font-size:13px;font-weight:700;opacity:.82;margin:10px 0 0;line-height:1.35}
.sheet .btns{display:flex;gap:10px;margin-top:12px}
.sheet button{flex:1;font:inherit;font-weight:900;font-size:15px;color:#fff;border:0;border-radius:14px;padding:11px;background:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.1));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 8px rgba(0,0,0,.25)}
.hero-wrap::after{content:"";position:absolute;right:22px;top:98px;width:70px;height:12px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.42),transparent);z-index:-1}
.sweat{position:absolute;right:16px;top:14px;width:20px;height:27px;animation:drip 1.6s ease-in infinite}
@keyframes drip{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(16px);opacity:0}}
.zzz{position:absolute;right:6px;top:2px;width:44px;height:36px;animation:zz 3s ease-in-out infinite}
@keyframes zz{50%{transform:translate(2px,-4px);opacity:.6}}
.worried .hero{animation:shiver .5s linear infinite}
@keyframes shiver{25%{transform:translateX(-2px) rotate(-2deg)}75%{transform:translateX(2px) rotate(2deg)}}
.asleep .hero{animation:none;filter:brightness(.55) saturate(.6) drop-shadow(0 10px 12px rgba(0,0,0,.45))}
.lit .hero{filter:drop-shadow(0 0 16px rgba(255,190,90,.75)) drop-shadow(0 10px 12px rgba(0,0,0,.45))}
.body{position:relative;z-index:1;margin-top:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.s{position:relative;display:flex;align-items:center;gap:6px;min-width:0;padding:6px 8px 6px 5px;border-radius:16px;
  background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.12);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -3px 6px rgba(0,0,0,.14),0 3px 8px rgba(0,0,0,.18);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1),background .3s}
.s:active{transform:scale(.94)}
.s .ic{position:relative;flex:none;width:36px;height:36px}
.s .ic::after{content:"";position:absolute;left:6px;right:6px;bottom:-2px;height:6px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.35),transparent)}
.s img{position:relative;z-index:1;width:36px;height:36px;filter:drop-shadow(0 4px 4px rgba(0,0,0,.35)) saturate(1.05)}
.s .l{display:block;font-size:11.5px;font-weight:800;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s .v{display:block;font-size:17px;letter-spacing:-.2px;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s .tx{min-width:0}
.s.warn{background:linear-gradient(180deg,rgba(255,200,87,.34),rgba(255,200,87,.16));border-color:rgba(255,200,87,.6)}
.s.focus{background:linear-gradient(180deg,rgba(255,196,80,.55),rgba(214,140,30,.35));border-color:#FFC857;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 2px rgba(255,200,87,.55),0 0 18px rgba(255,190,70,.45);animation:focus 2.6s ease-in-out infinite}
.s.focus .v{color:#FFF1C9}
@keyframes focus{50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 3px rgba(255,200,87,.8),0 0 26px rgba(255,190,70,.6)}}
.s.warn .v{color:#FFE2A3}
.s.bad{background:linear-gradient(180deg,rgba(255,82,82,.42),rgba(255,82,82,.22));border-color:rgba(255,120,120,.8)}
.s.bad .v{color:#FFD0D0}
.s.good .v{color:#C8F7D2}
.s.dim img{filter:brightness(.7) saturate(.85) drop-shadow(0 4px 4px rgba(0,0,0,.35))}
.s.wide{grid-column:1 / -1}
.s.sent::after{content:"Envoyé ✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(76,175,110,.92);font-weight:900;font-size:17px;animation:pop .35s cubic-bezier(.34,1.56,.64,1)}
@keyframes pop{from{transform:scale(.6);opacity:0}}
.s.ring img{animation:ring 1.1s ease-in-out}
@keyframes ring{0%,100%{transform:rotate(0)}15%{transform:rotate(-22deg)}30%{transform:rotate(18deg)}45%{transform:rotate(-12deg)}60%{transform:rotate(8deg)}75%{transform:rotate(-4deg)}}
.big{position:relative;z-index:1;display:flex;align-items:baseline;gap:12px;margin-top:4px}
.big b{font-size:44px;font-weight:900;line-height:1;letter-spacing:-1px;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.big .u{font-size:22px;font-weight:900;opacity:.9}
.big small{font-size:12px;font-weight:800;opacity:.72;display:block}
.kv{display:flex;flex-direction:column}
.kv.note{justify-content:flex-end;gap:2px;min-width:0}
.kv.note small{font-size:11px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.big{min-width:0}
.fridges{position:relative;z-index:1;margin-top:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.fr{position:relative;border-radius:16px;padding:6px 10px;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -3px 6px rgba(0,0,0,.14),0 3px 8px rgba(0,0,0,.18)}
.fr .since{position:absolute;right:9px;top:7px;font-size:10.5px;font-weight:800;opacity:.85}
.fr.watch{border-color:rgba(255,200,87,.55)}.fr.watch .v{color:#FFE9B8}
.fr .l{font-size:11.5px;font-weight:800;opacity:.72}
.fr .v{font-size:26px;font-weight:900;line-height:1.05}
.fr.warn{background:linear-gradient(180deg,rgba(255,200,87,.34),rgba(255,200,87,.16));border-color:rgba(255,200,87,.6)}.fr.warn .v{color:#FFE2A3}
.fr.off{border:1.5px dashed rgba(255,210,122,.7);background:rgba(0,0,0,.18)}.fr.off .v{color:#FFD27A;font-size:20px}
.fr.bad{background:linear-gradient(180deg,rgba(255,82,82,.45),rgba(255,82,82,.24));border-color:rgba(255,120,120,.85)}.fr.bad .v{color:#FFD0D0}
.chip{display:inline-block;margin-top:5px;position:relative;z-index:2;font-size:12px;font-weight:900;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#E07A4F,#A6462A);box-shadow:0 4px 10px rgba(0,0,0,.35)}
/* Famille */
.fam{padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr) 22%;gap:10px;cursor:default}
.ppl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;min-height:0}
.p{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-height:0;border-radius:18px;padding:4px 4px 6px;cursor:pointer;
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.p:active{transform:scale(.95)}
.p.home{background:linear-gradient(180deg,color-mix(in srgb,var(--c) 26%,transparent),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 55%,transparent)}
.p .av{position:relative;flex:1;min-height:0;width:100%;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px}
.p .av::after{content:"";position:absolute;bottom:-3px;left:20%;right:20%;height:10px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent)}
.p img{position:relative;z-index:1;max-width:92%;max-height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.4));transition:filter .6s}
.p.away img,.p.lost img{filter:brightness(.74) saturate(1) drop-shadow(0 6px 8px rgba(0,0,0,.4))}
.p.lost{box-shadow:inset 0 0 0 1.5px rgba(255,210,122,.45)}
.p.lost .w{color:#FFD27A;opacity:1}
.p.home img,.p.free img{transform-origin:50% 100%;animation:breathe 5s ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes breathe{0%,100%{transform:translateY(0) scale(1) rotate(0)}30%{transform:translateY(-3px) scale(1.015) rotate(-1deg)}65%{transform:translateY(-1px) scale(1.008) rotate(1deg)}}
.p.home::before{content:"";position:absolute;left:15%;right:15%;top:22%;bottom:30%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--c) 45%,transparent),transparent);animation:halo 4s ease-in-out infinite;animation-delay:var(--dl,0s);pointer-events:none}
@keyframes halo{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:.75;transform:scale(1.04)}}
.p .lbl{width:100%;text-align:center;border-radius:12px;padding:3px 4px 4px;background:rgba(8,12,30,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.p .n{font-size:17px;font-weight:900;line-height:1.1}
.p .w{font-size:13.5px;font-weight:800;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.p.home .w{color:#C8F7D2;opacity:1}
.p .bt{position:absolute;top:6px;right:8px;font-size:10.5px;font-weight:800;opacity:.5}
.p .bt.low{opacity:1;color:#FF9A9A}
.ph{position:relative;border-radius:18px;overflow:hidden;background-size:cover;background-position:center 25%;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.ph span{position:absolute;left:0;right:0;bottom:0;padding:16px 6px 6px;font-size:11.5px;font-weight:900;text-align:center;background:linear-gradient(0deg,rgba(0,0,0,.7),transparent)}
/* Météo */
.meteo .ext{position:relative;z-index:1;margin-top:auto}
.meteo .ext small{display:block;font-size:12px;font-weight:800;opacity:.75}
.meteo .ext b{font-size:58px;font-weight:900;line-height:.95;letter-spacing:-1.5px;text-shadow:0 3px 0 rgba(0,0,0,.2)}
.meteo .ext .fc{display:inline-block;margin-top:4px;font-size:13px;font-weight:800;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.meteo .hero{width:104px;height:104px}
.twinkle .hero{animation:twinkle 9s ease-in-out infinite;transform-origin:50% 50%}
@keyframes twinkle{0%,90%,100%{transform:scale(1) rotate(0)}93%{transform:scale(1.08,.86) rotate(-4deg)}96%{transform:scale(.97,1.05) rotate(3deg)}}
/* Salon */
.salon .app{position:relative;z-index:1;margin-top:6px;font-size:30px;font-weight:900;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:96px}
.salon .app small{display:block;font-size:12px;font-weight:800;opacity:.72}
`;
class PixarBoard2 extends HTMLElement {
  setConfig(c) { this._c = c; this._E = pbConf(c); this._built = false; this._hist = {}; }
  getCardSize() { return 12; }
  _fire(key, entity) {
    const a = (this._c.actions || {})[key];
    if (!a && !entity) return false;
    const ev = new Event("hass-action", { bubbles: true, composed: true });
    ev.detail = { config: { tap_action: a || { action: "more-info" }, entity }, action: "tap" };
    this.dispatchEvent(ev);
    return true;
  }
  _build() {
    this._built = true;
    const r = this.shadowRoot || this.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${P2_CSS}</style><div class="wrap">
      <div class="row top"><div class="card fam" data-k="fam" style="--a:#2B3A66;--b:#1A2348"></div><div class="card meteo" data-k="meteo" style="--a:#4A78B0;--b:#26467E;--dl:-1s"></div></div>
      <div class="row"><div class="card secu" data-k="secu" style="--a:#3E8790;--b:#1E4B57;--dl:-2s"></div><div class="card" data-k="climat" style="--a:#5A79B0;--b:#2C3B72;--dl:-6s"></div><div class="card" data-k="energie" style="--a:#B98B3E;--b:#7A5020;--dl:-10s"></div></div>
      <div class="row"><div class="card" data-k="frigos" style="--a:#4C8A9A;--b:#254F62;--dl:-4s"></div><div class="card" data-k="famille" style="--a:#A9677A;--b:#64324A;--dl:-8s"></div><div class="card salon" data-k="salon" style="--a:#7468A8;--b:#3A3170;--dl:-11s"></div></div>
    </div>`;
    this._root = r;
    this._modal = document.createElement("div");
    this._modal.className = "modal";
    r.appendChild(this._modal);
    r.addEventListener("click", (e) => {
      const path = e.composedPath();
      if (this._modal.classList.contains("open")) {
        const btn = path.find((n) => n.dataset && (n.dataset.close !== undefined || n.dataset.act));
        const inSheet = path.some((n) => n.classList && n.classList.contains("sheet"));
        if (btn && btn.dataset.act) { this._closeModal(); this._fire(btn.dataset.act, btn.dataset.ent || undefined); }
        else if ((btn && btn.dataset.close !== undefined) || !inSheet) this._closeModal();
        return;
      }
      const pick = path.find((n) => n.dataset && n.dataset.act);
      if (pick && pick.dataset.act.startsWith("p2:")) { this._openModal(pick.dataset.act.slice(3)); return; }
      const s = path.find((n) => n.dataset && n.dataset.act);
      const target = s || path.find((n) => n.classList && n.classList.contains("card"));
      if (!target || !target.dataset.act) return;
      const ok = this._fire(target.dataset.act, target.dataset.ent || undefined);
      if (ok && target.dataset.confirm) {
        target.classList.add("sent", "ring");
        setTimeout(() => target.classList.remove("sent"), 2600);
        setTimeout(() => target.classList.remove("ring"), 1200);
      }
    });
    p2Slices(this._c.sprite).then((ic) => { this._icons = ic; this._render(true); }).catch((e) => { console.warn(e); this._icons = {}; this._render(true); });
    this._loadHist();
    this._timer = setInterval(() => { this._loadHist(); this._render(true); }, 300000);
  }
  disconnectedCallback() { clearInterval(this._timer); clearTimeout(this._mt); }
  _openModal(k) {
    this._mk = k; this._modal.classList.add("open"); this._modal._last = ""; this._renderModal();
    clearTimeout(this._mt); this._mt = setTimeout(() => this._closeModal(), 45000);
  }
  _closeModal() { this._mk = null; this._modal.classList.remove("open"); clearTimeout(this._mt); }
  _age(e) {
    const st = this._hass.states[e]; if (!st) return "";
    const s = Math.round((Date.now() - new Date(st.last_reported || st.last_updated).getTime()) / 1000);
    if (isNaN(s)) return "";
    return s < 60 ? "à l'instant" : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`;
  }
  _renderModal() {
    if (!this._mk || !this._hass) return;
    const N = (e, d) => this._n(e, d), F = (v, d) => this._fmt(v, d), S = (e) => this._s(e);
    const row = (l, sub, v) => `<div class="r2"><span>${l}${sub ? `<small>${sub}</small>` : ""}</span><span>${v}</span></div>`;
    let html = "";
    if (this._mk === "energie") {
      const E = this._E, pw = N(E.grid_power);
      const vbs = E.virtual_batteries.map((b) => {
        const lvl = N(b.level, 2), kwh = N(b.stock, 2), cap = N(b.capacity, 0), p = N(b.power, 2), st = S(b.state);
        const stTxt = { charging: "en charge", discharging: "utilisée", idle: "au repos", standby: "au repos", full: "pleine" }[st] || (["unknown", "unavailable"].includes(st) ? "état inconnu" : st);
        return row(b.name, `${stTxt} · ${this._age(b.level)}`, `${lvl === null ? "–" : F(lvl, lvl < 10 ? 2 : 0) + " %"}`) +
          row("Stock de la batterie virtuelle", p !== null && p !== 0 ? `flux actuel ${F(Math.abs(p), 2)} kW` : "", `${F(kwh, 2)} kWh${cap ? ` / ${cap} kWh` : ""}`);
      }).join("");
      html = `<div class="sheet" style="--a:#B98B3E;--b:#6A4418"><h3>Énergie · détails</h3>
        ${row(pw === null ? "Compteur" : pw < 0 ? "Surplus envoyé" : "Prélèvement réseau", `au compteur · ${this._age(E.grid_power)}`, pw === null ? "–" : `${Math.abs(pw).toLocaleString("fr-FR")} W`)}
        ${row("Production solaire", this._age(E.solar_power), `${F(N(E.solar_power, 2), 2)} kW`)}
        ${row("Consommation maison", this._age(E.house_power), `${F(N(E.house_power, 2), 2)} kW`)}
        ${vbs}
        ${row("Pris au réseau aujourd'hui", this._age(E.grid_energy_today), `${F(N(E.grid_energy_today, 1))} kWh`)}
        <p>Le compteur est lu en temps réel ; la production solaire peut remonter moins souvent, d'où de petits écarts.</p>
        <div class="btns"><button data-act="energie" data-ent="${E.grid_power}">Graphiques énergie</button><button data-close>Fermer</button></div></div>`;
    }
    if (this._modal._last !== html) { this._modal.innerHTML = html; this._modal._last = html; }
  }
  async _loadHist() {
    if (!this._hass) { setTimeout(() => this._loadHist(), 3000); return; }
    try {
      const start = new Date(Date.now() - 40 * 60000).toISOString();
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start, entity_ids: this._E.fridges.map((f) => f.e), minimal_response: true, no_attributes: true, significant_changes_only: false });
      const h = {};
      for (const f of this._E.fridges) {
        h[f.e] = (res[f.e] || []).map((p) => ({ t: (p.lu || p.lc || 0) * 1000, v: parseFloat(p.s) })).filter((p) => !isNaN(p.v));
      }
      this._hist = h; this._histOk = true; this._render(true);
    } catch (e) { console.warn("p2 hist", e); }
  }
  _aboveFor(e, thr, ge) {
    const cur = parseFloat(this._s(e));
    const over = (v) => (ge ? v >= thr : v > thr);
    if (isNaN(cur) || !over(cur)) return 0;
    const pts = (this._hist[e] || []).slice();
    let start = pts.length ? pts[0].t : Date.now();
    for (let i = pts.length - 1; i >= 0; i--) { if (!over(pts[i].v)) { start = i + 1 < pts.length ? pts[i + 1].t : Date.now(); break; } }
    return Date.now() - start;
  }
  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    this._render();
  }
  _i(n) { return (this._icons || {})[P2_ICON[n]] || ""; }
  _s(e) { const s = this._hass && this._hass.states[e]; return s ? s.state : "unavailable"; }
  _n(e, d = 0) { const v = parseFloat(this._s(e)); return isNaN(v) ? null : +v.toFixed(d); }
  _fmt(v, d = 1) { return v === null || v === undefined ? "–" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  _set(k, html, cls = "", act = "", ent = "") {
    const el = this._root.querySelector(`.card[data-k="${k}"]`);
    el.dataset.act = act; el.dataset.ent = ent;
    const base = el.className.split(" ").filter((c) => ["card", "fam", "meteo", "salon", "secu"].includes(c)).join(" ");
    const nc = (base + " " + cls).trim();
    if (el.className !== nc) el.className = nc;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }
  _sub(o) {
    return `<div class="s ${o.cls || ""}" data-act="${o.act || ""}" data-ent="${o.ent || ""}"${o.confirm ? ' data-confirm="1"' : ""}><span class="ic"><img src="${this._i(o.icon)}"></span><span class="tx"><span class="l">${o.label}</span><span class="v">${o.value}</span></span></div>`;
  }
  _hero(icon, extra = "") { return `<div class="hero-wrap"><img class="hero" src="${this._i(icon)}">${extra}</div>`; }
  _render(force) {
    if (!this._hass || !this._root || !this._icons) return;
    const now = Date.now();
    if (!force && this._lastR && now - this._lastR < 1500) { clearTimeout(this._rt); this._rt = setTimeout(() => this._render(true), 1600); return; }
    this._lastR = now;
    const S = (e) => this._s(e), N = (e, d) => this._n(e, d), F = (v, d) => this._fmt(v, d), E = this._E;
    const night = S("sun.sun") === "below_horizon";

    /* Famille */
    const fam = this._c.famille || {}, zones = fam.zones || {};
    const ppl = (fam.people || []).map((p, idx) => {
      const st = this._hass.states[p.entity];
      const tracked = st && !["unknown", "unavailable"].includes(st.state);
      const home = tracked && st.state === "home";
      /* sans suivi prévu (no_tracker) ≠ suivi momentanément indisponible */
      let where = p.no_tracker || "Suivi indisponible";
      if (tracked) where = home ? "Maison" : zones[st.state] ? zones[st.state][1] : st.state === "not_home" ? "Sorti" : st.state;
      const b = p.battery ? N(p.battery) : null;
      const cls = home ? "home" : tracked ? "away" : p.no_tracker ? "free" : "lost";
      return `<div class="p ${cls}" style="--c:${p.color || "#FFB74D"};--dl:${-idx * 1.3}s" data-act="more" data-ent="${p.entity}">${b !== null ? `<span class="bt ${b < 20 ? "low" : ""}">${b} %</span>` : ""}<div class="av">${p.image ? `<img src="${p.image}">` : ""}</div><div class="lbl"><div class="n">${p.name}</div><div class="w">${where}</div></div></div>`;
    }).join("");
    this._set("fam", `<div class="ppl">${ppl}</div>${fam.photo ? `<div class="ph" data-act="presence" data-ent="${((fam.people || [])[0] || {}).entity || ""}" style="background-image:url('${fam.photo}')"><span>Où est la famille ?</span></div>` : ""}`, "fam");

    /* Météo */
    const wid = E.weather;
    const w = this._hass.states[wid], cond = w ? w.state : "";
    let wi = "nuage";
    if (["rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy-rainy", "snowy"].includes(cond)) wi = "pluie";
    else if (["sunny", "clear-night"].includes(cond)) wi = night ? "lune" : "soleil";
    else if (cond === "partlycloudy" && night) wi = "lune";
    const day = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    this._set("meteo", `<div class="hd"><div class="t">${day.charAt(0).toUpperCase() + day.slice(1)}</div><div class="st">${P2_COND[cond] || cond}</div></div>${this._hero(wi)}
      <div class="ext"><small>Dehors</small><b>${F(N(E.outdoor_temp, 1))}°</b><br><span class="fc">Prévision ${w ? Math.round(w.attributes.temperature) : "–"}°</span></div>`,
      wi === "soleil" ? "twinkle" : "", "", wid);

    /* Maison — la serrure dit verrouillée / déverrouillée ; le capteur d'ouverture n'est utilisé que s'il remonte une valeur */
    const lock = S(E.door_lock), gar = S(E.garage), contact = S(E.door_contact);
    const hasContact = ["on", "off"].includes(contact);
    const smk = E.smoke.map(S);
    const fire = smk.includes("on"), smkHS = smk.includes("unavailable");
    const vols = E.shutters.map(S);
    const vOpen = vols.filter((v) => ["open", "opening"].includes(v)).length, vKnown = vols.filter((v) => !["unavailable", "unknown"].includes(v)).length;
    const alerts = E.alerts_count ? parseInt(S(E.alerts_count)) || 0 : 0;
    const doorAjar = hasContact && contact === "on";
    const unlocked = lock === "unlocked" || lock === "open" || lock === "unlocking";
    const garOpen = ["open", "opening", "closing"].includes(gar);
    let door, doorV, doorCls;
    if (doorAjar) { door = "porte ouverte"; doorV = "Ouverte"; doorCls = "focus"; }
    else if (lock === "locked") { door = "porte verrouillée"; doorV = "Verrouillée"; doorCls = "good"; }
    else if (unlocked) { door = hasContact ? "porte fermée, non verrouillée" : "porte déverrouillée"; doorV = "Déverrouillée"; doorCls = "focus"; }
    else if (lock === "locking") { door = "porte en verrouillage"; doorV = "Verrouillage…"; doorCls = ""; }
    else { door = "serrure injoignable"; doorV = "Injoignable"; doorCls = "warn"; }
    const garTxt = gar === "closed" ? "garage fermé" : garOpen ? "garage ouvert" : "garage injoignable";
    const volTxt = vKnown === 0 ? "volets injoignables" : vOpen ? `${vOpen} volet${vOpen > 1 ? "s" : ""} ouvert${vOpen > 1 ? "s" : ""}` : "volets fermés";
    let mSt = [door, garTxt, volTxt].join(" · "), mCls = doorCls === "focus" || garOpen ? "warn" : doorCls === "warn" || gar !== "closed" ? "warn" : "good";
    mSt = mSt.charAt(0).toUpperCase() + mSt.slice(1);
    if (alerts) mSt += ` · ${alerts} alerte${alerts > 1 ? "s" : ""}`;
    let cardCls = night ? "lit" : "";
    if (fire) { mSt = "Fumée détectée !"; mCls = "bad"; cardCls += " alarm"; }
    this._set("secu", `<div class="hd"><div class="t">Maison</div><div class="st ${mCls}">${mSt}</div></div>${this._hero("maison")}<div class="body">
      ${this._sub({ icon: "porte", label: "Porte d'entrée", act: "porte", ent: E.door_lock, value: doorV, cls: doorCls })}
      ${this._sub({ icon: "garage", label: "Garage", act: "garage", ent: E.garage, value: gar === "closed" ? "Fermé" : gar === "open" ? "Ouvert" : ["opening", "closing"].includes(gar) ? "Bouge…" : "Injoignable", cls: gar === "closed" ? "good" : garOpen ? "focus" : "warn" })}
      ${this._sub({ icon: "volet", label: "Volets", act: "volets", ent: E.shutters[0], value: vKnown === 0 ? "Injoignables" : vOpen ? `${vOpen} ouvert${vOpen > 1 ? "s" : ""}` : "Tous fermés" })}
      ${this._sub({ icon: "fumee", label: "Fumée", act: "fumee", ent: E.smoke[0], value: fire ? "ALERTE" : smkHS ? "Capteur HS" : "RAS", cls: fire ? "bad" : smkHS ? "warn" : "good" })}
    </div>`, cardCls, "alertes", E.alerts_count || E.door_lock);

    /* Climat */
    const tin = N(E.indoor_temp, 1), hum = N(E.indoor_humidity);
    const co2 = N(E.co2);
    const ch = E.bedrooms.map((e) => N(e, 1)).filter((v) => v !== null);
    this._set("climat", `<div class="hd"><div class="t">Climat</div></div>${this._hero("climat")}
      <div class="big"><div class="kv"><small>Intérieur</small><span><b>${F(tin)}</b><span class="u">°</span></span></div><div class="kv"><small>Humidité</small><span><b>${hum ?? "–"}</b><span class="u">%</span></span></div></div>
      <div class="body">
      ${this._sub({ icon: "lit", label: "Chambres", act: "chambres", ent: E.bedrooms_tap || E.bedrooms[0], value: ch.length ? `${F(Math.min(...ch))}–${F(Math.max(...ch))}°` : "–" })}
      ${this._sub({ icon: "plante", label: "CO₂", act: "air", ent: E.co2, value: co2 === null ? "–" : `${co2} ppm`, cls: co2 === null ? "" : co2 < 800 ? "good" : co2 < 1200 ? "warn" : "bad" })}
    </div>`, "", "climat", E.indoor_humidity);

    /* Énergie — compteur temps réel en W : négatif = surplus envoyé au réseau. Détails : fenêtre au toucher. */
    const pw = N(E.grid_power);
    const prod = N(E.solar_power, 2), cons = N(E.house_power, 2);
    const car = E.car, bat = car.battery ? N(car.battery) : null;
    const charging = !!car.charging && S(car.charging) === "on", plugged = !!car.plugged && S(car.plugged) === "on";
    const surplus = pw !== null && pw < 0;
    const vbHtml = E.virtual_batteries.map((b) => {
      const lvl = N(b.level, 2);
      const txt = lvl === null ? "–" : `${F(lvl, lvl < 10 ? 1 : 0)} %`;
      return `<div class="s vbs" data-act="p2:energie"><span class="ic"><img src="${this._i("solaire")}"></span><span class="tx"><span class="l">${b.name}</span><span class="v">${txt}</span><span class="gauge ${lvl !== null && lvl < 10 ? "low" : ""}"><i style="width:${lvl === null ? 0 : Math.max(0, Math.min(100, lvl))}%"></i></span></span></div>`;
    }).join("");
    this._set("energie", `<div class="hd"><div class="t">Énergie</div></div>${this._hero("solaire")}
      <div class="big"><div class="kv"><small>${pw === null ? "Compteur" : surplus ? "Surplus envoyé" : "Prélèvement réseau"}</small><span><b style="color:${surplus ? "#C8F7D2" : "#FFE2A3"}">${pw === null ? "–" : Math.abs(pw).toLocaleString("fr-FR")}</b><span class="u"> W</span></span></div></div>
      <div class="body">
      ${this._sub({ icon: "soleil", label: "Production solaire", act: "p2:energie", value: `${F(prod, 2)} kW` })}
      ${this._sub({ icon: "maison", label: "Conso maison", act: "p2:energie", value: `${F(cons, 2)} kW` })}
      ${vbHtml}
      ${car.battery ? this._sub({ icon: "voiture", label: charging ? `${car.name} · en charge` : plugged ? `${car.name} · branchée` : car.name, act: "voiture", ent: car.battery, value: `${bat ?? "–"} %`, cls: (bat !== null && bat < 20 ? "warn" : charging ? "good" : "") }) : ""}
    </div>`, "", "p2:energie", "");

    /* Frigos — alerte seulement si le seuil est dépassé assez longtemps */
    // 0 OK · 1 dépassement en cours de temporisation · 2 seuil d'attention tenu (jaune) · 3 seuil d'alerte tenu (rouge)
    let worst = 0, hs = 0;
    const frs = E.fridges.map((f) => {
      const v = N(f.e, 1);
      let lvl = 0, since = 0;
      const over = v !== null && (f.ge ? v >= f.warn : v > f.warn);
      if (v === null) { hs++; }
      else if (over) {
        const aw = this._histOk ? this._aboveFor(f.e, f.warn, f.ge) : 0, ab = this._histOk ? this._aboveFor(f.e, f.bad) : 0;
        since = aw;
        if (this._histOk && ab >= f.bd * 60000) lvl = 3;
        else if (this._histOk && aw >= f.wd * 60000) lvl = 2;
        else lvl = 1;
      }
      worst = Math.max(worst, lvl);
      const min = Math.round(since / 60000);
      return `<div class="fr ${v === null ? "off" : ["", "watch", "warn", "bad"][lvl]}" data-act="froid" data-ent="${f.e}">${lvl && min >= 1 ? `<span class="since">depuis ${min} min</span>` : ""}<div class="l">${f.n}</div><div class="v">${v === null ? "Indispo." : F(v) + "°"}</div></div>`;
    }).join("");
    const hsTxt = hs > 1 ? `${hs} capteurs indisponibles` : "Capteur indisponible";
    const frSt = worst === 3 ? ["bad", "Alerte température"] : worst >= 1 && hs ? ["warn", "À surveiller · " + hsTxt.toLowerCase()] : hs ? ["warn", hsTxt] : worst >= 1 ? ["warn", "À surveiller"] : ["good", "Tout est au frais"];
    const gs = E.grill ? S(E.grill) : "off";
    const tOn = !["unavailable", "unknown", "off", "offline", "idle", "sleeping"].includes(gs);
    const tLbl = gs === "preheating" ? "préchauffage" : gs === "igniting" ? "allumage" : ["cook", "manual_cook", "custom_cook"].includes(gs) ? "cuisson" : ["cool_down", "shutdown"].includes(gs) ? "refroidit" : "en marche";
    const frMood = worst === 3 ? "alarm worried" : worst >= 1 ? "watching" : hs ? "blind" : "";
    this._set("frigos", `<div class="hd"><div class="t">Frigos</div><div class="st ${frSt[0]}">${frSt[1]}</div>${tOn ? `<div class="chip" data-act="barbecue" data-ent="${E.grill}">Barbecue · ${tLbl}</div>` : ""}</div>
      ${this._hero("frigo", worst >= 2 ? P2_SWEAT : "")}
      <div class="fridges">${frs}</div>`, frMood, "froid", (E.fridges[0] || {}).e || "");

    /* Vie de famille */
    /* poubelles : collecte le jour `bins.weekday` (1 = lundi … 7 = dimanche) ; la jaune toutes les `yellow_every_weeks` semaines à partir de `yellow_reference` */
    const bins = E.bins, d = new Date(), bwd = ((bins.weekday || 1) % 7);
    const ahead = (bwd - d.getDay() + 7) % 7 || 7;
    const nm = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ahead);
    const ref = new Date((bins.yellow_reference || "2026-01-05") + "T00:00:00");
    const yellow = bins.yellow_every_weeks ? Math.round((nm - ref) / 864e5) % (7 * bins.yellow_every_weeks) === 0 : false;
    const tonight = ahead === 1 && d.getHours() >= 15 && d.getHours() < 23;
    const L = E.litter, lit = L.status ? S(L.status) : "";
    const full = !!L.count && (parseInt(S(L.count)) || 0) >= (parseInt(L.threshold ? S(L.threshold) : "") || 25);
    const litMap = { standby: "Prête", cleaning: "Nettoyage", waiting_cluster: "Chat dedans", off: "Éteinte" };
    const litOff = ["unavailable", "unknown"].includes(lit);
    this._set("famille", `<div class="hd"><div class="t">Vie de famille</div><div class="st ${tonight ? "warn" : ""}">${tonight ? "Poubelles à sortir ce soir" : "Annonces dans toute la maison"}</div></div>${this._hero("cloche")}<div class="body">
      ${this._sub({ icon: "cloche", label: "Annonce", act: "atable", value: "À table !", confirm: true })}
      ${this._sub({ icon: "reveil", label: "Annonce", act: "depeche", ent: E.hurry_button, value: "Dépêche-toi !", confirm: true })}
      ${this._sub({ icon: "poubelle", label: tonight ? "Ce soir" : `${nm.toLocaleDateString("fr-FR", { weekday: "long" }).replace(/^./, (x) => x.toUpperCase())} ${String(nm.getDate()).padStart(2, "0")}/${String(nm.getMonth() + 1).padStart(2, "0")}`, act: "poubelles", value: yellow ? "Grise, jaune" : "Grise", cls: tonight ? "warn" : "" })}
      ${!L.status ? "" : this._sub({ icon: "chat", label: "Litière", act: "litiere", ent: L.status, value: litOff ? "Hors ligne" : full ? "Sac à changer" : (litMap[lit] || lit), cls: full ? "warn" : litOff ? "dim" : "good" })}
    </div>`, tonight ? "attn" : "", "", "");

    /* Salon */
    const tv = S(E.tv), tvOn = ["on", "playing", "paused", "idle"].includes(tv);
    const tvA = (this._hass.states[E.tv] || {}).attributes || {};
    const live = tvA.media_title || tvA.source;
    const app = tvOn && live ? (["TV", "HDMI"].includes(live) ? "Télé / HDMI" : live) : (E.tv_app ? S(E.tv_app) : "");
    const spk = (E.speakers || []).find((x) => S(x.entity) === "playing");
    const out = spk ? spk.name : "En pause";
    this._set("salon", `<div class="hd"><div class="t">Salon</div><div class="st ${tvOn ? "good" : ""}">${tvOn ? "Télé allumée" : "Télé en veille"}</div></div>${this._hero("tv", tvOn ? "" : P2_ZZZ)}
      <div class="app"><small>${tvOn ? "En ce moment" : "Dernière appli"}</small>${!["unknown", "unavailable", ""].includes(app) ? app : "–"}</div>
      <div class="body">
      ${this._sub({ icon: "tv", label: "Télévision", act: "tele", ent: E.tv, value: tvOn ? "Allumée" : "Éteinte", cls: tvOn ? "good" : "dim" })}
      ${this._sub({ icon: "tv", label: "Son télé", act: "son", ent: ((E.speakers || [])[0] || {}).entity || E.tv, value: out })}
    </div>`, tvOn ? "tvon" : "asleep", "tele", E.tv);
    this._renderModal();
  }
}
customElements.define("pixar-board", PixarBoard2);

class PixarBoard2Strategy extends HTMLElement {
  /* stratégie de vue : la carte en plein écran, sans en-tête ni barre latérale (avec kiosk-mode) */
  static async generate(config) {
    const actions = Object.assign({ more: { action: "more-info" } }, config.actions || {});
    return {
      type: "panel",
      background: "radial-gradient(ellipse at 50% -10%, #24366b 0%, transparent 60%), radial-gradient(ellipse at 100% 110%, #1b2a55 0%, transparent 55%), linear-gradient(180deg, #121c3d 0%, #0a1128 100%)",
      kiosk_mode: { hide_header: true, hide_sidebar: true },
      cards: [Object.assign({}, config, { type: "custom:pixar-board", actions })]
    };
  }
}
customElements.define("ll-strategy-view-pixar-board", PixarBoard2Strategy);


/* ===== animations et confirmations ===== */
/* couche d'animations — transform / opacity uniquement */
const P2FX_CSS = `
.fx{position:absolute;width:12px;height:12px;pointer-events:none;opacity:0;z-index:2;
  background:radial-gradient(circle,#fff 0 18%,transparent 22%),linear-gradient(#fff,#fff) center/2px 100% no-repeat,linear-gradient(#fff,#fff) center/100% 2px no-repeat;
  clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)}
.fx.f1{right:14px;top:12px}.fx.f2{right:86px;top:30px;width:9px;height:9px}.fx.f3{right:30px;top:78px;width:8px;height:8px}
@keyframes spark{0%,70%,100%{opacity:0;transform:scale(.2) rotate(0)}78%{opacity:1;transform:scale(1) rotate(45deg)}88%{opacity:0;transform:scale(.4) rotate(90deg)}}
.wrap.surplus .card[data-k=energie] .fx{animation:spark 4s ease-in-out infinite}
.wrap.surplus .card[data-k=energie] .fx.f2{animation-delay:-1.3s}.wrap.surplus .card[data-k=energie] .fx.f3{animation-delay:-2.6s}
.card[data-k=frigos]:not(.watching):not(.worried):not(.blind) .fx{animation:spark 6s ease-in-out infinite}
.card[data-k=frigos] .fx{background:radial-gradient(circle,#CFF3FF 0 18%,transparent 22%),linear-gradient(#CFF3FF,#CFF3FF) center/2px 100% no-repeat,linear-gradient(#CFF3FF,#CFF3FF) center/100% 2px no-repeat}
.card[data-k=frigos] .fx.f2{animation-delay:-2s!important}.card[data-k=frigos] .fx.f3{animation-delay:-4s!important}
.wrap.night .card.lit .fx{animation:spark 5s ease-in-out infinite}
.wrap.night .card.lit .fx{background:radial-gradient(circle,#FFE3A3 0 18%,transparent 22%),linear-gradient(#FFE3A3,#FFE3A3) center/2px 100% no-repeat,linear-gradient(#FFE3A3,#FFE3A3) center/100% 2px no-repeat}
.wrap.night .card.lit .fx.f2{animation-delay:-1.7s}.wrap.night .card.lit .fx.f3{animation-delay:-3.4s}
/* météo */
.wrap[data-w=sun] .meteo .hero-wrap::before{background:repeating-conic-gradient(from 0deg,rgba(255,220,120,.22) 0 8deg,rgba(255,220,120,0) 8deg 30deg);-webkit-mask:radial-gradient(closest-side,#000 55%,transparent 100%);mask:radial-gradient(closest-side,#000 55%,transparent 100%);animation:rays 40s linear infinite}
@keyframes rays{to{transform:rotate(360deg)}}
.wrap[data-w=cloud] .meteo .hero{animation:drift 9s ease-in-out infinite}
@keyframes drift{0%,100%{transform:translateX(0)}50%{transform:translateX(-7px) translateY(-2px)}}
.wrap[data-w=rain] .meteo .hero{animation:drift 7s ease-in-out infinite}
.wrap[data-w=rain] .meteo .fx{clip-path:none;width:3px;height:10px;border-radius:2px;background:#9FD8FF;animation:drop 1.4s linear infinite}
.wrap[data-w=rain] .meteo .fx.f1{right:40px;top:80px}.wrap[data-w=rain] .meteo .fx.f2{right:62px;top:76px;animation-delay:-.5s}.wrap[data-w=rain] .meteo .fx.f3{right:84px;top:82px;animation-delay:-.9s}
@keyframes drop{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(22px)}}
.wrap[data-w=moon] .meteo .hero-wrap::before{background:radial-gradient(closest-side,rgba(200,215,255,.45),rgba(200,215,255,0));animation:tvglow 5s ease-in-out infinite}
.wrap[data-w=moon] .meteo .fx{animation:spark 5s ease-in-out infinite}.wrap[data-w=moon] .meteo .fx.f2{animation-delay:-1.6s}.wrap[data-w=moon] .meteo .fx.f3{animation-delay:-3.3s}
/* batterie virtuelle qui se remplit : reflet qui glisse */
.gauge i{position:relative;overflow:hidden}
.wrap.vcharge .vbs .gauge i::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:sheen 2.4s ease-in-out infinite}
@keyframes sheen{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
/* voiture en charge */
.wrap.ev [data-act=voiture] img{animation:evpulse 1.8s ease-in-out infinite}
@keyframes evpulse{50%{transform:translateY(-2px) scale(1.08)}}
/* cloche : petit tintement de temps en temps */
.card[data-k=famille] .hero{animation:idle 12s ease-in-out infinite,ding 17s ease-in-out infinite;animation-delay:var(--dl,0s),-5s}
@keyframes ding{0%,92%,100%{rotate:0deg}93.5%{rotate:-12deg}95%{rotate:10deg}96.5%{rotate:-6deg}98%{rotate:3deg}}
/* chiffres qui changent : petit rebond */
.bump{animation:bump .5s cubic-bezier(.34,1.56,.64,1)}
@keyframes bump{40%{transform:scale(1.08)}}
.big b,.meteo .ext b,.fr .v,.s .v{display:inline-block;transform-origin:left bottom}
.s .v{display:block}
/* ---- finitions : taille des personnages, ambiance, ombres, expressions ---- */
.card{--hs:96px}
.hero{width:var(--hs);height:var(--hs)}
.hero-wrap{width:calc(var(--hs) + 14px);height:calc(var(--hs) + 24px)}
.hero-wrap::before{width:calc(var(--hs) + 12px);height:calc(var(--hs) + 12px)}
.hero-wrap::after{top:calc(var(--hs) + 1px);right:calc(8px + var(--hs) * .12);width:calc(var(--hs) * .76);height:14px;background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,.25) 55%,transparent)}
.hd{padding-right:calc(var(--hs) - 4px)}
.salon .app{padding-right:calc(var(--hs) + 14px)}
.card[data-k=secu]::before,.card[data-k=frigos]::before,.card[data-k=salon]::before{content:"";position:absolute;right:-50px;top:-60px;width:300px;height:260px;border-radius:50%;pointer-events:none;transition:opacity .8s}
.card[data-k=secu]::before{background:radial-gradient(closest-side,rgba(255,196,110,.30),rgba(255,196,110,0))}
.card[data-k=secu].lit::before{background:radial-gradient(closest-side,rgba(255,180,80,.45),rgba(255,180,80,0))}
.card[data-k=frigos]::before{background:radial-gradient(closest-side,rgba(160,225,255,.30),rgba(160,225,255,0))}
.card[data-k=frigos].worried::before{background:radial-gradient(closest-side,rgba(255,110,110,.32),rgba(255,110,110,0))}
.card[data-k=salon]::before{background:radial-gradient(closest-side,rgba(110,185,255,.36),rgba(110,185,255,0));animation:screen 5s steps(1,end) infinite}
.card[data-k=salon].asleep::before{opacity:.18;animation:none}
@keyframes screen{0%{opacity:1}23%{opacity:.82}27%{opacity:1}61%{opacity:.88}64%{opacity:1}}
/* bulles d'expression */
.bub{position:absolute;left:8px;top:2px;width:26px;height:26px;border-radius:50%;display:none;align-items:center;justify-content:center;font:900 16px/1 Nunito,sans-serif;color:#fff;z-index:3;pointer-events:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 4px 8px rgba(0,0,0,.35)}
.bub::after{content:"";position:absolute;right:1px;bottom:-3px;width:8px;height:8px;border-radius:2px;background:inherit;transform:rotate(45deg);z-index:-1}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes popin{from{transform:scale(0)}}
.wrap.safe .card[data-k=secu] .bub{display:flex;background:linear-gradient(180deg,#7BE08F,#3E9E55);animation:popin .4s cubic-bezier(.34,1.56,.64,1),bob 4s ease-in-out .4s infinite}
.wrap.safe .card[data-k=secu] .bub::before{content:"✓"}
.wrap.safe .card[data-k=secu] .hero{animation:calm 7s ease-in-out infinite}
@keyframes calm{0%,100%{transform:scale(1)}50%{transform:scale(1.025,.985)}}
.wrap.exposed .card[data-k=secu] .bub{display:flex;background:linear-gradient(180deg,#FFD27A,#D9952A);animation:popin .4s cubic-bezier(.34,1.56,.64,1),bob 2.4s ease-in-out .4s infinite}
.wrap.exposed .card[data-k=secu] .bub::before{content:"!"}
.card[data-k=frigos].watching .bub{display:flex;background:linear-gradient(180deg,#FFD27A,#D9952A);animation:popin .4s cubic-bezier(.34,1.56,.64,1),bob 3s ease-in-out .4s infinite}
.card[data-k=frigos].watching .bub::before{content:"?"}
.card[data-k=frigos].worried .bub{display:flex;background:linear-gradient(180deg,#FF8A8A,#D93B3B);animation:popin .4s cubic-bezier(.34,1.56,.64,1),bob 1.2s ease-in-out .4s infinite}
.card[data-k=frigos].worried .bub::before{content:"!"}
.card[data-k=frigos].blind .bub{display:flex;background:linear-gradient(180deg,#B0BEC5,#6D7F88)}
.card[data-k=frigos].blind .bub::before{content:"?"}
.card[data-k=salon].asleep .hero{animation:snooze 6s ease-in-out infinite;transform-origin:50% 100%}
@keyframes snooze{0%,100%{transform:translateY(0) rotate(0) scale(1)}50%{transform:translateY(2px) rotate(-3deg) scale(1.01,.97)}}
.card[data-k=salon].tvon .hero{animation:idle 12s ease-in-out infinite,glowbob 4s ease-in-out infinite;animation-delay:var(--dl,0s),0s}
@keyframes glowbob{0%,100%{translate:0 0}50%{translate:0 -2px}}
/* ---- lumière cohérente (lumière clé en haut à gauche), contraste, jauge, interactions, harmonisation ---- */
:host{--sh:drop-shadow(3px 9px 8px rgba(0,0,0,.45));--shs:drop-shadow(1.5px 3px 2.5px rgba(0,0,0,.42))}
.hero{filter:var(--sh)}
.lit .hero{filter:drop-shadow(0 0 16px rgba(255,190,90,.7)) var(--sh)}
.tvon .hero{filter:drop-shadow(0 0 14px rgba(130,205,255,.7)) var(--sh)}
.asleep .hero{filter:brightness(.6) saturate(.65) var(--sh)}
.asleep .hero[data-v]{filter:var(--sh)}
.blind .hero{filter:grayscale(.6) brightness(.8) var(--sh)}
.hero-wrap::after{right:calc(4px + var(--hs) * .12)}
.s img{filter:var(--shs) saturate(1.05)}
.s.dim img{filter:brightness(.72) saturate(.85) var(--shs)}
.p img{filter:drop-shadow(2px 7px 7px rgba(0,0,0,.45))}
.p.away img,.p.lost img{filter:brightness(.74) drop-shadow(2px 7px 7px rgba(0,0,0,.45))}
/* contraste des petits textes et des boutons */
.hd .t{font-size:18px;letter-spacing:.2px;opacity:1;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.hd .st{font-size:13.5px;opacity:.95;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.s{background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(0,0,0,.10));border-color:rgba(255,255,255,.2)}
.s .l{font-size:12px;opacity:.93;text-shadow:0 1px 1px rgba(0,0,0,.4)}
.s .v{text-shadow:0 1px 2px rgba(0,0,0,.35)}
.fr{background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(0,0,0,.10));border-color:rgba(255,255,255,.2)}
.fr .l{font-size:12px;opacity:.93;text-shadow:0 1px 1px rgba(0,0,0,.4)}
.big small,.meteo .ext small,.salon .app small{opacity:.92;text-shadow:0 1px 1px rgba(0,0,0,.4)}
.p .w{opacity:1;text-shadow:0 1px 1px rgba(0,0,0,.4)}
.p .bt{opacity:.85;font-size:11.5px}
.p .lbl{background:rgba(8,12,30,.58)}
/* jauge batterie virtuelle : % + jauge sur la même ligne, bien distincte de la voiture */
.vbs{background:linear-gradient(180deg,rgba(140,230,160,.22),rgba(0,0,0,.10));border-color:rgba(160,240,180,.45)}
.vbs .tx{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:7px;align-items:center}
.vbs .l{grid-column:1 / -1}
.vbs .gauge{grid-column:2;display:block;height:11px;margin:0;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.28)}
.vbs .gauge i{min-width:10px}
/* harmonisation */
.card{border-radius:24px;padding:12px 14px}
.fam{padding:12px 14px}
.p,.ph{border-radius:16px}
.p .lbl{border-radius:11px}
/* interactions : enfoncement + confirmation réelle */
.s,.fr,.p,.ph,.chip{transition:transform .18s cubic-bezier(.34,1.56,.64,1),filter .18s}
.pressed{transform:scale(.95)!important;filter:brightness(1.12)}
.card.pressed{transform:scale(.985)!important;filter:none}
.s.sent::after{display:none}
.s[data-fx]::after{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:16px;font-weight:900;font-size:16px;content:attr(data-fxt);z-index:4}
.s[data-fx=wait]::after{background:rgba(20,26,50,.55);animation:waitp 1s ease-in-out infinite}
@keyframes waitp{50%{opacity:.55}}
.s[data-fx=ok]::after{background:rgba(64,170,100,.94);animation:pop .35s cubic-bezier(.34,1.56,.64,1)}
.s[data-fx=ko]::after{background:rgba(200,130,40,.94);animation:pop .35s cubic-bezier(.34,1.56,.64,1)}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;
/* variantes d'illustrations (optionnelles) : planche de variantes déposée dans www, même grille 5×5 que la planche principale.
   Case 0,0 TV endormie · 0,1 maison de nuit · 0,2 éclaircies · 0,3 neige · 0,4 orage · 1,0 batterie virtuelle.
   Option de config `variants_sprite`. Sans elle, les états restent simulés par la lumière et les animations. */
const P2V_MAP = { tv_veille: "0,0", maison_nuit: "0,1", eclaircies: "0,2", neige: "0,3", orage: "0,4", batterie: "1,0" };
let P2V = null, P2V_URL = null;
async function p2vLoad(url) {
  P2V_URL = url;
  try {
    const img = new Image(); img.src = url; await img.decode();
    const W = img.naturalWidth, cs = W / 5, S = 256, M = 3, cw = Math.floor(cs) - 2 * M;
    const cell = document.createElement("canvas"); cell.width = cell.height = cw;
    const g = cell.getContext("2d", { willReadFrequently: true });
    const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
    const seg = (arr) => { const segs = []; let cur = null, gap = 0;
      for (let i = 0; i <= arr.length; i++) { const on = i < arr.length && arr[i] > 2;
        if (on) { if (!cur) cur = { a: i, b: i }; cur.b = i; gap = 0; } else if (cur) { gap++; if (gap >= 3 || i === arr.length) { segs.push(cur); cur = null; gap = 0; } } }
      const k = segs.filter((s) => s.b - s.a >= 14); return k.length ? { a: Math.min(...k.map((s) => s.a)), b: Math.max(...k.map((s) => s.b)) } : null; };
    const out = {};
    for (const [name, rc] of Object.entries(P2V_MAP)) {
      const [r, k] = rc.split(",").map(Number);
      g.clearRect(0, 0, cw, cw); g.drawImage(img, Math.floor(k * cs) + M, Math.floor(r * cs) + M, cw, cw, 0, 0, cw, cw);
      const d = g.getImageData(0, 0, cw, cw).data, col = new Array(cw).fill(0), row = new Array(cw).fill(0);
      for (let y = 0; y < cw; y++) for (let xx = 0; xx < cw; xx++) if (d[(y * cw + xx) * 4 + 3] > 40) { col[xx]++; row[y]++; }
      const sx = seg(col), sy = seg(row); if (!sx || !sy) continue;
      const side = Math.max(sx.b - sx.a, sy.b - sy.a) * 1.06;
      x.clearRect(0, 0, S, S); x.drawImage(cell, (sx.a + sx.b) / 2 - side / 2, (sy.a + sy.b) / 2 - side / 2, side, side, 0, 0, S, S);
      out[name] = c.toDataURL("image/webp", 0.9);
    }
    P2V = out;
  } catch (e) { P2V = {}; }
}

/* confirmations : l'entité dont on attend le changement d'état après un appui */
const p2fxWatch = (E) => ({ atable: [E.dinner_watch, "Envoyé ✓"], depeche: [E.hurry_button, "Envoyé ✓"], son: [E.sound_watch, "Fait ✓"], porte: [E.door_lock, "Fait ✓"], garage: [E.garage, "Fait ✓"] });
customElements.whenDefined("pixar-board").then(() => {
  const C = customElements.get("pixar-board"), P = C.prototype;
  if (P._fxPatched) return;
  P._fxPatched = true;

  /* historique frigos sur 3 h (au lieu de 40 min) pour une durée « depuis » exacte sur les longs dépassements */
  P._loadHist = async function () {
    if (!this._hass) { setTimeout(() => this._loadHist(), 3000); return; }
    const ids = this._E.fridges.map((f) => f.e);
    try {
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - 180 * 60000).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      const h = {};
      for (const e of ids) h[e] = (res[e] || []).map((p) => ({ t: (p.lu || p.lc || 0) * 1000, v: parseFloat(p.s) })).filter((p) => !isNaN(p.v));
      this._hist = h; this._histOk = true; this._render(true);
    } catch (e) { console.warn("p2fx hist", e); }
  };

  /* confirmation visuelle : attend que Home Assistant confirme le changement d'état */
  P._fxApplyActs = function () {
    const r = this._root; if (!r || !this._fxActs) return;
    const now = Date.now();
    for (const [act, a] of Object.entries(this._fxActs)) {
      const st = this._hass && this._hass.states[a.ent];
      if (a.phase === "wait") {
        if (st && st.last_updated !== a.lu) { a.phase = "ok"; a.until = now + 2200; }
        else if (now - a.t0 > 12000) { a.phase = "ko"; a.until = now + 2500; }
      }
      const el = r.querySelector(`.s[data-act="${act}"]`);
      if ((a.phase === "ok" || a.phase === "ko") && now > a.until) { delete this._fxActs[act]; if (el) el.removeAttribute("data-fx"); continue; }
      if (el) {
        const txt = a.phase === "wait" ? "…" : a.phase === "ok" ? a.okTxt : "Sans réponse";
        if (el.dataset.fx !== a.phase) el.dataset.fx = a.phase;
        if (el.dataset.fxt !== txt) el.dataset.fxt = txt;
      }
    }
    clearTimeout(this._fxT);
    if (Object.keys(this._fxActs).length) this._fxT = setTimeout(() => this._fxApplyActs(), 400);
  };
  P._fxBind = function () {
    const r = this._root; if (!r || r._fxBound) return; r._fxBound = true;
    const target = (e) => e.composedPath().find((n) => n.classList && (n.classList.contains("s") || n.classList.contains("fr") || n.classList.contains("p") || n.classList.contains("ph") || n.classList.contains("chip") || n.classList.contains("card")));
    let pressed = null;
    const up = () => { if (pressed) { const p = pressed; setTimeout(() => p.classList.remove("pressed"), 90); pressed = null; } };
    r.addEventListener("pointerdown", (e) => { if (r.querySelector(".modal.open")) return; pressed = target(e); if (pressed) pressed.classList.add("pressed"); });
    r.addEventListener("pointerup", up); r.addEventListener("pointercancel", up); r.addEventListener("pointerleave", up);
    r.addEventListener("click", (e) => {
      if (r.querySelector(".modal.open")) return;
      const el = e.composedPath().find((n) => n.dataset && n.dataset.act);
      const w = el && p2fxWatch(this._E)[el.dataset.act];
      if (!w || !w[0] || !this._hass) return;
      const st = this._hass.states[w[0]];
      this._fxActs = this._fxActs || {};
      this._fxActs[el.dataset.act] = { ent: w[0], lu: st ? st.last_updated : null, t0: Date.now(), phase: "wait", okTxt: w[1] };
      this._fxApplyActs();
    }, true);
  };
  const orig = P._render;
  P._render = function (force) {
    orig.call(this, force);
    const r = this._root;
    if (!r || !this._hass || !this._icons) return;
    if (!r.getElementById("p2fx")) { const st = document.createElement("style"); st.id = "p2fx"; st.textContent = P2FX_CSS; r.appendChild(st); }
    r.querySelectorAll(".hero-wrap").forEach((h) => { if (!h.querySelector(".fx")) h.insertAdjacentHTML("beforeend", '<i class="fx f1"></i><i class="fx f2"></i><i class="fx f3"></i>'); });
    const S = (e) => this._s(e), wrap = r.querySelector(".wrap");
    const E = this._E, cond = S(E.weather);
    if (P2V === null && this._c.variants_sprite && P2V_URL !== this._c.variants_sprite) p2vLoad(this._c.variants_sprite).then(() => this._render(true));
    const night = S("sun.sun") === "below_horizon";
    let w = "cloud";
    if (["rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy-rainy", "snowy"].includes(cond)) w = "rain";
    else if (["sunny", "clear-night"].includes(cond) || (cond === "partlycloudy" && night)) w = night ? "moon" : "sun";
    if (wrap.dataset.w !== w) wrap.dataset.w = w;
    const pw = parseFloat(S(E.grid_power));
    wrap.classList.toggle("surplus", pw < 0);
    wrap.classList.toggle("vcharge", E.virtual_batteries.some((b) => b.state && S(b.state) === "charging"));
    wrap.classList.toggle("ev", !!E.car.charging && S(E.car.charging) === "on");
    wrap.classList.toggle("night", night);

    r.querySelectorAll(".hero-wrap").forEach((h) => { if (!h.querySelector(".bub")) h.insertAdjacentHTML("beforeend", '<b class="bub"></b>'); });
    /* maison sécurisée = serrure verrouillée, garage fermé, pas de fumée, porte non signalée ouverte */
    const smoke = E.smoke.some((e) => S(e) === "on");
    const safe = S(E.door_lock) === "locked" && S(E.garage) === "closed" && S(E.door_contact) !== "on" && !smoke;
    const exposed = !safe && (["unlocked", "open", "unlocking"].includes(S(E.door_lock)) || ["open", "opening", "closing"].includes(S(E.garage)) || S(E.door_contact) === "on");
    wrap.classList.toggle("safe", safe); wrap.classList.toggle("exposed", exposed);
    /* frigos : après la temporisation, le résumé nomme l'appareil concerné */
    const fc = r.querySelector('.card[data-k=frigos]'), st = fc && fc.querySelector(".hd .st");
    if (st && !fc.querySelector(".fr.off")) {
      const bad = [...fc.querySelectorAll(".fr.bad .l")].map((e) => e.textContent), warn = [...fc.querySelectorAll(".fr.warn .l")].map((e) => e.textContent);
      const txt = bad.length ? "Alerte : " + bad.join(", ") : warn.length ? "Trop chaud : " + warn.join(", ") : null;
      if (txt && st.textContent !== txt) st.textContent = txt;
    }
    /* vie de famille : pas de sous-titre hors alerte poubelles */
    const fs = r.querySelector(".card[data-k=famille] .hd .st");
    if (fs) fs.hidden = fs.textContent.trim() === "Annonces dans toute la maison";
    /* agrandir maison, frigo et télé dans la place libre au-dessus des vignettes */
    const caps = { secu: 118, frigos: 116, salon: 128 };
    for (const k in caps) {
      const c = r.querySelector(`.card[data-k=${k}]`), b = c && c.querySelector(".body,.fridges");
      if (!b) continue;
      const hs = Math.round(Math.max(96, Math.min(caps[k], b.offsetTop - 12))) + "px";
      if (c.style.getPropertyValue("--hs") !== hs) c.style.setProperty("--hs", hs);
    }
    this._fxBind(); this._fxApplyActs();
    /* variantes d'images si le fichier existe */
    if (P2V && Object.keys(P2V).length) {
      const swap = (sel, key, on) => { const img = r.querySelector(sel); if (!img) return;
        if (on && P2V[key]) { if (img.dataset.v !== key) { img.dataset.base = img.dataset.base || img.src; img.src = P2V[key]; img.dataset.v = key; } }
        else if (img.dataset.v === key) { img.src = img.dataset.base; delete img.dataset.v; } };
      swap('.card[data-k=salon] .hero', "tv_veille", !!r.querySelector(".card[data-k=salon].asleep"));
      swap('.card[data-k=secu] .hero', "maison_nuit", night);
      swap('.card[data-k=meteo] .hero', "eclaircies", cond === "partlycloudy" && !night);
      if (cond === "snowy" || cond === "snowy-rainy") swap('.card[data-k=meteo] .hero', "neige", true);
      if (cond === "lightning" || cond === "lightning-rainy") swap('.card[data-k=meteo] .hero', "orage", true);
      swap('.vbs img', "batterie", true);
    }
    /* rebond quand un chiffre change */
    const seen = this._fxSeen || (this._fxSeen = new Map());
    r.querySelectorAll(".big b,.meteo .ext b,.fr .v,.s .v").forEach((el, i) => {
      const k = (el.closest(".card")?.dataset.k || "") + i, t = el.textContent;
      if (seen.has(k) && seen.get(k) !== t) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
      seen.set(k, t);
    });
  };
});


/* ===== finitions, nuit et thèmes ===== */
/* Pixar Board — finitions : lisibilité, alertes frigos, climat, météo, salon, batteries, annonces, ambiance de nuit, thèmes saisonniers */
const p2v4Stars = (pts) => pts.map(([x, y], i) => `radial-gradient(${i % 3 ? 1.6 : 2.2}px ${i % 3 ? 1.6 : 2.2}px at ${x}% ${y}%,rgba(255,250,230,${i % 2 ? .85 : .6}) 50%,rgba(255,250,230,0) 100%)`).join(",");
const P2V4_STARS_BG = p2v4Stars([[6,8],[14,31],[23,12],[31,52],[39,6],[47,27],[55,64],[63,9],[71,40],[79,18],[87,58],[94,7],[10,72],[27,88],[44,80],[60,93],[76,84],[91,76]]);
const P2V4_STARS_CARD = p2v4Stars([[8,10],[17,34],[27,14],[36,6],[52,9],[63,18],[74,8],[84,22],[92,12],[6,48],[96,44]]);
/* décors SVG statiques de la nuit (encodés une fois au chargement) */
const p2v4Svg = (s) => "data:image/svg+xml," + encodeURIComponent(s);
const P2V4_SCENE = p2v4Svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><defs>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7F86E2"/><stop offset="1" stop-color="#4A50AE"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A50B6"/><stop offset="1" stop-color="#2A2B7C"/></linearGradient>
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2A80"/><stop offset="1" stop-color="#171654"/></linearGradient>
<radialGradient id="g"><stop offset="0" stop-color="#FFD27A" stop-opacity=".9"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient></defs>
<path d="M0 78 Q60 44 120 66 T230 50 T300 58 V150 H0Z" fill="url(#a)" opacity=".75"/>
<path d="M0 78 Q60 44 120 66 T230 50 T300 58" fill="none" stroke="#C9C4FF" stroke-opacity=".45" stroke-width="1.5"/>
<g transform="translate(96 46) scale(.75)"><circle cx="18" cy="18" r="28" fill="url(#g)"/><path d="M0 14 L18 0 L36 14Z" fill="#3A3388" stroke="#C4BCFF" stroke-opacity=".6"/><rect x="4" y="14" width="28" height="20" fill="#2B2672"/><rect x="9" y="19" width="7" height="7" rx="1" fill="#FFD27A"/><rect x="20" y="19" width="7" height="7" rx="1" fill="#FFC85C"/></g>
<path d="M0 104 Q75 72 150 92 T300 80 V150 H0Z" fill="url(#b)"/>
<path d="M0 104 Q75 72 150 92 T300 80" fill="none" stroke="#B7AFFF" stroke-opacity=".45" stroke-width="1.5"/>
<g transform="translate(150 48) scale(1.25)"><circle cx="22" cy="24" r="36" fill="url(#g)"/><rect x="31" y="3" width="6" height="12" fill="#2B2672"/><path d="M-2 18 L22 0 L46 18Z" fill="#43399A" stroke="#D2CBFF" stroke-opacity=".7"/><rect x="3" y="18" width="38" height="26" fill="#2E2878"/><rect x="9" y="24" width="9" height="9" rx="1.5" fill="#FFD27A"/><rect x="26" y="24" width="9" height="9" rx="1.5" fill="#FFC85C"/><rect x="18" y="34" width="8" height="10" rx="1" fill="#E8A44A"/></g>
<g transform="translate(218 66) scale(.88)"><circle cx="18" cy="18" r="30" fill="url(#g)"/><path d="M0 14 L18 0 L36 14Z" fill="#3A3388" stroke="#C4BCFF" stroke-opacity=".6"/><rect x="4" y="14" width="28" height="22" fill="#2B2672"/><rect x="13" y="20" width="10" height="9" rx="1.5" fill="#FFD27A"/></g>
<path d="M0 128 Q90 104 185 120 T300 112 V150 H0Z" fill="url(#c)"/>
<path d="M112 124 q7 -18 14 0 z M134 121 q6 -14 12 0 z M268 116 q7 -19 14 0 z M284 117 q5 -13 10 0 z" fill="#121146"/>
</svg>`);
const P2V4_ROOFS = p2v4Svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 60" preserveAspectRatio="none">
<path d="M0 60 V38 L22 24 L44 38 V30 H60 L84 14 L108 30 V40 H124 L140 30 L156 40 V28 L186 10 L216 28 V36 H236 L256 22 L276 36 V44 H292 L312 30 L332 44 V30 L360 14 L388 30 V38 H406 L426 24 L446 38 V32 L470 18 L494 32 V40 H512 L530 28 L548 40 V34 L574 20 L600 34 V60 Z" fill="#16144A" fill-opacity=".7" stroke="#B9B0FF" stroke-opacity=".35" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
</svg>`);
const P2V4_CSS = `
/* lisibilité : textes plus grands, illustrations un peu plus petites */
.card{--hs:86px}
.card.meteo{--hs:92px}
.card.meteo .hero{width:92px;height:92px}
.hd .t{font-size:19px}
.hd .st{font-size:15.5px;font-weight:800}
.secu .hd .st{line-height:1.22;height:2.44em}
.s .l{font-size:13.5px}
.s .v{font-size:18px}
.fr .l{font-size:13.5px}
.big small,.meteo .ext small,.salon .app small{font-size:14px}
.p .w{font-size:15px}
.chip{font-size:13.5px}
/* frigos : seules les cases concernées se colorent, sans clignotement */
.card[data-k=frigos].alarm{animation:none!important}
.card[data-k=frigos].worried .hero{animation:none!important}
.card[data-k=frigos] .bub{animation:popin .4s cubic-bezier(.34,1.56,.64,1)!important}
.card[data-k=frigos].v4alert{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.3),0 0 0 3px rgba(255,82,82,.9),0 12px 26px rgba(0,0,0,.5)}
.fr{padding:7px 10px 8px}
.fr.watch,.fr.warn{background:linear-gradient(180deg,#FFB547,#DD7410)!important;border:1.5px solid #FFD49A!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px rgba(221,116,16,.45)!important}
.fr.bad,.fr.v4red{background:linear-gradient(180deg,#FF6B6B,#C62828)!important;border:1.5px solid #FFB8B8!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px rgba(198,40,40,.5)!important}
.fr.watch .v,.fr.warn .v,.fr.bad .v,.fr.v4red .v{color:#fff!important;font-size:32px;text-shadow:0 2px 3px rgba(0,0,0,.35)}
.fr.watch .l,.fr.warn .l,.fr.bad .l,.fr.v4red .l{opacity:1;color:#fff}
.fr .since{top:auto!important;bottom:9px;right:8px;font-size:13.5px;font-weight:900;opacity:1!important;color:#fff;padding:3px 9px;border-radius:999px;background:rgba(0,0,0,.3);white-space:nowrap}
/* climat : boutons plus grands, humidité mise en avant */
.card[data-k=climat] .big{gap:26px}
.card[data-k=climat] .body{flex:1;min-height:0;margin-top:10px}
.card[data-k=climat] .s{padding:8px 10px 8px 8px;gap:10px}
.card[data-k=climat] .s .ic,.card[data-k=climat] .s img{width:48px;height:48px}
.card[data-k=climat] .s .l{font-size:14px}
.card[data-k=climat] .s .v{font-size:23px}
.hum-c{display:inline-block;width:max-content;margin-top:5px;font-size:13.5px;font-weight:900;padding:3px 10px;border-radius:999px;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.hum-c.ok{background:rgba(110,231,135,.28);color:#D4FADD}
.hum-c.dry{background:rgba(255,181,71,.32);color:#FFE6BF}
.hum-c.wet{background:rgba(100,181,246,.36);color:#DCEEFF}
/* salon : l'état d'abord, l'appli ensuite */
.salon .app.off .tvoff{display:block;font-size:30px;font-weight:900;line-height:1.05}
.salon .app.off small.last{margin-top:4px;font-size:14px;opacity:.85;overflow:hidden;text-overflow:ellipsis}
/* batteries des téléphones */
.p .bt{display:flex;align-items:center;gap:4px;top:6px;right:6px;padding:2px 7px 2px 5px;border-radius:999px;background:rgba(0,0,0,.5);font-size:12.5px;font-weight:900;opacity:1!important;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.p .bt svg{display:block;flex:none}
/* annonces : confirmation nette */
.s[data-act=atable][data-fx]::after,.s[data-act=depeche][data-fx]::after{display:none!important}
.s .ann{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;border-radius:16px;background:linear-gradient(180deg,#5BCB7E,#2E9A55);font-weight:900;font-size:16px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3);animation:pop .35s cubic-bezier(.34,1.56,.64,1);pointer-events:none;white-space:nowrap}
/* climat sur une colonne pour afficher les valeurs entières */
.card[data-k=climat] .body{grid-template-columns:1fr;gap:8px}
.card[data-k=climat] .s .ic,.card[data-k=climat] .s img{width:40px;height:40px}
.card[data-k=climat] .s .v{font-size:22px;overflow:visible}
.card[data-k=climat] .s .tx{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex:1;min-width:0}
.card[data-k=climat] .s .l{font-size:14.5px;overflow:visible}
/* durée de l'alerte frigo sur sa propre ligne */
.fr{display:flex;flex-direction:column;align-items:flex-start}
.fr .since{position:static!important;order:3;margin-top:3px;padding:2px 9px}
/* phrases en blanc, la couleur passe en liseré */
.hd .st.warn,.hd .st.bad,.hd .st.good{color:#fff!important;padding-left:8px;box-shadow:inset 3px 0 0 var(--stc)}
.hd .st.warn{--stc:#FFC857}.hd .st.bad{--stc:#FF6B6B}.hd .st.good{--stc:#7BE08F}
.s.warn .v,.s.good .v,.s.focus .v{color:#fff!important}
/* unités °C */
.u2{font-size:.5em;font-weight:900;opacity:.9}
/* grande horloge météo */
.meteo .hd .t{font-size:15px;opacity:.9;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.meteo .clk{font-size:56px;font-weight:900;line-height:1;letter-spacing:-1.5px;margin:2px 0 2px;text-shadow:0 3px 0 rgba(0,0,0,.2)}
.meteo .ext b{font-size:42px!important;letter-spacing:-1px}
.meteo .ext small{display:inline!important;margin-right:6px}
/* frigos — une vraie ligne pour le résumé, cases un peu plus bas */
.card[data-k=frigos] .hd{margin-bottom:10px;flex:none}
.card[data-k=frigos] .hd .st{line-height:1.3;min-height:1.3em}
.card[data-k=frigos] .fridges{margin-top:auto;gap:6px}
.card[data-k=frigos] .fr .v{font-size:24px}
.fr.watch .v,.fr.warn .v,.fr.bad .v,.fr.v4red .v{font-size:28px!important}
/* climat — Chambres en ligne principale, CO₂ en petite ligne dédiée */
.card[data-k=climat] .body{flex:none;grid-template-rows:auto auto;margin-top:auto;padding-top:8px}
.card[data-k=climat] .s[data-act=air]{padding:5px 12px;min-height:0}
.card[data-k=climat] .s[data-act=air] .ic{display:none}
.card[data-k=climat] .s[data-act=air] .tx{justify-content:flex-start;gap:6px}
.card[data-k=climat] .s[data-act=air] .l{font-size:15px;opacity:1}
.card[data-k=climat] .s[data-act=air] .v{font-size:16px}
.card[data-k=climat] .big .u{margin-left:0}
/* climat — « Intérieur » sous le titre ; frigos — cases plus compactes */
.card[data-k=climat] .hd{flex:none}
.card[data-k=climat] .big{margin-top:14px}
.card[data-k=frigos] .hd{margin-bottom:6px}
.card[data-k=frigos] .fridges{gap:5px;margin-bottom:2px}
.card[data-k=frigos] .fr{padding:4px 9px 5px}
.card[data-k=frigos] .fr .l{font-size:12.5px;line-height:1.15}
.card[data-k=frigos] .fr .v{font-size:21px;line-height:1.05}
.fr.watch .v,.fr.warn .v,.fr.bad .v,.fr.v4red .v{font-size:25px!important}
.card[data-k=frigos] .fr .since{margin-top:2px;padding:1px 8px;font-size:12.5px}
/* CO₂ en pastille à côté du titre Climat (sans pousser le reste) */
.card[data-k=climat] .body .s[data-act=air]{display:none}
.co2p{display:inline-flex;align-items:center;margin-left:10px;vertical-align:2px;font-size:13.5px;font-weight:900;padding:2px 10px;border-radius:999px;background:rgba(0,0,0,.25);color:#fff;white-space:nowrap;cursor:pointer;box-shadow:inset 0 0 0 1.5px var(--cc,rgba(255,255,255,.3))}
.co2p.good{--cc:#7BE08F}.co2p.warn{--cc:#FFC857}.co2p.bad{--cc:#FF6B6B}
/* nuit — bascule sur sun.sun (classe .wrap.night posée par la couche fx et confirmée ici).
   Fonds propres à la nuit, halos bleus/lavande, lueurs dorées localisées.
   Aucun filtre sombre ni baisse d'opacité ; décor statique, derrière le contenu (z-index -1, pointer-events none). */
.wrap.night{background:radial-gradient(60% 45% at 18% 0%,rgba(125,115,255,.32),rgba(125,115,255,0) 70%),radial-gradient(55% 45% at 92% 100%,rgba(190,110,220,.24),rgba(190,110,220,0) 70%),${P2V4_STARS_BG},linear-gradient(180deg,#22217A 0%,#17165E 55%,#13104E 100%)}
.wrap.night .card{isolation:isolate;border-color:rgba(205,195,255,.24)}
.wrap.night .card[data-k=fam]{background:radial-gradient(60% 55% at 45% 92%,rgba(255,190,105,.34),rgba(255,190,105,0) 70%),radial-gradient(40% 35% at 4% 4%,rgba(205,185,255,.18),rgba(205,185,255,0) 70%),linear-gradient(180deg,#0F0D3E 0%,#17145A 32%,#26236E 62%,#2E2B7E 100%)}
.wrap.night .card[data-k=meteo]{background:radial-gradient(40% 52% at 87% 22%,rgba(210,215,255,.34),rgba(210,215,255,0) 70%),radial-gradient(40% 35% at 2% 2%,rgba(190,175,255,.14),rgba(190,175,255,0) 70%),linear-gradient(180deg,#0E0C3C 0%,#15154F 38%,#222470 70%,#30307F 100%)}
.wrap.night .card[data-k=meteo].v4rain,.wrap.night .card[data-k=meteo].v4fog{background:radial-gradient(40% 52% at 87% 22%,rgba(165,195,255,.26),rgba(165,195,255,0) 70%),linear-gradient(180deg,#0F1242 0%,#181E58 38%,#26307A 70%,#343E88 100%)}
.wrap.night .card[data-k=secu]{background:radial-gradient(36% 48% at 86% 30%,rgba(255,196,100,.36),rgba(255,196,100,0) 70%),radial-gradient(45% 40% at 0% 100%,rgba(200,180,255,.20),rgba(200,180,255,0) 70%),radial-gradient(120% 115% at 40% 30%,#3A44A4 0%,#272D7C 52%,#15174A 100%)}
.wrap.night .card[data-k=climat]{background:radial-gradient(40% 40% at 4% 4%,rgba(205,185,255,.24),rgba(205,185,255,0) 70%),radial-gradient(40% 45% at 88% 24%,rgba(150,170,255,.22),rgba(150,170,255,0) 70%),radial-gradient(120% 115% at 40% 35%,#4238A4 0%,#2B2478 52%,#171348 100%)}
.wrap.night .card[data-k=energie]{background:radial-gradient(36% 48% at 86% 28%,rgba(255,196,110,.36),rgba(255,196,110,0) 70%),radial-gradient(45% 40% at 0% 100%,rgba(225,180,255,.22),rgba(225,180,255,0) 70%),radial-gradient(120% 115% at 40% 30%,#7A3E9E 0%,#4E2478 52%,#26113F 100%)}
.wrap.night .card[data-k=frigos]{background:radial-gradient(40% 40% at 4% 4%,rgba(170,205,255,.24),rgba(170,205,255,0) 70%),radial-gradient(40% 45% at 88% 26%,rgba(160,220,255,.22),rgba(160,220,255,0) 70%),radial-gradient(120% 115% at 40% 35%,#2F4AA6 0%,#22307A 52%,#131A48 100%)}
.wrap.night .card[data-k=famille]{background:radial-gradient(36% 48% at 86% 30%,rgba(255,200,115,.40),rgba(255,200,115,0) 70%),radial-gradient(45% 40% at 0% 0%,rgba(225,205,255,.26),rgba(225,205,255,0) 70%),radial-gradient(120% 115% at 40% 30%,#6448B4 0%,#3E2A86 52%,#1F1550 100%)}
.wrap.night .card[data-k=salon]{background:radial-gradient(40% 50% at 86% 26%,rgba(120,180,255,.32),rgba(120,180,255,0) 70%),radial-gradient(45% 40% at 0% 100%,rgba(200,180,255,.20),rgba(200,180,255,0) 70%),radial-gradient(120% 115% at 40% 30%,#5634AE 0%,#36207E 52%,#1B1048 100%)}
/* décors nocturnes statiques (SVG), derrière le contenu, sans interception des appuis */
.wrap.night .card[data-k=fam]::after,.wrap.night .card[data-k=meteo]::before,.wrap.night .card[data-k=meteo]::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit}
/* Famille : ciel étoilé + silhouette discrète de toits en partie basse */
.wrap.night .card[data-k=fam]::after{background:url("${P2V4_ROOFS}") left bottom/100% 15% no-repeat,${P2V4_STARS_CARD}}
/* Météo : paysage en trois plans dans la zone libre à droite, estompé vers la gauche pour laisser les textes dégagés */
.wrap.night .card[data-k=meteo]::before{background:url("${P2V4_SCENE}") right bottom/62% auto no-repeat;-webkit-mask-image:linear-gradient(90deg,transparent 34%,#000 56%);mask-image:linear-gradient(90deg,transparent 34%,#000 56%)}
.wrap.night .card[data-k=meteo].v4clear::after{background:${P2V4_STARS_CARD}}
.wrap.night .card[data-k=meteo].v4rain::after{background:repeating-linear-gradient(105deg,rgba(170,205,255,0) 0 9px,rgba(170,205,255,.22) 9px 10px,rgba(170,205,255,0) 10px 22px) right bottom/60% 75% no-repeat;-webkit-mask-image:linear-gradient(90deg,transparent 35%,#000 60%);mask-image:linear-gradient(90deg,transparent 35%,#000 60%)}
.wrap.night .card[data-k=meteo].v4fog::after{background:linear-gradient(180deg,rgba(220,225,255,0) 52%,rgba(220,225,255,.22) 66%,rgba(220,225,255,0) 74%,rgba(220,225,255,.18) 84%,rgba(220,225,255,0) 94%) right bottom/62% 100% no-repeat}
.wrap.night .card[data-k=meteo].v4snow::after{background:radial-gradient(1.6px 1.6px at 62% 40%,#fff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 74% 55%,#fff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 86% 46%,#fff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 93% 62%,#fff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 68% 66%,#fff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 80% 34%,#fff 50%,transparent 100%)}
/* halos de la couche fx (pêche, ambre) recolorés la nuit, sans animation */
.wrap.night .card[data-k=secu]::before,.wrap.night .card[data-k=secu].lit::before{background:radial-gradient(closest-side,rgba(150,175,255,.30),rgba(150,175,255,0))}
.wrap.night .card[data-k=frigos]::before{background:radial-gradient(closest-side,rgba(150,215,255,.28),rgba(150,215,255,0))}
.wrap.night .card[data-k=frigos].worried::before{background:radial-gradient(closest-side,rgba(255,110,110,.34),rgba(255,110,110,0))}
.wrap.night .card[data-k=salon]::before{background:radial-gradient(closest-side,rgba(120,185,255,.36),rgba(120,185,255,0));animation:none!important}
.wrap.night .fx{animation:none!important;opacity:0!important}
.wrap.night .tvon .hero-wrap::before{animation:none!important}
.wrap.night .hero-wrap::before{background:radial-gradient(closest-side,rgba(195,185,255,.40),rgba(195,185,255,0))}
.wrap.night .meteo .hero-wrap::before{animation:none!important;background:radial-gradient(closest-side,rgba(220,225,255,.58),rgba(220,225,255,0))}
.wrap.night .card[data-k=secu] .hero-wrap::before,.wrap.night .card[data-k=famille] .hero-wrap::before{background:radial-gradient(closest-side,rgba(255,200,110,.62),rgba(255,200,110,0))}
.wrap.night .card[data-k=energie] .hero-wrap::before{background:radial-gradient(closest-side,rgba(255,200,115,.6),rgba(255,200,115,0))}
.wrap.night .tvon .hero-wrap::before{background:radial-gradient(closest-side,rgba(130,205,255,.55),rgba(130,205,255,0))}
/* vignettes : verre lavande lumineux ; les états d'alerte gardent leurs couleurs */
.wrap.night .s:not(.warn):not(.bad):not(.focus):not(.vbs),.wrap.night .fr:not(.warn):not(.watch):not(.bad):not(.v4red):not(.off){background:linear-gradient(180deg,rgba(215,205,255,.25),rgba(120,105,230,.12));border-color:rgba(225,215,255,.34);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 10px rgba(10,6,50,.35)}
.wrap.night .p{background:linear-gradient(180deg,rgba(200,190,255,.10),rgba(255,255,255,.02))}
.wrap.night .hd .t,.wrap.night .hd .st,.wrap.night .s .l,.wrap.night .s .v,.wrap.night .fr .l,.wrap.night .big small,.wrap.night .meteo .clk,.wrap.night .meteo .ext b{text-shadow:0 1px 3px rgba(10,8,40,.6)}
/* maisons : reflet bleuté sur le toit + lueur dorée */
.wrap.night .card[data-k=secu] .hero{filter:drop-shadow(0 -3px 3px rgba(150,195,255,.75)) drop-shadow(0 0 14px rgba(255,190,90,.72)) var(--sh)!important}
.wrap.night .card[data-k=energie] .hero{filter:drop-shadow(0 -3px 3px rgba(150,195,255,.75)) drop-shadow(0 0 14px rgba(255,190,90,.72)) var(--sh)!important}
.wrap.night .s img.v4house{filter:drop-shadow(0 -2px 2px rgba(150,195,255,.85)) drop-shadow(0 0 7px rgba(255,190,90,.8)) var(--shs)!important}
/* 1200 × 750 — petites vignettes un peu plus serrées pour que rien ne soit coupé */
@media (max-width:1240px){.s .l{font-size:12.5px}.s .v{font-size:17px}.s{gap:5px;padding-right:6px}}
/* avatars : éclairage chaud, visibilité intacte */
.wrap.night .p img{filter:drop-shadow(0 0 12px rgba(255,190,120,.32)) drop-shadow(2px 7px 7px rgba(0,0,0,.45))}
.wrap.night .p.away img,.wrap.night .p.lost img{filter:brightness(.74) drop-shadow(2px 7px 7px rgba(0,0,0,.45))}
/* météo de nuit : lune derrière les nuages, étoiles discrètes par ciel dégagé (statiques) */
.wrap.night .meteo .hero{z-index:1}
.v4moon{position:absolute;right:calc(var(--hs) * .6);top:6px;width:calc(var(--hs) * .52);height:calc(var(--hs) * .52);z-index:0;pointer-events:none;filter:drop-shadow(0 0 10px rgba(225,230,255,.65))}
.v4stars i{position:absolute;width:8px;height:8px;background:#FFF5D6;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:.9;filter:drop-shadow(0 0 3px rgba(255,240,190,.9))}
.v4stars i:nth-child(1){left:-10px;top:12px}
.v4stars i:nth-child(2){left:2px;top:62px;width:5px;height:5px;opacity:.75}
.v4stars i:nth-child(3){right:-4px;top:80px;width:6px;height:6px;opacity:.8}
`;
const P2V4_BAT = (p) => {
  const c = p >= 50 ? "#6EE787" : p >= 20 ? "#FFC44D" : "#FF6B6B";
  const w = Math.max(1.5, 14.5 * Math.max(0, Math.min(100, p)) / 100);
  return `<svg viewBox="0 0 23 12" width="21" height="11"><rect x=".75" y=".75" width="18.5" height="10.5" rx="2.6" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.5"/><rect x="20" y="3.6" width="2.2" height="4.8" rx="1" fill="#fff" fill-opacity=".85"/><rect x="2.5" y="2.5" width="${w.toFixed(1)}" height="7" rx="1.3" fill="${c}"/></svg><span style="color:${p < 20 ? "#FF9A9A" : "#fff"}">${p} %</span>`;
};
/* illustrations de nuit (option `night_sprite`) : planche 5×5, 1re rangée : lune · nuage de nuit · pluie de nuit · maison éclairée.
   Sans planche, la météo de nuit est composée avec les illustrations de jour. */
const P2N_KEYS = ["lune", "nuage", "pluie", "maison"];
let P2N = {}, P2N_URL = null;
const p2nSeg = (arr, gapMin, minLen) => { const segs = []; let cur = null, gap = 0;
  for (let i = 0; i <= arr.length; i++) { const on = i < arr.length && arr[i] > 2;
    if (on) { if (!cur) cur = { a: i, b: i }; cur.b = i; gap = 0; } else if (cur) { gap++; if (gap >= gapMin || i === arr.length) { segs.push(cur); cur = null; gap = 0; } } }
  return segs.filter((s) => s.b - s.a >= minLen); };
function p2nCut(src, sx, sy, sw, sh) {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const side = Math.max(sw, sh) * 1.06;
  c.getContext("2d").drawImage(src, sx + sw / 2 - side / 2, sy + sh / 2 - side / 2, side, side, 0, 0, S, S);
  return c.toDataURL("image/webp", 0.9);
}
async function p2nLoad(url) {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = Math.ceil(H / 5);
  const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height).data, alpha = (x, y) => d[(y * cv.width + x) * 4 + 3] > 40;
  const out = {}, cs = W / 5;
  for (let i = 0; i < 4; i++) {
    const bx = { a: Math.floor(i * cs) + 3, b: Math.floor((i + 1) * cs) - 4 };
    const row = new Array(cv.height).fill(0), colIn = new Array(bx.b - bx.a + 1).fill(0);
    for (let y = 0; y < cv.height; y++) for (let x = bx.a; x <= bx.b; x++) if (alpha(x, y)) { row[y]++; colIn[x - bx.a]++; }
    const sy = p2nSeg(row, 3, 14), sx = p2nSeg(colIn, 3, 14);
    if (!sy.length || !sx.length) continue;
    const y0 = Math.min(...sy.map((s) => s.a)), y1 = Math.max(...sy.map((s) => s.b));
    const x0 = bx.a + Math.min(...sx.map((s) => s.a)), x1 = bx.a + Math.max(...sx.map((s) => s.b));
    out[P2N_KEYS[i]] = p2nCut(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }
  return out;
}
function p2nInit(url) {
  if (!url || P2N_URL === url) return null;
  P2N_URL = url;
  return p2nLoad(url).then((o) => { P2N = o; }).catch((e) => { console.warn("pixar-board night_sprite", e); P2N = {}; });
}
/* avatars et photo de famille du soir : options `night_image` (par personne) et `photo_night` (famille).
   Redimensionnés une fois dans le navigateur ; un avatar sans fond transparent est ignoré. */
const P2NA = {};
async function p2naLoad(url, max, needAlpha) {
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext("2d", { willReadFrequently: needAlpha }); x.drawImage(img, 0, 0, c.width, c.height);
  if (needAlpha) { const a = x.getImageData(0, 0, 4, 4).data[3], b = x.getImageData(c.width - 4, 0, 4, 4).data[3]; if (a > 200 && b > 200) return null; }
  return c.toDataURL(needAlpha ? "image/webp" : "image/jpeg", 0.88);
}
let P2NA_KEY = null;
async function p2naInit(fam) {
  const key = JSON.stringify([(fam.people || []).map((p) => p.night_image || ""), fam.photo_night || ""]);
  if (P2NA_KEY === key) return false;
  P2NA_KEY = key;
  for (const p of fam.people || []) if (p.night_image) { try { const d = await p2naLoad(p.night_image, 420, true); if (d) P2NA[p.name] = d; } catch (e) {} }
  if (fam.photo_night) { try { P2NA.__photo = await p2naLoad(fam.photo_night, 900, false); } catch (e) {} }
  return true;
}
/* ===================== thèmes saisonniers =====================
   Tout est centralisé ici : calendrier, palettes jour/nuit, décors SVG par carte.
   Ajouter un thème = ajouter une entrée dans P2T.themes (+ une période dans P2T.calendar).
   Le thème est indépendant du jour/nuit (sun.sun) : classes .wrap[data-th=…] et .wrap.night. */
const P2T = {
  storageKey: "pixar-board.theme",
  /* périodes du mode Auto, au format MM-JJ, bornes incluses ; une période peut traverser le 1er janvier */
  calendar: [
    { theme: "halloween", from: "10-15", to: "11-01" },
    { theme: "noel", from: "12-01", to: "01-06" }
  ],
  themes: {}
};
const p2tSvg = (s) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const P2T_ART = {
  pumpkin: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 76"><defs><radialGradient id="w" cx=".5" cy=".58" r=".5"><stop offset="0" stop-color="#FFB85C" stop-opacity=".55"/><stop offset=".6" stop-color="#FF9A3C" stop-opacity=".18"/><stop offset="1" stop-color="#FF9A3C" stop-opacity="0"/></radialGradient><radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#140826" stop-opacity=".55"/><stop offset="1" stop-color="#140826" stop-opacity="0"/></radialGradient><radialGradient id="l" cx=".36" cy=".28" r=".8"><stop offset="0" stop-color="#FFD08A"/><stop offset=".35" stop-color="#FFA142"/><stop offset=".75" stop-color="#E06A1E"/><stop offset="1" stop-color="#A9420F"/></radialGradient><radialGradient id="s" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#F9A24A"/><stop offset=".55" stop-color="#D9621C"/><stop offset="1" stop-color="#8A320C"/></radialGradient><linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7FB04A"/><stop offset="1" stop-color="#3D6B26"/></linearGradient><radialGradient id="f" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".6" stop-color="#FFC94D"/><stop offset="1" stop-color="#F08A1E"/></radialGradient></defs><ellipse cx="40" cy="44" rx="40" ry="32" fill="url(#w)"/><ellipse cx="40" cy="70" rx="27" ry="5.5" fill="url(#sh)"/><ellipse cx="22" cy="46" rx="15" ry="20" fill="url(#s)"/><ellipse cx="58" cy="46" rx="15" ry="20" fill="url(#s)"/><ellipse cx="30" cy="46" rx="15" ry="22" fill="url(#l)"/><ellipse cx="50" cy="46" rx="15" ry="22" fill="url(#l)"/><ellipse cx="40" cy="46" rx="14" ry="23" fill="url(#l)"/><path d="M30 26 q-5 20 0 40 M50 26 q5 20 0 40" stroke="#B4501A" stroke-opacity=".45" stroke-width="1.4" fill="none"/><path d="M39 25 q-1 -9 7 -14 q3 -2 4 1 q-6 4 -6 13z" fill="url(#st)"/><path d="M41.5 16 q2 -3 4 -4" stroke="#C6E08A" stroke-opacity=".7" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M27 41 q4 -7 8 0 q-4 2.5 -8 0z M45 41 q4 -7 8 0 q-4 2.5 -8 0z" fill="url(#f)" stroke="#6A2A08" stroke-width="1"/><path d="M28 50 q12 11 24 0 q-2 6 -6 7.5 l-2 -3 l-2 3.5 l-4 0 l-2 -3.5 l-2 3 q-4 -1.5 -6 -7.5z" fill="url(#f)" stroke="#6A2A08" stroke-width="1"/><ellipse cx="34" cy="32" rx="5" ry="3" fill="#FFF1D2" opacity=".55" transform="rotate(-25 34 32)"/><ellipse cx="22" cy="38" rx="2.5" ry="4" fill="#FFE2B0" opacity=".3"/></svg>`),
  bat: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 26"><path d="M32 9 c-2 -5 -5 -6 -7 -2 c-5 -7 -14 -7 -25 3 c9 -1 13 4 15 11 c3 -4 7 -4 10 0 l4 -5 l3 3 l3 -3 l4 5 c3 -4 7 -4 10 0 c2 -7 6 -12 15 -11 c-11 -10 -20 -10 -25 -3 c-2 -4 -5 -3 -7 2z" fill="#25153F"/><circle cx="29.5" cy="11" r="1.2" fill="#FFD27A"/><circle cx="34.5" cy="11" r="1.2" fill="#FFD27A"/></svg>`),
  webTL: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.1"><path d="M0 0 L100 8 M0 0 L82 46 M0 0 L46 82 M0 0 L8 100"/><path d="M30 2.4 Q26 14 24.6 13.8 Q20 20 13.8 24.6 Q14 26 2.4 30"/><path d="M58 4.6 Q50 26 48 27 Q40 40 27 48 Q26 50 4.6 58"/><path d="M84 6.8 Q74 38 70 40 Q58 58 40 70 Q38 74 6.8 84"/></svg>`),
  webTR: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.1"><g transform="translate(100 0) scale(-1 1)"><path d="M0 0 L100 8 M0 0 L82 46 M0 0 L46 82 M0 0 L8 100"/><path d="M30 2.4 Q26 14 24.6 13.8 Q20 20 13.8 24.6 Q14 26 2.4 30"/><path d="M58 4.6 Q50 26 48 27 Q40 40 27 48 Q26 50 4.6 58"/><path d="M84 6.8 Q74 38 70 40 Q58 58 40 70 Q38 74 6.8 84"/></g></svg>`),
  garland: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 26"><defs><radialGradient id="g"><stop offset="0" stop-color="#FFF6D0" stop-opacity=".9"/><stop offset="1" stop-color="#FFF6D0" stop-opacity="0"/></radialGradient></defs><path d="M0 3 Q30 15 60 3 Q90 15 120 3" stroke="#2F5A3A" stroke-width="1.6" fill="none"/><circle cx="18" cy="12" r="8" fill="url(#g)"/><ellipse cx="18" cy="13" rx="3.2" ry="4.2" fill="#FFD15C"/><circle cx="42" cy="12" r="8" fill="url(#g)"/><ellipse cx="42" cy="13" rx="3.2" ry="4.2" fill="#7DE3A8"/><circle cx="78" cy="12" r="8" fill="url(#g)"/><ellipse cx="78" cy="13" rx="3.2" ry="4.2" fill="#9CCBFF"/><circle cx="102" cy="12" r="8" fill="url(#g)"/><ellipse cx="102" cy="13" rx="3.2" ry="4.2" fill="#FFF1B8"/></svg>`),
  snowcap: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 14"><path d="M0 0 H60 V5 q-4 6 -9 3 q-5 7 -11 2 q-6 6 -12 1 q-5 6 -11 1 q-5 5 -11 -1 q-3 3 -6 1z" fill="#F4F8FF"/><path d="M0 5 q3 3 6 1 q6 6 11 1 q6 5 11 -1 q6 5 12 -1 q6 5 11 -2 q5 3 9 -3" stroke="#BFD4F5" stroke-width="1" fill="none"/></svg>`),
  sapin: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56"><rect x="17" y="46" width="6" height="8" fill="#6B4426"/><path d="M20 6 L34 26 H26 L37 40 H27 L38 50 H2 L13 40 H3 L14 26 H6Z" fill="#2E8A5C"/><path d="M20 6 L34 26 H26 L37 40 H27 L38 50 H20Z" fill="#23704A"/><path d="M8 26 q4 -3 8 0 M24 26 q4 -3 8 0 M5 40 q5 -3 10 0 M25 40 q5 -3 10 0" stroke="#F4F8FF" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M20 0 l2 4 l4.5 .6 l-3.3 3 l.8 4.4 l-4 -2.2 l-4 2.2 l.8 -4.4 l-3.3 -3 l4.5 -.6z" fill="#FFD15C"/><circle cx="14" cy="34" r="2" fill="#FFD15C"/><circle cx="26" cy="44" r="2" fill="#9CCBFF"/><circle cx="23" cy="22" r="1.8" fill="#FFF1B8"/></svg>`),
  gift: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 38"><rect x="3" y="12" width="34" height="24" rx="3" fill="#3C7BD0"/><rect x="1" y="8" width="38" height="8" rx="2" fill="#5A93E0"/><rect x="17" y="8" width="6" height="28" fill="#FFD15C"/><path d="M20 8 q-10 -10 -12 -2 q2 4 12 2 q10 2 12 -2 q-2 -8 -12 2z" fill="#FFC23A"/></svg>`),
  giftG: p2tSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 38"><rect x="3" y="12" width="34" height="24" rx="3" fill="#2E8A5C"/><rect x="1" y="8" width="38" height="8" rx="2" fill="#3FA06E"/><rect x="17" y="8" width="6" height="28" fill="#FFD15C"/><path d="M20 8 q-10 -10 -12 -2 q2 4 12 2 q10 2 12 -2 q-2 -8 -12 2z" fill="#FFC23A"/></svg>`)
};
const p2tL = (art, pos, size) => `${P2T_ART[art]} ${pos}/${size} no-repeat`;
P2T.themes.halloween = {
  label: "Halloween", emoji: "🎃",
  page: { day: "radial-gradient(60% 50% at 15% 0%,rgba(190,120,255,.35),transparent 70%),linear-gradient(180deg,#3A2470,#24154C)", night: "radial-gradient(60% 50% at 15% 0%,rgba(170,90,230,.28),transparent 70%),radial-gradient(50% 40% at 92% 100%,rgba(255,150,60,.12),transparent 70%),linear-gradient(180deg,#1E1240,#120A2C)" },
  border: "rgba(255,190,120,.22)",
  glowNight: "rgba(190,140,255,.30)",
  cards: {
    fam:     { day: ["#6A4BB0", "#3E2A78"], night: ["#3E2774", "#24164E", "#120A2E"] },
    meteo:   { day: ["#7552BE", "#40307E"], night: ["#3A2672", "#22164C", "#130B30"] },
    secu:    { day: ["#6B3F9E", "#3D2266"], night: ["#4A2A86", "#2C1858", "#170C33"] },
    climat:  { day: ["#5B4FB8", "#33296F"], night: ["#3E3290", "#251C62", "#130E38"] },
    energie: { day: ["#8A4A8E", "#4E2350"], night: ["#64306E", "#3E1A4C", "#20102C"] },
    frigos:  { day: ["#4F5DB0", "#2C346E"], night: ["#2F3A8E", "#1E255E", "#101436"] },
    famille: { day: ["#8E4A86", "#4F2350"], night: ["#6A3270", "#401C4C", "#22102C"] },
    salon:   { day: ["#5E3FA6", "#331F66"], night: ["#43288A", "#28175C", "#140B34"] }
  },
  deco: {
    fam:     [p2tL("webTL", "left top", "84px 84px"), p2tL("bat", "47.5% 2px", "30px auto"), p2tL("bat", "71.5% 4px", "24px auto")],
    meteo:   [p2tL("bat", "57% 12%", "40px auto"), p2tL("bat", "68% 30%", "26px auto"), p2tL("pumpkin", "right 4px bottom 2px", "54px auto"), p2tL("pumpkin", "right 52px bottom 0px", "38px auto")],
    secu:    [p2tL("webTR", "right top", "96px 96px")],
    climat:  [p2tL("webTR", "right top", "64px 64px")],
    energie: [p2tL("pumpkin", "59% 4%", "42px auto")],
    famille: [p2tL("webTR", "right top", "96px 96px"), p2tL("bat", "58% 8%", "34px auto")],
    salon:   [p2tL("webTR", "right top", "64px 64px")]
  }
};
P2T.themes.noel = {
  label: "Noël", emoji: "🎄",
  page: { day: "radial-gradient(60% 50% at 15% 0%,rgba(200,230,255,.35),transparent 70%),linear-gradient(180deg,#2C4F86,#1A3260)", night: "radial-gradient(60% 50% at 15% 0%,rgba(150,190,255,.22),transparent 70%),radial-gradient(50% 40% at 92% 100%,rgba(255,210,120,.12),transparent 70%),linear-gradient(180deg,#13224E,#0B1532)" },
  border: "rgba(255,215,130,.32)",
  glowNight: "rgba(255,212,130,.30)", houseGlow: "rgba(255,206,120,.75)",
  cards: {
    fam:     { day: ["#4F7FC4", "#2A4E8C"], night: ["#2A4686", "#192D5C", "#0D1838"] },
    meteo:   { day: ["#5C8FD0", "#2F5A98"], night: ["#24407E", "#172A58", "#0C1636"] },
    secu:    { day: ["#2F7D5E", "#1B4E3B"], night: ["#215C48", "#153C30", "#0A2219"] },
    climat:  { day: ["#4C78B8", "#2A4A80"], night: ["#28457E", "#1A2D58", "#0D1736"] },
    energie: { day: ["#3A7A62", "#1F4A3A"], night: ["#245A48", "#163A2F", "#0B2019"] },
    frigos:  { day: ["#4F86C6", "#2B5590"], night: ["#294C8A", "#1A3060", "#0E1A3A"] },
    famille: { day: ["#2F7A5A", "#1A4A37"], night: ["#215A44", "#153A2D", "#0A2018"] },
    salon:   { day: ["#4A6FB8", "#283F7E"], night: ["#2A417E", "#1A2A58", "#0D1636"] }
  },
  deco: {
    fam:     [`${P2T_ART.garland} left top/120px 26px repeat-x`],
    meteo:   [`${P2T_ART.garland} left top/120px 26px repeat-x`, p2tL("sapin", "right 12px bottom 6px", "34px auto"), p2tL("sapin", "right 50px bottom 4px", "24px auto"), p2tL("gift", "right 82px bottom 4px", "22px auto")],
    secu:    [`${P2T_ART.snowcap} left -2px/60px 11px repeat-x`],
    energie: [`${P2T_ART.snowcap} left -2px/60px 11px repeat-x`, p2tL("gift", "62% 16%", "26px auto")],
    famille: [`${P2T_ART.snowcap} left -2px/60px 11px repeat-x`, p2tL("sapin", "64% 14%", "30px auto"), p2tL("giftG", "58% 28%", "20px auto")],
    salon:   [`${P2T_ART.snowcap} left -2px/60px 11px repeat-x`]
  }
};
/* génération de la feuille de style des thèmes à partir de la configuration */
function p2tCss() {
  let css = `.wrap[data-th] .card{isolation:isolate}
.card>.v4deco{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;display:none}
.wrap[data-th] .card>.v4deco{display:block}
.v4thm{position:fixed;z-index:80;min-width:210px;padding:10px;border-radius:18px;background:rgba(16,14,48,.94);border:1px solid rgba(220,210,255,.28);box-shadow:0 18px 40px rgba(0,0,0,.55);font-family:Nunito,system-ui,sans-serif;color:#fff}
.v4thm b{display:block;font-size:13px;font-weight:900;opacity:.8;margin:2px 6px 8px}
.v4thm button{display:flex;width:100%;align-items:center;gap:10px;margin:0 0 6px;padding:10px 12px;border:0;border-radius:12px;font:900 16px Nunito,system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.08);text-align:left}
.v4thm button.on{background:rgba(160,150,255,.32);box-shadow:inset 0 0 0 1.5px rgba(210,200,255,.7)}
.v4thm button small{margin-left:auto;font-size:12px;font-weight:800;opacity:.75}
`;
  for (const [id, t] of Object.entries(P2T.themes)) {
    const W = `.wrap[data-th=${id}]`, N = `.wrap.night[data-th=${id}]`;
    css += `${W}{background:${t.page.day}}${N}{background:${t.page.night}}\n${W} .card{border-color:${t.border}}\n`;
    for (const [k, c] of Object.entries(t.cards)) {
      css += `${W} .card[data-k=${k}]{--a:${c.day[0]}!important;--b:${c.day[1]}!important}\n`;
      css += `${N} .card[data-k=${k}]{background:radial-gradient(38% 50% at 86% 28%,${t.glowNight},rgba(0,0,0,0) 70%),radial-gradient(40% 36% at 3% 3%,rgba(215,195,255,.18),rgba(0,0,0,0) 70%),radial-gradient(120% 115% at 40% 32%,${c.night[0]} 0%,${c.night[1]} 52%,${c.night[2]} 100%)}\n`;
    }
    if (t.houseGlow) css += `${W} .card[data-k=secu] .hero-wrap::before,${W} .card[data-k=energie] .hero-wrap::before{background:radial-gradient(closest-side,${t.houseGlow},rgba(0,0,0,0))!important}\n${W} .card[data-k=secu] .hero,${W} .card[data-k=energie] .hero{filter:drop-shadow(0 0 12px ${t.houseGlow}) var(--sh)!important}\n`;
    for (const [k, layers] of Object.entries(t.deco)) css += `${W} .card[data-k=${k}]>.v4deco{background:${layers.join(",")}}\n`;
  }
  return css;
}
/* date locale de Home Assistant (fuseau de hass.config) → "MM-JJ" */
function p2tMonthDay(tz, d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz || undefined, month: "2-digit", day: "2-digit" }).formatToParts(d);
    return `${parts.find((p) => p.type === "month").value}-${parts.find((p) => p.type === "day").value}`;
  } catch (e) { return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
}
function p2tAuto(md) {
  for (const p of P2T.calendar) {
    const inside = p.from <= p.to ? md >= p.from && md <= p.to : md >= p.from || md <= p.to;
    if (inside && P2T.themes[p.theme]) return p.theme;
  }
  return "normal";
}
let P2T_CHOICE = "auto";
try { P2T_CHOICE = localStorage.getItem(P2T.storageKey) || "auto"; } catch (e) {}
function p2tSetChoice(v) { P2T_CHOICE = v; try { localStorage.setItem(P2T.storageKey, v); } catch (e) {} }

const P2T_CSS = p2tCss();
customElements.whenDefined("pixar-board").then(() => {
  const P = customElements.get("pixar-board").prototype;
  if (P._v4Patched) return;
  P._v4Patched = true;
  const orig = P._render;
  P._render = function (force) {
    orig.call(this, force);
    if (!this._root || !this._hass || !this._icons) return;
    cancelAnimationFrame(this._v4raf);
    this._v4raf = requestAnimationFrame(() => this._v4pass());
  };
  P._v4pass = function () {
    const r = this._root, h = this._hass;
    if (!r || !h) return;
    const E = this._E, fam = this._c.famille || {};
    const nP = p2nInit(this._c.night_sprite); if (nP) nP.then(() => this._v4pass());
    p2naInit(fam).then((started) => { if (started) this._v4pass(); });
    let st = r.getElementById("p2v4");
    if (!st) { st = document.createElement("style"); st.id = "p2v4"; st.textContent = P2V4_CSS + P2T_CSS; }
    if (r.lastElementChild !== st) r.appendChild(st);

    /* illustrations : un peu plus petites pour laisser la place au texte */
    const caps = { secu: 100, frigos: 92, salon: 104 };
    for (const k in caps) {
      const c = r.querySelector(`.card[data-k=${k}]`), b = c && c.querySelector(".body,.fridges");
      if (!b) continue;
      const hs = Math.round(Math.max(86, Math.min(caps[k], b.offsetTop - 12))) + "px";
      if (c.style.getPropertyValue("--hs") !== hs) c.style.setProperty("--hs", hs);
    }

    /* 1. Frigos : « Depuis 28 min », rouge si l'alerte dure (≥ 30 min) */
    const fc = r.querySelector(".card[data-k=frigos]");
    if (fc) {
      const red = [];
      fc.querySelectorAll(".fr").forEach((fr) => {
        const sp = fr.querySelector(".since");
        let min = 0;
        if (sp) {
          const m = sp.textContent.match(/(\d+)\s*min/) || [];
          if (m[1]) { min = parseInt(m[1]); sp.dataset.min = min; } else min = parseInt(sp.dataset.min) || 0;
          const txt = min >= 60 ? `Depuis ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `Depuis ${min} min`;
          if (sp.textContent !== txt) sp.textContent = txt;
        }
        const persist = fr.classList.contains("bad") || ((fr.classList.contains("warn") || fr.classList.contains("watch")) && min >= 30);
        fr.classList.toggle("v4red", persist && !fr.classList.contains("bad"));
        if (persist) red.push(fr.querySelector(".l").textContent);
      });
      fc.querySelectorAll(".fr .v").forEach((v) => { const t = v.textContent; if (/\d°$/.test(t)) v.textContent = t.slice(0, -1) + " °C"; });
      fc.classList.toggle("v4alert", red.length > 0);
      const s = fc.querySelector(".hd .st");
      if (s && red.length) {
        const txt = "Alerte : " + red.join(", ");
        if (s.textContent !== txt) s.textContent = txt;
        if (!s.classList.contains("bad")) { s.classList.remove("warn", "good"); s.classList.add("bad"); }
      }
    }

    /* Climat : °C */
    const cc = r.querySelector(".card[data-k=climat]");
    if (cc) {
      const u = cc.querySelector(".big .kv .u");
      const nbC = String.fromCharCode(160) + "°C";
      if (u && u.textContent !== nbC) u.textContent = nbC;
      const air = cc.querySelector(".s[data-act=air] .l");
      if (air && air.textContent !== "CO₂ ·") air.textContent = "CO₂ ·";
      cc.querySelectorAll(".s .v").forEach((v) => { const t = v.textContent; if (/\d°$/.test(t)) v.textContent = t.slice(0, -1) + " °C"; });
    }
    /* pastille CO₂ dans le titre */
    const ct = r.querySelector(".card[data-k=climat] .hd .t");
    if (ct) {
      const co2 = parseFloat((h.states[E.co2] || {}).state);
      const cls = isNaN(co2) ? "" : co2 < 800 ? "good" : co2 < 1200 ? "warn" : "bad";
      const txt = isNaN(co2) ? "CO₂ · –" : `CO₂ · ${Math.round(co2)} ppm`;
      let p = ct.querySelector(".co2p");
      if (!p) { p = document.createElement("span"); p.dataset.act = "air"; p.dataset.ent = E.co2; ct.appendChild(p); }
      if (p.className !== ("co2p " + cls).trim()) p.className = ("co2p " + cls).trim();
      if (p.textContent !== txt) p.textContent = txt;
    }
    /* 3. Climat : repère de confort sous l'humidité */
    const hk = r.querySelectorAll(".card[data-k=climat] .big .kv")[1];
    const hum = parseFloat((h.states[E.indoor_humidity] || {}).state);
    if (hk && !isNaN(hum)) {
      const [cls, lbl] = hum < 40 ? ["dry", "Air sec"] : hum > 60 ? ["wet", "Air humide"] : ["ok", "Confortable"];
      let pill = hk.querySelector(".hum-c");
      if (!pill) { pill = document.createElement("span"); hk.appendChild(pill); }
      if (pill.className !== "hum-c " + cls) pill.className = "hum-c " + cls;
      if (pill.textContent !== lbl) pill.textContent = lbl;
    }

    /* 4. Météo : « Dehors » et « Maxi prévue » */
    const wid = E.weather;
    if (!this._v4sub && h.connection) {
      this._v4sub = true;
      h.connection.subscribeMessage((m) => { this._v4fc = (m && m.forecast) || []; this._v4pass(); },
        { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: wid })
        .then((u) => { this._v4unsub = u; }).catch((e) => console.warn("p2v4 forecast", e));
    }
    const ext = r.querySelector(".card[data-k=meteo] .ext");
    if (ext) {
      const sm = ext.querySelector("small"), fcEl = ext.querySelector(".fc");
      if (sm && sm.textContent !== "Dehors") sm.textContent = "Dehors";
      const bb = ext.querySelector("b");
      if (bb && /\d°$/.test(bb.textContent)) bb.innerHTML = bb.textContent.slice(0, -1) + '<span class="u2">&nbsp;°C</span>';
      if (fcEl) {
        const fcs = this._v4fc || [], today = new Date().toDateString();
        const td = fcs.find((x) => new Date(x.datetime).toDateString() === today);
        const f = td || fcs[0];
        let txt;
        if (f && f.temperature !== undefined) txt = `${td ? "Maxi prévue" : "Maxi demain"} · ${Math.round(f.temperature)} °C`;
        else { const w = h.states[wid]; txt = `Prévision · ${w ? Math.round(w.attributes.temperature) : "–"} °C`; }
        if (fcEl.textContent !== txt) fcEl.textContent = txt;
      }
    }

    /* nuit — même mécanisme que l'existant (sun.sun sous l'horizon) */
    const wrapEl = r.querySelector(".wrap");
    const isNight = (h.states["sun.sun"] || {}).state === "below_horizon";
    if (wrapEl) wrapEl.classList.toggle("night", isNight);
    const swapN = (img, key, on) => {
      if (!img) return;
      const url = P2N[key];
      if (on && url) { if (img.src !== url) { if (!img.dataset.v4b) img.dataset.v4b = img.src; img.src = url; img.dataset.v4n = "1"; } }
      else if (img.dataset.v4n) { delete img.dataset.v4n; img.src = (!img.dataset.v && img.dataset.base) ? img.dataset.base : img.dataset.v4b; delete img.dataset.v4b; }
    };
    const mwrap = r.querySelector(".card[data-k=meteo] .hero-wrap");
    if (mwrap) {
      const cond = (h.states[wid] || {}).state || "";
      const rain = ["rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy-rainy", "snowy"].includes(cond);
      const clear = ["sunny", "clear-night", "partlycloudy"].includes(cond);
      const mode = !isNight ? "" : rain ? "rain" : clear ? "clear" : "cloud";
      const hero = mwrap.querySelector(".hero");
      const own = { clear: "lune", cloud: "nuage", rain: "pluie" }[mode];
      swapN(hero, own || "lune", !!own && !!P2N[own]);
      const composite = (mode === "cloud" || mode === "rain") && !P2N[own];
      const mcard = mwrap.closest(".card");
      const sky = !isNight ? "" : ["snowy", "snowy-rainy"].includes(cond) ? "snow" : cond === "fog" ? "fog" : rain ? "rain" : clear ? "clear" : "cloud";
      if (mcard) for (const k of ["clear", "rain", "cloud", "fog", "snow"]) mcard.classList.toggle("v4" + k, sky === k);
      if (mwrap.dataset.v4mode !== mode + composite) {
        mwrap.querySelectorAll(".v4moon,.v4stars").forEach((e) => e.remove());
        if (composite) mwrap.insertAdjacentHTML("afterbegin", `<img class="v4moon" src="${P2N.lune || this._i("lune")}">`);
        if (mode === "clear") mwrap.insertAdjacentHTML("beforeend", '<span class="v4stars"><i></i><i></i><i></i></span>');
        mwrap.dataset.v4mode = mode + composite;
      }
    }
    swapN(r.querySelector(".card[data-k=secu] .hero"), "maison", isNight && !!P2N.maison);
    /* la maison de la vignette « Conso maison » suit l'illustration de nuit de la carte Maison */
    const secuHero = r.querySelector(".card[data-k=secu] .hero");
    /* la grande illustration de la carte Énergie reprend la même maison de nuit que la carte Maison
       (planche de nuit ou planche de variantes) ; la maison solaire revient le jour */
    const enHero = r.querySelector(".card[data-k=energie] .hero");
    const secuNight = isNight && secuHero && (secuHero.dataset.v === "maison_nuit" || secuHero.dataset.v4n) ? secuHero.src : null;
    if (enHero) {
      if (secuNight) { if (enHero.src !== secuNight) { if (!enHero.dataset.v4d) enHero.dataset.v4d = enHero.src; enHero.src = secuNight; } }
      else if (enHero.dataset.v4d) { enHero.src = enHero.dataset.v4d; delete enHero.dataset.v4d; }
    }
    r.querySelectorAll(".card[data-k=energie] .s").forEach((sEl) => {
      const l = sEl.querySelector(".l"), img = sEl.querySelector("img");
      if (!l || !img || l.textContent !== "Conso maison") return;
      img.classList.toggle("v4house", isNight);
      const nightHouse = isNight && secuHero && (secuHero.dataset.v === "maison_nuit" || secuHero.dataset.v4n) ? secuHero.src : null;
      if (nightHouse) { if (img.src !== nightHouse) { if (!img.dataset.v4d) img.dataset.v4d = img.src; img.src = nightHouse; } }
      else if (img.dataset.v4d) { img.src = img.dataset.v4d; delete img.dataset.v4d; }
    });
    /* avatars en pyjama et photo de famille du soir */
    r.querySelectorAll(".card.fam .p").forEach((pEl) => {
      const img = pEl.querySelector(".av img"), n = (pEl.querySelector(".n") || {}).textContent;
      if (!img || !n) return;
      const nightSrc = P2NA[n];
      if (isNight && nightSrc) { if (img.src !== nightSrc) { if (!img.dataset.v4d) img.dataset.v4d = img.src; img.src = nightSrc; } }
      else if (img.dataset.v4d) { img.src = img.dataset.v4d; delete img.dataset.v4d; }
    });
    const ph = r.querySelector(".card.fam .ph");
    if (ph) {
      if (isNight && P2NA.__photo) { if (!ph.dataset.v4d) { ph.dataset.v4d = ph.style.backgroundImage; ph.style.backgroundImage = `url('${P2NA.__photo}')`; } }
      else if (ph.dataset.v4d) { ph.style.backgroundImage = ph.dataset.v4d; delete ph.dataset.v4d; }
    }
    if (!this._v4naT && P2NA_KEY && Object.keys(P2NA).length < (fam.people || []).filter((p) => p.night_image).length + (fam.photo_night ? 1 : 0) && (this._v4naN = (this._v4naN || 0) + 1) <= 8) this._v4naT = setTimeout(() => { this._v4naT = null; this._v4pass(); }, 4000);
    /* libellé du ciel adapté à la nuit */
    const mst = r.querySelector(".card[data-k=meteo] .hd .st");
    if (mst) {
      const cond = (h.states[wid] || {}).state || "";
      const nightLbl = { sunny: "Ciel dégagé", "clear-night": "Ciel dégagé", partlycloudy: "Quelques nuages" }[cond];
      if (isNight && nightLbl && mst.textContent !== nightLbl) mst.textContent = nightLbl;
    }
    /* énergie — « Conso maison » recalculée en temps réel : compteur (W) + production solaire (kW) */
    const ec = r.querySelector(".card[data-k=energie]");
    if (ec) {
      const pwN = parseFloat((h.states[E.grid_power] || {}).state);
      const prN = parseFloat((h.states[E.solar_power] || {}).state);
      ec.querySelectorAll(".s").forEach((sEl) => {
        const l = sEl.querySelector(".l"), v = sEl.querySelector(".v");
        if (!l || !v || l.textContent !== "Conso maison") return;
        if (isNaN(pwN)) return;
        const kw = Math.max(0, pwN / 1000 + (isNaN(prN) ? 0 : prN));
        const txt = kw.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kW";
        if (v.textContent !== txt) v.textContent = txt;
      });
    }

    /* Météo : grande horloge, la date reste au-dessus en petit */
    const mt = r.querySelector(".card[data-k=meteo] .hd .t");
    const now = new Date(), hhmm = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (mt) {
      let clk = mt.parentNode.querySelector(".clk");
      if (!clk) { clk = document.createElement("div"); clk.className = "clk"; mt.after(clk); }
      if (clk.textContent !== hhmm) clk.textContent = hhmm;
    }
    if (!this._v4clk) this._v4clk = setInterval(() => this._v4pass(), 15000);

    /* thème saisonnier — recalculé à chaque passage (donc toutes les 15 s), indépendant du jour/nuit */
    const tz = (h.config && h.config.time_zone) || undefined;
    const autoTh = p2tAuto(p2tMonthDay(tz));
    const th = P2T_CHOICE === "auto" ? autoTh : (P2T.themes[P2T_CHOICE] ? P2T_CHOICE : "normal");
    if (wrapEl) {
      if (th === "normal") { if (wrapEl.hasAttribute("data-th")) wrapEl.removeAttribute("data-th"); }
      else if (wrapEl.dataset.th !== th) wrapEl.dataset.th = th;
      if (th !== "normal") wrapEl.querySelectorAll(".card").forEach((c) => { if (!c.querySelector(":scope>.v4deco")) c.insertAdjacentHTML("afterbegin", '<i class="v4deco" aria-hidden="true"></i>'); });
    }
    this._v4th = { th, autoTh };
    if (!this._v4thBound) {
      this._v4thBound = true;
      const host = this, dateEl = (e) => e.composedPath().find((n) => n.matches && n.matches(".card[data-k=meteo] .hd .t"));
      let lp = null, swallow = 0;
      const closeMenu = () => { const m = r.querySelector(".v4thm"); if (m) m.remove(); };
      const openMenu = (anchor) => {
        closeMenu();
        const cur = this._v4th || {}, auto = P2T.themes[cur.autoTh];
        const opts = [["auto", "✨", "Auto", auto ? auto.label : "Normal"], ["normal", "🏠", "Normal", ""]].concat(Object.entries(P2T.themes).map(([id, t]) => [id, t.emoji, t.label, ""]));
        const m = document.createElement("div");
        m.className = "v4thm";
        m.innerHTML = "<b>Thème du tableau</b>" + opts.map(([id, em, lb, sm]) => `<button data-th="${id}" class="${P2T_CHOICE === id ? "on" : ""}"><span>${em}</span>${lb}${sm ? `<small>${sm}</small>` : ""}</button>`).join("");
        const a = anchor.getBoundingClientRect();
        m.style.left = Math.round(a.left) + "px"; m.style.top = Math.round(a.bottom + 6) + "px";
        r.appendChild(m);
      };
      host.addEventListener("pointerdown", (e) => {
        const m = r.querySelector(".v4thm");
        if (m) {
          const btn = e.composedPath().find((n) => n.dataset && n.dataset.th && n.tagName === "BUTTON");
          if (btn) { p2tSetChoice(btn.dataset.th); }
          closeMenu(); swallow = Date.now() + 700; e.preventDefault(); e.stopPropagation();
          if (btn) this._v4pass();
          return;
        }
        const d = dateEl(e);
        if (!d) return;
        clearTimeout(lp);
        lp = setTimeout(() => { lp = null; swallow = Date.now() + 1500; openMenu(d); }, 650);
      }, true);
      const cancel = () => { clearTimeout(lp); lp = null; };
      host.addEventListener("pointerup", cancel, true);
      host.addEventListener("pointercancel", cancel, true);
      host.addEventListener("pointermove", (e) => { if (lp && (Math.abs(e.movementX) + Math.abs(e.movementY) > 12)) cancel(); }, true);
      host.addEventListener("click", (e) => { if (Date.now() < swallow) { swallow = 0; e.preventDefault(); e.stopPropagation(); } }, true);
      host.addEventListener("contextmenu", (e) => { if (dateEl(e) || r.querySelector(".v4thm")) e.preventDefault(); }, true);
    }

    /* 5. Salon : « TV éteinte » en gros, la dernière appli en petit */
    const sc = r.querySelector(".card[data-k=salon]");
    if (sc && sc.classList.contains("asleep")) {
      const app = sc.querySelector(".app"), hst = sc.querySelector(".hd .st");
      if (hst && !hst.hidden) hst.hidden = true;
      if (app && !app.dataset.v4) {
        const name = [...app.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
        app.dataset.v4 = "1"; app.classList.add("off");
        app.innerHTML = `<span class="tvoff">TV éteinte</span>${name && name !== "–" ? `<small class="last">Dernière appli : ${name}</small>` : ""}`;
      }
    }

    /* 6. Batteries des téléphones : icône + couleur selon le niveau */
    r.querySelectorAll(".card.fam .p .bt").forEach((bt) => {
      const m = bt.textContent.match(/(\d+)/);
      if (!m) return;
      const p = parseInt(m[1]);
      if (bt.dataset.v4 === String(p)) return;
      bt.dataset.v4 = String(p); bt.innerHTML = P2V4_BAT(p);
    });

    /* 7. Annonces : « Annonce envoyée ✓ » 2,5 s, et pas de double envoi */
    if (!r._v4Bound) {
      r._v4Bound = true;
      r.addEventListener("click", (e) => {
        if (r.querySelector(".modal.open")) return;
        const el = e.composedPath().find((n) => n.dataset && n.dataset.act);
        if (!el || !["atable", "depeche"].includes(el.dataset.act)) return;
        const a = this._v4ann || (this._v4ann = {}), k = el.dataset.act;
        if (a[k] && Date.now() < a[k]) { e.stopPropagation(); e.preventDefault(); return; }
        if (!(this._c.actions || {})[k] && !el.dataset.ent) return;
        a[k] = Date.now() + 2500;
        setTimeout(() => this._v4pass(), 2550);
        this._v4pass();
      }, true);
    }
    const ann = this._v4ann || {};
    for (const k of ["atable", "depeche"]) {
      const el = r.querySelector(`.s[data-act=${k}]`);
      if (!el) continue;
      const on = ann[k] && Date.now() < ann[k], ov = el.querySelector(".ann");
      if (on && !ov) el.insertAdjacentHTML("beforeend", '<span class="ann">Annonce envoyée ✓</span>');
      else if (!on && ov) ov.remove();
    }
  };
});
