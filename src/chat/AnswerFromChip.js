import { htmlDecode, renderIcons } from "../utils/helpers";

const AnswerFromChip = ({ item, regeneratingAnswer }) => {

    const regeneratingChipRenderer = () => {

        const threadNameDiv = document.createElement('div');
        threadNameDiv.className = 'threadName';

        const ansFromSpan = document.createElement('span');
        ansFromSpan.className = 'ansFrom';
        ansFromSpan.textContent = 'Answer from:';

        const koraSpecDrSpan = document.createElement('span');
        koraSpecDrSpan.className = 'koraSpecDr';

        const contextIconDiv = document.createElement('div');
        contextIconDiv.className = 'contextIcon';

        const krSpecNameSpan = document.createElement('span');
        krSpecNameSpan.className = 'krSpecName';
        krSpecNameSpan.innerHTML = htmlDecode(regeneratingSelectedItem?.title || "No subject");

        koraSpecDrSpan.appendChild(contextIconDiv);
        koraSpecDrSpan.appendChild(krSpecNameSpan);

        threadNameDiv.appendChild(ansFromSpan);
        threadNameDiv.appendChild(koraSpecDrSpan);

        return threadNameDiv
    }

    const tableChipRenderer = () => {
        const tableChipData = document.createElement('div');
        tableChipData.className = 'tableChipRenderer';

        const dataChip = document.createElement('span');
        dataChip.className = 'datachip';
        dataChip.textContent = item?.sources?.length > 1 ? 'Data:' : 'Answer From:'
        tableChipData.appendChild(dataChip)

        const iconDiv = document.createElement('div');
        iconDiv.className = `contextIcon ${attachment ? " attachment" : ""}`;
        let renderedIcon = renderIcons(item?.sources?.[0]?.source, item?.sources?.[0]?.extIcon, (item?.sources?.[0]?.providerIcon || item?.sources?.[0]?.icon));
        iconDiv.appendChild(renderedIcon);
        tableChipData.appendChild(iconDiv)

        let sourceName = document.createElement('span');
        sourceName.className = 'krSpecName'
        sourceName.innerHTML = htmlDecode(item?.sources?.[0]?.title || "")
        tableChipData.appendChild(sourceName);

        return tableChipData

    }

    const knowledgeChipRenderer = () => {
        const knowledgeChipRenderingBody = document.createElement('div');
        // Kora-React uses 'leftWrapperBlock' for the container of answer label + source chip
        knowledgeChipRenderingBody.className = 'leftWrapperBlock';

        // Add "Answer from:" label or "Data:" label
        if ((!!item?.data?.length || item?.hasData) && !item?.citationAnswers?.length) {
            const ansFromSpan = document.createElement('span');
            ansFromSpan.className = 'ansFrom';
            ansFromSpan.textContent = 'Data:';
            knowledgeChipRenderingBody.appendChild(ansFromSpan);
        } else {
            let ansFromChipResp = ansFromChip();
            knowledgeChipRenderingBody.appendChild(ansFromChipResp);
        }

        // Multi-source dropdown list
        if (item?.sources?.length > 1 && item?.showMultiSourceList) {
            // Note: In Kora-React this is OUTSIDE the leftWrapperBlock usually, or handled differently.
            // But SDK implementation appends it here. I'll keep it but ensure className is correct.
            const multiSourceDiv = document.createElement('div');
            multiSourceDiv.className = 'MultiSourceListView';
            item?.sources?.map((source, i) => {
                const listviewlistitem = document.createElement('div');
                listviewlistitem.className = 'MultiSourceListViewListItem';
                listviewlistitem.key = i;
                // Add click handler logic if needed
                multiSourceDiv.appendChild(listviewlistitem);
            });
            // If it needs to be attached somewhere else, we might need to restructure.
            // For now, attaching to body.
            knowledgeChipRenderingBody.appendChild(multiSourceDiv);
        }

        // Single Source Chip
        if (item?.sources?.length === 1) {
            const sourceChipRenderingFunc = singleSourceChipRenderer(item?.sources?.[0]);
            knowledgeChipRenderingBody.appendChild(sourceChipRenderingFunc);
        }

        return knowledgeChipRenderingBody;
    }

    const ansFromChip = () => {
        if (item?.sources?.length > 1) {
            // For multi-source, we need to return a container that holds the label and the trigger
            // Since parent is already leftWrapperBlock, we can return a span or div that acts as a group
            // or we return a div with class 'leftWrapperBlock' to maintain inner layout if needed, 
            // but cleaner to match Kora-React structure where they are siblings.

            // However, to keep it compatible with appendChild expecting 1 node:
            const container = document.createElement('div');
            container.className = 'multi-source-trigger-group'; // wrapper for label + dropdown trigger
            container.style.display = 'flex';
            container.style.alignItems = 'center';

            const ansfrom = document.createElement('span');
            ansfrom.className = 'ansFrom';
            ansfrom.textContent = 'Answer from:';
            container.appendChild(ansfrom);

            const arrowIcon = document.createElement('div');
            arrowIcon.className = 'contextIcon';
            // Assuming we want an icon here like ChecklistGroupby
            // Using a simple placeholder or svg
            arrowIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.6666 4.08333H2.33325M11.6666 7H2.33325M11.6666 9.91666H2.33325" stroke="#344054" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            const trigger = document.createElement('div');
            trigger.className = 'koraSpecDr';
            trigger.onclick = () => {
                // Logic to toggle multi source list
                // This requires re-render or state update. SDK uses 'item.showMultiSourceList'.
                // We might not be able to trigger react state update here easily without callback.
                // But assuming logic exists or adding simple toggle class.
                const list = container.closest('.leftWrapperBlock')?.querySelector('.MultiSourceListView');
                if (list) {
                    list.style.display = list.style.display === 'none' ? 'block' : 'none';
                }
            };

            trigger.appendChild(arrowIcon);

            const sourceCount = document.createElement('span');
            sourceCount.className = 'krSpecName';
            sourceCount.textContent = ` ${item?.sources?.length} Sources`;
            trigger.appendChild(sourceCount);

            const chevron = document.createElement('span');
            chevron.className = 'krSpecArrow';
            chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5L6 7.5L9 4.5" stroke="#667085" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            trigger.appendChild(chevron);

            container.appendChild(trigger);

            return container;

        } else {
            // Single case
            const ansFrom = document.createElement('span');
            ansFrom.className = 'ansFrom';
            ansFrom.textContent = 'Answer from:';
            return ansFrom;
        }
    }

    const singleSourceChipRenderer = (source) => {
        let dataLoading;
        const attachment = source?.source === 'attachment';

        const singleSourceChip = document.createElement('span')
        singleSourceChip.className = `koraSpecDr${source?.warning ? ' fromWarning' : ''}${attachment ? ' attachment' : ''}`
        singleSourceChip.addEventListener('click', () => { if (attachment) return; sourceChipClickHandler() })

        if (dataLoading && Object.values(questions).find(ques => ques.id === item.id) && item.hasData) {// need to implement this when the source is loading data. 

        } else {
            const iconDiv = document.createElement('div');
            iconDiv.className = `contextIcon ${attachment ? " attachment" : ""}`;
            let renderedIcon = renderIcons(source?.source, source?.extIcon || source?.iconUrl, source?.providerIcon || source?.icon);
            iconDiv.appendChild(renderedIcon);
            singleSourceChip.appendChild(iconDiv)

            let sourceName = document.createElement('span');
            sourceName.className = 'krSpecName'
            sourceName.innerHTML = htmlDecode(source?.title || "No subject")
            singleSourceChip.appendChild(sourceName);

        }

        if (source?.warning) {
            let warningDiv = document.createElement('div');
            warningDiv.className = 'warningText';
            warningDiv.textContent = source?.warning;
            singleSourceChip.appendChild(warningDiv)
        }

        return singleSourceChip
    }

    const sourceChipClickHandler = () => {

    }

    const agentChipRenderer = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'agentMetaDetailsWrapper';

        const label = document.createElement('span');
        label.className = 'agentMetaDetailsLabel';
        label.textContent = 'Answer from:';
        wrapper.appendChild(label);

        const agentDetails = item?.agentMetaDetails || {}; // Assuming populated, or we fallback
        const isSupervisor = agentDetails?.isSupervisor;
        const iconUrl = agentDetails?.icon;
        const name = agentDetails?.name || 'Agent';

        if (iconUrl) {
            const imgSpan = document.createElement('span');
            imgSpan.className = 'agentMetaDetailsImage';
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = 'agent';
            imgSpan.appendChild(img);
            wrapper.appendChild(imgSpan);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'agentMetaDetailsName';
        nameSpan.textContent = name;
        wrapper.appendChild(nameSpan);

        return wrapper;
    }

    const personalHubChipRenderer = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'agentMetaDetailsWrapper personalKnowledgeWrapper';

        const label = document.createElement('span');
        label.className = 'agentMetaDetailsLabel';
        label.textContent = 'Answer from:';
        wrapper.appendChild(label);

        const iconSpan = document.createElement('span');
        iconSpan.className = 'folderIconSmall';
        // Personal Hub Icon SVG (Purple #6938EF)
        iconSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5Z" stroke="#6938EF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4.5V8L10.5 10.5" stroke="#6938EF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; // Using a generic clock/history icon as placeholder if folder not available, or I'll try to approximate a Folder icon.
        // Actually, let's use a Folder icon path for better accuracy if I can guess.
        // Kora-React used PersonalHubIcon. Let's stick to a generic folder/hub SVG.
        iconSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6938EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        wrapper.appendChild(iconSpan);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'agentMetaDetailsName';
        nameSpan.textContent = 'Personal Hub';
        wrapper.appendChild(nameSpan);

        return wrapper;
    }

    const renderChip = () => {
        let chipElement;
        let answerFromChipDiv = document.createElement('div');
        answerFromChipDiv.className = 'answerFromChipDiv'

        if (item?.agentId) {
            chipElement = agentChipRenderer();
        } else if (item?.context?.type === 'personalKnowledge') {
            chipElement = personalHubChipRenderer();
        } else if (regeneratingAnswer) {
            chipElement = regeneratingChipRenderer();
        } else if (item?.viewType === "table") {
            chipElement = tableChipRenderer();
        } else {
            chipElement = knowledgeChipRenderer();
        }

        if (chipElement) {
            answerFromChipDiv.appendChild(chipElement)
        }
        return answerFromChipDiv;
    };

    return (
        renderChip()
    )
}

export default AnswerFromChip;