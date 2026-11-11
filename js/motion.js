/* Figma 메모: 제목 타이핑, 본문 등장, 오류 창처럼 차례로 나타나는 사진과 스킬. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const timing = { revealGap: 140, popupGap: 240, typingStep: 65 };
  function finish(dialog) {
    const state = active.get(dialog);
    if (!state) return;
    state.observer?.disconnect();
    state.timers.forEach(clearTimeout);
    state.nodes.forEach(node => {
      node.classList.remove('reveal-pending', 'reveal-visible', 'popup-pending', 'popup-visible');
      node.inert = false;
    });
    state.typers.forEach(({ node, text, icon }) => {
      node.textContent = text;
      node.classList.remove('is-typing');
      icon?.classList.remove('typing-icon-pending', 'typing-icon-visible');
    });
    active.delete(dialog);
  }
  function open(dialog) {
    finish(dialog);
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const root = dialog.querySelector('.page-window-scroll');
    if (!root) return;
    const reveal = [...dialog.querySelectorAll('.about-intro > .section-description, .about-story > h3, .principles h3, .principles p, .help > .section-description, .service')];
    const popups = [...dialog.querySelectorAll('.skill-window:not([hidden]), .profile-card:not([hidden]), .photo-window:not([hidden])')];
    const typers = [...dialog.querySelectorAll('[data-typewriter]')].map(node => ({ node, text: node.textContent, icon: node.closest('.section-heading')?.querySelector('img') }));
    const nodes = [...reveal, ...popups];
    if (!nodes.length && !typers.length) return;
    const state = { nodes, typers, timers: new Set(), observer: null };
    active.set(dialog, state);
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        state.timers.delete(id);
        if (dialog.open && active.get(dialog) === state) fn();
      }, ms);
      state.timers.add(id);
    };
    reveal.forEach(node => { node.classList.add('reveal-pending'); node.inert = true; });
    popups.forEach(node => { node.classList.add('popup-pending'); node.inert = true; });
    typers.forEach(typer => {
      const { node, text, icon } = typer;
      const accessible = document.createElement('span');
      accessible.className = 'sr-only'; accessible.textContent = text;
      const wrapper = document.createElement('span'); wrapper.className = 'typewriter'; wrapper.setAttribute('aria-hidden', 'true');
      const layout = document.createElement('span'); layout.className = 'typing-layout'; layout.textContent = text;
      const output = document.createElement('span'); output.className = 'typing-output';
      wrapper.append(layout, output); node.replaceChildren(accessible, wrapper);
      icon?.classList.add('typing-icon-pending'); typer.output = output;
    });
    function type({node,text,icon,output}) {
      const letters = Array.from(text); let count = 0;
      node.classList.add('is-typing');
      const step = () => {
        output.textContent = letters.slice(0, ++count).join('');
        if (count < letters.length) later(step, timing.typingStep);
        else { node.classList.remove('is-typing'); icon?.classList.replace('typing-icon-pending', 'typing-icon-visible'); }
      };
      step();
    }
    const targets = [...nodes, ...typers.map(t => t.node)];
    let nextReveal = 0, nextPopup = 0;
    state.observer = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting)
        .sort((a,b) => targets.indexOf(a.target)-targets.indexOf(b.target))
        .forEach(({target}) => {
          state.observer.unobserve(target);
          const typer = typers.find(t => t.node === target);
          if (typer) { type(typer); return; }
          const popup = popups.includes(target), now = performance.now();
          const delay = Math.max(0, (popup ? nextPopup : nextReveal) - now);
          if (popup) nextPopup = now + delay + timing.popupGap;
          else nextReveal = now + delay + timing.revealGap;
          later(() => {
            target.classList.remove(popup ? 'popup-pending' : 'reveal-pending');
            target.classList.add(popup ? 'popup-visible' : 'reveal-visible');
            target.inert = false;
          }, delay);
        });
    }, { root, threshold: .05 });
    targets.forEach(node => state.observer.observe(node));
  }
  document.querySelectorAll('.page-window').forEach(dialog => dialog.addEventListener('close', () => finish(dialog)));
  reduced.addEventListener('change', () => { if (reduced.matches) [...active.keys()].forEach(finish); });
  window.PortfolioMotion = { open, finish };
})();
