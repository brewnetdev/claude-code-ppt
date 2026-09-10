"""단독 실행 프레젠테이션 셸 — L9 카피 덱(docs/html/l9-harness-evaluator-slides.html) 구조.

에디터 덱은 스타일을 `src/canvas/themes/study.css` 에만 두기 때문에 파일을 그냥
열면 CSS 가 하나도 안 붙는다. 발표용은 브라우저에서 바로 떠야 하므로 그 테마
CSS 를 통째로 인라인하고, 여기서는 **셸만** 얹는다.

색·글자·컴포넌트는 여기에 다시 적지 않는다 — study.css 한 곳이 정본이다.
두 곳에 적으면 한쪽만 고쳐져서 에디터와 발표 화면이 갈라진다.

배경은 L9 의 다크(#282a36)를 따르지 않고 밝게 간다 — 제공된 도판 21개가
`fill="#ffffff"` 배경으로 하드코딩돼 있고 GUIDE 가 "도판을 장표에서 고치지
않는다"고 정했기 때문이다. 다크 위에 얹으면 21장에 흰 사각형이 박힌다.
뒤집으려면 study.css 상단 팔레트 블록만 바꾸면 된다.
"""

import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
THEME = os.path.join(REPO, "src", "canvas", "themes", "study.css")

# 셸 — 무대·슬라이드 전환·진행 표시·인쇄. 디자인 규칙은 여기 없다.
SHELL = """
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#e9eaec;overflow:hidden;
            font-family:'Pretendard','Pretendard Variable',-apple-system,sans-serif}

  /* 뷰포트에 맞춰 1280×720 을 통째로 스케일한다 */
  #stage{position:fixed;inset:0;display:grid;place-items:center}
  #deck{position:relative;width:1280px;height:720px;transform-origin:center center;
        background:#fff;border:1px solid #d8dbe0}

  .slide{position:absolute;inset:0;display:none;overflow:hidden;background:#fff}
  .slide.on{display:block}

  #prog{position:absolute;left:0;bottom:0;height:4px;background:#1a4fa0;z-index:5}
  #hud{position:fixed;right:14px;top:10px;font-family:'JetBrains Mono',monospace;
       font-size:12px;color:#585f6b;user-select:none;z-index:21}

  @media print{
    html,body{overflow:visible;background:#fff}
    #stage{position:static;display:block}
    #deck{transform:none!important;border:0}
    .slide{display:block!important;position:relative;page-break-after:always}
    #hud,#prog{display:none!important}
  }
"""

SCRIPT = """
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var deck=document.getElementById('deck'),prog=document.getElementById('prog'),
      hud=document.getElementById('hud');
  var i=0;

  // 페이지 번호는 자동 기입한다 — 장표를 넣고 뺄 때마다 손으로 매기면 어긋난다.
  slides.forEach(function(s,k){
    var pg=s.querySelector('.slide-footer-right');
    if(pg) pg.textContent=(k+1)+' / '+slides.length;
  });

  function show(n){
    i=Math.max(0,Math.min(slides.length-1,n));
    slides.forEach(function(s,k){s.classList.toggle('on',k===i);});
    prog.style.width=((i+1)/slides.length*100)+'%';
    hud.textContent=(i+1)+'/'+slides.length;
    if(history.replaceState) history.replaceState(null,'','#'+(i+1));
  }
  function fit(){
    deck.style.transform='scale('+Math.min(innerWidth/1280,innerHeight/720)+')';
  }
  addEventListener('resize',fit);

  addEventListener('keydown',function(e){
    var k=e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k===' '||k==='PageDown'){e.preventDefault();show(i+1);}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){e.preventDefault();show(i-1);}
    else if(k==='Home'){show(0);}
    else if(k==='End'){show(slides.length-1);}
    else if(k==='f'||k==='F'){document.fullscreenElement?document.exitFullscreen()
                                                       :document.documentElement.requestFullscreen();}
    else if(k==='p'||k==='P'){print();}
  });
  addEventListener('click',function(e){
    if(e.target.closest('a')) return;
    show(e.clientX < innerWidth*0.25 ? i-1 : i+1);
  });

  addEventListener('hashchange',function(){
    var h=parseInt((location.hash||'').slice(1),10);
    if(!isNaN(h) && h-1!==i) show(h-1);
  });

  var h=parseInt((location.hash||'').slice(1),10);
  fit(); show(isNaN(h)?0:h-1);
})();
"""


def css() -> str:
    """셸 + 에디터가 쓰는 테마 CSS. 테마가 정본이므로 그대로 읽어 붙인다."""
    with open(THEME, encoding="utf-8") as f:
        return SHELL + "\n" + f.read()
