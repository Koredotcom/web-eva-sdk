import { htmlDecode , renderIcons} from "../../utils/helpers";
import AnsFromChipFunctionality from "../functionality/ansFromChip";

const AnsFromChip = ({ item, regeneratingAnswer }) => {

    const regeneratingChipRenderer = () => {
        return `
            <div class="threadName">
                <span class="ansFrom">Answer from:</span>
                <span class="koraSpecDr">
                    <div class="contextIcon"></div>
                    <span class="krSpecName">${htmlDecode(regeneratingSelectedItem?.title || "No subject")}</span>
                </span>
            </div>
        `;
    };

    const tableChipRenderer = () => {
        const source = item?.sources?.[0] || {};
        const attachment = source.source === "attachment";
        const icon = renderIcons(source.source, source.extIcon, source.providerIcon || source.icon).outerHTML;

        return `
            <div class="tableChipRenderer">
                <span class="datachip">${item?.sources?.length > 1 ? 'Data:' : 'Answer From:'}</span>
                <div class="contextIcon${attachment ? " attachment" : ""}">
                    ${icon}
                </div>
                <span class="krSpecName">${htmlDecode(source.title || "")}</span>
            </div>
        `;
    };

    const ansFromChip = () => {
        if (item?.sources?.length > 1) {
            return `
                <div class="leftWrapperBlock" id = "ansFromChip-${item?.id}">
                    <span class="ansFrom">Answer From :</span>
                    <span class="krSpecName">${item?.sources?.length} Sources</span>
                </div>
            `;
        } else {
            return `<span class="ansFrom">Answer from :</span>`;
        }
    };

    const singleSourceChipRenderer = (source) => {
        // const attachment = source?.source === 'attachment';
        const warning = source?.warning;
        const icon = renderIcons(source.source, source.extIcon || source.iconUrl, source.providerIcon || source.icon).outerHTML;

        return `
            <span class="koraSpecDr${warning ? ' fromWarning' : ''}" id = "ansFromChip-${item?.id}">
                <div class="contextIcon">
                    ${icon}
                </div>
                <span class="krSpecName">${htmlDecode(source?.title || "No subject")}</span>
                ${warning ? `<div class="warningText">${warning}</div>` : ''}
            </span>
        `;
    };

    const knowledgeChipRenderer = () => {
        let body = '';

        if ((!!item?.data?.length || item?.hasData) && !item?.citationAnswers?.length) {
            body += `<span class="ansFrom">Data:</span>`;
        } else {
            body += ansFromChip();
        }

        if (item?.sources?.length > 1 && item?.showMultiSourceList) {
            const multiSourceList = item?.sources?.map((_, i) => `
                <div class="multiSourceListItem" key="${i}" id = "multiSourceListItem-${item?.id}-${_?.docId}">${_?.title}</div>
                <button class="askFollowupButton" id = "askFollowupButton-${item?.id}-${_?.docId}">Ask Followup</button>
            `).join('');

            body += `<div class="MultiSourceListView">${multiSourceList}</div>`;
        }

        if (item?.sources?.length === 1) {
            body += singleSourceChipRenderer(item.sources[0]);

            if(item?.showData){
                item?.data?.map((data, i) => {
                    body += `<div class="dataChipRenderer" key="${i}">
                        <span class="krSpecName" id = "listItem-${item?.id}-${data?.docId}">${data?.title}</span>
                        <button class="askFollowupButton" id = "askFollowupButton-${item?.id}-${data?.docId}">Ask Followup</button>
                    </div>`;
                });
            }
        }

        return `<div class="ansFromChip">${body}</div>`;
    };

    const renderChip = () => {
        let chipHTML = '';

        if (regeneratingAnswer) {
            chipHTML = regeneratingChipRenderer();
        } else if (item?.viewType === "table") {
            chipHTML = tableChipRenderer();
        } else {
            chipHTML = knowledgeChipRenderer();
        }

        return `<div class="answerFromChipDiv">${chipHTML}</div>`;
    };
    
    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        AnsFromChipFunctionality({item: item, regeneratingAnswer: regeneratingAnswer});
    }, 1000);


    return renderChip();
};

export default AnsFromChip;
