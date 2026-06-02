import './style.css'
import assets from './assets.json'

const CLOUD = assets.cloudinaryBase

// ── CSS custom properties para backgrounds
const root = document.documentElement
root.style.setProperty('--bg-cta-1', `url('${assets.cssBackgrounds.primary}')`)
root.style.setProperty('--bg-cta-2', `url('${assets.cssBackgrounds.overlay}')`)
root.style.setProperty('--bg-about-1', `url('${assets.cssBackgrounds.primary}')`)
root.style.setProperty('--bg-about-2', `url('${assets.cssBackgrounds.overlay}')`)

// ── Hidratar imágenes al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hero-bg-slide').forEach((el, i) => {
    el.style.backgroundImage = `url('${CLOUD}/${assets.heroImages[i]}')`
  })
  document.querySelectorAll('.proceso-bg-slide').forEach((el, i) => {
    el.style.backgroundImage = `url('${CLOUD}/${assets.heroImages[i]}')`
  })
  const grid = document.querySelector('.proyectos-grid')
  if (grid) {
    grid.innerHTML = ''
    assets.proyectos.forEach((p, i) => {
      const card = document.createElement('div')
      card.className = `proyecto-card reveal${i === 0 ? ' reveal-delay-1' : i === 1 ? ' reveal-delay-2' : ' reveal-delay-3'}`
      card.innerHTML = `
        <div class="proyecto-img-wrap">
          <img src="${p.image}" alt="${p.title}" loading="lazy" />
          <div class="proyecto-overlay">
            <span class="proyecto-tag">${p.tag}</span>
            <h3>${p.title}</h3>
            <p>${p.description}</p>
            <a href="${p.url}" target="_blank" rel="noopener" class="proyecto-link">Ver proyecto →</a>
          </div>
        </div>`
      grid.appendChild(card)
    })
    document.querySelectorAll('.proyecto-card.reveal').forEach(el => revealObs.observe(el))
  }
  document.querySelectorAll('.testimonial-avatar img').forEach((el, i) => {
    el.src = `${CLOUD}/${assets.testimonialAvatars[i]}`
  })
  const aboutImg = document.querySelector('.about-photo-frame img')
  if (aboutImg) aboutImg.src = `${CLOUD}/${assets.aboutPhoto}`
  const wa = document.querySelector('.whatsapp-float')
  if (wa) wa.href = assets.whatsapp.url
});

// ── Particles
(function() {
  const container = document.getElementById('particles');
  const count = 28;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = [
      `left: ${Math.random() * 100}%`,
      `top: ${Math.random() * 100}%`,
      `animation-duration: ${6 + Math.random() * 12}s`,
      `animation-delay: ${Math.random() * 8}s`,
      `width: ${1 + Math.random() * 2}px`,
      `height: ${1 + Math.random() * 2}px`,
    ].join(';');
    container.appendChild(p);
  }
})();

// ── Nav scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Active nav link
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.3 });
sections.forEach(s => observer.observe(s));

// ── Scroll reveal
const reveals = document.querySelectorAll('.reveal');
let revealObs
revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => revealObs.observe(el));

// ── Mobile nav
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const mobileOverlay = document.getElementById('mobileOverlay');
const closeMenu = document.getElementById('closeMenu');

function openNav() {
  mobileNav.classList.add('open');
  mobileOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeNav() {
  mobileNav.classList.remove('open');
  mobileOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', openNav);
closeMenu.addEventListener('click', closeNav);
mobileOverlay.addEventListener('click', closeNav);
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

// ── Smooth scroll with offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Hover micro-interaction on benefit cards
document.querySelectorAll('.benefit-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    card.style.transform = `translateY(-4px) rotateX(${-y}deg) rotateY(${x}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ── Counter animation on stat
function animateCounter(el, from, to, suffix) {
  let start = null;
  const duration = 1800;
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const val = Math.floor(from + (to - from) * easeOut(progress));
    el.textContent = '+' + val + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

const statNum = document.querySelector('.stat-num');
const statObs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    animateCounter(statNum, 0, 25, '%');
    statObs.disconnect();
  }
}, { threshold: 0.5 });
if (statNum) statObs.observe(statNum);

// ── Testimonial carousel (fade)
(function() {
  const fades = document.querySelectorAll('.testimonios-fade');
  const dots = document.querySelectorAll('.testimonios-dot');
  if (!fades.length) return;
  let current = 0;
  let interval = null;

  function goTo(index) {
    fades[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    fades[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo((current + 1) % fades.length); }

  dots.forEach(dot => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
  });

  const container = document.querySelector('.testimonios-stack');
  function startAuto() { interval = setInterval(next, 6000); }
  function resetAuto() { clearInterval(interval); startAuto(); }
  if (container) {
    container.addEventListener('mouseenter', () => clearInterval(interval));
    container.addEventListener('mouseleave', startAuto);
  }
  startAuto();
})();

// ── Hero background carousel
(function() {
  const slides = document.querySelectorAll('.hero-bg-slide');
  if (slides.length < 2) return;
  let current = 0;
  let interval;

  function next() {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }

  function startAuto() { interval = setInterval(next, 5000); }
  function stopAuto() { clearInterval(interval); }

  const hero = document.querySelector('.hero-bg');
  if (hero) {
    hero.addEventListener('mouseenter', stopAuto);
    hero.addEventListener('mouseleave', startAuto);
  }
  startAuto();
})();

// ── Proceso image carousel
(function() {
  const slides = document.querySelectorAll('.proceso-bg-slide');
  if (slides.length < 2) return;
  let current = 0;
  let interval;

  function next() {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }

  function startAuto() { interval = setInterval(next, 5000); }
  function stopAuto() { clearInterval(interval); }

  const wrap = document.querySelector('.proceso-img-wrap');
  if (wrap) {
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);
  }
  startAuto();
})();
