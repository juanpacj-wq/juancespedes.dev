import { parseLocale } from '../../domain/shared/locale';
import { formatFigure, parseFigure } from './figure';
import { portOffset, wireEnds, wirePath, type Box, type Side } from './wires';

/*
 * The motion layer of a case study page (ProjectArticle.astro, ADR 0021). Everything here
 * decorates markup that is already complete: without this script the page shows every figure,
 * every node and every flow as text. Reduced motion keeps the chapter nav and the diagram
 * highlights (they are navigation and reading aids) and drops the counting and the moving data.
 */

const calm = matchMedia('(prefers-reduced-motion: reduce)');
const SVG = 'http://www.w3.org/2000/svg';

/** The floating chapter nav: shows after the hero, follows the chapter being read. */
const chapterNav = () => {
  const nav = document.querySelector<HTMLElement>('[data-chapters]');
  const hero = document.querySelector('[data-cs-hero]');
  const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
  if (!nav || !hero || chapters.length === 0) return;

  const list = nav.querySelector<HTMLElement>('ul');
  const links = new Map(
    [...nav.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]')].map((link) => [
      link.dataset.chapterLink ?? '',
      link,
    ]),
  );
  nav.hidden = false;

  let pastHero = false;
  let beforeEnd = true;
  const show = () => {
    nav.dataset.state = pastHero && beforeEnd ? 'in' : 'away';
  };
  show();

  new IntersectionObserver(([entry]) => {
    pastHero = !entry?.isIntersecting;
    show();
  }).observe(hero);

  // Out of the way from the closing call to action to the end of the page.
  const end = document.querySelector('.cs-cta');
  if (end) {
    new IntersectionObserver(([entry]) => {
      beforeEnd = entry ? !entry.isIntersecting && entry.boundingClientRect.top > 0 : true;
      show();
    }).observe(end);
  }

  const visible = new Set<string>();
  const mark = () => {
    const current = chapters.find((chapter) => visible.has(chapter.id))?.id;
    for (const [id, link] of links) {
      if (id === current) {
        link.setAttribute('aria-current', 'true');
        // Keep the active chapter in view inside the nav without scrolling the page.
        if (list && list.scrollWidth > list.clientWidth) {
          list.scrollTo({
            left: link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2,
            behavior: calm.matches ? 'auto' : 'smooth',
          });
        }
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };
  const watch = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      }
      mark();
    },
    // A chapter counts as "being read" while it crosses the band 30 to 45 % down the screen.
    { rootMargin: '-30% 0px -55% 0px' },
  );
  for (const chapter of chapters) watch.observe(chapter);
};

/** Headline figures count up once, the first time they scroll into view. */
const countFigures = () => {
  const locale = parseLocale(document.documentElement.lang);
  if (!locale.ok || calm.matches) return;
  const watch = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        watch.unobserve(entry.target);
        const element = entry.target as HTMLElement;
        const written = element.dataset.count ?? '';
        const figure = parseFigure(written, locale.value);
        if (!figure) continue;
        const duration = 1600;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          // Exponential ease-out: fast at first, settling on the written value.
          const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
          element.textContent =
            progress === 1 ? written : formatFigure(figure, figure.target * eased, locale.value);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 0.6 },
  );
  for (const element of document.querySelectorAll('[data-count]')) watch.observe(element);
};

/** A soft light that follows a fine pointer over cards marked `data-glow`. */
const glow = () => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  for (const card of document.querySelectorAll<HTMLElement>('[data-glow]')) {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${String(event.clientX - box.left)}px`);
      card.style.setProperty('--gy', `${String(event.clientY - box.top)}px`);
    });
  }
};

interface Wire {
  readonly from: string;
  readonly to: string;
  readonly index: number;
  readonly path: SVGPathElement;
  readonly flow: SVGPathElement;
}

/** The architecture diagram: wires between nodes, highlights and a step-by-step walk. */
const diagram = (figure: HTMLElement) => {
  const stage = figure.querySelector<HTMLElement>('.cs-arch');
  const svg = figure.querySelector<SVGSVGElement>('[data-wires]');
  const flows = [...figure.querySelectorAll<HTMLElement>('[data-flow]')];
  if (!stage || !svg) return;

  const nodes = new Map(
    [...figure.querySelectorAll<HTMLElement>('[data-node]')].map((node) => [
      node.dataset.node ?? '',
      node,
    ]),
  );
  let wires: Wire[] = [];

  const draw = () => {
    svg.replaceChildren();
    wires = [];
    // Wires only make sense when the layers stand side by side.
    if (getComputedStyle(svg).display === 'none') return;
    const origin = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${String(origin.width)} ${String(origin.height)}`);
    const boxOf = (id: string): Box | null => {
      const rect = nodes.get(id)?.getBoundingClientRect();
      return rect
        ? {
            x: rect.left - origin.left,
            y: rect.top - origin.top,
            width: rect.width,
            height: rect.height,
          }
        : null;
    };

    // Plan every wire first, so the wires that share a side of a node can spread out.
    const planned = flows.flatMap((item, index) => {
      const from = boxOf(item.dataset.from ?? '');
      const to = boxOf(item.dataset.to ?? '');
      if (!from || !to) return [];
      return [{ item, index, from, to, ends: wireEnds(from, to) }];
    });
    const ports = new Map<string, number[]>();
    const port = (id: string, side: Side, index: number) => {
      const key = `${id}:${side}`;
      ports.set(key, [...(ports.get(key) ?? []), index]);
    };
    for (const wire of planned) {
      port(wire.item.dataset.from ?? '', wire.ends.from, wire.index);
      port(wire.item.dataset.to ?? '', wire.ends.to, wire.index);
    }
    const offset = (id: string, side: Side, index: number, height: number) => {
      const shared = ports.get(`${id}:${side}`) ?? [];
      return portOffset(shared.indexOf(index), shared.length, height);
    };

    for (const wire of planned) {
      const from = wire.item.dataset.from ?? '';
      const to = wire.item.dataset.to ?? '';
      const d = wirePath(wire.from, wire.to, wire.ends, {
        from: offset(from, wire.ends.from, wire.index, wire.from.height),
        to: offset(to, wire.ends.to, wire.index, wire.to.height),
      });
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('class', 'cs-wire');
      group.style.setProperty('--i', String(wire.index));
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'cs-wire-line');
      path.setAttribute('pathLength', '1');
      const flow = document.createElementNS(SVG, 'path');
      flow.setAttribute('d', d);
      flow.setAttribute('class', 'cs-wire-flow');
      group.append(path, flow);
      if (!calm.matches) {
        // A packet of data travelling along the wire, from the source to the destination.
        const packet = document.createElementNS(SVG, 'circle');
        packet.setAttribute('r', '3');
        packet.setAttribute('class', 'cs-wire-packet');
        const motion = document.createElementNS(SVG, 'animateMotion');
        motion.setAttribute('dur', `${String(2.4 + (wire.index % 3) * 0.6)}s`);
        motion.setAttribute('begin', `${String(wire.index * 0.35)}s`);
        motion.setAttribute('repeatCount', 'indefinite');
        motion.setAttribute('path', d);
        packet.append(motion);
        group.append(packet);
      }
      svg.append(group);
      wires.push({ from, to, index: wire.index, path, flow });
    }
    if (active) light(active);
  };

  // Highlight state: a node lights its wires and neighbours; a flow lights itself and its ends.
  let active: { node?: string; flow?: number } | null = null;
  const light = (focus: { node?: string; flow?: number } | null) => {
    active = focus;
    figure.toggleAttribute('data-focus', focus !== null);
    const lit = new Set<string>();
    for (const wire of wires) {
      const on =
        focus !== null &&
        (focus.flow === wire.index || focus.node === wire.from || focus.node === wire.to);
      wire.path.parentElement?.toggleAttribute('data-on', on);
      if (on) lit.add(wire.from).add(wire.to);
    }
    for (const item of flows) {
      const index = Number(item.dataset.flow);
      const on =
        focus !== null &&
        (focus.flow === index ||
          focus.node === item.dataset.from ||
          focus.node === item.dataset.to);
      item.toggleAttribute('data-on', on);
      if (on) lit.add(item.dataset.from ?? '').add(item.dataset.to ?? '');
    }
    if (focus?.node) lit.add(focus.node);
    for (const [id, node] of nodes) node.toggleAttribute('data-on', lit.has(id));
  };

  // Pointing at a node lights it; keyboard users walk the same links with the step buttons,
  // which keeps a dozen nodes out of the tab order.
  for (const [id, node] of nodes) {
    node.addEventListener('pointerenter', () => {
      light({ node: id });
    });
    node.addEventListener('pointerleave', () => {
      light(null);
    });
  }

  // Step through the flows with the buttons, or by pointing at one.
  const steps = figure.querySelector<HTMLElement>('[data-arch-steps]');
  const count = figure.querySelector<HTMLElement>('[data-step-count]');
  const hint = figure.querySelector<HTMLElement>('[data-arch-hint]');
  const total = String(flows.length).padStart(2, '0');
  let step = -1;
  const goTo = (index: number) => {
    step = (index + flows.length) % flows.length;
    light({ flow: step });
    if (count) count.textContent = `${String(step + 1).padStart(2, '0')} / ${total}`;
  };
  if (flows.length > 0) {
    if (steps) steps.hidden = false;
    if (hint) hint.hidden = false;
    for (const button of steps?.querySelectorAll<HTMLButtonElement>('[data-step]') ?? []) {
      button.addEventListener('click', () => {
        goTo(step + Number(button.dataset.step));
      });
    }
    for (const item of flows) {
      const index = Number(item.dataset.flow);
      item.addEventListener('pointerenter', () => {
        goTo(index);
      });
      item.addEventListener('pointerleave', () => {
        light(null);
      });
    }
  }

  // Draw when the diagram comes near, then keep the wires on the nodes as the layout changes.
  let drawn = false;
  let frame = 0;
  const redraw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      drawn = true;
      draw();
      // The wires grow in once the reader reaches the diagram.
      requestAnimationFrame(() => {
        stage.dataset.drawn = '';
      });
    },
    { rootMargin: '0px 0px -20% 0px' },
  ).observe(stage);
  new ResizeObserver(() => {
    if (drawn) redraw();
  }).observe(stage);
  void document.fonts.ready.then(() => {
    if (drawn) redraw();
  });
};

/**
 * The screenshot gallery (ProjectGallery.astro): tabs that follow the row, an auto-advance that
 * waits while the reader points at it, focuses it or has scrolled away, and an enlarged view.
 */
const gallery = (root: HTMLElement) => {
  const track = root.querySelector<HTMLElement>('[data-gallery-track]');
  const tabsBox = root.querySelector<HTMLElement>('[data-gallery-tabs]');
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-go]')];
  if (!track || slides.length === 0) return;

  const DWELL = 6000;
  let current = 0;
  let timer = 0;
  let onScreen = false;
  let held = false;

  const show = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const slide = slides[index];
    if (!slide) return;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: calm.matches ? 'auto' : behavior,
    });
  };

  const mark = (index: number) => {
    current = index;
    tabs.forEach((tab, i) => {
      if (i === index) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    });
    schedule();
  };

  // Auto-advance only when it can be seen and nobody is reading or holding it.
  const schedule = () => {
    clearTimeout(timer);
    const playing = !calm.matches && onScreen && tabs.length > 1;
    root.toggleAttribute('data-playing', playing);
    root.toggleAttribute('data-paused', held);
    // Restart the progress bar of the current tab.
    const bar = tabs[current]?.querySelector<HTMLElement>('.cs-gallery-tab-bar span');
    if (bar) {
      bar.style.animation = 'none';
      bar.getBoundingClientRect(); // restarts the animation
      bar.style.animation = '';
    }
    if (playing && !held) {
      timer = window.setTimeout(() => {
        show((current + 1) % slides.length);
      }, DWELL);
    }
  };

  if (tabsBox) tabsBox.hidden = false;
  root.style.setProperty('--cs-dwell', `${String(DWELL)}ms`);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      show(index);
    });
  });

  // The slide nearest the centre of the row is the current one, whether it got there by swipe,
  // tab or timer. Measured once per frame while the row scrolls.
  let frame = 0;
  const follow = () => {
    frame = 0;
    const middle = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let distance = Infinity;
    slides.forEach((slide, index) => {
      const gap = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
      if (gap < distance) {
        distance = gap;
        nearest = index;
      }
    });
    if (nearest !== current || !tabs[current]?.hasAttribute('aria-current')) mark(nearest);
  };
  track.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(follow);
    },
    { passive: true },
  );
  follow();

  new IntersectionObserver(
    ([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      schedule();
    },
    { threshold: 0.35 },
  ).observe(root);

  const hold = (value: boolean) => () => {
    held = value;
    schedule();
  };
  root.addEventListener('pointerenter', hold(true));
  root.addEventListener('pointerleave', hold(false));
  root.addEventListener('focusin', hold(true));
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) hold(false)();
  });

  // The enlarged view: a native dialog, so Escape, focus trapping and the backdrop come built in.
  const dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]');
  const image = dialog?.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = dialog?.querySelector<HTMLElement>('[data-lightbox-caption]');
  const zooms = [...root.querySelectorAll<HTMLAnchorElement>('[data-zoom]')];
  if (!dialog || !image || !caption || typeof dialog.showModal !== 'function') return;
  let open = 0;
  const load = (index: number) => {
    open = (index + zooms.length) % zooms.length;
    const link = zooms[open];
    if (!link) return;
    image.src = link.href;
    image.alt = link.dataset.caption ?? '';
    caption.textContent = link.dataset.caption ?? '';
  };
  zooms.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      load(index);
      dialog.showModal();
    });
  });
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-lightbox-step]')) {
    button.addEventListener('click', () => {
      load(open + Number(button.dataset.lightboxStep));
    });
  }
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => {
    dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') load(open + 1);
    if (event.key === 'ArrowLeft') load(open - 1);
  });
  // A click on the backdrop (outside the content) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    show(open, 'auto');
  });
};

/**
 * The technologies band (TechBand.astro): it drifts on its own, can be grabbed and dragged either
 * way, keeps the momentum of a throw and loops without a seam (the track holds two equal halves).
 * Reduced motion stops the drift; dragging still works. Without this script it is a plain
 * scrollable row.
 */
const band = (root: HTMLElement) => {
  const track = root.querySelector<HTMLElement>('[data-band-track]');
  const half = track?.firstElementChild as HTMLElement | null;
  if (!track || !half) return;
  root.toggleAttribute('data-live', true);

  const DRIFT = 0.04; // px per ms, leftwards
  let offset = 0;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let lastTime = 0;
  let visible = false;
  let frame = 0;
  let previous = 0;

  const width = () => half.getBoundingClientRect().width;
  // The window is one round wide: a short stack makes a short band (capped at the screen).
  const fit = () => {
    root.style.setProperty('--cs-band-width', `${String(Math.ceil(width()))}px`);
  };
  new ResizeObserver(fit).observe(half);
  const place = () => {
    const w = width();
    if (w > 0) offset = ((offset % w) + w) % w; // keep it inside one half: seamless loop
    track.style.transform = `translate3d(${String(-offset)}px, 0, 0)`;
  };

  const tick = (now: number) => {
    const dt = Math.min(now - (previous || now), 48);
    previous = now;
    if (!dragging) {
      const target = calm.matches ? 0 : DRIFT;
      // A throw decays back to the drift speed.
      velocity += (target - velocity) * Math.min(1, dt / 600);
      offset += velocity * dt;
      place();
    }
    frame = visible ? requestAnimationFrame(tick) : 0;
  };
  const run = () => {
    if (!frame && visible) {
      previous = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    run();
  }).observe(root);

  root.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    velocity = 0;
    root.setPointerCapture(event.pointerId);
    root.toggleAttribute('data-dragging', true);
  });
  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dt = Math.max(event.timeStamp - lastTime, 1);
    offset -= dx;
    velocity = -dx / dt;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    place();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    root.removeAttribute('data-dragging');
    run();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  // Logos are images: dragging one must move the band, not start a native drag.
  root.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });
  place();
};

export const startCaseStudy = () => {
  chapterNav();
  countFigures();
  glow();
  for (const figure of document.querySelectorAll<HTMLElement>('[data-arch]')) diagram(figure);
  for (const root of document.querySelectorAll<HTMLElement>('[data-gallery]')) gallery(root);
  for (const root of document.querySelectorAll<HTMLElement>('[data-band]')) band(root);
};
