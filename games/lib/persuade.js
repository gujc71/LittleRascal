/* 설득 게임 엔진 — 아이 한 명의 진술에서 증거와 어긋나는 문장을 찾아 들이민다.
   게임 HTML은 증거·진술·대사만 넘기고, 진행과 화면은 모두 여기서 맡는다. lib/common.js 다음에 불러온다.

   G.EV, G.EV_ORDER, G.R, G.WRONG, G.REPRESS  증거 카드, 핑계 라운드, 헛짚었을 때와 같은 말을 또 물었을 때의 대사
   G.stage       대사가 찍히는 영역의 id (누르면 다음 대사로)
   G.who, G.me   대사 앞에 붙는 이름
   G.clock       면담을 시작하는 시각 [시, 분]. TOTAL분 뒤가 마감
   G.pressedTag  추궁한 문장에 붙는 꼬리표
   G.lead        증거를 내밀 때 하는 말의 앞부분
   G.backfire    {ev, lines} 오히려 아이 편을 들어 주는 증거
   G.lines       {upset, bell, warn, hint, calmFine, calm, opening}
   G.grades      [아주 잘함, 잘함, 아쉬움]
   G.ends(clock) {win, upset, bell} 결과 화면의 {k, h, p}
   G.labels      {used, upset, again} 결과 화면의 이름표
   G.intro       {k, h, p, rules, go} 시작 화면 */
function Persuade(G){
const TOTAL = 20;
const CALM_MAX = 2;  /* 달래기는 한 판에 두 번까지, 연달아 쓸 수 없다 */
const {EV, EV_ORDER, R, WRONG, REPRESS} = G;
const LAST = R.length - 1;

let S, Q = [], Qdone = null, timer = null;
/* CHAR_MS: 글자 하나가 더 찍히는 간격. LOG_MAX: 화면에 남겨 두는 대사 수 */
const CHAR_MS = 55, LOG_MAX = 30;
/* 모션을 줄인 설정에서도 글자는 한 자씩 찍고, 스크롤만 단번에 옮긴다 */
let typer = null, cur = null, scrollAt = -1;
function clearTimer(){
  if(timer){ clearTimeout(timer); timer = null; }
  if(typer){ clearInterval(typer); typer = null; }
}

function fresh(){ return {round:0, conf:0, upset:0, maxUpset:0, time:TOTAL, sel:-1, ev:null, pressed:{}, near:{}, mistakes:0, calms:0, lastCalm:false, busy:false, over:false, started:false, face:'normal'}; }

function setFace(f){ S.face=f; document.querySelectorAll('#kid [data-f]').forEach(g=>{ g.style.display = g.dataset.f.split(' ').includes(f)?'':'none'; }); }
function clockText(){
  const m = G.clock[0]*60 + G.clock[1] + (TOTAL - S.time);
  return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
}
/* 받침이 있으면 "이야", 없으면 "야" */
function iya(w){ const c = w.charCodeAt(w.length-1) - 0xAC00; return c>=0 && c<11172 && c%28===0 ? '야' : '이야'; }

function hud(){
  $('gConf').style.width = S.conf+'%'; $('nConf').textContent = S.conf;
  $('gUpset').style.width = S.upset+'%'; $('nUpset').textContent = S.upset;
  $('clock').textContent = clockText();
  $('clockBox').classList.toggle('low', S.time<=5);
  $('roundTag').textContent = '핑계 '+(S.round+1)+'/'+R.length;
  $('roundName').textContent = '"'+R[S.round].name+'"';
  const idle = !S.busy && !S.over && S.started;
  $('btnPress').disabled = !idle || S.sel<0;
  $('btnPresent').disabled = !idle || S.sel<0 || !S.ev;
  $('btnCalm').disabled = !idle || S.calms>=CALM_MAX || S.lastCalm;
  $('nCalm').textContent = CALM_MAX - S.calms;
  $(G.stage).classList.toggle('adv', S.busy);
  renderPicks();
}
/* Mobile: the desk panels become drawers - statements slide in from the left, evidence from the right */
const MQ = window.matchMedia('(max-width:720px)');
const DRAWER = {st:'pStatements', ev:'pEvidence'};
function renderPicks(){
  const st = S.sel<0 ? null : R[S.round].st[S.sel];
  $('pickStText').textContent = st ? st.tx : '문장 고르기';
  $('btnStList').title = st ? st.tx : '';
  $('pickEvText').textContent = S.ev ? EV[S.ev].name : '카드 고르기';
  $('btnStList').classList.toggle('on', S.sel>=0);
  $('btnEvList').classList.toggle('on', !!S.ev);
}
function closeDrawers(){
  $('pStatements').classList.remove('open'); $('pEvidence').classList.remove('open');
  $('scrim').hidden = true;
  $('btnStList').setAttribute('aria-expanded','false');
  $('btnEvList').setAttribute('aria-expanded','false');
}
function openDrawer(w){
  closeDrawers();
  $(DRAWER[w]).classList.add('open'); $('scrim').hidden = false;
  $(w==='st'?'btnStList':'btnEvList').setAttribute('aria-expanded','true');
}
function toggleDrawer(w){ if($(DRAWER[w]).classList.contains('open')) closeDrawers(); else openDrawer(w); }
function renderStatements(){
  const r = R[S.round];
  $('stList').innerHTML = r.st.map((s,i)=>`<li tabindex="0" data-i="${i}" class="${S.sel===i?'sel':''}"><span class="n">${i+1}</span><span class="tx">${s.tx}</span>${S.pressed[S.round+':'+i]?'<span class="pr">'+G.pressedTag+'</span>':''}</li>`).join('');
}
function renderCards(){
  $('cards').innerHTML = EV_ORDER.map(k=>`<button type="button" class="card ${S.ev===k?'sel':''}" data-k="${k}"><b>${EV[k].name}</b><span>${EV[k].sub}</span></button>`).join('');
  $('doc').innerHTML = S.ev ? EV[S.ev].html : '<p class="ph">증거 카드를 고르면 여기에 내용이 펼쳐집니다.</p>';
  $('btnEvPick').disabled = !S.ev;
  $('btnEvPick').textContent = S.ev ? '「'+EV[S.ev].name+'」 선택' : '카드를 먼저 고르세요';
}
function speaker(w){ return w==='s'?G.who: w==='t'?G.me:''; }
function typing(){ return !!cur; }
/* 늘어난 만큼만 부드럽게 내려가면, 다 찍힌 대사가 위로 밀려 올라간다 */
function scrollLog(){
  const g = $('log'), top = Math.max(0, g.scrollHeight - g.clientHeight);
  if(top === scrollAt) return;
  scrollAt = top;
  g.scrollTo({top, behavior: reducedMotion()?'auto':'smooth'});
}
function resetLog(){ $('log').textContent = ''; cur = null; scrollAt = -1; }
/* 문장을 끝까지 드러낸다 — 저절로 다 찍혔거나, 화면을 눌러 건너뛰었을 때 */
function endLine(){
  if(typer){ clearInterval(typer); typer = null; }
  if(!cur) return;
  cur.tx.textContent = cur.t;
  cur.tx.removeAttribute('aria-hidden');
  cur.el.classList.remove('typing');
  cur = null;
  scrollLog();
}
function show(w,t,f){
  if(f) setFace(f);
  endLine();
  const g = $('log'), prev = g.lastElementChild, txt = String(t);
  if(prev && prev.dataset.w===w && prev.dataset.t===txt) return;  /* 막 한 말은 다시 쌓지 않는다 */
  const el = document.createElement('p');
  el.className = 'ent '+w+' typing'; el.dataset.w = w; el.dataset.t = txt;
  const who = speaker(w);
  if(who){ const b = document.createElement('b'); b.className = 'who'; b.textContent = who; el.appendChild(b); }
  const tx = document.createElement('span');
  tx.className = 'tx';
  tx.setAttribute('aria-hidden','true');  /* 한 글자씩 바뀔 때마다 읽어 주지 않도록 */
  el.appendChild(tx); g.appendChild(el);
  while(g.children.length > LOG_MAX) g.removeChild(g.firstElementChild);
  cur = {el, tx, t:txt, i:0};
  scrollLog();
  typer = setInterval(()=>{
    if(!cur){ clearInterval(typer); typer = null; return; }
    cur.tx.textContent = cur.t.slice(0, ++cur.i);
    if(cur.i >= cur.t.length) endLine(); else scrollLog();
  }, CHAR_MS);
}
function say(lines, done){ Q = lines.slice(); Qdone = done||null; S.busy = true; step(); }
function step(){
  clearTimer();
  if(!Q.length){ S.busy=false; const d=Qdone; Qdone=null; hud(); if(d) d(); return; }
  const [w,t,f] = Q.shift(); show(w,t,f);
  const n = String(t).length;
  const read = Math.min(6000, Math.max(1600, 1200 + n*85));
  timer = setTimeout(step, Math.max(read, n*CHAR_MS + 1200));
  hud();
}
/* 한 번 누르면 문장을 끝까지, 다시 누르면 다음 대사로 */
function advance(){
  if(typing()){ clearTimer(); endLine(); if(S.busy) timer = setTimeout(step, 1200); return; }
  if(S.busy) step();
}
function bump(dc, du){
  S.conf = Math.max(0, Math.min(100, S.conf+dc));
  S.upset = Math.max(0, Math.min(100, S.upset+du));
  S.maxUpset = Math.max(S.maxUpset, S.upset);
  if(du>0) replay($('upsetBox'), 'hot');
  hud();
}
function check(){
  if(S.over) return;
  if(S.upset>=100) return say(G.lines.upset, ()=>end('upset'));
  if(S.time<=0) return say(G.lines.bell, ()=>end('bell'));
  idleLine();
}
function idleLine(){
  const f = S.upset>=70?'cry': S.upset>=40?'pout':'normal';
  show('n', S.upset>=70 ? G.lines.warn : G.lines.hint, f);
}
function press(){
  if(S.busy||S.sel<0) return;
  const key = S.round+':'+S.sel; S.time--; S.lastCalm = false;
  if(S.pressed[key]){ bump(0,12); say(REPRESS, check); }
  else { S.pressed[key]=true; bump(3,5); renderStatements(); say(R[S.round].st[S.sel].press, check); }
}
function calm(){
  if(S.busy||S.calms>=CALM_MAX||S.lastCalm) return; S.calms++; S.lastCalm = true; S.time--;
  if(S.upset<10){ say(G.lines.calmFine, check); return; }
  bump(0,-20);
  say(G.lines.calm, check);
}
function stamp(){ replay($('stamp'), 'on'); replay($(G.stage), 'shake'); }
function present(){
  if(S.busy||S.sel<0||!S.ev) return;
  const r = R[S.round], si = S.sel, ek = S.ev; S.time--; S.lastCalm = false;
  const nm = EV[ek].name, lead = ['t', G.lead+nm+iya(nm)+'.'];
  if(r.ok.st===si && r.ok.ev===ek){
    stamp(); bump(S.round===LAST?100:22, -8);
    say(r.ok.lines, ()=>{
      if(S.round===LAST){ S.conf=100; hud(); end('win'); return; }
      S.round++; S.sel=-1; S.ev=null; renderStatements(); renderCards(); hud();
      say(R[S.round].intro, check);
    });
    return;
  }
  const nk = si+':'+ek;
  if(r.near[nk]){
    const first = !S.near[S.round+':'+nk]; S.near[S.round+':'+nk]=true;
    bump(first?5:0, first?0:8); say([lead, ...r.near[nk]], check); return;
  }
  S.mistakes++;
  if(ek===G.backfire.ev){ bump(-5,14); say([lead, ...G.backfire.lines], check); return; }
  bump(0,22);
  say([lead, ...WRONG[(S.mistakes-1)%WRONG.length]], check);
}

function grade(){
  if(S.mistakes===0 && S.maxUpset<50) return G.grades[0];
  if(S.mistakes<=2 && S.maxUpset<80) return G.grades[1];
  return G.grades[2];
}
function end(kind){
  clearTimer(); closeDrawers(); S.over = true; hud();
  if(kind==='win') markSolved();
  const used = TOTAL - S.time;
  const T = G.ends(clockText())[kind];
  const g = kind==='win' ? grade() : '';
  $('screen').innerHTML = `<div class="sheet" role="dialog" aria-labelledby="endH">
    ${g?`<div class="grade">${g.replace('\n','<br>')}</div>`:''}
    <small class="k">${T.k}</small><h2 id="endH">${T.h}</h2><p>${T.p}</p>
    <div class="stats"><div><b>${used}분</b>${G.labels.used}</div><div><b>${S.mistakes}번</b>헛짚은 증거</div><div><b>${S.maxUpset}</b>${G.labels.upset}</div></div>
    <div class="acts"><button class="go" id="again" type="button">${G.labels.again}</button><a class="list" href="../index.html">게임 목록</a></div></div>`;
  $('screen').hidden = false;
  $('again').onclick = start;
  setFace(kind==='win'?'normal':kind==='upset'?'cry':'smug');
}
function intro(){
  const I = G.intro;
  $('screen').innerHTML = `<div class="sheet" role="dialog" aria-labelledby="inH">
    <small class="k">${I.k}</small>
    <h2 id="inH">${I.h}</h2>
    <p>${I.p}</p>
    <ul>
      ${I.rules.map(li=>`<li>${li}</li>`).join('\n      ')}
    </ul>
    <button class="go" id="begin" type="button">${I.go}</button></div>`;
  $('screen').hidden = false;
  $('begin').onclick = ()=>{ $('screen').hidden = true; S.started = true; say(R[0].intro, check); };
}
function start(){ clearTimer(); closeDrawers();
  S = fresh(); Q=[]; Qdone=null; resetLog(); setFace('normal'); $('stamp').classList.remove('on');
  renderStatements(); renderCards(); show('n', ...G.lines.opening);
  hud(); intro();
}

$('stList').addEventListener('click', e=>{ const li=e.target.closest('li'); if(!li||S.over) return; S.sel = +li.dataset.i; renderStatements(); hud(); if(MQ.matches) closeDrawers(); });
$('stList').addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.target.closest('li')?.click(); } });
$('cards').addEventListener('click', e=>{ const c=e.target.closest('.card'); if(!c) return; S.ev = S.ev===c.dataset.k? null : c.dataset.k; renderCards(); hud(); });
$(G.stage).addEventListener('click', advance);
$('btnStList').onclick = ()=> toggleDrawer('st');
$('btnEvList').onclick = ()=> toggleDrawer('ev');
$('btnEvPick').onclick = ()=>{ if(S.ev) closeDrawers(); };
$('scrim').onclick = closeDrawers;
document.querySelectorAll('[data-close]').forEach(b=>{ b.onclick = closeDrawers; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeDrawers(); });
MQ.addEventListener('change', closeDrawers);
document.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && (S.busy||typing()) && !e.target.closest('button,li')){ e.preventDefault(); advance(); } });
$('btnPress').onclick = press; $('btnPresent').onclick = present; $('btnCalm').onclick = calm;

window.claude?.hot?.snapshot?.(()=>({S}));
const boot = data => {
  if(data && data.S && data.S.started && !data.S.over){
    S = Object.assign(fresh(), data.S, {busy:false}); setFace(S.face||'normal');
    renderStatements(); renderCards(); $('screen').hidden = true; check();
  } else start();
};
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
}
