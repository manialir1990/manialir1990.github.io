(async()=>{
  const sb=MC.sb,$=id=>document.getElementById(id),msg=$('msg');
  const {data:{session}}=await sb.auth.getSession();
  if(session){location.replace('mining.html');return}
  const say=(t,ok)=>{msg.textContent=t;msg.className=ok?'ok':''};
  let signup=false;
  $('swap').onclick=()=>{signup=!signup;$('loginForm').hidden=signup;$('signForm').hidden=!signup;$('swapText').textContent=signup?'قبلاً ثبت‌نام کرده‌ای؟':'حساب نداری؟';$('swap').textContent=signup?'ورود':'ثبت‌نام';say('')};
  $('loginForm').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter;b.disabled=true;say('');
    const {error}=await sb.auth.signInWithPassword({email:$('le').value.trim(),password:$('lp').value});
    b.disabled=false;
    if(error)return say(MC.errFa(error.message));
    location.href='mining.html';
  };
  $('signForm').onsubmit=async e=>{
    e.preventDefault();const em=$('se').value.trim(),p=$('sp').value;
    if(!/^\S+@\S+\.\S+$/.test(em))return say('ایمیل معتبر وارد کن.');
    if(p.length<6)return say('رمز عبور باید حداقل ۶ کاراکتر باشد.');
    if(p!==$('sp2').value)return say('رمز عبور و تکرار آن یکسان نیست.');
    const b=e.submitter;b.disabled=true;say('');
    const {data,error}=await sb.auth.signUp({email:em,password:p,options:{emailRedirectTo:new URL('login.html',location.href).href}});
    b.disabled=false;
    if(error)return say(MC.errFa(error.message));
    if(data.user&&data.user.identities&&data.user.identities.length===0)return say('این ایمیل قبلاً ثبت‌نام شده است.');
    say('ایمیل تأیید ارسال شد. پس از تأیید، وارد شو تا به صفحه Mining بروی.',true);
  };
})();
