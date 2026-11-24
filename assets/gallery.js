(() => {
  'use strict';
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  const originals = Array.from(grid.querySelectorAll('img'));
  if (originals.length < 2) return;
  const carousel = document.querySelector('.gallery-carousel');
  const previous = document.querySelector('.gallery-prev');
  const next = document.querySelector('.gallery-next');
  const toggle = document.getElementById('galleryAutoplay');
  const lightbox = document.getElementById('galleryLightbox');
  const largeImage = document.getElementById('lightboxImage');
  const closeButton = document.querySelector('.lightbox-close');
  const lightboxPrevious = document.querySelector('.lightbox-prev');
  const lightboxNext = document.querySelector('.lightbox-next');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let imageIndex = 0, opener, previousOverflow = '';
  let cycleWidth = 0, middleStart = 0, positions = [], allImages = [];
  let timer, settleTimer, resizeFrame;
  let visible = !('IntersectionObserver' in window);
  let hovered = false, dragging = false, paused = false;

  originals.forEach((img, index) => { img.dataset.galleryIndex = index; });
  // One complete copy on each side keeps the visible sequence continuous.
  function copyGroup() {
    const fragment = document.createDocumentFragment();
    originals.forEach(img => {
      const copy = img.cloneNode(true);
      copy.dataset.clone = 'true';
      copy.tabIndex = -1;
      copy.removeAttribute('role');
      copy.removeAttribute('aria-label');
      copy.setAttribute('aria-hidden', 'true');
      fragment.appendChild(copy);
    });
    return fragment;
  }
  grid.prepend(copyGroup());
  grid.append(copyGroup());
  allImages = Array.from(grid.querySelectorAll('img'));

  function jump(left) {
    grid.scrollTo({left, behavior:'instant'});
  }
  function measure() {
    // offsetLeft and scrollLeft share CSS pixels, including the site's desktop zoom.
    const relative = cycleWidth ? (grid.scrollLeft - middleStart) / cycleWidth : 0;
    const padding = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
    positions = allImages.map(img => img.offsetLeft - padding);
    middleStart = positions[originals.length];
    cycleWidth = middleStart - positions[0];
    if (cycleWidth > 0) jump(middleStart + (((relative % 1) + 1) % 1) * cycleWidth);
  }
  function normalize() {
    if (!cycleWidth || dragging) return;
    const relative = grid.scrollLeft - middleStart;
    if (relative < -1 || relative >= cycleWidth - 1) {
      jump(middleStart + (((relative % cycleWidth) + cycleWidth) % cycleWidth));
    }
  }
  function move(direction) {
    normalize();
    const current = grid.scrollLeft;
    const target = direction > 0
      ? positions.find(position => position > current + 4)
      : positions.slice().reverse().find(position => position < current - 4);
    if (target !== undefined) grid.scrollTo({left:target, behavior:motion.matches ? 'instant' : 'smooth'});
  }
  function canAutoplay() {
    const keyboardFocus = carousel.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    return visible && !paused && !hovered && !dragging && !motion.matches && !document.hidden &&
      !keyboardFocus && !lightbox.classList.contains('is-open') &&
      !document.getElementById('cookieOverlay')?.classList.contains('is-visible');
  }
  function restartTimer() {
    clearInterval(timer);
    if (!motion.matches && !paused) {
      timer = setInterval(() => { if (canAutoplay()) move(1); }, 3000);
    }
  }
  function manualMove(direction) { move(direction); restartTimer(); }
  previous.addEventListener('click', () => manualMove(-1));
  next.addEventListener('click', () => manualMove(1));
  toggle.hidden = motion.matches;
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Spustit posouvání' : 'Pozastavit posouvání';
    restartTimer();
  });
  grid.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(normalize, 160);
  }, {passive:true});
  carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; });
  carousel.addEventListener('pointerleave', () => { hovered = false; restartTimer(); });
  grid.addEventListener('pointerdown', () => { dragging = true; });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(normalize, 160);
    restartTimer();
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  document.addEventListener('visibilitychange', restartTimer);
  carousel.addEventListener('focusout', restartTimer);
  motion.addEventListener('change', () => { toggle.hidden = motion.matches; restartTimer(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      restartTimer();
    }, {threshold:0.1}).observe(carousel);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    }).observe(grid);
  } else {
    window.addEventListener('resize', measure);
  }
  allImages.forEach(img => img.addEventListener('load', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  }, {once:true}));
  measure();
  restartTimer();

  function showImage(index) {
    imageIndex = (index + originals.length) % originals.length;
    largeImage.src = originals[imageIndex].dataset.full;
    largeImage.alt = originals[imageIndex].alt;
  }
  function openImage(img) {
    opener = originals[Number(img.dataset.galleryIndex)];
    previousOverflow = document.body.style.overflow;
    showImage(Number(img.dataset.galleryIndex));
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  }
  function closeImage() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = previousOverflow;
    opener?.focus({preventScroll:true});
    restartTimer();
  }
  grid.addEventListener('click', event => {
    const img = event.target.closest('img[data-gallery-index]');
    if (img) openImage(img);
  });
  grid.addEventListener('keydown', event => {
    const img = event.target.closest('img[data-gallery-index]');
    if (img && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); openImage(img);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); manualMove(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  closeButton.addEventListener('click', closeImage);
  lightboxPrevious.addEventListener('click', () => showImage(imageIndex - 1));
  lightboxNext.addEventListener('click', () => showImage(imageIndex + 1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeImage(); });
  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeImage(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(imageIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showImage(imageIndex + 1); }
    if (event.key === 'Tab') {
      const buttons = [closeButton, lightboxPrevious, lightboxNext];
      const index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  });
})();
