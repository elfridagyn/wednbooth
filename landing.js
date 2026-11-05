(function(){
  // Pupil mata mengikuti kursor / sentuhan
  var pupils = document.querySelectorAll('.eye i');
  function look(x, y){
    pupils.forEach(function(p){
      var r = p.parentElement.getBoundingClientRect();
      var dx = x - (r.left + r.width/2), dy = y - (r.top + r.height/2);
      var d = Math.hypot(dx, dy) || 1, m = r.width * 0.2;
      p.style.transform = 'translate(' + (dx/d*m) + 'px,' + (dy/d*m) + 'px)';
    });
  }
  setInterval(function(){
    var eyes=document.querySelectorAll('.eye');
    eyes.forEach(function(e){e.classList.add('blink')});
    setTimeout(function(){eyes.forEach(function(e){e.classList.remove('blink')})},150);
  },3600);
  window.addEventListener('pointermove', function(e){ look(e.clientX, e.clientY); });

  // Hitung mundur hero lalu 4 foto terisi satu per satu
  var stage = document.getElementById('stage');
  var count = stage.querySelector('.count');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { stage.classList.add('is-live'); count.textContent = '✓'; return; }
  var n = 3;
  var t = setInterval(function(){
    n--;
    if (n > 0) { count.textContent = n; }
    else { clearInterval(t); stage.classList.add('is-live'); count.textContent = '✓'; }
  }, 300);
})();
