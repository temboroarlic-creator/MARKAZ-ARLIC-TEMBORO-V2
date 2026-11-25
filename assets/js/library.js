(function(){
  "use strict";
  const ROOT=document.getElementById("root");
  if(!ROOT)return;
  const CFG=window.MARKAZ_LIBRARY_CONFIG||{};
  const BUCKET="teaching-references";
  const MAX_MB=Number(CFG.maxFileSizeMB)||20;
  const CONFIGURED=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&
    !String(CFG.supabaseUrl).includes("ISI_")&&
    !String(CFG.supabaseAnonKey).includes("ISI_"));
  const STATIC=!CONFIGURED; // tanpa Supabase: buku dibaca dari data/books.json + folder books/
  let sb=null, session=null, isSuperadmin=false, activeView="public";
  let refs=[], categories=[], settings={title:"Kumpulan Referensi Mengajar",description:"Pusat bahan ajar, modul, buku, dan referensi pembelajaran Markaz Lughoh Temboro.",layout:"grid"};
  let activeCategory="all", searchTerm="", editing=null, toastTimer=null;
  const $=(sel,base=document)=>base.querySelector(sel);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon=(name)=>({
    book:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 6h13M8 8.5h8M8 12h8"/></svg>',
    pdf:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6zM14 3v5h5M8 15h2a1.5 1.5 0 0 0 0-3H8v6m5 0v-6h1.5a3 3 0 0 1 0 6H13m5-6v6m0-6h3m-3 3h2"/></svg>',
    close:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    search:'<svg class="mdl-icon" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
    upload:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg>',
    settings:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1.9-1.5 2.6-1.4-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.5h-3l-.3-1.5a7.8 7.8 0 0 1-1.5-.9l-1.4.5-1.5-2.6 1.1-.9a7.5 7.5 0 0 1 0-1.8l-1.1-.9 1.5-2.6 1.4.5a7.8 7.8 0 0 1 1.5-.9l.3-1.5h3l.2 1.5a7.8 7.8 0 0 1 1.5.9l1.4-.5 1.5 2.6-1.1.9a7.5 7.5 0 0 1 0 1.8Z"/></svg>',
    star:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
    list:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    grid:'<svg class="mdl-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    logout:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9"/></svg>',
    folder:'<svg class="mdl-icon" viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
  }[name]||"");
  function toast(message){
    let el=$("#mdl-toast");
    if(!el){el=document.createElement("div");el.id="mdl-toast";el.className="mdl-toast";document.body.appendChild(el);}
    el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
  }
  function bytes(n){if(!n)return"Ukuran belum tersedia";const units=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<3){v/=1024;i++;}return v.toFixed(i?1:0)+" "+units[i];}
  function dateLabel(v){try{return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(v));}catch{return"";}}
  function slugify(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
  function ready(){return CONFIGURED&&sb;}
  // ---- Mode statis (GitHub Pages): daftar buku dari data/books.json, PDF dari folder books/ ----
  const GH_CACHE="markaz_books_gh_v1";
  async function discoverGithub(repo){
    // Tambahan: PDF yang baru diunggah ke folder books/ tapi belum didaftarkan tetap muncul (hanya di *.github.io / bila githubRepo diisi).
    try{
      let slug=(repo||"").trim();
      if(!slug&&/\.github\.io$/.test(location.hostname)){
        const owner=location.hostname.split(".")[0];
        const first=location.pathname.split("/").filter(Boolean)[0];
        slug=owner+"/"+(first&&!/\.html?$/.test(first)?first:owner+".github.io");
      }
      if(!slug)return [];
      let items=null;
      try{const c=JSON.parse(localStorage.getItem(GH_CACHE)||"null");if(c&&c.repo===slug&&Date.now()-c.t<600000)items=c.items;}catch(e){}
      if(!items){
        const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),4000);
        const res=await fetch("https://api.github.com/repos/"+slug+"/contents/books",{signal:ctl.signal,headers:{Accept:"application/vnd.github+json"}});
        clearTimeout(timer);
        if(!res.ok)return [];
        const data=await res.json();
        items=(Array.isArray(data)?data:[]).filter(f=>f.type==="file"&&/\.pdf$/i.test(f.name)).map(f=>({name:f.name,path:f.path,size:f.size}));
        try{localStorage.setItem(GH_CACHE,JSON.stringify({repo:slug,t:Date.now(),items}));}catch(e){}
      }
      return items;
    }catch(e){return [];}
  }
  async function loadStatic(){
    const res=await fetch("data/books.json",{cache:"no-cache"});
    if(!res.ok)throw new Error("File data/books.json tidak ditemukan.");
    const j=await res.json();
    if(j.settings)settings={...settings,...j.settings};
    const baseName=p=>decodeURIComponent(String(p||"").split("/").pop()).toLowerCase();
    const list=(j.books||[]).filter(b=>b&&b.file&&b.published!==false).map((b,i)=>({
      id:b.id||slugify(b.title||b.file)||("buku-"+i),
      title:b.title||decodeURIComponent(String(b.file).split("/").pop()).replace(/\.pdf$/i,"").replace(/[_-]+/g," "),
      description:b.description||"",
      category_id:slugify(b.category||"Umum")||"umum",category:{name:b.category||"Umum"},
      marhalah:b.marhalah||"",subject:b.subject||"",cover_url:b.cover||"",
      file_path:b.file,file_size:Number(b.size)||0,is_featured:!!b.featured,sort_order:Number(b.order)||0,
      status:"published",created_at:b.date||""
    }));
    const known=new Set(list.map(r=>baseName(r.file_path)));
    const found=await discoverGithub(settings.githubRepo);
    found.forEach(f=>{
      if(known.has(f.name.toLowerCase()))return;
      list.push({id:slugify(f.name),title:f.name.replace(/\.pdf$/i,"").replace(/[_-]+/g," "),description:"",
        category_id:"umum",category:{name:"Umum"},marhalah:"",subject:"",cover_url:"",
        file_path:f.path.split("/").map(encodeURIComponent).join("/"),file_size:f.size||0,is_featured:false,sort_order:9999,status:"published",created_at:""});
    });
    list.sort((a,b)=>(b.is_featured-a.is_featured)||(a.sort_order-b.sort_order)||a.title.localeCompare(b.title,"id"));
    refs=list;
    const names=[...(j.categories||[]),...list.map(r=>r.category.name)];
    const seen=new Set();categories=[];
    names.forEach(n=>{const s=slugify(n);if(n&&!seen.has(s)){seen.add(s);categories.push({id:s,name:n,slug:s,sort_order:categories.length});}});
  }
  function setupNotice(){
    return '<div class="mdl-notice"><strong>Integrasi penyimpanan online belum dihubungkan.</strong>Antarmuka perpustakaan dan dashboard sudah terpasang. Agar PDF dapat diunggah dan dibaca oleh semua pengguna, isi Project URL dan anon/public key Supabase pada bagian <b>MARKAZ_LIBRARY_CONFIG</b> di file HTML, lalu jalankan SQL instalasi yang disertakan dalam paket ini. Jangan memasukkan service_role key.</div>';
  }
  function ensureShell(){
    if($("#mdl-backdrop"))return;
    const el=document.createElement("div");
    el.id="mdl-backdrop";el.className="mdl-backdrop";el.hidden=true;
    el.innerHTML='<section class="mdl-window" role="dialog" aria-modal="true" aria-label="Markaz Digital Library"><header class="mdl-header"><div class="mdl-brand"><div class="mdl-brand-mark">'+icon("book")+'</div><div><div class="mdl-brand-title">MARKAZ DIGITAL LIBRARY</div><div class="mdl-brand-sub">Pusat Referensi Mengajar · Markaz Lughoh Temboro</div></div></div><div class="mdl-header-actions">'+(CONFIGURED?'<button class="mdl-btn mdl-btn-soft" data-action="admin-entry" type="button">Superadmin</button>':"")+'<button class="mdl-icon-btn" data-action="close" type="button" aria-label="Tutup">'+icon("close")+'</button></div></header><main class="mdl-content" id="mdl-content"></main><footer class="mdl-footer">Markaz Lughoh Temboro · Digital Library · Akses referensi publik</footer></section>';
    document.body.appendChild(el);
    el.addEventListener("click",handleClick);
    el.addEventListener("submit",handleSubmit);
    el.addEventListener("input",handleInput);
    el.addEventListener("change",handleChange);
    el.addEventListener("keydown",e=>{if(e.key==="Escape")closeLibrary();});
    el.addEventListener("click",e=>{if(e.target===el)closeLibrary();});
  }
  function openLibrary(){
    ensureShell();activeView="public";activeCategory="all";searchTerm="";
    const el=$("#mdl-backdrop");el.hidden=false;document.body.style.overflow="hidden";
    requestAnimationFrame(()=>el.classList.add("mdl-open"));
    renderPublic();
  }
  function closeLibrary(){
    const el=$("#mdl-backdrop");if(!el)return;
    el.classList.remove("mdl-open");document.body.style.overflow="";
    setTimeout(()=>{el.hidden=true;},260);
  }
  async function loadSDK(){
    if(window.supabase?.createClient)return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error("SDK Supabase tidak dapat dimuat. Periksa koneksi internet."));
      document.head.appendChild(script);
    });
  }
  async function connect(){
    if(!CONFIGURED)throw new Error("Konfigurasi Supabase belum diisi.");
    if(sb)return sb;
    await loadSDK();
    sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const result=await sb.auth.getSession();session=result.data?.session||null;
    sb.auth.onAuthStateChange((_event,next)=>{session=next;});
    return sb;
  }
  async function verifyAdmin(){
    if(!session)return false;
    const {data,error}=await sb.rpc("is_superadmin");
    if(error)throw error;
    isSuperadmin=!!data;
    return isSuperadmin;
  }
  function modalContent(){return $("#mdl-content");}
  function renderPublic(){
    activeView="public";
    const c=modalContent();if(!c)return;
    c.innerHTML='<div class="mdl-intro"><div><div class="mdl-eyebrow">MARKAZ DIGITAL LIBRARY</div><h2 class="mdl-h2">'+esc(settings.title)+'</h2><div class="mdl-subtitle">'+esc(settings.description)+'</div></div><div class="mdl-header-actions"><button class="mdl-btn mdl-btn-soft" data-action="layout-grid" title="Tampilan kartu">'+icon("grid")+'</button><button class="mdl-btn mdl-btn-soft" data-action="layout-list" title="Tampilan daftar">'+icon("list")+'</button></div></div><div class="mdl-search-row"><input class="mdl-search" id="mdl-search" type="search" placeholder="Cari judul, kategori, mata pelajaran..." value="'+esc(searchTerm)+'"></div><div class="mdl-filter-row" id="mdl-filters"><button class="mdl-chip active" data-category="all">Semua referensi</button></div><div id="mdl-public-status"></div><div id="mdl-public-results" class="mdl-ref-grid"></div>';
    if(STATIC){
      $("#mdl-public-status",c).innerHTML='<div class="mdl-empty">Memuat daftar buku...</div>';
      loadStatic().then(()=>{const s=$("#mdl-public-status",c);if(s)s.innerHTML="";drawPublic();}).catch(err=>{
        const s=$("#mdl-public-status",c);
        if(s)s.innerHTML='<div class="mdl-notice"><strong>Daftar buku belum dapat dimuat.</strong>'+esc(err.message||"Periksa koneksi internet.")+'</div>';
        drawPublic();
      });
      return;
    }
    $("#mdl-public-status",c).innerHTML='<div class="mdl-empty">Menghubungkan perpustakaan...</div>';
    connect().then(loadPublicData).then(drawPublic).catch(err=>{$("#mdl-public-status",c).innerHTML='<div class="mdl-notice"><strong>Belum dapat memuat referensi.</strong>'+esc(err.message||"Periksa koneksi dan konfigurasi Supabase.")+'</div>';drawPublic();});
  }
  async function loadPublicData(){
    const [catRes,refRes,setRes]=await Promise.all([
      sb.from("reference_categories").select("id,name,slug,sort_order").order("sort_order",{ascending:true}),
      sb.from("teaching_references").select("id,title,description,category_id,marhalah,subject,cover_url,file_path,file_size,status,is_featured,sort_order,created_at,category:reference_categories(name)").eq("status","published").order("is_featured",{ascending:false}).order("sort_order",{ascending:true}).order("created_at",{ascending:false}),
      sb.from("library_settings").select("id,title,description,layout").eq("id","main").maybeSingle()
    ]);
    if(catRes.error)throw catRes.error;if(refRes.error)throw refRes.error;
    categories=catRes.data||[];refs=refRes.data||[];
    if(setRes.data)settings={...settings,...setRes.data};
    if($("#mdl-content"))drawPublic();
  }
  function syncHomeBanner(){
    const title=$(".mdl-home-title",ROOT),desc=$(".mdl-home-desc",ROOT);
    if(title)title.textContent=settings.title||"Kumpulan Referensi Mengajar";
    if(desc)desc.textContent=settings.description||"Pusat bahan ajar, modul, buku, dan referensi pembelajaran Markaz Lughoh Temboro.";
  }
  function drawPublic(){
    const c=modalContent();if(!c||activeView!=="public")return;
    syncHomeBanner();
    const filter=$("#mdl-filters",c);
    if(filter){
      filter.innerHTML='<button class="mdl-chip '+(activeCategory==="all"?"active":"")+'" data-category="all">Semua referensi</button>'+categories.map(cat=>'<button class="mdl-chip '+(activeCategory===cat.id?"active":"")+'" data-category="'+esc(cat.id)+'">'+esc(cat.name)+'</button>').join("");
    }
    const q=searchTerm.toLowerCase();
    const list=refs.filter(r=>(activeCategory==="all"||r.category_id===activeCategory)&&[r.title,r.description,r.marhalah,r.subject,r.category?.name].join(" ").toLowerCase().includes(q));
    const out=$("#mdl-public-results",c);if(!out)return;
    out.className="mdl-ref-"+(settings.layout==="list"?"list":"grid");
    if(!list.length){
      out.innerHTML='<div class="mdl-empty" style="grid-column:1/-1">'+(CONFIGURED?"Belum ada dokumen yang dipublikasikan pada kategori ini.":"Belum ada buku di kategori ini. Unggah file PDF ke folder books/ di GitHub, lalu daftarkan di data/books.json.")+'</div>';
      return;
    }
    out.innerHTML=list.map(r=>'<article class="mdl-ref-card"><div class="mdl-ref-cover">'+(r.cover_url?'<img src="'+esc(r.cover_url)+'" alt="" style="width:100%;height:100%;object-fit:cover">':icon("pdf"))+(r.is_featured?'<span class="mdl-tag" style="position:absolute;right:9px;top:9px">'+icon("star")+' Unggulan</span>':"")+'</div><div class="mdl-ref-body"><div class="mdl-ref-title">'+esc(r.title)+'</div><div class="mdl-ref-meta"><span class="mdl-tag">'+esc(r.category?.name||"Umum")+'</span>'+(r.marhalah?'<span>'+esc(r.marhalah)+'</span>':"")+'<span>'+bytes(r.file_size)+'</span></div><div class="mdl-ref-desc">'+esc(r.description||"Dokumen referensi pembelajaran.")+'</div><div class="mdl-ref-actions"><button class="mdl-btn mdl-btn-primary" data-action="preview" data-id="'+esc(r.id)+'">'+icon("book")+' Baca PDF</button><button class="mdl-btn mdl-btn-soft" data-action="download" data-id="'+esc(r.id)+'">Unduh</button></div></div></article>').join("");
  }
  async function signedUrl(ref,download){
    const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(ref.file_path,3600,download?{download:true}:{});
    if(error)throw error;return data.signedUrl;
  }
  async function previewRef(id,download){
    const ref=refs.find(r=>r.id===id);if(!ref)return;
    const pendingWindow=(download&&!STATIC)?window.open("about:blank","_blank"):null;
    try{
      const url=STATIC?ref.file_path:await signedUrl(ref,download);
      if(download&&STATIC){const a=document.createElement("a");a.href=url;a.download=(ref.title||"buku")+".pdf";document.body.appendChild(a);a.click();a.remove();return;}
      if(download){if(pendingWindow)pendingWindow.location.href=url;else toast("Izinkan pop-up browser untuk mengunduh PDF.");return;}
      activeView="preview";
      modalContent().innerHTML='<div class="mdl-intro"><div><div class="mdl-eyebrow">PRATINJAU DOKUMEN</div><h2 class="mdl-h2">'+esc(ref.title)+'</h2><div class="mdl-subtitle">'+esc(ref.category?.name||"Referensi")+' · '+bytes(ref.file_size)+'</div></div><div class="mdl-header-actions">'+(STATIC?'<a class="mdl-btn mdl-btn-soft" href="'+esc(url)+'" target="_blank" rel="noopener">Buka di tab baru</a>':"")+'<button class="mdl-btn mdl-btn-soft" data-action="download" data-id="'+esc(id)+'">Unduh PDF</button><button class="mdl-btn mdl-btn-soft" data-action="back-public">Kembali</button></div></div><iframe class="mdl-pdf-view" title="Pratinjau PDF" src="'+esc(url)+'"></iframe>';
    }catch(err){if(pendingWindow)pendingWindow.close();toast("PDF belum dapat dibuka: "+(err.message||"Kesalahan penyimpanan")); }
  }
  function renderLogin(message){
    activeView="login";const c=modalContent();
    c.innerHTML='<div class="mdl-login-wrap"><div class="mdl-login-mark">'+icon("settings")+'</div><div class="mdl-eyebrow">AREA TERBATAS</div><h2 class="mdl-h2">Login Superadmin</h2><p class="mdl-subtitle" style="margin-bottom:18px">Masuk untuk mengelola dokumen, kategori, dan tampilan perpustakaan.</p>'+(message?'<div class="mdl-notice" style="margin-bottom:13px">'+esc(message)+'</div>':"")+(CONFIGURED?'<form data-form="login"><div class="mdl-field-group"><label class="mdl-label">Email Superadmin</label><input class="mdl-field" name="email" type="email" required autocomplete="username" placeholder="admin@domain.com"></div><div class="mdl-field-group"><label class="mdl-label">Password</label><input class="mdl-field" name="password" type="password" required autocomplete="current-password" placeholder="Masukkan password"></div><button class="mdl-btn mdl-btn-primary" style="width:100%;margin-top:5px" type="submit">Masuk ke Dashboard</button></form>':'<div class="mdl-notice"><strong>Backend belum dikonfigurasi.</strong>Isi URL dan anon key Supabase pada MARKAZ_LIBRARY_CONFIG dan jalankan SQL instalasi terlebih dahulu.</div>')+'<button class="mdl-btn mdl-btn-soft" style="width:100%;margin-top:12px" data-action="back-public">Kembali ke referensi publik</button></div>';
  }
  async function loadAdminData(){
    const [catRes,refRes,setRes]=await Promise.all([
      sb.from("reference_categories").select("id,name,slug,sort_order").order("sort_order",{ascending:true}),
      sb.from("teaching_references").select("id,title,description,category_id,marhalah,subject,cover_url,file_path,file_size,status,is_featured,sort_order,created_at,category:reference_categories(name)").order("created_at",{ascending:false}),
      sb.from("library_settings").select("id,title,description,layout").eq("id","main").maybeSingle()
    ]);
    if(catRes.error)throw catRes.error;if(refRes.error)throw refRes.error;
    categories=catRes.data||[];refs=refRes.data||[];
    if(setRes.data)settings={...settings,...setRes.data};
  }
  async function renderAdmin(){
    activeView="admin";const c=modalContent();c.innerHTML='<div class="mdl-empty">Memuat dashboard Superadmin...</div>';
    try{
      if(!ready())await connect();
      if(!session){renderLogin("Silakan login menggunakan akun Superadmin.");return;}
      if(!await verifyAdmin()){await sb.auth.signOut();session=null;renderLogin("Akun ini belum memiliki hak Superadmin.");return;}
      await loadAdminData();drawAdmin();
    }catch(err){renderLogin(err.message||"Gagal memuat dashboard.");}
  }
  function drawAdmin(){
    const c=modalContent();if(!c)return;activeView="admin";
    const published=refs.filter(r=>r.status==="published").length;
    const used=refs.reduce((n,r)=>n+(Number(r.file_size)||0),0);
    c.innerHTML='<div class="mdl-intro"><div><div class="mdl-eyebrow">PANEL PENGELOLAAN</div><h2 class="mdl-h2">Admin Center</h2><div class="mdl-subtitle">Kelola referensi mengajar, kategori, dan tampilan perpustakaan.</div></div><button class="mdl-btn mdl-btn-soft" data-action="logout">'+icon("logout")+' Keluar</button></div>'+
    '<div class="mdl-admin-stats"><div class="mdl-stat">'+icon("pdf")+'<div class="mdl-stat-num">'+refs.length+'</div><div class="mdl-stat-label">Total dokumen</div></div><div class="mdl-stat">'+icon("book")+'<div class="mdl-stat-num">'+published+'</div><div class="mdl-stat-label">Terpublikasi</div></div><div class="mdl-stat">'+icon("folder")+'<div class="mdl-stat-num">'+categories.length+'</div><div class="mdl-stat-label">Kategori</div></div><div class="mdl-stat">'+icon("upload")+'<div class="mdl-stat-num">'+bytes(used)+'</div><div class="mdl-stat-label">Total ukuran file</div></div></div>'+
    '<div class="mdl-admin-grid"><section class="mdl-panel"><h3>'+(editing?"Edit referensi":"Upload referensi PDF")+'</h3><form data-form="reference" data-edit-id="'+esc(editing?.id||"")+'"><div class="mdl-field-group"><label class="mdl-label">Judul dokumen *</label><input class="mdl-field" name="title" required maxlength="180" value="'+esc(editing?.title||"")+'" placeholder="Contoh: Modul Pembelajaran Nahwu"></div><div class="mdl-field-group"><label class="mdl-label">Deskripsi</label><textarea class="mdl-field" name="description" rows="3" placeholder="Ringkasan isi dan kegunaan dokumen">'+esc(editing?.description||"")+'</textarea></div><div class="mdl-field-group"><label class="mdl-label">Kategori</label><select class="mdl-field" name="category_id"><option value="">Pilih kategori</option>'+categories.map(cat=>'<option value="'+esc(cat.id)+'" '+(editing?.category_id===cat.id?"selected":"")+'>'+esc(cat.name)+'</option>').join("")+'</select></div><div class="mdl-admin-grid" style="gap:9px"><div class="mdl-field-group"><label class="mdl-label">Marhalah</label><input class="mdl-field" name="marhalah" value="'+esc(editing?.marhalah||"")+'" placeholder="Tamhidi / Mutawassith"></div><div class="mdl-field-group"><label class="mdl-label">Mata pelajaran</label><input class="mdl-field" name="subject" value="'+esc(editing?.subject||"")+'" placeholder="Nahwu / Sharaf"></div></div><div class="mdl-field-group"><label class="mdl-label">File PDF '+(editing?"(kosongkan jika tidak diganti":"*")+'</label><input class="mdl-field" name="pdf" type="file" accept="application/pdf,.pdf" '+(editing?"":"required")+'></div><div class="mdl-field-group"><label class="mdl-label">URL gambar sampul (opsional)</label><input class="mdl-field" name="cover_url" type="url" value="'+esc(editing?.cover_url||"")+'" placeholder="https://..."></div><div class="mdl-field-group"><label class="mdl-label">Urutan tampilan</label><input class="mdl-field" name="sort_order" type="number" value="'+esc(editing?.sort_order??0)+'"></div><label class="mdl-check"><input type="checkbox" name="featured" '+(editing?.is_featured?"checked":"")+'> Jadikan referensi unggulan</label><label class="mdl-check"><input type="checkbox" name="published" '+(editing?.status==="published"?"checked":"")+'> Publikasikan agar dapat dibaca semua pengguna</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mdl-btn mdl-btn-primary" type="submit">'+icon("upload")+(editing?"Simpan perubahan":"Upload PDF")+'</button>'+(editing?'<button class="mdl-btn mdl-btn-soft" type="button" data-action="cancel-edit">Batal</button>':"")+'</div></form></section>'+
    '<section class="mdl-panel"><h3>Pengaturan tampilan publik</h3><form data-form="settings"><div class="mdl-field-group"><label class="mdl-label">Judul pusat referensi</label><input class="mdl-field" name="title" value="'+esc(settings.title)+'" required></div><div class="mdl-field-group"><label class="mdl-label">Deskripsi beranda</label><textarea class="mdl-field" name="description" rows="3">'+esc(settings.description)+'</textarea></div><div class="mdl-field-group"><label class="mdl-label">Tampilan default</label><select class="mdl-field" name="layout"><option value="grid" '+(settings.layout!=="list"?"selected":"")+'>Kartu / Grid</option><option value="list" '+(settings.layout==="list"?"selected":"")+'>Daftar / List</option></select></div><button class="mdl-btn mdl-btn-primary" type="submit">'+icon("settings")+' Simpan pengaturan</button></form><div class="mdl-section-title"><h3>Kelola kategori</h3></div><form data-form="category" style="display:flex;gap:7px"><input class="mdl-field" name="name" required placeholder="Nama kategori baru"><button class="mdl-btn mdl-btn-primary" type="submit">Tambah</button></form><div class="mdl-admin-list">'+categories.map(cat=>'<div class="mdl-admin-row"><div class="mdl-admin-row-main"><div class="mdl-admin-row-title">'+esc(cat.name)+'</div></div><button class="mdl-mini-btn mdl-mini-danger" data-action="delete-category" data-id="'+esc(cat.id)+'">Hapus</button></div>').join("")+'</div></section></div>'+
    '<div class="mdl-section-title"><h3>Semua dokumen</h3><span class="mdl-subtitle">'+refs.length+' dokumen</span></div><div class="mdl-admin-list">'+(refs.length?refs.map(r=>'<div class="mdl-admin-row"><div class="mdl-admin-row-main"><div class="mdl-admin-row-title">'+esc(r.title)+'</div><div class="mdl-admin-row-meta">'+esc(r.category?.name||"Tanpa kategori")+' · '+bytes(r.file_size)+' · <span class="mdl-status '+(r.status==="published"?"mdl-status-published":"mdl-status-draft")+'">'+(r.status==="published"?"Terpublikasi":"Draft")+'</span>'+(r.is_featured?" · Unggulan":"")+'</div></div><div class="mdl-row-actions"><button class="mdl-mini-btn" data-action="edit" data-id="'+esc(r.id)+'">Edit</button><button class="mdl-mini-btn" data-action="toggle-publish" data-id="'+esc(r.id)+'">'+(r.status==="published"?"Jadikan draft":"Publikasikan")+'</button><button class="mdl-mini-btn" data-action="toggle-featured" data-id="'+esc(r.id)+'">'+(r.is_featured?"Lepas unggulan":"Unggulkan")+'</button><button class="mdl-mini-btn mdl-mini-danger" data-action="delete-ref" data-id="'+esc(r.id)+'">Hapus</button></div></div>').join(""):'<div class="mdl-empty">Belum ada dokumen. Upload PDF pertama untuk memulai.</div>')+'</div>';
  }
  async function logActivity(action,referenceId,details){
    try{await sb.from("admin_activity_logs").insert({actor_id:session.user.id,action,reference_id:referenceId||null,details:details||{}});}catch(_){}
  }
  async function uploadReference(form){
    const fd=new FormData(form),id=form.dataset.editId||"",old=refs.find(r=>r.id===id);
    const file=fd.get("pdf");
    if(file&&file.size){
      if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf"))throw new Error("File harus berformat PDF.");
      if(file.size>MAX_MB*1024*1024)throw new Error("Ukuran PDF melebihi batas "+MAX_MB+" MB.");
    }else if(!old){throw new Error("Pilih file PDF terlebih dahulu.");}
    let filePath=old?.file_path||null,newPath=null;
    if(file&&file.size){
      const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").slice(-90);
      newPath="documents/"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2))+"-"+safeName;
      const up=await sb.storage.from(BUCKET).upload(newPath,file,{contentType:"application/pdf",upsert:false});
      if(up.error)throw up.error;filePath=newPath;
    }
    const payload={title:fd.get("title").trim(),description:fd.get("description").trim(),category_id:fd.get("category_id")||null,marhalah:fd.get("marhalah").trim(),subject:fd.get("subject").trim(),cover_url:fd.get("cover_url").trim()||null,sort_order:Number(fd.get("sort_order")||0),file_path:filePath,file_size:file&&file.size?file.size:(old?.file_size||0),status:fd.get("published")==="on"?"published":"draft",is_featured:fd.get("featured")==="on",updated_at:new Date().toISOString()};
    let result;
    if(old)result=await sb.from("teaching_references").update(payload).eq("id",id);
    else result=await sb.from("teaching_references").insert(payload);
    if(result.error){
      if(newPath)await sb.storage.from(BUCKET).remove([newPath]);
      throw result.error;
    }
    if(old&&newPath&&old.file_path)await sb.storage.from(BUCKET).remove([old.file_path]);
    await logActivity(old?"update_reference":"upload_reference",id||null,{title:payload.title});
    editing=null;await loadAdminData();drawAdmin();toast(old?"Referensi berhasil diperbarui.":"PDF berhasil diunggah.");
  }
  async function handleSubmit(e){
    const form=e.target.closest("form[data-form]");if(!form)return;
    e.preventDefault();
    const type=form.dataset.form;
    try{
      if(type==="login"){
        const fd=new FormData(form);const {data,error}=await sb.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")});
        if(error)throw error;session=data.session;
        if(!await verifyAdmin()){await sb.auth.signOut();session=null;throw new Error("Akun ini belum terdaftar sebagai Superadmin.");}
        await renderAdmin();toast("Login Superadmin berhasil.");
      }else if(type==="reference"){
        const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent="Menyimpan...";}
        await uploadReference(form);
      }else if(type==="category"){
        const fd=new FormData(form),name=fd.get("name").trim();
        const {error}=await sb.from("reference_categories").insert({name,slug:slugify(name),sort_order:categories.length+1});
        if(error)throw error;await logActivity("create_category",null,{name});await loadAdminData();drawAdmin();toast("Kategori ditambahkan.");
      }else if(type==="settings"){
        const fd=new FormData(form),payload={id:"main",title:fd.get("title").trim(),description:fd.get("description").trim(),layout:fd.get("layout"),updated_at:new Date().toISOString()};
        const {error}=await sb.from("library_settings").upsert(payload);if(error)throw error;
        settings={...settings,...payload};syncHomeBanner();await logActivity("update_library_settings",null,{layout:payload.layout});toast("Pengaturan tampilan disimpan.");
      }
    }catch(err){toast(err.message||"Terjadi kesalahan.");if(type==="reference")drawAdmin();}
  }
  async function handleClick(e){
    const btn=e.target.closest("[data-action],[data-category]");if(!btn)return;
    if(btn.dataset.category){activeCategory=btn.dataset.category;drawPublic();return;}
    const action=btn.dataset.action,id=btn.dataset.id;
    try{
      if(action==="close")closeLibrary();
      else if(action==="admin-entry"){
        if(!CONFIGURED){renderLogin("Backend belum dikonfigurasi. Ikuti panduan setup yang disertakan.");return;}
        await connect();if(session)await renderAdmin();else renderLogin();
      }else if(action==="back-public")renderPublic();
      else if(action==="layout-grid"||action==="layout-list"){settings.layout=action==="layout-list"?"list":"grid";drawPublic();}
      else if(action==="preview")await previewRef(id,false);
      else if(action==="download")await previewRef(id,true);
      else if(action==="logout"){await sb.auth.signOut();session=null;isSuperadmin=false;editing=null;renderLogin("Anda telah keluar dari dashboard.");}
      else if(action==="cancel-edit"){editing=null;drawAdmin();}
      else if(action==="edit"){editing=refs.find(r=>r.id===id)||null;drawAdmin();}
      else if(action==="toggle-publish"){
        const ref=refs.find(r=>r.id===id);if(!ref)return;
        const {error}=await sb.from("teaching_references").update({status:ref.status==="published"?"draft":"published",updated_at:new Date().toISOString()}).eq("id",id);
        if(error)throw error;await logActivity("change_publication",id,{status:ref.status==="published"?"draft":"published"});await loadAdminData();drawAdmin();toast("Status publikasi diperbarui.");
      }else if(action==="toggle-featured"){
        const ref=refs.find(r=>r.id===id);if(!ref)return;
        const {error}=await sb.from("teaching_references").update({is_featured:!ref.is_featured,updated_at:new Date().toISOString()}).eq("id",id);
        if(error)throw error;await logActivity("change_featured",id,{featured:!ref.is_featured});await loadAdminData();drawAdmin();toast("Status unggulan diperbarui.");
      }else if(action==="delete-ref"){
        const ref=refs.find(r=>r.id===id);if(!ref||!confirm('Hapus referensi "'+ref.title+'"?'))return;
        const {error}=await sb.from("teaching_references").delete().eq("id",id);if(error)throw error;
        if(ref.file_path)await sb.storage.from(BUCKET).remove([ref.file_path]);
        await logActivity("delete_reference",id,{title:ref.title});editing=null;await loadAdminData();drawAdmin();toast("Referensi dihapus.");
      }else if(action==="delete-category"){
        const cat=categories.find(x=>x.id===id);if(!cat||!confirm('Hapus kategori "'+cat.name+'"?'))return;
        const {error}=await sb.from("reference_categories").delete().eq("id",id);if(error)throw error;
        await loadAdminData();drawAdmin();toast("Kategori dihapus.");
      }
    }catch(err){toast(err.message||"Aksi gagal.");}
  }
  function handleInput(e){
    if(e.target.id==="mdl-search"){searchTerm=e.target.value;drawPublic();const input=$("#mdl-search");if(input){input.focus();input.setSelectionRange(searchTerm.length,searchTerm.length);}}
  }
  function handleChange(e){
    if(e.target.id==="mdl-search"){searchTerm=e.target.value;drawPublic();}
  }
  function mountHomeAndNav(){
    const dock=$(".ios-glass-dock-inner",ROOT);
    if(dock&&!$('[data-mdl-open]',dock)){
      const b=document.createElement("button");b.type="button";b.className="ios-glass-item mdl-nav-button";b.dataset.mdlOpen="1";b.title="Kumpulan Referensi Mengajar";b.setAttribute("aria-label","Referensi");
      b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg><span>Referensi</span>';
      dock.appendChild(b);
    }
    const homeBtn=$('.ios-glass-dock [aria-label="Beranda"].active',ROOT);
    if(homeBtn){
      const main=$(".ios-app-shell > main.relative.flex-1.overflow-hidden",ROOT);
      const inner=main&&$("div.relative.mx-auto.flex",main);
      const grid=inner&&$("div.grid.w-full",inner);
      if(grid&&!$(".mdl-home-section",inner)){
        const section=document.createElement("section");section.className="mdl-home-section";
        section.innerHTML='<div class="mdl-home-card"><div class="mdl-home-card-main"><div class="mdl-kicker">'+icon("book")+' DIGITAL KNOWLEDGE CENTER</div><h2 class="mdl-home-title">Kumpulan Referensi Mengajar</h2><p class="mdl-home-desc">Pusat bahan ajar, modul, buku, dan referensi pembelajaran Markaz Lughoh Temboro. Temukan dokumen yang dibutuhkan dalam satu tempat.</p></div><div class="mdl-home-actions"><button type="button" class="mdl-btn mdl-btn-primary" data-mdl-open>'+icon("book")+' Buka Perpustakaan</button>'+(CONFIGURED?'<button type="button" class="mdl-btn mdl-btn-soft" data-mdl-admin>'+icon("settings")+' Superadmin</button>':"")+'</div></div>';
        grid.insertAdjacentElement("afterend",section);
        section.querySelector("[data-mdl-admin]")?.addEventListener("click",()=>{openLibrary();setTimeout(()=>$("#mdl-backdrop [data-action=admin-entry]")?.click(),60);});
      }
    }
  }
  const observer=new MutationObserver(()=>mountHomeAndNav());
  observer.observe(ROOT,{childList:true,subtree:true});
  document.addEventListener("click",e=>{
    if(e.target.closest("[data-mdl-open]"))openLibrary();
  });
  window.MARKAZ_DIGITAL_LIBRARY={open:openLibrary,version:"2.0.0",configured:CONFIGURED,mode:STATIC?"static":"supabase"};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountHomeAndNav,{once:true});
  else mountHomeAndNav();
})();
