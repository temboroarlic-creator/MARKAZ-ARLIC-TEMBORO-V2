/* Pengaturan tampilan: 4 tema + warna aksen + ukuran huruf + animasi.
   Dimuat di <head> supaya pilihan langsung berlaku tanpa kedip. Disimpan di HP pengguna (localStorage). */
(function(){
  "use strict";
  var KEY="markaz_tampilan_v1";
  var DEF={tema:"ringan",aksen:"hijau",huruf:"m",animasi:"hemat"};
  var TEMA=[
    {id:"ringan",nama:"Ringan",ket:"Polos dan paling cepat",bg:"#f6faf7",fg:"#176444",bar:"#cfe3d6",meta:"#f6faf7"},
    {id:"malam", nama:"Malam", ket:"Gelap, nyaman di malam hari",bg:"#14201a",fg:"#5fcf9d",bar:"#33463b",meta:"#14201a"},
    {id:"kertas",nama:"Kertas",ket:"Krem hangat, enak untuk membaca",bg:"#f4ecd8",fg:"#176444",bar:"#dccfae",meta:"#f4ecd8"},
    {id:"kaca",  nama:"Kaca",  ket:"Efek kaca, lebih berat",bg:"linear-gradient(135deg,#dff1e6,#f4faf6)",fg:"#176444",bar:"#b9d9c6",meta:"#edf5ef"}
  ];
  var AKSEN=[{id:"hijau",c:"#176444",n:"Hijau"},{id:"biru",c:"#2563a8",n:"Biru"},{id:"ungu",c:"#6d4aa8",n:"Ungu"},{id:"marun",c:"#a3394a",n:"Marun"},{id:"emas",c:"#a8741a",n:"Emas"}];
  var HURUF=[{id:"s",n:"Kecil"},{id:"m",n:"Sedang"},{id:"l",n:"Besar"}];
  var ANIM=[{id:"hemat",n:"Hemat (disarankan)"},{id:"penuh",n:"Penuh"}];
  var ICON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';

  function ids(list){return list.map(function(x){return x.id;});}
  function load(){
    var s={};try{s=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){}
    var o={};
    o.tema=ids(TEMA).indexOf(s.tema)>-1?s.tema:DEF.tema;
    o.aksen=ids(AKSEN).indexOf(s.aksen)>-1?s.aksen:DEF.aksen;
    o.huruf=ids(HURUF).indexOf(s.huruf)>-1?s.huruf:DEF.huruf;
    o.animasi=ids(ANIM).indexOf(s.animasi)>-1?s.animasi:DEF.animasi;
    return o;
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
  var S=load();

  // ---- tema "kaca": berkas efek hanya dimuat bila dipilih ----
  function glass(on){
    var head=document.head,exist=document.getElementById("mz-kaca-css");
    if(on&&!exist){
      ["glass.css","glass-motion.css"].forEach(function(f,i){
        var l=document.createElement("link");l.rel="stylesheet";l.href="assets/css/"+f;l.id=i?"mz-kaca-css2":"mz-kaca-css";head.appendChild(l);
      });
      var go=function(){
        if(document.getElementById("mz-kaca-js"))return;
        var s=document.createElement("script");s.src="assets/js/glass-motion.js";s.id="mz-kaca-js";document.body.appendChild(s);
      };
      if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
    }
    if(!on){
      ["mz-kaca-css","mz-kaca-css2"].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});
    }
  }
  function apply(){
    var h=document.documentElement;
    h.setAttribute("data-tema",S.tema);h.setAttribute("data-aksen",S.aksen);
    h.setAttribute("data-huruf",S.huruf);h.setAttribute("data-animasi",S.animasi);
    glass(S.tema==="kaca");
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute("content",TEMA.filter(function(t){return t.id===S.tema;})[0].meta);
  }
  apply();

  // ---- antarmuka ----
  var fab,sheet,lastFocus;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function group(label,body){return '<p class="mz-tema-lbl">'+label+'</p>'+body;}
  function build(){
    var temaHtml='<div class="mz-tema-grid">'+TEMA.map(function(t){
      return '<button type="button" class="mz-opt" data-k="tema" data-v="'+t.id+'"><span class="mz-sw" style="background:'+t.bg+'"><i style="background:'+t.fg+'"></i><b style="background:'+t.bar+'"></b></span><strong>'+t.nama+'</strong><small>'+t.ket+'</small></button>';
    }).join("")+'</div>';
    var aksenHtml='<div class="mz-aksen">'+AKSEN.map(function(a){
      return '<button type="button" class="mz-dot" data-k="aksen" data-v="'+a.id+'" aria-label="'+a.n+'" title="'+a.n+'" style="background:'+a.c+'"></button>';
    }).join("")+'</div>';
    var seg=function(k,list){return '<div class="mz-seg">'+list.map(function(x){return '<button type="button" class="mz-opt" data-k="'+k+'" data-v="'+x.id+'">'+x.n+'</button>';}).join("")+'</div>';};
    sheet=document.createElement("div");
    sheet.className="mz-tema-sheet";sheet.hidden=true;
    sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");sheet.setAttribute("aria-label","Pengaturan tampilan");
    sheet.innerHTML='<div class="mz-tema-scrim"></div><div class="mz-tema-panel">'+
      '<div class="mz-tema-head"><strong>Tampilan</strong><button type="button" class="mz-tema-x" aria-label="Tutup">✕</button></div>'+
      group("Tema",temaHtml)+group("Warna aksen",aksenHtml)+group("Ukuran huruf",seg("huruf",HURUF))+group("Animasi",seg("animasi",ANIM))+
      '<button type="button" class="mz-reset">Kembalikan ke bawaan (Ringan)</button></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener("click",function(ev){
      var t=ev.target;
      if(t.classList.contains("mz-tema-scrim")||t.closest(".mz-tema-x")){close();return;}
      if(t.closest(".mz-reset")){S=Object.assign({},DEF);save();apply();mark();return;}
      var b=t.closest("[data-k]");if(!b)return;
      S[b.getAttribute("data-k")]=b.getAttribute("data-v");save();apply();mark();
    });
    document.addEventListener("keydown",function(ev){if(ev.key==="Escape"&&!sheet.hidden)close();});
  }
  function mark(){
    sheet.querySelectorAll("[data-k]").forEach(function(b){
      b.setAttribute("aria-pressed",S[b.getAttribute("data-k")]===b.getAttribute("data-v")?"true":"false");
    });
  }
  function open(){
    if(!sheet)build();
    lastFocus=document.activeElement;mark();sheet.hidden=false;
    var f=sheet.querySelector('.mz-opt[aria-pressed="true"]');if(f)f.focus();
  }
  function close(){sheet.hidden=true;try{lastFocus&&lastFocus.focus();}catch(e){}}

  function inject(){
    var hdr=document.querySelector("#root header.sticky");
    if(!hdr){fab.classList.add("mz-show");return;}
    if(hdr.querySelector(".mz-tema-hdrbtn")){fab.classList.remove("mz-show");return;}
    var ref=hdr.querySelector('button[aria-label="Uji hafalan kuis"]');
    var box=ref&&ref.parentElement;
    if(!box){fab.classList.add("mz-show");return;}
    var b=document.createElement("button");
    b.type="button";b.className=ref.className+" mz-tema-hdrbtn";b.title="Tampilan";b.setAttribute("aria-label","Pengaturan tampilan");
    b.innerHTML=ICON+'<span class="hidden sm:inline">Tampilan</span>';
    b.addEventListener("click",open);
    box.insertBefore(b,box.firstChild);
    fab.classList.remove("mz-show");
  }
  function init(){
    fab=document.createElement("button");
    fab.type="button";fab.className="mz-tema-fab";fab.title="Tampilan";fab.setAttribute("aria-label","Pengaturan tampilan");fab.innerHTML=ICON;
    fab.addEventListener("click",open);document.body.appendChild(fab);
    var root=document.getElementById("root"),queued=false;
    function q(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;inject();});}
    if(root)new MutationObserver(q).observe(root,{childList:true,subtree:true});
    inject();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  window.MARKAZ_TAMPILAN={buka:open,get:function(){return Object.assign({},S);}};
})();
