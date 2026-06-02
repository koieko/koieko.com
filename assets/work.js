/* work.html 専用：二層構造ギミック（PCはクリックで開閉／スマホは傾き）＋フィルター */
(function(){
  const works=[...document.querySelectorAll('#worklist .work')];
  if(!works.length)return;

  // スクロールで順にフェードイン
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.15});
  works.forEach(w=>io.observe(w));

  const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  if(fine){
    // PC：クリックで開閉（ホバーは廃止。気づいてもらう設計）
    works.forEach(w=>{
      w.style.cursor='pointer';
      w.addEventListener('click',()=>w.classList.toggle('peek'));
    });
  }else{
    // スマホ：端末の傾きのみ（タップでの開閉は廃止）
    function enableTilt(){
      window.addEventListener('deviceorientation',e=>{
        const g=e.gamma||0;
        const peeking=Math.abs(g)>22;
        let best=null,bestDist=1e9;const cy=innerHeight/2;
        works.forEach(w=>{
          if(w.classList.contains('hide'))return;
          const r=w.getBoundingClientRect();
          const d=Math.abs((r.top+r.bottom)/2-cy);
          if(d<bestDist){bestDist=d;best=w;}
        });
        works.forEach(w=>{if(w!==best)w.classList.remove('peek');});
        if(best)best.classList.toggle('peek',peeking);
      });
    }
    const needPerm=typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function';
    if(needPerm){
      const ask=()=>{DeviceOrientationEvent.requestPermission().then(s=>{if(s==='granted')enableTilt();}).catch(()=>{});document.removeEventListener('touchend',ask);};
      document.addEventListener('touchend',ask,{once:true});
    }else{enableTilt();}
  }

  // フィルター
  const btns=document.querySelectorAll('#filters button');
  btns.forEach(b=>b.addEventListener('click',()=>{
    btns.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const f=b.dataset.f;
    works.forEach(w=>w.classList.toggle('hide',!(f==='all'||w.dataset.cat===f)));
  }));
})();
