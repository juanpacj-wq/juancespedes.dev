import type { ChatTurn } from '../../domain/chat/question';
import { loadTurnstile } from '../islands/turnstile';
import { linkify } from './linkify';

/*
 * Behaviour of the floating "Ask me" chat (ChatDrawer.astro, ADR 0017). Plain DOM, no framework:
 * it is on every page, so it must stay small. Answers stream from /api/chat as newline-delimited
 * JSON and are written with textContent; only paths of this site become links (linkify), so
 * model output never reaches the page as markup.
 */

interface Turn extends ChatTurn {
  readonly note?: string;
}

interface ChatText {
  readonly thinking: string;
  readonly verifying: string;
  readonly refused: string;
  readonly truncated: string;
  readonly you: string;
  readonly assistant: string;
  readonly caseLink: string;
  readonly errors: Readonly<Record<string, string>>;
}

interface PaletteEntry {
  readonly group: string;
  readonly label: string;
  readonly hint: string | null;
  readonly href: string | null;
}

const STORE_KEY = 'askme:conversation';
const STORED_TURNS = 20;
const PROJECT_PATH = /^\/(?:proyectos|en\/projects)\/[a-z0-9-]+$/;

/** Turns kept for this tab only, so the conversation follows the visitor between pages. */
const loadTurns = (): Turn[] => {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (turn): turn is Turn =>
        typeof turn === 'object' &&
        turn !== null &&
        ((turn as Turn).role === 'user' || (turn as Turn).role === 'assistant') &&
        typeof (turn as Turn).text === 'string',
    );
  } catch {
    return [];
  }
};

const saveTurns = (turns: readonly Turn[]) => {
  try {
    if (turns.length === 0) sessionStorage.removeItem(STORE_KEY);
    else sessionStorage.setItem(STORE_KEY, JSON.stringify(turns.slice(-STORED_TURNS)));
  } catch {
    // Storage blocked or full: the conversation still works for this page.
  }
};

const required = <T extends Element>(
  root: ParentNode,
  selector: string,
  type: abstract new () => T,
): T => {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`Chat markup is missing ${selector}`);
  return element;
};

export const initChatDrawer = (root: HTMLElement): void => {
  const panel = required(root, '[data-chat-panel]', HTMLElement);
  const trigger = required(root, '.chat-trigger', HTMLButtonElement);
  const tooltip = required(root, '[data-chat-tooltip]', HTMLElement);
  const orb = required(root, '[data-chat-orb]', HTMLElement);
  const log = required(root, '[data-chat-messages]', HTMLElement);
  const intro = required(root, '[data-chat-intro]', HTMLElement);
  const form = required(root, '[data-chat-form]', HTMLFormElement);
  const input = required(root, '[data-chat-input]', HTMLInputElement);
  const send = required(root, '[data-chat-send]', HTMLButtonElement);
  const status = required(root, '[data-chat-status]', HTMLElement);
  const widget = required(root, '[data-chat-turnstile]', HTMLElement);
  const infoToggle = required(root, '[data-chat-info-toggle]', HTMLButtonElement);
  const info = required(root, '[data-chat-info]', HTMLElement);
  const closeButton = required(root, '[data-chat-close]', HTMLButtonElement);
  const linkTemplate = required(root, '[data-chat-link-template]', HTMLTemplateElement);
  const examples = [...root.querySelectorAll<HTMLButtonElement>('[data-chat-example]')];
  const openers = [...document.querySelectorAll<HTMLElement>('[data-chat-open]')];

  const text = JSON.parse(root.dataset.text ?? '{}') as ChatText;
  const locale = root.dataset.locale ?? 'es';
  const endpoint = root.dataset.endpoint ?? '/api/chat';
  const siteKey = root.dataset.siteKey ?? '';
  const min = Number(root.dataset.min ?? '3');
  const max = Number(root.dataset.max ?? '500');
  const wide = matchMedia('(min-width: 48rem)');
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');

  let turns = loadTurns();
  let rendered = false;
  let token = '';
  let widgetId: string | null = null;
  let turnstileStarted = false;
  let pending = false;
  let error: string | null = null;
  let titles: Promise<ReadonlyMap<string, PaletteEntry>> | null = null;

  // ---------- State shown in the controls ----------

  const update = () => {
    const ready = !pending && token !== '';
    send.disabled = !ready || input.value.trim() === '';
    for (const example of examples) example.disabled = !ready;
    status.textContent = error ?? (pending ? text.thinking : token ? '' : text.verifying);
  };

  const setError = (code: string | null) => {
    error = code === null ? null : (text.errors[code] ?? text.errors.failed ?? '');
    update();
  };

  const scrollToEnd = () => {
    log.scrollTop = log.scrollHeight;
  };

  // ---------- Messages ----------

  const hideIntro = () => {
    intro.hidden = true;
    log.dataset.active = '';
  };

  const writeAnswer = (bubble: HTMLElement, answer: string) => {
    bubble.replaceChildren(
      ...linkify(answer).map((part) => {
        if (part.kind === 'text') return document.createTextNode(part.text);
        const link = document.createElement('a');
        link.href = part.href;
        link.textContent = part.label;
        return link;
      }),
    );
  };

  const appendMessage = (role: Turn['role'], content = '') => {
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.dataset.role = role;
    const who = document.createElement('span');
    who.className = 'sr-only';
    who.textContent = `${role === 'user' ? text.you : text.assistant}: `;
    const bubble = document.createElement('p');
    bubble.className = 'chat-bubble';
    if (role === 'assistant') writeAnswer(bubble, content);
    else bubble.textContent = content;
    bubble.prepend(who);
    message.append(bubble);
    log.append(message);
    scrollToEnd();
    return { message, bubble, who };
  };

  const appendNote = (message: HTMLElement, note: string) => {
    const element = document.createElement('p');
    element.className = 'chat-note';
    element.textContent = note;
    message.append(element);
  };

  /** Case studies named in the answer, as cards with their real title (from the palette index). */
  const appendLinkCards = async (message: HTMLElement, answer: string) => {
    const hrefs = [
      ...new Set(
        linkify(answer)
          .flatMap((part) => (part.kind === 'link' ? [part.href] : []))
          .filter((href) => PROJECT_PATH.test(href)),
      ),
    ].slice(0, 3);
    if (hrefs.length === 0) return;
    titles ??= fetch(`/palette/${locale}.json`)
      .then((response) => response.json() as Promise<readonly PaletteEntry[]>)
      .then(
        (entries) => new Map(entries.flatMap((entry) => (entry.href ? [[entry.href, entry]] : []))),
      )
      .catch(() => new Map<string, PaletteEntry>());
    const index = await titles;
    const list = document.createElement('div');
    list.className = 'flex flex-col gap-2';
    for (const href of hrefs) {
      const card = linkTemplate.content.firstElementChild?.cloneNode(true);
      if (!(card instanceof HTMLAnchorElement)) continue;
      card.href = href;
      const hint = card.querySelector<HTMLElement>('[data-hint]');
      const label = card.querySelector<HTMLElement>('[data-label]');
      if (hint) hint.textContent = index.get(href)?.hint ?? text.caseLink;
      if (label) label.textContent = index.get(href)?.label ?? href;
      list.append(card);
    }
    message.append(list);
    scrollToEnd();
  };

  const renderConversation = () => {
    if (rendered) return;
    rendered = true;
    if (turns.length === 0) return;
    hideIntro();
    for (const turn of turns) {
      const { message } = appendMessage(turn.role, turn.text);
      if (turn.note) appendNote(message, turn.note);
      if (turn.role === 'assistant') void appendLinkCards(message, turn.text);
    }
  };

  // ---------- Human verification ----------

  const startTurnstile = () => {
    if (turnstileStarted) return;
    turnstileStarted = true;
    update();
    loadTurnstile()
      .then((turnstile) => {
        widgetId = turnstile.render(widget, {
          sitekey: siteKey,
          language: locale,
          theme: 'dark',
          appearance: 'interaction-only',
          callback: (value: string) => {
            token = value;
            update();
          },
          'expired-callback': () => {
            token = '';
            update();
          },
        });
      })
      .catch(() => {
        turnstileStarted = false;
        setError('network');
      });
  };

  /** A Turnstile token is good for one verification: ask for a new one after every question. */
  const freshToken = () => {
    token = '';
    if (widgetId) window.turnstile?.reset(widgetId);
  };

  // ---------- Asking ----------

  const ask = async (asked: string) => {
    const question = asked.trim();
    if (pending || !token) return;
    if (question.length < min || question.length > max) {
      setError('invalid');
      return;
    }
    const history = turns.map(({ role, text: said }) => ({ role, text: said }));
    setError(null);
    hideIntro();
    const user = appendMessage('user', question);
    turns.push({ role: 'user', text: question });
    saveTurns(turns);
    input.value = '';

    const typing = document.createElement('div');
    typing.className = 'chat-message';
    typing.dataset.role = 'assistant';
    typing.innerHTML =
      '<p class="chat-bubble chat-typing"><span></span><span></span><span></span></p>';
    typing.setAttribute('aria-hidden', 'true');
    log.append(typing);
    log.setAttribute('aria-busy', 'true');
    scrollToEnd();
    pending = true;
    update();

    let answer = '';
    let note: string | undefined;
    let reply: ReturnType<typeof appendMessage> | null = null;
    const giveBack = (code: string) => {
      // Nothing was answered: take the question back so it can be sent again.
      user.message.remove();
      reply?.message.remove();
      turns.pop();
      saveTurns(turns);
      input.value = question;
      setError(code);
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ question, history, locale, token }),
      });
      typing.remove();
      if (!response.ok || !response.body) {
        const problem = (await response.json().catch(() => ({}))) as { code?: unknown };
        giveBack(typeof problem.code === 'string' ? problem.code : 'failed');
        return;
      }
      reply = appendMessage('assistant');
      const cursor = document.createElement('span');
      cursor.className = 'chat-cursor';
      reply.bubble.append(cursor);

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as { type: string; text?: string; outcome?: string };
          if (event.type === 'text' && event.text) {
            answer += event.text;
            reply.bubble.replaceChildren(reply.who, answer, cursor);
            scrollToEnd();
          } else if (event.type === 'done' && event.outcome === 'refused') {
            answer = text.refused;
          } else if (event.type === 'done' && event.outcome === 'truncated') {
            note = text.truncated;
          } else if (event.type === 'error') {
            setError('failed');
          }
        }
      }
      if (answer === '') {
        giveBack('failed');
        return;
      }
      writeAnswer(reply.bubble, answer);
      reply.bubble.prepend(reply.who);
      if (note) appendNote(reply.message, note);
      turns.push(
        note ? { role: 'assistant', text: answer, note } : { role: 'assistant', text: answer },
      );
      saveTurns(turns);
      void appendLinkCards(reply.message, answer);
    } catch {
      typing.remove();
      if (answer === '') giveBack('network');
      else setError('network');
    } finally {
      log.removeAttribute('aria-busy');
      pending = false;
      freshToken();
      update();
    }
  };

  // ---------- Opening and closing ----------

  const isOpen = () => panel.hasAttribute('data-open');

  const open = () => {
    renderConversation();
    panel.dataset.open = '';
    panel.inert = false;
    for (const opener of openers) opener.setAttribute('aria-expanded', 'true');
    tooltip.removeAttribute('data-shown');
    startTurnstile();
    // On a phone the keyboard would cover the panel: focus the close button instead.
    (wide.matches ? input : closeButton).focus({ preventScroll: true });
    scrollToEnd();
  };

  const close = () => {
    const hadFocus = panel.contains(document.activeElement);
    panel.removeAttribute('data-open');
    panel.inert = true;
    for (const opener of openers) opener.setAttribute('aria-expanded', 'false');
    info.hidden = true;
    infoToggle.setAttribute('aria-expanded', 'false');
    if (hadFocus) trigger.focus({ preventScroll: true });
  };

  const reset = () => {
    turns = [];
    saveTurns(turns);
    for (const child of [...log.children]) if (child !== intro) child.remove();
    intro.hidden = false;
    delete log.dataset.active;
    setError(null);
  };

  for (const opener of openers) {
    opener.addEventListener('click', () => {
      if (isOpen()) close();
      else open();
    });
  }
  closeButton.addEventListener('click', close);
  required(root, '[data-chat-reset]', HTMLButtonElement).addEventListener('click', reset);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  infoToggle.addEventListener('click', () => {
    info.hidden = !info.hidden;
    infoToggle.setAttribute('aria-expanded', String(!info.hidden));
  });

  for (const example of examples) {
    example.addEventListener('click', () => {
      void ask(example.textContent);
    });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void ask(input.value);
  });
  input.addEventListener('input', () => {
    if (error) setError(null);
    else update();
  });

  // ---------- The sphere ----------

  if (motion.matches) {
    // The liquid turns slowly and quickens under the pointer (the reference's Lottie speeds).
    const spin = orb.animate([{ rotate: '0deg' }, { rotate: '360deg' }], {
      duration: 9000,
      iterations: Infinity,
    });
    trigger.addEventListener('pointerenter', () => {
      spin.updatePlaybackRate(4);
    });
    trigger.addEventListener('pointerleave', () => {
      spin.updatePlaybackRate(1);
    });
  }

  // The tooltip introduces the sphere once, after it appears, unless the panel is already open.
  setTimeout(() => {
    if (isOpen()) return;
    tooltip.dataset.shown = '';
    setTimeout(() => {
      tooltip.removeAttribute('data-shown');
    }, 5000);
  }, 3000);

  update();
};
