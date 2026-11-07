const IntroScreen={render(){
 UI.$('#intro').innerHTML=`<div class="card hero center"><h1 class="title">حدس بزن</h1>
 <p>هر کدام یک مهره را در ذهنتان انتخاب کنید. اگر حدس‌زننده درست بگوید، امتیاز می‌گیرد و آن مهره از صفحه حذف می‌شود. تا وقتی یک مهره بماند ادامه دهید!</p>
 <div class="row center"><button class="btn primary lg" id="go">شروع بازی ✨</button><button class="btn" id="hist">تاریخچه بازی‌ها</button></div>
 <p class="muted" style="margin-top:22px;font-size:.9rem">امروز: ${Jalali.format()}</p></div>`;
 UI.$('#go').onclick=()=>SetupScreen.render();UI.$('#hist').onclick=()=>HistoryScreen.render();UI.show('intro')}};
