(() => {
  const video = document.querySelector('.hero-video');
  const start = () => {
    if (!video || matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return;
    video.src = video.dataset.src;
    video.play().catch(() => {});
  };
  // Download the decorative video after the initial page has loaded.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, {once:true});
  document.getElementById('playYoutube').addEventListener('click', function() {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/QqBvuIiqPLo?autoplay=1';
    iframe.title = 'Video z festivalu NÁŘEZÁK FEST';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    this.replaceWith(iframe);
  }, {once:true});
})();
