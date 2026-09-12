/* ==========================================================================
   CRICVERSE — Frontend Script (With Front Login Landing Gate)
   ========================================================================== */

(() => {
  'use strict';

  // ---------- State ----------
  let isLoggedIn = false;
  let pendingDownloadAfterLogin = false;

  // ---------- Elements ----------
  const loginLandingGate = document.getElementById('loginLandingGate');
  const appWebsite = document.getElementById('appWebsite');
  const gateAlert = document.getElementById('gateAlert');
  const gateTabLoginBtn = document.getElementById('gateTabLoginBtn');
  const gateTabSignupBtn = document.getElementById('gateTabSignupBtn');
  const frontLoginForm = document.getElementById('frontLoginForm');
  const frontSignupForm = document.getElementById('frontSignupForm');

  const userGreeting = document.getElementById('userGreeting');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const navLogoutBtn = document.getElementById('navLogoutBtn');

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mainNav = document.getElementById('mainNav');
  const navScrim = document.getElementById('navScrim');

  const authModalOverlay = document.getElementById('authModalOverlay');
  const authModalClose = document.getElementById('authModalClose');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabSignupBtn = document.getElementById('tabSignupBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  const downloadButtons = [
    document.getElementById('navDownloadBtn'),
    document.getElementById('headerDownloadBtn'),
    document.getElementById('heroDownloadBtn'),
    document.getElementById('finalDownloadBtn')
  ].filter(Boolean);

  const contactButtons = [
    document.getElementById('navContactBtn'),
    document.getElementById('headerContactBtn')
  ].filter(Boolean);

  const contactForm = document.getElementById('contactForm');
  const toastContainer = document.getElementById('toastContainer');

  // ---------- Toasts ----------
  function showToast(message, type = 'success', duration = 4200) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer?.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  // ---------- Gate Alerts ----------
  function showGateAlert(message, type = 'error') {
    if (!gateAlert) return;
    gateAlert.textContent = message;
    gateAlert.className = `gate-alert ${type}`;
    gateAlert.classList.remove('hidden');
  }

  function hideGateAlert() {
    if (gateAlert) gateAlert.classList.add('hidden');
  }

  // ---------- Gate Tab Switcher ----------
  function switchGateTab(tab) {
    const isLogin = tab === 'front-login';
    gateTabLoginBtn?.classList.toggle('active', isLogin);
    gateTabSignupBtn?.classList.toggle('active', !isLogin);
    frontLoginForm?.classList.toggle('hidden', !isLogin);
    frontSignupForm?.classList.toggle('hidden', isLogin);
    hideGateAlert();
  }

  gateTabLoginBtn?.addEventListener('click', () => switchGateTab('front-login'));
  gateTabSignupBtn?.addEventListener('click', () => switchGateTab('front-signup'));

  // ---------- App Visibility & State Handler ----------
  function updateAppView(loggedIn, name) {
    isLoggedIn = !!loggedIn;

    if (isLoggedIn) {
      loginLandingGate?.classList.add('hidden');
      appWebsite?.classList.remove('hidden');
      if (userGreeting) userGreeting.textContent = `👤 ${name || 'Fan'}`;
      if (authToggleBtn) authToggleBtn.textContent = 'Logout';
      hideGateAlert();
    } else {
      loginLandingGate?.classList.remove('hidden');
      appWebsite?.classList.add('hidden');
      if (userGreeting) userGreeting.textContent = '';
      if (authToggleBtn) authToggleBtn.textContent = 'Login';
      hideGateAlert();
      frontLoginForm?.reset();
      frontSignupForm?.reset();
    }
  }

  // ---------- Session Status Check ----------
  async function refreshSession() {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      updateAppView(data.loggedIn, data.name);
    } catch (err) {
      updateAppView(false);
    }
  }

  // Initial session check on page load
  refreshSession();

  // ---------- Front Login & Signup Forms ----------
  frontLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideGateAlert();

    const email = document.getElementById('frontLoginEmail').value.trim();
    const password = document.getElementById('frontLoginPassword').value;
    const submitBtn = document.getElementById('frontLoginSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showGateAlert(data.message || 'Invalid email or password.', 'error');
        return;
      }

      updateAppView(true, data.name);
      showToast(`Welcome back, ${data.name}! Opening website...`);
    } catch (err) {
      showGateAlert('Something went wrong. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In & Open Website';
    }
  });

  frontSignupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideGateAlert();

    const name = document.getElementById('frontSignupName').value.trim();
    const email = document.getElementById('frontSignupEmail').value.trim();
    const password = document.getElementById('frontSignupPassword').value;
    const submitBtn = document.getElementById('frontSignupSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showGateAlert(data.message || 'Sign up failed.', 'error');
        return;
      }

      updateAppView(true, data.name);
      showToast(`Account created! Welcome, ${data.name}. Opening website...`);
    } catch (err) {
      showGateAlert('Something went wrong. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account & Open Website';
    }
  });

  // ---------- Logout Handler ----------
  async function handleLogout() {
    try {
      const res = await fetch('/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        updateAppView(false);
        showToast('Logged out successfully.', 'info');
      }
    } catch (err) {
      showToast('Could not log out. Please try again.', 'error');
    }
  }

  authToggleBtn?.addEventListener('click', () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      updateAppView(false);
    }
  });

  navLogoutBtn?.addEventListener('click', () => {
    closeNav();
    handleLogout();
  });

  // ---------- Mobile Nav ----------
  function openNav() {
    mainNav?.classList.add('open');
    navScrim?.classList.add('visible');
    hamburgerBtn?.classList.add('open');
    hamburgerBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    mainNav?.classList.remove('open');
    navScrim?.classList.remove('visible');
    hamburgerBtn?.classList.remove('open');
    hamburgerBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburgerBtn?.addEventListener('click', () => {
    if (mainNav?.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  navScrim?.addEventListener('click', closeNav);

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  // ---------- Scroll Reveal Observer ----------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // ---------- App / APK Info ----------
  async function loadAppInfo() {
    try {
      const res = await fetch('/api/app-info');
      if (!res.ok) throw new Error('Failed to load app info');
      const data = await res.json();

      const versionEl = document.getElementById('apkVersion');
      const sizeEl = document.getElementById('apkSize');
      const androidEl = document.getElementById('apkAndroid');
      const statVersionEl = document.getElementById('statVersion');

      if (versionEl) versionEl.textContent = `Version ${data.version}`;
      if (sizeEl) sizeEl.textContent = data.size;
      if (androidEl) androidEl.textContent = data.minAndroid;
      if (statVersionEl) statVersionEl.textContent = `v${data.version}`;
    } catch (err) {
      console.warn('Could not load app info:', err.message);
    }
  }

  loadAppInfo();

  // ---------- Modal Auth (Modal Fallback) ----------
  function openAuthModal(tab = 'login') {
    authModalOverlay?.classList.add('visible');
    switchAuthTab(tab);
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    authModalOverlay?.classList.remove('visible');
    document.body.style.overflow = '';
    pendingDownloadAfterLogin = false;
  }

  function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    tabLoginBtn?.classList.toggle('active', isLogin);
    tabSignupBtn?.classList.toggle('active', !isLogin);
    loginForm?.classList.toggle('hidden', !isLogin);
    signupForm?.classList.toggle('hidden', isLogin);
  }

  tabLoginBtn?.addEventListener('click', () => switchAuthTab('login'));
  tabSignupBtn?.addEventListener('click', () => switchAuthTab('signup'));
  authModalClose?.addEventListener('click', closeAuthModal);
  authModalOverlay?.addEventListener('click', (e) => {
    if (e.target === authModalOverlay) closeAuthModal();
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Login failed.', 'error');
        return;
      }

      updateAppView(true, data.name);
      showToast(`Welcome back, ${data.name}!`);
      closeAuthModal();
      loginForm.reset();

      if (pendingDownloadAfterLogin) {
        pendingDownloadAfterLogin = false;
        startDownload();
      }
    } catch (err) {
      showToast('Something went wrong. Please try again.', 'error');
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Sign up failed.', 'error');
        return;
      }

      updateAppView(true, data.name);
      showToast(`Account created. Welcome, ${data.name}!`);
      closeAuthModal();
      signupForm.reset();

      if (pendingDownloadAfterLogin) {
        pendingDownloadAfterLogin = false;
        startDownload();
      }
    } catch (err) {
      showToast('Something went wrong. Please try again.', 'error');
    }
  });

  // ---------- Download Flow ----------
  function startDownload() {
    showToast('Preparing your download...', 'info', 2200);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/download';
    document.body.appendChild(iframe);

    setTimeout(() => {
      showToast('Download started — check your notification bar.');
      iframe.remove();
      refreshDownloadCount();
    }, 1400);
  }

  async function handleDownloadClick() {
    await refreshSession();
    if (!isLoggedIn) {
      updateAppView(false);
      showToast('Please log in to download CRICVERSE.', 'info');
      return;
    }
    startDownload();
  }

  downloadButtons.forEach((btn) => {
    btn.addEventListener('click', handleDownloadClick);
  });

  contactButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ---------- Download Stats ----------
  async function refreshDownloadCount() {
    try {
      await fetch('/api/downloads');
    } catch (err) {
      /* no-op */
    }
  }

  // ---------- Contact Form ----------
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const submitBtn = document.getElementById('contactSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Could not send your message.', 'error');
      } else {
        showToast('Message sent! We\u2019ll get back to you soon.');
        contactForm.reset();
      }
    } catch (err) {
      showToast('Network error — please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });

  // ---------- Header shrink-on-scroll ----------
  const header = document.getElementById('siteHeader');
  let lastScrollY = window.scrollY;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (y > 40) {
        if (header) header.style.background = 'rgba(5, 8, 15, 0.9)';
      } else {
        if (header) header.style.background = 'rgba(6, 10, 19, 0.72)';
      }
      lastScrollY = y;
    },
    { passive: true }
  );
})();