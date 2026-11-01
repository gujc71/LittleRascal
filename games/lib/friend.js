/* 친구 찾기 엔진 — 문서와 친구들 말을 대조해 마음을 보낸 친구를 지목한다.
   단서를 모으는 화면(선물 주간판, 쪽지 문장 등)과 결과 글은 게임마다 다르고, 나머지는 모두 여기서 맡는다. lib/common.js 다음에 불러온다.

   G.KIDS, G.ORDER, G.ANSWER  후보와 정답. G.WHY[i] = {who, why, fake} 단서마다 들어맞는 친구
   G.DOCS, G.SAYS             증거 탭과 친구들 말. id가 'talk'인 탭은 친구들 말
   G.face(k, size)            후보 얼굴 SVG
   G.docHTML(id)              'talk'가 아닌 증거 탭의 내용
   G.afterDoc(el)             증거 탭을 그린 뒤 (선택)
   G.talk                     {cap, by:'name'|'full', hint, seenAt} 친구들 말 탭. seenAt명에게 들으면 본 것으로 친다
   G.clueChip(i)              [제목, 부제] 결정적 단서 칩
   G.texts                    {done, ask, waitBtn} 답 고르는 칸의 안내
   G.fresh()                  게임만의 상태 (기본 상태에 덧붙는다)
   G.store                    진행을 저장할 localStorage 키. 없으면 매번 새로 시작
   G.build(F), G.render(S)    단서 화면을 만들고 그린다
   G.endHTML(S)               결과 글. S.ending은 'win' 또는 'wait'

   돌려주는 F: F.S(지금 상태), F.save(), F.render() */
function FriendGame(G){
const {KIDS, ORDER, ANSWER, WHY, DOCS, SAYS, face} = G;
let S;
function fresh(){return Object.assign({seen:[],doc:DOCS[0].id,heard:[],talk:null,name:null,clues:[],tries:0,ending:null,askWait:false}, G.fresh())}
function load(){
  if(G.store) try{const v=JSON.parse(localStorage.getItem(G.store)||'null');if(v&&Array.isArray(v.seen)&&!v.ending)return Object.assign(fresh(),v)}catch(e){}
  return fresh();
}
function save(){if(G.store) try{localStorage.setItem(G.store,JSON.stringify(S))}catch(e){}}

/* ---------- evidence ---------- */
function talkHTML(){
  const T=G.talk;
  return `${T.cap?`<p class="doc-cap">${T.cap}</p>`:''}
    <div class="talks">${ORDER.map(k=>`<button class="who${S.heard.includes(k)?' heard':''}" type="button" data-talk="${k}" aria-pressed="${S.talk===k}">${face(k)}<b>${KIDS[k].name}</b><small></small></button>`).join('')}</div>
    <div class="quote${S.talk?'':' hint'}" aria-live="polite">${S.talk?`<span class="by">${KIDS[S.talk][T.by]}</span>“${SAYS[S.talk]}”`:T.hint}</div>`;
}
function buildTabs(){
  $('tabs').innerHTML=DOCS.map(d=>`<button class="tab" type="button" role="tab" id="tab-${d.id}" data-doc="${d.id}">${d.name}</button>`).join('');
  $('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-doc]');if(!b)return;S.doc=b.dataset.doc;markSeen();save();renderDocs();$('nDoc').textContent=S.seen.length});
  $('doc').addEventListener('click',e=>{const b=e.target.closest('[data-talk]');if(!b)return;S.talk=b.dataset.talk;
    if(!S.heard.includes(S.talk))S.heard.push(S.talk);if(S.heard.length>=G.talk.seenAt&&!S.seen.includes('talk'))S.seen.push('talk');
    save();renderDocs();$('nDoc').textContent=S.seen.length});
}
function markSeen(){if(S.doc!=='talk'&&!S.seen.includes(S.doc))S.seen.push(S.doc)}
function renderDocs(){
  DOCS.forEach(d=>{const b=$('tab-'+d.id);b.setAttribute('aria-selected',String(S.doc===d.id));b.classList.toggle('seen',S.seen.includes(d.id))});
  const el=$('doc');
  el.setAttribute('aria-labelledby','tab-'+S.doc);
  el.innerHTML=S.doc==='talk'?talkHTML():G.docHTML(S.doc);
  if(G.afterDoc)G.afterDoc(el);
}

/* ---------- suspects ---------- */
function buildSus(){
  $('sus').innerHTML=ORDER.map(k=>`<li>${face(k)}<div><b>${KIDS[k].full}<span>${KIDS[k].no}번</span></b><p>${KIDS[k].about}</p></div></li>`).join('');
}

/* ---------- answer ---------- */
function buildAnswer(){
  $('pickName').innerHTML=ORDER.map(k=>`<button class="chip" type="button" data-name="${k}">${KIDS[k].name}</button>`).join('');
  $('pickClue').innerHTML=WHY.map((w,i)=>{const [t,s]=G.clueChip(i);return `<button class="chip" type="button" data-clue="${i}">${t}<small>${s}</small></button>`}).join('');
  $('pickName').addEventListener('click',e=>{const b=e.target.closest('[data-name]');if(!b||S.ending)return;S.name=S.name===b.dataset.name?null:b.dataset.name;clearFb();save();renderAnswer()});
  $('pickClue').addEventListener('click',e=>{const b=e.target.closest('[data-clue]');if(!b||S.ending)return;const i=+b.dataset.clue;
    if(S.clues.includes(i))S.clues=S.clues.filter(x=>x!==i);else{S.clues.push(i);if(S.clues.length>2)S.clues.shift()}
    clearFb();save();renderAnswer()});
  $('submit').addEventListener('click',submit);
  $('wait').addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;const w=b.dataset.w;
    if(w==='show'){showEnd();return}
    if(w==='ask')S.askWait=true;else if(w==='no')S.askWait=false;else if(w==='yes'){S.ending='wait';S.askWait=false}
    save();render();if(w==='yes')showEnd()});
}
function clearFb(){$('fb').textContent='';$('fb').className='fb'}
function decisive(pair){
  // A pair is decisive when only one kid fits both clues.
  if(pair.length!==2)return false;
  const [a,b]=pair.map(i=>WHY[i]);
  if(a.fake||b.fake)return false;
  return a.who.filter(k=>b.who.includes(k)).length===1;
}
function submit(){
  if(!S.name||S.clues.length!==2)return;
  if(S.name===ANSWER&&decisive(S.clues)){S.ending='win';markSolved();save();render();showEnd();return}
  S.tries++;save();
  const fb=$('fb');fb.className='fb bad';fb.textContent='아직 아니에요.';
  replay($('answer'),'shake');
}
function renderAnswer(){
  document.querySelectorAll('[data-name]').forEach(b=>b.setAttribute('aria-pressed',String(S.name===b.dataset.name)));
  document.querySelectorAll('[data-clue]').forEach(b=>b.setAttribute('aria-pressed',String(S.clues.includes(+b.dataset.clue))));
  $('clueN').textContent=S.clues.length;
  $('submit').disabled=!(S.name&&S.clues.length===2)||!!S.ending;
  const w=$('wait'),T=G.texts;
  if(S.ending){w.innerHTML=`<span>${T.done}</span><button class="ghost" type="button" data-w="show">결과 다시 보기</button>`;return}
  w.innerHTML=S.askWait
    ?`<span class="ask">${T.ask}</span><span class="ask"><button class="ghost danger" type="button" data-w="yes">기다릴게요</button><button class="ghost" type="button" data-w="no">더 추리할래요</button></span>`
    :`<span>도저히 모르겠다면</span><button class="ghost" type="button" data-w="ask">${T.waitBtn}</button>`;
}

/* ---------- endings ---------- */
function renderEnd(){
  const el=$('end');
  if(!S.ending){if($('endDlg').open)$('endDlg').close();el.innerHTML='';return}
  el.innerHTML=G.endHTML(S);
  $('again').addEventListener('click',()=>{S=fresh();save();render();setView('case');window.scrollTo({top:0,behavior:'smooth'})});
}

// On a phone the sections become separate views; on a wide screen they are all on the page
// at once and setView only brings the matching one into sight.
const PANE={case:'pCase',doc:'pDoc',sus:'pSus',ans:'pAns'};
const onePane=()=>getComputedStyle($('vtabs')).display!=='none';
function setView(v,quiet){
  $('app').dataset.view=v;
  $('vtabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
  if(quiet) return;
  const pane=$(PANE[v]);
  if(onePane()) pane.scrollTop=0;
  else if(v==='case') window.scrollTo({top:0,behavior:'smooth'});
  else pane.scrollIntoView({behavior:'smooth',block:'start'});
}
// The result opens in its own window over the board; closing it leaves the answer slip in view.
function showEnd(){ setView('ans',true); const d=$('endDlg'); if(!d.open) d.showModal(); d.scrollTop=0; }
$('endClose').addEventListener('click',()=>$('endDlg').close());
$('endDlg').addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close()});
$('vtabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)});

function render(){
  G.render(S);
  $('nDoc').textContent=S.seen.length;
  renderDocs();renderAnswer();renderEnd();
  $('ansDot').hidden=!S.ending;
}

const F={get S(){return S},save,render};
S=load();
G.build(F);buildTabs();buildSus();buildAnswer();
markSeen();
render();
setView('case',true);
return F;
}
