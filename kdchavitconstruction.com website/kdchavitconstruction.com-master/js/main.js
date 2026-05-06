/* ============================================================
   KDChavit Construction – Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     1. SCROLL PROGRESS BAR
  ---------------------------------------------------------- */
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.prepend(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop    = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress     = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });


  /* ----------------------------------------------------------
     2. STICKY NAVBAR — shadow on scroll
  ---------------------------------------------------------- */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* ----------------------------------------------------------
     3. ACTIVE NAV LINK (Intersection Observer)
  ---------------------------------------------------------- */
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => sectionObserver.observe(s));


  /* ----------------------------------------------------------
     4. MOBILE MENU
  ---------------------------------------------------------- */
  const navToggle    = document.getElementById('navToggle');
  const mobileMenu   = document.getElementById('mobileMenu');
  const mobileClose  = document.getElementById('mobileClose');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (navToggle && mobileMenu && mobileClose && mobileOverlay) {
    const openMenu  = () => {
      mobileMenu.classList.add('open');
      mobileOverlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    };
    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      mobileOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    };

    navToggle.addEventListener('click', openMenu);
    mobileClose.addEventListener('click', closeMenu);
    mobileOverlay.addEventListener('click', closeMenu);

    // Close mobile menu on link click
    document.querySelectorAll('.mobile-menu__list a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }


  /* ----------------------------------------------------------
     5. HERO SLIDER
  ---------------------------------------------------------- */
  const slides  = document.querySelectorAll('.hero__slide');
  const dots    = document.querySelectorAll('.hero__dot');

  if (slides.length) {
    let current   = 0;
    let sliderTimer;

    const goToSlide = (idx) => {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    };

    const startSlider = () => {
      sliderTimer = setInterval(() => goToSlide(current + 1), 6000);
    };
    const resetSlider = () => {
      clearInterval(sliderTimer);
      startSlider();
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index));
        resetSlider();
      });
    });

    startSlider();
  }


  /* ----------------------------------------------------------
     6. HERO PARTICLES
  ---------------------------------------------------------- */
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    for (let i = 0; i < 14; i++) {
      const p   = document.createElement('div');
      p.className = 'hero__particle';
      const size    = Math.random() * 60 + 20;
      const left    = Math.random() * 100;
      const top     = Math.random() * 100;
      const delay   = Math.random() * 6;
      const duration = Math.random() * 4 + 4;
      Object.assign(p.style, {
        width:  size + 'px',
        height: size + 'px',
        left:   left + '%',
        top:    top  + '%',
        animationDelay:    delay    + 's',
        animationDuration: duration + 's',
      });
      particlesContainer.appendChild(p);
    }
  }


  /* ----------------------------------------------------------
     7. COUNTER / NUMBER TICKER ANIMATION
  ---------------------------------------------------------- */
  const counters = document.querySelectorAll('.stats__num');

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.target);
    const duration = 2200;
    const step     = target / (duration / 16);
    let current    = 0;
    const timer    = setInterval(() => {
      current += step;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, 16);
  };

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(c => counterObserver.observe(c));


  /* ----------------------------------------------------------
     8. PROJECT FILTER
  ---------------------------------------------------------- */
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card, .project-detail-card');

  if (filterBtns.length) filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter cards with a fade effect
      projectCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        if (match) {
          card.style.display = 'block';
          card.style.animation = 'filterFadeIn .4s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Keyframe injection for filter animation
  const filterStyle = document.createElement('style');
  filterStyle.textContent = `
    @keyframes filterFadeIn {
      from { opacity: 0; transform: scale(.95) translateY(8px); }
      to   { opacity: 1; transform: scale(1)  translateY(0); }
    }
  `;
  document.head.appendChild(filterStyle);


  /* ----------------------------------------------------------
     9. CONTACT FORM — CLIENT-SIDE VALIDATION & FEEDBACK
  ---------------------------------------------------------- */
  const contactForm  = document.getElementById('contactForm');
  const formSuccess  = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Validate required fields
      const required = contactForm.querySelectorAll('[required]');
      let valid = true;

      required.forEach(field => {
        field.classList.remove('error');
        if (!field.value.trim()) {
          field.classList.add('error');
          valid = false;
        }
        // Email check
        if (field.type === 'email' && field.value.trim()) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(field.value.trim())) {
            field.classList.add('error');
            valid = false;
          }
        }
      });

      if (!valid) {
        const firstError = contactForm.querySelector('.error');
        if (firstError) firstError.focus();
        return;
      }

      // Simulate form submission — show success
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      setTimeout(() => {
        contactForm.style.display = 'none';
        formSuccess.classList.add('visible');
        // Scroll success into view
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1400);
    });

    // Remove error on input
    contactForm.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('input', () => field.classList.remove('error'));
    });
  }


  /* ----------------------------------------------------------
     10. SMOOTH SCROLL FOR ANCHOR LINKS
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH   = navbar ? navbar.offsetHeight : 0;
      const top    = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ----------------------------------------------------------
     10b. MVV TABS
  ---------------------------------------------------------- */
  const mvvTabs   = document.querySelectorAll('.mvv__tab');
  const mvvPanels = document.querySelectorAll('.mvv__panel');
  if (mvvTabs.length) {
    mvvTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        mvvTabs.forEach(t => t.classList.remove('active'));
        mvvPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }


  /* ----------------------------------------------------------
     11. BACK TO TOP BUTTON
  ---------------------------------------------------------- */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 380);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  /* ----------------------------------------------------------
     12. FOOTER YEAR
  ---------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ----------------------------------------------------------
     13. AOS INITIALIZATION
  ---------------------------------------------------------- */
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration:   800,
      easing:     'ease-out-cubic',
      once:       true,
      offset:     60,
    });
  }

});
