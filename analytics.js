(() => {
  const measurementId = 'G-DVZNKJYY2X';
  const consentKey = 'built-analytics-consent';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  let storedConsent = null;
  try {
    storedConsent = localStorage.getItem(consentKey);
  } catch {
    storedConsent = null;
  }

  let analyticsGranted = storedConsent === 'granted';
  let googleTagLoaded = false;

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  const loadGoogleTag = () => {
    if (googleTagLoaded || !analyticsGranted) return;
    googleTagLoaded = true;

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: true
    });

    const googleTag = document.createElement('script');
    googleTag.async = true;
    googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    googleTag.dataset.builtAnalyticsScript = '';
    document.head.appendChild(googleTag);
  };

  if (analyticsGranted) loadGoogleTag();

  const trackEvent = (name, parameters = {}) => {
    if (!analyticsGranted) return false;
    window.gtag('event', name, parameters);
    return true;
  };

  const closePreferences = () => {
    document.querySelector('[data-consent-banner]')?.remove();
  };

  const setConsent = (value) => {
    analyticsGranted = value === 'granted';
    storedConsent = value;
    try {
      localStorage.setItem(consentKey, value);
    } catch {
      /* The current-page choice still applies when local storage is unavailable. */
    }

    window.gtag('consent', 'update', {
      analytics_storage: analyticsGranted ? 'granted' : 'denied'
    });

    if (analyticsGranted) loadGoogleTag();
    closePreferences();
  };

  const showPreferences = ({ firstVisit = false } = {}) => {
    closePreferences();

    const banner = document.createElement('aside');
    banner.className = 'consent-banner';
    banner.dataset.consentBanner = '';
    banner.setAttribute('aria-label', 'Analytics preferences');
    banner.innerHTML = `
      <div>
        <strong>${firstVisit ? 'Help improve the BUILT website' : 'Analytics preferences'}</strong>
        <p>Optional Google Analytics measures page visits and outbound Amazon clicks. Advertising cookies remain disabled. You can change this choice at any time.</p>
      </div>
      <div class="consent-actions">
        <button class="button button-small" type="button" data-consent-accept>Accept analytics</button>
        <button class="consent-decline" type="button" data-consent-decline>${analyticsGranted ? 'Withdraw analytics' : 'Continue without'}</button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector('[data-consent-accept]').addEventListener('click', () => setConsent('granted'));
    banner.querySelector('[data-consent-decline]').addEventListener('click', () => setConsent('denied'));
  };

  const addPreferencesControl = () => {
    const footerLinks = document.querySelector('footer .footer-links');
    if (!footerLinks || footerLinks.querySelector('[data-analytics-preferences]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'analytics-preferences';
    button.dataset.analyticsPreferences = '';
    button.textContent = 'Analytics preferences';
    button.addEventListener('click', () => showPreferences());
    footerLinks.appendChild(button);
  };

  const inferCtaLocation = (link) => {
    const explicit = link.dataset.amazonCta;
    if (explicit && explicit !== 'amazon') return explicit;
    if (link.closest('header')) return 'header';
    if (link.closest('.premium-hero')) return 'home_hero';
    if (link.closest('.closing-band')) return 'home_closing';
    if (link.closest('.final-cta')) return window.location.pathname === '/built/' ? 'book_page_closing' : 'page_closing';
    if (link.closest('article') || window.location.pathname.startsWith('/insights/')) return 'article';
    if (link.closest('footer')) return 'footer';
    if (window.location.pathname === '/built/') return 'book_page';
    return 'site';
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="a.co/"], a[href*="amazon."]');
    if (!link) return;

    trackEvent('amazon_click', {
      link_url: link.href,
      link_text: link.textContent.trim(),
      page_path: window.location.pathname,
      cta_location: inferCtaLocation(link)
    });
  });

  const initialise = () => {
    addPreferencesControl();
    if (!storedConsent) showPreferences({ firstVisit: true });
  };

  window.builtAnalytics = {
    isGranted: () => analyticsGranted,
    openPreferences: () => showPreferences(),
    trackEvent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
