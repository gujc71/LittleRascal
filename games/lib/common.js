/* 모든 게임이 같이 쓰는 도우미. 각 게임의 스크립트보다 먼저 불러온다. */

function $(id){ return document.getElementById(id); }

/* 섞은 사본을 돌려준다. 넘겨받은 배열은 그대로 둔다 */
function shuffle(a){
  a = a.slice();
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* 붙어 있던 애니메이션 클래스를 뗐다가 다시 붙여, 같은 효과를 처음부터 다시 재생한다 */
function replay(el, cls){
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* 시스템에서 모션 줄이기를 켰는지. 설정은 게임 도중에도 바뀔 수 있어 그때그때 묻는다 */
function reducedMotion(){ return matchMedia('(prefers-reduced-motion: reduce)').matches; }

/* 해결한 게임 기록 {slug: 처음 해결한 시각}. 이 브라우저에만 남는다.
   gujc71.github.io 아래의 다른 저장소와 저장 공간을 같이 쓰므로 키에 이름을 붙여 둔다 */
function solvedGames(){
  try{ const v = JSON.parse(localStorage.getItem('LittleRascal:solved') || '{}'); return v && typeof v === 'object' ? v : {}; }
  catch(e){ return {}; }
}
/* 성공 엔딩에서 부른다. slug를 빼면 지금 페이지의 파일 이름(games/<slug>.html)을 쓴다 */
function markSolved(slug){
  slug = slug || location.pathname.split('/').pop().replace(/\.html$/, '');
  try{
    const m = solvedGames();
    if(m[slug]) return;
    m[slug] = Date.now();
    localStorage.setItem('LittleRascal:solved', JSON.stringify(m));
  }catch(e){}
}
function clearSolved(){ try{ localStorage.removeItem('LittleRascal:solved'); }catch(e){} }
