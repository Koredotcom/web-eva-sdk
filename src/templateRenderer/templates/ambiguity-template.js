// import { encodeHtml } from "../utils/helper";
// import TemplateComponents from "./index";

import AmbiguityTemplateFunc from "../functionality/ambiguity-template";

export function render(data) {
	// const { options, message } = data;

    // const data = {}; // your actual data
    const multiselectedOptions = {};
    const selectedOptions = {};
    
    const ambiguityContainer = document.createElement('div');
    ambiguityContainer.id = `resolve-ambiguity-container-${data?.id}`;
    ambiguityContainer.className = 'resolve-ambiguity-container';

    const threadNameContainer = document.createElement('div');
    threadNameContainer.className = 'threadName';
    threadNameContainer.textContent = data?.answer || AmbiguityNameDisplayer();
    
    const mainContainer = document.createElement('div');
    mainContainer.className = 'threadName';
    
    const dropdownBox = document.createElement('div');
    dropdownBox.className = 'maildrpbox';
    dropdownBox.id = 'ambquityDropdown';
    
    (data?.templateInfo?.ambiguous || []).forEach((el, index) => {
        const box = document.createElement('div');
        box.className = 'drpdwnboxclass';
    
        const tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'headerdropdowns';
        tooltipDiv.title = tooltipText(el);
        tooltipDiv.textContent = el?.label;
    
        const select = document.createElement('select');
        select.id = `resolve-ambiguity-select-${data?.id}`;
        if (el?.value?.multi) {
            select.multiple = true;
        }
    
        (el?.value?.choices || []).forEach(choice => {
            const opt = document.createElement('option');
            opt.value = choice.value || choice.name;
            opt.textContent = choice.label || choice.name;
            select.appendChild(opt);
        });
    
        box.appendChild(tooltipDiv);
        box.appendChild(select);
        dropdownBox.appendChild(box);
    });
    
    const actionBox = document.createElement('div');
    actionBox.className = 'amb-action-box';
    actionBox.id = `resolve-ambiguity-action-box-${data?.id}`;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'amb-cancel-btn';
    cancelBtn.id = `resolve-ambiguity-cancel-btn-${data?.id}`;
    cancelBtn.textContent = 'Cancel';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `amb-confirm-btn`;
    confirmBtn.id = `resolve-ambiguity-confirm-btn-${data?.id}`;
    confirmBtn.textContent = 'Confirm';
    
    actionBox.appendChild(cancelBtn);
    actionBox.appendChild(confirmBtn);
    dropdownBox.appendChild(actionBox);
    
    mainContainer.appendChild(dropdownBox);

    ambiguityContainer.appendChild(threadNameContainer);
    ambiguityContainer.appendChild(mainContainer);
    
    // Append everything to body or desired container
    // document.body.appendChild(threadNameContainer);

    let timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
        AmbiguityTemplateFunc(data);
    }, 1000);
    
    return ambiguityContainer.outerHTML;
    
    // Placeholder functions
    function AmbiguityNameDisplayer() {
        var names = [];
        for (var i = 0; i < data?.templateInfo?.ambiguous?.length; i++) {
            var name = data?.templateInfo?.ambiguous[i]?.label;
            names.push(name);
        }
        if (names.length > 1) {
            return `There are conflicts on few inputs. Please confirm`;
        } else {
            return `We found more than one result for "${names[0]}". Please confirm.`;
        }
    }
    function tooltipText(el) {
        return `Tooltip for ${el.label}`;
    }
    
}

export default { render };
