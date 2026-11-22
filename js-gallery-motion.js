/* Pointer-led gallery: damped panning, release inertia, small camera parallax. */
(() => {
  'use strict';
  const projects = window.GALLERY_PROJECTS;
  const board = document.getElementById('gallery-board');
  const layer = document.getElementById('gallery-cells');
  const view = document.querySelector('.view-toggle');
  if (!projects?.length || !board || !layer || !view) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const telemetry = {
    x: document.querySelector('[data-coordinate-x]'),
    y: document.querySelector('[data-coordinate-y]'),
    speed: document.querySelector('[data-speed]')
  };
  const cursor = document.createElement('div');
  cursor.className = 'motion-pointer'; cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="pointer-cross"></span><span class="pointer-label">SEE THE PROJECT</span>';
  document.body.append(cursor);
  const mod = (n, m) => ((n % m) + m) % m;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const coordinate = n => `${n < 0 ? '\u2212' : '+'}${Math.abs(n).toFixed(2).padStart(7, '0')}`;
  let cell = innerWidth <= 600 ? 210 : 280, cols = 0, rows = 0, pool = [];
  let x = innerWidth / 2 - cell * 1.5, y = innerHeight / 2 - cell * 1.5;
  let originX = x, originY = y, targetX = x, targetY = y, velocityX = 0, velocityY = 0;
  let parallaxX = 0, parallaxY = 0, frame = 0, lastTime = 0;
  let pointer = null, suppressUntil = 0, hovered = null, playing = null;
  let isList = document.body.dataset.start === 'list';
  const mouse = {x: innerWidth/2, y: innerHeight/2, drawX: innerWidth/2, drawY: innerHeight/2, visible: false};

  function stopVideo() {
    if (!playing) return;
    playing.querySelector('video')?.pause(); playing.classList.remove('playing'); playing = null;
  }
  function setHover(link) {
    if (hovered === link) return;
    hovered?.classList.remove('is-hovered'); stopVideo(); hovered = link;
    hovered?.classList.add('is-hovered');
    cursor.classList.toggle('is-project', !!link && !pointer);
    if (!link || reduced.matches || !fine.matches || pointer || document.hidden) return;
    playing = link;
    let video = link.querySelector('video');
    if (!video) {
      video = document.createElement('video'); video.muted = true; video.loop = true;
      video.playsInline = true; video.preload = 'none'; video.setAttribute('aria-hidden', 'true');
      video.src = link.dataset.video; link.querySelector('.tile-media').append(video);
    }
    video.play().then(() => { if (playing === link) link.classList.add('playing'); else video.pause(); }).catch(() => {});
  }
  function updateHover() {
    const open = document.body.classList.contains('about-open');
    const element = fine.matches && mouse.visible && !isList ? document.elementFromPoint(mouse.x, mouse.y) : null;
    const link = !pointer && !open ? element?.closest('.tile') : null;
    setHover(link && board.contains(link) ? link : null);
    cursor.classList.toggle('is-ui', !!element?.closest('.dock-shell,.explore-tools,.masthead'));
    cursor.classList.toggle('is-dragging', !!pointer?.moved);
  }
  function cursorVisibility() {
    const visible = fine.matches && mouse.visible && !isList && !document.hidden;
    document.body.classList.toggle('has-motion-pointer', visible);
    cursor.classList.toggle('is-visible', visible);
  }
  function render() {
    const displayX = x + parallaxX, displayY = y + parallaxY;
    const startCol = Math.floor(-displayX / cell) - 1, startRow = Math.floor(-displayY / cell) - 1;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const worldCol = startCol + col, worldRow = startRow + row;
      const item = pool[row * cols + col], index = mod(worldCol + worldRow * 5, projects.length), p = projects[index];
      item.node.style.transform = `translate3d(${(worldCol * cell + displayX).toFixed(2)}px,${(worldRow * cell + displayY).toFixed(2)}px,0)`;
      if (item.index !== index) {
        if (hovered && item.node.contains(hovered)) setHover(null);
        item.index = index;
        item.node.innerHTML = `<a class="tile" tabindex="-1" href="${esc(p.href)}" data-video="${esc(p.video)}" draggable="false"><figure><div class="tile-media"><img src="${esc(p.image)}" alt="${esc(p.title)}" width="1280" height="720" decoding="async" draggable="false"></div><figcaption><span>N\u00b0${p.number}</span><span>${esc(p.short || p.title)}</span></figcaption><span class="frame-mark top-left"></span><span class="frame-mark top-right"></span><span class="frame-mark bottom-left"></span><span class="frame-mark bottom-right"></span><span class="frame-tick tick-left"></span><span class="frame-tick tick-right"></span><span class="frame-dim">16:9</span></figure></a>`;
      }
    }
    telemetry.x.textContent = coordinate(originX - displayX);
    telemetry.y.textContent = coordinate(originY - displayY);
    cursor.style.transform = `translate3d(${mouse.drawX.toFixed(2)}px,${mouse.drawY.toFixed(2)}px,0)`;
    updateHover();
  }
  function rebuild() {
    setHover(null); cell = innerWidth <= 600 ? 210 : 280;
    cols = Math.ceil(innerWidth / cell) + 2; rows = Math.ceil(innerHeight / cell) + 2;
    pool = []; layer.replaceChildren();
    for (let i = 0; i < cols * rows; i++) {
      const node = document.createElement('div'); node.className = 'gallery-cell';
      node.style.width = node.style.height = `${cell}px`; node.setAttribute('aria-hidden', 'true');
      layer.append(node); pool.push({node, index: -1});
    }
    render();
  }
  function animate() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function tick(time) {
    frame = 0;
    const dt = lastTime ? Math.min(time - lastTime, 40) : 16.67; lastTime = time;
    const oldX = x, oldY = y;
    if (!pointer && !isList) {
      targetX += velocityX * dt; targetY += velocityY * dt;
      const friction = Math.exp(-dt / 185); velocityX *= friction; velocityY *= friction;
      if (Math.abs(velocityX) < .0015) velocityX = 0;
      if (Math.abs(velocityY) < .0015) velocityY = 0;
    }
    const smooth = reduced.matches ? 1 : 1 - Math.exp(-dt / 72);
    x += (targetX - x) * smooth; y += (targetY - y) * smooth;
    const parallax = fine.matches && mouse.visible && !pointer && !isList && !reduced.matches && !document.body.classList.contains('about-open');
    const aimX = parallax ? (innerWidth / 2 - mouse.x) * .045 : 0;
    const aimY = parallax ? (innerHeight / 2 - mouse.y) * .045 : 0;
    parallaxX += (aimX - parallaxX) * smooth; parallaxY += (aimY - parallaxY) * smooth;
    const follow = reduced.matches ? 1 : 1 - Math.exp(-dt / 24);
    mouse.drawX += (mouse.x - mouse.drawX) * follow; mouse.drawY += (mouse.y - mouse.drawY) * follow;
    if (!isList) render();
    else cursor.style.transform = `translate3d(${mouse.drawX}px,${mouse.drawY}px,0)`;
    const speed = Math.hypot(x - oldX, y - oldY) * 16.67 / dt;
    telemetry.speed.textContent = speed.toFixed(1).padStart(4, '0');
    const moving = !isList && (Math.abs(targetX-x) + Math.abs(targetY-y) > .04 || (!pointer && (velocityX || velocityY)) || Math.abs(aimX-parallaxX) + Math.abs(aimY-parallaxY) > .04);
    const following = mouse.visible && Math.hypot(mouse.x-mouse.drawX, mouse.y-mouse.drawY) > .1;
    if (moving || following) animate(); else {lastTime = 0; telemetry.speed.textContent = '00.0';}
  }
  function setList(value, focus = false) {
    isList = value; velocityX = velocityY = 0; setHover(null);
    document.body.classList.toggle('list-view', value);
    view.textContent = value ? 'VIEW GALLERY' : 'VIEW LIST'; view.setAttribute('aria-pressed', String(value));
    cursorVisibility();
    if (!value) { scrollTo(0, 0); rebuild(); animate(); }
    if (focus) view.focus();
  }
  view.hidden = false; document.body.classList.add('has-gallery'); rebuild(); setList(isList);
  view.addEventListener('click', () => setList(!isList, true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !isList && !document.body.classList.contains('about-open')) setList(true);
  });
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (!mouse.visible) {mouse.drawX = e.clientX; mouse.drawY = e.clientY;}
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.visible = true; cursorVisibility(); animate();
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave', () => {
    mouse.visible = false; cursorVisibility(); setHover(null); animate();
  });
  board.addEventListener('pointerdown', e => {
    if (e.button !== 0 || document.body.classList.contains('about-open')) return;
    velocityX = velocityY = 0; setHover(null);
    pointer = {id:e.pointerId, x:e.clientX, y:e.clientY, startX:e.clientX, startY:e.clientY, time:performance.now(), moved:false};
  });
  board.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const now = performance.now(), dt = Math.max(now - pointer.time, 8);
    const dx = e.clientX-pointer.x, dy = e.clientY-pointer.y;
    if (!pointer.moved && Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY) > 7) {
      pointer.moved = true; board.setPointerCapture(e.pointerId); board.classList.add('is-dragging');
    }
    if (pointer.moved) {
      targetX += dx; targetY += dy;
      velocityX = reduced.matches ? 0 : Math.max(-2.4, Math.min(2.4, velocityX*.35 + dx/dt*.65));
      velocityY = reduced.matches ? 0 : Math.max(-2.4, Math.min(2.4, velocityY*.35 + dy/dt*.65));
      animate();
    }
    pointer.x=e.clientX; pointer.y=e.clientY; pointer.time=now;
  });
  function release(e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    if (pointer.moved) suppressUntil = performance.now()+400;
    if (performance.now()-pointer.time > 80 || e.type === 'pointercancel') velocityX=velocityY=0;
    pointer=null; board.classList.remove('is-dragging'); cursor.classList.remove('is-dragging'); animate();
  }
  board.addEventListener('pointerup',release); board.addEventListener('pointercancel',release); board.addEventListener('lostpointercapture',release);
  board.addEventListener('click',e => {if (performance.now()<suppressUntil) {e.preventDefault(); e.stopPropagation();}},true);
  board.addEventListener('dragstart',e=>e.preventDefault());
  board.addEventListener('wheel',e=>{
    if (isList || document.body.classList.contains('about-open')) return;
    e.preventDefault(); setHover(null);
    const factor=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
    const dx=(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*factor, dy=(e.shiftKey&&!e.deltaX?0:e.deltaY)*factor;
    targetX-=dx*.72; targetY-=dy*.72;
    velocityX=reduced.matches?0:-dx*.001; velocityY=reduced.matches?0:-dy*.001; animate();
  },{passive:false});
  const syncPreferences=()=>{velocityX=velocityY=0; setHover(null); cursorVisibility(); animate();};
  reduced.addEventListener('change',syncPreferences); fine.addEventListener('change',syncPreferences);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){velocityX=velocityY=0; pointer=null; board.classList.remove('is-dragging'); setHover(null); if(frame) cancelAnimationFrame(frame); frame=0; lastTime=0;}
    cursorVisibility();
  });
  let resize; window.addEventListener('resize',()=>{clearTimeout(resize); resize=setTimeout(()=>{rebuild();animate();},120);});
  window.addEventListener('pageshow',()=>{suppressUntil=0;pointer=null;board.classList.remove('is-dragging');cursorVisibility();animate();});
})();
