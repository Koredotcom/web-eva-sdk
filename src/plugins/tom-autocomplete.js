// sdk/components/tom-autocomplete.js
// import TomSelect from 'tom-select';

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

  // Add pre-selected items
  initialItems.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.text = item.id;
    opt.selected = true;
    el.appendChild(opt);
  });

  const tom = new TomSelect(el, {
    plugins: ['remove_button'], // only show 'X', no backspace delete
    persist: false,
    maxItems: null,
    loadThrottle: 300, // Add throttling to prevent too many API calls
    render: {
      option: (data, escape) => {
        return `<div>${escape(data.text)}</div>`;
      },
      item: (data, escape) => `<div>${escape(data.text)}</div>`,
      loading: () => `<div class="loading">Searching...</div>`,
      no_results: () => `<div class="no-results">No results found</div>`
    },
    load: function(query, callback) {
      if (!query.length) return callback();
      
      // Set loading state
      this.loading = true;
      
      fetchSuggestions(query, type)
        .then(results => {
          this.loading = false;
          if (results && results.length > 0) {
            callback(results.map(e => ({ value: e.id, text: e.id, raw: e })));
          } else {
            callback([]);
          }
        })
        .catch(error => {
          this.loading = false;
          console.error('Error fetching suggestions:', error);
          callback([]);
        });
    },
    onItemAdd: (value) => {
      const optionData = tom.options[value]?.raw || { id: value };
      onAdd(optionData, type);
    },
    onItemRemove: (value) => {
      onRemove({ id: value }, type);
    }
  });

  // Now it only prevents backspace when it would delete selected items
  tom.control_input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      const inputValue = tom.control_input.value;
      const hasSelectedItems = tom.items.length > 0;
      
      // Only prevent backspace if input is empty AND there are selected items
      if (inputValue === '' && hasSelectedItems) {
        e.preventDefault(); // ✅ Only prevent accidental item deletion
      }
      // Allow normal text editing when there's text in the input
    }
  });

  return tom;
}
