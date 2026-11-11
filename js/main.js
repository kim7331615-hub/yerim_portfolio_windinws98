/* 바탕화면, 시작 메뉴, 팝업 창, 사진 확대 — 별도 설치 없이 동작합니다. */
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const startButton = $("#start-button");
  const startMenu = $("#start-menu");
  const paint = $("#paint-window");
  const inspect = $("#inspect-dialog");
  const inspectContent = $("#inspect-content");
  const pageDialogs = [...document.querySelectorAll(".page-window")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let topLayer = 15;
  let folderTimer;
  let toastTimer;
  let menuTimer;

  function notify(message) {
    clearTimeout(toastTimer);
    const toast = $("#status-toast");
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
  }
  function syncScrollLock() {
    document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
  }
  function closeStart(returnFocus = false) {
    clearTimeout(menuTimer);
    startMenu.hidden = true;
    startButton.setAttribute("aria-expanded", "false");
    if (returnFocus) startButton.focus();
  }
  function openStart() {
    clearTimeout(menuTimer);
    startMenu.hidden = false;
    startButton.setAttribute("aria-expanded", "true");
  }
  startButton.addEventListener("click", () => startMenu.hidden ? openStart() : closeStart());
  startButton.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") menuTimer = setTimeout(openStart, 160);
  });
  startButton.addEventListener("pointerleave", () => clearTimeout(menuTimer));
  startMenu.addEventListener("pointerenter", () => clearTimeout(menuTimer));
  startMenu.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse" && !startButton.contains(event.relatedTarget)) {
      menuTimer = setTimeout(() => closeStart(), 240);
    }
  });
  startButton.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); openStart(); startMenu.querySelector("a,button").focus();
    }
  });
  startMenu.addEventListener("keydown", event => {
    const items = [...startMenu.querySelectorAll("a,button")];
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    } else if (event.key === "Escape") { event.preventDefault(); closeStart(true); }
    else if (event.key === "Home") { event.preventDefault(); items[0].focus(); }
    else if (event.key === "End") { event.preventDefault(); items.at(-1).focus(); }
  });
  document.addEventListener("pointerdown", event => {
    if (!startMenu.contains(event.target) && !startButton.contains(event.target)) closeStart();
  });
  document.addEventListener("focusin", event => {
    if (!startMenu.hidden && !startMenu.contains(event.target) && event.target !== startButton) closeStart();
  });

  function openPage(key) {
    const dialog = document.getElementById(key + "-dialog");
    if (!dialog?.classList.contains("page-window")) return;
    closeStart();
    // 하나의 화면만 띄우고, 그 안에서 작품과 사진을 별도 창으로 엽니다.
    pageDialogs.forEach(other => { if (other !== dialog && other.open) other.close(); });
    if (!dialog.open) {
      dialog.showModal();
      const scrollArea = dialog.querySelector('.page-window-scroll');
      if (scrollArea) scrollArea.scrollTop = 0;
      window.PortfolioMotion.open(dialog);
    }
    syncScrollLock();
  }
  function openPaint() {
    closeStart();
    paint.hidden = false;
    paint.classList.remove("is-minimized");
    paint.querySelector('[data-window-action="minimize"]').setAttribute("aria-expanded", "true");
    paint.querySelector('[data-window-action="maximize"]').focus({ preventScroll: true });
  }
  function restoreSection(id) {
    const section = document.getElementById(id);
    section.querySelectorAll("[data-window]").forEach(win => {
      win.hidden = false;
      win.classList.remove("is-minimized");
      win.style.zIndex = "";
      win.querySelector('[data-window-action="minimize"]')?.setAttribute("aria-expanded", "true");
    });
    const button = section.querySelector("[data-restore-section]");
    if (button) button.hidden = true;
  }
  function restoreAll() {
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    restoreSection("about"); restoreSection("skills");
    [paint, $(".welcome-window")].forEach(win => {
      win.hidden = false;
      win.classList.remove("is-minimized", "is-maximized");
    });
    document.querySelectorAll('[data-window-action="maximize"], [data-dialog-maximize]').forEach(button => button.setAttribute("aria-pressed", "false"));
    document.querySelectorAll(".page-window,.gallery-modal").forEach(dialog => dialog.classList.remove("is-maximized"));
    syncScrollLock();
    notify("모든 창을 처음 상태로 돌렸습니다.");
  }

  function showInspect(title, content, imageMode = false) {
    $("#inspect-title").textContent = title;
    inspect.classList.toggle("is-image", imageMode);
    inspect.classList.remove("is-compact");
    inspectContent.replaceChildren(content);
    if (!inspect.open) inspect.showModal();
    inspectContent.scrollTop = 0;
    window.PortfolioGallery.suspend(true);
    syncScrollLock();
  }
  function openImage(src, title, { url, urlLabel = "웹사이트 보기", detail, compact = false } = {}) {
    const figure = document.createElement("figure");
    const sourceUrl = detail?.pdf || url;
    if (sourceUrl) {
      const link = document.createElement("a");
      link.href = sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "retro-button inspect-source";
      link.textContent = (detail ? "원본 PDF 보기" : urlLabel) + " ↗";
      figure.append(link);
    }
    if (detail) {
      figure.className = "detail-preview";
      figure.setAttribute("aria-label", title + " 전체 디자인");
      const sectionHeight = 2000;
      const prefix = detail.pdf.replace(/\.pdf$/, "-");
      for (let top = 0, part = 1; top < detail.height; top += sectionHeight, part += 1) {
        const image = new Image(1720, Math.min(sectionHeight, detail.height - top) * 2);
        image.src = prefix + part + ".webp";
        image.alt = "";
        image.decoding = "async";
        image.loading = part === 1 ? "eager" : "lazy";
        figure.append(image);
      }
    } else {
      const image = document.createElement("img");
      image.src = src;
      image.alt = title;
      image.decoding = "async";
      figure.append(image);
    }
    showInspect(title, figure, true);
    inspect.classList.toggle("is-compact", compact);
  }
  window.PortfolioUI = { openImage, openPage, notify };

  document.addEventListener("click", event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) {
      const key = anchor.getAttribute("href").slice(1);
      if (document.getElementById(key + "-dialog")) { event.preventDefault(); openPage(key); }
    }
    const pageButton = event.target.closest("[data-open-page]");
    if (pageButton) openPage(pageButton.dataset.openPage);

    const control = event.target.closest("[data-window-action]");
    if (control) {
      const win = control.closest("[data-window]");
      if (!win) return;
      const action = control.dataset.windowAction;
      if (win.matches("dialog")) {
        if (action === "maximize") {
          control.setAttribute("aria-pressed", String(win.classList.toggle("is-maximized")));
        } else {
          win.close(); // 최소화/닫기 후 시작 메뉴나 바탕화면 아이콘으로 다시 엽니다.
        }
      } else if (action === "close") {
        win.hidden = true;
        win.classList.remove("is-maximized");
        const restore = win.closest("section")?.querySelector("[data-restore-section]");
        if (restore) { restore.hidden = false; restore.focus({ preventScroll: true }); }
        else startButton.focus({ preventScroll: true });
      } else if (action === "minimize") {
        win.classList.remove("is-maximized");
        const folded = win.classList.toggle("is-minimized");
        control.setAttribute("aria-expanded", String(!folded));
      } else if (action === "maximize") {
        win.classList.remove("is-minimized");
        if (win === paint) {
          control.setAttribute("aria-pressed", String(win.classList.toggle("is-maximized")));
        } else {
          const content = win.querySelector(".window-body").cloneNode(true);
          content.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
          showInspect(win.dataset.title || "Preview", content);
        }
      }
    }
    const imageButton = event.target.closest("[data-view-image]");
    if (imageButton) openImage(imageButton.dataset.viewImage, imageButton.dataset.imageTitle || "Profile", {
      compact: imageButton.dataset.imageKind === "meme"
    });
    const maximize = event.target.closest("[data-dialog-maximize]");
    if (maximize) maximize.setAttribute("aria-pressed", String(maximize.closest("dialog").classList.toggle("is-maximized")));
  });

  document.querySelectorAll("[data-open-paint]").forEach(button => button.addEventListener("click", openPaint));
  $("[data-dismiss-welcome]").addEventListener("click", () => { $(".welcome-window").hidden = true; });
  document.querySelectorAll(".photo-window,.skill-window").forEach(win => {
    win.addEventListener("pointerdown", () => { win.style.zIndex = String(++topLayer); });
  });
  document.querySelectorAll("[data-restore-section]").forEach(button => {
    button.addEventListener("click", () => restoreSection(button.dataset.restoreSection));
  });
  document.querySelectorAll("[data-paint-menu]").forEach(button => {
    button.addEventListener("click", () => {
      const menu = button.dataset.paintMenu;
      if (menu === "file") openPage("works");
      if (menu === "edit") restoreAll();
      if (menu === "view") paint.querySelector('[data-window-action="maximize"]').click();
      if (menu === "image") window.PortfolioGallery.open("banner");
    });
  });
  document.querySelectorAll("[data-gallery]").forEach(button => {
    button.addEventListener("click", () => {
      clearTimeout(folderTimer);
      document.querySelectorAll(".is-opening").forEach(el => el.classList.remove("is-opening"));
      button.classList.add("is-opening");
      folderTimer = setTimeout(() => {
        button.classList.remove("is-opening");
        window.PortfolioGallery.open(button.dataset.gallery);
      }, reduceMotion.matches ? 0 : 250);
    });
  });
  $("[data-gallery-minimize]").addEventListener("click", () => window.PortfolioGallery.close());
  inspect.querySelector("[data-close-dialog]").addEventListener("click", () => inspect.close());
  document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("close", syncScrollLock));
  // Figma에서 바깥 영역 클릭으로 닫도록 설정한 연락처, 그리고 이미지 미리보기.
  [$("#contact-dialog"), inspect].forEach(dialog => {
    dialog.addEventListener("click", event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
  });
  inspect.addEventListener("close", () => window.PortfolioGallery.suspend(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
      closeStart(); paint.classList.remove("is-maximized");
    }
  });
  $("[data-shutdown]").addEventListener("click", () => openPage("thanks"));

  function updateClock() {
    const now = new Date();
    const suffix = now.getHours() >= 12 ? "PM" : "AM";
    $("#clock").textContent = String(now.getHours() % 12 || 12).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + suffix;
    $("#clock").dateTime = now.toISOString();
  }
  updateClock();
  setInterval(updateClock, 1000 * 30);
  if (location.hash) openPage(location.hash.slice(1));
})();
