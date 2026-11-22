(() => {
  'use strict';
  const toggle = document.querySelector('.about-toggle');
  const panel = document.querySelector('#about-panel');
  const shell = document.querySelector('.dock-shell');
  const label = document.querySelector('[data-about-label]');
  const setAbout = (open, restoreFocus = false) => {
    panel.hidden = !open;
    shell.classList.toggle('is-open', open);
    document.body.classList.toggle('about-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'CLOSE' : 'ABOUT';
    if (restoreFocus) toggle.focus();
  };
  toggle?.addEventListener('click', () => setAbout(panel.hidden));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) setAbout(false, true); });
  document.addEventListener('pointerdown', e => { if (!panel.hidden && !shell.contains(e.target)) setAbout(false); });
  if (document.body.dataset.start === 'about') setAbout(true);
  function clock() {
    const value = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date());
    document.querySelectorAll('[data-clock]').forEach(el => {el.textContent = value; el.dateTime = new Date().toISOString();});
  }
  clock(); const timer = setInterval(clock, 30000);
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
    else clock();
  });
  window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
  document.querySelectorAll('.load-original').forEach(button => button.addEventListener('click', () => {
    const target = button.closest('.project-film').querySelector('.original-player');
    if (!target.hidden) { target.hidden = true; target.replaceChildren(); button.textContent = 'LOAD ORIGINAL PLAYER'; return; }
    const iframe = document.createElement('iframe');
    iframe.src = `https://drive.google.com/file/d/${encodeURIComponent(button.dataset.driveId)}/preview`;
    iframe.title = 'Original film on Google Drive'; iframe.allow = 'autoplay; fullscreen'; iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'; target.append(iframe); target.hidden = false;
    button.textContent = 'CLOSE ORIGINAL PLAYER'; button.closest('.project-film').querySelector('video')?.pause();
  }));
})();
