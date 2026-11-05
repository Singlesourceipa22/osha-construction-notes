// Study panel: a reading pane over the page it's loaded on. It only adds its own
// element. It sends no input events, and never reads or changes the host page.
(function () {
  var HOST_ID = 'osha-notes-panel';
  var existing = document.getElementById(HOST_ID);
  if (existing) { existing.remove(); return; }

  var base = document.currentScript.src.replace(/panel\.js.*$/, '');
  var host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;top:0;right:0;width:460px;max-width:92vw;height:100vh;z-index:2147483647';
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '.wrap{box-sizing:border-box;height:100%;display:flex;flex-direction:column;background:#fbfaf7;color:#1c1b19;border-left:1px solid #8a8678;font:17px/1.6 Georgia,"Times New Roman",serif}',
    '.bar{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid #d5d1c4;background:#f1eee5;font:14px -apple-system,sans-serif}',
    'select{flex:1;min-width:0;font:14px -apple-system,sans-serif;padding:5px}',
    'button{font:14px -apple-system,sans-serif;padding:5px 10px;cursor:pointer}',
    '.body{flex:1;overflow-y:auto;padding:18px 22px 80px}',
    'h1{font:600 24px/1.25 Georgia,serif;margin:0 0 4px}',
    '.meta{font:13px -apple-system,sans-serif;color:#66624f;margin:0 0 18px}',
    'h2{font:600 19px/1.3 Georgia,serif;margin:30px 0 8px}',
    'blockquote{margin:14px 0;padding:8px 14px;border-left:3px solid #8b5e34;background:#f3efe4}',
    '.cite{display:block;margin-top:6px;font:13px -apple-system,sans-serif}',
    '.case{margin:18px 0;padding:12px 14px;border:1px solid #d5d1c4;background:#fff}',
    '.case h3{font:600 17px/1.3 Georgia,serif;margin:0 0 6px}',
    '.take{font-weight:600}',
    'ul{padding-left:20px}li{margin-bottom:6px}',
    'a{color:#1f4e79}sup{font:11px -apple-system,sans-serif}',
    '.sources{font-size:14px;line-height:1.45}',
    '.err{color:#9b1c1c}',
    '.hidden{height:auto;border:1px solid #8a8678}',
    '.hidden select,.hidden .body{display:none}'
  ].join('');
  root.appendChild(style);

  var wrap = el('div', 'wrap');
  var bar = el('div', 'bar');
  var picker = document.createElement('select');
  var close = document.createElement('button');
  close.textContent = 'Close';
  close.onclick = function () { host.remove(); };
  // Hide tucks the panel to a small tab so the course's own buttons are reachable.
  var hide = document.createElement('button');
  hide.textContent = 'Hide';
  hide.onclick = function () {
    var hidden = wrap.classList.toggle('hidden');
    hide.textContent = hidden ? 'Show notes' : 'Hide';
    host.style.width = hidden ? 'auto' : '460px';
    host.style.height = hidden ? 'auto' : '100vh';
  };
  bar.appendChild(picker);
  bar.appendChild(hide);
  bar.appendChild(close);
  var body = el('div', 'body');
  wrap.appendChild(bar);
  wrap.appendChild(body);
  root.appendChild(wrap);
  document.body.appendChild(host);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Turns "text [S1] text" into text nodes and source links, never raw HTML.
  function inline(parent, text, sources) {
    text.split(/(\[S\d+\])/).forEach(function (part) {
      var m = part.match(/^\[(S\d+)\]$/);
      var src = m && sources[m[1]];
      if (!src) { parent.appendChild(document.createTextNode(part)); return; }
      var sup = document.createElement('sup');
      var a = el('a', null, m[1].slice(1));
      a.href = src.url; a.target = '_blank'; a.rel = 'noopener'; a.title = src.title;
      sup.appendChild(a);
      parent.appendChild(sup);
    });
    return parent;
  }

  function sourceLink(id, sources) {
    var s = sources[id];
    var span = el('span', 'cite');
    var a = el('a', null, s.title);
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
    span.appendChild(a);
    return span;
  }

  function renderBlock(b, sources) {
    if (b.type === 'p') return inline(document.createElement('p'), b.text, sources);
    if (b.type === 'list') {
      var ul = document.createElement('ul');
      b.items.forEach(function (i) { ul.appendChild(inline(document.createElement('li'), i, sources)); });
      return ul;
    }
    if (b.type === 'quote') {
      var q = el('blockquote', null, b.text);
      q.appendChild(sourceLink(b.source, sources));
      return q;
    }
    if (b.type === 'case') {
      var c = el('div', 'case');
      c.appendChild(el('h3', null, b.title));
      b.paragraphs.forEach(function (p) { c.appendChild(inline(document.createElement('p'), p, sources)); });
      c.appendChild(inline(el('p', 'take'), b.takeaway, sources));
      return c;
    }
    return el('p', 'err', 'Unknown block');
  }

  function showModule(n) {
    body.textContent = 'Loading…';
    fetch(base + 'modules/module-' + String(n).padStart(2, '0') + '.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (m) {
        var sources = {};
        m.sources.forEach(function (s) { sources[s.id] = s; });
        body.textContent = '';
        body.appendChild(el('h1', null, m.title));
        body.appendChild(el('p', 'meta', 'Unofficial study notes. Not from OSHA or the course provider, and not legal advice.'));
        m.sections.forEach(function (sec) {
          body.appendChild(el('h2', null, sec.heading));
          sec.blocks.forEach(function (b) { body.appendChild(renderBlock(b, sources)); });
        });
        body.appendChild(el('h2', null, 'Sources'));
        var ol = el('ul', 'sources');
        m.sources.forEach(function (s) {
          var li = el('li', null, s.id.slice(1) + '. ');
          var a = el('a', null, s.title);
          a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
          li.appendChild(a);
          ol.appendChild(li);
        });
        body.appendChild(ol);
        body.scrollTop = 0;
      })
      .catch(function (e) { body.textContent = ''; body.appendChild(el('p', 'err', 'Could not load this module: ' + e.message)); });
  }

  fetch(base + 'index.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (list) {
      list.forEach(function (m) {
        var o = el('option', null, m.module + '. ' + m.title);
        o.value = m.module;
        picker.appendChild(o);
      });
      picker.onchange = function () { showModule(picker.value); };
      showModule(list[0].module);
    })
    .catch(function (e) { body.appendChild(el('p', 'err', 'Could not load the module list: ' + e.message)); });
})();
