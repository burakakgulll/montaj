(function(){
'use strict';
/* Tribün saha montajı */
const S = window.SAHA, $app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DISTINCT = [0x2B8A3E, 0x1971C2, 0x7048E8, 0x0C8599, 0x862E9C, 0x5C940D, 0x364FC7, 0x087F5B];
const GRP = {
  C:{ n:'Kolon',    css:'#1971C2', pal:DISTINCT }, B:{ n:'Kiriş', css:'#0C8599', pal:DISTINCT }, T:{ n:'Tribün', css:'#2B8A3E', pal:DISTINCT },
  M:{ n:'Merdiven', css:'#7048E8', pal:DISTINCT }, K:{ n:'Korkuluk', css:'#862E9C', pal:DISTINCT }, S:{ n:'Beton', css:'#BFC5CA', pal:[0xBFC5CA] }
};
const SEL = [0xE03131, 0xB02525, 0xFF6B6B, 0xC92A2A], NB = [0xFCC419, 0xF08C00, 0xFFE066, 0xE8A317];
const STAGES = ['C','B','T','M','K'];   // aşama sırası (varsayım)
// sadece imalat çizimi olan pozlar + tribün sacları + beton
S.items = S.items.filter(it => ['C','B','T','R','S'].includes(it.g) || (it.g === 'A' && it.ts));
S.items.forEach(it => { if(it.g === 'A') it.g = 'TS'; if(it.g === 'R') it.g = (it.bmax[2] - it.bmin[2] < 500) ? 'M' : 'K'; });
const BY = {}; S.items.forEach(it => BY[it.id] = it);
S.items.forEach(it => { it.con = it.con.filter(id => BY[id] && !['S','TS'].includes(BY[id].g)); });
const byMark = {}; S.items.forEach(it => { if(STAGES.includes(it.g)) (byMark[it.mark] = byMark[it.mark] || []).push(it); });
const sheetsOf = {}; S.items.forEach(it => { if(it.g === 'TS') (sheetsOf[it.ts] = sheetsOf[it.ts] || []).push(it); });
let stage = 0;

/* renk kuralı: aynı poz = aynı renk, farklı poz = farklı renk (seçim renkleri kırmızı/sarı hariç tutulur) */
(function color(){
  STAGES.forEach(g => {
    const marks = [...new Set(S.items.filter(it => it.g === g).map(it => it.mark))].sort((a,b) => (+a.split('/')[1]) - (+b.split('/')[1]));
    const n = marks.length, col = {};
    marks.forEach((m,i) => {
      const h = 70 + (i * 290 / Math.max(n,1) + (i % 2) * 145) % 290;          // 70°..360°: yeşil-mavi-mor-pembe
      const l = [0.42, 0.58, 0.34, 0.66][i % 4];
      col[m] = new THREE.Color().setHSL(h/360, 0.62, l).getHex();
    });
    S.items.forEach(it => { if(it.g === g) it.hex = col[it.mark]; });
  });
  S.items.forEach(it => { if(it.g === 'TS') it.hex = BY[it.ts] ? BY[it.ts].hex : 0x999999; });
})();

/* ---------- geometri ---------- */
function b64(s){ const bin = atob(s), u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function geomOf(it){
  if(it._g) return it._g;
  const vi = new Int32Array(b64(it.v)), fi = it.fw === 2 ? new Uint16Array(b64(it.f)) : new Uint32Array(b64(it.f));
  const pos = new Float32Array(vi.length);
  for(let i=0;i<vi.length;i+=3){ pos[i] = vi[i]+it.o[0]; pos[i+1] = vi[i+2]+it.o[2]; pos[i+2] = -(vi[i+1]+it.o[1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(fi, 1)); g.computeVertexNormals();
  it._g = g; it._e = new THREE.EdgesGeometry(g, 30); return g;
}
const P3 = (x,y,z) => new THREE.Vector3(x, z, -y);

/* ---------- malzemeler ---------- */
const MC = {};
function solid(hex, sheet){
  const k = hex+(sheet ? 's' : '');
  return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color:hex, metalness:0.2, roughness:0.6, side:THREE.DoubleSide, flatShading:true,
    transparent:!!sheet, opacity:sheet ? 0.94 : 1, depthWrite:!sheet, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 }));
}
function edgeOf(hex){ const k = 'e'+hex; return MC[k] || (MC[k] = new THREE.LineBasicMaterial({ color:new THREE.Color(hex).multiplyScalar(0.55) })); }
const FADE = new THREE.MeshStandardMaterial({ color:0x9DA9B4, side:THREE.DoubleSide, flatShading:true, transparent:true, opacity:0.5, depthWrite:false });
const FADE_S = new THREE.MeshStandardMaterial({ color:0xA9B2BA, side:THREE.DoubleSide, flatShading:true, transparent:true, opacity:0.45, depthWrite:false });
const EDGE_F = new THREE.LineBasicMaterial({ color:0x7F8A94, transparent:true, opacity:0.45 });
const GHOST = new THREE.MeshStandardMaterial({ color:0xB4BEC7, side:THREE.DoubleSide, flatShading:true, transparent:true, opacity:0.22, depthWrite:false });
const GHOST_S = new THREE.MeshStandardMaterial({ color:0xC2C9CF, side:THREE.DoubleSide, flatShading:true, transparent:true, opacity:0.16, depthWrite:false });
const EDGE_G = new THREE.LineBasicMaterial({ color:0x9AA5AE, transparent:true, opacity:0.25 });
const BOLT = new THREE.MeshBasicMaterial({ color:0x111518 });
const CONC = new THREE.MeshStandardMaterial({ color:0xBFC5CA, side:THREE.DoubleSide, flatShading:true, transparent:true, opacity:0.45, depthWrite:false });
const HOLE = new THREE.MeshBasicMaterial({ color:0x111518 });
const DIA = { 14:'#1E9E52', 18:'#E8590C', 19:'#C2255C', 16:'#1C7ED6' };
const RM = {}; const ringM = d => RM[d] || (RM[d] = new THREE.MeshBasicMaterial({ color:new THREE.Color(DIA[d] || '#495057') }));

/* ---------- 3B ---------- */
const V = { r:null, scene:null, cam:null, ctl:null, el:null, root:null, meshes:{}, sel:[], view:'iso', fx:null };
function makeLabel(text, bg, fg, h){
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = 64;
  const font = '700 '+fs+'px "Barlow Condensed","Arial Narrow",Arial,sans-serif';
  ctx.font = font; c.width = Math.ceil(ctx.measureText(text).width) + 32; c.height = fs + 24;
  ctx.font = font; ctx.fillStyle = bg; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(0,0,c.width,c.height,14); else ctx.rect(0,0,c.width,c.height);
  ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, 16, c.height/2+3);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, depthTest:false })); sp.renderOrder = 10; sp.userData.h = h; sp.userData.asp = c.width/c.height; return sp;
}
function init(el){
  V.el = el;
  if(!V.r){
    const r = new THREE.WebGLRenderer({ antialias:true, alpha:true }); r.setPixelRatio(Math.min(window.devicePixelRatio||1, 2)); V.r = r;
    V.scene = new THREE.Scene(); V.cam = new THREE.OrthographicCamera(-1,1,1,-1,1,1e7);
    V.scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8894, 0.85));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(0.4,1,0.7); V.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(-0.6,-0.4,-0.8); V.scene.add(d2);
    V.ctl = new THREE.OrbitControls(V.cam, r.domElement); V.ctl.addEventListener('change', render);
    window.addEventListener('resize', () => { resize(); fit(); });
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', e => { if(down && Math.hypot(e.clientX-down[0], e.clientY-down[1]) < 6) pick(e); down = null; });
    const root = new THREE.Group(); V.root = root;
    S.items.forEach(it => {
      const m = new THREE.Mesh(geomOf(it)); m.userData.id = it.id;
      const e = new THREE.LineSegments(it._e);
      const g = new THREE.Group(); g.add(m); g.add(e); g.userData.it = it; V.meshes[it.id] = { g, m, e }; root.add(g);
    });
    V.labels = new THREE.Group(); V.holes = new THREE.Group(); root.add(V.labels); root.add(V.holes);
    V.scene.add(root);
  }
  el.appendChild(V.r.domElement); resize();
}
function stageState(it){
  if(it.g === 'S') return 'concrete';
  const k = STAGES.indexOf(it.g === 'TS' ? 'T' : it.g);
  return k < stage ? 'done' : (k === stage ? 'now' : 'hidden');
}
/* görünüm durumu: seçim varsa sadece seçilen(ler) + bağlandıkları (sonraki aşamalar hariç) */
function viewState(it){
  const st = stageState(it);
  if(st === 'concrete') return st;
  if(!V.sel.length) return st;
  const selSet = V.selSet, nbSet = V.nbSet;
  const owner = it.g === 'TS' ? it.ts : it.id;
  if(selSet.has(owner)) return 'sel';
  if(nbSet.has(owner) && st !== 'hidden') return 'nb';
  return st === 'hidden' ? 'hidden' : 'ghost';
}
function applyStyle(){
  V.selSet = new Set(V.sel); V.nbSet = new Set();
  V.sel.forEach(id => BY[id].con.forEach(c => { if(!V.selSet.has(c)) V.nbSet.add(c); }));
  // bağlı olanlar arasında da farklı sarı tonlar
  const nbList = [...V.nbSet].map(id => BY[id]).sort((a,b) => a.bmin[0]-b.bmin[0]), nbCi = {};
  nbList.forEach((it,i) => nbCi[it.id] = i % NB.length);
  const selCi = {}; V.sel.forEach((id,i) => selCi[id] = i % SEL.length);
  S.items.forEach(it => {
    const o = V.meshes[it.id], vs = viewState(it), sheet = it.g === 'TS', owner = sheet ? it.ts : it.id;
    o.g.visible = vs !== 'hidden';
    if(vs === 'concrete'){ o.m.material = CONC; o.e.material = EDGE_F; return; }
    let hex = null;
    if(vs === 'sel') hex = SEL[selCi[owner] || 0];
    else if(vs === 'nb') hex = NB[nbCi[owner] || 0];
    else if(vs === 'now') hex = it.hex;
    if(hex !== null){ o.m.material = solid(hex, sheet); o.e.material = edgeOf(hex); }
    else if(vs === 'ghost'){ o.m.material = sheet ? GHOST_S : GHOST; o.e.material = EDGE_G; }
    else { o.m.material = sheet ? FADE_S : FADE; o.e.material = EDGE_F; }
  });
  // isim etiketleri
  V.labels.clear();
  S.items.forEach(it => {
    if(it.g === 'TS' || it.g === 'S') return;
    const vs = viewState(it);
    if(V.sel.length ? !(vs === 'sel' || vs === 'nb') : vs !== 'now') return;
    const bg = vs === 'sel' ? '#E03131' : (vs === 'nb' ? '#FCC419' : '#FFFFFF'), fg = vs === 'sel' ? '#FFFFFF' : '#1A2026';
    const lb = makeLabel(it.mark, bg, fg, vs === 'sel' ? 0.05 : 0.036);
    const size = (it.bmax[0]-it.bmin[0]) + (it.bmax[1]-it.bmin[1]) + (it.bmax[2]-it.bmin[2]);
    lb.userData.prio = vs === 'sel' ? 1e9 : size;
    lb.position.copy(P3((it.bmin[0]+it.bmax[0])/2, (it.bmin[1]+it.bmax[1])/2, it.bmax[2] + 40)); V.labels.add(lb);
  });
  // delikler (görünen elemanlarda), renkli halka: renkli gösterilenlerde
  V.holes.clear();
  const holes = [], rings = {};
  S.items.forEach(it => { const vs = viewState(it); if(vs === 'hidden' || vs === 'concrete' || vs === 'ghost' || !it.h) return;
    it.h.forEach(h => { holes.push(h); if(vs !== 'done') (rings[h[6]] = rings[h[6]] || []).push(h); }); });
  const up = new THREE.Vector3(0,1,0), zz = new THREE.Vector3(0,0,1), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  if(holes.length){
    const im = new THREE.InstancedMesh(V.cylG || (V.cylG = new THREE.CylinderGeometry(0.5,0.5,1,14)), HOLE, holes.length);
    holes.forEach((h,k) => { const n = P3(h[3],h[4],h[5]).normalize(); q.setFromUnitVectors(up, n); p.copy(P3(h[0],h[1],h[2])); sc.set(h[6], h[7]+1.5, h[6]); M4.compose(p,q,sc); im.setMatrixAt(k, M4); });
    V.holes.add(im);
  }
  Object.keys(rings).forEach(d => {
    const list = rings[d], im = new THREE.InstancedMesh(V.torG || (V.torG = new THREE.TorusGeometry(1, 0.16, 6, 20)), ringM(+d), list.length*2); let k = 0;
    list.forEach(h => { const n = P3(h[3],h[4],h[5]).normalize(); q.setFromUnitVectors(zz, n); const r = h[6]/2 + 3; sc.set(r, r, r);
      [-1,1].forEach(s => { p.copy(P3(h[0],h[1],h[2])).addScaledVector(n, s*(h[7]/2+0.8)); M4.compose(p,q,sc); im.setMatrixAt(k++, M4); }); });
    V.holes.add(im);
  });
  // seçimde cıvatalanacak yerler: siyah çubuk
  if(V.sel.length){
    const gs = groupsFor(V.sel);
    const list = []; gs.forEach(gi => S.bolts[gi].sh.forEach(x => list.push(x)));
    if(list.length){
      const im = new THREE.InstancedMesh(V.boltG || (V.boltG = new THREE.CylinderGeometry(1,1,1,12)), BOLT, list.length);
      list.forEach(([c,a,L],k) => { const n = P3(a[0],a[1],a[2]).normalize(); q.setFromUnitVectors(up, n); p.copy(P3(c[0],c[1],c[2])); sc.set(8, Math.max(L,40)+30, 8); M4.compose(p,q,sc); im.setMatrixAt(k, M4); });
      V.holes.add(im);
    }
  }
  render();
}
function render(){
  if(!(V.r && V.el && V.el.isConnected)) return;
  const c = V.cam, ws = (c.top - c.bottom)/c.zoom;
  V.labels.children.forEach(o => o.scale.set(o.userData.asp*o.userData.h*ws, o.userData.h*ws, 1));
  V.root.updateMatrixWorld(true); declutter(); V.r.render(V.scene, V.cam);
}
function declutter(){
  const Wp = V.el.clientWidth, Hp = V.el.clientHeight, placed = [], v = new THREE.Vector3();
  V.labels.children.slice().sort((a,b) => b.userData.prio - a.userData.prio).forEach(sp => {
    v.setFromMatrixPosition(sp.matrixWorld).project(V.cam);
    const h = sp.userData.h*Hp, w = sp.userData.asp*h, cx = (v.x+1)/2*Wp, cy = (1-v.y)/2*Hp;
    const r = [cx-w/2-2, cy-h/2-2, cx+w/2+2, cy+h/2+2];
    const hit = v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05 || placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    sp.visible = !hit; if(!hit) placed.push(r);
  });
}
function resize(){ if(V.el && V.el.isConnected){ V.r.setSize(V.el.clientWidth, V.el.clientHeight, false); render(); } }
const DIRS = { iso:[-1,1.1,1], top:[0,1,0.0001], front:[0,0.15,1], side:[1,0.15,0] };
function worldBox(){
  const lo=[1e12,1e12,1e12], hi=[-1e12,-1e12,-1e12];
  S.items.filter(it => it.g !== 'S').forEach(it => { for(let k=0;k<3;k++){ lo[k]=Math.min(lo[k],it.bmin[k]); hi[k]=Math.max(hi[k],it.bmax[k]); } });
  return { lo, hi };
}
function fit(){
  const box = worldBox(), c = V.cam, dir = new THREE.Vector3(...DIRS[V.view]).normalize();
  const corners = []; [box.lo[0], box.hi[0]].forEach(x => [box.lo[1], box.hi[1]].forEach(y => [box.lo[2], box.hi[2]].forEach(z => corners.push(P3(x,y,z)))));
  const t = P3((box.lo[0]+box.hi[0])/2, (box.lo[1]+box.hi[1])/2, (box.lo[2]+box.hi[2])/2), D = 2e5;
  c.position.copy(t).addScaledVector(dir, D); c.up.set(0,1,0); c.lookAt(t); c.updateMatrixWorld();
  const inv = c.matrixWorldInverse; let x0=1e12,x1=-1e12,y0=1e12,y1=-1e12;
  corners.forEach(q => { const p = q.clone().applyMatrix4(inv); x0 = Math.min(x0,p.x); x1 = Math.max(x1,p.x); y0 = Math.min(y0,p.y); y1 = Math.max(y1,p.y); });
  const asp = V.el.clientWidth / V.el.clientHeight, cx = (x0+x1)/2, cy = (y0+y1)/2;
  let w = (x1-x0)*1.12, h = (y1-y0)*1.15; if(w/h > asp) h = w/asp; else w = h*asp;
  const rt = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,1);
  t.addScaledVector(rt,cx).addScaledVector(up,cy); c.position.addScaledVector(rt,cx).addScaledVector(up,cy);
  c.left=-w/2; c.right=w/2; c.top=h/2; c.bottom=-h/2; c.zoom=1; c.near=1; c.far=D*3; c.updateProjectionMatrix();
  V.ctl.target.copy(t); V.ctl.update(); render();
}
function pick(e){
  const rect = V.r.domElement.getBoundingClientRect();
  const m = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  const rc = new THREE.Raycaster(); rc.setFromCamera(m, V.cam);
  const objs = Object.values(V.meshes).filter(o => { if(!o.g.visible) return false; const it = o.g.userData.it, vs = viewState(it);
    return it.g !== 'S' && (vs === 'now' || vs === 'sel' || vs === 'nb'); }).map(o => o.m);
  const hit = rc.intersectObjects(objs, false)[0];
  if(hit){ let it = BY[hit.object.userData.id]; if(it.g === 'TS') it = BY[it.ts]; location.hash = '#/m/'+it.id; }
  else if(V.sel.length) location.hash = '#/';
}

/* ---------- arayüz ---------- */
const stageIdx = it => STAGES.indexOf(it.g);
function groupsFor(ids){
  const gs = new Set();
  ids.forEach(id => { const me = BY[id]; me.bg.forEach(gi => { const b = S.bolts[gi];
    const later = (b.a || []).some(x => BY[x] && STAGES.includes(BY[x].g) && stageIdx(BY[x]) > stageIdx(me));
    if(!later) gs.add(gi); }); });
  return gs;
}
function boltText(ids){
  // sadece çap: "8 adet M12"; ankraj somunu temsilleri (A/.. sahipli gruplar) sayılmaz
  const c = {};
  groupsFor(ids).forEach(gi => { const b = S.bolts[gi]; if(b.own === 'A') return;
    const m = /BOLT(\d+)/.exec(b.name || ''); const k = m ? 'M'+m[1] : 'cıvata'; c[k] = (c[k]||0) + (b.n||1); });
  return Object.keys(c).sort().map(k => c[k]+' adet '+k);
}
function infoCard(ids){
  if(!ids.length) return '';
  const it = BY[ids[0]], n = ids.length;
  const bolts = boltText([ids[0]]);
  return '<div class="infocard"><h2>'+esc(it.mark)+(n > 1 ? ' <small class="muted">'+n+' adet</small>' : '')+'</h2>'+
    '<div class="row"><div><div class="k">Cıvata'+(n > 1 ? ' (her biri)' : '')+'</div><div class="v">'+(bolts.length ? bolts.join('<br>') : 'yok')+'</div></div>'+
    (it.kg ? '<div><div class="k">Ağırlık'+(n > 1 ? ' (her biri)' : '')+'</div><div class="v">'+it.kg+' kg</div></div>' : '')+'</div></div>';
}
function stageButtons(){ return STAGES.map((k,i) => '<button data-s="'+i+'" aria-pressed="'+(i === stage)+'"><i style="background:'+GRP[k].css+'"></i>'+(i+1)+'. '+GRP[k].n+'</button>').join(''); }
function setStage(k){ stage = k; document.querySelectorAll('#layers button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === k)); }
let built = false;
function page(){
  if(built) return; built = true;
  $app.innerHTML = '<div class="intro"><h1>Tribün saha montajı</h1><p class="lead muted">Aşamayı seç, montaja dokun veya numarasını yaz.</p></div>'+
    '<div class="layers" id="layers">'+stageButtons()+'</div>'+
    '<div class="viewer big" id="viewer"><span class="vhint">Dokun: seç · boş yere dokun: seçimi kaldır · iki parmak: yakınlaş</span></div>'+
    '<div class="vbtns" id="vbtns"><button data-v="iso" aria-pressed="true">İzometrik</button><button data-v="top">Üstten (plan)</button><button data-v="front">Önden</button><button data-v="side">Yandan</button></div>'+
    '<div id="info"></div>';
  init(document.getElementById('viewer'));
  document.querySelectorAll('#vbtns button').forEach(b => b.onclick = () => { V.view = b.dataset.v; document.querySelectorAll('#vbtns button').forEach(x => x.setAttribute('aria-pressed', x === b)); fit(); });
  document.querySelectorAll('#layers button').forEach(b => b.onclick = () => { setStage(+b.dataset.s); if(V.sel.length) location.hash = '#/'; else applyStyle(); });
  fit();
}
function route(){
  page();
  const h = decodeURIComponent(location.hash); let m, ids = [];
  if((m = h.match(/^#\/m\/(\d+)$/)) && BY[+m[1]]) ids = [+m[1]];
  else if((m = h.match(/^#\/k\/([A-Z]+\/\d+)$/)) && byMark[m[1]]) ids = byMark[m[1]].map(it => it.id);
  if(ids.length) setStage(STAGES.indexOf(BY[ids[0]].g));
  V.sel = ids;
  document.getElementById('info').innerHTML = infoCard(ids);
  applyStyle();
}
document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('q').value.trim().toUpperCase().replace(/\s+/g,'').replace(/^([A-Z]+)-?(\d+)$/, '$1/$2');
  if(byMark[q]) location.hash = '#/k/'+q;
  else document.getElementById('info').innerHTML = '<p class="warn">"'+esc(q)+'" bulunamadı. Örnek: C/20, T/5, B/3.</p>';
  document.getElementById('q').blur();
});
window.addEventListener('hashchange', route);
route();
})();
