(() => {
  const root = document.documentElement;
  const progress = document.querySelector('[data-progress]');
  const nav = document.querySelector('[data-nav]');
  const bookRig = document.querySelector('[data-book-rig] picture');
  const bookDisplay = document.querySelector('[data-book-display] picture');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const updateProgress = () => {
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    if (progress) progress.style.width = `${p * 100}%`;
    if (nav) nav.classList.toggle('compact', window.scrollY > 80);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  const revealNodes = [...document.querySelectorAll('.reveal')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('in'));
  }

  const attachTilt = (container, target, intensity = 5) => {
    if (!container || !target || reduceMotion || !finePointer) return;
    const reset = () => { target.style.transform = ''; };
    container.addEventListener('pointermove', (event) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      target.style.transform = `rotateY(${x * intensity}deg) rotateX(${-y * intensity * 0.7}deg) translateY(-3px)`;
    });
    container.addEventListener('pointerleave', reset);
  };

  attachTilt(document.querySelector('[data-book-rig]'), bookRig, 7);
  attachTilt(document.querySelector('[data-book-display]'), bookDisplay, 4);

  if (!reduceMotion) {
    const hero = document.querySelector('.hero');
    const world = document.querySelector('.light-architecture');
    if (hero && world && finePointer) {
      hero.addEventListener('pointermove', (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        world.style.transform = `translate3d(${x * 14}px, ${y * 10}px, 0)`;
      });
      hero.addEventListener('pointerleave', () => { world.style.transform = ''; });
    }
  }
})();
