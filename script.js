const root = document.documentElement;
root.classList.add('nav-ready');

if (!document.querySelector('link[href="/dist/accessibility.css"]')) {
  const accessibilityStyles = document.createElement('link');
  accessibilityStyles.rel = 'stylesheet';
  accessibilityStyles.href = '/dist/accessibility.css';
  document.head.appendChild(accessibilityStyles);
}

const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const compactMenuQuery = window.matchMedia('(max-width: 1024px)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

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

let progressBar = isPremiumInterior ? document.querySelector('[data-reading-progress]') : null;
let viewportFrame = 0;

const updateViewportState = () => {
  viewportFrame = 0;
  header?.classList.toggle('scrolled', window.scrollY > 24);

  if (progressBar) {
    const rootElement = document.documentElement;
    const max = Math.max(1, rootElement.scrollHeight - window.innerHeight);
    const progress = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    progressBar.style.width = `${progress}%`;
  }
};

const scheduleViewportUpdate = () => {
  if (viewportFrame) return;
  viewportFrame = requestAnimationFrame(updateViewportState);
};

updateViewportState();
window.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
window.addEventListener('resize', scheduleViewportUpdate, { passive: true });

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

if (isPremiumInterior) {
  progressBar = document.querySelector('[data-reading-progress]');
  scheduleViewportUpdate();

  const canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduceMotion = reducedMotionQuery.matches;
  const book = document.querySelector('.book-shell');
  if (book && canHover && !reduceMotion) {
    const stage = book.closest('.book-stage');
    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const renderBookTilt = () => {
      pointerFrame = 0;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const x = (pointerX - rect.left) / rect.width - 0.5;
      const y = (pointerY - rect.top) / rect.height - 0.5;
      book.style.transform = `rotateY(${x * 6}deg) rotateX(${y * -4}deg) translateY(-3px)`;
    };

    stage?.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(renderBookTilt);
    }, { passive: true });

    stage?.addEventListener('pointerleave', () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      book.style.transform = '';
    });
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

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const status = document.getElementById('form-status');
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const defaultButtonLabel = submitButton?.innerHTML || 'Send message';

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (contactForm.dataset.submitting === 'true') return;
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    contactForm.dataset.submitting = 'true';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    if (status) status.textContent = 'Sending your message…';

    const endpoint = new URL(contactForm.action);
    if (!endpoint.pathname.startsWith('/ajax/')) {
      endpoint.pathname = `/ajax${endpoint.pathname}`;
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());
    delete payload._next;

    try {
      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      const accepted = response.ok && String(result.success).toLowerCase() === 'true';

      if (!accepted) throw new Error('Provider did not accept the submission');

      if (status) {
        status.textContent = "FormSubmit accepted your message. Delivery to the recipient's inbox is handled by the provider.";
      }
      contactForm.reset();
      window.builtAnalytics?.trackEvent('generate_lead', { form_name: 'contact' });
    } catch {
      if (status) {
        status.textContent = 'Your message was not accepted. Please review the form and try again, or use LinkedIn.';
      }
    } finally {
      delete contactForm.dataset.submitting;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = defaultButtonLabel;
      }
    }
  });
}
