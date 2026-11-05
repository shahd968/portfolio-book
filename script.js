
(() => {
  'use strict';

  const book = document.getElementById('book');
  const sheets = Array.from(book.querySelectorAll('.sheet'));
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const dotsWrap = document.getElementById('dots');
  const live = document.getElementById('live');
  const hintLeft = book.querySelector('.edge-hint.left');
  const hintRight = book.querySelector('.edge-hint.right');

  const TOTAL = sheets.length; // number of sheets
  const LAST = TOTAL;          // highest state (back cover)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLIP_MS = reduceMotion ? 10 : 1000; // keep in sync with --flip in style.css
  const STAGGER_MS = reduceMotion ? 0 : 120;

  // Names for each state (used by the dots and screen readers)
  const SPREADS = [
    'Front cover',
    'Contents',
    'About',
    'Education',
    'Experience',
    'Skills',
    'Project 1',
    'Project 2',
    'Project 3',
    'Contact',
    'The End',
    'Back cover'
  ];

  let state = 0;
  let hoverSide = null;
  let swiped = false;

  /* ---------- Stacking order ---------- */
  // Unflipped sheets: first sheet on top. Flipped sheets: last flipped on top.
  const restingZ = (sheet, i) => (sheet.classList.contains('flipped') ? i + 1 : TOTAL - i);

  function settle(sheet, i) {
    sheet.style.zIndex = restingZ(sheet, i);
    sheet.style.transitionDelay = '0ms';
  }

  sheets.forEach((sheet, i) => settle(sheet, i));

  /* ---------- Dots ---------- */
  const dots = [];
  for (let n = 0; n <= LAST; n++) {
    const label = SPREADS[n] || 'Spread ' + n;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.title = label;
    dot.setAttribute('aria-label', 'Go to: ' + label);
    dot.addEventListener('click', () => goTo(n));
    dotsWrap.appendChild(dot);
    dots.push(dot);
  }

  /* ---------- Rendering ---------- */
  function render(target, stagger) {
    const from = state;
    const next = Math.max(0, Math.min(LAST, target));
    if (next === from) return;
    state = next;
    const forward = next > from;

    sheets.forEach((sheet, i) => {
      const shouldFlip = i < state;
      if (shouldFlip === sheet.classList.contains('flipped')) return;

      clearTimeout(sheet._settle);
      clearTimeout(sheet._raise);

      // When jumping several pages, sheets turn one after another
      const order = forward ? i - from : from - 1 - i;
      const delay = stagger ? order * STAGGER_MS : 0;
      sheet.style.transitionDelay = delay + 'ms';

      // The moving sheet sits above everything while it turns
      const raise = () => { sheet.style.zIndex = TOTAL + 10 + i; };
      if (delay) sheet._raise = setTimeout(raise, delay);
      else raise();

      sheet.classList.toggle('flipped', shouldFlip);
      sheet._settle = setTimeout(() => settle(sheet, i), FLIP_MS + delay + 60);
    });

    updateUI();
  }

  function updateUI() {
    book.dataset.state = String(state);
    book.dataset.edge = state === 0 ? 'start' : state === LAST ? 'end' : 'open';
    prevBtn.disabled = state === 0;
    nextBtn.disabled = state === LAST;
    dots.forEach((dot, n) => {
      dot.classList.toggle('active', n === state);
      dot.setAttribute('aria-current', n === state ? 'true' : 'false');
    });
    live.textContent = SPREADS[state] || '';
    setHover(hoverSide);
  }

  /* ---------- Navigation ---------- */
  const next = () => render(state + 1, false);
  const prev = () => render(state - 1, false);
  const goTo = (n) => render(n, Math.abs(n - state) > 1);

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => goTo(Number(el.dataset.goto)));
  });

  /* ---------- Click left / right side of the book ---------- */
  const INTERACTIVE = 'a, button, input, textarea, select, label';

  function sideOf(e) {
    const rect = book.getBoundingClientRect();
    return e.clientX > rect.left + rect.width / 2 ? 'right' : 'left';
  }

  book.addEventListener('click', (e) => {
    if (swiped) return;
    if (e.target.closest(INTERACTIVE)) return; // links and buttons keep working
    if (sideOf(e) === 'right') next();
    else prev();
  });

  /* ---------- Hover hints (arrow + pointer cursor) ---------- */
  function setHover(side) {
    hoverSide = side;
    const canPrev = side === 'left' && state > 0;
    const canNext = side === 'right' && state < LAST;
    hintLeft.classList.toggle('show', canPrev);
    hintRight.classList.toggle('show', canNext);
    book.style.cursor = canPrev || canNext ? 'pointer' : 'default';
  }

  book.addEventListener('mousemove', (e) => {
    setHover(e.target.closest(INTERACTIVE) ? null : sideOf(e));
  });
  book.addEventListener('mouseleave', () => setHover(null));

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        prev(); break;
      case 'Home':
        goTo(0); break;
      case 'End':
        goTo(LAST); break;
      default:
        return;
    }
    e.preventDefault();
  });

  /* ---------- Touch swipe ---------- */
  let startX = null;
  let startY = null;

  book.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });

  book.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next(); else prev();
      swiped = true;
      setTimeout(() => { swiped = false; }, 400);
    }
  }, { passive: true });

  updateUI();
})();