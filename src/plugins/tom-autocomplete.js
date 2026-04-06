// sdk/components/tom-autocomplete.js

window.setupTomSelect = function setupTomSelect({
  selectorId,
  type,
  initialItems = [],
  fetchSuggestions,
  onAdd,
  onRemove
}) {
  const el = document.getElementById(selectorId);
  if (!el) return;

  if (el.tomselect) return el.tomselect;

  initialItems.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.text = item.name || item.email || item.id;
    opt.selected = true;
    opt.setAttribute('data-raw', JSON.stringify(item));
    el.appendChild(opt);
  });

  const tom = new TomSelect(el, {
    plugins: ['remove_button'],
    persist: false,
    maxItems: null,
    loadThrottle: 300,
    dropdownParent: 'body',
    onInitialize: function() {
      Object.keys(this.options).forEach(key => {
        const option = this.options[key];
        const optionElement = el.querySelector(`option[value="${key}"]`);
        if (optionElement && optionElement.getAttribute('data-raw')) {
          try { option.raw = JSON.parse(optionElement.getAttribute('data-raw')); }
          catch (e) { /* ignore */ }
        }
      });
    },
    render: {
      option: (data, escape) => {
        const name = data.raw?.name || data.text || '?';
        const email = data.raw?.email || data.raw?.id || '';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatarHtml = data.raw?.icon
          ? `<img src="${data.raw.icon}" style="width:2rem;height:2rem;border-radius:50%;margin-right:.625rem;object-fit:cover;flex-shrink:0;" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" onload="this.nextElementSibling.style.display='none';"/><div style="width:2rem;height:2rem;margin-right:.625rem;background:#4f46e5;color:white;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:.5625rem;font-weight:500;flex-shrink:0;">${initials}</div>`
          : `<div style="width:2rem;height:2rem;margin-right:.625rem;background:#4f46e5;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.5625rem;font-weight:500;flex-shrink:0;">${initials}</div>`;
        const emailLine = email && email !== name ? `<div style="font-size:.75rem;font-weight:400;color:#737373;line-height:1.25;margin-top:.0625rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escape(email)}</div>` : '';
        return `<div style="display:flex;align-items:center;"><div style="flex-shrink:0;">${avatarHtml}</div><div style="min-width:0;overflow:hidden;"><div style="font-size:.875rem;font-weight:500;color:#141414;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escape(name)}</div>${emailLine}</div></div>`;
      },
      item: (data, escape) => {
        const initials = (data.raw?.name || data.text || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatarHtml = data.raw?.icon
          ? `<img class="ts-avatar" src="${data.raw.icon}" style="width:16px;height:16px;border-radius:50%;margin-right:6px;object-fit:cover;" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" onload="this.nextElementSibling.style.display='none';"/><div class="ts-avatar" style="width:16px;height:16px;margin-right:6px;background:#4f46e5;color:white;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:7px;font-weight:500;">${initials}</div>`
          : `<div class="ts-avatar" style="width:16px;height:16px;margin-right:6px;background:#4f46e5;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:500;">${initials}</div>`;
        return `<div class="ts-item-content" style="display:flex;align-items:center;">${avatarHtml}${escape(data.text)}</div>`;
      },
      loading: () => `<div class="loading">Searching...</div>`,
      no_results: () => `<div class="no-results">No results found</div>`
    },
    load: function(query, callback) {
      if (!query.length) return callback();
      this.clearOptions();
      Object.keys(this.loadedSearches).forEach(k => delete this.loadedSearches[k]);
      fetchSuggestions(query, type)
        .then(results => {
          if (results && results.length > 0) {
            callback(results.map(e => {
              const value = e?.id || e?.email || e?.value || e?.label || e?.name;
              const text  = e?.label || e?.name || e?.email || e?.id || e?.value;
              return (value && text) ? { value, text, raw: e } : null;
            }).filter(Boolean));
          } else {
            callback([]);
          }
        })
        .catch(() => callback([]));
    },

    // These two callbacks are the critical fix.
    // When dropdownParent:'body' is used, the CDN CSS rule
    //   .ts-wrapper.dropdown-active .ts-dropdown { display: block }
    // no longer matches because the dropdown is NOT inside .ts-wrapper.
    // So the dropdown stays display:none permanently.
    // We toggle display explicitly here.
    onDropdownOpen: function(dropdown) {
      dropdown.style.display = 'block';
    },
    onDropdownClose: function(dropdown) {
      dropdown.style.display = 'none';
    },

    onItemAdd: (value) => {
      onAdd(tom.options[value]?.raw || { id: value }, type);
    },
    onItemRemove: (value) => {
      onRemove({ id: value }, type);
    }
  });

  tom.control_input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && tom.control_input.value === '' && tom.items.length > 0) {
      e.preventDefault();
    }
  });

  return tom;
}
