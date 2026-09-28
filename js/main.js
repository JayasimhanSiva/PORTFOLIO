/* Siva Jayasimhan G — portfolio engine */
gsap.registerPlugin(ScrollTrigger, Draggable);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (document.querySelector('.hero')) window.scrollTo(0, 0);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isTouch = matchMedia('(hover:none)').matches;

/* ---------- display glyphs: N → И (reference style); M stays a normal M ---------- */
function glyphify(el) {
  const txt = el.dataset.text || el.textContent;
  el.setAttribute('aria-label', txt);
  el.innerHTML = [...txt].map(c => {
    const u = c.toUpperCase();
    if (u === 'N') return '<span class="ch gx" aria-hidden="true"><span class="g-n">N</span></span>';
    if (c === ' ') return '<span class="ch" aria-hidden="true">&nbsp;</span>';
    return `<span class="ch" aria-hidden="true">${c}</span>`;
  }).join('');
}
$$('[data-glyph]').forEach(glyphify);

/* ---------- fit giant titles edge-to-edge (like the reference) ---------- */
/* measure → size → verify (a second pass corrects any rounding / late glyph metrics) */
const fitOne = el => {
  const box = el.parentElement, cs = getComputedStyle(box), es = getComputedStyle(el);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(es.paddingLeft) - parseFloat(es.paddingRight);
  const k = +el.dataset.fit || 1, rg = document.createRange(); rg.selectNodeContents(el);
  el.style.fontSize = '100px';
  for (let i = 0; i < 3; i++) {
    const w = rg.getBoundingClientRect().width, cur = parseFloat(el.style.fontSize);
    const next = cur * (avail * k) / Math.max(1, w);
    if (Math.abs(next - cur) < .25) break;
    el.style.fontSize = next + 'px';
  }
};
function fitAll() { $$('[data-fit]').forEach(fitOne); }
fitAll();
const refit = () => { fitAll(); ScrollTrigger.refresh(); };
/* the display font may arrive after first paint: wait for it explicitly */
if (document.fonts) {
  document.fonts.load('700 100px Archivo').then(refit).catch(() => {});
  document.fonts.ready.then(refit);
  document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', refit);
}
addEventListener('load', refit);
addEventListener('resize', fitAll);
if ('ResizeObserver' in window) new ResizeObserver(() => fitAll()).observe(document.documentElement);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!document.body.classList.contains('no-lenis')) {
  lenis = new Lenis({ lerp: .11, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToTop = () => lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: 'smooth' });
$$('[data-top]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToTop(); }));

/* ---------- cursor: GPU-only transform, tight follow ---------- */
const cursor = $('.cursor');
if (cursor && !isTouch) {
  const pill = $('.cursor__pill', cursor);
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  let running = false, last = 0;
  const step = now => {
    const dt = Math.min(50, now - (last || now)); last = now;
    const k = 1 - Math.pow(1 - .38, dt / 16.67);          /* frame-rate independent follow */
    cx += (mx - cx) * k; cy += (my - cy) * k;
    cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    if (Math.abs(mx - cx) + Math.abs(my - cy) > .1) requestAnimationFrame(step); else { running = false; last = 0; }
  };
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!running) { running = true; requestAnimationFrame(step); } }, { passive: true });
  cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hide'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('is-hide'));
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) { pill.textContent = t.dataset.cursor; cursor.classList.add('is-pill'); }
    else cursor.classList.remove('is-pill');
  });
}

/* ---------- link hint (bottom-left url like the reference) ---------- */
const hint = $('.card__link-hint');
if (hint) $$('a[data-hint]').forEach(a => {
  a.addEventListener('mouseenter', () => { hint.textContent = a.dataset.hint; hint.style.opacity = 1; });
  a.addEventListener('mouseleave', () => hint.style.opacity = 0);
});

/* ---------- nav: clock + scrolled state ---------- */
function tick() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  const p = n => String(n).padStart(2, '0');
  $$('[data-day]').forEach(e => e.textContent = day);
  $$('[data-hh]').forEach(e => e.textContent = p(d.getHours()));
  $$('[data-mm]').forEach(e => e.textContent = p(d.getMinutes()));
}
tick(); setInterval(tick, 10000);
const nav = $('.nav');
/* clock is pinned to the right edge; links reserve exactly its width so nothing can overflow */
const setTimeW = () => { const t = $('.nav__time'); if (nav && t) nav.style.setProperty('--timew', t.offsetWidth + 'px'); };
setTimeW(); document.fonts && document.fonts.ready.then(setTimeW); addEventListener('resize', setTimeW);
if (nav) {
  const always = nav.hasAttribute('data-always');
  const set = () => { if (!nav.classList.contains('is-morph')) nav.classList.toggle('is-scrolled', always || scrollY > innerHeight * .55); };
  set(); addEventListener('scroll', set, { passive: true });
}
const mbtn = $('.nav__menu-btn'), mnav = $('.mnav');
if (mbtn && mnav) mbtn.addEventListener('click', () => { mnav.classList.toggle('open'); mbtn.querySelector('span').textContent = mnav.classList.contains('open') ? 'CLOSE' : 'MENU'; });

/* ---------- WebGL gradient (self-running, NOT cursor-reactive) ----------
   Colour ramp sampled from the reference hero: black → #450c00 → #96300c →
   #dc4a15 → #ea752d → #f1923e. Hero animates slowly; glow bands/footer are static. */
const SHADER_PARAMS = [.1661, -.0707, .6064, 3.5861, .0253, .0453]; /* speed, base, width, wave, wave2, pocket — fitted to the reference */
function shader(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.style.background = 'linear-gradient(180deg,#000 35%,#450c00 50%,#dc4a15 72%,#f1923e)'; return; }
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision highp float;uniform vec2 r;uniform float t;uniform float inv;uniform float stat;uniform vec4 P;uniform vec2 Q;
  float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<3;i++){v+=a*n(p);p=p*1.9+vec2(3.1,1.7);a*=.45;}return v;}
  vec3 ramp(float k){ /* k: 0 = peach (hot) ... 1 = black */
    vec3 c0=vec3(241.,146.,62.)/255., c1=vec3(234.,117.,45.)/255., c2=vec3(220.,74.,21.)/255.,
         c3=vec3(150.,48.,12.)/255., c4=vec3(69.,12.,0.)/255., c5=vec3(0.);
    vec3 c=mix(c0,c1,smoothstep(0.,.22,k)); c=mix(c,c2,smoothstep(.18,.42,k));
    c=mix(c,c3,smoothstep(.40,.60,k)); c=mix(c,c4,smoothstep(.58,.76,k)); return mix(c,c5,smoothstep(.74,.95,k)); }
  void main(){
    vec2 uv=gl_FragCoord.xy/r; float y=uv.y; if(inv>.5) y=1.-y;
    float ax=uv.x*r.x/r.y;
    float tt=t*P.x;
    /* large slow undulating boundary + drifting dark pockets */
    float wave=fbm(vec2(ax*.55+tt,tt*.6))-.5;
    float wave2=fbm(vec2(ax*1.2-tt*.8,3.+tt*.4))-.5;
    float pocket=fbm(vec2(ax*.9+tt*.5,y*1.6-tt*.3));
    float k=(y-P.y)/P.z + wave*P.w + wave2*Q.x + (pocket-.5)*Q.y;
    k=clamp(k,0.,1.);
    vec3 col=ramp(k);
    col+=(h1(gl_FragCoord.xy+fract(t))-.5)*.012;   /* subtle film grain */
    gl_FragColor=vec4(col,1.);}`;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = k => gl.getUniformLocation(pr, k);
  const uR = U('r'), uT = U('t'), uP = U('P'), uQ = U('Q');
  const PR = opts.params || SHADER_PARAMS;
  gl.uniform4f(uP, PR[0], PR[1], PR[2], PR[3]); gl.uniform2f(uQ, PR[4], PR[5]);
  canvas.__render = (pr, time) => { gl.uniform4f(uP, pr[0], pr[1], pr[2], pr[3]); gl.uniform2f(uQ, pr[4], pr[5]); draw(time); const px = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  gl.uniform1f(U('inv'), opts.invert ? 1 : 0);
  const dpr = Math.min(.5, 900 / Math.max(1, canvas.clientWidth)); /* low-res render = the soft, blurred look of the reference */
  const t0 = performance.now(), seed = opts.seed || 7.3;
  const draw = time => { gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, time); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const resize = () => { canvas.width = Math.max(2, canvas.clientWidth * dpr); canvas.height = Math.max(2, canvas.clientHeight * dpr); gl.viewport(0, 0, canvas.width, canvas.height); if (opts.static) draw(seed); };
  resize(); addEventListener('resize', resize);
  /* hero flows at full speed; glow bands + footer drift gently (≈50% speed, 30fps) */
  const rate = opts.static ? .5 : 1, minDt = opts.static ? 33 : 0;
  let visible = true, lastDraw = 0;
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  (function loop(now) { requestAnimationFrame(loop);
    if (!visible || now - lastDraw < minDt) return; lastDraw = now;
    draw(seed + rate * (performance.now() - t0) / 1000); })(0);
}
$$('canvas.shader').forEach((c, i) => {
  const foot = !!c.closest('.footer');
  shader(c, { invert: c.hasAttribute('data-invert'), static: !c.closest('.hero'),
    /* footer: static frame fitted to the reference footer glow (mean error ≈7/255) */
    params: foot ? [.1909, .1578, .485, 1.9566, .2716, .386] : undefined,
    seed: foot ? 99.152 : 7.3 + i * 11.7 });
});

/* ---------- split text into chars (scroll-scrubbed reveal) ---------- */
function splitChars(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(word => {
          if (!word) return;
          if (/^\s+$/.test(word)) { frag.append(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.style.display = 'inline-block'; w.style.whiteSpace = 'nowrap';
          [...word].forEach(ch => { const s = document.createElement('span'); s.className = 'c'; s.textContent = ch; w.append(s); });
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  return $$('.c', el);
}
$$('.split').forEach(el => {
  const chars = splitChars(el);
  gsap.to(chars, { opacity: 1, stagger: .02, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: true } });
});

/* ---------- reveals: CSS transitions toggled by IntersectionObserver ----------
   (independent of the rAF ticker, so content always appears even in throttled tabs) */
$$('.stitle__word, [data-rise]').forEach(el => { el.classList.add('rise'); $$('.ch', el).forEach((c, i) => c.style.setProperty('--i', i)); });
$$('.can__list, .lwt__words').forEach(el => { el.classList.add('rise-list'); $$('.in, .w > span', el).forEach((c, i) => c.style.setProperty('--i', i)); });
$$('.stitle__subs').forEach(el => { el.classList.add('fade-list'); [...el.children].forEach((c, i) => c.style.setProperty('--i', i)); });
$$('.rv').forEach(el => el.style.setProperty('--d', (+(el.dataset.d || 0)) + 's'));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.rise, .rise-list, .fade-list, .rv').forEach(el => io.observe(el));


/* ---------- collage: photos surface from the dark, grid slowly zooms with scroll ---------- */
$$('.collage .ph').forEach((ph, i) => { ph.style.setProperty('--i', i); io.observe(ph); });
const cgrid = $('.collage__grid');
if (cgrid && innerWidth >= 810) gsap.fromTo(cgrid, { scale: .95 }, { scale: 1.03, ease: 'none', transformOrigin: '50% 50%',
  scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true } });

/* ---------- mono scramble on appear ---------- */
const GLY = '!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function scramble(el) {
  const final = el.dataset.final || el.textContent; el.dataset.final = final;
  let f = 0; const total = 18;
  const id = setInterval(() => {
    el.textContent = [...final].map((c, i) => c === ' ' ? ' ' : (i < (f / total) * final.length ? c : GLY[Math.random() * GLY.length | 0])).join('');
    if (++f > total) { clearInterval(id); el.textContent = final; }
  }, 35);
}
$$('[data-scramble]').forEach(el => {
  ScrollTrigger.create({ trigger: el, start: 'top 92%', onEnter: () => scramble(el) });
  if (el.hasAttribute('data-scramble-hover')) (el.closest('a') || el).addEventListener('mouseenter', () => scramble(el));
});

/* ---------- parallax ---------- */
$$('[data-speed]').forEach(el => (innerWidth < 810 && (el.closest('.lwt') || el.closest('.collage'))) || gsap.to(el, { y: () => -(+el.dataset.speed) * 300, ease: 'none', scrollTrigger: { trigger: el.closest('.lwt') ? $('.lwt__img') : el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }));

/* ---------- project deck: drag the top card away → it goes to the back, next shows (loops) ----------
   Behaviour modelled on the reference "Recommender" stack: cards behind peek out fanned;
   a short drag springs back, a long drag throws the card and it re-joins at the back. */
$$('.deckstack').forEach(stack => {
  let cards = $$('.deck', stack);                       /* cards[0] is the front card */
  const u = () => Math.min(innerWidth, 1e4) / 1440;
  const pose = i => ({ x: i * 4 * Math.max(u(), .6), y: -i * 5 * Math.max(u(), .6), rotation: -i * 1.3, scale: 1 - i * .012 });
  const size = () => { stack.style.height = Math.max(...cards.map(c => c.offsetHeight)) + 'px'; stack.style.width = Math.max(...cards.map(c => c.offsetWidth)) + 'px'; };
  const layout = (animate) => cards.forEach((c, i) => {
    c.style.zIndex = 10 - i;
    c.classList.toggle('is-front', i === 0);
    c.classList.toggle('is-next', i === 1);
    gsap[animate ? 'to' : 'set'](c, { ...pose(i), duration: animate ? .7 : 0, ease: 'power3.out', overwrite: 'auto' });
  });
  size(); layout(false);
  addEventListener('resize', () => { size(); layout(false); });
  let busy = false;
  const makeDrag = () => Draggable.create(cards[0], {
    type: 'x,y', zIndexBoost: false,
    onPress() {
      if (busy) return this.endDrag();
      gsap.to(this.target, { scale: 1.02, duration: .3, ease: 'power3.out' });
      stack.classList.add('dragging');                    /* the card underneath shows its content */
      gsap.to(cards[1], { ...pose(0), duration: .45, ease: 'power3.out', overwrite: 'auto' });
    },
    onDrag() { gsap.set(this.target, { rotation: gsap.utils.clamp(-10, 10, this.x / 30) }); },
    onRelease() {
      const card = this.target, dist = Math.hypot(this.x, this.y), thresh = Math.min(160, stack.offsetWidth * .22);
      if (dist < thresh) {                              /* not far enough: spring back */
        gsap.to(card, { ...pose(0), duration: 1.1, ease: 'elastic.out(1,0.55)' });
        stack.classList.remove('dragging'); gsap.to(cards[1], { ...pose(1), duration: .6, ease: 'power3.out', overwrite: 'auto' });
        return;
      }
      if (busy) return;                                  /* one release = one card, never twice */
      busy = true;
      const dir = this.x >= 0 ? 1 : -1, back = cards.length - 1, x = this.x, y = this.y;
      this.kill();
      card.classList.add('is-flying');                   /* keeps its text while it flies out + back */
      cards.push(cards.shift());                         /* thrown card joins the back — exactly once */
      stack.classList.remove('dragging');
      cards.forEach((c, i) => { c.classList.toggle('is-front', i === 0); c.classList.toggle('is-next', i === 1); });
      cards.slice(0, -1).forEach((c, i) => { c.style.zIndex = 10 - i; gsap.to(c, { ...pose(i), duration: .7, ease: 'power3.out', overwrite: 'auto' }); });
      gsap.timeline({ onComplete() { card.classList.remove('is-flying'); busy = false; makeDrag(); } })
        .to(card, { x: x + dir * stack.offsetWidth * .55, y: y * 1.2 - 30, rotation: dir * 14, duration: .38, ease: 'power2.in', overwrite: 'auto' })
        .call(() => { card.style.zIndex = 10 - back; })
        .to(card, { ...pose(back), duration: .7, ease: 'power3.out' });
    }
  });
  makeDrag();
});

/* ---------- loader + intro (CSS transitions + timers: never stalls, even in throttled tabs) ---------- */
const loader = $('.loader');
const heroT = $('.hero__title');
const heroChars = $$('.hero__title .ch');
heroChars.forEach((c, i) => c.style.setProperty('--i', i));
if (heroT) heroT.classList.add('h-pre');
if (nav) nav.classList.add('n-pre');
$$('.nav > *:not(.nav__logo)').forEach((c, i) => c.style.setProperty('--i', i));
function intro() {
  heroT && heroT.classList.add('h-in');
  nav && nav.classList.add('n-in');
  if (heroT) setTimeout(() => heroT.classList.add('grad-live'), 1400 + heroChars.length * 45 + 150);
}
/* "Hello World" preloader: first visit of the session only */
let seenLoader = false;
try { seenLoader = sessionStorage.getItem('sj-loader') === '1'; sessionStorage.setItem('sj-loader', '1'); } catch (e) {}
if (loader && seenLoader) { loader.remove(); }
if (loader && !seenLoader) {
  document.body.classList.add('is-loading');
  window.scrollTo(0, 0); lenis && lenis.scrollTo(0, { immediate: true, force: true });
  addEventListener('load', () => { window.scrollTo(0, 0); lenis && lenis.scrollTo(0, { immediate: true, force: true }); });
  lenis && lenis.stop();
  const txt = $('.loader__txt');
  requestAnimationFrame(() => txt.classList.add('show'));
  setTimeout(() => txt.classList.remove('show'), 1850);
  setTimeout(() => loader.classList.add('out'), 2550);
  setTimeout(intro, 2600);
  setTimeout(() => { loader.remove(); document.body.classList.remove('is-loading'); window.scrollTo(0, 0); lenis && lenis.scrollTo(0, { immediate: true, force: true }); lenis && lenis.start(); ScrollTrigger.refresh(); morph && morph.measure(); }, 3200);
} else { requestAnimationFrame(() => requestAnimationFrame(intro)); }

/* ---------- hero → nav-logo morph ----------
   Stateless: every frame the positions are computed directly from the scroll
   position (p = scroll / END), from layout values that transforms never affect.
   Nothing can get stuck, go stale, or disappear after refresh/resize/font load. */
let morph = null;
if (heroT && nav) {
  nav.classList.add('is-scrolled', 'is-morph');
  const logo = $('.nav__logo'), links = $$('.nav > a.mono'), hero = $('.hero'), heroCanvas = $('.hero .shader');
  const END = () => innerHeight * .62;
  let G = null;
  const measure = () => {
    setTimeW();
    const hr = hero.getBoundingClientRect();
    const w = heroT.offsetWidth, h = heroT.offsetHeight;
    const boxLeft = hr.left + heroT.offsetLeft - w / 2;          /* left:50% + translate(-50%) */
    const top0 = hr.top + scrollY + heroT.offsetTop;             /* document-space top */
    const L = logo.getBoundingClientRect();                      /* fixed element, never transformed */
    const nr = nav.getBoundingClientRect(), pad = parseFloat(getComputedStyle(nav).paddingLeft);
    const col = (innerWidth - 2 * pad) / 4;
    G = { w, s: L.width / w, x: L.left - boxLeft, dy: L.top - top0, top0, heroH: hero.offsetHeight,
          dx: links.map((a, i) => (pad + i * col) - (nr.left + a.offsetLeft)) };
    apply();
  };
  const apply = () => {
    if (!G) return;
    const y = lenis ? lenis.scroll : scrollY, e = END();
    const p = Math.min(1, Math.max(0, y / e));
    const sc = 1 + (G.s - 1) * p;
    heroT.style.transform = `translate3d(calc(-50% + ${G.x * p}px), ${(G.dy + e) * p}px, 0) scale(${sc})`;
    const fade = p < .94 ? 0 : (p - .94) / .06;
    heroT.style.opacity = 1 - fade;
    logo.style.opacity = fade;
    links.forEach((a, i) => a.style.transform = `translate3d(${G.dx[i] * (1 - p)}px,0,0)`);
    if (heroCanvas) heroCanvas.style.opacity = 1 - .85 * Math.min(1, y / G.heroH);
  };
  morph = { measure, apply };
  measure();
  lenis ? lenis.on('scroll', apply) : addEventListener('scroll', apply, { passive: true });
  addEventListener('resize', () => { measure(); });
  document.fonts && document.fonts.ready.then(measure);
  addEventListener('load', measure);
  setTimeout(measure, 800);
}

addEventListener('load', () => ScrollTrigger.refresh());
