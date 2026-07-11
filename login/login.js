(() => {
  const root = document.querySelector('.auth');
  const screens = [...root.querySelectorAll('.auth-screen')];
  const form = root.querySelector('.signup-form');
  const nickname = form.elements.nickname;
  const privacy = form.elements.privacy;
  const submit = form.querySelector('.submit-button');
  const dialog = root.querySelector('.policy-dialog');
  const show = name => screens.forEach(screen => screen.classList.toggle('is-active', screen.dataset.screen === name));
  const valid = () => nickname.value.trim().length >= 2 && nickname.value.trim().length <= 10 && privacy.checked;
  const update = () => { submit.disabled = !valid(); };
  const goHome = () => { root.dispatchEvent(new CustomEvent('auth:complete',{bubbles:true,detail:{userType:root.dataset.userType}})); if(root.dataset.homeUrl) location.assign(root.dataset.homeUrl); };

  root.querySelector('.kakao-button').addEventListener('click', () => {
    if (localStorage.getItem('localtime:member') === 'true') goHome(); else show('signup');
  });
  root.querySelector('.back-button').addEventListener('click', () => show('login'));
  form.addEventListener('input', update); form.addEventListener('change', update);
  form.addEventListener('submit', event => { event.preventDefault(); if(!valid()) return; root.querySelector('.complete-name').textContent=nickname.value.trim(); localStorage.setItem('localtime:member','true'); show('complete'); });
  root.querySelector('.policy-button').addEventListener('click',()=>dialog.showModal());
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  root.querySelector('.start-button').addEventListener('click',goHome);
})();
