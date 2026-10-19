/* Stand-in for the Claude dashboard runtime (`window.dash`), for the static copy of the page.
   Implements only what the page uses: data, onData, calc, colors, params, setParams, resetParams, setLink, refresh. */
(() => {
  const DATASETS = window.__DASH_DATASETS || {};   // id -> {file}
  const DEFAULT_PARAMS = window.__DASH_PARAMS || {};
  const state = {};                                  // id -> {status, data, columns, message}
  const calcs = {};                                  // id -> {inputs, fn, cache, key}
  const subs = [];
  let params = { ...DEFAULT_PARAMS };
  let queued = false;

  const notify = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    });
  };

  const load = (id) => {
    const ds = DATASETS[id];
    if (!ds) { state[id] = { status: 'missing', data: [], columns: [], message: 'Unknown dataset ' + id }; return; }
    state[id] = { status: 'loading', data: [], columns: [], refreshing: false, meta: [] };
    fetch('data/' + ds.file + (window.__DASH_VERSION ? '?v=' + window.__DASH_VERSION : ''))
      .then((r) => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.text(); })
      .then((text) => {
        const rows = d3.csvParse(text.replace(/^﻿/, ''));
        const columns = rows.columns || [];
        state[id] = { status: 'ok', data: Array.from(rows), columns, rows: Array.from(rows), refreshing: false, meta: [] };
      })
      .catch((e) => { state[id] = { status: 'error', data: [], columns: [], message: String(e) }; console.error('dataset', id, e); })
      .finally(notify);
  };

  const view = (s) => ({ ...s, rows: s.data, value: s.data });

  const data = (id) => {
    const c = calcs[id];
    if (c) {
      const ins = c.inputs.map((i) => data(i));
      const bad = ins.find((s) => s.status !== 'ok');
      if (bad) return { status: bad.status === 'error' ? 'error' : 'loading', data: [], columns: [], meta: [] };
      const key = ins.map((s) => s.data).reduce((a, d) => a.concat([d]), []);
      if (!c.cache || c.key.some((d, i) => d !== key[i])) {
        try {
          const out = c.fn(...ins.map((s) => s.data));
          const cols = Array.isArray(out) && out.length && typeof out[0] === 'object' ? Object.keys(out[0]) : [];
          c.cache = { status: 'ok', data: out, columns: cols, meta: [] };
        } catch (e) {
          console.error('calc', id, e);
          c.cache = { status: 'error', data: [], columns: [], message: String(e) };
        }
        c.key = key;
      }
      return view(c.cache);
    }
    if (!state[id]) load(id);
    return view(state[id]);
  };

  window.dash = {
    data,
    onData(fn) { subs.push(fn); try { fn(); } catch (e) { console.error(e); } },
    calc(id, spec) { calcs[id] = { inputs: spec.inputs || [], fn: spec.fn, cache: null, key: [] }; },
    loader() {},
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--dash-color-${i})`),
    params: () => ({ ...params }),
    setParams(o) { params = { ...params, ...o }; notify(); },
    resetParams() { params = { ...DEFAULT_PARAMS }; notify(); },
    setLink(name) { try { history.replaceState(null, '', name ? '#' + name : location.pathname); } catch (e) { /* file:// */ } },
    refresh() {},
  };

  let w = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; notify(); } });
  // Like the Claude host, load every dataset up front so hidden pages are ready when opened.
  document.addEventListener('DOMContentLoaded', () => { Object.keys(DATASETS).forEach((id) => state[id] || load(id)); notify(); });
})();
