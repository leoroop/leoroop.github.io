(() => {
  const SUPPORTED_LANGS = ['en', 'it', 'fr'];
  const DEFAULT_LANG = 'en';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);

  // ===== SVG icons =====
  const icons = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.04c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a10.94 10.94 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    martial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>',
    mountain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-10 4 6 3-4 5 8z"/><circle cx="17" cy="6" r="1.5"/></svg>',
    controller: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="11" rx="5.5"/><line x1="7" y1="11" x2="7" y2="15"/><line x1="5" y1="13" x2="9" y2="13"/><circle cx="16" cy="11.5" r="0.8" fill="currentColor"/><circle cx="18" cy="13.5" r="0.8" fill="currentColor"/></svg>',
  };

  const COLOR_COUNT = 8;
  const colorHash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h % COLOR_COUNT;
  };

  const tagList = (tags = [], colored = false) =>
    tags.length
      ? `<ul class="tag-list">${tags.map((t) => `<li${colored ? ` data-color="${colorHash(t)}"` : ''}>${esc(t)}</li>`).join('')}</ul>`
      : '';

  // ===== Renderers =====
  const renderBrand = (p) => {
    const brand = document.getElementById('brand');
    if (!brand) return;
    brand.querySelector('.brand-mark').innerHTML = '<img src="Avatar.jpg" alt="" aria-hidden="true" />';
    brand.querySelector('.brand-name').textContent = p.brandName || '';
  };

  const renderNav = (p) => {
    const root = document.getElementById('nav-links');
    if (!root || !p.nav) return;
    root.innerHTML = `
      <a href="#chat">${esc(p.nav.chat)}</a>
      <a href="#experience">${esc(p.nav.experience)}</a>
      <a href="#projects">${esc(p.nav.projects)}</a>
      <a href="#skills">${esc(p.nav.skills)}</a>
      ${p.nav.interests ? `<a href="#interests">${esc(p.nav.interests)}</a>` : ''}
    `;
  };

  const renderHero = (p) => {
    const root = document.getElementById('hero-root');
    if (!root) return;
    const cta1 = p.ctaPrimary || {};
    const cta2 = p.ctaSecondary || {};
    root.innerHTML = `
      <div class="hero-grid">
        ${p.photo ? `
          <div class="hero-image">
            <img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="eager" />
          </div>` : ''}
        <div class="hero-content">
          <h1>${esc(p.name)}</h1>
          <p class="tagline">
            <span class="role">${esc(p.role)}</span><span class="tagline-sep"> · </span>${esc(p.tagline)}
          </p>
          <p class="lede">${esc(p.lede)}</p>
          <div class="hero-actions">
            ${cta1.label ? `<a class="btn btn-primary" href="${esc(cta1.href)}">${esc(cta1.label)}</a>` : ''}
            ${cta2.label ? `<a class="btn btn-ghost" href="${esc(cta2.href)}" target="_blank" rel="noopener">${esc(cta2.label)}</a>` : ''}
          </div>
          <ul class="hero-meta">
            ${p.email ? `<li><a href="mailto:${esc(p.email)}">${icons.mail}${esc(p.email)}</a></li>` : ''}
            ${p.githubUrl ? `<li><a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">${icons.github}github.com/${esc(p.githubUser)}</a></li>` : ''}
          </ul>
        </div>
      </div>
    `;
  };

  const renderSectionHead = (data) => `
    <header class="section-head">
      <span class="section-num">${esc(data.sectionNumber)}</span>
      <h2>${esc(data.title)}</h2>
      <p>${esc(data.subtitle)}</p>
    </header>
  `;

  const renderChat = (c, lang) => {
    const root = document.getElementById('chat-root');
    if (!root) return;
    root.innerHTML = `
      ${renderSectionHead(c)}
      <div id="chat-widget-root"></div>
    `;
    const host = root.querySelector('#chat-widget-root');
    if (typeof window.initChatWidget === 'function' && host) {
      window.initChatWidget(host, c, lang);
    }
  };

  const renderExperience = (e) => {
    const root = document.getElementById('experience-root');
    if (!root) return;
    const items = (e.items || []).map((it) => `
      <li class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-meta">
            <span class="timeline-period">${esc(it.period)}</span>
            ${it.location ? `<span class="timeline-location">${esc(it.location)}</span>` : ''}
          </div>
          <h3>${esc(it.company)} <span class="company">— ${esc(it.title)}</span></h3>
          <p>${esc(it.description)}</p>
          ${tagList(it.tags, true)}
        </div>
      </li>
    `).join('');

    const edu = e.education;
    const thesisLabel = edu?.thesisLabel || 'Thesis';
    const eduHtml = edu ? `
      <div class="education-card">
        <div class="education-icon">${icons.cap}</div>
        <div>
          <h3>${esc(edu.degree)}</h3>
          <p class="education-meta">${esc(edu.meta)}</p>
          ${edu.thesis ? `<p>${esc(thesisLabel)}: <em>${esc(edu.thesis)}</em>.</p>` : ''}
        </div>
      </div>
    ` : '';

    root.innerHTML = `
      ${renderSectionHead(e)}
      <ol class="timeline">${items}</ol>
      ${eduHtml}
    `;
  };

  const renderProjects = (p) => {
    const root = document.getElementById('projects-root');
    if (!root) return;
    const cards = (p.items || []).map((it) => `
      <article class="project-card">
        <div class="project-tag">${esc(it.category)}</div>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.description)}</p>
        ${tagList(it.tags, true)}
      </article>
    `).join('');

    root.innerHTML = `
      ${renderSectionHead(p)}
      <div class="projects-grid">${cards}</div>
    `;
  };

  const renderSkills = (s) => {
    const root = document.getElementById('skills-root');
    if (!root) return;
    const groups = (s.groups || []).map((g, i) => `
      <div class="skill-group" data-color="${i % COLOR_COUNT}">
        <h3>${esc(g.name)}</h3>
        <ul class="skill-tags">${(g.items || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      </div>
    `).join('');

    root.innerHTML = `
      ${renderSectionHead(s)}
      <div class="skills-grid">${groups}</div>
    `;
  };

  const renderInterests = (data) => {
    const root = document.getElementById('interests-root');
    if (!root || !data) return;
    const cards = (data.items || []).map((it, i) => `
      <article class="interest-card" data-color="${i % COLOR_COUNT}">
        <div class="interest-icon">${icons[it.icon] || icons.cap}</div>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.text)}</p>
      </article>
    `).join('');
    root.innerHTML = `
      ${renderSectionHead(data)}
      <div class="interests-grid">${cards}</div>
    `;
  };

  const renderFooter = (p) => {
    const root = document.getElementById('footer-root');
    if (!root) return;
    const links = (p.footerLinks || []).map((l) => `
      <li><a href="${esc(l.href)}"${l.external ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a></li>
    `).join('');
    root.innerHTML = `
      <p>© ${new Date().getFullYear()} ${esc(p.brandName || p.name || '')}</p>
      <ul class="footer-links">${links}</ul>
    `;
  };

  // ===== Reveal-on-scroll (only on first load; subsequent re-renders show instantly) =====
  let initialRevealDone = false;
  const setupReveal = () => {
    const targets = document.querySelectorAll(
      '.section-head, .timeline-item, .education-card, .project-card, .skill-group, .interest-card, .chat-widget, .chat-notice'
    );
    if (initialRevealDone) {
      targets.forEach((el) => el.classList.add('reveal', 'is-visible'));
      return;
    }
    initialRevealDone = true;
    targets.forEach((el) => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      targets.forEach((el) => io.observe(el));
    } else {
      targets.forEach((el) => el.classList.add('is-visible'));
    }
  };

  // ===== Theme toggle =====
  const setupTheme = () => {
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    if (initial === 'dark') root.setAttribute('data-theme', 'dark');

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      if (isDark) {
        root.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  };

  // ===== Language =====
  const getInitialLang = () => {
    const stored = localStorage.getItem('lang');
    return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
  };

  const updateLangButtons = (lang) => {
    document.querySelectorAll('#lang-switcher button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  };

  const setupLangSwitcher = (onChange) => {
    document.querySelectorAll('#lang-switcher button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (!SUPPORTED_LANGS.includes(lang)) return;
        if (localStorage.getItem('lang') === lang) return;
        localStorage.setItem('lang', lang);
        updateLangButtons(lang);
        onChange(lang);
      });
    });
  };

  // ===== Bootstrap =====
  const fetchJSON = (path) =>
    fetch(path, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
      return r.json();
    });

  const showLoadError = (err) => {
    console.error(err);
    const main = document.querySelector('main');
    if (!main || document.getElementById('load-error-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'load-error-banner';
    banner.style.cssText =
      'max-width:980px;margin:24px auto;padding:16px 20px;border:1px solid #c33;border-radius:10px;color:#c33;font-size:0.95rem;';
    banner.innerHTML =
      "Couldn't load content files. If you're opening <code>index.html</code> directly, run a local server (e.g. <code>python3 -m http.server</code>) — browsers block <code>fetch()</code> on <code>file://</code>.";
    main.prepend(banner);
  };

  const loadLanguage = async (lang) => {
    const [profile, chat, experience, projects, skills, interests] = await Promise.all([
      fetchJSON(`data/${lang}/profile.json`),
      fetchJSON(`data/${lang}/chat.json`),
      fetchJSON(`data/${lang}/experience.json`),
      fetchJSON(`data/${lang}/projects.json`),
      fetchJSON(`data/${lang}/skills.json`),
      fetchJSON(`data/${lang}/interests.json`),
    ]);
    document.documentElement.lang = lang;
    document.title = `${profile.name} — ${profile.role}`;
    renderBrand(profile);
    renderNav(profile);
    renderHero(profile);
    renderChat(chat, lang);
    renderExperience(experience);
    renderProjects(projects);
    renderSkills(skills);
    renderInterests(interests);
    renderFooter(profile);
    setupReveal();
  };

  document.addEventListener('DOMContentLoaded', async () => {
    setupTheme();
    const initialLang = getInitialLang();
    updateLangButtons(initialLang);
    setupLangSwitcher((lang) => {
      loadLanguage(lang).catch(showLoadError);
    });
    try {
      await loadLanguage(initialLang);
    } catch (err) {
      showLoadError(err);
    }
  });
})();
