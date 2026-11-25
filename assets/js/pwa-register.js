/* Mendaftarkan service worker (sw.js) dan memberi tahu pengguna bila ada berkas yang diperbarui. */
(function(){
  if(!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").catch(function(e){console.warn("Service worker gagal didaftarkan:",e);});
  });
  var shown=false;
  navigator.serviceWorker.addEventListener("message",function(ev){
    if(shown||!ev.data||ev.data.type!=="markaz-updated") return;
    shown=true;
    var bar=document.createElement("div");
    bar.setAttribute("role","status");
    bar.style.cssText="position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483600;"+
      "display:flex;gap:10px;align-items:center;max-width:92vw;padding:10px 14px;border-radius:14px;background:#176444;color:#fff;"+
      "font:600 13px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    bar.innerHTML='<span>Pembaruan konten tersedia.</span><button type="button" style="border:0;border-radius:9px;padding:6px 10px;font:700 12px system-ui;background:#fff;color:#176444">Muat ulang</button><button type="button" aria-label="Tutup" style="border:0;background:none;color:#fff;font-size:16px">✕</button>';
    bar.children[1].onclick=function(){location.reload();};
    bar.children[2].onclick=function(){bar.remove();};
    document.body.appendChild(bar);
  });
})();
