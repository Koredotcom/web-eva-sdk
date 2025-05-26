import ItemsAmbiguityTemplateFunc from "../functionality/items-ambiguity-template";

function render(data) {
    const html = `
    <div id="items-ambiguity-template-${data?.id}">
    <div class="itemsAmbiguityAnswer">${data?.answer || ''}</div>
    <div class="itemsAmbiguityitemsWrapper">
      ${data?.templateInfo?.ambiguous?.[0]?.value?.choices?.map((item, index) => `
        <div class="items_ambiguity_template" id="items-ambiguity-value-${index}" data-index="${index}">
          <img src="${item?.icon || ''}" alt="" />
          <div class="desc_block">
            <div class="title">${item?.title || ''}</div>
            <div class="desc">${item?.subtitle || ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
`;

    
let timeout;
clearTimeout(timeout);
timeout = setTimeout(() => {
    ItemsAmbiguityTemplateFunc(data);
}, 1000);



return html;
}

export { render };
