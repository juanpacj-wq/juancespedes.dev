import type { ContactField, ContactIssueCode } from '../../domain/contact/contact-request';
import type { Capability } from '../../domain/project/capability';
import type { ProjectKind } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';

/*
 * Interface strings. Content (projects, profile, metrics) lives in content/; this file only holds
 * the words of the interface itself. English is typed against Spanish, so a missing or extra key
 * in either language is a compile error.
 */

const es = {
  meta: {
    siteName: 'Juan Céspedes',
    defaultDescription:
      'Ingeniero de sistemas en Barranquilla: desarrollo full-stack, datos y automatización. Seis sistemas en producción, casos de estudio y servicios.',
  },
  a11y: {
    skipToContent: 'Saltar al contenido',
    mainNavigation: 'Navegación principal',
    external: '(se abre en otra pestaña)',
  },
  nav: {
    home: 'Inicio',
    notes: 'Notas',
    now: 'Ahora',
    projects: 'Proyectos',
    skills: 'Capacidades',
    services: 'Servicios',
    contact: 'Contacto',
  },
  language: {
    switchTo: 'Read this page in English',
    short: 'EN',
  },
  theme: {
    toLight: 'Cambiar a tema claro',
    toDark: 'Cambiar a tema oscuro',
  },
  availability: {
    available: 'Disponible para proyectos',
  },
  profile: {
    name: 'Juan Céspedes',
    role: 'Ingeniero de sistemas · full-stack · datos · automatización',
    location: 'Barranquilla, Colombia · remoto',
    portraitAlt: 'Retrato de Juan Céspedes',
  },
  footer: {
    builtInPublic: 'Construido en público.',
    sourceCode: 'Código fuente',
    rights: 'Contenido © Juan Pablo Céspedes. Código con licencia MIT.',
    privacy: 'Aviso de privacidad',
  },
  metric: {
    source: 'Fuente',
  },
  period: {
    present: 'hoy',
    to: 'a',
  },
  hero: {
    pitch:
      'Diseño, construyo y opero software en producción: aplicaciones web, datos y automatizaciones que hoy usan operación, compras y finanzas de una generadora de energía.',
    primaryCta: 'Ver proyectos',
    secondaryCta: 'Cuéntame tu proyecto',
    elsewhere: 'También en',
    intro: 'ingeniero de sistemas en Barranquilla',
    headline: 'Software que la operación usa todos los días.',
    scrollLead: 'Desliza',
    scrollTail: 'para ver los proyectos',
  },
  art: {
    alt: 'Narciso de Caravaggio dibujado con caracteres de texto: un joven se inclina sobre el borde del agua para mirar su reflejo.',
    caption: 'Narciso (detalle) · Caravaggio, hacia 1597-1599',
    characters: '{count} caracteres',
    lightOn: 'Encender la luz',
    lightOff: 'Apagar la luz',
  },
  about: {
    title: 'Quién está detrás',
    paragraphs: [
      'Escribo software desde 2020. Hoy construyo y opero los sistemas internos de una generadora de energía en el Caribe colombiano: portales, tableros y automatizaciones que la gente usa en cada turno.',
      'Soy ingeniero de sistemas de la Universidad del Norte, con matrícula profesional COPNIA. Trabajo por entregables, a precio fijo y en remoto, y me gusta que el resultado se pueda medir: menos horas manuales, menos errores y datos a tiempo.',
    ],
    localTime: 'Hora local',
  },
  metrics: {
    eyebrow: 'En cifras',
    title: 'Resultados que se pueden verificar',
  },
  projects: {
    eyebrow: 'Proyectos',
    title: 'Sistemas en producción y código abierto',
    description:
      'Casos reales. El código de los sistemas internos es privado, así que cada caso cuenta el problema, las decisiones y los resultados.',
    filterLabel: 'Filtrar por capacidad',
    filterAll: 'Todos',
    count: '{count} proyectos',
    countOne: '1 proyecto',
    empty: 'Todavía no hay proyectos publicados con esa capacidad.',
    stack: 'Tecnologías',
    anonymized: 'Anonimizado',
  },
  capabilities: {
    eyebrow: 'Capacidades',
    title: 'Cada habilidad, con el proyecto que la demuestra',
    description: 'Sin porcentajes ni barras: cada tecnología enlaza al trabajo donde la usé.',
    provenBy: 'Demostrado en',
  },
  experience: {
    eyebrow: 'Trayectoria',
    title: 'Experiencia y formación',
    work: 'Experiencia',
    education: 'Formación',
  },
  services: {
    eyebrow: 'Servicios',
    title: 'Servicios y precios',
    description:
      'Cuatro formas de trabajar conmigo, cada una con un precio de partida claro. Los detalles los ajustamos a tu proyecto en la primera conversación.',
    from: 'desde',
    scope: 'Alcance',
    featured: 'Lo que más hago',
    currencyNote: 'Valores en pesos colombianos (COP).',
    deliverables: 'Recibes',
    processTitle: 'Cómo trabajamos',
    cta: 'Cuéntame tu proyecto',
  },
  credentials: {
    eyebrow: 'Credenciales',
    title: 'Formación y certificaciones',
    verify: 'Verificar',
  },
  contact: {
    eyebrow: 'Contacto',
    title: 'Cuéntame qué necesitas',
    description:
      'Escríbeme por el formulario o directamente al correo. Respondo en menos de 24 horas hábiles.',
    emailLabel: 'Correo directo',
  },
  form: {
    name: 'Nombre',
    email: 'Correo electrónico',
    message: '¿En qué te puedo ayudar?',
    messageHint: 'Cuéntame el problema, el plazo y cualquier restricción que conozcas.',
    consent: 'Acepto el tratamiento de mis datos para responder esta solicitud, según el',
    consentLink: 'aviso de privacidad',
    submit: 'Enviar mensaje',
    sending: 'Enviando...',
    sent: '¡Gracias! Tu mensaje llegó. Te respondo pronto a tu correo.',
    noScript:
      'Para enviar el formulario se necesita JavaScript (verificación anti-spam). También puedes escribirme directamente al correo.',
    errors: {
      invalid: 'Revisa los campos marcados.',
      'rate-limited': 'Enviaste varios mensajes seguidos. Espera un minuto e inténtalo de nuevo.',
      'verification-failed':
        'No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.',
      'delivery-failed':
        'No se pudo entregar el mensaje. Inténtalo de nuevo o escríbeme directamente al correo.',
      network: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
    },
    fieldErrors: {
      'name.required': 'Escribe tu nombre.',
      'name.too-short': 'El nombre es muy corto.',
      'name.too-long': 'El nombre es muy largo.',
      'email.required': 'Escribe tu correo.',
      'email.invalid-email': 'Escribe un correo válido, por ejemplo nombre@empresa.com.',
      'email.too-long': 'El correo es muy largo.',
      'message.required': 'Cuéntame en qué te puedo ayudar.',
      'message.too-short': 'Dame un poco más de contexto (mínimo 20 caracteres).',
      'message.too-long': 'El mensaje supera los 5.000 caracteres.',
      'consent.consent-required': 'Necesito tu autorización para responderte.',
    },
  },
  project: {
    back: 'Todos los proyectos',
    facts: 'Ficha del proyecto',
    role: 'Rol',
    period: 'Periodo',
    kind: 'Tipo',
    stack: 'Tecnologías',
    links: 'Enlaces públicos',
    anonymizedNote:
      'Sistema interno: el código es privado, y los nombres, datos y diagramas se omitieron o se recrearon.',
    results: 'Resultados',
    problem: 'El problema',
    responsibilities: 'Mi rol',
    constraints: 'Restricciones',
    decisions: 'Decisiones',
    discarded: 'Descartado',
    architecture: 'Arquitectura',
    diagram: 'Diagrama de arquitectura',
    flows: 'Cómo se mueven los datos',
    flowTo: 'hacia',
    lessons: 'Qué haría distinto',
    businessQuestions: 'Preguntas que responde',
    dataSources: 'Fuentes de datos',
    highlightedMeasures: 'Medidas destacadas',
    tool: 'Herramienta',
    repository: 'Repositorio',
    license: 'Licencia',
    install: 'Instalación',
    platform: 'Plataforma',
    automates: 'Qué automatiza',
    more: 'Más proyectos',
    previous: 'Anterior',
    next: 'Siguiente',
  },
  chat: {
    eyebrow: 'Pregúntame',
    title: 'Pregúntale a mi portafolio',
    description:
      'Un asistente responde con base en lo publicado en este sitio: proyectos, experiencia y servicios, con enlace al caso.',
    label: 'Tu pregunta',
    placeholder: '¿Ha trabajado con Oracle?',
    submit: 'Preguntar',
    thinking: 'Pensando...',
    verifying: 'Verificando que eres una persona...',
    you: 'Tú',
    assistant: 'Asistente',
    suggestions: 'Ideas para empezar',
    example1: '¿Ha trabajado con Oracle?',
    example2: '¿Qué hizo en el portal corporativo?',
    example3: '¿Cómo trabaja en un proyecto freelance?',
    disclaimer:
      'Responde un modelo de IA (DeepSeek) solo con lo publicado aquí. Puede equivocarse, las conversaciones no se guardan y no debes escribir datos personales.',
    refused: 'No puedo responder esa pregunta. Prueba con otra sobre mi trabajo o escríbeme.',
    truncated: '(respuesta recortada)',
    clear: 'Nueva conversación',
    errors: {
      disabled:
        'El asistente no está disponible en este momento. Escríbeme directamente a {email}.',
      invalid: 'Escribe una pregunta de entre 3 y 500 caracteres.',
      'rate-limited': 'Hiciste varias preguntas seguidas. Espera un minuto e inténtalo de nuevo.',
      'verification-failed':
        'No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.',
      paused: 'El asistente está en pausa por ahora. Escríbeme directamente a {email}.',
      'visitor-limit': 'Llegaste al límite de preguntas de hoy. Escríbeme directamente a {email}.',
      'daily-limit': 'El asistente llegó a su límite de hoy. Escríbeme directamente a {email}.',
      failed: 'Algo falló al responder. Inténtalo de nuevo o escríbeme a {email}.',
      network: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
    },
  },
  palette: {
    open: 'Buscar',
    title: 'Buscar en el sitio',
    placeholder: 'Páginas, proyectos, notas o acciones',
    results: 'Resultados',
    empty: 'Nada coincide con esa búsqueda.',
    loading: 'Cargando...',
    close: 'Cerrar',
    hint: 'Flechas para moverte, Enter para abrir, Esc para cerrar',
    groups: {
      pages: 'Páginas',
      projects: 'Proyectos',
      notes: 'Notas',
      actions: 'Acciones',
    },
    toggleTheme: 'Cambiar entre tema claro y oscuro',
    switchLanguage: 'Ver esta página en inglés',
    copyEmail: 'Copiar mi correo',
    copied: 'Correo copiado',
  },
  notes: {
    eyebrow: 'Notas',
    title: 'Notas técnicas',
    description:
      'Cómo construí o resolví cosas concretas, con el detalle que no cabe en un caso de estudio.',
    published: 'Publicada el',
    updated: 'Actualizada el',
    tags: 'Temas',
    empty: 'Todavía no hay notas publicadas.',
    back: 'Todas las notas',
    contents: 'En esta nota',
  },
  now: {
    eyebrow: 'Ahora',
    title: 'En qué estoy ahora',
    description:
      'Lo que tiene mi atención en este momento: trabajo, lo que estoy construyendo y lo que estoy aprendiendo.',
    updated: 'Actualizada el',
    about: 'Qué es una página "ahora"',
  },
  notFound: {
    eyebrow: 'Error 404',
    title: 'Esta página no existe',
    description:
      'La dirección cambió o tiene un error. Los proyectos, los servicios y el contacto siguen en el inicio.',
    back: 'Volver al inicio',
  },
  capabilityLabels: {
    frontend: 'Frontend',
    backend: 'Backend',
    'data-bi': 'Datos y BI',
    'automation-ai': 'Automatización e IA',
    infrastructure: 'Infraestructura',
    'legacy-systems': 'Sistemas heredados',
  },
  kindLabels: {
    'case-study': 'Caso de estudio',
    report: 'Informe',
    'open-source': 'Código abierto',
    tool: 'Herramienta',
  },
} as const satisfies Record<string, unknown> & {
  capabilityLabels: Record<Capability, string>;
  kindLabels: Record<ProjectKind, string>;
  form: Record<string, unknown> & {
    fieldErrors: Partial<Record<`${ContactField}.${ContactIssueCode}`, string>>;
  };
};

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof es>;

const en: Dictionary = {
  meta: {
    siteName: 'Juan Céspedes',
    defaultDescription:
      'Systems engineer in Barranquilla, Colombia: full-stack development, data and automation. Six systems in production, case studies and services.',
  },
  a11y: {
    skipToContent: 'Skip to content',
    mainNavigation: 'Main navigation',
    external: '(opens in a new tab)',
  },
  nav: {
    home: 'Home',
    notes: 'Notes',
    now: 'Now',
    projects: 'Projects',
    skills: 'Capabilities',
    services: 'Services',
    contact: 'Contact',
  },
  language: {
    switchTo: 'Leer esta página en español',
    short: 'ES',
  },
  theme: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
  },
  availability: {
    available: 'Available for projects',
  },
  profile: {
    name: 'Juan Céspedes',
    role: 'Systems engineer · full-stack · data · automation',
    location: 'Barranquilla, Colombia · remote',
    portraitAlt: 'Portrait of Juan Céspedes',
  },
  footer: {
    builtInPublic: 'Built in public.',
    sourceCode: 'Source code',
    rights: 'Content © Juan Pablo Céspedes. Code under the MIT license.',
    privacy: 'Privacy notice',
  },
  metric: {
    source: 'Source',
  },
  period: {
    present: 'present',
    to: 'to',
  },
  hero: {
    pitch:
      'I design, build and run software in production: web applications, data and automations used today by the operations, procurement and finance teams of a power generation company.',
    primaryCta: 'See projects',
    secondaryCta: 'Tell me about your project',
    elsewhere: 'Also on',
    intro: 'systems engineer in Barranquilla, Colombia',
    headline: 'Software that operations teams use every day.',
    scrollLead: 'Scroll down',
    scrollTail: 'to see the projects',
  },
  art: {
    alt: "Caravaggio's Narcissus drawn with text characters: a young man leans over the edge of the water to look at his reflection.",
    caption: 'Narcissus (detail) · Caravaggio, about 1597-1599',
    characters: '{count} characters',
    lightOn: 'Turn on the light',
    lightOff: 'Turn off the light',
  },
  about: {
    title: "Who's behind the work",
    paragraphs: [
      'I have been writing software since 2020. Today I build and run the internal systems of a power generation company on the Colombian Caribbean coast: portals, dashboards and automations people use every shift.',
      'I am a systems engineer from Universidad del Norte, with a professional license (COPNIA). I work per deliverable, at a fixed price and remotely, and I like results you can measure: fewer manual hours, fewer errors and data on time.',
    ],
    localTime: 'Local time',
  },
  metrics: {
    eyebrow: 'By the numbers',
    title: 'Results you can verify',
  },
  projects: {
    eyebrow: 'Projects',
    title: 'Systems in production and open source',
    description:
      'Real cases. Internal systems are closed source, so each case explains the problem, the decisions and the results.',
    filterLabel: 'Filter by capability',
    filterAll: 'All',
    count: '{count} projects',
    countOne: '1 project',
    empty: 'No published projects with that capability yet.',
    stack: 'Technologies',
    anonymized: 'Anonymized',
  },
  capabilities: {
    eyebrow: 'Capabilities',
    title: 'Every skill, with the project that proves it',
    description: 'No percentages or bars: each technology links to the work where I used it.',
    provenBy: 'Proven in',
  },
  experience: {
    eyebrow: 'Background',
    title: 'Experience and education',
    work: 'Experience',
    education: 'Education',
  },
  services: {
    eyebrow: 'Services',
    title: 'Services and prices',
    description:
      'Four ways to work with me, each with a clear starting price. We adjust the details to your project in the first conversation.',
    from: 'from',
    scope: 'Scope',
    featured: 'My core work',
    currencyNote: 'Prices in US dollars (USD).',
    deliverables: 'You get',
    processTitle: 'How we work',
    cta: 'Tell me about your project',
  },
  credentials: {
    eyebrow: 'Credentials',
    title: 'Education and certifications',
    verify: 'Verify',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Tell me what you need',
    description: 'Use the form or write to me directly. I reply within one business day.',
    emailLabel: 'Direct email',
  },
  form: {
    name: 'Name',
    email: 'Email',
    message: 'How can I help?',
    messageHint: 'Tell me the problem, the timeline and any constraints you know of.',
    consent: 'I agree to the processing of my data to answer this request, under the',
    consentLink: 'privacy notice',
    submit: 'Send message',
    sending: 'Sending...',
    sent: 'Thank you! Your message arrived. I will reply to your email soon.',
    noScript:
      'The form needs JavaScript for spam protection. You can also write to me directly by email.',
    errors: {
      invalid: 'Please check the highlighted fields.',
      'rate-limited': 'You sent several messages in a row. Wait a minute and try again.',
      'verification-failed':
        'We could not verify that you are a person. Reload the page and try again.',
      'delivery-failed':
        'The message could not be delivered. Try again or write to me directly by email.',
      network: 'No connection. Check your internet and try again.',
    },
    fieldErrors: {
      'name.required': 'Please enter your name.',
      'name.too-short': 'The name is too short.',
      'name.too-long': 'The name is too long.',
      'email.required': 'Please enter your email.',
      'email.invalid-email': 'Enter a valid email, for example name@company.com.',
      'email.too-long': 'The email is too long.',
      'message.required': 'Tell me how I can help.',
      'message.too-short': 'Give me a bit more context (at least 20 characters).',
      'message.too-long': 'The message is longer than 5,000 characters.',
      'consent.consent-required': 'I need your consent to reply.',
    },
  },
  project: {
    back: 'All projects',
    facts: 'Project facts',
    role: 'Role',
    period: 'Period',
    kind: 'Type',
    stack: 'Technologies',
    links: 'Public links',
    anonymizedNote:
      'Internal system: the code is private, and names, data and diagrams were left out or recreated.',
    results: 'Results',
    problem: 'The problem',
    responsibilities: 'My role',
    constraints: 'Constraints',
    decisions: 'Decisions',
    discarded: 'Ruled out',
    architecture: 'Architecture',
    diagram: 'Architecture diagram',
    flows: 'How data moves',
    flowTo: 'to',
    lessons: 'What I would do differently',
    businessQuestions: 'Questions it answers',
    dataSources: 'Data sources',
    highlightedMeasures: 'Key measures',
    tool: 'Tool',
    repository: 'Repository',
    license: 'License',
    install: 'Installation',
    platform: 'Platform',
    automates: 'What it automates',
    more: 'More projects',
    previous: 'Previous',
    next: 'Next',
  },
  chat: {
    eyebrow: 'Ask me',
    title: 'Ask my portfolio',
    description:
      'An assistant answers from what is published on this site: projects, experience and services, with a link to the case.',
    label: 'Your question',
    placeholder: 'Has he worked with Oracle?',
    submit: 'Ask',
    thinking: 'Thinking...',
    verifying: 'Checking that you are a person...',
    you: 'You',
    assistant: 'Assistant',
    suggestions: 'Ideas to start',
    example1: 'Has he worked with Oracle?',
    example2: 'What did he do on the corporate portal?',
    example3: 'How does he work on a freelance project?',
    disclaimer:
      'An AI model (DeepSeek) answers only from what is published here. It can be wrong, conversations are not stored, and you should not write personal data.',
    refused: 'I cannot answer that question. Try another one about my work, or write to me.',
    truncated: '(answer cut short)',
    clear: 'New conversation',
    errors: {
      disabled: 'The assistant is not available right now. Write to me directly at {email}.',
      invalid: 'Write a question between 3 and 500 characters.',
      'rate-limited': 'You asked several questions in a row. Wait a minute and try again.',
      'verification-failed':
        'We could not verify that you are a person. Reload the page and try again.',
      paused: 'The assistant is paused for now. Write to me directly at {email}.',
      'visitor-limit': 'You reached today’s question limit. Write to me directly at {email}.',
      'daily-limit': 'The assistant reached its limit for today. Write to me directly at {email}.',
      failed: 'Something went wrong answering. Try again or write to me at {email}.',
      network: 'No connection. Check your internet and try again.',
    },
  },
  palette: {
    open: 'Search',
    title: 'Search the site',
    placeholder: 'Pages, projects, notes or actions',
    results: 'Results',
    empty: 'Nothing matches that search.',
    loading: 'Loading...',
    close: 'Close',
    hint: 'Arrows to move, Enter to open, Esc to close',
    groups: {
      pages: 'Pages',
      projects: 'Projects',
      notes: 'Notes',
      actions: 'Actions',
    },
    toggleTheme: 'Switch between light and dark theme',
    switchLanguage: 'View this page in Spanish',
    copyEmail: 'Copy my email address',
    copied: 'Email address copied',
  },
  notes: {
    eyebrow: 'Notes',
    title: 'Technical notes',
    description:
      'How I built or solved specific things, with the detail that does not fit in a case study.',
    published: 'Published on',
    updated: 'Updated on',
    tags: 'Topics',
    empty: 'No published notes yet.',
    back: 'All notes',
    contents: 'In this note',
  },
  now: {
    eyebrow: 'Now',
    title: 'What I am doing now',
    description:
      'What has my attention at this moment: work, what I am building and what I am learning.',
    updated: 'Updated on',
    about: 'What a "now" page is',
  },
  notFound: {
    eyebrow: 'Error 404',
    title: 'This page does not exist',
    description:
      'The address changed or has a typo. Projects, services and contact are still on the home page.',
    back: 'Back to home',
  },
  capabilityLabels: {
    frontend: 'Frontend',
    backend: 'Backend',
    'data-bi': 'Data and BI',
    'automation-ai': 'Automation and AI',
    infrastructure: 'Infrastructure',
    'legacy-systems': 'Legacy systems',
  },
  kindLabels: {
    'case-study': 'Case study',
    report: 'Report',
    'open-source': 'Open source',
    tool: 'Tool',
  },
};

const dictionaries: Readonly<Record<Locale, Dictionary>> = { es, en };

export const dictionaryFor = (locale: Locale): Dictionary => dictionaries[locale];
