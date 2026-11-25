(function(){
  const root=document.getElementById('root');
  if(!root)return;
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scheduled=false;
  function animatePage(){
    scheduled=false;
    const main=root.querySelector('.ios-app-shell > main');
    if(!main||reduced||document.documentElement.getAttribute('data-tema')!=='kaca')return;
    main.classList.remove('ios-page-enter');
    void main.offsetWidth;
    main.classList.add('ios-page-enter');
    const finish=function(ev){
      if(ev.target===main&&ev.animationName==='iosPageEnter'){
        main.classList.remove('ios-page-enter');
        main.removeEventListener('animationend',finish);
      }
    };
    main.addEventListener('animationend',finish);
  }
  function schedulePageAnimation(){
    if(scheduled||reduced)return;
    scheduled=true;
    requestAnimationFrame(animatePage);
  }
  const observer=new MutationObserver(function(records){
    const shouldAnimate=records.some(function(record){
      const target=record.target;
      return target===root||
        target.classList?.contains('ios-app-shell')||
        target.matches?.('#root main');
    });
    if(shouldAnimate)schedulePageAnimation();
  });
  observer.observe(root,{childList:true,subtree:true});

  if(!reduced){
    const cardSelector='#root main button[class*="rounded-3xl"], #root main [class*="bg-card"][class*="rounded-3xl"]';
    document.addEventListener('pointermove',function(event){
      if(event.pointerType==='touch'||document.documentElement.getAttribute('data-tema')!=='kaca')return;
      const card=event.target.closest?.(cardSelector);
      if(!card)return;
      const rect=card.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      const y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
      card.style.setProperty('--ios-glow-x',(x*100).toFixed(1)+'%');
      card.style.setProperty('--ios-glow-y',(y*100).toFixed(1)+'%');
      card.style.setProperty('--ios-glow-opacity','.42');
      card.style.setProperty('--ios-tilt-x',((x-.5)*1.8).toFixed(2)+'deg');
      card.style.setProperty('--ios-tilt-y',((.5-y)*1.4).toFixed(2)+'deg');
    },{passive:true});
    document.addEventListener('pointerout',function(event){
      const card=event.target.closest?.(cardSelector);
      if(!card||card.contains(event.relatedTarget))return;
      card.style.setProperty('--ios-tilt-x','0deg');
      card.style.setProperty('--ios-tilt-y','0deg');
      card.style.setProperty('--ios-glow-opacity','.14');
    },{passive:true});
  }
  schedulePageAnimation();
})();
