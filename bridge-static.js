/* Static hosting compatibility. Original page components and content are retained. */
(() => {
  'use strict';
  const base = window.__BRIDGE_BASE__ || '';
  const local = (value) => {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) return url;
    if (base && url.pathname !== base && !url.pathname.startsWith(base + '/')) {
      url.pathname = base + url.pathname;
    }
    return url;
  };
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.hasAttribute('download') || anchor.target === '_blank') return;
    const url = local(anchor.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    // Preserve the original page's field filters and other hash-link controls.
    // React handles their click events; cross-page links use static navigation.
    if (url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && url.search === location.search && url.hash) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(url.href);
  }, true);
  document.addEventListener('submit', (event) => {
    if (event.target.getAttribute('role') !== 'search') return;
    const query = event.target.querySelector('input[type="search"]')?.value.trim();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (query) location.assign(base + '/search/?q=' + encodeURIComponent(query));
  }, true);
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    if (base && typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) input = local(input).href;
    return originalFetch(input, options);
  };
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'read_current_learning_page',
        title: '현재 학습 페이지 읽기',
        description: '현재 화면의 제목, 학습 내용과 입력값을 읽습니다. 내용을 변경하거나 제출하지 않습니다.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('빈 객체를 입력해 주세요.');
          const main = document.querySelector('main');
          return { title: document.title, url: location.href, content: main?.innerText || '', fields: Array.from(main?.querySelectorAll('textarea,input:not([type="password"]),select') || []).map(el => ({ label: el.getAttribute('aria-label') || el.placeholder || el.name || el.id, value: el.value })) };
        }
      }, { signal: lifecycle.signal })).catch(() => {});
      addEventListener('pagehide', () => lifecycle.abort(), { once: true });
    } catch (_) { /* The original interface works without this optional API. */ }
  }
})();
