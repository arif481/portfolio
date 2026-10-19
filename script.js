(() => {
    'use strict';

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const motion = hasGsap && !reduceMotion;

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    // Keep the hero hidden under the preloader until its intro plays.
    if (motion) gsap.set(['.hero-title', '.hero-fade', '#hero-canvas'], { autoAlpha: 0 });
    if (motion && 'scrollRestoration' in history) history.scrollRestoration = 'manual';

    // ==========================================
    // Smooth scroll
    // ==========================================
    let lenis = null;
    if (motion && typeof window.Lenis !== 'undefined') {
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // ==========================================
    // Text scramble
    // ==========================================
    const GLYPHS = '!<>-_/[]{}=+*^?#01AXZ$%&';

    function scramble(el, text, { duration = 0.9 } = {}) {
        return new Promise((resolve) => {
            const from = el.textContent;
            const total = duration * 1000;
            const queue = [];
            for (let i = 0; i < Math.max(from.length, text.length); i++) {
                const start = Math.random() * total * 0.4;
                const end = start + total * (0.3 + Math.random() * 0.6);
                queue.push({ from: from[i] || '', to: text[i] || '', start, end, glyph: '' });
            }
            const t0 = performance.now();
            cancelAnimationFrame(el._scramble);
            const tick = () => {
                const t = performance.now() - t0;
                let out = '';
                let done = 0;
                for (const q of queue) {
                    if (t >= q.end) {
                        done++;
                        out += q.to;
                    } else if (t >= q.start) {
                        if (!q.glyph || Math.random() < 0.3) q.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                        out += q.to === ' ' ? ' ' : q.glyph;
                    } else {
                        out += q.from;
                    }
                }
                el.textContent = out;
                if (done === queue.length) {
                    el.textContent = text;
                    resolve();
                } else {
                    el._scramble = requestAnimationFrame(tick);
                }
            };
            tick();
        });
    }

    // ==========================================
    // Theme
    // ==========================================
    const themeToggle = $('#theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
            if (network) network.refreshColors();
        });
    }

    // ==========================================
    // Hero network canvas
    // ==========================================
    const network = (() => {
        const canvas = $('#hero-canvas');
        if (!canvas || !canvas.getContext) return null;
        const ctx = canvas.getContext('2d');
        const hero = $('.hero');
        const LINK = 155;
        const mouse = { x: -9999, y: -9999, active: false };
        let w = 0, h = 0, nodes = [], pulses = [], colors = {}, raf = 0, running = false, visible = true;

        function refreshColors() {
            const cs = getComputedStyle(root);
            const light = root.getAttribute('data-theme') === 'light';
            colors = {
                a: cs.getPropertyValue('--accent').trim(),
                b: cs.getPropertyValue('--accent-2').trim(),
                c: cs.getPropertyValue('--accent-3').trim(),
                line: light ? '40, 30, 120' : '190, 190, 255',
            };
            if (!running) draw();
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.round(Math.min(125, Math.max(34, (w * h) / 11000)));
            nodes = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.6 + 0.8,
                tone: Math.random(),
            }));
            pulses = [];
            if (!running) draw();
        }

        function update() {
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                if (mouse.active) {
                    const dx = n.x - mouse.x;
                    const dy = n.y - mouse.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 25600) {
                        const d = Math.sqrt(d2) || 1;
                        const f = ((160 - d) / 160) * 1.2;
                        n.x += (dx / d) * f;
                        n.y += (dy / d) * f;
                    }
                }
                // ease bursts back to drifting speed
                n.vx *= 0.995;
                n.vy *= 0.995;
                if (Math.abs(n.vx) < 0.05) n.vx += (Math.random() - 0.5) * 0.04;
                if (Math.abs(n.vy) < 0.05) n.vy += (Math.random() - 0.5) * 0.04;
            }
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            const L2 = LINK * LINK;
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 >= L2) continue;
                    let alpha = (1 - d2 / L2) * 0.28;
                    if (mouse.active) {
                        const mx = (a.x + b.x) / 2 - mouse.x;
                        const my = (a.y + b.y) / 2 - mouse.y;
                        const md = mx * mx + my * my;
                        if (md < 48400) alpha += (1 - md / 48400) * 0.55;
                    }
                    ctx.strokeStyle = `rgba(${colors.line}, ${alpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                    if (running && pulses.length < 26 && Math.random() < 0.0009) {
                        pulses.push({ a, b, t: 0, speed: 0.01 + Math.random() * 0.02, color: Math.random() < 0.55 ? colors.b : colors.a });
                    }
                }
            }
            for (const n of nodes) {
                ctx.fillStyle = n.tone < 0.5 ? colors.a : n.tone < 0.82 ? colors.b : colors.c;
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            pulses = pulses.filter((p) => {
                p.t += p.speed;
                if (p.t >= 1) return false;
                const x = p.a.x + (p.b.x - p.a.x) * p.t;
                const y = p.a.y + (p.b.y - p.a.y) * p.t;
                ctx.shadowBlur = 14;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(x, y, 2.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                return true;
            });
        }

        function loop() {
            update();
            draw();
            raf = requestAnimationFrame(loop);
        }

        function start() {
            if (running || reduceMotion || !visible || document.hidden) return;
            running = true;
            loop();
        }

        function stop() {
            running = false;
            cancelAnimationFrame(raf);
        }

        // A click sends nodes flying and fires signals from the nearest node.
        function burst(x, y) {
            let nearest = null;
            let best = Infinity;
            for (const n of nodes) {
                const dx = n.x - x;
                const dy = n.y - y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 90000) {
                    const d = Math.sqrt(d2) || 1;
                    const f = (300 - d) / 300;
                    n.vx += (dx / d) * f * 4;
                    n.vy += (dy / d) * f * 4;
                }
                if (d2 < best) { best = d2; nearest = n; }
            }
            if (!nearest) return;
            for (const n of nodes) {
                const dx = n.x - nearest.x;
                const dy = n.y - nearest.y;
                if (n !== nearest && dx * dx + dy * dy < LINK * LINK * 2.2) {
                    pulses.push({ a: nearest, b: n, t: 0, speed: 0.02 + Math.random() * 0.02, color: colors.c });
                }
            }
        }

        refreshColors();
        resize();

        let resizeTimer = 0;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 150);
        });

        if (hero) {
            hero.addEventListener('pointermove', (e) => {
                const r = canvas.getBoundingClientRect();
                mouse.x = e.clientX - r.left;
                mouse.y = e.clientY - r.top;
                mouse.active = true;
            });
            hero.addEventListener('pointerleave', () => { mouse.active = false; });
            hero.addEventListener('pointerdown', (e) => {
                if (e.target.closest('a, button')) return;
                const r = canvas.getBoundingClientRect();
                burst(e.clientX - r.left, e.clientY - r.top);
            });
        }

        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start(); else stop();
        }).observe(canvas);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop(); else start();
        });

        return { start, stop, refreshColors };
    })();

    // ==========================================
    // Preloader and hero intro
    // ==========================================
    function splitChars(el) {
        const text = el.textContent;
        el.textContent = '';
        return Array.from(text).map((ch) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch === ' ' ? ' ' : ch;
            el.appendChild(span);
            return span;
        });
    }

    // Each letter gets its own slice of the gradient so the word still reads as one gradient while letters move.
    function paintGradientChars(el, chars) {
        const cs = getComputedStyle(root);
        const a = cs.getPropertyValue('--accent').trim();
        const b = cs.getPropertyValue('--accent-2').trim();
        const c = cs.getPropertyValue('--accent-3').trim();
        const image = `linear-gradient(100deg, ${a}, ${b}, ${c}, ${a})`;
        el.style.position = 'relative';
        const size = el.offsetWidth * 3;
        chars.forEach((ch) => {
            ch.style.backgroundImage = image;
            ch.style.backgroundSize = `${size}px 100%`;
            ch.style.backgroundPosition = `${-ch.offsetLeft}px 0`;
            ch.style.webkitBackgroundClip = 'text';
            ch.style.backgroundClip = 'text';
            ch.style.color = 'transparent';
        });
    }

    function heroIntro() {
        if (!motion) return;
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to('#hero-canvas', { autoAlpha: 1, duration: 2.2, ease: 'power2.out' }, 0);
        tl.set('.hero-title', { autoAlpha: 1 }, 0);
        tl.from('.nav', { yPercent: -100, opacity: 0, duration: 1.1, clearProps: 'transform,opacity' }, 0.2);
        $$('.hero-title .split').forEach((el, i) => {
            const text = el.textContent;
            const isGradient = el.classList.contains('gradient-text');
            if (isGradient) el.classList.remove('gradient-text');
            const chars = splitChars(el);
            if (isGradient) paintGradientChars(el, chars);
            tl.from(chars, { yPercent: 120, rotate: 10, opacity: 0, duration: 1.3, stagger: 0.04 }, 0.1 + i * 0.18);
            tl.add(() => {
                el.textContent = text;
                el.removeAttribute('style');
                if (isGradient) el.classList.add('gradient-text');
            });
        });
        tl.fromTo('.hero-fade', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: 'power3.out' }, 0.55);
    }

    function runPreloader() {
        const pre = $('#preloader');
        if (!pre) return Promise.resolve();
        if (!motion) {
            pre.remove();
            return Promise.resolve();
        }
        const lines = [
            '$ import arif',
            '> loading research ........ ok',
            '> loading projects ........ ok',
            '> starting agents ......... ok',
            '> hello, world',
        ];
        const box = $('#boot-lines');
        const bar = $('#boot-bar');
        const count = $('#boot-count');
        const progress = { p: 0 };
        if (lenis) lenis.stop();
        window.scrollTo(0, 0);

        return new Promise((resolve) => {
            const tl = gsap.timeline({ onComplete: resolve });
            tl.to(progress, {
                p: 100,
                duration: 1.6,
                ease: 'power2.inOut',
                onUpdate: () => {
                    count.textContent = Math.round(progress.p);
                    bar.style.width = `${progress.p}%`;
                },
            }, 0);
            lines.forEach((text, i) => {
                tl.add(() => {
                    const line = document.createElement('div');
                    line.className = 'boot-line';
                    line.textContent = text.replace(/ ok$/, ' ');
                    if (/ ok$/.test(text)) {
                        const ok = document.createElement('span');
                        ok.className = 'ok';
                        ok.textContent = 'ok';
                        line.appendChild(ok);
                    }
                    box.appendChild(line);
                    gsap.from(line, { opacity: 0, x: -12, duration: 0.3 });
                }, i * 0.3);
            });
            tl.to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '+=0.15');
            tl.add(() => {
                pre.remove();
                if (lenis) lenis.start();
            });
            tl.add(heroIntro, '-=0.55');
        });
    }

    // ==========================================
    // Navigation
    // ==========================================
    const nav = $('#nav');
    const menuBtn = $('#menu-toggle');
    const navList = $('#nav-links');
    const progressBar = $('#scroll-progress');
    let menuOpen = false;
    let lastY = 0;
    let ticking = false;

    function setMenu(open) {
        menuOpen = open;
        navList.classList.toggle('is-open', open);
        nav.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = open ? 'hidden' : '';
        if (lenis) { if (open) lenis.stop(); else lenis.start(); }
        if (open && motion) {
            gsap.from('.nav-link', { y: 50, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.15 });
        }
    }

    if (menuBtn && navList) {
        menuBtn.addEventListener('click', () => setMenu(!menuOpen));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuOpen) setMenu(false);
        });
    }

    function onScroll() {
        const y = window.scrollY;
        nav.classList.toggle('is-scrolled', y > 40);
        nav.classList.toggle('is-hidden', y > lastY && y > 480 && !menuOpen);
        lastY = y;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    onScroll();

    // Highlight the nav link for the section in the middle of the screen.
    const navLinks = $$('.nav-link');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const href = `#${entry.target.id}`;
            if (!entry.isIntersecting) {
                navLinks.forEach((link) => { if (link.getAttribute('href') === href) link.classList.remove('is-active'); });
                return;
            }
            navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === href));
        });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('main section[id]').forEach((section) => sectionObserver.observe(section));

    // In-page links scroll smoothly and close the mobile menu.
    $$('a[href^="#"]:not(.skip-link)').forEach((link) => {
        link.addEventListener('click', (e) => {
            const id = link.getAttribute('href');
            const target = id.length > 1 ? $(id) : null;
            if (!target) return;
            e.preventDefault();
            if (menuOpen) setMenu(false);
            if (lenis) {
                lenis.scrollTo(target, { offset: id === '#top' ? 0 : -8, duration: 1.4 });
            } else {
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    });

    // ==========================================
    // Cursor
    // ==========================================
    if (finePointer && !reduceMotion) {
        root.classList.add('has-cursor');
        const cursor = $('.cursor');
        const dot = $('.cursor-dot');
        const ring = $('.cursor-ring');
        const label = $('.cursor-label');
        let mx = window.innerWidth / 2;
        let my = window.innerHeight / 2;
        let rx = mx;
        let ry = my;

        window.addEventListener('pointermove', (e) => {
            mx = e.clientX;
            my = e.clientY;
            dot.style.transform = `translate(${mx}px, ${my}px)`;
            cursor.style.opacity = '1';
        }, { passive: true });

        const follow = () => {
            rx += (mx - rx) * 0.18;
            ry += (my - ry) * 0.18;
            ring.style.transform = `translate(${rx}px, ${ry}px)`;
            requestAnimationFrame(follow);
        };
        follow();

        document.addEventListener('pointerover', (e) => {
            const interactive = e.target.closest('a, button, input, textarea, .chips li');
            const labeled = e.target.closest('[data-cursor]');
            if (labeled && (!interactive || interactive === labeled)) {
                label.textContent = labeled.dataset.cursor;
                cursor.classList.add('is-label');
                cursor.classList.remove('is-hover');
            } else if (interactive) {
                cursor.classList.add('is-hover');
                cursor.classList.remove('is-label');
            } else {
                cursor.classList.remove('is-hover', 'is-label');
            }
        });
        document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
        document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
        document.documentElement.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    }

    // ==========================================
    // Magnetic buttons, card spotlight and tilt
    // ==========================================
    if (finePointer && motion) {
        $$('.magnetic').forEach((el) => {
            const strength = el.classList.contains('work-card') ? 0.08 : 0.32;
            const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * strength);
                yTo((e.clientY - (r.top + r.height / 2)) * strength);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });

        $$('.work-card').forEach((card) => {
            gsap.set(card, { transformPerspective: 1000 });
            const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
            const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                ry(((e.clientX - r.left) / r.width - 0.5) * 10);
                rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
            });
            card.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    }

    $$('.work-card, .chart-card, .skill-group').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - r.left}px`);
            el.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });

    // The whole project card opens its first link, not just the link text.
    $$('article.work-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const link = card.querySelector('.work-links a');
            if (link) window.open(link.href, '_blank', 'noopener');
        });
    });

    // ==========================================
    // Hero role cycle
    // ==========================================
    const roleEl = $('#role-cycle');
    if (roleEl && !reduceMotion) {
        const roles = ['applied ML', 'LLM tooling', 'agent benchmarks', 'full-stack web apps'];
        let index = 0;
        setInterval(() => {
            if (document.hidden) return;
            index = (index + 1) % roles.length;
            scramble(roleEl, roles[index], { duration: 0.8 });
        }, 2800);
    }

    // ==========================================
    // Marquee that speeds up and leans with scroll
    // ==========================================
    const marqueeRows = $$('.marquee-row').map((row) => {
        const track = $('.marquee-track', row);
        Array.from(track.children).forEach((child) => track.appendChild(child.cloneNode(true)));
        return { track, dir: Number(row.dataset.direction) || -1, x: 0, half: 0 };
    });

    if (motion && marqueeRows.length) {
        const measure = () => marqueeRows.forEach((row) => {
            row.half = row.track.scrollWidth / 2;
            if (row.dir > 0) row.x = -row.half;
        });
        measure();
        window.addEventListener('resize', measure);
        let velocity = 0;
        gsap.ticker.add((time, delta) => {
            const raw = lenis ? lenis.velocity : 0;
            velocity += (raw - velocity) * 0.1;
            const boost = 1 + Math.min(Math.abs(velocity) * 0.18, 7);
            const skew = gsap.utils.clamp(-12, 12, velocity * 0.7);
            const flip = velocity < -0.5 ? -1 : 1;
            marqueeRows.forEach((row) => {
                if (!row.half) return;
                row.x += row.dir * flip * 0.055 * delta * boost;
                if (row.x <= -row.half) row.x += row.half;
                if (row.x > 0) row.x -= row.half;
                row.track.style.transform = `translate3d(${row.x}px, 0, 0) skewX(${-skew}deg)`;
            });
        });
    }

    // ==========================================
    // Random bits for the quantum card
    // ==========================================
    const bits = $('#bits');
    if (bits) {
        const cells = [];
        for (let i = 0; i < 16 * 10; i++) {
            const span = document.createElement('span');
            span.textContent = Math.random() < 0.5 ? '0' : '1';
            bits.appendChild(span);
            cells.push(span);
        }
        if (!reduceMotion) {
            let bitsVisible = false;
            new IntersectionObserver(([entry]) => { bitsVisible = entry.isIntersecting; }).observe(bits);
            setInterval(() => {
                if (!bitsVisible || document.hidden) return;
                for (let k = 0; k < 7; k++) {
                    const cell = cells[Math.floor(Math.random() * cells.length)];
                    cell.textContent = Math.random() < 0.5 ? '0' : '1';
                    cell.classList.add('on');
                    setTimeout(() => cell.classList.remove('on'), 650);
                }
            }, 90);
        }
    }

    // ==========================================
    // Scroll-driven animation
    // ==========================================
    function horizontalWork() {
        const section = $('#work');
        const track = $('#work-track');
        if (!section || !track) return;
        const cards = $$('article.work-card', track);
        const current = $('#work-current');
        const total = $('#work-total');
        if (total) total.textContent = String(cards.length).padStart(2, '0');
        if (!motion) return;

        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
            root.classList.add('h-scroll');
            const viewport = track.parentElement;
            const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
            const tween = gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${distance()}`,
                    pin: true,
                    scrub: 1,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        if (!current) return;
                        const idx = Math.min(cards.length, Math.floor(self.progress * cards.length) + 1);
                        current.textContent = String(idx).padStart(2, '0');
                    },
                },
            });
            cards.forEach((card) => {
                const inner = $('.term, .mini-window, .ket', card);
                if (!inner) return;
                gsap.fromTo(inner, { xPercent: -8 }, {
                    xPercent: 8,
                    ease: 'none',
                    scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
                });
            });
            return () => root.classList.remove('h-scroll');
        });
    }

    function scrollAnimations() {
        // Pinned sections first, so later triggers account for the pin spacing.
        horizontalWork();

        if (!motion) {
            $$('.tl-item').forEach((item) => item.classList.add('is-active'));
            return;
        }

        gsap.to('.hero-inner', {
            yPercent: -18,
            opacity: 0.15,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to('#hero-canvas', {
            yPercent: 25,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });

        gsap.set('[data-reveal]', { y: 50, opacity: 0 });
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%',
            once: true,
            onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true }),
        });

        $$('[data-scramble]').forEach((el) => {
            const text = el.textContent;
            ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => scramble(el, text, { duration: 1.1 }) });
            el.addEventListener('pointerenter', () => scramble(el, text, { duration: 0.6 }));
        });

        $$('.count').forEach((el) => {
            const to = parseFloat(el.dataset.to);
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            const value = { v: 0 };
            el.textContent = (0).toFixed(decimals);
            ScrollTrigger.create({
                trigger: el,
                start: 'top 92%',
                once: true,
                onEnter: () => gsap.to(value, {
                    v: to,
                    duration: 2.2,
                    ease: 'power3.out',
                    onUpdate: () => { el.textContent = value.v.toFixed(decimals); },
                }),
            });
        });

        const bars = $$('.bar');
        bars.forEach((bar) => bar.style.setProperty('--v', 0));
        ScrollTrigger.create({
            trigger: '#chart',
            start: 'top 80%',
            once: true,
            onEnter: () => bars.forEach((bar, i) => {
                const target = Number(bar.dataset.value);
                const label = $('.bar-label', bar);
                const value = { v: 0 };
                gsap.to(value, {
                    v: target,
                    duration: 1.8,
                    delay: i * 0.12,
                    ease: 'expo.out',
                    onUpdate: () => {
                        bar.style.setProperty('--v', value.v);
                        label.textContent = Math.round(value.v);
                    },
                });
            }),
        });

        gsap.fromTo('.about-photo-inner', { clipPath: 'inset(100% 0% 0% 0%)' }, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.5,
            ease: 'expo.inOut',
            scrollTrigger: { trigger: '.about-photo', start: 'top 85%', once: true },
        });
        gsap.fromTo('.about-photo img', { yPercent: -8 }, {
            yPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
        });

        gsap.fromTo('#timeline-fill', { scaleY: 0 }, {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 70%', scrub: true },
        });
        $$('.tl-item').forEach((item) => {
            ScrollTrigger.create({
                trigger: item,
                start: 'top 70%',
                onEnter: () => item.classList.add('is-active'),
                onLeaveBack: () => item.classList.remove('is-active'),
            });
        });

        gsap.from('.contact-big', {
            scale: 0.92,
            ease: 'none',
            scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 30%', scrub: true },
        });
    }

    scrollAnimations();

    // ==========================================
    // Contact
    // ==========================================
    const emailBtn = $('#email-copy');
    const emailHint = $('#email-hint');
    if (emailBtn && emailHint) {
        emailBtn.addEventListener('click', async () => {
            const email = emailBtn.dataset.email;
            try {
                await navigator.clipboard.writeText(email);
            } catch (e) {
                window.location.href = `mailto:${email}`;
                return;
            }
            emailHint.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
            emailHint.classList.add('is-done');
            setTimeout(() => {
                emailHint.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                emailHint.classList.remove('is-done');
            }, 2200);
        });
    }

    const form = $('#contact-form');
    const formStatus = $('#form-status');
    if (form && formStatus) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = $('button[type="submit"]', form);
            const original = button.innerHTML;
            button.innerHTML = '<span>Sending...</span><i class="fa-solid fa-spinner fa-spin"></i>';
            button.disabled = true;
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                formStatus.textContent = "Thanks, your message was sent. I'll reply by email.";
                formStatus.className = 'form-status success';
                form.reset();
            } catch (err) {
                formStatus.textContent = 'Sending failed. Please email me directly instead.';
                formStatus.className = 'form-status error';
            } finally {
                button.innerHTML = original;
                button.disabled = false;
            }
        });
    }

    // ==========================================
    // Start
    // ==========================================
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
        runPreloader();
        if (hasGsap) ScrollTrigger.refresh();
    });
    window.addEventListener('load', () => { if (hasGsap) ScrollTrigger.refresh(); });
})();
