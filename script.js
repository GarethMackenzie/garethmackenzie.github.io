const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
// Keep the JavaScript menu breakpoint aligned with site-tuning.css.

const isPremiumInterior = !document.body.classList.contains('home-premium');
if (isPremiumInterior) {
  document.body.classList.add('premium-page');
  header?.classList.add('premium-header');
  if (!document.querySelector('.reading-progress')) {
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span data-reading-progress></span>';
    document.body.prepend(progress);
  }
}

const themeColor = document.querySelector('meta[name="theme-color"]');
if (themeColor && (document.body.classList.contains('home-premium') || document.body.classList.contains('premium-page'))) {
  themeColor.setAttribute('content', '#11151a');
}

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const closeMenu = ({ restoreFocus = false } = {}) => {
  if (!menuButton || !nav) return;
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuButton.focus();
};

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('open', !open);
  });

  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu({ restoreFocus: true });
    }
  });

  document.addEventListener('click', (event) => {
    if (menuButton.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMenu();
  });
}

const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealElements.length) {
  document.documentElement.classList.add('js-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  revealElements.forEach(element => observer.observe(element));
}

document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});

if (isPremiumInterior) {
  const progressBar = document.querySelector('[data-reading-progress]');
  const updateProgress = () => {
    if (!progressBar) return;
    const root = document.documentElement;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    progressBar.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  const canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const book = document.querySelector('.book-shell');
  if (book && canHover && !reduceMotion) {
    const stage = book.closest('.book-stage');
    stage?.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      book.style.transform = `rotateY(${x * 6}deg) rotateX(${y * -4}deg) translateY(-3px)`;
    });
    stage?.addEventListener('pointerleave', () => { book.style.transform = ''; });
  }

  document.querySelectorAll('.systems-flow').forEach((element) => {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      element.classList.add('activated');
      return;
    }
    const systemsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('activated');
          systemsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.28 });
    systemsObserver.observe(element);
  });
}

const insightSeries = [
  { path: '/insights/capital-allocation/', title: 'Capital allocation is the operating system of wealth' },
  { path: '/insights/leverage/', title: 'Leverage should multiply a system, not a weakness' },
  { path: '/insights/asymmetric-risk/', title: 'Design the shape of the risk before you chase the upside' },
  { path: '/insights/business-systems/', title: 'A system turns good decisions into repeatable outcomes' },
  { path: '/insights/decision-making/', title: 'Decision quality depends on the frame before the choice' },
  { path: '/insights/compounding/', title: 'Compounding rewards continuity more than intensity' },
  { path: '/insights/information-advantage/', title: 'Information advantage is about better decisions, not more data' },
  { path: '/insights/ownership/', title: 'Ownership changes the relationship between effort and outcome' },
  { path: '/insights/scale/', title: 'Scale should expand what already works' },
  { path: '/insights/strategic-execution/', title: 'Strategy becomes real only when execution has a system' }
];

const normalizedPath = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
const currentInsightIndex = insightSeries.findIndex(item => item.path === normalizedPath);
const articleNav = document.querySelector('.article-nav');
if (articleNav && currentInsightIndex >= 0) {
  const links = articleNav.querySelectorAll('a');
  const previous = currentInsightIndex > 0 ? insightSeries[currentInsightIndex - 1] : null;
  const next = currentInsightIndex < insightSeries.length - 1 ? insightSeries[currentInsightIndex + 1] : null;

  if (links[0]) {
    if (previous) {
      links[0].href = previous.path;
      links[0].innerHTML = `<span>Previous insight</span><strong>${previous.title}</strong>`;
    } else {
      links[0].href = '/insights/';
      links[0].innerHTML = '<span>Series index</span><strong>Explore all ten insight themes</strong>';
    }
  }

  if (links[1]) {
    if (next) {
      links[1].href = next.path;
      links[1].innerHTML = `<span>Next insight</span><strong>${next.title}</strong>`;
    } else {
      links[1].href = '/insights/';
      links[1].innerHTML = '<span>Complete the series</span><strong>Return to the ten-theme Insights index</strong>';
    }
  }
}

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('form-status');
    const submitButton = contactForm.querySelector('button[type="submit"]');

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      if (status) status.textContent = 'Please complete all required fields before sending.';
      return;
    }

    if (status) status.textContent = 'Sending your message…';
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(contactForm.dataset.endpoint, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === 'false') throw new Error('Submission failed');

      contactForm.reset();
      if (status) status.textContent = 'Thank you. Your message has been sent successfully.';
      window.gtag?.('event', 'generate_lead', { form_name: 'contact' });
    } catch {
      if (status) status.textContent = 'Your message could not be sent. Please try again or contact Gareth on LinkedIn.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
