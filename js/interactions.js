/* 기본/클릭 커서, 창 드래그, 그림판 팔레트. */
(() => {
  'use strict';
  const html = document.documentElement;
  const desktop = document.querySelector('.desktop');
  const paint = document.querySelector('#paint-window');
  const resetCursor = () => html.classList.remove('cursor-pressed');
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button === 0) html.classList.add('cursor-pressed');
  }, true);
  window.addEventListener('pointerup', resetCursor, true);
  window.addEventListener('pointercancel', resetCursor, true);
  window.addEventListener('blur', resetCursor);
  document.addEventListener('visibilitychange', resetCursor);
  let layer = 5;
  const movable = [...document.querySelectorAll('[data-draggable]')];
  function place(win, x, y) {
    const bounds = desktop.getBoundingClientRect(), box = win.getBoundingClientRect();
    x = Math.max(0, Math.min(x, Math.max(0, bounds.width-box.width)));
    y = Math.max(0, Math.min(y, Math.max(0, bounds.height-box.height)));
    win.style.setProperty('--drag-left', x+'px');
    win.style.setProperty('--drag-top', y+'px');
    win.classList.add('was-dragged');
  }
  function resetPositions() {
    movable.forEach(win => {
      win.classList.remove('was-dragged','is-dragging');
      win.style.removeProperty('--drag-left'); win.style.removeProperty('--drag-top');
      win.style.removeProperty('z-index');
    });
  }
  movable.forEach(win => {
    const bar = win.querySelector('.title-bar'); let drag = null;
    win.addEventListener('pointerdown', () => { win.style.zIndex = String(++layer); });
    bar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button,a') || win.classList.contains('is-maximized')) return;
      const box = win.getBoundingClientRect(), bounds = desktop.getBoundingClientRect();
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY, left:box.left-bounds.left, top:box.top-bounds.top };
      place(win, drag.left, drag.top);
      bar.setPointerCapture(event.pointerId); win.classList.add('is-dragging'); event.preventDefault();
    });
    bar.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      place(win, drag.left+event.clientX-drag.x, drag.top+event.clientY-drag.y);
    });
    const stop = () => { drag=null; win.classList.remove('is-dragging'); };
    bar.addEventListener('pointerup', stop);
    bar.addEventListener('pointercancel', stop);
    bar.addEventListener('lostpointercapture', stop);
    window.addEventListener('blur', stop);
    bar.addEventListener('keydown', event => {
      if (event.target !== bar || win.classList.contains('is-maximized')) return;
      if (event.key === 'Home') { event.preventDefault(); win.classList.remove('was-dragged'); return; }
      const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if (!direction) return;
      event.preventDefault();
      const box=win.getBoundingClientRect(), bounds=desktop.getBoundingClientRect(), step=event.shiftKey?40:10;
      place(win,box.left-bounds.left+direction[0]*step,box.top-bounds.top+direction[1]*step);
    });
  });
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(() => {
      movable.filter(win => win.classList.contains('was-dragged') && !win.classList.contains('is-maximized') && !win.hidden).forEach(win => {
        place(win,parseFloat(win.style.getPropertyValue('--drag-left'))||0,parseFloat(win.style.getPropertyValue('--drag-top'))||0);
      });
    });
  });
  const colors=[...document.querySelectorAll('[data-paint-color]')];
  colors.forEach(button => button.addEventListener('click', () => {
    paint.style.setProperty('--paint-ink',button.dataset.paintColor);
    colors.forEach(other => other.setAttribute('aria-pressed',String(other===button)));
  }));
  document.querySelector('[data-paint-menu="edit"]').addEventListener('click', () => {
    resetPositions();paint.style.removeProperty('--paint-ink');
    colors.forEach((button,i) => button.setAttribute('aria-pressed',String(i===0)));
  });
})();
