const root = document.documentElement;
root.classList.add('nav-ready');

const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const compactMenuQuery = window.matchMedia('(max-width: 1024px)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const setMenuState = (open, { restoreFocus = false } = {}) => {
  if (!menuButton || !nav) return;

  const compact = compactMenuQuery.matches;
  const shouldOpen = compact && open;
  nav.classList.toggle('open', shouldOpen);
  menuButton.setAttribute('aria-expanded', String(shouldOpen));
  menuButton.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');

  if ('inert' in nav) {
    nav.inert = compact && !shouldOpen;
  }

  document.body.classList.toggle('menu-open', shouldOpen);

  if (restoreFocus) menuButton.focus();
};

if (menuButton && nav) {
  setMenuState(false);

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    setMenuState(!open);
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuState(false, { restoreFocus: true });
    }
  });

  document.addEventListener('click', (event) => {
    if (
      menuButton.getAttribute('aria-expanded') === 'true' &&
      header &&
      !header.contains(event.target)
    ) {
      setMenuState(false);
    }
  });

  compactMenuQuery.addEventListener?.('change', () => setMenuState(false));
}

/* Progressive enhancement: content remains visible without IntersectionObserver or when motion is reduced. */
const revealElements = [...document.querySelectorAll('.reveal')];
const canAnimateReveals = !reducedMotionQuery.matches && 'IntersectionObserver' in window;

if (canAnimateReveals && revealElements.length) {
  root.classList.add('js-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  revealElements.forEach(element => observer.observe(element));
} else {
  revealElements.forEach(element => element.classList.add('visible'));
}

document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const status = document.getElementById('form-status');
  const query = new URLSearchParams(window.location.search);

  if (query.get('sent') === '1') {
    if (status) status.textContent = 'Thank you. Your message has been sent successfully.';
    window.gtag?.('event', 'generate_lead', { form_name: 'contact' });
    history.replaceState(null, '', `${window.location.pathname}#form`);
  }
}

(() => {
  const select = document.getElementById('category');
  const wanted = new URLSearchParams(window.location.search).get('category');
  if (select && wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;
})();

// Theme preference is restored synchronously in the document head.
const themeToggle=document.querySelector('[data-theme-toggle]');
function syncTheme(){
 const light=(root.dataset.theme==='light'||root.dataset.theme==='alabaster');
 themeToggle?.setAttribute('aria-label',light?'Switch to dark theme':'Switch to light theme');
 themeToggle?.setAttribute('title',light?'Editorial · switch to Sovereign':'Sovereign · switch to Editorial');
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',light?'#FAF8F3':'#0D0D0C');
}
themeToggle?.addEventListener('click',()=>{
 root.dataset.theme=(root.dataset.theme==='light'||root.dataset.theme==='alabaster')?'obsidian':'light';
 try{localStorage.setItem('mackenzie_theme',root.dataset.theme)}catch{}
 syncTheme();
});
window.addEventListener('storage',event=>{if(event.key==='mackenzie_theme'){root.dataset.theme=event.newValue==='alabaster'||event.newValue==='light'?'light':'obsidian';syncTheme()}});
syncTheme();
