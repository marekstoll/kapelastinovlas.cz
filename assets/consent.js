(() => {
  'use strict';
  const KEY = 'stinovlas_cookie_consent';
  const GA = 'G-297X25J55X';
  const PIXEL = '1675674120643874';
  const overlay = document.getElementById('cookieOverlay');
  const details = document.getElementById('cookieSettings');
  const analytics = document.getElementById('analyticsCookies');
  const marketing = document.getElementById('marketingCookies');
  let current = {necessary:true, analytics:false, marketing:false};
  let previousFocus, previousOverflow = '';
  let gaLoaded = false, metaLoaded = false;
  window['ga-disable-' + GA] = true;

  function readConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (!value || typeof value.analytics !== 'boolean' || typeof value.marketing !== 'boolean') return null;
      if (value.savedAt && Date.now() - value.savedAt > 180 * 86400000) return null;
      return value;
    } catch { return null; }
  }
  function removeCookie(name) {
    const root = location.hostname.replace(/^www\./, '');
    for (const domain of ['', ';domain=' + location.hostname, ';domain=.' + root]) {
      document.cookie = name + '=;Max-Age=0;path=/' + domain;
    }
  }
  function clearCookies(settings) {
    document.cookie.split(';').map(c => c.split('=')[0].trim()).forEach(name => {
      if ((!settings.analytics && /^_ga(?:_|$)/.test(name)) ||
          (!settings.marketing && ['_fbp','_fbc'].includes(name))) removeCookie(name);
    });
  }
  function loadAnalytics() {
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    // Basic consent mode: no Google tag is downloaded before analytics consent.
    window.gtag('consent', 'default', {
      analytics_storage:'granted', ad_storage:'denied',
      ad_user_data:'denied', ad_personalization:'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA, {allow_google_signals:false, allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(script);
  }
  function loadMeta() {
    if (metaLoaded) return;
    metaLoaded = true;
    const fbq = window.fbq = function(){
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window._fbq = fbq;
    fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    fbq('consent', 'grant');
    fbq('init', PIXEL);
    fbq('track', 'PageView');
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  function apply(settings) {
    window['ga-disable-' + GA] = !settings.analytics;
    clearCookies(settings);
    if (settings.analytics) loadAnalytics();
    if (settings.marketing) loadMeta();
    current = settings;
  }
  function open(showDetails = false) {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    analytics.checked = current.analytics;
    marketing.checked = current.marketing;
    details.classList.toggle('is-open', showDetails);
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    document.getElementById('cookieDetailsBtn').focus();
  }
  function close() {
    overlay.classList.remove('is-visible');
    document.body.style.overflow = previousOverflow;
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function save(settings) {
    settings = {...settings, necessary:true, savedAt:Date.now()};
    const revoked = (current.analytics && !settings.analytics) || (current.marketing && !settings.marketing);
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    if (revoked) {
      // Stop active trackers before reloading into the newly saved consent state.
      window['ga-disable-' + GA] = true;
      if (window.fbq) window.fbq('consent', 'revoke');
      clearCookies(settings);
      close();
      location.reload();
      return;
    }
    apply(settings);
    close();
  }
  document.getElementById('cookieOpen').addEventListener('click', () => open(true));
  document.getElementById('cookieDetailsBtn').addEventListener('click', () => {
    details.classList.toggle('is-open');
    if (details.classList.contains('is-open')) details.scrollIntoView({block:'nearest'});
  });
  document.getElementById('cookieAcceptAll').addEventListener('click', () => save({analytics:true, marketing:true}));
  document.getElementById('cookieReject').addEventListener('click', () => save({analytics:false, marketing:false}));
  document.getElementById('cookieSave').addEventListener('click', () => save({analytics:analytics.checked, marketing:marketing.checked}));
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); save(current); return; }
    if (e.key !== 'Tab') return;
    const buttons = Array.from(overlay.querySelectorAll('button, input:not(:disabled), a')).filter(el => el.getClientRects().length);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener('storage', e => {
    if (e.key === KEY) {
      window['ga-disable-' + GA] = true;
      if (window.fbq) window.fbq('consent', 'revoke');
      clearCookies(readConsent() || {analytics:false, marketing:false});
      location.reload();
    }
  });
  const saved = readConsent();
  if (saved) apply(saved);
  else { clearCookies(current); open(); }
  if (location.hash === '#nastaveni-cookies' && saved) open(true);
})();
