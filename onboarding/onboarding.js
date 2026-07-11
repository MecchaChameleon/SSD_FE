(() => {
  const root = document.querySelector('.onboarding');
  const screens = [...root.querySelectorAll('.screen')];
  let current = 0;

  const show = (index) => {
    current = Math.max(0, Math.min(index, screens.length - 1));
    screens.forEach((screen, i) => screen.classList.toggle('is-active', i === current));
  };

  const complete = () => {
    localStorage.setItem('localtime:onboarding-complete', 'true');
    root.dispatchEvent(new CustomEvent('onboarding:complete', { bubbles: true }));
    const loginUrl = root.dataset.loginUrl;
    if (loginUrl) window.location.assign(loginUrl);
  };

  root.addEventListener('click', (event) => {
    if (!event.target.closest('.next-button, .splash')) return;
    if (current === screens.length - 1) complete();
    else show(current + 1);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'Enter') current === screens.length - 1 ? complete() : show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });

  window.setTimeout(() => { if (current === 0) show(1); }, 1400);
})();
