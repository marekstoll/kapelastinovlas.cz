(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const elements = document.querySelectorAll([
    '.content-block > h2', '.content-block > .red-line', '.content-block > p',
    '.hudba-layout > div', '.concert-row', '#koncerty > .btn',
    '.gallery-head', '.gallery-line', '.gallery-carousel', 'footer > div'
  ].join(','));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, {threshold:0.08, rootMargin:'0px 0px -36px 0px'});
  elements.forEach(element => {
    element.classList.add('reveal-pending');
    observer.observe(element);
  });
  // Keyboard navigation must never focus content that is still transparent.
  document.addEventListener('focusin', event => {
    const parent = event.target.closest('.reveal-pending');
    if (parent) {
      parent.classList.add('is-revealed');
      observer.unobserve(parent);
    }
  });
  motion.addEventListener('change', event => {
    if (event.matches) {
      elements.forEach(element => element.classList.add('is-revealed'));
      observer.disconnect();
    }
  });
})();
