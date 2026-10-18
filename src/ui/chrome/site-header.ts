/**
 * The site header's one script: its motion (the pill that follows the pointer across the menu,
 * the menu item of the section being read, the rolling labels and the scrambled name on the
 * logo) and the projects menu that opens from its item. Plain DOM, no framework (ADR 0009). The
 * motion is decoration; the header works the same without it.
 */

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz<>/{}[]=+*#';

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Moves the pill under one item; without a target it fades out where it is. */
const placePill = (list: HTMLElement, pill: HTMLElement, target: HTMLElement | null): void => {
  if (!target) {
    delete list.dataset.pillOn;
    return;
  }
  const first = !('pillOn' in list.dataset);
  if (first) list.dataset.pillJump = '';
  pill.style.setProperty('--pill-x', `${String(target.offsetLeft)}px`);
  pill.style.setProperty('--pill-w', `${String(target.offsetWidth)}px`);
  list.dataset.pillOn = '';
  if (!first) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      delete list.dataset.pillJump;
    });
  });
};

const mountPill = (list: HTMLElement): void => {
  const pill = list.querySelector<HTMLElement>('[data-nav-pill]');
  if (!pill) return;
  const links = [...list.querySelectorAll<HTMLElement>('.nav-link')];
  for (const link of links) {
    link.addEventListener('pointerenter', () => {
      placePill(list, pill, link);
    });
    link.addEventListener('focus', () => {
      placePill(list, pill, link);
    });
    link.addEventListener('blur', () => {
      placePill(list, pill, null);
    });
  }
  list.addEventListener('pointerleave', () => {
    placePill(list, pill, null);
  });
};

/**
 * Marks the menu link of the home section that crosses the middle of the screen. Links to other
 * pages are left alone; aria-current="location" tells assistive technology the same thing.
 */
const mountSectionSpy = (list: HTMLElement): void => {
  const links = new Map<Element, HTMLAnchorElement>();
  for (const link of list.querySelectorAll<HTMLAnchorElement>('a.nav-link[href^="#"]')) {
    const section = document.getElementById(link.hash.slice(1));
    if (section) links.set(section, link);
  }
  if (links.size === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = links.get(entry.target);
        if (!link) continue;
        if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  for (const section of links.keys()) observer.observe(section);
};

/**
 * The projects menu: a disclosure that opens on hover (after a short pause, so a pointer passing
 * by does not flash it) or from its arrow button, and closes on Escape, on a click elsewhere and
 * when focus leaves it. Its screenshots load the first time it opens; the preview shows the
 * project under the pointer or the focus, and the first project until then.
 */
const mountMenu = (menu: HTMLElement): void => {
  const toggle = menu.querySelector<HTMLButtonElement>('[data-nav-menu-toggle]');
  const panel = menu.querySelector<HTMLElement>('[data-nav-menu-panel]');
  if (!toggle || !panel) return;
  let hover = 0;
  let hide = 0;
  let loaded = false;
  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';

  const preview = (slug: string | undefined): void => {
    if (!slug) return;
    for (const each of panel.querySelectorAll<HTMLElement>('[data-preview], .nav-menu-project')) {
      each.toggleAttribute(
        'data-current',
        (each.dataset.preview ?? each.dataset.menuPreview) === slug,
      );
    }
  };
  const previewFrom = (event: Event): void => {
    const link = (event.target as Element).closest<HTMLElement>('[data-menu-preview]');
    if (link) preview(link.dataset.menuPreview);
  };
  panel.addEventListener('pointerover', previewFrom);
  panel.addEventListener('focusin', previewFrom);
  preview(panel.querySelector<HTMLElement>('[data-menu-preview]')?.dataset.menuPreview);

  const set = (open: boolean): void => {
    clearTimeout(hover);
    if (open === isOpen()) return;
    toggle.setAttribute('aria-expanded', String(open));
    clearTimeout(hide);
    if (open) {
      if (!loaded) {
        loaded = true;
        for (const shot of panel.querySelectorAll<HTMLImageElement>('img[data-src]')) {
          shot.src = shot.dataset.src ?? '';
        }
      }
      panel.hidden = false;
      // One frame shown before it moves, so it rises in instead of appearing in place.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isOpen()) panel.dataset.open = '';
        });
      });
    } else {
      delete panel.dataset.open;
      hide = window.setTimeout(
        () => {
          if (!isOpen()) panel.hidden = true;
        },
        reducedMotion() ? 0 : 200,
      );
    }
  };
  const later = (open: boolean, delay: number): void => {
    clearTimeout(hover);
    hover = window.setTimeout(() => {
      set(open);
    }, delay);
  };

  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') later(true, 120);
  });
  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') later(false, 220);
  });
  toggle.addEventListener('click', () => {
    set(!isOpen());
  });
  // On the document: Safari does not focus a button on click, so the key may not reach the menu.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    set(false);
    toggle.focus();
  });
  menu.addEventListener('focusout', (event) => {
    if (!menu.contains(event.relatedTarget as Node | null)) set(false);
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target as Node)) set(false);
  });
  // A link to an area of this page opens it in place; the menu steps out of the way.
  panel.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) set(false);
  });
};

/** The logo's letters shuffle through code glyphs and settle from left to right. */
const mountScramble = (logo: HTMLElement): void => {
  const text = logo.querySelector<HTMLElement>('[data-scramble-text]');
  if (!text) return;
  const word = text.textContent;
  const letters = Array.from(word);
  let frame = 0;
  const run = (): void => {
    if (reducedMotion() || frame !== 0) return;
    const started = performance.now();
    const step = (now: number): void => {
      const settled = Math.floor((now - started) / 32);
      text.textContent = letters
        .map((char, index) =>
          index < settled ? char : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? char),
        )
        .join('');
      if (settled < letters.length) frame = requestAnimationFrame(step);
      else {
        text.textContent = word;
        frame = 0;
      }
    };
    frame = requestAnimationFrame(step);
  };
  logo.addEventListener('pointerenter', run);
  logo.addEventListener('focus', run);
};

/**
 * Splits a rolling label into letters: the word stays for screen readers, the letters are
 * decoration. Each letter is its own inline block, where a plain space would collapse to nothing.
 */
const splitLabel = (label: HTMLElement): void => {
  const word = label.textContent;
  const hidden = document.createElement('span');
  hidden.className = 'sr-only';
  hidden.textContent = word;
  const track = document.createElement('span');
  track.className = 'roll-track';
  track.setAttribute('aria-hidden', 'true');
  Array.from(word).forEach((char, index) => {
    const letter = document.createElement('span');
    letter.className = 'roll-char';
    letter.style.setProperty('--i', String(index));
    letter.textContent = char === ' ' ? String.fromCharCode(160) : char;
    track.append(letter);
  });
  label.replaceChildren(hidden, track);
};

export const mountSiteHeader = (): void => {
  for (const roll of document.querySelectorAll<HTMLElement>('[data-roll]')) splitLabel(roll);
  for (const list of document.querySelectorAll<HTMLElement>('[data-nav]')) {
    mountPill(list);
    mountSectionSpy(list);
  }
  for (const menu of document.querySelectorAll<HTMLElement>('[data-nav-menu]')) mountMenu(menu);
  for (const logo of document.querySelectorAll<HTMLElement>('[data-scramble]')) mountScramble(logo);
};
