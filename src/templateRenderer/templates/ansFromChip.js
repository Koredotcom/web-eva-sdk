import { htmlDecode , renderIcons} from "../../utils/helpers";
import AnsFromChipFunctionality from "../functionality/ansFromChip";
import { highlightQuotedText } from "../utils/helper";
import htmlTableRenderer from "./htmlTableRenderer";

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

    const relevantQuestionsRenderer = () => {
        let html = '';

        let relevantQuestionsHeader = `
            <div class="relevantQuestionsHeader" id = "relevantQuestions-${item?.id}">
                <span class="relevantQuestionsHeader">Relevant Questions</span>
            </div>
        `
        html += relevantQuestionsHeader;

        if (item?.altQuestions?.showAltQuestions && item?.altQuestions?.questions?.length > 0) {
            let relevantQuestions = item?.altQuestions?.questions?.map((question, i) => {
                return `
                    <div class="relevantQuestionsItem" id = "relevantQuestionsItem-${item?.id}-${i}">
                        ${highlightQuotedText(question)}
                    </div>
                `
            }).join('');
            html += relevantQuestions;
        }

        return html;
    }

    const tableChipRenderer = () => {
        let body = '';

        const source = item?.sources?.[0] || {};
        const attachment = source.source === "attachment";
        const icon = renderIcons(source.source, source.extIcon, source.providerIcon || source.icon).outerHTML;

        body += `
            <div class="tableChipRenderer" id = "ansFromChip-${item?.id}">
                <span class="datachip">${item?.sources?.length > 1 ? 'Data:' : 'Answer From:'}</span>
                <div class="contextIcon${attachment ? " attachment" : ""}">
                    ${icon}
                </div>
                <span class="krSpecName">${htmlDecode(source.title || "")}</span>
            </div>
        `;

        if(item?.showData){
            let payload = {
                columnData: item?.data?.[0]?.columns,
                rowData: item?.data?.[0]?.rows,
                cso: item?.data?.[0]?.views?.[0]?.cso,
                id: item?.id || item?.cId || item?.pId,
                showAllData: item?.showAllData
            }
            let html = htmlTableRenderer(payload);
            body += html;


            if(item?.sources?.[0]?.canSetAsSourceContext !== false &&  (item?.context?.source === "jira" || item?.context?.source === "hubspot" || item?.context?.source === "zendesk")){
                body += relevantQuestionsRenderer();
            }
        }
        return `<div class="ansFromChip">${body}</div>`;
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

    const getDataValueforMultiAnswer = (id, value, index) => {
        let contextKey = Object.keys(item?.content?.formData?.contextFields)?.[0];
        let responseKey = item?.content?.formFields?.responseFields?.[0]?.key;
        let requiredField;
        let selectedFormField;
        if(value === contextKey){
            selectedFormField = id === "0" ? 'Initial Input' : `Response ${id}`
        }else if(value === responseKey){
            requiredField = item?.content?.formFields?.responseFields?.[0];
            selectedFormField =  requiredField?.value?.choices?.find(data => data?.id === id)?.label
        }
        else{
            requiredField = item?.content?.formFields?.paramFields?.find(form => form?.key === value)
            selectedFormField = requiredField?.value?.choices?.find(data => data?.id === id)?.label
        }
        return selectedFormField
    };

    const getMultiDataValueForMultiAnswer = (values, value, index) => {
        let selectedLabels = [];
        values?.forEach(key => {
            let requiredField = item?.content?.formFields?.paramFields?.find(form => form?.key === value);
            let selectedFormField = requiredField?.value?.choices?.find(data => data?.id === key)?.label;
            if (selectedFormField) {
                selectedLabels.push(selectedFormField);
            }
        });
        return selectedLabels.join(', ');
    }
    
    const multiAnswerChipRenderer = () => {
        let html = '';
        const contextKey = item?.content?.formData?.contextFields ? Object.keys(item?.content?.formData?.contextFields)?.[0] : '';
        const responseLength = item?.content?.formData?.requestParams?.length;
    
        const contextValue = item?.content?.formData?.contextFields?.[contextKey]?.value || '';
        if (Object.keys(item?.content?.formData?.contextFields || {}).length > 0) {
            html += `
                <div class='m-0 multiresponse'>
                    <div class='responseHeader'>Context</div>
                    <div class='tvInputGroup'>
                        <div class='grpInput'>
                            <textarea rows="5" cols="30" readonly>${contextValue}</textarea>
                        </div>
                    </div>
                </div>
            `;
        }
    
        item?.content?.formData?.requestParams?.forEach((parameter, i) => {
            html += `<div class="m-0 multiresponse">`;
    
            if (responseLength > 1) {
                html += `<div class='responseHeader'>Response ${i + 1}</div>`;
            }
    
            Object.keys(parameter?.fields).forEach(data => {
                let totalKeys = [];
                item?.content?.formFields?.paramFields?.forEach(param => totalKeys.push(param));
                totalKeys.unshift(item.content.formFields?.responseFields?.[0]);
                totalKeys.unshift(item.content.formFields?.contextFields?.[0]);
    
                let dataKey = totalKeys?.find((obj) => obj?.key === data);
                let label = dataKey?.label || (data[0].toUpperCase() + data.slice(1));
    
                html += `<div class='tvInputGroup'>`;
                html += `<div class='grpName'><div class='nameTitle'>${label}</div></div>`;
    
                if (data.toLowerCase() === "content") {
                    if (parameter?.fields?.[data]?.type === "file") {
                        html += `
                            <div class='grpInput'>
                                <div class='uploadedFile'>
                                    <div class='uploadedChip'>
                                        <div class='upImg'><img src="${getExtIcon(getFileExtension(parameter?.fields?.[data]?.title))}" alt='' /></div>
                                        <div class='upText'>${parameter?.fields?.[data]?.title || "file"}</div>
                                        <div class='downloadImg'>
                                            <img src="${getDownloadIcon()}" alt='' width="16"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        const val = parameter?.fields?.[data]?.value === "0" ? 'Initial Response' : `Response ${parameter?.fields?.[data]?.value}`;
                        html += `
                            <div class='grpInput'>
                                <input type="text" readonly value="${val}" />
                            </div>
                        `;
                    }
                } else {
                    html += `<div class='grpInput'>`;
    
                    if (data.toLowerCase() === "prompt") {
                        // const parsed = parseContent(parameter?.fields?.prompt?.value || parameter?.fields?.prompt);
                        const parsed = parameter?.fields?.prompt?.value || parameter?.fields?.prompt;
                        html += `<div class='promptId' contentEditable="false">${parsed}</div>`;
                    } else {
                        const field = parameter?.fields?.[data];
                        const fieldValue = field?.type === 'file' ? field?.title : field?.value;
    
                        if (field?.type === "simpleText") {
                            html += `<div class='grpInput answerFromChip'><input type="text" readonly value="${fieldValue}" /></div>`;
                        } else if (field?.type === "dropdown") {
                            let dropdownValue = Array.isArray(field?.value)
                                ? getMultiDataValueForMultiAnswer(field?.value, data, i)
                                : getDataValueforMultiAnswer(field?.value, data, i);
                            html += `<div class='grpInput answerFromChip'><input type="text" readonly value="${dropdownValue}" /></div>`;
                        } else {
                            html += `<div class='grpInput answerFromChip'><input type="text" readonly value="${fieldValue}" /></div>`;
                        }
                    }
    
                    html += `</div>`; // end .grpInput
                }
    
                html += `</div>`; // end .tvInputGroup
            });
    
            html += `</div>`; // end .multiresponse
        });
    
        return html;
    };
    

    const renderChip = () => {
        let chipHTML = '';

        if (regeneratingAnswer) {
            chipHTML = regeneratingChipRenderer();
        } else if (item?.viewType === "table") {
            chipHTML = tableChipRenderer();

        } else {
            chipHTML = knowledgeChipRenderer();
            if(item?.showGPTDialog){
                let html = `
                    <dialog id="gptDialog-${item?.id}" class="formDialog" style="width:500px; padding:20px;">
                        <button class="close-btn" id="close-btn-dialog-${item?.id}" 
                        style="position:absolute; top:10px; right:10px; border:none; background:transparent; font-size:16px; cursor:pointer;">
                            X
                        </button>
                        <div class="formModalContent">
                            ${multiAnswerChipRenderer()}
                        </div>
                    </dialog>
                `
                const container = document.createElement("div");
                container.innerHTML = html;
                const dialog = container.firstElementChild;
                document.body.appendChild(dialog);
                dialog.showModal();
            }
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
