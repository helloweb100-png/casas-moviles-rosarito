/* ==========================================================================
   Casas Móviles Rosarito — script.js
   Todo lo interactivo de la landing, en un solo archivo y sin dependencias obligatorias.
   · Lenis (scroll suave) se carga desde jsDelivr con versión fija; si la CDN falla,
     la página funciona igual con el scroll nativo.
   · Cada módulo corre dentro de un try/catch: si uno falla, los demás siguen.
   · Respeta prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  /* ═════════════ Configuración ═════════════ */

  // WhatsApp del negocio: 10 dígitos, sin +52 ni espacios (confirmado por el cliente).
  // Si se deja vacío, los botones de WhatsApp y el envío del formulario se ocultan solos.
  const WHATSAPP_NUMERO = '6642196963';

  const ZONA_HORARIA = 'America/Tijuana'; // para el indicador «en horario / fuera de horario»
  const CARGADOR_MS = 1700;               // duración del cargador (máximo permitido: 2.5 s)

  /* ═════════════ Utilidades ═════════════ */

  window.__cmr = true; // le avisa al respaldo del <head> que este script sí cargó

  const d = document;
  const root = d.documentElement;
  root.classList.add('js'); // por si el respaldo del <head> la quitó porque el script tardó en cargar
  const $ = (sel, ctx) => (ctx || d).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || d).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = (n) => String(n).padStart(2, '0');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; };

  const S = {
    y: 0, vh: window.innerHeight, vw: window.innerWidth,
    lenis: null, locks: 0, heroOn: true,
    G: {} // geometría en caché (posiciones absolutas de las secciones con scroll ligado)
  };
  const readyFns = [];
  const onReady = (fn) => { if (root.classList.contains('ready')) fn(); else readyFns.push(fn); };

  /* ═════════════ WhatsApp ═════════════ */

  const WA_NUM = String(WHATSAPP_NUMERO || '').replace(/\D/g, '');
  const WA_OK = WA_NUM.length >= 10;
  const waUrl = (texto) =>
    'https://wa.me/' + (WA_NUM.length === 10 ? '52' + WA_NUM : WA_NUM) + '?text=' + encodeURIComponent(texto);

  function initWhatsApp() {
    if (!WA_OK) {
      root.classList.add('no-wa');
      const note = $('[data-form-note]');
      if (note) note.textContent = 'Por ahora el contacto es por llamada: 664 219 6963.';
      return;
    }
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.getAttribute('data-wa-text') || 'Hola, vi su página y me gustaría información.');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  /* ═════════════ Bloqueo de scroll (menú y visor) ═════════════ */

  function lockScroll(on) {
    S.locks = Math.max(0, S.locks + (on ? 1 : -1));
    const locked = S.locks > 0;
    root.classList.toggle('is-locked', locked);
    if (S.lenis) { if (locked) S.lenis.stop(); else S.lenis.start(); }
  }

  /* ═════════════ Scroll suave (Lenis) y anclas ═════════════ */

  function initScroll() {
    if (!reduce && window.Lenis) {
      try {
        S.lenis = new window.Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          autoRaf: false
        });
      } catch (e) { S.lenis = null; }
    }

    d.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const target = d.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      closeMenu(true);
      if (S.lenis) S.lenis.scrollTo(target, { offset: 0, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); // el foco sigue al ancla (teclado y lectores)
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* ═════════════ Cargador ═════════════ */

  function initLoader() {
    const el = $('#cargador');
    if (!el || reduce) { root.classList.add('ready'); runReady(); if (el) el.remove(); return; }
    const espera = Math.max(0, CARGADOR_MS - performance.now());
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => { root.classList.add('ready'); runReady(); }, 380);
      setTimeout(() => { el.hidden = true; el.remove(); }, 1200);
    }, espera);
  }
  function runReady() { while (readyFns.length) { try { readyFns.shift()(); } catch (e) { /* sigue */ } } }

  /* ═════════════ Texto partido en palabras + entradas al scroll ═════════════ */

  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            const w = d.createElement('span'); w.className = 'w';
            const wi = d.createElement('span'); wi.className = 'wi';
            wi.textContent = p; wi.style.setProperty('--wi', i++);
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) { walk(n); }
      });
    };
    walk(el);
  }

  function initReveal() {
    const splits = $$('[data-split]');
    splits.forEach(splitWords);

    // Escalonado: cada elemento con data-reveal se retrasa un poco respecto a su hermano anterior
    $$('[data-reveal]').forEach((el) => {
      let n = 0, s = el.previousElementSibling;
      while (s && n < 5) { if (s.hasAttribute('data-reveal')) n++; s = s.previousElementSibling; }
      if (n) el.style.setProperty('--rd', n * 90 + 'ms');
    });
    $$('.bento .g-item').forEach((el, i) => { el.setAttribute('data-reveal', 'zoom'); el.style.setProperty('--rd', (i % 4) * 90 + 'ms'); });

    const objetivos = $$('[data-reveal], [data-split]:not([data-split="hero"])');
    if (!('IntersectionObserver' in window)) { objetivos.forEach((el) => el.classList.add('is-in')); }
    else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      objetivos.forEach((el) => io.observe(el));
    }

    // El título del hero entra cuando termina el cargador
    const heroTitle = $('[data-split="hero"]');
    if (heroTitle) onReady(() => setTimeout(() => heroTitle.classList.add('is-in'), 250));
  }

  /* ═════════════ Contadores del hero ═════════════ */

  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const pad = (el, n) => (parseInt(el.getAttribute('data-pad'), 10) ? pad2(n) : String(n));
    if (reduce) return;
    els.forEach((el) => { el.textContent = pad(el, 0); });
    onReady(() => setTimeout(() => {
      els.forEach((el) => {
        const meta = parseInt(el.getAttribute('data-count'), 10) || 0;
        const t0 = performance.now(), dur = 1400;
        const paso = (t) => {
          const k = clamp((t - t0) / dur, 0, 1);
          el.textContent = pad(el, Math.round(meta * easeOut(k)));
          if (k < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      });
    }, 900));
  }

  /* ═════════════ Navegación y menú móvil ═════════════ */

  const nav = $('#nav');
  const menu = $('#menu');
  const burger = $('.burger');
  let menuOpen = false;
  let menuTimer = null;

  function openMenu() {
    if (!menu || menuOpen) return;
    menuOpen = true;
    clearTimeout(menuTimer);
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    nav.classList.remove('is-hidden');
    lockScroll(true);
  }
  function closeMenu(rapido) {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    lockScroll(false);
    menuTimer = setTimeout(() => { menu.hidden = true; }, rapido ? 300 : 950);
  }

  function initNav() {
    if (burger) burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1000) closeMenu(true); });

    // Enlace de la sección actual
    const mapa = new Map();
    $$('.nav-links a').forEach((a) => {
      const sec = d.getElementById((a.getAttribute('href') || '').slice(1));
      if (sec) mapa.set(sec, a);
    });
    if ('IntersectionObserver' in window && mapa.size) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const a = mapa.get(en.target);
          if (a && en.isIntersecting) { mapa.forEach((l) => l.classList.remove('is-current')); a.classList.add('is-current'); }
          else if (a) { a.classList.remove('is-current'); }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      mapa.forEach((_, sec) => io.observe(sec));
    }
  }

  /* ═════════════ Partículas del hero ═════════════ */

  const Particulas = (function () {
    const cv = $('#particulas');
    const ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    const COLORES = ['255,59,59', '224,18,26', '201,204,210', '255,255,255'];
    let w = 0, h = 0, parts = [];
    const mouse = { x: -999, y: -999 };

    function resize() {
      if (!ctx) return;
      const r = cv.getBoundingClientRect();
      if (parts.length && Math.abs(r.width - w) < 2 && Math.abs(r.height - h) < 2) return; // sin cambios de tamaño
      const dpr = Math.min(window.devicePixelRatio || 1, S.vw < 700 ? 1.5 : 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 17000, 26, 84));
      parts = [];
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 - 0.06,
          r: 0.8 + Math.random() * 1.9, c: COLORES[Math.floor(Math.random() * COLORES.length)],
          a: 0.35 + Math.random() * 0.55, ph: Math.random() * 6.28
        });
      }
      if (reduce) dibujar(0, 0);
    }

    function dibujar(dt, t) {
      ctx.clearRect(0, 0, w, h);
      const LIM = 118, LIM2 = LIM * LIM;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        const mx = p.x - mouse.x, my = p.y - mouse.y, md = mx * mx + my * my;
        if (md < 14400 && md > 1) { const f = (1 - Math.sqrt(md) / 120) * 0.9 * dt; p.x += (mx / Math.sqrt(md)) * f; p.y += (my / Math.sqrt(md)) * f; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        const a = p.a * (0.65 + 0.35 * Math.sin(t * 0.002 + p.ph));
        ctx.fillStyle = 'rgba(' + p.c + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, dd = dx * dx + dy * dy;
          if (dd < LIM2) {
            ctx.strokeStyle = 'rgba(255,59,59,' + ((1 - Math.sqrt(dd) / LIM) * 0.24).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
          }
        }
        const mx = parts[i].x - mouse.x, my = parts[i].y - mouse.y, md = mx * mx + my * my;
        if (md < 22500) {
          ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - Math.sqrt(md) / 150) * 0.32).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }

    function init() {
      if (!ctx) return;
      resize();
      const hero = $('.hero');
      if (hero && finePointer) {
        hero.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
      }
    }
    function tick(dt, t) { if (ctx && !reduce && w) dibujar(dt, t); }
    return { init: init, resize: resize, tick: tick };
  })();

  /* ═════════════ Anillo 3D del hero (parallax con el mouse, arrastre y scroll) ═════════════ */

  const Anillo = (function () {
    const stage = $('.hero-stage');
    const tilt = $('.tilt');
    const hero = $('.hero');
    let tx = 0, ty = 0, cx = 0, cy = 0, giro = 0, vgiro = 0, arrastrando = false, lastX = 0;

    function init() {
      if (!stage || !tilt || !hero) return;
      if (finePointer && !reduce) {
        hero.addEventListener('pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          ty = (e.clientX / S.vw - 0.5) * 16;
          tx = -(e.clientY / S.vh - 0.5) * 9;
        });
        hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      }
      stage.addEventListener('pointerdown', (e) => {
        arrastrando = true; lastX = e.clientX; vgiro = 0;
        stage.classList.add('is-drag');
        if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } }
      });
      stage.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        const dx = e.clientX - lastX; lastX = e.clientX;
        giro += dx * 0.32; vgiro = dx * 0.32;
      });
      const soltar = () => { arrastrando = false; stage.classList.remove('is-drag'); };
      stage.addEventListener('pointerup', soltar);
      stage.addEventListener('pointercancel', soltar);
    }

    function tick() {
      if (!tilt || reduce) return;
      if (!arrastrando) { giro += vgiro; vgiro *= 0.93; if (Math.abs(vgiro) < 0.01) vgiro = 0; }
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      tilt.style.setProperty('--rx', cx.toFixed(2) + 'deg');
      tilt.style.setProperty('--ry', cy.toFixed(2) + 'deg');
      tilt.style.setProperty('--sy', (giro + S.y * 0.045).toFixed(2) + 'deg');
    }
    return { init: init, tick: tick };
  })();

  /* ═════════════ Cursor personalizado ═════════════ */

  const Cursor = (function () {
    const cur = $('.cursor');
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    const label = ring ? $('span', ring) : null;
    let x = -100, y = -100, rx = -100, ry = -100, on = false;

    function init() {
      if (!cur) return;
      if (!finePointer || reduce) { cur.remove(); return; }
      on = true;
      cur.classList.add('is-hide');
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        x = e.clientX; y = e.clientY;
        cur.classList.remove('is-hide');
        const t = e.target;
        const texto = t.closest('.g-item') ? 'Ver' : t.closest('.hero-stage') ? 'Gira' : '';
        const enlace = t.closest('a, button, summary, input, select, textarea, label');
        cur.classList.toggle('is-view', !!texto);
        cur.classList.toggle('is-link', !!enlace && !texto);
        if (label && label.textContent !== texto) label.textContent = texto;
      }, { passive: true });
      d.documentElement.addEventListener('mouseleave', () => cur.classList.add('is-hide'));
    }
    function tick() {
      if (!on) return;
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    }
    return { init: init, tick: tick };
  })();

  /* ═════════════ Botones magnéticos ═════════════ */

  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('.btn-lg, .nav-cta, .btn-wa').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        b.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  /* ═════════════ Geometría y progreso ligado al scroll ═════════════ */

  const sv = { sec: null, track: null, view: null, bar: null, mq: window.matchMedia('(min-width: 900px)'), pinned: false, dist: 0 };
  const man = { el: null, words: [], pills: [], on: -1 };
  const proc = { el: null, steps: [], offs: [], last: -1 };
  const refs = {};

  const absTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  function layoutServicios() {
    if (!sv.sec) return;
    const pin = sv.mq.matches && !reduce;
    sv.pinned = pin;
    sv.sec.classList.toggle('is-pinned', pin);
    if (pin) {
      sv.dist = Math.max(0, sv.track.scrollWidth - sv.view.clientWidth);
      const alto = Math.round(sv.dist + S.vh) + 'px';
      if (sv.sec.style.getPropertyValue('--sv-h') !== alto) sv.sec.style.setProperty('--sv-h', alto);
    } else {
      sv.sec.style.removeProperty('--sv-h');
      sv.track.style.removeProperty('--sx');
      sv.dist = 0;
    }
  }

  function measure() {
    S.vh = window.innerHeight; S.vw = window.innerWidth;
    layoutServicios();
    const G = S.G;
    G.heroH = refs.hero ? refs.hero.offsetHeight : 0;
    if (man.el) { G.manTop = absTop(man.el); G.manH = man.el.offsetHeight; }
    if (refs.expand) { G.exTop = absTop(refs.expand); G.exH = refs.expand.offsetHeight; }
    if (sv.sec) { G.svTop = absTop(sv.sec); G.svH = sv.sec.offsetHeight; }
    if (proc.el) {
      G.stTop = absTop(proc.el); G.stH = proc.el.offsetHeight;
      proc.offs = proc.steps.map((s) => s.offsetTop);
      proc.last = -1;
    }
    if (refs.footer) { G.fTop = absTop(refs.footer); G.fH = refs.footer.offsetHeight; }
    if (refs.bands) { G.bTop = absTop(refs.bands); G.bH = refs.bands.offsetHeight; }
    Particulas.resize();
    S.dirty = true;
  }

  function initManifiesto() {
    man.el = $('#manifiesto');
    const el = $('[data-man]');
    if (!el || reduce) return;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            const s = d.createElement('span'); s.className = 'mw'; s.textContent = p;
            man.words.push(s); frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('pill')) man.pills.push({ el: n, at: man.words.length });
          else walk(n);
        }
      });
    };
    walk(el);
  }

  function actualizarManifiesto(p) {
    if (!man.words.length) return;
    const total = man.words.length;
    // Las palabras ya leídas se quedan encendidas: al volver hacia arriba el texto no regresa a gris casi invisible
    const on = Math.max(man.on, Math.round(clamp((p - 0.04) / 0.84, 0, 1) * (total + 2)));
    if (on === man.on) return;
    man.on = on;
    for (let i = 0; i < total; i++) man.words[i].classList.toggle('on', i < on);
    man.pills.forEach((pl) => pl.el.classList.toggle('on', on > pl.at));
  }

  function initProceso() {
    proc.el = $('.steps');
    if (!proc.el) return;
    proc.steps = $$('.step', proc.el);
    if (reduce) { proc.steps.forEach((s) => s.classList.add('is-on')); proc.el.style.setProperty('--prog', '1'); }
  }

  // Un solo bucle de animación para todo lo que depende del scroll o del puntero
  function frame(t) {
    if (S.lenis) S.lenis.raf(t);
    const y = window.scrollY || root.scrollTop;
    const dy = y - S.y;
    const cambio = y !== S.y || S.dirty;
    S.y = y; S.dirty = false;
    const G = S.G;
    const dt = clamp((t - (frame.t0 || t)) / 16.667, 0.2, 3); frame.t0 = t;

    if (cambio) {
      // Barra de progreso de lectura
      if (refs.bar) {
        const max = root.scrollHeight - S.vh;
        refs.bar.style.setProperty('--sp', (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4));
      }
      // Navegación: se esconde al bajar y reaparece al subir
      if (nav && !menuOpen && S.ready) {
        if (y > 140 && dy > 6) nav.classList.add('is-hidden');
        else if (dy < -6 || y < 140) nav.classList.remove('is-hidden');
      }
      // Hero
      S.heroOn = y < (G.heroH || 800) * 1.05;
      if (refs.hero && S.heroOn) refs.hero.style.setProperty('--hp', clamp(y / (G.heroH || 800), 0, 1).toFixed(4));
      // Bandas inclinadas por la velocidad del scroll
      if (refs.bands && y + S.vh > (G.bTop || 0) && y < (G.bTop || 0) + (G.bH || 0)) {
        S.vel = (S.vel || 0) + (clamp(dy * 0.07, -3, 3) - (S.vel || 0)) * 0.2;
        refs.bands.style.setProperty('--vel', S.vel.toFixed(2));
      }
      // Manifiesto: las palabras se encienden
      if (man.words.length && G.manH) actualizarManifiesto(clamp((y - G.manTop) / (G.manH - S.vh), 0, 1));
      // Imagen que se abre a pantalla completa
      if (refs.expand && G.exH && !reduce) {
        const p = clamp((y - (G.exTop - S.vh * 0.3)) / ((G.exH - S.vh) * 0.62), 0, 1);
        if (p !== S.exP) { S.exP = p; refs.expand.style.setProperty('--p', p.toFixed(4)); }
      }
      // Servicios: recorrido horizontal pinneado
      if (sv.pinned && G.svH) {
        const p = clamp((y - G.svTop) / (G.svH - S.vh), 0, 1);
        sv.track.style.setProperty('--sx', (-sv.dist * p).toFixed(1) + 'px');
        sv.bar.style.setProperty('--svp', p.toFixed(4));
      }
      // Proceso: el remolque avanza y enciende los pasos
      if (proc.el && G.stH && !reduce) {
        const p = clamp((y + S.vh * 0.62 - G.stTop) / G.stH, 0, 1);
        if (Math.abs(p - (proc.p || 0)) > 0.0008) {
          proc.p = p; proc.el.style.setProperty('--prog', p.toFixed(4));
          const pos = 22 + (G.stH - 44) * p;
          proc.steps.forEach((s, i) => s.classList.toggle('is-on', pos >= (proc.offs[i] || 0) + 8));
        }
      }
      // Pie: el texto gigante sube
      if (refs.footer && G.fH && y + S.vh > G.fTop) {
        refs.footer.style.setProperty('--fp', clamp((y + S.vh - G.fTop) / G.fH, 0, 1).toFixed(3));
      }
    }

    // Lo que depende del puntero o del tiempo, solo mientras el hero se ve
    if (S.heroOn) { Particulas.tick(dt, t); Anillo.tick(); }
    Cursor.tick();
    requestAnimationFrame(frame);
  }

  /* ═════════════ Servicios (carrusel nativo en móvil, pinneado en escritorio) ═════════════ */

  function initServicios() {
    sv.sec = $('#servicios');
    if (!sv.sec) return;
    sv.track = $('.sv-track', sv.sec); sv.view = $('.sv-viewport', sv.sec); sv.bar = $('.sv-progress', sv.sec);
    sv.view.addEventListener('scroll', () => {
      if (sv.pinned) return;
      const max = sv.view.scrollWidth - sv.view.clientWidth;
      sv.bar.style.setProperty('--svp', (max > 0 ? clamp(sv.view.scrollLeft / max, 0, 1) : 0).toFixed(3));
      // el progreso nunca empieza en cero: se ve la primera tarjeta
      if (max > 0 && sv.view.scrollLeft < 2) sv.bar.style.setProperty('--svp', '0.14');
    }, { passive: true });
    (sv.mq.addEventListener ? sv.mq.addEventListener.bind(sv.mq, 'change') : sv.mq.addListener.bind(sv.mq))(() => measure());
  }

  /* ═════════════ Galería: filtros y visor ═════════════ */

  function initGaleria() {
    const grid = $('#bento');
    if (!grid) return;
    const chips = $$('.chip-btn');
    const items = () => $$('li', grid);

    chips.forEach((btn) => btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-filter');
      chips.forEach((c) => { const on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      grid.classList.toggle('is-filtered', f !== 'todas');
      items().forEach((li) => {
        const ver = f === 'todas' || li.getAttribute('data-cat') === f;
        if (ver) { li.hidden = false; void li.offsetWidth; li.classList.remove('is-off'); }
        else {
          li.classList.add('is-off');
          setTimeout(() => { if (li.classList.contains('is-off')) li.hidden = true; }, 420);
        }
      });
      setTimeout(() => { S.dirty = true; measure(); }, 460);
    }));

    /* Visor */
    const lb = $('#lb');
    if (!lb) return;
    const img = $('.lb-img', lb), count = $('.lb-count', lb), title = $('.lb-title', lb), cta = $('.lb-cta', lb);
    const btnClose = $('.lb-close', lb);
    let lista = [], idx = 0, abierto = false, retorno = null;

    const visibles = () => $$('.g-item', grid).filter((b) => !b.closest('li').hidden);

    function mostrar(i, animar) {
      idx = (i + lista.length) % lista.length;
      const b = lista[idx];
      const im = $('img', b);
      const nombre = b.getAttribute('data-title') || im.alt;
      const pre = new Image();
      pre.src = im.currentSrc || im.src;
      const aplicar = () => {
        img.src = pre.src; img.alt = im.alt;
        if (im.naturalWidth) { img.width = im.naturalWidth; img.height = im.naturalHeight; }
        count.textContent = pad2(idx + 1) + ' / ' + pad2(lista.length);
        title.textContent = nombre;
        img.classList.remove('is-swap');
      };
      const listo = () => (animar ? setTimeout(aplicar, 160) : aplicar());
      if (animar) img.classList.add('is-swap');
      (pre.decode ? pre.decode().catch(() => {}) : Promise.resolve()).then(listo);
      if (WA_OK) cta.href = waUrl('Hola, me gustó la unidad «' + nombre + '» de su página y quiero una como esa. ¿Me pueden dar información?');
      [idx - 1, idx + 1].forEach((k) => { const n = lista[(k + lista.length) % lista.length]; if (n) { const p = new Image(); p.src = $('img', n).currentSrc || $('img', n).src; } });
    }
    function abrir(btn) {
      lista = visibles(); idx = Math.max(0, lista.indexOf(btn));
      retorno = btn; abierto = true;
      lb.hidden = false; lockScroll(true);
      mostrar(idx, false);
      requestAnimationFrame(() => { lb.classList.add('is-open'); btnClose.focus({ preventScroll: true }); });
    }
    function cerrar() {
      if (!abierto) return;
      abierto = false; lb.classList.remove('is-open'); lockScroll(false);
      setTimeout(() => { if (!abierto) lb.hidden = true; }, 480);
      if (retorno) retorno.focus({ preventScroll: true });
    }

    grid.addEventListener('click', (e) => { const b = e.target.closest('.g-item'); if (b) abrir(b); });
    $$('[data-lb-close]', lb).forEach((el) => el.addEventListener('click', cerrar));
    $('[data-lb-prev]', lb).addEventListener('click', () => mostrar(idx - 1, true));
    $('[data-lb-next]', lb).addEventListener('click', () => mostrar(idx + 1, true));
    cta.addEventListener('click', () => { if (!WA_OK) cerrar(); });

    d.addEventListener('keydown', (e) => {
      if (!abierto) return;
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowLeft') mostrar(idx - 1, true);
      else if (e.key === 'ArrowRight') mostrar(idx + 1, true);
      else if (e.key === 'Tab') {
        const foco = $$('button, a[href]', lb).filter((x) => x.offsetParent !== null);
        if (!foco.length) return;
        const a = foco[0], z = foco[foco.length - 1];
        if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });

    // Deslizar con el dedo para cambiar de foto
    let x0 = null;
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') x0 = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 56) mostrar(idx + (dx < 0 ? 1 : -1), true);
    });
  }

  /* ═════════════ «Por dentro»: puntos interactivos e inclinación 3D ═════════════ */

  function initInterior() {
    const media = $('.int-media');
    const hots = $$('.hot');
    const links = $$('[data-hot-link]');
    if (!media || !hots.length) return;
    let actual = 0, auto = !reduce, visible = false;

    const poner = (i) => {
      actual = i;
      hots.forEach((h, k) => h.classList.toggle('is-active', k === i));
      links.forEach((l, k) => l.classList.toggle('is-active', k === i));
    };
    const manual = (i) => { auto = false; poner(i); };
    hots.forEach((h, i) => {
      h.addEventListener('pointerenter', () => manual(i));
      h.addEventListener('focus', () => manual(i));
      h.addEventListener('click', () => manual(i));
    });
    links.forEach((l, i) => { l.addEventListener('pointerenter', () => manual(i)); l.addEventListener('click', () => manual(i)); });
    poner(0);

    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(media);
    setInterval(() => { if (auto && visible) poner((actual + 1) % hots.length); }, 2800);

    if (finePointer && !reduce) {
      media.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect();
        media.style.setProperty('--ty', (((e.clientX - r.left) / r.width - 0.5) * 9).toFixed(2) + 'deg');
        media.style.setProperty('--tx', (-((e.clientY - r.top) / r.height - 0.5) * 7).toFixed(2) + 'deg');
      });
      media.addEventListener('pointerleave', () => { media.style.setProperty('--tx', '0deg'); media.style.setProperty('--ty', '0deg'); });
    }
  }

  /* ═════════════ Indicador de horario ═════════════ */

  function initHorario() {
    const el = $('[data-status]');
    if (!el) return;
    const em = $('em', el);
    try {
      const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (tipo) => (partes.find((p) => p.type === tipo) || {}).value;
      const dia = get('weekday');
      const min = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      let abierto = false;
      if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(dia) > -1) abierto = min >= 480 && min < 1020;
      else if (dia === 'Sat') abierto = min >= 480 && min < 720;
      el.setAttribute('data-state', abierto ? 'open' : 'closed');
      em.textContent = abierto ? 'En horario de atención · con cita' : 'Fuera de horario · déjanos tu mensaje';
    } catch (e) { /* se conserva el texto base */ }
  }

  /* ═════════════ Formulario → WhatsApp ═════════════ */

  function initFormulario() {
    const form = $('#form-contacto');
    if (!form) return;
    const note = $('[data-form-note]', form);
    const base = note ? note.textContent : '';
    const err = (campo, msg) => {
      const s = $('[data-err="' + campo + '"]', form);
      const input = form.elements[campo];
      if (s) s.textContent = msg || '';
      if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    };
    ['nombre', 'interes'].forEach((c) => {
      const input = form.elements[c];
      if (input) ['input', 'change'].forEach((ev) => input.addEventListener(ev, () => err(c, '')));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!WA_OK) return;
      const v = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
      const nombre = v('nombre'), interes = v('interes'), ubicacion = v('ubicacion'), cita = v('cita'), mensaje = v('mensaje');
      let ok = true;
      err('nombre', ''); err('interes', '');
      if (nombre.length < 2) { err('nombre', 'Escribe tu nombre para saber cómo dirigirnos a ti.'); ok = false; }
      if (!interes) { err('interes', 'Elige qué necesitas para orientarte mejor.'); ok = false; }
      if (!ok) {
        const primero = form.querySelector('[aria-invalid="true"]');
        if (primero) primero.focus();
        if (note) { note.classList.remove('is-ok'); note.textContent = base; }
        return;
      }
      const lineas = ['Hola, soy ' + nombre + '.', 'Me interesa: ' + interes.toLowerCase() + '.'];
      if (ubicacion) lineas.push('Mi terreno o ciudad: ' + ubicacion + '.');
      if (cita) lineas.push('Mi cita ideal: ' + cita.toLowerCase() + '.');
      if (mensaje) lineas.push('Más detalles: ' + mensaje);
      lineas.push('Los encontré en su página web. ¿Me pueden ayudar?');
      const url = waUrl(lineas.join('\n'));
      if (note) { note.classList.add('is-ok'); note.textContent = 'Listo, ' + nombre + '. Abriendo WhatsApp con tu mensaje…'; }
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    });
  }

  /* ═════════════ Botón flotante de WhatsApp: aviso amable ═════════════ */

  function initWaFloat() {
    const btn = $('.wa-float');
    if (!btn || !WA_OK) return;
    onReady(() => {
      setTimeout(() => { btn.classList.add('is-tip'); setTimeout(() => btn.classList.remove('is-tip'), 5200); }, 7000);
    });
  }

  /* ═════════════ Arranque ═════════════ */

  function init() {
    refs.hero = $('.hero'); refs.expand = $('#traslados'); refs.footer = $('.footer');
    refs.bands = $('.bands'); refs.bar = $('.scroll-bar');

    [initWhatsApp, initScroll, initReveal, initCounters, initNav, initManifiesto, initProceso,
      initServicios, initGaleria, initInterior, initHorario, initFormulario, initWaFloat, initMagnetic,
      () => Particulas.init(), () => Anillo.init(), () => Cursor.init()
    ].forEach((fn) => { try { fn(); } catch (e) { if (window.console) console.error('[cmr]', e); } });

    onReady(() => { S.ready = true; });
    try { measure(); } catch (e) { /* se vuelve a medir al cargar */ }
    initLoader();

    window.addEventListener('resize', debounce(measure, 160));
    window.addEventListener('load', () => { measure(); setTimeout(measure, 600); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
    if ('ResizeObserver' in window) {
      const main = $('main');
      if (main) new ResizeObserver(debounce(measure, 120)).observe(main);
    }
    requestAnimationFrame(frame);
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
