  /* ============================================================
     MODULES SWITCHER
     ============================================================ */
  const moduleCounts = [15, 5, 3, 9, 7];
  const moduleTotal  = 39;

  function switchModule(idx) {
    document.querySelectorAll('.mod-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    document.querySelectorAll('.mod-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  }
  switchModule(0);

  /* ============================================================
     SCROLL REVEAL — Intersection Observer
     ============================================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = el.dataset.delay || 0;
      setTimeout(() => el.classList.add('is-visible'), parseInt(delay));
      revealObserver.unobserve(el);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-animate]').forEach(el => {
    el.classList.add('will-animate');
    revealObserver.observe(el);
  });

  /* ============================================================
     AUTO-TAG everything for scroll reveal
     ============================================================ */
  const autoTargets = [
    { sel: '.section-title',    anim: 'fade-up',   base: 0   },
    { sel: '.section-desc',     anim: 'fade-up',   base: 80  },
    { sel: '.section-tag',      anim: 'fade-up',   base: 0   },
    { sel: '.area-card',        anim: 'fade-up',   base: 0,  stagger: 80  },
    { sel: '.benefit-card',     anim: 'fade-up',   base: 0,  stagger: 70  },
    { sel: '.mod-tab',          anim: 'fade-left',  base: 0,  stagger: 60  },
    { sel: '.modules-panel-wrap', anim: 'fade-right', base: 100 },
    { sel: '.timeline-item',    anim: 'fade-left',  base: 0,  stagger: 90  },
    { sel: '.crm-panel',        anim: 'fade-right', base: 100 },
    { sel: '.split-visual',     anim: 'fade-right', base: 100 },
    { sel: '.cta-inner',        anim: 'fade-up',   base: 0   },
  ];

  autoTargets.forEach(({ sel, anim, base, stagger }) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (el.dataset.animate) return; // already tagged manually
      el.dataset.animate = anim;
      el.dataset.delay   = base + (stagger ? i * stagger : 0);
      el.classList.add('will-animate');
      revealObserver.observe(el);
    });
  });

  /* ============================================================
     NAVBAR — shrink + shadow on scroll
     ============================================================ */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ============================================================
     COUNTER ANIMATION — stat numbers
     ============================================================ */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.trim();
      // parse: "45+", "−70%", "100%", "5"
      const prefix = raw.startsWith('−') ? '−' : '';
      const suffix = raw.includes('%') ? '%' : (raw.includes('+') ? '+' : '');
      const num    = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (isNaN(num)) return;
      let start = 0;
      const duration = 1400;
      const step = timestamp => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = prefix + Math.round(ease * num) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

  /* ============================================================
     HERO DASHBOARD — animate pipeline rows on load
     ============================================================ */
  window.addEventListener('load', () => {
    document.querySelectorAll('.hd-pipe-row').forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      setTimeout(() => {
        row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, 600 + i * 120);
    });
    document.querySelectorAll('.hd-metric').forEach((m, i) => {
      m.style.opacity = '0';
      m.style.transform = 'translateY(12px)';
      setTimeout(() => {
        m.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        m.style.opacity = '1';
        m.style.transform = 'translateY(0)';
      }, 300 + i * 100);
    });
  });

  /* ============================================================
     FLOATING EFFECT on hero dashboard
     ============================================================ */
  const dashboard = document.querySelector('.hero-image-wrap');
  if (dashboard) {
    dashboard.style.animation = 'floatY 5s ease-in-out infinite';
  }

  /* ============================================================
     LEAD FORM → ClickUp via Cloudflare Worker
     ============================================================ */
  const WORKER_URL = 'https://clickup-lead-proxy.szymon-sidor.workers.dev';

  const leadForm = document.getElementById('leadForm');
  const leadEmail = document.getElementById('leadEmail');
  const leadBtn = document.getElementById('leadBtn');
  const formMsg = document.getElementById('formMsg');

  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    formMsg.className = 'hero-form-msg';

    const email = leadEmail.value.trim();
    const consent = document.getElementById('consent').checked;

    if (!consent) {
      formMsg.textContent = 'Proszę wyrazić zgodę na przetwarzanie danych.';
      formMsg.classList.add('error');
      return;
    }

    if (!email) {
      formMsg.textContent = 'Proszę podać adres e-mail.';
      formMsg.classList.add('error');
      return;
    }

    leadBtn.classList.add('loading');
    leadBtn.querySelector('.btn-arrow').textContent = '⟳';

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Błąd serwera');

      formMsg.textContent = 'Dziękujemy! Skontaktujemy się wkrótce.';
      formMsg.classList.add('success');
      leadEmail.value = '';
      document.getElementById('consent').checked = false;
    } catch (err) {
      formMsg.textContent = 'Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@boosterai.pl';
      formMsg.classList.add('error');
    } finally {
      leadBtn.classList.remove('loading');
      leadBtn.querySelector('.btn-arrow').textContent = '→';
    }
  });

  /* ============================================================
     CTA SCROLL → hero form + highlight
     ============================================================ */
  document.getElementById('ctaScrollBtn').addEventListener('click', function (e) {
    e.preventDefault();
    const formRow = document.querySelector('.hero-form-row');
    formRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      formRow.classList.add('highlight');
      leadEmail.focus();
      formRow.addEventListener('animationend', () => {
        formRow.classList.remove('highlight');
      }, { once: true });
    }, 600);
  });
