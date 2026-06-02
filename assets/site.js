/* 全ページ共通：ローディング（「鯉」を丸で囲む。円が一周描き終わったら少し待ってフェードアウト）
   TOPの初回・下層への遷移時を含め、毎回かならず一瞬表示する。 */
(function(){
  const l=document.getElementById('loader');
  if(!l)return;
  let done=false;
  const finish=()=>{
    if(done)return;done=true;
    l.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(()=>l.remove(),850);
  };
  const ring=l.querySelector('.ld-ring circle');
  if(ring){ring.addEventListener('animationend',()=>setTimeout(finish,250),{once:true});}
  // 保険：2.4秒で必ず閉じる
  setTimeout(finish,2400);
})();

/* Contact：メールアドレスのアンカーをクリックでクリップボードにコピー */
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
