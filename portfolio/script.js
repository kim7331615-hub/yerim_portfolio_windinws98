(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tallGallery = window.matchMedia("(min-height: 450px)");
  const galleryScrollRatio = 1.5;
  const galleryEntryPause = 90;
  const galleryExitPause = 150;
  const pinnedGalleryHint = "스크롤하거나 옆으로 밀어 보기";
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

  function smoothstep(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  }

  const hero = document.querySelector(".hero");
  const stage = hero.querySelector(".hero-stage");
  const lens = hero.querySelector(".magnifier");
  const nav = document.querySelector(".site-nav");
  const chart = document.querySelector("[data-chart]");
  const navItems = Array.from(nav.querySelectorAll("a")).map(link => ({
    link,
    section: document.querySelector(link.hash)
  }));
  const introTime = performance.now();
  let lensGeometry;
  let sweepProgress = 0;
  let sweepFinished = false;
  let lastHeroProgress = -1;
  let navHeight = 0;
  let activeLink = null;
  let framePending = false;
  let previousTime = 0;
  let previousY = window.scrollY;
  let scrollBoost = 0;
  let boostTime = 0;
  let wheelGallery = null;

  function measureHero() {
    const height = stage.clientHeight;
    lensGeometry = {
      width: stage.clientWidth,
      height,
      x: lens.offsetLeft + lens.offsetWidth * .322,
      y: lens.offsetTop + lens.offsetHeight * .411,
      travel: Math.max(1, height - Math.min(72, height * .12))
    };
    lastHeroProgress = -1;
  }

  function renderHero(time, y) {
    if (reducedMotion.matches) return false;

    const progress = clamp(y / lensGeometry.travel);
    const previousSweep = sweepProgress;
    if (progress > 0) sweepFinished = true;
    if (!sweepFinished) {
      const pass = clamp((time - introTime - 480) / 5300);
      sweepProgress = smoothstep(pass);
      sweepFinished = pass === 1;
    }
    if (progress === lastHeroProgress && previousSweep === sweepProgress) return !sweepFinished;

    const zoom = smoothstep(progress);
    const sweepOffset = (lensGeometry.width * .82 - lensGeometry.x) * sweepProgress;
    const lensX = sweepOffset + (lensGeometry.width / 2 - lensGeometry.x - sweepOffset) * zoom;
    const lensY = (lensGeometry.height * .45 + Math.min(y, lensGeometry.travel) * .72 - lensGeometry.y) * zoom;
    stage.style.setProperty("--lens-x", lensX + "px");
    stage.style.setProperty("--lens-y", lensY + "px");
    stage.style.setProperty("--lens-scale", String(1 + 5.5 * zoom));
    stage.style.setProperty("--lens-opacity", String(1 - smoothstep((progress - .76) / .24)));
    stage.style.setProperty("--hero-copy-opacity", String(1 - smoothstep((progress - .18) / .58)));
    stage.style.setProperty("--hero-copy-y", -36 * zoom + "px");
    stage.style.setProperty("--hero-wash", String(smoothstep((progress - .86) / .14)));
    lastHeroProgress = progress;
    return !sweepFinished;
  }

  function updateNav() {
    const marker = navHeight + 18;
    let current = null;
    for (const { link, section } of navItems) {
      if (section.getBoundingClientRect().top <= marker) current = link;
    }
    if (current === activeLink) return;
    activeLink?.removeAttribute("aria-current");
    current?.setAttribute("aria-current", "location");
    activeLink = current;
  }

  const revealItems = document.querySelectorAll("[data-reveal], [data-heading-reveal]");
  const revealObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      target.classList.add("is-revealed");
      revealObserver.unobserve(target);
    }
  }, { rootMargin: "0px 0px -9% 0px", threshold: .08 });
  revealItems.forEach(item => revealObserver.observe(item));

  function revealChart() {
    if (chart.classList.contains("is-revealed")) return;
    const { top, bottom, height } = chart.getBoundingClientRect();
    const visibleHeight = Math.min(bottom, window.innerHeight) - Math.max(top, navHeight);
    const availableHeight = Math.min(height, window.innerHeight - navHeight);
    if (visibleHeight >= availableHeight - 1 || (top < navHeight && visibleHeight >= availableHeight * .8)) {
      chart.classList.add("is-revealed");
    }
  }

  function galleryButton(symbol, label, regionId) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = symbol;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-controls", regionId);
    button.title = label;
    return button;
  }

  function galleryStart(state) {
    return window.scrollY + state.category.getBoundingClientRect().top - navHeight;
  }

  function scrollGalleryTo(state, left, behavior) {
    const start = galleryStart(state) + state.startHold;
    const target = clamp(left, 0, state.distance);
    if (wheelGallery?.state === state && behavior === "smooth") {
      window.scrollTo({ top: start + wheelGallery.position / galleryScrollRatio, behavior: "instant" });
    }
    wheelGallery = null;
    window.scrollTo({ top: start + target / galleryScrollRatio, behavior });
  }

  function setupGallery(category) {
    const viewport = category.querySelector(".strip-viewport");
    const track = viewport.querySelector(".strip-track");
    const strip = track.querySelector(".strip-set");
    const clone = strip.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach(link => { link.tabIndex = -1; });
    track.append(clone);

    const name = category.querySelector("h3").textContent;
    const controls = document.createElement("div");
    controls.className = "strip-controls";
    const hint = document.createElement("p");
    hint.className = "strip-hint";
    const previous = galleryButton("←", name + " 이전 작업물", viewport.id);
    const pause = galleryButton("Ⅱ", name + " 자동 슬라이드 일시정지", viewport.id);
    const next = galleryButton("→", name + " 다음 작업물", viewport.id);
    pause.setAttribute("aria-pressed", "false");
    controls.append(hint, previous, pause, next);
    category.querySelector(".work-gallery-panel").append(controls);

    const state = {
      category, viewport, strip, clone, hint, pause, previous, next,
      speed: category.classList.contains("banners") ? 33 : 26,
      cycle: 0,
      step: 0,
      distance: 0,
      startHold: 0,
      travel: 0,
      pinned: false,
      position: 0,
      written: 0,
      visible: false,
      paused: false,
      hovered: false,
      focused: false,
      manualUntil: 0
    };

    function pauseForInput() {
      state.manualUntil = performance.now() + 1900;
      requestRender();
    }

    function moveByCard(direction) {
      if (state.pinned) {
        scrollGalleryTo(state, viewport.scrollLeft + state.step * direction, "smooth");
        return;
      }
      pauseForInput();
      const end = viewport.scrollWidth - viewport.clientWidth;
      let current = viewport.scrollLeft;
      if (!clone.hidden && direction < 0 && current <= 1) {
        viewport.scrollLeft = state.cycle;
        current = viewport.scrollLeft;
      }
      if (!clone.hidden && direction > 0 && current + state.step > end) {
        viewport.scrollLeft = current % state.cycle;
        current = viewport.scrollLeft;
      }
      viewport.scrollTo({
        left: clamp(current + state.step * direction, 0, end),
        behavior: reducedMotion.matches ? "instant" : "smooth"
      });
    }

    previous.addEventListener("click", () => moveByCard(-1));
    next.addEventListener("click", () => moveByCard(1));
    pause.addEventListener("click", () => {
      state.paused = !state.paused;
      pause.setAttribute("aria-pressed", String(state.paused));
      pause.textContent = state.paused ? "▷" : "Ⅱ";
      pause.title = name + (state.paused ? " 자동 슬라이드 재생" : " 자동 슬라이드 일시정지");
      pause.setAttribute("aria-label", pause.title);
      requestRender();
    });
    viewport.addEventListener("keydown", event => {
      if (event.target !== viewport || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      moveByCard(event.key === "ArrowLeft" ? -1 : 1);
    });
    viewport.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") state.hovered = true;
    });
    viewport.addEventListener("pointerleave", () => {
      state.hovered = false;
      requestRender();
    });
    viewport.addEventListener("pointerdown", pauseForInput, { passive: true });
    viewport.addEventListener("pointerup", pauseForInput, { passive: true });
    viewport.addEventListener("wheel", event => {
      if (!state.pinned && Math.abs(event.deltaX) > Math.abs(event.deltaY)) pauseForInput();
    }, { passive: true });
    viewport.addEventListener("scroll", () => {
      if (!state.pinned || root.classList.contains("viewer-open")) return;
      const left = viewport.scrollLeft;
      if (Math.abs(left - state.written) < 1) return;

      // 가로 스와이프와 트랙패드 이동을 세로 스크롤 위치에도 반영합니다.
      state.written = left;
      scrollGalleryTo(state, left, "instant");
    }, { passive: true });
    viewport.addEventListener("focusin", event => {
      state.focused = true;
      const link = event.target.closest(".strip-set a");
      if (!state.pinned || !link?.matches(":focus-visible")) return;
      const card = link.getBoundingClientRect();
      const left = card.left - strip.getBoundingClientRect().left;
      if (left < state.written - 1 || left + card.width > state.written + viewport.clientWidth + 1) {
        scrollGalleryTo(state, left, "instant");
      }
    });
    viewport.addEventListener("focusout", event => {
      state.focused = viewport.contains(event.relatedTarget);
      requestRender();
    });
    return state;
  }

  const galleries = Array.from(document.querySelectorAll("[data-gallery]"), setupGallery);
  const reverseGalleries = galleries.slice().reverse();
  const galleryStates = new Map(galleries.map(state => [state.viewport, state]));
  const galleryObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) galleryStates.get(target).visible = isIntersecting;
    requestRender();
  }, { threshold: .12 });
  galleries.forEach(({ viewport }) => galleryObserver.observe(viewport));

  function measureGalleries() {
    const canPin = tallGallery.matches && !reducedMotion.matches;
    for (const state of galleries) {
      state.category.classList.toggle("is-pinned", canPin);
      const pinned = canPin && state.viewport.clientHeight >= 150;
      state.pinned = pinned;
      state.category.classList.toggle("is-pinned", pinned);
      state.pause.hidden = state.clone.hidden = pinned || reducedMotion.matches;
      state.hint.textContent = pinned ? pinnedGalleryHint : "가로로 밀어 작업물 보기";
      const first = state.strip.firstElementChild;
      state.step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(state.strip).columnGap);
      state.cycle = state.strip.getBoundingClientRect().width;
      state.distance = Math.max(0, state.viewport.scrollWidth - state.viewport.clientWidth);
      const panelHeight = state.category.firstElementChild.clientHeight;
      state.startHold = clamp(panelHeight * .06, 32, 62);
      const endHold = clamp(panelHeight * .2, 120, 190);
      state.travel = pinned && state.distance > 0 ? state.startHold + state.distance / galleryScrollRatio + endHold : 0;
      state.category.style.setProperty("--gallery-travel", state.travel + "px");
      state.position = state.viewport.scrollLeft;
      state.written = state.position;
      state.previous.disabled = state.next.disabled = !state.distance;
    }
  }

  function holdWheelGallery(from, delta) {
    const down = delta > 0;
    const destination = from + delta;
    for (const state of down ? galleries : reverseGalleries) {
      if (!state.travel) continue;
      const start = galleryStart(state);
      const top = Math.ceil(start);
      const bottom = Math.floor(start + state.travel);
      if (down ? from >= bottom || destination < top : from <= top || destination > bottom) continue;

      const pageY = clamp(from, top, bottom);
      const position = clamp((pageY - start - state.startHold) * galleryScrollRatio, 0, state.distance);
      wheelGallery = {
        state, pageY, position,
        holdDirection: Math.sign(delta),
        holdUntil: 0,
        pauseOnRender: pageY === from ? 0 : galleryEntryPause
      };
      window.scrollTo({ top: pageY, behavior: "instant" });
      requestRender();
      return true;
    }
    return false;
  }

  function advanceWheelGallery(delta, now) {
    const held = wheelGallery;
    const { state, position } = held;
    const direction = Math.sign(delta);
    if (held.holdDirection === direction && (held.pauseOnRender || now < held.holdUntil)) return;

    const edge = direction > 0 ? state.distance : 0;
    if (position === edge) {
      // 가로 이동이 끝난 위치에서 세로 스크롤을 이어갑니다.
      const start = galleryStart(state);
      const from = direction > 0 ? Math.floor(start + state.travel) : Math.ceil(start);
      const step = clamp(delta, -window.innerHeight / 2, window.innerHeight / 2);
      wheelGallery = null;
      if (!holdWheelGallery(from, step)) window.scrollTo({ top: from + step, behavior: "instant" });
      return;
    }

    const step = clamp(delta * galleryScrollRatio, -state.step, state.step);
    held.position = clamp(position + step, 0, state.distance);
    held.holdDirection = direction;
    held.holdUntil = 0;
    held.pauseOnRender = held.position === edge ? galleryExitPause : 0;
    requestRender();
  }

  window.addEventListener("wheel", event => {
    if (!tallGallery.matches || reducedMotion.matches || root.classList.contains("viewer-open")) return;
    if (!event.cancelable || event.defaultPrevented || event.ctrlKey || event.shiftKey || event.metaKey) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * unit;
    const now = performance.now();
    if (!wheelGallery && !holdWheelGallery(window.scrollY, delta)) return;
    event.preventDefault();
    advanceWheelGallery(delta, now);
  }, { passive: false });

  const pageScrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);
  window.addEventListener("keydown", event => {
    if (!wheelGallery || event.defaultPrevented || !pageScrollKeys.has(event.key) || root.classList.contains("viewer-open")) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select"))) return;
    if (event.key === " " && target instanceof Element && target.closest("button, summary")) return;
    scrollGalleryTo(wheelGallery.state, wheelGallery.position, "instant");
  });

  function boostAt(time) {
    return scrollBoost * Math.exp(-Math.max(0, time - boostTime) / 190);
  }

  function renderGalleries(time, elapsed) {
    if (reducedMotion.matches || root.classList.contains("viewer-open")) return false;

    let moving = false;
    const boost = boostAt(time);
    for (const state of galleries) {
      if (state.pinned) {
        const held = wheelGallery?.state === state ? wheelGallery : null;
        const target = held
          ? held.position
          : clamp((window.scrollY - galleryStart(state) - state.startHold) * galleryScrollRatio, 0, state.distance);
        if (Math.abs(state.viewport.scrollLeft - target) > .5) state.viewport.scrollLeft = target;
        state.written = state.viewport.scrollLeft;
        state.previous.disabled = state.written <= 1;
        const atEnd = state.written >= state.distance - 1;
        if (state.next.disabled !== atEnd) {
          state.next.disabled = atEnd;
          state.hint.textContent = atEnd ? "아래로 스크롤해 다음 구간 보기" : pinnedGalleryHint;
        }
        if (held?.pauseOnRender) {
          held.holdUntil = performance.now() + held.pauseOnRender;
          held.pauseOnRender = 0;
        }
        continue;
      }
      if (!state.visible || state.paused || state.focused || !state.cycle) continue;
      if (state.hovered && boost < 18) continue;
      moving = true;
      if (time < state.manualUntil) continue;

      // 가로 스와이프와 버튼 이동 결과를 다음 자동 슬라이드에 이어받습니다.
      const left = state.viewport.scrollLeft;
      if (left !== state.written) state.position = left;
      state.position = (state.position + (state.speed + boost) * elapsed) % state.cycle;
      state.viewport.scrollLeft = state.position;
      state.written = state.viewport.scrollLeft;
    }
    return moving;
  }

  function render(time) {
    framePending = false;
    if (document.hidden) return;
    const elapsed = Math.min(40, Math.max(0, time - (previousTime || time))) / 1000;
    previousTime = time;
    const heroMoving = renderHero(time, window.scrollY);
    const galleryMoving = renderGalleries(time, elapsed);
    revealChart();
    updateNav();
    if (heroMoving || galleryMoving) requestRender();
  }

  function requestRender() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(render);
  }

  function refreshLayout() {
    const held = wheelGallery;
    const progress = held ? held.position / held.state.distance : 0;
    wheelGallery = null;
    root.classList.toggle("motion-ready", !reducedMotion.matches);
    if (reducedMotion.matches) stage.removeAttribute("style");
    navHeight = nav.getBoundingClientRect().height;
    measureHero();
    measureGalleries();
    if (held?.state.travel) scrollGalleryTo(held.state, progress * held.state.distance, "instant");
    requestRender();
  }

  window.addEventListener("scroll", () => {
    const delta = window.scrollY - previousY;
    previousY = window.scrollY;
    if (wheelGallery && Math.abs(previousY - wheelGallery.pageY) > 1) wheelGallery = null;
    if (delta > 0) {
      const now = performance.now();
      scrollBoost = Math.min(980, boostAt(now) + delta * 12);
      boostTime = now;
    }
    requestRender();
  }, { passive: true });
  window.addEventListener("resize", refreshLayout, { passive: true });
  window.addEventListener("pageshow", refreshLayout);
  document.addEventListener("visibilitychange", requestRender);
  tallGallery.addEventListener("change", refreshLayout);
  reducedMotion.addEventListener("change", refreshLayout);
  document.fonts.ready.then(refreshLayout);

  const imageViewer = document.querySelector("#image-viewer");
  const image = imageViewer.querySelector(".viewer-image");
  const detailView = imageViewer.querySelector(".viewer-detail");
  const detailSource = imageViewer.querySelector("[data-detail-source]");
  const imageError = imageViewer.querySelector(".viewer-error");
  const imageSource = imageViewer.querySelector("[data-image-source]");
  const deviceViewer = document.querySelector("#device-viewer");
  const deviceHost = deviceViewer.querySelector(".device-host");
  const deviceScreen = deviceViewer.querySelector(".device-screen");
  const deviceToolbar = deviceViewer.querySelector(".device-toolbar");
  const deviceBody = deviceViewer.querySelector(".viewer-body");
  const sizes = {
    desktop: [1440, 900],
    tablet: [834, 1112],
    mobile: [390, 844]
  };
  const deviceLabels = { desktop: "PC", tablet: "태블릿", mobile: "모바일" };
  const viewerTriggers = new WeakMap();
  let deviceFrame = null;
  let deviceMode = "desktop";

  function createDeviceFrame(link) {
    const frame = document.createElement("iframe");
    frame.title = link.dataset.projectLink + " 실제 웹사이트";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = link.href;
    return frame;
  }

  function scalePreview(frame, width) {
    const scale = width / Number(frame.width);
    frame.style.transform = "scale(" + scale + ")";
  }

  const previewResize = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      scalePreview(target.firstElementChild, contentRect.width);
    }
  });

  const previewObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      previewObserver.unobserve(target);
      const link = target.closest(".project").querySelector("[data-project-link]");
      for (const screen of target.querySelectorAll(".live-device-screen")) {
        const mode = screen.querySelector("button").dataset.device;
        const [width, height] = sizes[mode];
        const frame = createDeviceFrame(link);
        frame.width = width;
        frame.height = height;
        frame.loading = "lazy";
        frame.tabIndex = -1;
        frame.setAttribute("aria-hidden", "true");
        scalePreview(frame, screen.clientWidth);
        screen.prepend(frame);
        previewResize.observe(screen);
      }
    }
  }, { rootMargin: "300px 0px" });

  for (const figure of document.querySelectorAll("[data-live-devices]")) {
    const link = figure.closest(".project").querySelector("[data-project-link]");
    const site = new URL(link.href);
    // 같은 페이지를 다른 기기 화면 안에서 다시 불러오는 경우를 방지합니다.
    if (site.origin === location.origin && site.pathname.replace(/index\.html$/, "") === location.pathname.replace(/index\.html$/, "")) continue;

    const strip = document.createElement("div");
    strip.className = "device-strip";
    for (const [mode, [width, height]] of Object.entries(sizes)) {
      const card = document.createElement("div");
      card.className = "device-card device-card--" + mode;
      const deviceCase = document.createElement("div");
      deviceCase.className = "device-case";
      const screen = document.createElement("div");
      screen.className = "live-device-screen";
      screen.style.setProperty("--device-ratio", width + " / " + height);
      const button = document.createElement("button");
      button.className = "device-preview-button";
      button.type = "button";
      button.dataset.device = mode;
      button.setAttribute("aria-label", link.dataset.projectLink + " " + deviceLabels[mode] + " 화면에서 실제 사이트 보기");
      const action = document.createElement("span");
      action.textContent = "직접 보기 ↗";
      button.append(action);
      const caption = document.createElement("p");
      caption.className = "device-caption";
      caption.textContent = deviceLabels[mode];

      screen.append(button);
      deviceCase.append(screen);
      card.append(deviceCase, caption);
      strip.append(card);
    }
    figure.setAttribute("aria-label", link.dataset.projectLink + " 기기별 미리보기");
    figure.append(strip);
    figure.hidden = false;
    previewObserver.observe(figure);
  }

  function openViewer(viewer, trigger) {
    viewerTriggers.set(viewer, trigger);
    viewer.showModal();
    root.classList.add("viewer-open");
    viewer.querySelector(".viewer-body").scrollTop = 0;
  }

  for (const viewer of [imageViewer, deviceViewer]) {
    let pressedBackdrop = false;
    viewer.querySelector("[data-close]").addEventListener("click", () => viewer.close());
    viewer.addEventListener("pointerdown", event => { pressedBackdrop = event.target === viewer; });
    viewer.addEventListener("click", event => {
      if (pressedBackdrop && event.target === viewer) viewer.close();
    });
    viewer.addEventListener("close", () => {
      root.classList.remove("viewer-open");
      viewerTriggers.get(viewer)?.focus({ preventScroll: true });
      requestRender();
    });
  }

  image.addEventListener("error", () => {
    if (!imageViewer.open) return;
    image.hidden = true;
    imageError.hidden = false;
  });
  detailView.addEventListener("error", () => {
    if (imageViewer.open) imageError.hidden = false;
  }, true);
  imageViewer.addEventListener("close", () => {
    image.removeAttribute("src");
    detailView.replaceChildren();
  });

  function showDetail(link) {
    const pageHeight = Number(link.dataset.longImage);
    const sectionHeight = 2000;
    const prefix = link.href.replace(/\.pdf$/, "-");
    const sections = document.createDocumentFragment();
    for (let top = 0, part = 1; top < pageHeight; top += sectionHeight, part += 1) {
      const height = Math.min(sectionHeight, pageHeight - top) * 2;
      const section = new Image(1720, height);
      section.alt = "";
      section.loading = part === 1 ? "eager" : "lazy";
      section.decoding = "async";
      section.src = prefix + part + ".webp";
      sections.append(section);
    }
    detailView.setAttribute("aria-label", link.dataset.image + " 전체 디자인");
    detailView.replaceChildren(sections);
  }

  function openImage(link) {
    const title = link.dataset.image;
    const isDetail = link.hasAttribute("data-long-image");
    imageViewer.querySelector("h2").textContent = title;
    imageViewer.toggleAttribute("data-long-image", isDetail);
    imageError.hidden = true;
    image.hidden = isDetail;
    detailView.hidden = detailSource.hidden = !isDetail;
    imageSource.href = link.href;
    const returnFocus = link.closest('[aria-hidden="true"]') ? link.closest(".strip-viewport") : link;
    openViewer(imageViewer, returnFocus);
    if (isDetail) {
      detailSource.href = link.href;
      showDetail(link);
    } else {
      image.alt = title;
      image.src = link.href;
    }
  }

  function sizeDevice() {
    if (!deviceFrame || !deviceViewer.open || !deviceHost.clientWidth) return;
    const [width, height] = sizes[deviceMode];
    const bodyStyle = getComputedStyle(deviceBody);
    const toolbarSpace = deviceToolbar.offsetHeight + parseFloat(getComputedStyle(deviceToolbar).marginBottom);
    const verticalSpace = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
    const chromeHeight = deviceViewer.querySelector(".viewer-header").offsetHeight + toolbarSpace + verticalSpace + 2;
    const availableHeight = parseFloat(getComputedStyle(deviceViewer).maxHeight) - chromeHeight;
    const scale = Math.min(1, deviceHost.clientWidth / width, Math.max(180, availableHeight) / height);
    deviceScreen.style.width = width * scale + "px";
    deviceScreen.style.height = height * scale + "px";
    deviceFrame.style.width = width + "px";
    deviceFrame.style.height = height + "px";
    deviceFrame.style.transform = "scale(" + scale + ")";
  }

  function changeDevice(mode) {
    if (!Object.hasOwn(sizes, mode)) return;
    deviceMode = mode;
    deviceViewer.querySelector("[data-device-size]").textContent = sizes[mode].join(" × ") + " px";
    deviceViewer.querySelectorAll("[data-mode]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
    sizeDevice();
  }

  function openDevice(button) {
    const link = button.closest(".project").querySelector("[data-project-link]");
    const name = link.dataset.projectLink;
    deviceViewer.querySelector("h2").textContent = name + " 기기별 미리보기";
    deviceViewer.querySelector("[data-device-site]").href = link.href;
    deviceFrame = createDeviceFrame(link);
    deviceScreen.replaceChildren(deviceFrame);
    openViewer(deviceViewer, button);
    changeDevice(button.dataset.device);
  }

  const deviceResize = new ResizeObserver(sizeDevice);
  deviceResize.observe(deviceHost);
  deviceResize.observe(deviceToolbar);
  deviceViewer.addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (button) changeDevice(button.dataset.mode);
  });
  deviceViewer.addEventListener("close", () => {
    deviceScreen.replaceChildren();
    deviceFrame = null;
  });

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[data-image]");
    if (link && typeof imageViewer.showModal === "function") {
      event.preventDefault();
      openImage(link);
      return;
    }
    const device = event.target.closest("button[data-device]");
    if (device) openDevice(device);
  });

  const copyStatus = document.querySelector("[data-copy-status]");
  let copyTimer;

  function legacyCopy(value) {
    const input = document.createElement("textarea");
    input.value = value;
    input.readOnly = true;
    input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    const active = document.activeElement;
    document.body.append(input);
    input.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      input.remove();
      active?.focus({ preventScroll: true });
    }
  }

  async function copyContact(button) {
    const value = button.textContent.trim();
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        copied = true;
      } catch {
        copied = legacyCopy(value);
      }
    } else {
      copied = legacyCopy(value);
    }

    if (!copied) {
      const range = document.createRange();
      range.selectNodeContents(button);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    copyStatus.textContent = copied
      ? button.dataset.copy + "를 복사했어요."
      : "선택한 텍스트를 Ctrl+C 또는 ⌘C로 복사해 주세요.";
    copyStatus.classList.add("is-visible");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => copyStatus.classList.remove("is-visible"), 2600);
  }

  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", () => copyContact(button));
  });

  root.classList.add("js-ready");
  refreshLayout();
})();
