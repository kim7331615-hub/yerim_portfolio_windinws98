/* 모든 작품을 일정 속도로 이어 보여주는 슬라이드. 설치 없이 HTML을 직접 열어도 실행됩니다. */
(() => {
  "use strict";
  const data = window.PORTFOLIO_DATA;
  const $ = selector => document.querySelector(selector);
  const dialog = $("#gallery-dialog");
  const track = $("#gallery-track");
  const viewport = $("#gallery-viewport");
  const dots = $("#gallery-dots");
  const pauseButton = $("#gallery-pause");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let key = "popup", index = 0, position = 0, cycle = 0;
  let paused = false, hovering = false, focused = false, suspended = false;
  let frame = 0, layoutFrame = 0, lastTime = null, opener = null;
  let originals = [], offsets = [];
  const category = () => data.categories[key];
  const wrap = (value, length) => ((value % length) + length) % length;

  function controls() {
    const count = category().items.length;
    $("#gallery-counter").textContent = count ? `${index + 1} / ${count}` : "0 / 0";
    pauseButton.hidden = count < 2;
    pauseButton.disabled = reduced.matches;
    pauseButton.setAttribute("aria-pressed", String(paused || reduced.matches));
    pauseButton.textContent = reduced.matches ? "동작 줄이기 켜짐" : paused ? "슬라이드 재생" : "슬라이드 일시정지";
    [...dots.children].forEach((button, i) => button.setAttribute("aria-current", String(i === index)));
  }
  function currentFromPosition() {
    if (!cycle || !offsets.length) return;
    const step = cycle / offsets.length;
    const next = wrap(Math.round(position / step), offsets.length);
    if (next !== index) { index = next; controls(); }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0; lastTime = null;
  }
  function canRun() {
    return dialog.open && cycle > 0 && category().items.length > 1 && !paused && !hovering &&
      !focused && !suspended && !document.hidden && !reduced.matches;
  }
  function tick(time) {
    frame = 0;
    if (!canRun()) { lastTime = null; return; }
    if (lastTime !== null) {
      // 저장한 소수점 위치를 누적해 저속·고주사율 화면에서도 움직임이 끊기지 않습니다.
      const elapsed = Math.min(time - lastTime, 64) / 1000;
      position = wrap(position + elapsed * (data.slideSpeed || 42), cycle);
      viewport.scrollLeft = position;
      currentFromPosition();
    }
    lastTime = time;
    frame = requestAnimationFrame(tick);
  }
  function refresh() {
    stop();
    if (canRun()) frame = requestAnimationFrame(tick);
  }
  function pauseForInteraction() {
    paused = true;
    stop();
    position = cycle ? wrap(viewport.scrollLeft, cycle) : 0;
    controls();
  }
  function moveTo(next, instant = false) {
    if (!originals.length) return;
    index = wrap(next, originals.length);
    position = offsets[index] || 0;
    viewport.scrollTo({ left: position, behavior: instant || reduced.matches ? "instant" : "smooth" });
    controls();
  }
  function makeCard(item, i, duplicate = false) {
    const figure = document.createElement("figure");
    figure.className = "artwork";
    figure.dataset.index = i;
    if (duplicate) {
      figure.dataset.duplicate = "true";
      figure.setAttribute("aria-hidden", "true");
    }
    const link = document.createElement(duplicate ? "div" : "button");
    link.className = "artwork-link";
    if (!duplicate) {
      link.type = "button";
      link.setAttribute("aria-label", item.title + " 크게 보기");
    }
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = duplicate ? "" : item.alt || item.title;
    img.draggable = false;
    img.decoding = "async";
    img.loading = i === 0 && !duplicate ? "eager" : "lazy";
    img.width = item.width ?? 500;
    img.height = item.height ?? 750;
    link.append(img);
    const caption = document.createElement("figcaption");
    if (key !== "detail" && key !== "projects") caption.className = "sr-only";
    caption.textContent = item.title + (item.note ? " · " + item.note : "");
    figure.append(link, caption);
    return figure;
  }
  function measure(preserve = true) {
    if (!dialog.open || !originals.length) return;
    stop();
    const progress = cycle ? position / cycle : null;
    track.querySelectorAll("[data-duplicate]").forEach(node => node.remove());
    const first = originals[0].getBoundingClientRect();
    const last = originals.at(-1).getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    offsets = originals.map(card => card.getBoundingClientRect().left - first.left);
    cycle = last.right - first.left + gap;
    if (first.width <= 0 || cycle <= 0) { cycle = 0; return; }
    if (originals.length > 1) {
      // 화면보다 짧은 작품 목록에서도 오른쪽에 빈 공간이 생기지 않도록 연결합니다.
      const copies = Math.ceil((viewport.clientWidth + gap) / cycle);
      const fragment = document.createDocumentFragment();
      for (let copy = 0; copy < copies; copy++) {
        category().items.forEach((item, i) => fragment.append(makeCard(item, i, true)));
      }
      track.append(fragment);
    }
    position = preserve && progress !== null ? progress * cycle : offsets[index] || 0;
    viewport.scrollTo({ left: position, behavior: "instant" });
    currentFromPosition();
    refresh();
  }
  function scheduleMeasure(preserve = true) {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; measure(preserve); });
  }
  function render(nextKey, selected = 0) {
    if (!data.categories[nextKey]) return;
    stop(); cancelAnimationFrame(layoutFrame);
    key = nextKey; index = wrap(selected, category().items.length || 1);
    cycle = 0; position = 0; focused = false;
    paused = !category().autoplay || reduced.matches;
    track.className = "gallery-track is-" + key;
    originals = category().items.map((item, i) => makeCard(item, i));
    track.replaceChildren(...originals);
    $("#gallery-title").textContent = "My Documents / " + category().title;
    document.querySelectorAll("[data-gallery-tab]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.galleryTab === key));
    });
    const empty = !originals.length;
    $("#gallery-empty").hidden = !empty;
    viewport.hidden = empty;
    $("#gallery-bottom").hidden = empty;
    dots.replaceChildren(...category().items.map((item, i) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "gallery-dot";
      button.textContent = i + 1;
      button.setAttribute("aria-label", item.title + " 선택");
      button.addEventListener("click", () => { pauseForInteraction(); moveTo(i); });
      return button;
    }));
    controls(); scheduleMeasure(false);
  }
  function open(nextKey, selected = 0) {
    if (!data.categories[nextKey]) return;
    if (!dialog.open) opener = document.activeElement;
    hovering = false; focused = false; suspended = false;
    render(nextKey, selected);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("modal-open");
  }
  track.addEventListener("click", event => {
    const card = event.target.closest(".artwork");
    if (!card) return;
    const item = category().items[Number(card.dataset.index)];
    pauseForInteraction();
    window.PortfolioUI.openImage(item.image, item.title, item);
  });
  $("[data-gallery-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    stop(); cancelAnimationFrame(layoutFrame); layoutFrame = 0;
    if (!document.querySelector("dialog[open]")) document.body.classList.remove("modal-open");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  document.querySelectorAll("[data-gallery-tab]").forEach(button => {
    button.addEventListener("click", () => render(button.dataset.galleryTab));
  });
  $("#gallery-prev").addEventListener("click", () => { pauseForInteraction(); moveTo(index - 1); });
  $("#gallery-next").addEventListener("click", () => { pauseForInteraction(); moveTo(index + 1); });
  pauseButton.addEventListener("click", () => {
    if (reduced.matches) return;
    paused = !paused;
    // 진행 중인 수동 smooth scroll을 끝내고 그 위치에서 이어 재생합니다.
    viewport.scrollTo({ left: viewport.scrollLeft, behavior: "instant" });
    position = cycle ? wrap(viewport.scrollLeft, cycle) : 0;
    controls(); refresh();
  });
  viewport.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); pauseForInteraction(); moveTo(index + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  viewport.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") { hovering = true; refresh(); }
  });
  viewport.addEventListener("pointerleave", () => { hovering = false; refresh(); });
  viewport.addEventListener("focusin", () => { focused = true; refresh(); });
  viewport.addEventListener("focusout", event => { focused = viewport.contains(event.relatedTarget); refresh(); });
  viewport.addEventListener("pointerdown", pauseForInteraction);
  viewport.addEventListener("wheel", pauseForInteraction, { passive: true });
  viewport.addEventListener("scroll", () => {
    if (frame || !cycle) return;
    position = wrap(viewport.scrollLeft, cycle);
    currentFromPosition();
  }, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(() => scheduleMeasure()).observe(viewport);
  else window.addEventListener("resize", () => scheduleMeasure());
  document.addEventListener("visibilitychange", refresh);
  reduced.addEventListener("change", () => {
    if (reduced.matches) paused = true;
    controls(); refresh();
  });
  window.PortfolioGallery = {
    open,
    suspend(value) { suspended = value; refresh(); },
    close() { if (dialog.open) dialog.close(); }
  };
})();
