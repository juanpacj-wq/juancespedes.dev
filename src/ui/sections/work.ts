/**
 * The areas of work on the home page (ProjectsSection): turns the jump links above the projects
 * into tabs. One area shows at a time; switching keeps the reader where the section starts, so a
 * new area always opens on its first project. Links that point to an area (`/#work-analytics`
 * from the header menu, the "next" link at the end of a stage) open it the same way.
 *
 * Plain DOM, no framework (ADR 0009). Without this script every area shows, one after another.
 */

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const mountWork = (): void => {
  const work = document.querySelector<HTMLElement>('[data-work]');
  if (!work) return;
  const head = work.querySelector<HTMLElement>('.work-head');
  const list = work.querySelector<HTMLElement>('[data-work-tabs]');
  const pill = work.querySelector<HTMLElement>('[data-work-pill]');
  const tabs = [...work.querySelectorAll<HTMLAnchorElement>('[data-work-tab]')];
  const panels = new Map(
    [...work.querySelectorAll<HTMLElement>('[data-work-panel]')].map((panel) => [panel.id, panel]),
  );
  const blurbs = [...work.querySelectorAll<HTMLElement>('[data-work-blurb]')];
  if (!head || !list || tabs.length === 0) return;

  let active = tabs[0]?.dataset.workTab ?? '';

  // Tabs for assistive technology: one tab stop, arrows move between areas.
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', list.closest('nav')?.getAttribute('aria-label') ?? '');
  for (const item of list.children) item.setAttribute('role', 'presentation');
  for (const tab of tabs) {
    const id = tab.dataset.workTab ?? '';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id);
    const panel = panels.get(id);
    panel?.setAttribute('role', 'tabpanel');
    panel?.setAttribute('aria-labelledby', tab.id);
  }

  /*
   * The title and the tabs stick above the stage while it plays (project-stage.css), which needs
   * their height; it changes with the width and with the length of each area's line.
   */
  const measure = () => {
    work.style.setProperty('--work-head', `${String(head.offsetHeight)}px`);
  };
  new ResizeObserver(measure).observe(head);

  const placePill = () => {
    const tab = tabs.find((each) => each.dataset.workTab === active);
    if (!pill || !tab) return;
    pill.style.setProperty('--pill-x', `${String(tab.offsetLeft)}px`);
    pill.style.setProperty('--pill-w', `${String(tab.offsetWidth)}px`);
  };
  new ResizeObserver(placePill).observe(list);

  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  /** How far from the top the section's title rests: below the header, or where the stage pins. */
  const restingTop = () => (work.querySelector('[data-stage-ready]') ? 5.5 : 5) * rem();
  const startOf = () => work.getBoundingClientRect().top + scrollY - restingTop();

  const show = (id: string, enter: boolean) => {
    if (!panels.has(id)) return;
    const changed = id !== active;
    active = id;
    for (const tab of tabs) {
      const selected = tab.dataset.workTab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const [panelId, panel] of panels) {
      panel.hidden = panelId !== id;
      if (panelId === id && changed && enter && !reducedMotion()) {
        panel.dataset.workEnter = '';
        panel.addEventListener(
          'animationend',
          () => {
            delete panel.dataset.workEnter;
          },
          { once: true },
        );
      }
    }
    for (const blurb of blurbs) blurb.hidden = blurb.dataset.workBlurb !== id;
    placePill();
    if (changed) dispatchEvent(new Event('work:show'));
  };

  /**
   * Opens an area. A reader already inside the section goes back to where it starts, so the new
   * area opens on its first project under the same title; one coming from elsewhere scrolls
   * there.
   */
  const open = (id: string, from: 'tab' | 'link') => {
    const inside = work.getBoundingClientRect().top < restingTop() - 1;
    show(id, true);
    history.replaceState(null, '', `#${id}`);
    if (inside) scrollTo({ top: startOf(), behavior: 'instant' });
    else if (from === 'link') {
      scrollTo({ top: startOf(), behavior: reducedMotion() ? 'instant' : 'smooth' });
    }
  };

  list.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLAnchorElement>('[data-work-tab]');
    if (!tab) return;
    event.preventDefault();
    open(tab.dataset.workTab ?? '', 'tab');
  });

  list.addEventListener('keydown', (event) => {
    const index = tabs.findIndex((tab) => tab.dataset.workTab === active);
    const target = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const tab = tabs[(target + tabs.length) % tabs.length];
    if (!tab) return;
    open(tab.dataset.workTab ?? '', 'tab');
    tab.focus();
  });

  // Any link to an area on this page: the header menu, the "next" link under a stage.
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-work-goto]');
    if (link?.pathname !== location.pathname || !panels.has(link.hash.slice(1))) return;
    event.preventDefault();
    open(link.hash.slice(1), 'link');
  });

  // The address names an area: open on it (a link from another page, a shared address).
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (!panels.has(id)) return;
    show(id, false);
    scrollTo({ top: startOf(), behavior: 'instant' });
  };
  addEventListener('hashchange', fromHash);

  work.dataset.workReady = '';
  measure();
  show(active, false);
  fromHash();
};
