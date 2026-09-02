/* Aleksa — "Altitude" · scroll choreography (GSAP + ScrollTrigger) */
gsap.registerPlugin(ScrollTrigger, Draggable, ScrollToPlugin);

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SCRUB = 0.6;

/* ───────── scale fixed-size stages to viewport (.fit) ───────── */
function fitStages() {
  $$('.fit').forEach(el => {
    const w = parseFloat(getComputedStyle(el).getPropertyValue('--w')) || 960;
    const s = Math.min(1, (innerWidth - 16) / w, (innerHeight - 140) / 560);
    el.style.setProperty('--s', s.toFixed(3));
  });
}
fitStages();

/* ───────── build infra racks ───────── */
$$('.rack').forEach(r => { r.innerHTML = Array.from({ length: 8 }, () => '<div class="unit"><i></i></div>').join(''); });

/* ───────── HUD: altimeter, chapter, progress ───────── */
const altEl = $('#alt'), progEl = $('#progress'), chNum = $('#chapter-num'), chName = $('#chapter-name');
ScrollTrigger.create({
  trigger: document.body, start: 'top top', end: 'bottom bottom',
  onUpdate: self => {
    altEl.textContent = Math.round(4000 * (1 - self.progress)).toLocaleString('en-US');
    progEl.style.transform = `scaleY(${self.progress})`;
  }
});
$$('.chapter').forEach((ch, i) => ScrollTrigger.create({
  trigger: ch, start: 'top 50%', end: 'bottom 50%',
  onToggle: self => { if (self.isActive) { chNum.textContent = String(i + 1).padStart(2, '0'); chName.textContent = ch.dataset.name; document.body.dataset.hud = ch.dataset.hud || 'light'; } }
}));

const chapter = (id, extra = {}) => gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: id, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true, ...extra }
});

/* ───────── 01 · THE JUMP ───────── */
{
  const tl = chapter('#hero');
  tl.to('.hero-copy', { y: -140, autoAlpha: 0, duration: 1, ease: 'power1.in' }, 0)
    .to('.clouds .cloud', { y: -420, duration: 4, stagger: 0.08 }, 0)
    .fromTo('.jump-window', { scale: 0.72, y: 220, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, duration: 1.2, ease: 'power2.out' }, 0.35)
    .fromTo('.jump-caption', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 1.3)
    .to('.jump-window', { y: -120, scale: 0.92, duration: 0.9 }, 3.1)
    .to('.jump-caption', { autoAlpha: 0, duration: 0.4 }, 3.1);
  gsap.set('.polaroid', { xPercent: -50, yPercent: -50, rotate: -6 });   // hidden behind the window until it closes or minimizes

  /* the window behaves like a window: drag, resize, minimize, maximize, close */
  {
    const wrap = $('.jump-window'), win = $('.jump-win'), stage = $('#hero .stage');
    const task = $('.win-task'), icon = $('.win-icon'), maxBtn = $('.wb-max');
    const MIN_W = 220, MIN_H = 150;
    const worldScale = () => (gsap.getProperty(wrap, 'scale') || 1) * (gsap.getProperty(win, 'scale') || 1);
    let saved = null, maxed = false, dirty = false;   // dirty: the visitor touched the window since the last reset

    const drag = Draggable.create(win, { trigger: '.jump-win .win-bar', type: 'x,y', bounds: stage, edgeResistance: 0.85, allowNativeTouchScrolling: false, zIndexBoost: false, onDragStart: () => { dirty = true; } })[0];

    const setMax = on => { maxed = on; win.classList.toggle('is-max', on); maxBtn.setAttribute('aria-label', on ? 'Restore' : 'Maximize'); };

    // resize from any edge or corner. The edge zones catch the outside; the window itself catches the inside band
    const EDGE = 14;
    const CURSOR = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
    const edgeAt = (x, y) => {
      if (maxed || getComputedStyle(win).visibility !== 'visible') return '';
      const r = win.getBoundingClientRect(), IN = 14, OUT = 10;
      if (x < r.left - OUT || x > r.right + OUT || y < r.top - OUT || y > r.bottom + OUT) return '';
      return (y < r.top + IN ? 'n' : y > r.bottom - IN ? 's' : '') + (x < r.left + IN ? 'w' : x > r.right - IN ? 'e' : '');
    };
    const startResize = (dir, e, target) => {
      if (maxed || !dir) return;
      e.preventDefault(); e.stopPropagation(); target.setPointerCapture(e.pointerId); dirty = true;
      const sc = worldScale(), r = win.getBoundingClientRect();
      const s0 = { x: e.clientX, y: e.clientY, w: r.width / sc, h: r.height / sc, tx: gsap.getProperty(win, 'x'), ty: gsap.getProperty(win, 'y') };
      document.body.style.cursor = CURSOR[dir];
      const move = ev => {
        const dx = (ev.clientX - s0.x) / sc, dy = (ev.clientY - s0.y) / sc;
        let w = s0.w, hh = s0.h;
        if (dir.includes('e')) w = s0.w + dx;
        if (dir.includes('w')) w = s0.w - dx;
        if (dir.includes('s')) hh = s0.h + dy;
        if (dir.includes('n')) hh = s0.h - dy;
        w = Math.max(MIN_W, w); hh = Math.max(MIN_H, hh);
        gsap.set(win, { width: w, height: hh, x: dir.includes('w') ? s0.tx + (s0.w - w) : s0.tx, y: dir.includes('n') ? s0.ty + (s0.h - hh) : s0.ty });
      };
      const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); document.body.style.cursor = ''; drag.update(); };
      target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
    };
    // the stage owns the cursor, so it changes whatever element happens to be under the pointer
    const onBar = e => e.target.closest('.win-bar, .wb, .win-task, .win-icon');
    const setEdge = dir => { stage.style.cursor = CURSOR[dir] || ''; };
    stage.addEventListener('pointermove', e => setEdge(onBar(e) ? '' : edgeAt(e.clientX, e.clientY)));
    stage.addEventListener('pointerleave', () => setEdge(''));
    stage.addEventListener('pointerdown', e => { if (!onBar(e)) startResize(edgeAt(e.clientX, e.clientY), e, stage); });

    // maximize / restore
    const maximize = () => {
      dirty = true;
      saved = { w: win.style.width, h: win.style.height, x: gsap.getProperty(win, 'x'), y: gsap.getProperty(win, 'y') };
      const sc = worldScale(), sr = stage.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const mx = 16, mt = 56, mb = 56;   // keep clear of the HUD corners
      gsap.to(win, { x: (sr.left + mx - wr.left) / sc, y: (sr.top + mt - wr.top) / sc, width: (sr.width - 2 * mx) / sc, height: (sr.height - mt - mb) / sc, duration: 0.25, ease: 'power2.out', onUpdate: () => drag.update() });
      setMax(true);
    };
    const restore = () => {
      const { w, h, x, y } = saved || { x: 0, y: 0 };
      gsap.to(win, { x, y, width: w || wrap.offsetWidth, height: h || wrap.offsetHeight, duration: 0.25, ease: 'power2.out', onUpdate: () => drag.update(),
        onComplete: () => { if (!w) gsap.set(win, { clearProps: 'width' }); if (!h) gsap.set(win, { clearProps: 'height' }); } });
      setMax(false);
    };
    maxBtn.addEventListener('click', () => maxed ? restore() : maximize());
    $('.jump-win .win-bar').addEventListener('dblclick', e => { if (!e.target.closest('.wb')) maxed ? restore() : maximize(); });

    // minimize → docks into the taskbar · close → a desktop icon · either brings it back
    const pola = $('.polaroid'), taskbar = $('.taskbar');
    let parked = null;
    gsap.set(taskbar, { yPercent: 100, autoAlpha: 0 });
    const show = el => { el.hidden = false; gsap.fromTo(el, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }); };
    const revealPhoto = () => gsap.fromTo(pola, { autoAlpha: 0, y: -24, scale: 0.9, rotate: 2 }, { autoAlpha: 1, y: 0, scale: 1, rotate: -6, duration: 0.55, ease: 'back.out(1.4)', delay: 0.05 });
    const hidePhoto = () => gsap.to(pola, { autoAlpha: 0, y: -24, scale: 0.9, duration: 0.25, ease: 'power2.in' });
    const dock = () => {
      dirty = true; gsap.killTweensOf(win);
      gsap.to(taskbar, { yPercent: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
      const t = task.getBoundingClientRect(), r = win.getBoundingClientRect();
      gsap.to(win, { autoAlpha: 0, scale: 0.15, x: `+=${(t.left + t.width / 2 - (r.left + r.width / 2)) / worldScale()}`, y: `+=${(t.bottom - r.bottom) / worldScale()}`, transformOrigin: '50% 100%', duration: 0.38, ease: 'power2.in',
        onComplete: () => { gsap.set(win, { x: parked.x, y: parked.y, scale: 1, transformOrigin: '50% 50%' }); revealPhoto(); } });
      parked = { x: gsap.getProperty(win, 'x'), y: gsap.getProperty(win, 'y') };
    };
    const close = () => {
      dirty = true; gsap.killTweensOf(win);
      gsap.to(win, { autoAlpha: 0, scale: 0.94, duration: 0.28, ease: 'power2.in', onComplete: () => { gsap.set(win, { scale: 1 }); show(icon); revealPhoto(); } });
    };
    const bringBack = () => {
      gsap.to(taskbar, { yPercent: 100, autoAlpha: 0, duration: 0.25, ease: 'power2.in' });
      gsap.to(icon, { autoAlpha: 0, duration: 0.15, onComplete: () => { icon.hidden = true; } });
      hidePhoto();
      gsap.killTweensOf(win);
      gsap.fromTo(win, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power2.out', delay: 0.1, onUpdate: () => drag.update() });
    };
    $('.wb-min').addEventListener('click', dock);
    $('.wb-close').addEventListener('click', close);
    task.addEventListener('click', bringBack);
    icon.addEventListener('click', bringBack);

    // scrolled back up towards the heading: ease everything away, then put the window back for another round
    const reset = () => {
      dirty = false; saved = null; parked = null; setMax(false);
      gsap.killTweensOf([win, pola, taskbar, icon]);
      const ease = 'power2.inOut';
      gsap.to(pola, { autoAlpha: 0, y: -30, scale: 0.94, duration: 1.1, ease });
      gsap.to(taskbar, { yPercent: 100, autoAlpha: 0, duration: 0.9, ease });
      gsap.to(icon, { autoAlpha: 0, duration: 0.8, ease, onComplete: () => { icon.hidden = true; gsap.set(icon, { clearProps: 'all' }); } });
      gsap.to(win, { autoAlpha: 0, duration: 0.9, ease, onComplete: () => { gsap.set(win, { clearProps: 'all' }); drag.update(); gsap.set(pola, { y: 0, scale: 1, rotate: -6 }); } });
    };
    ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom bottom', onUpdate: self => { if (dirty && self.direction < 0 && self.progress < 0.22) reset(); } });
  }

  // click the name: it jumps
  const name = $('.name-jump');
  name.addEventListener('click', () => {
    if (reduce) return;
    gsap.killTweensOf(name);
    gsap.timeline()
      .to(name, { scaleY: 0.82, scaleX: 1.06, duration: 0.1, ease: 'power2.in' })
      .to(name, { y: -0.16 * name.offsetHeight, scaleY: 1.08, scaleX: 0.96, duration: 0.24, ease: 'power2.out' })
      .to(name, { y: 0, scaleY: 0.9, scaleX: 1.04, duration: 0.26, ease: 'power2.in' })
      .to(name, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'elastic.out(1, 0.45)' });
  });

  // play the clip only while the chapter is on screen
  const v = $('.jump-video');
  ScrollTrigger.create({ trigger: '#hero', start: 'top bottom', end: 'bottom top',
    onEnter: () => v.play().catch(() => {}), onEnterBack: () => v.play().catch(() => {}),
    onLeave: () => v.pause(), onLeaveBack: () => v.pause() });
}

/* ───────── load choreography ───────── */
{
  const root = document.documentElement;
  if (root.classList.contains('intro') && scrollY > 10) root.classList.remove('intro'); // reload mid-page: no intro
  if (root.classList.contains('intro')) {
    const alt = { v: 0 };
    const counter = gsap.to(alt, { v: 4000, duration: 1.6, ease: 'power3.out', delay: 0.5,
      onUpdate: () => { altEl.textContent = Math.round(alt.v).toLocaleString('en-US'); } });
    addEventListener('scroll', () => counter.kill(), { once: true, passive: true });

    const copy = ['.hero-copy h1', '.hero-copy .lede', '.hero-copy .scroll-hint', '.hud>div'];
    gsap.timeline({ defaults: { ease: 'power3.out' },
      onComplete: () => { root.classList.remove('intro'); gsap.set(copy, { clearProps: 'all' }); gsap.set('.cloud', { clearProps: 'x,opacity,visibility' }); } })
      .fromTo('.cloud.c1, .cloud.c3', { autoAlpha: 0, x: -80 }, { autoAlpha: 0.92, x: 0, duration: 1.1, stagger: 0.12 }, 0)
      .fromTo('.cloud.c2, .cloud.c4', { autoAlpha: 0, x: 80 }, { autoAlpha: 0.92, x: 0, duration: 1.1, stagger: 0.12 }, 0.05)
      .fromTo('.hero-copy h1', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.25)
      .fromTo('.hero-copy .lede', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.5)
      .fromTo('.hero-copy .scroll-hint', { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.6 }, 0.85)
      .fromTo('.hud>div', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.5);
  }
}

/* ───────── 02 · THE STUDIES ───────── */
{
  const tl = chapter('#study');
  tl.fromTo('.study-tag', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.1)
    .fromTo('.index', { autoAlpha: 0, x: 80, rotate: 4 }, { autoAlpha: 1, x: 0, rotate: -2, duration: 0.6, ease: 'power2.out' }, 0.2)
    .fromTo('.stamp', { autoAlpha: 0, scale: 2.4, rotate: -12 }, { autoAlpha: 1, scale: 1, rotate: -12, duration: 0.3, ease: 'power3.in' }, 0.9)
    .fromTo('.study-line.l1', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.3)
    .to({}, { duration: 0.5 })
    .to('.study-line.l1 .strike', { scaleX: 1, duration: 0.3, stagger: 0.18, ease: 'power2.inOut' }, 2.3)
    .to('.study-line.l1', { color: '#5f6f88', duration: 0.5 }, 2.5)
    .fromTo('.study-line.l2', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 3.1)
    .to({}, { duration: 0.8 });
}

/* ───────── 03 · THE CLUB ───────── */
{
  const tl = chapter('#club');
  // ball crosses the stage with decaying bounces
  tl.fromTo('.ball', { x: '-20vw' }, { x: '120vw', duration: 3.2 }, 0)
    .to('.ball', { rotate: 1440, duration: 3.2 }, 0)
    .to('.ball', { keyframes: [
      { y: '-30vh', duration: 0.45, ease: 'power2.out' }, { y: 0, duration: 0.45, ease: 'power2.in' },
      { y: '-22vh', duration: 0.40, ease: 'power2.out' }, { y: 0, duration: 0.40, ease: 'power2.in' },
      { y: '-15vh', duration: 0.35, ease: 'power2.out' }, { y: 0, duration: 0.35, ease: 'power2.in' },
      { y: '-9vh', duration: 0.30, ease: 'power2.out' }, { y: 0, duration: 0.30, ease: 'power2.in' },
      { y: '-5vh',  duration: 0.20, ease: 'power2.out' }, { y: 0, duration: 0.20, ease: 'power2.in' }
    ] }, 0);

  // three lines, one after another
  const lines = $$('.club-line');
  [[0.15, 0.95], [1.05, 1.85], [1.95, 2.75]].forEach(([a, b], i) => {
    tl.fromTo(lines[i], { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, a)
      .to(lines[i], { y: -30, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, b);
  });

  // the deck is thrown onto the stage, each screen landing in its own spot
  const cards = $$('.card');
  const mobile = () => innerWidth < 820;
  const spot = [
    { x: () => mobile() ? '-8vw' : '-31vw', y: () => mobile() ? '-30vh' : '-21vh', r: -7, from: { x: '-120vw', y: '-40vh' }, o: '0% 0%' },
    { x: () => mobile() ? '10vw' : '27vw',  y: () => mobile() ? '0vh'   : '-16vh', r: 5,  from: { x: '120vw', y: '-60vh' }, o: '100% 0%' },
    { x: () => mobile() ? '-6vw' : '-3vw',  y: () => mobile() ? '30vh'  : '22vh',  r: 3,  from: { x: '-40vw', y: '120vh' }, o: '50% 100%' }
  ];
  cards.forEach((c, i) => {
    const p = spot[i];
    $('.card-inner', c).style.setProperty('--o', p.o);
    tl.fromTo(c, { x: p.from.x, y: p.from.y, autoAlpha: 1 }, { x: p.x, y: p.y, duration: 0.7, ease: 'power3.out' }, 2.9 + i * 0.15)
      .fromTo($('.card-drag', c), { rotation: p.r * 6 }, { rotation: p.r, duration: 0.7, ease: 'power3.out' }, 2.9 + i * 0.15);
  });
  tl.fromTo('.deck-hint', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 3.7)
    .fromTo('.deck-note', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 3.8)   // the asterisk from the last line, explained
    .to({}, { duration: 1.2 }) // hold
    .to(cards, { y: '-120vh', duration: 0.6, stagger: 0.06, ease: 'power2.in' }, 5.0)
    .to('.deck-hint, .deck-note', { autoAlpha: 0, duration: 0.2 }, 5.0);

  // click and hold to move a screen around
  Draggable.create('.card-drag', {
    type: 'x,y',
    onPress() { this.target.classList.add('dragging'); },
    onRelease() { this.target.classList.remove('dragging'); }
  });
}

/* ───────── 04 · THE CRAFT ───────── */
{
  const T_INTRO = 1.6, SCENE = 3.0, N = 5, T_SCENES = SCENE * N;
  const tl = chapter('#craft', {
    onUpdate: self => {
      const t = self.progress * tl.duration();
      let idx = -1;
      if (t >= T_INTRO && t < T_INTRO + T_SCENES) idx = Math.min(N - 1, Math.floor((t - T_INTRO) / SCENE));
      $$('.rail li').forEach((li, i) => li.classList.toggle('on', i === idx));
    }
  });

  // intro: the main line hands over to the subtext, which is promoted to main
  tl.fromTo('.ci-main', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0)
    .fromTo('.ci-sub', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.25)
    .to('.ci-main', { autoAlpha: 0, y: -70, duration: 0.35, ease: 'power2.in' }, 0.7)
    .to('.ci-sub', { scale: 2.2, y: -46, color: '#f2f2f2', duration: 0.45, ease: 'power2.out' }, 0.8)
    .to('.craft-intro', { autoAlpha: 0, y: -50, duration: 0.3, ease: 'power2.in' }, 1.3)
    .fromTo('.rail', { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 1.45);

  const scene = (sel, build) => {
    const s = gsap.timeline({ defaults: { ease: 'none' } });
    s.fromTo(sel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0);
    build(s);
    s.to(sel, { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power2.in' }, SCENE - 0.3);
    return s;
  };
  const at = i => T_INTRO + i * SCENE;

  // the rail is a table of contents: click a line to cut straight to that scene, no scrubbing through the ones between
  const fit = $('#craft-fit');
  $$('.rail li').forEach((li, i) => li.addEventListener('click', () => {
    const sec = $('#craft'), span = sec.offsetHeight - innerHeight;
    const y = sec.offsetTop + span * ((at(i) + 0.35) / tl.duration());
    const jump = () => { scrollTo(0, y); ScrollTrigger.update(); const tw = tl.scrollTrigger.getTween(); tw && tw.progress(1); };
    if (reduce) { jump(); return; }
    gsap.timeline().to(fit, { opacity: 0, duration: 0.14, ease: 'power1.in', onComplete: jump }).to(fit, { opacity: 1, duration: 0.24, ease: 'power1.out' }, '+=0.04');
  }));

  const abs = el => { let x = 0, y = 0, n = el; while (n && !n.classList.contains('scene')) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; };
  const ctr = el => { const a = abs(el); return { x: a.x + el.offsetWidth / 2, y: a.y + el.offsetHeight / 2 }; };

  // A · expenses into ERP : submit, flip mid-air into a flat line that lines up with the ledger on the way, land, turn green
  tl.add(scene('#sc-expense', s => {
    const rc = $('#sc-expense .receipt'), row = $('#sc-expense .erp tr.new'), morph = $('#sc-expense .morph');
    const rowW = row.offsetWidth, rowH = row.offsetHeight, rcW = rc.offsetWidth;
    morph.style.width = rowW + 'px'; morph.style.height = rowH + 'px';
    morph.style.gridTemplateColumns = [...row.cells].map(td => td.offsetWidth + 'px').join(' ');   // columns match the ledger exactly
    const rs = abs(rc), rt = abs(row);
    const LIFT = 44;
    const S = { x: rs.x + rcW / 2, y: rs.y + rc.offsetHeight / 2 - LIFT };   // receipt centre after the lift
    const E = { x: rt.x + rowW / 2, y: rt.y + rowH / 2 };                     // the empty slot in the ledger
    const C = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - 110 };           // arc control point
    const fl = { t: 0 };
    gsap.set(morph, { autoAlpha: 0, scale: rcW / rowW });
    // one continuous flight: receipt rides the first half while flipping, the entry row takes over mid-path
    const ride = () => {
      const t = fl.t, u = 1 - t;
      const x = u * u * S.x + 2 * u * t * C.x + t * t * E.x;
      const y = u * u * S.y + 2 * u * t * C.y + t * t * E.y;
      if (t < 0.5) {
        gsap.set(rc, { autoAlpha: 1, x: x - (rs.x + rcW / 2), y: y - (rs.y + rc.offsetHeight / 2), rotationX: t / 0.5 * 90, transformPerspective: 500 });
        gsap.set(morph, { autoAlpha: 0 });
      } else {
        gsap.set(rc, { autoAlpha: 0 });
        gsap.set(morph, { autoAlpha: 1, x: x - rowW / 2, y: y - rowH / 2 });
      }
    };
    s.fromTo('#sc-expense .phone',   { x: -40 }, { x: 0, duration: 0.4, ease: 'power2.out' }, 0.1)
     .fromTo('#sc-expense .monitor', { x: 40 },  { x: 0, duration: 0.4, ease: 'power2.out' }, 0.1)
     .to('#sc-expense .app-cta', { scale: 0.9, backgroundColor: '#128a9e', duration: 0.13, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.48)
     .to(rc, { y: -LIFT, duration: 0.16, ease: 'power2.out' }, 0.68)
     .to(fl, { t: 1, duration: 0.72, ease: 'power1.inOut', onUpdate: ride }, 0.88)
     // mid-air it grows to the ledger's width, so it arrives already lined up with the other rows
     .to(morph, { scale: 1, duration: 0.3, ease: 'power2.inOut' }, 1.22)
     .to(morph, { backgroundColor: 'rgba(61,220,132,.16)', borderColor: '#3ddc84', duration: 0.12 }, 1.64)
     .to('#sc-expense .morph i', { color: '#3ddc84', duration: 0.12 }, 1.64)
     .set(morph, { autoAlpha: 0 }, 1.78)
     .set(row, { autoAlpha: 1, backgroundColor: 'rgba(61,220,132,.16)' }, 1.78);
  }), at(0));

  // pressing Submit actually plays the scene: it scrolls you through it
  $('#sc-expense .app-cta').addEventListener('click', () => {
    const sec = $('#craft'); const span = sec.offsetHeight - innerHeight;
    gsap.to(window, { scrollTo: sec.offsetTop + span * ((at(0) + 2.0) / tl.duration()), duration: 3.2, ease: 'power1.inOut' });
  });

  // B · SDKs : every operation packs into one archive, the archive multiplies into the languages
  tl.add(scene('#sc-sdk', s => {
    const back = $('#sc-sdk .pkg-back');
    const pa = abs(back), K = 110 / 120;                       // svg render scale
    const sx = pa.x + (back.offsetWidth - 110) / 2;            // svg left in scene coords
    const mouth = { x: sx + 60 * K, y: pa.y + 40 * K };        // centre of the opening
    const inside = { x: mouth.x, y: mouth.y + 20 };            // beyond the interior line
    // flash every operation first
    s.fromTo('#sc-sdk .op', { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1.08, duration: 0.09, stagger: 0.03, ease: 'power2.out' }, 0.1)
     .to('#sc-sdk .op', { scale: 1, duration: 0.08, stagger: 0.03 }, 0.2)
     // the backpack arrives, the lid flips open upwards
     .fromTo('.pkg', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0.42)
     // the lid ROLLS over the rim hinge, a continuous 3d arc that carries it behind the bag
     .to('#sc-sdk .pkg-flap', { rotationX: 180, scaleX: 1.05, transformOrigin: '50% 27px', transformPerspective: 600, duration: 0.3, ease: 'power2.inOut' }, 0.72)
     .set('#sc-sdk .pkg-flap', { zIndex: 0 }, 0.88);
    // items overlap the open bag, shrink, and vanish once past the interior line
    $$('#sc-sdk .op').forEach((op, i) => {
      const c = ctr(op);
      const t0 = 1.02 + i * 0.045;
      s.to(op, { x: mouth.x - c.x, y: mouth.y - c.y, scale: 0.3, duration: 0.3, ease: 'power1.in' }, t0)
       .to(op, { x: inside.x - c.x, y: inside.y - c.y, scale: 0.12, duration: 0.09, ease: 'none' }, t0 + 0.3)
       .to('#sc-sdk .pkg-front svg', { scale: 1.05, duration: 0.04, yoyo: true, repeat: 1 }, t0 + 0.32);
    });
    // the lid closes upwards-down and the tab settles onto the buckle
    s.to('#sc-sdk .pkg-flap', { rotationX: 0, scaleX: 1, transformOrigin: '50% 27px', transformPerspective: 600, duration: 0.26, ease: 'power2.inOut' }, 1.78)
     .set('#sc-sdk .pkg-flap', { zIndex: 2 }, 1.9)
     .to('#sc-sdk .pkg-front svg, #sc-sdk .pkg-flap svg', { scaleY: 0.96, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.96);
    // then the one sdk multiplies into every language
    $$('#sc-sdk .tile').forEach((t, i) => {
      const c = ctr(t);
      s.fromTo(t, { x: mouth.x - c.x, y: mouth.y + 30 - c.y, scale: 0.18, autoAlpha: 0 }, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.32, ease: 'back.out(1.3)' }, 2.12 + i * 0.06);
    });
  }), at(1));

  // C · pipelines : flow reaches the valve, retreats, the french key turns it with the screw, then through
  tl.add(scene('#sc-pipe', s => {
    const flow = $('.pipe-flow'); const L = flow.getTotalLength();
    gsap.set(flow, { strokeDasharray: L, strokeDashoffset: L });
    const valve = $('.n-build .valve'), wr = $('.wrench');
    gsap.set(wr, { autoAlpha: 0 });
    const WR0 = -35, spin = { a: 0 };
    const apply = () => { valve.setAttribute('transform', `rotate(${spin.a})`); wr.setAttribute('transform', `translate(420 300) rotate(${WR0 + spin.a})`); };
    apply();
    const OFF = f => L * (1 - f);
    const light = (n, t) => { s.to(`${n} > circle`, { stroke: '#3ddc84', fill: '#0f2a1f', duration: 0.05 }, t); s.to(`${n} text`, { fill: '#fff', duration: 0.05 }, t); };
    // first pass: water reaches the build valve, needle climbs from rest
    s.to(flow, { strokeDashoffset: OFF(0.538), duration: 0.45 }, 0.3)
     .to('.gauge .needle', { rotation: 70, transformOrigin: 'right bottom', duration: 0.45 }, 0.3);
    light('.n-commit', 0.52);
    // jam: the valve goes red, water retreats all the way back to the previous node
    s.to('.n-build > circle', { stroke: '#d81e2b', fill: '#2a0f12', duration: 0.06 }, 0.78)
     .to('.n-build .valve circle', { fill: '#d81e2b', duration: 0.06 }, 0.78)
     .to('.gauge .needle', { rotation: 40, transformOrigin: 'right bottom', duration: 0.1 }, 0.82)
     .to(flow, { strokeDashoffset: OFF(0.262), duration: 0.3, ease: 'power1.inOut' }, 0.9)
     .to('.gauge .needle', { rotation: 10, transformOrigin: 'right bottom', duration: 0.3 }, 0.9)
    // the french key grips the screw and both turn together
     .to(wr, { autoAlpha: 1, duration: 0.06 }, 1.24)
     .to(spin, { a: 300, duration: 0.5, ease: 'power1.inOut', onUpdate: apply }, 1.32)
     .to(wr, { autoAlpha: 0, duration: 0.06 }, 1.84)
     .to('.n-build .valve circle', { fill: '#3a4360', duration: 0.06 }, 1.86)
     .to('.n-build > circle', { stroke: '#000', fill: '#181818', duration: 0.06 }, 1.86)
    // fixed: second pass goes all the way, the needle sweeps up to the last tick and stops there
     .to(flow, { strokeDashoffset: 0, duration: 0.42, ease: 'power1.in' }, 1.92)
     .to('.gauge .needle', { rotation: 175, transformOrigin: 'right bottom', duration: 0.42, ease: 'power1.out' }, 1.92);
    light('.n-build', 1.98); light('.n-test', 2.18); light('.n-deploy', 2.3);
  }), at(2));

  // D · infrastructure : racks go green, latency curve draws downward
  tl.add(scene('#sc-infra', s => {
    const line = $('.lat-line'); const L = line.getTotalLength();
    gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set('.lat-area', { clipPath: 'inset(0 100% 0 0)' });
    s.fromTo('#sc-infra .rack', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, 0.1)
     .fromTo('#sc-infra .chart', { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0.3)
     .to('#sc-infra .unit i', { backgroundColor: '#3ddc84', boxShadow: '0 0 8px #3ddc84', duration: 0.05, stagger: { each: 0.04, from: 'start', grid: 'auto' } }, 0.6)
     .to(line, { strokeDashoffset: 0, duration: 1.2 }, 0.7)
     .to('.lat-area', { clipPath: 'inset(0 0% 0 0)', duration: 1.2 }, 0.7);
  }), at(3));

  // E · API explorer : type, send, 200 OK, response streams in
  tl.add(scene('#sc-api', s => {
    s.fromTo('#sc-api .explorer', { scale: 0.96 }, { scale: 1, duration: 0.4, ease: 'power2.out' }, 0)
     .to('#sc-api .typed', { width: '100%', duration: 0.6, ease: 'steps(32)' }, 0.3)
     .to('#sc-api .ex-send', { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1 }, 1.0)
     .fromTo('#sc-api .ex-status', { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 1.2)
     .fromTo('#sc-api .ex-res span', { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.12, stagger: 0.08 }, 1.25)
     .fromTo('#sc-api .ex-chips span', { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.08 }, 1.95);
  }), at(4));

  // room to hold the last scene while the automatic rewind plays
  tl.to({}, { duration: 3 });

  // the unwinding back to the start plays on its own once you reach it
  const outroTl = gsap.timeline({ paused: true });
  outroTl.to('.rail', { autoAlpha: 0, x: -10, duration: 0.2 }, 0);
  ['#sc-infra', '#sc-pipe', '#sc-sdk', '#sc-expense'].forEach((sel, i) => {
    outroTl.fromTo(sel, { autoAlpha: 0, y: -30, scale: 0.985 }, { autoAlpha: 0.55, y: 0, scale: 1, duration: 0.14, ease: 'none' }, 0.1 + i * 0.3)
           .to(sel, { autoAlpha: 0, y: 30, duration: 0.14, ease: 'none' }, 0.24 + i * 0.3);
  });
  outroTl.to('.craft-intro', { autoAlpha: 1, y: 0, duration: 0.3 }, 1.4)
    .to('.ci-main', { autoAlpha: 1, y: 0, duration: 0.3 }, 1.4)
    .set('.ci-sub', { autoAlpha: 0 }, 1.4)
    .to('.ci-main .strike', { scaleX: 1, duration: 0.35, stagger: 0.25, ease: 'power2.inOut' }, 1.95)
    .to('.ci-main, .ci-main .wide', { color: '#4a5568', duration: 0.4 }, 2.2)
    .fromTo('.co-l2', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 2.8)
    .fromTo('.co-l3', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 3.2);
  ScrollTrigger.create({
    start: () => { const sec = $('#craft'); return sec.offsetTop + (sec.offsetHeight - innerHeight) * ((at(N) + 0.2) / tl.duration()); },
    end: () => { const sec = $('#craft'); return sec.offsetTop + sec.offsetHeight - innerHeight; },
    onEnter: () => { gsap.killTweensOf(outroTl); outroTl.play(); },
    onLeaveBack: () => { gsap.killTweensOf(outroTl); gsap.to(outroTl, { progress: 0, duration: 0.35, ease: 'power1.out', onComplete: () => outroTl.pause(0) }); }
  });
  if (reduce) outroTl.progress(1);
}

/* ───────── 05 · INSPIRATION: the game, then space, then the sea ───────── */
{
  const SPACE_AT = 5.4, SEA_AT = 8.2, JUMP_AT = SEA_AT + 3.4, EXIT_AT = JUMP_AT + 2.7;

  // starfield: three parallax layers drawn with box-shadows, sized in vw/vh so they scale
  const rnd = (a, b) => a + Math.random() * (b - a);
  $$('.stars').forEach((layer, li) => {
    const n = [300, 130, 50][li], size = li + 1;
    const dots = Array.from({ length: n }, () => `${rnd(0, 100).toFixed(1)}vw ${rnd(0, 140).toFixed(1)}vh 0 0 #fff`);
    const i = layer.firstElementChild;
    i.style.width = i.style.height = size + 'px';
    i.style.boxShadow = dots.join(',');
  });

  // a moon on a slow orbit; it is drawn under the planet, so it hides behind the disk on the far side
  const moon = $('.moon');
  if (!reduce) {
    let t = 0;
    gsap.ticker.add((_, dt) => {
      t += dt * 0.0006;
      moon.setAttribute('transform', `translate(${(200 + 180 * Math.sin(t)).toFixed(1)} ${(252 + 58 * Math.cos(t)).toFixed(1)})`);
    });
  }

  // HUD colour follows the backdrop, not the chapter
  const tl = chapter('#quests', {
    onUpdate: self => {
      const t = self.progress * tl.duration();
      document.body.dataset.hud = t < SPACE_AT + 0.08 ? 'dark' : t < SPACE_AT + 0.62 ? 'sea' : t < SEA_AT + 0.6 ? 'light' : t < JUMP_AT + 1.6 ? 'sea' : 'light';
      // the page ends here: once the set has cleared, touchdown plays on its own clock
      const end = self.progress > 0.985;
      chNum.textContent = end ? '06' : '05'; chName.textContent = end ? 'touchdown' : 'inspiration';
      if (end) touchdown(); else if (self.direction < 0 && self.progress < 0.95) resetTouchdown();
    }
  });

  // beat 1 · the game
  tl.fromTo('.q-copy', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0)
    .to('.q-copy', { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, 1.0)
    .fromTo('#quest-fit', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.2)
    .fromTo('.match', { autoAlpha: 0, rotateX: -60, transformOrigin: '50% 0' }, { autoAlpha: 1, rotateX: 0, duration: 0.35, stagger: 0.18, ease: 'power2.out' }, 1.5)
    .fromTo('.match .pick', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.18 }, 1.85)
    .fromTo('.board li', { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.12, ease: 'power2.out' }, 1.6);

  // points count up
  $$('.board .pts').forEach(el => {
    const o = { v: 0 }, to = +el.dataset.to;
    tl.to(o, { v: to, duration: 1.0, onUpdate: () => { el.textContent = Math.round(o.v); } }, 2.1);
  });
  // leaderboard reorders: Aleksa (47) climbs to #1
  const rows = $$('.board li');
  const finalOrder = [...rows].sort((a, b) => +$('.pts', b).dataset.to - +$('.pts', a).dataset.to);
  const rowH = () => rows[0].getBoundingClientRect().height / scaleOf('#quest-fit') + 8;
  rows.forEach(r => tl.to(r, { y: () => (finalOrder.indexOf(r) - rows.indexOf(r)) * rowH(), duration: 0.6, ease: 'power2.inOut' }, 3.0));
  const ord = { v: 0 };
  tl.to(ord, { v: 1, duration: 0.02, onUpdate: () => finalOrder.forEach((r, i) => { $('.pos', r).textContent = ord.v > 0.5 ? i + 1 : rows.indexOf(r) + 1; }) }, 3.3);

  // the game steps back, the lesson lands
  tl.to('.lgc', { scale: 0.84, y: -70, duration: 0.5, ease: 'power2.inOut' }, 3.8)
    .fromTo('.sp-1', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 3.95)
    .to('.sp-1', { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 4.7)
    .fromTo('.sp-2', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 4.95);

  // beat 2 · space rises over the paper, spacegora arrives
  tl.fromTo('.bd-space', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut' }, SPACE_AT)
    .to(['#quest-fit', '.sp-2'], { autoAlpha: 0, duration: 0.3 }, SPACE_AT + 0.3)
    .fromTo('.stars.s1', { y: 0 }, { y: '-12vh', duration: SEA_AT + 0.8 - SPACE_AT }, SPACE_AT)
    .fromTo('.stars.s2', { y: 0 }, { y: '-22vh', duration: SEA_AT + 0.8 - SPACE_AT }, SPACE_AT)
    .fromTo('.stars.s3', { y: 0 }, { y: '-34vh', duration: SEA_AT + 0.8 - SPACE_AT }, SPACE_AT)
    .fromTo('.planet', { y: '48vh', rotate: -8 }, { y: 0, rotate: 0, duration: 1.0, ease: 'power2.out' }, SPACE_AT + 0.4)
    .fromTo('.qs-kicker', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 6.2)
    .fromTo('.qs-name', { clipPath: 'inset(-40% 100% -40% 0%)' }, { clipPath: 'inset(-40% -30% -40% 0%)', duration: 0.6, ease: 'power2.inOut' }, 6.4)   // ends past the box so the tilted tag is not sliced
    .fromTo('.qs-tag', { autoAlpha: 0, scale: 2.2, rotate: 8 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.25, ease: 'power3.in' }, 7.0)
    .fromTo('.qs-sub', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 7.15)
    // a small comet crosses the top of the sky, head first, tail trailing behind
    .fromTo('.comet', { x: '-10vw', y: '6vh', rotation: 8 }, { x: '70vw', y: '24vh', duration: 0.5, ease: 'power1.in' }, 7.3)
    .fromTo('.comet', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 7.3)
    .to('.comet', { autoAlpha: 0, duration: 0.1 }, 7.8);

  // beat 3 · the sea floods in, daylight comes with it
  tl.set('.bd-sea', { autoAlpha: 1 }, SEA_AT)
    .fromTo('.bd-sea', { y: '140%' }, { y: '0%', duration: 0.8, ease: 'power2.inOut' }, SEA_AT)
    .fromTo('.bd-day', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, SEA_AT)
    .to('.q-space', { autoAlpha: 0, y: -60, duration: 0.4, ease: 'power2.in' }, SEA_AT + 0.1)
    .to('.planet', { y: '-30vh', autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, SEA_AT)
    .fromTo('.surfer', { x: '-40vw' }, { x: '0vw', duration: 0.8, ease: 'power2.out' }, SEA_AT + 0.4)
    .fromTo('.kayak', { x: '50vw' }, { x: '0vw', duration: 0.9, ease: 'power2.out' }, SEA_AT + 0.5)
    .fromTo('.sailor', { x: '40vw' }, { x: '0vw', duration: 0.9, ease: 'power2.out' }, SEA_AT + 0.6)
    .fromTo('.qw-kicker', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, SEA_AT + 0.9)
    .fromTo('.qw-name', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.inOut' }, SEA_AT + 1.1)
    .fromTo('.qw-sub', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, SEA_AT + 1.7)
    // everyone keeps moving while you scroll
    .to('.surfer', { x: '2vw', duration: 4.0 }, SEA_AT + 1.6)
    .to('.kayak', { x: '8vw', duration: 4.0 }, SEA_AT + 1.6)
    .to('.sailor', { x: '3vw', duration: 4.0 }, SEA_AT + 1.6);

  // beat 4 · the jump: the water copy leaves, the sun sets, the sky turns to dusk, two lines land on the water
  tl.to('.q-sea', { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, JUMP_AT)
    // the sun sets behind the water and lands where chapter 06 keeps its sun (right 6vw, bottom 8vh, min(30vw, 360px))
    .to('.day-sun', {
      width: () => Math.min(innerWidth * 0.3, 360), height: () => Math.min(innerWidth * 0.3, 360),
      x: () => innerWidth * 0.94 - Math.min(innerWidth * 0.3, 360) - $('.day-sun').offsetLeft,
      y: () => innerHeight * 0.92 - Math.min(innerWidth * 0.3, 360) - $('.day-sun').offsetTop,
      duration: 2.6, ease: 'power1.in'
    }, JUMP_AT)
    .to('.bd-day', { backgroundColor: '#16213a', duration: 2.6 }, JUMP_AT)
    .to('.sea-obj', { color: '#fff', duration: 2.6 }, JUMP_AT)              // the figures turn white with the dusk
    .fromTo('.qj-1', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, JUMP_AT + 0.35)
    .to('.qj-1', { autoAlpha: 0, y: -30, duration: 0.3, ease: 'power2.in' }, JUMP_AT + 1.5)
    .fromTo('.qj-2', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, JUMP_AT + 1.75)
    // every water layer leaves sideways, then the figures fall; touchdown plays on the same dusk
    .to('.wave.w1', { left: '-200%', duration: 0.6, ease: 'power2.in' }, EXIT_AT)
    .to('.wave.w2', { left: '200%', duration: 0.6, ease: 'power2.in' }, EXIT_AT + 0.05)
    .to('.wave.w3', { left: '-200%', duration: 0.6, ease: 'power2.in' }, EXIT_AT + 0.1)
    .to('.sea-body', { x: '100%', duration: 0.6, ease: 'power2.in' }, EXIT_AT + 0.5)
    .to(['.surfer', '.kayak', '.sailor'], { y: '110vh', duration: 0.6, ease: 'power2.in', stagger: 0.08 }, EXIT_AT + 1.2)
    .to('.q-jump', { y: '-14vh', duration: 0.7, ease: 'power2.inOut' }, EXIT_AT + 1.2)
    .to({}, { duration: 0.8 });

  // lanes: each figure drags sideways; a flick keeps it gliding and it wraps around the screen
  $$('.sea-obj').forEach(obj => {
    const el = $('.drag', obj);
    let vel = 0, lastX = 0, lastT = 0, glide = null;
    const wrap = () => {
      const r = el.getBoundingClientRect();
      if (r.left > innerWidth) gsap.set(el, { x: '-=' + (innerWidth + r.width) });
      else if (r.right < 0) gsap.set(el, { x: '+=' + (innerWidth + r.width) });
    };
    const stop = () => { if (glide) { gsap.ticker.remove(glide); glide = null; } };
    Draggable.create(el, {
      type: 'x', zIndexBoost: false, cursor: 'grab', activeCursor: 'grabbing',
      onPress() { stop(); vel = 0; lastX = this.x; lastT = performance.now(); },
      onDrag() { const now = performance.now(), dt = now - lastT; if (dt > 0) { vel = (this.x - lastX) / dt; lastX = this.x; lastT = now; } },
      onRelease() {
        wrap(); this.update();
        if (Math.abs(vel) < 0.25) return;                    // a slow drop stays put
        let v = gsap.utils.clamp(-0.8, 0.8, vel) * 1000;    // px per second, capped
        glide = (_, dt) => {
          gsap.set(el, { x: '+=' + (v * dt / 1000) }); wrap();
          v *= Math.exp(-dt / 700);                           // friction: a flick carries a few hundred px, then rests
          if (Math.abs(v) < 6) stop();
        };
        gsap.ticker.add(glide);
      }
    });
  });

  // touchdown: the typewriter unwrites the line on screen, then writes to HeyClicky; the parachutist comes in from the top left
  const INTRO = { t: 'I want to be part of something that motivates people to make the jump.', hi: 56 };
  const LINES = [
    { t: 'I am impressed at what you achieved.' },
    { t: 'I am impressed at your aim of bringing people\'s dreams to reality.' },
    { t: 'I am chasing a dream of my own.' },
    { t: 'I think HeyClicky is the perfect environment to bring my dreams to reality.' },
    { t: 'Let\'s talk.', hi: 0 }
  ];
  const box = $('.q-jump'), out = $('.type-text');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const render = (line, n) => {
    const s = line.t.slice(0, n);
    out.innerHTML = line.hi >= 0 && n > line.hi ? esc(s.slice(0, line.hi)) + '<span class="wide">' + esc(s.slice(line.hi)) + '</span>' : esc(s);
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // delete back only to the words the next sentence shares, then type the rest
  const sharedWords = (a, b) => {
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const cut = a.slice(0, i); if (i === a.length || i === b.length) return cut;
    return cut.slice(0, cut.lastIndexOf(' ') + 1);
  };
  const showContact = () => gsap.fromTo(['.q-jump .cta', '.q-jump .ps'], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.4 });
  const ch = $('.chute');
  const dropChute = () => {
    // land centred on the sun, feet just above the bottom edge
    const landX = () => { const sun = Math.min(innerWidth * 0.3, 360); return innerWidth * 0.94 - sun / 2 - ch.getBoundingClientRect().width / 2; };
    const landY = () => innerHeight * 0.9 - ch.getBoundingClientRect().height;
    if (reduce) { gsap.set(ch, { autoAlpha: 1, x: landX, y: landY, color: '#16213a' }); return; }
    gsap.set(ch, { autoAlpha: 1, x: '-14vw', y: '-30vh', rotate: -4, transformOrigin: '50% 20%' });
    gsap.to(ch, { x: landX, y: landY, duration: 14, ease: 'none', onComplete: () => {
      gsap.killTweensOf(ch, 'rotate');
      gsap.to(ch, { rotate: 0, scaleY: 0.94, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    } });
    gsap.to(ch, { rotate: 4, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });   // pendulum under the canopy
    gsap.to(ch, { color: '#16213a', duration: 2, delay: 11.4 });                           // a silhouette once it crosses the sun
  };
  let started = false, run = 0;   // run: a token so a cancelled typewriter loop stops writing
  document.addEventListener('at-bottom', () => touchdown());
  // scrolled back up from the end: undo it all so it can play again
  function resetTouchdown() {
    if (!started) return; started = false; run++;
    box.classList.remove('typing');
    gsap.killTweensOf(['.q-jump .cta', '.q-jump .ps', ch]);
    gsap.to(['.q-jump .cta', '.q-jump .ps'], { autoAlpha: 0, y: 12, duration: 0.45, ease: 'power2.inOut' });
    gsap.to(ch, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', onComplete: () => gsap.set(ch, { clearProps: 'all' }) });
    render(INTRO, INTRO.t.length);
  }
  async function touchdown() {
    if (started) return; started = true;
    const my = ++run, live = () => my === run;
    box.classList.add('typing'); dropChute();
    const last = LINES[LINES.length - 1];
    if (reduce) { render(last, last.t.length); showContact(); return; }
    await wait(900); if (!live()) return;
    let prev = INTRO;
    for (const line of LINES) {
      const keep = sharedWords(prev.t, line.t);
      for (let c = prev.t.length - 1; c >= keep.length; c--) { render(prev, c); await wait(18); if (!live()) return; }
      await wait(keep ? 600 : 350); if (!live()) return;
      for (let c = keep.length + 1; c <= line.t.length; c++) { render(line, c); await wait(line.t[c - 1] === ' ' ? 70 : 42); if (!live()) return; }
      if (line !== last) { await wait(1400); if (!live()) return; }
      prev = line;
    }
    showContact();
  }
}

/* ───────── helpers / lifecycle ───────── */
function scaleOf(sel) { return parseFloat(getComputedStyle($(sel)).getPropertyValue('--s')) || 1; }

addEventListener('resize', () => { fitStages(); ScrollTrigger.refresh(); });
addEventListener('load', () => { ScrollTrigger.refresh(); if (innerHeight + scrollY >= document.body.scrollHeight - 2) $$('.chapter').length && document.dispatchEvent(new Event('at-bottom')); });

if (reduce) {
  // no scrubbing: jump each timeline to its end state and unpin
  ScrollTrigger.getAll().forEach(t => { t.animation && t.animation.progress(1); });
}
