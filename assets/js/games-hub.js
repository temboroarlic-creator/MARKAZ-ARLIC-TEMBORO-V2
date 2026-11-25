/* Katalog game tambahan + peluncur layar penuh.
   Setiap game adalah file sendiri di folder games/ dan hanya dimuat saat diklik. */
(function(){
  "use strict";
  const ROOT=document.getElementById("root");
  if(!ROOT || window.__MARKAZ_EXTRA_GAMES__) return;
  window.__MARKAZ_EXTRA_GAMES__=true;

  const GROUPS=[
    {name:"Tamhidi",ids:[0,1],desc:"Dasar"},
    {name:"Mubtadi",ids:[2,3],desc:"Pemula"},
    {name:"Mutawassith",ids:[4,5],desc:"Menengah"},
    {name:"Mutaqoddim",ids:[6,7],desc:"Lanjutan"}
  ];
  const LEVEL_FALLBACK=["Tamhidi 1","Tamhidi 2","Mubtadi 1","Mubtadi 2","Mutawassith 1","Mutawassith 2","Mutaqoddim 1","Mutaqoddim 2"];
  const state={game:null,selected:[0,1,2,3,4,5,6,7],entries:[]};

  const overlay=document.createElement("div");
  overlay.id="markaz-extra-game-overlay";
  overlay.innerHTML=`
    <header class="meo-header">
      <div class="meo-header-left">
        <button class="meo-btn" id="meo-back" type="button">← Katalog Game</button>
        <div class="meo-heading">
          <strong id="meo-game-title">Game Markaz</strong>
          <small id="meo-game-subtitle">Pilih marhalah soal</small>
        </div>
      </div>
      <div class="meo-header-actions">
        <button class="meo-btn" id="meo-change" type="button" hidden>Ganti Marhalah</button>
        <button class="meo-btn" id="meo-fullscreen" type="button" hidden>⛶ Layar Penuh</button>
      </div>
    </header>
    <div class="meo-content" id="meo-content">
      <section class="meo-picker" id="meo-picker">
        <div class="meo-kicker">Markaz Lughoh Temboro · Bank Soal Terpadu</div>
        <h2 class="meo-title">Pilih marhalah sumber soal</h2>
        <p class="meo-desc">Soal akan dibuat langsung dari data mufrodat dan ta'birot (ungkapan) yang sudah tersedia di Markaz. Pilih satu marhalah, beberapa marhalah, atau seluruhnya. Pilihan ini berlaku untuk game yang sedang dibuka.</p>
        <div class="meo-section-label"><span>Kelompok marhalah</span><div class="meo-quick"><button type="button" data-meo-all>Semua marhalah</button><button type="button" data-meo-none>Kosongkan pilihan</button></div></div>
        <div class="meo-group-grid" id="meo-groups"></div>
        <div class="meo-section-label"><span>Pilih marhalah secara spesifik</span><span style="font-size:10px;font-weight:600;color:#718276">8 tingkat tersedia</span></div>
        <div class="meo-level-grid" id="meo-levels"></div>
        <div class="meo-summary" id="meo-summary">Memuat bank soal Markaz…</div>
        <div class="meo-error" id="meo-error" role="status"></div>
        <div class="meo-start-row">
          <span style="font-size:11px;color:#748276;line-height:1.5">Kuis Miliarder menggunakan 15 tingkat pertanyaan. SABIQ menggunakan 10 pertanyaan pada setiap balapan.</span>
          <button class="meo-btn primary" id="meo-start" type="button">Mulai Game →</button>
        </div>
      </section>
      <section class="meo-stage" id="meo-stage" hidden>
        <iframe class="meo-frame" id="meo-frame" title="Game Bahasa Arab Markaz" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
      </section>
    </div>`;
  document.body.appendChild(overlay);

  const $=(sel)=>overlay.querySelector(sel);
  const frame=$("#meo-frame");
  // Setiap game = satu file terpisah, baru dimuat ketika kartunya diklik.
  const gameTitles={
    miliarder:"Kuis Miliarder Bahasa Arab",
    sabiq:"SABIQ Arabic Racing",
    duck:"Game Undi Bebek",
    pacuan:"Pacuan Santri Temboro"
  };
  const GAME_URL={
    miliarder:"games/miliarder/index.html",
    sabiq:"games/sabiq/index.html",
    duck:"games/bebek/index.html",
    pacuan:"games/pacuan/index.html"
  };
  function resetFrame(){frame.removeAttribute("srcdoc");frame.src="about:blank";}
  function loadGame(id){frame.removeAttribute("srcdoc");frame.src=GAME_URL[id];}

  function esc(s){
    return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function shuffle(a){
    const out=a.slice();
    for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function norm(s){return String(s??"").trim().toLowerCase().replace(/\s+/g," ");}
  function sourceBank(){return Array.isArray(window.__MARKAZ_QUIZ_BANK)?window.__MARKAZ_QUIZ_BANK:[];}
  function levelLabel(i){
    const meta=(window.__MARKAZ_MARHALAH_META||[])[i];
    let label=meta&&meta.name?meta.name:LEVEL_FALLBACK[i];
    return String(label||LEVEL_FALLBACK[i]).replace(/^Mutaqodim/,"Mutaqoddim");
  }
  function getEntries(ids){
    const bank=sourceBank(),out=[],seen=new Set();
    [...ids].sort((a,b)=>a-b).forEach(idx=>{
      const mar=bank[idx];
      if(!mar || !Array.isArray(mar.lessons))return;
      mar.lessons.forEach(lesson=>{
        ["words","expressions"].forEach(section=>{
          (lesson[section]||[]).forEach(entry=>{
            const ar=String(entry.ar||"").trim(),id=String(entry.id||"").trim();
            // Use the same concise-entry rule as the existing Pacuan Santri game.
            if(!ar||!id||ar.length>26||id.length>30||seen.has(ar))return;
            seen.add(ar);
            out.push({ar,id,marhalah:mar.marhalah,lesson:lesson.id_title||""});
          });
        });
      });
    });
    return out;
  }
  function updateSummary(){
    state.entries=getEntries(state.selected);
    const count=state.entries.length;
    const chosen=state.selected.length;
    $("#meo-summary").textContent=sourceBank().length
      ? `${chosen} marhalah dipilih · ${count.toLocaleString("id-ID")} mufrodat dan ungkapan tersedia. Sumber soal: data kurikulum Markaz, bukan bank soal contoh dari game.`
      : "Data kurikulum Markaz belum termuat. Muat ulang aplikasi dan pastikan data marhalah tersedia.";
    $("#meo-start").disabled=chosen===0||count<4;
    $("#meo-error").textContent=chosen===0?"Pilih minimal satu marhalah terlebih dahulu.":count<4?"Data pada pilihan ini belum cukup untuk membuat soal.":"";
  }
  function renderPicker(){
    const groupBox=$("#meo-groups");
    groupBox.innerHTML=GROUPS.map((g,i)=>{
      const active=g.ids.every(id=>state.selected.includes(id));
      const count=getEntries(g.ids).length;
      return `<button type="button" class="meo-choice ${active?"active":""}" data-meo-group="${i}" aria-pressed="${active}">
        <strong>${esc(g.name)}</strong><small>${esc(g.desc)} · ${count.toLocaleString("id-ID")} entri</small>
      </button>`;
    }).join("");
    const levelBox=$("#meo-levels");
    levelBox.innerHTML=LEVEL_FALLBACK.map((fallback,i)=>{
      const active=state.selected.includes(i);
      const count=getEntries([i]).length;
      return `<button type="button" class="meo-choice ${active?"active":""}" data-meo-level="${i}" aria-pressed="${active}">
        <strong>${esc(levelLabel(i))}</strong><small>${count.toLocaleString("id-ID")} mufrodat & ungkapan</small>
      </button>`;
    }).join("");
    updateSummary();
  }
  function setHeader(){
    $("#meo-game-title").textContent=gameTitles[state.game]||"Game Markaz";
    $("#meo-game-subtitle").textContent="Pilih marhalah soal dari Tamhidi sampai Mutaqoddim";
  }
  function openGamePicker(id){
    state.game=id;
    state.selected=[0,1,2,3,4,5,6,7];
    if(id==="duck"){
      setHeader();
      $("#meo-picker").hidden=true;
      $("#meo-stage").hidden=false;
      $("#meo-change").hidden=true;
      $("#meo-fullscreen").hidden=false;
      $("#meo-game-subtitle").textContent="Undi peserta dengan balapan bebek";
      loadGame("duck");
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden","false");
      document.body.style.overflow="hidden";
      return;
    }
    setHeader();
    $("#meo-picker").hidden=false;
    $("#meo-stage").hidden=true;
    $("#meo-change").hidden=true;
    $("#meo-fullscreen").hidden=true;
    resetFrame();
    renderPicker();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeOverlay(){
    exitFullscreen();
    resetFrame();
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
    state.game=null;
  }
  function returnToPicker(){
    resetFrame();
    $("#meo-picker").hidden=false;
    $("#meo-stage").hidden=true;
    $("#meo-change").hidden=true;
    $("#meo-fullscreen").hidden=true;
    setHeader();
    renderPicker();
  }
  function randomDistractors(entries,target,key){
    const seen=new Set([norm(target[key])]);
    const values=[];
    for(const e of entries){
      const v=String(e[key]||"").trim(),n=norm(v);
      if(!n||seen.has(n))continue;
      seen.add(n);values.push(v);
    }
    return shuffle(values).slice(0,3);
  }
  function buildMiliarderDB(entries){
    const forms=[];
    entries.forEach(e=>{
      const wrongId=randomDistractors(entries,e,"id");
      if(wrongId.length===3)forms.push({q:`Arti kata "${e.ar}" adalah…`,correct:e.id,wrong:wrongId});
      const wrongAr=randomDistractors(entries,e,"ar");
      if(wrongAr.length===3)forms.push({q:`Bahasa Arab dari "${e.id}" adalah…`,correct:e.ar,wrong:wrongAr});
    });
    if(!forms.length)return [];
    return forms.map((f,i)=>{
      const level=Math.min(15,1+Math.floor(i*15/forms.length));
      return [level,f.q,f.correct,f.wrong[0],f.wrong[1],f.wrong[2]];
    });
  }
  function buildSetup(entries){
    const labels=state.selected.slice().sort((a,b)=>a-b).map(levelLabel);
    return {
      marhalahIndices:state.selected.slice().sort((a,b)=>a-b),
      marhalahLabels:labels,
      sourceCount:entries.length,
      raceV:entries.map(e=>[e.ar,e.id]),
      miliarderDB:buildMiliarderDB(entries)
    };
  }
  function startSelectedGame(){
    const entries=getEntries(state.selected);
    if(entries.length<4){updateSummary();return;}
    try{
      window.__MARKAZ_GAME_SETUP=buildSetup(entries);
      $("#meo-picker").hidden=true;
      $("#meo-stage").hidden=false;
      $("#meo-change").hidden=false;
      $("#meo-fullscreen").hidden=false;
      $("#meo-game-subtitle").textContent=`Soal Markaz · ${state.selected.length} marhalah · ${entries.length.toLocaleString("id-ID")} entri`;
      loadGame(state.game);
    }catch(err){
      $("#meo-error").textContent=err&&err.message?err.message:"Game gagal disiapkan.";
      console.error("[Markaz Extra Games]",err);
    }
  }

  $("#meo-back").addEventListener("click",closeOverlay);
  $("#meo-change").addEventListener("click",returnToPicker);
  overlay.insertAdjacentHTML("beforeend",'<button class="meo-btn meo-pfs-exit" id="meo-pfs-exit" type="button">✕ Keluar layar penuh</button>');
  const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
  function isFullscreen(){return !!fsElement()||overlay.classList.contains("meo-pfs");}
  function unlockOrientation(){try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock();}catch(e){}}
  async function enterFullscreen(){
    try{
      if(frame.requestFullscreen)await frame.requestFullscreen({navigationUI:"hide"});
      else if(frame.webkitRequestFullscreen)frame.webkitRequestFullscreen();
      else throw new Error("fullscreen-unsupported");
      try{await screen.orientation.lock("landscape");}catch(e){}
    }catch(e){
      overlay.classList.add("meo-pfs"); // cadangan: overlay menutupi seluruh layar
    }
    try{frame.focus();}catch(e){}
  }
  function exitFullscreen(){
    if(fsElement()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}
    overlay.classList.remove("meo-pfs");
    unlockOrientation();
  }
  $("#meo-fullscreen").addEventListener("click",()=>{isFullscreen()?exitFullscreen():enterFullscreen();});
  $("#meo-pfs-exit").addEventListener("click",exitFullscreen);
  document.addEventListener("fullscreenchange",()=>{if(!fsElement())unlockOrientation();});
  document.addEventListener("keydown",ev=>{
    if(ev.key==="Escape"&&overlay.classList.contains("is-open")&&!fsElement()){
      if(overlay.classList.contains("meo-pfs"))exitFullscreen();else closeOverlay();
    }
  });
  $("#meo-start").addEventListener("click",startSelectedGame);
  $("#meo-groups").addEventListener("click",ev=>{
    const btn=ev.target.closest("[data-meo-group]");
    if(!btn)return;
    const group=GROUPS[Number(btn.dataset.meoGroup)];
    if(!group)return;
    const full=group.ids.every(id=>state.selected.includes(id));
    state.selected=full?state.selected.filter(id=>!group.ids.includes(id)):[...new Set([...state.selected,...group.ids])].sort((a,b)=>a-b);
    renderPicker();
  });
  $("#meo-levels").addEventListener("click",ev=>{
    const btn=ev.target.closest("[data-meo-level]");
    if(!btn)return;
    const idx=Number(btn.dataset.meoLevel);
    state.selected=state.selected.includes(idx)?state.selected.filter(x=>x!==idx):[...state.selected,idx].sort((a,b)=>a-b);
    renderPicker();
  });
  $("#meo-picker").addEventListener("click",ev=>{
    if(ev.target.closest("[data-meo-all]")){state.selected=[0,1,2,3,4,5,6,7];renderPicker();}
    if(ev.target.closest("[data-meo-none]")){state.selected=[];renderPicker();}
  });
  // Pacuan Santri: marhalah dipilih di halamannya sendiri, lalu game dibuka di sini (layar penuh tersedia).
  function play(id,setup){
    state.game=id;
    if(id==="pacuan")window.__PACUAN={w:(setup&&setup.w)||[]};
    setHeader();
    $("#meo-game-subtitle").textContent=(setup&&setup.labels&&setup.labels.length)?"Soal: "+setup.labels.join(", "):"";
    $("#meo-picker").hidden=true;
    $("#meo-stage").hidden=false;
    $("#meo-change").hidden=true;
    $("#meo-fullscreen").hidden=false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    loadGame(id);
  }
  window.MARKAZ_GAMES_HUB={open:openGamePicker,play:play,version:"2.0.0"};

  document.addEventListener("click",ev=>{
    const btn=ev.target.closest("[data-markaz-extra-game]");
    if(btn){ev.preventDefault();openGamePicker(btn.dataset.markazExtraGame);}
  });

  function addCards(){
    // Buang blok tambahan yang tertinggal saat pengguna sudah pindah ke halaman lain / membuka game.
    ROOT.querySelectorAll(".markaz-extra-games").forEach(sec=>{if(!sec.closest("main.markaz-games-list-page"))sec.remove();});
    const main=ROOT.querySelector("main.markaz-games-list-page");
    if(!main)return;
    if(!main.querySelector(".markaz-extra-games")){
      const section=document.createElement("section");
      section.className="markaz-extra-games";
      section.innerHTML=`
        <div class="meg-head">
          <div><div class="meg-kicker">MARKAZ LUGHOH TEMBORO · GAME BARU</div>
            <h2 class="meg-title">Game Tantangan & Balapan</h2>
            <p class="meg-desc">Permainan tambahan Markaz untuk belajar bahasa Arab dan kegiatan undian peserta.</p>
          </div>
          <span class="meg-count">2 GAME BARU</span>
        </div>
        <div class="meg-grid">
          <article class="meg-card">
            <div>
              <div class="meg-top"><span class="meg-icon">🏆</span><span class="meg-badge">Kuis Bertingkat</span></div>
              <div class="meg-ar" lang="ar">مِلْيَارْدِيرُ اللُّغَةِ الْعَرَبِيَّةِ</div>
              <h3>Kuis Miliarder Bahasa Arab</h3>
              <p>15 tingkat hadiah, empat bantuan, dan dua titik aman. Pertanyaan pilihan ganda dibuat dari kosakata dan ungkapan Markaz sesuai marhalah yang dipilih.</p>
            </div>
            <button type="button" class="meg-play" data-markaz-extra-game="miliarder"><span>Mainkan Kuis Miliarder</span><span>→</span></button>
          </article>
          <article class="meg-card">
            <div>
              <div class="meg-top"><span class="meg-icon">🏎️</span><span class="meg-badge">Balap & Kuis</span></div>
              <div class="meg-ar" lang="ar">سِبَاقُ الْعَرَبِيَّةِ</div>
              <h3>SABIQ Arabic Racing</h3>
              <p>Balapan dengan papan jawaban أ، ب، ج. Soal bahasa Arab di lintasan mengambil data Markaz dan mengikuti marhalah yang dipilih.</p>
            </div>
            <button type="button" class="meg-play" data-markaz-extra-game="sabiq"><span>Mainkan SABIQ Arabic Racing</span><span>→</span></button>
          </article>
        </div>`;
      main.appendChild(section);
    }
    const p=[...main.querySelectorAll("p")].find(el=>el.textContent.includes("Koleksi 12 permainan"));
    if(p)p.textContent=p.textContent.replace("Koleksi 12 permainan","Koleksi 14 permainan");
    const tab=[...main.querySelectorAll("button")].find(el=>el.textContent.includes("Semua Game (12 Mode)"));
    if(tab)tab.textContent=tab.textContent.replace("Semua Game (12 Mode)","Semua Game (14 Mode)");
    const section=main.querySelector(".markaz-extra-games");
    const active=[...main.querySelectorAll(".markaz-games-tabs button")].find(el=>el.classList.contains("bg-primary"));
    const label=active?active.textContent:"";
    const show=!label||label.includes("Semua Game")||label.includes("Game Interaktif");
    if(section)section.style.display=show?"":"none";
  }
  document.addEventListener("click",ev=>{
    if(ev.target.closest("#root .markaz-games-tabs button")){
      requestAnimationFrame(()=>requestAnimationFrame(addCards));
    }
  });
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;addCards();});
  });
  observer.observe(ROOT,{childList:true,subtree:true});
  addCards();
})();
