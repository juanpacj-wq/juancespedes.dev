/**
 * The site header's one script: the theme switch and the header's motion (the pill that follows
 * the pointer across the menu, the menu item of the section being read, the rolling labels and
 * the scrambled name on the logo). Plain DOM, no framework (ADR 0009). The motion is decoration;
 * the header works the same without it.
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
  for (const link of list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
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

/**
 * The new theme spreads as a circle from its switch over the old one. Without view transitions,
 * or with reduced motion, it simply applies.
 */
const spreadTheme = (button: HTMLElement, apply: () => void): void => {
  if (typeof document.startViewTransition !== 'function' || reducedMotion()) {
    apply();
    return;
  }
  const box = button.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;
  root.dataset.themeSpread = '';
  const transition = document.startViewTransition(apply);
  void transition.ready.then(() =>
    root.animate(
      {
        clipPath: [
          `circle(0px at ${String(x)}px ${String(y)}px)`,
          `circle(${String(radius)}px at ${String(x)}px ${String(y)}px)`,
        ],
      },
      {
        duration: 650,
        easing: getComputedStyle(root).getPropertyValue('--ease-out').trim() || 'ease-out',
        pseudoElement: '::view-transition-new(root)',
      },
    ),
  );
  void transition.finished.finally(() => delete root.dataset.themeSpread);
};

const STORAGE_KEY = 'theme';

const currentTheme = (): 'light' | 'dark' =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const labelToggle = (button: HTMLButtonElement): void => {
  const next = currentTheme() === 'dark' ? button.dataset.toLight : button.dataset.toDark;
  if (next) button.setAttribute('aria-label', next);
};

/** Light/dark switch: flips data-theme, remembers the choice and relabels the button. */
const mountThemeToggle = (): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.theme-toggle')) {
    labelToggle(button);
    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      const apply = (): void => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Storage can be unavailable (private mode); the theme still applies for this page.
        }
        labelToggle(button);
      };
      spreadTheme(button, apply);
    });
  }
};

export const mountSiteHeader = (): void => {
  mountThemeToggle();
  for (const roll of document.querySelectorAll<HTMLElement>('[data-roll]')) splitLabel(roll);
  for (const list of document.querySelectorAll<HTMLElement>('[data-nav]')) {
    mountPill(list);
    mountSectionSpy(list);
  }
  for (const logo of document.querySelectorAll<HTMLElement>('[data-scramble]')) mountScramble(logo);
};
