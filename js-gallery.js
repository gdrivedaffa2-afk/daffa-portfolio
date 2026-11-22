(() => {
  'use strict';
  const projects = window.GALLERY_PROJECTS;
  const board = document.getElementById('gallery-board');
  const layer = document.getElementById('gallery-cells');
  const view = document.querySelector('.view-toggle');
  if (!projects?.length || !board || !layer) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let cell = 280, cols = 0, rows = 0, pool = [], x = 0, y = 0, vx = 0, vy = 0;
  let frame = 0, previousTime = 0, pointer = null, moved = false, suppressUntil = 0, playing = null;
  let isList = document.body.dataset.start === 'list';
  const coordX = document.querySelector('[data-coordinate-x]');
  const coordY = document.querySelector('[data-coordinate-y]');
  const speed = document.querySelector('[data-speed]');
  const mod = (n, m) => ((n % m) + m) % m;
  const number = n => `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(2).padStart(7, '0')}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stopVideo() { if (!playing) return; playing.querySelector('video')?.pause(); playing.classList.remove('playing'); playing = null; }
  function playVideo(link) {
    if (reduced.matches || !finePointer.matches || pointer || isList || document.hidden) return;
    stopVideo(); playing = link;
    let video = link.querySelector('video');
    if (!video) { video = document.createElement('video'); video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none'; video.setAttribute('aria-hidden','true'); video.src = link.dataset.video; link.querySelector('.tile-media').append(video); }
    video.play().then(() => {if(playing === link) link.classList.add('playing'); else video.pause();}).catch(()=>{});
  }
  function rebuild() {
    stopVideo();
    cell = innerWidth <= 600 ? 210 : 280;
    cols = Math.ceil(innerWidth / cell) + 2; rows = Math.ceil(innerHeight / cell) + 2;
    pool = []; layer.replaceChildren();
    for (let i = 0; i < cols * rows; i++) {
      const node = document.createElement('div'); node.className = 'gallery-cell'; node.style.width = cell+'px'; node.style.height = cell+'px';
      node.setAttribute('aria-hidden','true');
      layer.append(node); pool.push({node, key:''});
    }
    render();
  }
  function render() {
    const startCol = Math.floor(-x / cell)-1, startRow = Math.floor(-y / cell)-1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const col = startCol+c, row = startRow+r, item = pool[r*cols+c];
      const idx = mod(col + row * 5, projects.length), p = projects[idx];
      const variant = mod(col*3 + row*7, 8);
      const key = `${idx}-${variant}`;
      item.node.style.transform = `translate3d(${Math.round(col*cell+x)}px,${Math.round(row*cell+y)}px,0)`;
      if (item.key !== key) {
        if (playing && item.node.contains(playing)) stopVideo();
        item.key = key;
        const shape = variant === 0 || variant === 5 ? 'portrait' : variant === 2 || variant === 4 ? 'square' : 'wide';
        item.node.innerHTML = `<a class="tile" tabindex="-1" href="${esc(p.href)}" data-video="${esc(p.video)}" data-shape="${shape}" draggable="false"><figure><div class="tile-media"><img src="${esc(p.image)}" alt="${esc(p.title)}" width="1280" height="720" draggable="false" decoding="async"></div><figcaption><span>N°${p.number}</span><span>${esc(p.short || p.title)}</span></figcaption></figure></a>`;
      }
    }
    coordX.textContent = number(x); coordY.textContent = number(y); speed.textContent = Math.hypot(vx,vy).toFixed(1).padStart(4,'0');
  }
  function tick(time) {
    frame = 0;
    if (isList || document.hidden) { previousTime = 0; return; }
    const dt = previousTime ? Math.min((time-previousTime)/16.67, 2) : 1; previousTime = time;
    if (!pointer) {
      x += vx * dt; y += vy * dt;
      vx *= Math.pow(.91, dt); vy *= Math.pow(.91, dt);
      if (Math.abs(vx)<.02) vx = 0; if (Math.abs(vy)<.02) vy = 0;
    }
    render();
    if (vx || vy || pointer) frame = requestAnimationFrame(tick); else previousTime = 0;
  }
  function animate() { if (!frame && !isList && !document.hidden) frame = requestAnimationFrame(tick); }
  function setList(value, focus = false) {
    isList = value; stopVideo(); vx=vy=0;
    document.body.classList.toggle('list-view', value); view.textContent = value ? 'VIEW GALLERY' : 'VIEW LIST'; view.setAttribute('aria-pressed', String(value));
    if(value) {if(frame) cancelAnimationFrame(frame);frame=0;}
    else {window.scrollTo(0,0); rebuild();}
    if(focus) view.focus();
  }
  view.hidden = false; document.body.classList.add('has-gallery');
  x = innerWidth / 2 - cell*1.5; y = innerHeight / 2 - cell*1.5;
  rebuild(); setList(isList);
  view.addEventListener('click', () => setList(!isList, true));
  document.addEventListener('keydown', e => {if (e.key === 'Tab' && !isList && !document.body.classList.contains('about-open')) setList(true);});
  board.addEventListener('pointerdown', e => {
    if (e.button !== 0 || document.body.classList.contains('about-open')) return;
    stopVideo(); vx=vy=0; moved=false;
    pointer={id:e.pointerId, x:e.clientX, y:e.clientY, initialX:e.clientX, initialY:e.clientY, time:performance.now()};
  });
  board.addEventListener('pointermove', e => {
    if(!pointer || pointer.id !== e.pointerId) return;
    const now = performance.now(), dt = Math.max(now-pointer.time, 1);
    const dx=e.clientX-pointer.x, dy=e.clientY-pointer.y;
    if(!moved && Math.hypot(e.clientX-pointer.initialX,e.clientY-pointer.initialY)>7) {moved=true;board.setPointerCapture(e.pointerId);board.classList.add('is-dragging');}
    if(moved) {x+=dx;y+=dy;vx=reduced.matches?0:Math.max(-40,Math.min(40,dx*16.67/dt));vy=reduced.matches?0:Math.max(-40,Math.min(40,dy*16.67/dt));animate();}
    pointer.x=e.clientX;pointer.y=e.clientY;pointer.time=now;
  });
  function release(e) {
    if(!pointer || (e && e.pointerId !== pointer.id)) return;
    if(moved) suppressUntil=performance.now()+400;
    if(performance.now()-pointer.time>80 || e?.type==='pointercancel') vx=vy=0;
    pointer=null;board.classList.remove('is-dragging');animate();
  }
  board.addEventListener('pointerup',release);board.addEventListener('pointercancel',release);board.addEventListener('lostpointercapture',release);
  board.addEventListener('click',e=>{if(moved || performance.now()<suppressUntil){e.preventDefault();e.stopPropagation();moved=false;}},true);
  board.addEventListener('dragstart',e=>e.preventDefault());
  board.addEventListener('wheel',e=>{
    if (isList || document.body.classList.contains('about-open')) return;
    e.preventDefault();stopVideo();
    const factor=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
    const dx=(e.shiftKey && !e.deltaX?e.deltaY:e.deltaX)*factor,dy=(e.shiftKey && !e.deltaX?0:e.deltaY)*factor;
    x-=dx*.65;y-=dy*.65;vx=reduced.matches?0:-dx*.05;vy=reduced.matches?0:-dy*.05;animate();
  },{passive:false});
  board.addEventListener('pointerover',e=>{const link=e.target.closest('.tile');if(link && link!==playing)playVideo(link);});
  board.addEventListener('pointerout',e=>{if(playing && !playing.contains(e.relatedTarget))stopVideo();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVideo();vx=vy=0;pointer=null;if(frame)cancelAnimationFrame(frame);frame=0;}});
  reduced.addEventListener('change',()=>{if(reduced.matches){stopVideo();vx=vy=0;}});
  let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(rebuild,120);});
  window.addEventListener('pageshow',()=>{suppressUntil=0;moved=false;pointer=null;});
})();
