/* =========================================================
   鯉江 昂 — Portfolio  全ページ共通スクリプト
   ========================================================= */

/* ---- ローディング（鯉○）＋ 端末の傾き許可取得 ----------------------
   ・円を約1.9秒かけてゆっくり一周描く → 鯉を表示
   ・iOS 等（requestPermission が必要）で未許可のときだけ、円の下に
     案内文＋OK ボタンをふわっと表示する
   ・OK で DeviceOrientationEvent.requestPermission() を実行し、応答後に
     ローディングをフェードアウト
   ・PC / Android / 許可済み は案内を出さず、アニメーション後にそのまま閉じる
   ・許可結果は window.tiltPermission（Promise）と sessionStorage で
     全ページ・work.js・ヒーロー切替に共有する
   ・全ページに #loader があるため、TOP 初回も下層遷移も毎回表示される */
(function(){
  const D=window.DeviceOrientationEvent;
  const needPerm=typeof D!=='undefined'&&typeof D.requestPermission==='function';
  let already=false; try{already=sessionStorage.getItem('tiltGranted')==='1';}catch(e){}

  // 傾きを使う側（work.js / ヒーロー）が参照する共有 Promise
  let resolveTilt;
  window.tiltPermission=new Promise(r=>{resolveTilt=r;});
  const grant=s=>{ if(s==='granted'){try{sessionStorage.setItem('tiltGranted','1');}catch(e){}} resolveTilt(s); };
  if(!needPerm) grant('granted');            // Android 等は許可不要
  else if(already) grant('granted');          // 前ページで取得済み

  const l=document.getElementById('loader');
  if(!l) return;
  let done=false;
  const finish=()=>{
    if(done)return;done=true;
    l.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(()=>{ if(l.parentNode)l.remove(); },850);
  };

  // iOS で未許可のときだけ、案内＋OK を出してそこで許可を取る
  const showPrompt = needPerm && !already;

  const afterRing=()=>{
    if(!showPrompt){ setTimeout(finish,260); return; }
    const box=document.createElement('div');
    box.className='ld-ask';
    box.innerHTML='<p class="ld-ask-txt">このサイトでは、スマートフォンを傾けると一部の表示が変化します。</p><button type="button" class="ld-ask-ok">OK</button>';
    l.appendChild(box);
    requestAnimationFrame(()=>box.classList.add('show'));
    box.querySelector('.ld-ask-ok').addEventListener('click',function(){
      this.disabled=true;
      Promise.resolve().then(()=>D.requestPermission())
        .then(grant).catch(()=>grant('denied'))
        .then(finish,finish);
    },{once:true});
  };

  const ring=l.querySelector('.ld-ring circle');
  if(ring) ring.addEventListener('animationend',afterRing,{once:true});
  else afterRing();
  // 保険：案内を出さないケースのみ自動クローズ（案内表示時は OK 待ち）
  if(!showPrompt) setTimeout(finish,4200);
})();

/* ---- TOP ヒーロー：カメレオンの瞳が訪問者を追う ----
   メインコピー「360°の目でユーザーを読み〜」の体現。画像切替はしない。
   目を白く塗った chameleon_noeyes.jpg の上に、CSS の黒丸（.cham-pupil）を
   重ね、スマホは傾き(gamma/beta)／PC はマウス位置に応じて瞳を少し動かす。
   index.html に .chameleon-bg > .cham-pupil があるときだけ動く。
   動きは小さく・なめらかに（さりげなく）。 */
(function(){
  const box=document.querySelector('.chameleon-bg');
  if(!box) return;
  const pupil=box.querySelector('.cham-pupil');
  if(!pupil) return;

  // 目標位置(tx,ty)へ現在値(cx,cy)を毎フレーム近づける。範囲は -1〜1。
  let tx=0,ty=0,cx=0,cy=0;
  const loop=()=>{
    cx+=(tx-cx)*0.09; cy+=(ty-cy)*0.09;
    const r=box.getBoundingClientRect();
    const m=r.width*0.028;            // 可動量＝画像幅の約2.8%（瞳が目から出ない範囲）
    pupil.style.transform='translate(calc(-50% + '+(cx*m).toFixed(2)+'px), calc(-50% + '+(cy*m).toFixed(2)+'px))';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const clamp=v=>Math.max(-1,Math.min(1,v));
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(fine){
    // PC：マウス位置（中央=0、端=±1）
    window.addEventListener('mousemove',e=>{
      tx=clamp(e.clientX/Math.max(1,innerWidth)*2-1);
      ty=clamp(e.clientY/Math.max(1,innerHeight)*2-1);
    });
  }else{
    // スマホ：端末の傾き（許可は上のローディングで取得済み）
    (window.tiltPermission||Promise.resolve('granted')).then(s=>{
      if(s!=='granted')return;
      window.addEventListener('deviceorientation',e=>{
        tx=clamp((e.gamma||0)/35);        // 左右の傾き
        ty=clamp(((e.beta||0)-40)/35);    // 前後の傾き（持つ角度40°を中立に）
      });
    });
  }
})();

/* ---- About me（info.html）：アバターのカメレオンが傾き/マウスで表情切替 ----
   通常=profile_camereon.jpg / 傾き小(10-25)=a / 傾き大(25-)=b /
   反対方向=c・d。PC はマウス X 座標で左→中央→右に応じて変化。クロスフェード。
   .avatar-cham のレイヤ構造があるときだけ動く（画像は事前デコードでちらつき防止）。 */
(function(){
  const box=document.querySelector('.avatar-cham');
  if(!box) return;
  const layerEls=box.querySelectorAll('.av-layer');
  if(!layerEls.length) return;

  const layers={};
  layerEls.forEach(im=>{layers[im.dataset.tilt]=im;});
  layerEls.forEach(im=>{ const p=new Image(); p.src=im.currentSrc||im.src; });  // preload

  let current=null;
  const show=key=>{
    if(!layers[key]||current===key)return;
    layerEls.forEach(im=>im.classList.remove('is-on'));
    layers[key].classList.add('is-on');
    current=key;
  };
  show('neutral');

  const fromGamma=g=>{
    const a=Math.abs(g);
    if(a<10) return 'neutral';
    if(g>0) return a<25 ? 'a' : 'b';   // 一方向に傾ける
    return a<25 ? 'c' : 'd';           // 反対方向に傾ける
  };

  const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  let ticking=false;
  if(!fine){
    (window.tiltPermission||Promise.resolve('granted')).then(s=>{
      if(s!=='granted')return;
      window.addEventListener('deviceorientation',e=>{
        if(ticking)return;ticking=true;
        requestAnimationFrame(()=>{ticking=false;show(fromGamma(e.gamma||0));});
      });
    });
  }else{
    window.addEventListener('mousemove',e=>{
      if(ticking)return;ticking=true;
      requestAnimationFrame(()=>{
        ticking=false;
        const r=e.clientX/Math.max(1,window.innerWidth);
        let k='neutral';
        if(r<0.2)k='d'; else if(r<0.4)k='c'; else if(r<0.6)k='neutral'; else if(r<0.8)k='a'; else k='b';
        show(k);
      });
    });
  }
})();

/* ---- Contact：メールアドレスのアンカーをクリックでクリップボードにコピー ---- */
(function(){
  const mails=document.querySelectorAll('.copy-mail');
  if(!mails.length)return;
  const fallback=(text)=>{
    const t=document.createElement('textarea');
    t.value=text;t.setAttribute('readonly','');
    t.style.position='fixed';t.style.opacity='0';t.style.pointerEvents='none';
    document.body.appendChild(t);t.select();
    try{document.execCommand('copy');}catch(e){}
    document.body.removeChild(t);
  };
  mails.forEach(el=>{
    el.setAttribute('role','button');
    el.setAttribute('aria-live','polite');
    el.addEventListener('click',e=>{
      e.preventDefault();
      if(el.classList.contains('copied'))return;
      const mail=el.dataset.mail||el.textContent.trim();
      const original=el.textContent;
      const reset=()=>{el.textContent=original;el.classList.remove('copied');};
      const ok=()=>{el.textContent='コピーしました ✓';el.classList.add('copied');setTimeout(reset,1600);};
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(mail).then(ok).catch(()=>{fallback(mail);ok();});
      }else{fallback(mail);ok();}
    });
  });
})();
