const Jalali={
 months:['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'],
 days:['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'],
 toJalali(gy,gm,gd){const t=[0,31,59,90,120,151,181,212,243,273,304,334],g2=gm>2?gy+1:gy;
  let d=355666+365*gy+Math.floor((g2+3)/4)-Math.floor((g2+99)/100)+Math.floor((g2+399)/400)+gd+t[gm-1];
  let jy=-1595+33*Math.floor(d/12053);d%=12053;jy+=4*Math.floor(d/1461);d%=1461;
  if(d>365){jy+=Math.floor((d-1)/365);d=(d-1)%365}
  const jm=d<186?1+Math.floor(d/31):7+Math.floor((d-186)/30),jd=1+(d<186?d%31:(d-186)%30);return[jy,jm,jd]},
 digits(s){return String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])},
 format(date=new Date()){const[y,m,d]=this.toJalali(date.getFullYear(),date.getMonth()+1,date.getDate());
  return this.digits(`${this.days[date.getDay()]} ${d} ${this.months[m-1]} ${y}`)},
 time(date=new Date()){return this.digits(date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}
};
