(() => {
  const CONFIG_PATH = 'chat-config.json';
  const HISTORY_LIMIT = 6;

  const escHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);

  // ===== Tokenisation + stopwords (EN / IT / FR) =====
  const STOPWORDS = new Set([
    'the','a','an','and','or','but','if','of','to','in','on','at','for','with','as','is','are','was','were','be','been','being','it','its','this','that','these','those','i','you','he','she','we','they','his','her','their','my','your','our','what','who','which','where','when','why','how','do','does','did','have','has','had','will','would','should','can','could','about','from','by','so','than','then','too','very','just','also','not','no','yes','any','all','each','every','more','most','some','such','only','own','same',
    'il','la','i','le','lo','gli','un','una','uno','di','del','dello','della','dei','degli','delle','al','allo','alla','ai','agli','alle','da','dal','dallo','dalla','dai','dagli','dalle','nel','nello','nella','nei','negli','nelle','con','su','sul','sullo','sulla','sui','sugli','sulle','per','tra','fra','che','chi','cui','non','è','sono','sei','siamo','siete','ho','hai','ha','abbiamo','avete','hanno','mi','ti','si','ci','vi','li','suo','sua','suoi','sue','mio','mia','miei','mie','tuo','tua','tuoi','tue','nostro','nostra','nostri','nostre','vostro','vostra','vostri','vostre','loro','quale','quali','dove','quando','come','perché','ma','se','anche','solo','più','meno','molto','poco','tutto','tutti','tutta','tutte','sì',
    'les','des','du','aux','et','ou','mais','en','dans','sous','par','pour','avec','sans','contre','vers','chez','est','était','étaient','être','été','je','tu','elle','nous','vous','ils','elles','mon','ma','mes','ton','ta','tes','son','sa','ses','notre','nos','votre','vos','leur','leurs','ce','cet','cette','ces','qui','que','quoi','dont','où','quand','comment','pourquoi','ne','pas','plus','moins','très','aussi','tout','tous','toute','toutes',
  ]);

  const tokenize = (text) => {
    const tokens = String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    return tokens.filter((t) => t.length > 1 && !STOPWORDS.has(t));
  };

  // ===== BM25 =====
  class BM25 {
    constructor(docs, k1 = 1.5, b = 0.75) {
      this.k1 = k1;
      this.b = b;
      this.docs = docs;
      this.N = docs.length;
      this.tokenized = docs.map((d) => tokenize(d.text));
      this.lengths = this.tokenized.map((t) => t.length);
      this.avgLen = this.lengths.reduce((s, n) => s + n, 0) / Math.max(1, this.N);
      this.df = new Map();
      this.tf = this.tokenized.map((toks) => {
        const m = new Map();
        toks.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
        new Set(toks).forEach((t) => this.df.set(t, (this.df.get(t) || 0) + 1));
        return m;
      });
    }
    idf(term) {
      const df = this.df.get(term) || 0;
      return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
    }
    score(query, idx) {
      const qTokens = tokenize(query);
      let s = 0;
      const tf = this.tf[idx];
      const len = this.lengths[idx];
      for (const t of qTokens) {
        const f = tf.get(t) || 0;
        if (!f) continue;
        const num = f * (this.k1 + 1);
        const den = f + this.k1 * (1 - this.b + this.b * (len / (this.avgLen || 1)));
        s += this.idf(t) * (num / den);
      }
      return s;
    }
    topK(query, k = 6) {
      const scored = this.docs.map((d, i) => ({ doc: d, score: this.score(query, i) }));
      scored.sort((a, b) => b.score - a.score);
      const seen = new Set();
      const unique = [];
      for (const s of scored) {
        const baseId = String(s.doc.id).split(':').pop();
        if (seen.has(baseId)) continue;
        seen.add(baseId);
        unique.push(s);
        if (unique.length >= k) break;
      }
      const positive = unique.filter((s) => s.score > 0);
      return (positive.length ? positive : unique).map((s) => s.doc);
    }
  }

  // ===== Corpus building (all languages) =====
  const fetchJSON = (path) =>
    fetch(path, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
      return r.json();
    });

  const fetchOptional = (path) =>
    fetch(path, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

  const SUPPORTED_LANGS = ['en', 'it', 'fr'];

  const buildCorpus = async () => {
    const datasets = await Promise.all(
      SUPPORTED_LANGS.map(async (lang) => {
        try {
          const [profile, experience, projects, skills, curiosities] = await Promise.all([
            fetchJSON(`data/${lang}/profile.json`),
            fetchJSON(`data/${lang}/experience.json`),
            fetchJSON(`data/${lang}/projects.json`),
            fetchJSON(`data/${lang}/skills.json`),
            fetchOptional(`data/${lang}/curiosities.json`),
          ]);
          return { lang, profile, experience, projects, skills, curiosities };
        } catch {
          return null;
        }
      })
    );

    const chunks = [];
    for (const ds of datasets.filter(Boolean)) {
      const tag = ds.lang;

      chunks.push({
        id: `${tag}:profile`,
        title: ds.profile.name || 'Profile',
        text: [ds.profile.name, ds.profile.role, ds.profile.tagline, ds.profile.lede]
          .filter(Boolean).join('. '),
      });

      (ds.experience.items || []).forEach((it, i) => {
        chunks.push({
          id: `${tag}:exp-${i}`,
          title: `${it.title} @ ${it.company}`,
          text: [`${it.title} - ${it.company}`, it.period, it.location, it.description, (it.tags || []).join(', ')]
            .filter(Boolean).join('. '),
        });
      });

      if (ds.experience.education) {
        const edu = ds.experience.education;
        chunks.push({
          id: `${tag}:edu`,
          title: edu.degree || 'Education',
          text: [edu.degree, edu.meta, edu.thesis ? `${edu.thesisLabel || 'Thesis'}: ${edu.thesis}` : '']
            .filter(Boolean).join('. '),
        });
      }

      (ds.projects.items || []).forEach((it, i) => {
        chunks.push({
          id: `${tag}:proj-${i}`,
          title: it.title || 'Project',
          text: [it.title, it.category, it.description, (it.tags || []).join(', ')].filter(Boolean).join('. '),
        });
      });

      (ds.skills.groups || []).forEach((g, i) => {
        chunks.push({
          id: `${tag}:skill-${i}`,
          title: g.name || 'Skills',
          text: `${g.name}: ${(g.items || []).join(', ')}`,
        });
      });

      if (ds.curiosities && Array.isArray(ds.curiosities.items)) {
        ds.curiosities.items.forEach((c, i) => {
          chunks.push({
            id: `${tag}:cur-${i}`,
            title: c.title || 'Curiosity',
            text: [c.title, c.text].filter(Boolean).join('. '),
          });
        });
      }
    }
    return chunks;
  };

  // ===== SSE streaming LLM call =====
  const streamLLM = async (config, messages, onChunk) => {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey && !String(config.apiKey).startsWith('REPLACE_')) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    const body = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens || 400,
      temperature: typeof config.temperature === 'number' ? config.temperature : 0.3,
      stream: true,
    };
    const r = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`LLM ${r.status}: ${txt.slice(0, 200)}`);
    }

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return full;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (delta) { full += delta; onChunk(delta, full); }
        } catch { /* malformed chunk */ }
      }
    }
    return full;
  };

  // ===== Config loader (cached) =====
  let configPromise = null;
  const getConfig = () => {
    if (!configPromise) {
      configPromise = fetch(CONFIG_PATH, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    return configPromise;
  };

  const isConfigured = (cfg) => {
    if (!cfg || !cfg.endpoint) return false;
    const usingDefaultProvider = /api\.groq\.com|api\.openai\.com|generativelanguage\.googleapis\.com/.test(cfg.endpoint);
    const hasKey = cfg.apiKey && !String(cfg.apiKey).startsWith('REPLACE_');
    return usingDefaultProvider ? hasKey : true;
  };

  // SVG icons
  const iconClear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>';

  // ===== Widget =====
  window.initChatWidget = async (container, strings, lang) => {
    if (!container) return;
    container.innerHTML = '';

    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      container.innerHTML = `
        <div class="chat-notice">
          <h3>${escHtml(strings.notConfiguredTitle)}</h3>
          <p>${escHtml(strings.notConfiguredText)}</p>
        </div>
      `;
      return;
    }

    let bm25;
    try {
      const corpus = await buildCorpus();
      bm25 = new BM25(corpus);
    } catch (err) {
      container.innerHTML = `
        <div class="chat-notice">
          <h3>${escHtml(strings.notConfiguredTitle)}</h3>
          <p>${escHtml(err.message || strings.errorMessage)}</p>
        </div>
      `;
      return;
    }

    const suggestions = strings.suggestions || [];
    const widget = document.createElement('div');
    widget.className = 'chat-widget';
    widget.innerHTML = `
      <div class="chat-toolbar">
        <button type="button" class="chat-clear" title="Clear conversation" aria-label="Clear conversation">
          ${iconClear}
        </button>
      </div>
      <div class="chat-messages" role="log" aria-live="polite"></div>
      ${suggestions.length ? `
        <div class="chat-suggestions">
          ${suggestions.map((s) => `<button type="button" class="chat-suggestion">${escHtml(s)}</button>`).join('')}
        </div>` : ''}
      <form class="chat-input-row">
        <input class="chat-input" type="text" placeholder="${escHtml(strings.placeholder)}" autocomplete="off" />
        <button type="submit" class="chat-send">${escHtml(strings.sendLabel)}</button>
      </form>
      <p class="chat-disclaimer">${escHtml(strings.disclaimerText)}</p>
    `;
    container.appendChild(widget);

    const messagesEl = widget.querySelector('.chat-messages');
    const form = widget.querySelector('.chat-input-row');
    const input = widget.querySelector('.chat-input');
    const sendBtn = widget.querySelector('.chat-send');
    const clearBtn = widget.querySelector('.chat-clear');
    const suggestionsEl = widget.querySelector('.chat-suggestions');

    const history = [];

    const scrollBottom = () => {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    };

    const renderBubble = (role, text) => {
      const div = document.createElement('div');
      div.className = `chat-bubble chat-${role}`;
      div.textContent = text;
      messagesEl.appendChild(div);
      scrollBottom();
      return div;
    };

    const renderTyping = () => {
      const div = document.createElement('div');
      div.className = 'chat-bubble chat-bot chat-typing';
      div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      messagesEl.appendChild(div);
      scrollBottom();
      return div;
    };

    const showWelcome = () => {
      if (strings.welcomeMessage) renderBubble('bot', strings.welcomeMessage);
    };

    showWelcome();

    clearBtn.addEventListener('click', () => {
      history.splice(0);
      messagesEl.innerHTML = '';
      if (suggestionsEl) suggestionsEl.style.display = '';
      showWelcome();
      input.focus();
    });

    const setLocked = (locked) => {
      input.disabled = locked;
      sendBtn.disabled = locked;
      clearBtn.disabled = locked;
    };

    const ask = async (question) => {
      const q = String(question || '').trim();
      if (!q) return;
      input.value = '';
      setLocked(true);
      if (suggestionsEl) suggestionsEl.style.display = 'none';

      renderBubble('user', q);
      const typingEl = renderTyping();

      try {
        const top = bm25.topK(q, cfg.topK || 6);
        const context = top.map((c) => `[${c.title}]\n${c.text}`).join('\n\n---\n\n');
        const systemPrompt = (strings.systemPrompt || '').replace('{{context}}', context);
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-HISTORY_LIMIT),
          { role: 'user', content: q },
        ];

        let botBubble = null;
        let textSpan = null;
        let cursorSpan = null;

        const fullText = await streamLLM(cfg, messages, (_delta, accumulated) => {
          if (!botBubble) {
            typingEl.remove();
            botBubble = document.createElement('div');
            botBubble.className = 'chat-bubble chat-bot';
            textSpan = document.createElement('span');
            cursorSpan = document.createElement('span');
            cursorSpan.className = 'chat-cursor';
            cursorSpan.setAttribute('aria-hidden', 'true');
            botBubble.appendChild(textSpan);
            botBubble.appendChild(cursorSpan);
            messagesEl.appendChild(botBubble);
          }
          textSpan.textContent = accumulated;
          scrollBottom();
        });

        if (botBubble) {
          cursorSpan.remove();
          history.push({ role: 'user', content: q });
          history.push({ role: 'assistant', content: fullText });
        } else {
          typingEl.remove();
          renderBubble('bot', strings.errorMessage);
          const last = messagesEl.lastElementChild;
          if (last) last.classList.add('chat-error');
        }
      } catch (err) {
        typingEl.remove();
        const errBubble = renderBubble('bot', strings.errorMessage);
        errBubble.classList.add('chat-error');
        console.error(err);
      } finally {
        setLocked(false);
        input.focus();
      }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ask(input.value);
    });

    if (suggestionsEl) {
      suggestionsEl.querySelectorAll('.chat-suggestion').forEach((btn) => {
        btn.addEventListener('click', () => ask(btn.textContent));
      });
    }
  };
})();
