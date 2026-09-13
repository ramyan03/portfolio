(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
    const animate = hasGsap && !reducedMotion;

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    let lenis = null;

    /* ── Toronto clock ───────────────────────────────── */

    const clockFormat = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const tickClock = () => {
        const time = clockFormat.format(new Date());
        $$("[data-clock]").forEach((el) => (el.textContent = `Toronto ${time}`));
    };
    tickClock();
    setInterval(tickClock, 10000);

    /* ── Mobile menu ─────────────────────────────────── */

    const nav = $(".nav");
    const menu = $("#menu");
    const toggle = $(".nav-toggle");
    const toggleText = $(".nav-toggle-text");

    const setMenu = (open) => {
        menu.classList.toggle("is-open", open);
        menu.setAttribute("aria-hidden", String(!open));
        menu.inert = !open;
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggleText.textContent = open ? "Close" : "Menu";
        nav.classList.remove("is-hidden");
        if (lenis) open ? lenis.stop() : lenis.start();
    };

    toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
    });

    /* ── Anchor links ────────────────────────────────── */

    document.addEventListener("click", (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (menu.classList.contains("is-open")) setMenu(false);
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
        }
    });

    /* ── Email links ─────────────────────────────────── */

    // mailto: does nothing on a machine without a mail app, so every email
    // link also copies the address and says so.
    const toast = $(".toast");
    const toastAddress = $(".toast-address");
    const toastClose = $(".toast-close");
    let toastTimer = null;

    const hideToast = () => {
        clearTimeout(toastTimer);
        toast.classList.remove("is-on");
    };

    toastClose.addEventListener("click", hideToast);
    toast.addEventListener("click", (e) => {
        if (e.target === toast) hideToast();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && toast.classList.contains("is-on")) hideToast();
    });

    $$('a[href^="mailto:"]').forEach((link) => {
        link.addEventListener("click", () => {
            const address = link.getAttribute("href").replace("mailto:", "");
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(address).then(
                () => {
                    toastAddress.textContent = address;
                    toast.classList.add("is-on");
                    toastClose.focus({ preventScroll: true });
                    clearTimeout(toastTimer);
                    toastTimer = setTimeout(hideToast, 2800);
                },
                () => {
                    /* clipboard blocked: the mailto link still runs */
                }
            );
        });
    });

    /* ── No-motion fallback ──────────────────────────── */

    if (!animate) {
        root.classList.add("is-ready");
        $$("[data-work-card]").forEach((card) => card.classList.add("in-view"));
        return;
    }

    /* ── Setup ───────────────────────────────────────── */

    gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis) {
        // Each wheel tick travels further, so a page takes less scrolling to reach.
        lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.6, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    const splitChars = (el) => {
        const text = el.textContent.trim();
        el.textContent = "";
        return [...text].map((ch) => {
            const span = document.createElement("span");
            span.className = "char";
            span.textContent = ch === " " ? " " : ch;
            el.appendChild(span);
            return span;
        });
    };

    const splitWords = (el) => {
        const walk = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) {
                            frag.appendChild(document.createTextNode(" "));
                        } else {
                            const word = document.createElement("span");
                            word.className = "word";
                            word.textContent = part;
                            frag.appendChild(word);
                        }
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        };
        walk(el);
        return $$(".word", el);
    };

    /* ── Hero intro ──────────────────────────────────── */

    const heroChars = $$("[data-split]").map(splitChars);

    const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    heroChars.forEach((chars, i) => {
        intro.from(
            chars,
            { yPercent: 115, rotate: 8, duration: 1.4, stagger: 0.035, transformOrigin: "0% 100%" },
            i * 0.12
        );
    });
    intro
        .from(".hero-rule", { scaleX: 0, duration: 1.4, ease: "expo.inOut" }, 0.3)
        .from("[data-hero-fade]", { y: 30, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.55)
        .from(".scroll-cue", { autoAlpha: 0, duration: 1 }, 1)
        .from(".nav", { yPercent: -100, autoAlpha: 0, duration: 1 }, 0.4);

    /* ── Hero scroll-out ─────────────────────────────── */

    gsap.to(".hero-title", {
        yPercent: 35,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero-bottom, .hero-top", {
        autoAlpha: 0,
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "30% top", end: "80% top", scrub: true },
    });

    /* ── Progress bar + nav hide ─────────────────────── */

    gsap.to(".progress span", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });

    ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
            if (menu.classList.contains("is-open")) return;
            const past = self.scroll() > window.innerHeight * 0.5;
            nav.classList.toggle("is-hidden", past && self.direction === 1);
        },
    });

    /* ── Marquee (scroll-velocity reactive) ──────────── */

    const marqueeTrack = $(".marquee-track");
    const marqueeGroup = $(".marquee-group");
    if (marqueeTrack && marqueeGroup) {
        marqueeTrack.appendChild(marqueeGroup.cloneNode(true));
        marqueeTrack.appendChild(marqueeGroup.cloneNode(true));

        let groupWidth = marqueeGroup.offsetWidth;
        let x = 0;
        let direction = -1;
        const skewTo = gsap.quickTo(marqueeTrack, "skewX", { duration: 0.6, ease: "power3" });

        window.addEventListener("resize", () => (groupWidth = marqueeGroup.offsetWidth));

        gsap.ticker.add((_, deltaTime) => {
            const velocity = lenis ? lenis.velocity : 0;
            if (Math.abs(velocity) > 0.5) direction = velocity > 0 ? -1 : 1;
            const speed = 1.1 + Math.min(Math.abs(velocity) * 0.35, 18);
            x += direction * speed * (deltaTime / 16.67);
            if (x <= -groupWidth) x += groupWidth;
            if (x > 0) x -= groupWidth;
            gsap.set(marqueeTrack, { x });
            skewTo(gsap.utils.clamp(-10, 10, velocity * -0.25));
        });
    }

    /* ── Generic reveals ─────────────────────────────── */

    $$(".section-rule").forEach((rule) => {
        gsap.from(rule, {
            scaleX: 0,
            duration: 1.6,
            ease: "expo.inOut",
            scrollTrigger: { trigger: rule, start: "top 90%" },
        });
    });

    $$("[data-lines]").forEach((el) => {
        gsap.from($$(".line-inner", el), {
            yPercent: 130,
            rotate: 3,
            duration: 1.3,
            stagger: 0.1,
            ease: "expo.out",
            transformOrigin: "0% 100%",
            scrollTrigger: { trigger: el, start: "top 85%" },
        });
    });

    gsap.set("[data-fade]", { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch("[data-fade]", {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: "expo.out" }),
    });

    /* ── About ───────────────────────────────────────── */

    $$("[data-words]").forEach((el) => {
        const words = splitWords(el);
        gsap.fromTo(
            words,
            { opacity: 0.12 },
            {
                opacity: 1,
                stagger: 0.1,
                ease: "none",
                scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 40%", scrub: true },
            }
        );
    });

    $$("[data-clip]").forEach((figure) => {
        const inner = $(".about-photo-inner", figure);
        const img = $("img", figure);
        gsap.timeline({ scrollTrigger: { trigger: figure, start: "top 80%" } })
            .fromTo(
                inner,
                { clipPath: "inset(0% 0% 100% 0%)" },
                { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }
            )
            .from(img, { scale: 1.35, duration: 2, ease: "expo.out" }, 0.2);

        gsap.fromTo(
            img,
            { yPercent: -6 },
            {
                yPercent: 6,
                ease: "none",
                scrollTrigger: { trigger: figure, start: "top bottom", end: "bottom top", scrub: true },
            }
        );
    });

    $$("[data-count-to]").forEach((el) => {
        const target = parseFloat(el.dataset.countTo);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const useComma = el.dataset.format === "comma";
        const render = (v) => {
            const fixed = v.toFixed(decimals);
            el.textContent = useComma ? Number(fixed).toLocaleString("en-CA") : fixed;
        };
        const state = { value: 0 };
        render(0);
        ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () =>
                gsap.to(state, {
                    value: target,
                    duration: 2,
                    ease: "expo.out",
                    onUpdate: () => render(state.value),
                }),
        });
    });

    /* ── Work demos ──────────────────────────────────── */

    const workTrack = $(".work-track");
    const workCards = $$("[data-work-card]");
    const desktopQuery = window.matchMedia("(min-width: 900px)");
    const isDesktop = () => desktopQuery.matches;
    const cardOffset = (index) => workCards.slice(0, index).reduce((sum, card) => sum + card.offsetHeight, 0);

    // Worth animating: on screen and, on desktop, not already covered by the next stacked card.
    const cardVisible = (card) => {
        const r = card.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= window.innerHeight) return false;
        const next = workCards[workCards.indexOf(card) + 1];
        return !(isDesktop() && next && next.getBoundingClientRect().top <= 1);
    };

    // Demo clock. Timers, number tweens and CSS transitions inside the demos
    // all run on it, and it speeds up while the page is being scrolled.
    let demoRate = 1;
    let appliedRate = 1;
    const demoTimers = new Set();
    const numberTweens = new Set();

    const every = (card, ms, fn) => {
        const timer = { card, ms, fn, elapsed: 0 };
        demoTimers.add(timer);
        return () => demoTimers.delete(timer);
    };

    const after = (card, ms, fn) => {
        const stop = every(card, ms, () => {
            stop();
            fn();
        });
        return stop;
    };

    const tweenNumber = (el, to, { from = 0, decimals = 0, duration = 1.8 } = {}) => {
        if (el._numberTween) {
            numberTweens.delete(el._numberTween);
            el._numberTween.kill();
        }
        const state = { value: from };
        const tween = gsap.to(state, {
            value: to,
            duration,
            ease: "power3.inOut",
            onUpdate: () => (el.textContent = state.value.toFixed(decimals)),
            onComplete: () => numberTweens.delete(tween),
        });
        tween.timeScale(demoRate);
        numberTweens.add(tween);
        el._numberTween = tween;
    };

    gsap.ticker.add((_, deltaTime) => {
        const speed = lenis ? Math.abs(lenis.velocity) : 0;
        const target = 1 + Math.min(speed * 0.12, 3);
        demoRate += (target - demoRate) * (target > demoRate ? 0.25 : 0.05);
        if (document.hidden) return;

        const step = Math.min(deltaTime, 100) * demoRate;
        demoTimers.forEach((timer) => {
            if (!cardVisible(timer.card)) return;
            timer.elapsed += step;
            if (timer.elapsed >= timer.ms) {
                timer.elapsed = 0;
                timer.fn();
            }
        });

        if (demoRate > 1.01 || Math.abs(demoRate - appliedRate) > 0.005) {
            appliedRate = demoRate;
            numberTweens.forEach((tween) => tween.timeScale(demoRate));
            workCards.forEach((card) => {
                if (!cardVisible(card)) return;
                card.getAnimations({ subtree: true }).forEach((animation) => {
                    animation.playbackRate = demoRate;
                });
            });
        }
    });

    // Motion that keeps going after a demo's intro. Each runner returns a stop function.
    const demoRunners = [
        // Setter30: step through the performance page's charts, one after another
        (card) => {
            const demo = $(".demo-s30", card);
            if (!demo) return null;
            const panels = $$(".s30-panel", demo);
            const steps = $$(".s30-steps li", demo);
            const filters = ["all", "private", "public"];
            let current = 0;
            let filter = 0;

            const show = (index) => {
                panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
                steps.forEach((stepEl, i) => {
                    stepEl.classList.remove("is-on");
                    if (i === index) {
                        void stepEl.offsetWidth; // restart the step's progress line
                        stepEl.classList.add("is-on");
                    }
                });
                filter = 0;
                demo.dataset.filter = "all";
                $$("[data-panel-num]", panels[index]).forEach((el) =>
                    tweenNumber(el, parseFloat(el.dataset.panelNum), {
                        decimals: parseInt(el.dataset.decimals || "0", 10),
                    })
                );
            };

            show(0);
            const stopDeck = every(card, 5600, () => {
                current = (current + 1) % panels.length;
                show(current);
            });
            const stopFilter = every(card, 1700, () => {
                if (!panels[current].classList.contains("s30-panel--exits")) return;
                filter = (filter + 1) % filters.length;
                demo.dataset.filter = filters[filter];
            });

            return () => {
                stopDeck();
                stopFilter();
                demo.dataset.filter = "all";
            };
        },

        // Company page: walk the funding rounds, linking each table row to its point on the chart
        (card) => {
            const svg = $("[data-rounds-chart]", card);
            if (!svg) return null;
            const points = JSON.parse(svg.dataset.roundsChart);
            const rows = $$(".co-row", card).sort((a, b) => a.dataset.point - b.dataset.point);
            const tip = $(".co-tip", svg);
            const tipText = $("text", tip);
            const cross = $(".co-cross", svg);
            let current = -1;
            let stopLoop = () => {};

            const move = () => {
                current = (current + 1) % rows.length;
                const row = rows[current];
                const [x, y, round, value] = points[Number(row.dataset.point)];
                rows.forEach((r) => r.classList.toggle("is-focus", r === row));
                const tipY = y - 44 < 60 ? y + 46 : y - 44;
                tip.style.transform = `translate(${gsap.utils.clamp(120, 800, x)}px, ${tipY}px)`;
                cross.style.transform = `translateX(${x}px)`;
                tipText.textContent = `${round} · ${value}`;
                svg.classList.add("is-tracking");
            };

            const stopStart = after(card, 2600, () => {
                move();
                stopLoop = every(card, 1500, move);
            });

            return () => {
                stopStart();
                stopLoop();
                rows.forEach((r) => r.classList.remove("is-focus"));
                svg.classList.remove("is-tracking");
            };
        },
    ];

    const stopDemo = new Map();

    // Play a card's demo from the start: snap everything back without
    // animating, then let the transitions and ongoing motion run again.
    const playCard = (card) => {
        stopDemo.get(card)?.();
        card.classList.add("is-resetting");
        card.classList.remove("in-view");
        void card.offsetWidth; // commit the reset before the transitions restart
        card.classList.remove("is-resetting");
        card.classList.add("in-view");
        $$("[data-demo-count]", card).forEach((el) =>
            tweenNumber(el, parseFloat(el.dataset.demoCount), {
                decimals: parseInt(el.dataset.decimals || "0", 10),
            })
        );
        const stops = demoRunners.map((run) => run(card)).filter(Boolean);
        stopDemo.set(card, () => stops.forEach((stop) => stop()));
    };

    const activateCard = (card) => {
        if (!card.classList.contains("in-view")) playCard(card);
    };

    /* ── Work: stacked full-screen cards ─────────────── */

    // Desktop: each card is a sticky full-screen panel. As a card rises its
    // frame opens out from a rounded inset; the card it covers settles back
    // and dims. Triggers are measured from the track, because a stuck card's
    // own rect moves with the scroll.
    const stackLayout = () => {
        workCards.forEach((card, i) => {
            const at = (edge) => () => `top+=${cardOffset(i)} ${edge}`;
            const nextAt = (edge) => () => `top+=${cardOffset(i + 1)} ${edge}`;

            ScrollTrigger.create({
                trigger: workTrack,
                start: at("70%"),
                invalidateOnRefresh: true,
                onEnter: () => activateCard(card),
            });

            gsap.fromTo(
                $(".work-visual", card),
                { clipPath: "inset(9% 7% 9% 7% round 32px)", scale: 0.94 },
                {
                    clipPath: "inset(0% 0% 0% 0% round 14px)",
                    scale: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: workTrack,
                        start: at("bottom"),
                        end: at("top"),
                        scrub: 0.4,
                        invalidateOnRefresh: true,
                    },
                }
            );

            gsap.from($$(".work-num, .work-name, .work-desc, .work-side", card), {
                y: 48,
                autoAlpha: 0,
                duration: 1.2,
                stagger: 0.07,
                ease: "expo.out",
                scrollTrigger: {
                    trigger: workTrack,
                    start: at("45%"),
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true,
                },
            });

            if (i < workCards.length - 1) {
                gsap.to($(".work-link", card), {
                    scale: 0.9,
                    yPercent: -3,
                    opacity: 0.2,
                    ease: "none",
                    scrollTrigger: {
                        trigger: workTrack,
                        start: nextAt("bottom"),
                        end: nextAt("top"),
                        scrub: 0.4,
                        invalidateOnRefresh: true,
                    },
                });
            }
        });
    };

    // Smaller screens: the cards simply flow and play as they arrive.
    const flowLayout = () => {
        workCards.forEach((card) => {
            ScrollTrigger.create({
                trigger: card,
                start: "top 75%",
                onEnter: () => activateCard(card),
            });
            gsap.from(card, {
                y: 80,
                autoAlpha: 0,
                duration: 1.2,
                ease: "expo.out",
                scrollTrigger: { trigger: card, start: "top 90%" },
            });
        });
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", stackLayout);
    mm.add("(max-width: 899.98px)", flowLayout);

    // Rows start revealing just before they reach the screen, so fast scrolling never waits on them.
    gsap.set(".rows li", { autoAlpha: 0, y: 24 });
    ScrollTrigger.batch(".rows li", {
        start: "top bottom+=80",
        once: true,
        interval: 0.05,
        onEnter: (batch) =>
            gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.04,
                ease: "power3.out",
                overwrite: true,
            }),
    });

    /* ── Experience ──────────────────────────────────── */

    $$("[data-job]").forEach((job) => {
        gsap.timeline({ scrollTrigger: { trigger: job, start: "top 80%" } })
            .from($(".job-rule", job), { scaleX: 0, duration: 1.5, ease: "expo.inOut" })
            .from(
                [$(".job-when", job), $(".job-role", job), $(".job-co", job)],
                { y: 50, autoAlpha: 0, duration: 1.2, stagger: 0.08, ease: "expo.out" },
                0.25
            )
            .from(
                $$(".job-bullets li, .chips", job),
                { y: 30, autoAlpha: 0, duration: 1, stagger: 0.06, ease: "expo.out" },
                0.45
            );
    });

    /* ── Skills ──────────────────────────────────────── */

    $$("[data-skill-row]").forEach((row) => {
        gsap.from([$(".skill-cat", row), ...$$(".skill-items li", row)], {
            yPercent: 60,
            autoAlpha: 0,
            duration: 1,
            stagger: 0.04,
            ease: "expo.out",
            scrollTrigger: { trigger: row, start: "top 88%" },
        });
    });

    /* ── Contact ─────────────────────────────────────── */

    gsap.fromTo(
        ".contact",
        { scale: 0.92, borderRadius: "6rem" },
        {
            scale: 1,
            borderRadius: () => getComputedStyle($(".contact")).borderRadius,
            ease: "none",
            scrollTrigger: { trigger: ".contact", start: "top bottom", end: "top 35%", scrub: true },
        }
    );

    /* ── Cursor, magnetic, previews (fine pointers) ──── */

    if (finePointer) {
        root.classList.add("has-cursor");

        const cursor = $(".cursor");
        const dot = $(".cursor-dot");
        const ring = $(".cursor-ring");
        const label = $(".cursor-label");
        const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
        const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
        const ringX = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
        const ringY = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });

        const preview = $(".preview");
        const previewImg = $("img", preview);
        const previewX = gsap.quickTo(preview, "x", { duration: 0.7, ease: "power3" });
        const previewY = gsap.quickTo(preview, "y", { duration: 0.7, ease: "power3" });

        cursor.classList.add("is-out");

        window.addEventListener("pointermove", (e) => {
            cursor.classList.remove("is-out");
            dotX(e.clientX);
            dotY(e.clientY);
            ringX(e.clientX);
            ringY(e.clientY);
            previewX(e.clientX);
            previewY(e.clientY);
        });

        document.addEventListener("pointerleave", () => cursor.classList.add("is-out"));

        document.addEventListener("pointerover", (e) => {
            const labelled = e.target.closest("[data-cursor]");
            const hidden = e.target.closest("[data-cursor-hide]");
            const interactive = e.target.closest("a, button");
            cursor.classList.toggle("is-hidden", Boolean(hidden));
            cursor.classList.toggle("is-label", Boolean(labelled) && !hidden);
            cursor.classList.toggle("is-hover", Boolean(interactive) && !labelled && !hidden);
            if (labelled) label.textContent = labelled.dataset.cursor;
        });

        $$("[data-preview]").forEach((row) => {
            row.addEventListener("pointerenter", () => {
                previewImg.src = row.dataset.preview;
                preview.classList.add("is-on");
            });
            row.addEventListener("pointerleave", () => preview.classList.remove("is-on"));
        });

        $$("[data-magnetic]").forEach((el) => {
            const strength = parseFloat(el.dataset.magnetic) || 0.3;
            const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
            const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
            el.addEventListener("pointermove", (e) => {
                const rect = el.getBoundingClientRect();
                xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
                yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
            });
            el.addEventListener("pointerleave", () => {
                xTo(0);
                yTo(0);
            });
        });
    }

    /* ── Snap scrolling ──────────────────────────────── */

    // Page-style snapping. When scrolling settles with a section boundary on
    // screen, finish the move: scrolling a tenth of the screen commits to the
    // next section in that direction, a smaller nudge springs back. Sections
    // taller than the screen scroll freely until their edge comes into view.
    // Each stacked work card is its own page.
    if (lenis) {
        let settleTimer = null;
        let snapping = false;
        let lastSettled = window.scrollY;

        // Section tops are snap points; the stacked work cards (and the end of
        // their track) are also "pages", the only points a snap may cross a
        // whole screen to reach.
        const boundaries = () => {
            const points = new Set([0, Math.round(ScrollTrigger.maxScroll(window))]);
            const pages = new Set();
            $$("main > section").forEach((el) => {
                points.add(Math.round(el.getBoundingClientRect().top + window.scrollY));
            });
            if (isDesktop()) {
                const trackTop = workTrack.getBoundingClientRect().top + window.scrollY;
                for (let i = 0; i <= workCards.length; i++) {
                    const page = Math.round(trackTop + cardOffset(i));
                    points.add(page);
                    pages.add(page);
                }
            }
            return { points: [...points].sort((a, b) => a - b), pages };
        };

        const glide = (target) => {
            snapping = true;
            lenis.scrollTo(target, {
                duration: 0.8,
                easing: (t) => 1 - Math.pow(1 - t, 3),
                lock: true,
                onComplete: () => {
                    snapping = false;
                    lastSettled = target;
                },
            });
            setTimeout(() => (snapping = false), 1400);
        };

        const settle = () => {
            if (menu.classList.contains("is-open")) return;
            if (snapping) {
                // A glide is running (or was interrupted): look again once it clears.
                clearTimeout(settleTimer);
                settleTimer = setTimeout(settle, 200);
                return;
            }
            const y = lenis.scroll;
            const vh = window.innerHeight;
            const from = lastSettled;
            const direction = Math.sign(y - from);
            const committed = Math.abs(y - from) > vh * 0.06;
            lastSettled = y;
            if (direction === 0) return;

            const { points, pages } = boundaries();
            const below = points.find((p) => p > y + 1);
            const above = [...points].reverse().find((p) => p <= y + 1) ?? 0;
            let target = null;

            if (below !== undefined && below < y + vh) {
                // A boundary is on screen: a deliberate move (10% of the screen)
                // commits to the section in that direction; a nudge springs back.
                const shown = (y + vh - below) / vh;
                const goNext = direction > 0 ? committed || shown > 0.5 : !committed && shown > 0.5;
                target = goNext ? below : Math.max(above, below - vh);
            } else if (direction < 0 && y - above < vh * 0.25) {
                target = above;
            }

            // Only moving between stacked cards may glide a whole screen. Anywhere
            // else a snap is a short nudge, so reading a long section (like More
            // projects) never throws you down the page.
            const paging = pages.has(above) && below !== undefined && pages.has(below);
            if (target !== null && !paging && Math.abs(target - y) > vh * 0.25) target = null;

            if (target !== null && Math.abs(target - y) > 2) glide(target);
        };

        lenis.on("scroll", () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(settle, 100);
        });
    }

    /* ── Go ──────────────────────────────────────────── */

    root.classList.add("is-ready");
    intro.play();

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
})();
