(() => {
  const measurementId = 'G-DVZNKJYY2X';
  const consentKey = 'built-analytics-consent';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const storedConsent = localStorage.getItem(consentKey);
  const analyticsGranted = storedConsent === 'granted';

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: true
  });

  const googleTag = document.createElement('script');
  googleTag.async = true;
  googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(googleTag);

  const setConsent = (value) => {
    localStorage.setItem(consentKey, value);
    window.gtag('consent', 'update', {
      analytics_storage: value === 'granted' ? 'granted' : 'denied'
    });
    document.querySelector('[data-consent-banner]')?.remove();
  };

  const showConsentBanner = () => {
    if (storedConsent) return;

    const banner = document.createElement('aside');
    banner.className = 'consent-banner';
    banner.dataset.consentBanner = '';
    banner.setAttribute('aria-label', 'Analytics preferences');
    banner.innerHTML = `
      <div>
        <strong>Help improve the BUILT website</strong>
        <p>Optional Google Analytics helps measure page visits and Amazon clicks. Advertising cookies remain disabled.</p>
      </div>
      <div class="consent-actions">
        <button class="button button-small" type="button" data-consent-accept>Accept analytics</button>
        <button class="consent-decline" type="button" data-consent-decline>Continue without</button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector('[data-consent-accept]').addEventListener('click', () => setConsent('granted'));
    banner.querySelector('[data-consent-decline]').addEventListener('click', () => setConsent('denied'));
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="a.co/"], a[href*="amazon."]');
    if (!link) return;

    window.gtag('event', 'amazon_click', {
      link_url: link.href,
      link_text: link.textContent.trim(),
      page_path: window.location.pathname,
      cta_location: link.dataset.amazonCta || 'site'
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showConsentBanner, { once: true });
  } else {
    showConsentBanner();
  }
})();
