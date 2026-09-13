(() => {
  const body = document.body;
  const progress = document.querySelector('[data-progress]');
  const bookStage = document.querySelector('[data-book-stage]');
  const book = document.querySelector('[data-book]');
  const shiftMap = document.querySelector('[data-shift-map]');
  const systemMap = document.querySelector('[data-system-map]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => body.classList.add('loaded'));

  const updateProgress = () => {
    if (!progress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progress.style.width = `${ratio * 100}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  if (!reducedMotion && bookStage && book && window.matchMedia('(pointer:fine)').matches) {
    bookStage.addEventListener('pointermove', (event) => {
      const rect = bookStage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateY = x * 5;
      const rotateX = y * -3.5;
      book.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    });
    bookStage.addEventListener('pointerleave', () => {
      book.style.transform = '';
    });
  }

  const activateWhenVisible = (element, callback, threshold = 0.35) => {
    if (!element) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      callback();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      });
    }, { threshold });
    observer.observe(element);
  };

  activateWhenVisible(shiftMap, () => shiftMap.classList.add('activated'));
  activateWhenVisible(systemMap, () => systemMap.classList.add('visible'));

  const foundationDestinations = {
    Capital: '/insights/capital-allocation/',
    Leverage: '/insights/leverage/',
    Risk: '/insights/asymmetric-risk/',
    Systems: '/insights/business-systems/',
    Information: '/insights/#information-advantage',
    Scale: '/insights/#scale',
    Compounding: '/insights/#compounding'
  };

  const foundationCards = document.querySelectorAll('.foundation-card');
  foundationCards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 55, 330)}ms`;
    const title = card.querySelector('h3')?.textContent?.trim();
    const link = card.querySelector('a');
    const destination = title ? foundationDestinations[title] : null;
    if (link && destination) {
      link.setAttribute('href', destination);
      link.setAttribute('aria-label', `Explore ${title} in Insights`);
    }
  });
})();
