(function(){
  "use strict";
  const USERNAME="ARLIC TEMBORO";
  const PASSWORD="12345678";
  const screen=document.getElementById("arlic-login-screen");
  const form=document.getElementById("arlic-login-form");
  if(!screen||!form)return;
  document.documentElement.classList.add("arlic-locked");
  form.addEventListener("submit",function(event){
    event.preventDefault();
    const username=(document.getElementById("arlic-username").value||"").trim().toUpperCase();
    const password=document.getElementById("arlic-password").value||"";
    if(username===USERNAME&&password===PASSWORD){
      screen.hidden=true;
      document.documentElement.classList.remove("arlic-locked");
      document.getElementById("root")?.focus?.();
    }else{
      document.getElementById("arlic-login-error").textContent="Nama pengguna atau password tidak sesuai.";
      document.getElementById("arlic-password").value="";
      document.getElementById("arlic-password").focus();
    }
  });
})();
