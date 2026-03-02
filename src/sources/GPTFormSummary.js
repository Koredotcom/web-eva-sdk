import { encodeHtml } from '../utils/helpers.js';
import { getFileExtension } from '../utils/helpers.js';

/**
 * GPTFormSummary - Renders GPT Form Summary
 */
class GPTFormSummary {
    /**
     * Render GPT Form Summary
     * @param {Object} params - { summaryData }
     */
    static render({ summaryData }) {
        if (!summaryData) return '';

        const getContextKeyValue = (contextValue) => {
            if (contextValue?.type === "file") {
                let fileNames = [];
                contextValue?.value?.forEach(file => {
                    fileNames.push(file?.title);
                });
                return fileNames?.join(", ");
            } else {
                return contextValue?.value;
            }
        };

        const getParameterValue = (parameter) => {
            if (parameter?.type === "file") {
                let fileNames = [];
                parameter?.value?.forEach(file => {
                    fileNames.push(file?.title);
                });
                return fileNames?.join(", ");
            } else {
                return parameter?.value;
            }
        };

        const parseContent = (content) => {
            const regex = /\$\$(.*?)\$\$/g;
            return content?.replace(regex, '<span class="chiptext">$1</span>') || '';
        };

        const getDataValueforMultiAnswer = (id, value) => {
            let contextKey = Object.keys(summaryData?.content?.formData?.contextFields)?.[0];
            let responseKey = summaryData?.content?.formFields?.responseFields?.[0]?.key;
            let requiredField;
            let selectedFormField;
            if (value === contextKey) {
                selectedFormField = id === "0" ? 'Initial Input' : `Response ${id}`;
            } else if (value === responseKey) {
                requiredField = summaryData?.content?.formFields?.responseFields?.[0];
                selectedFormField = requiredField?.value?.choices?.find(data => data?.id === id)?.label;
            } else {
                requiredField = summaryData?.content?.formFields?.paramFields?.find(form => form?.key === value);
                selectedFormField = requiredField?.value?.choices?.find(data => data?.id === id)?.label;
            }
            return selectedFormField;
        };

        const getMultiDataValueForMultiAnswer = (values, value) => {
            let selectedLabels = [];
            values?.forEach(key => {
                let requiredField = summaryData?.content?.formFields?.paramFields?.find(form => form?.key === value);
                let selectedFormField = requiredField?.value?.choices?.find(data => data?.id === key)?.label;
                if (selectedFormField) {
                    selectedLabels.push(selectedFormField);
                }
            });
            return selectedLabels.join(', ');
        };

        let contextKey = summaryData?.content?.formData?.contextFields 
            ? Object.keys(summaryData?.content?.formData?.contextFields)?.[0] 
            : {};
        let responseLength = summaryData?.content?.formData?.requestParams?.length;

        let html = '';

        // Context fields
        if ((Object.keys(summaryData?.content?.formData?.contextFields || {})).length > 0) {
            html += `
                <div class="m-0 multiresponse">
                    <div class="responseHeader">${summaryData?.content?.formData?.contextFields?.[contextKey]?.label || 'Context'}</div>
                    <div class="tvInputGroup">
                        <div class="grpInput">
                            <sl-textarea rows="5" readonly>${encodeHtml(getContextKeyValue(summaryData?.content?.formData?.contextFields?.[contextKey]) || '')}</sl-textarea>
                        </div>
                    </div>
                </div>
            `;
        }

        // Request params
        summaryData?.content?.formData?.requestParams?.forEach((parameter, i) => {
            html += `<div class="m-0 multiresponse">`;
            if (responseLength > 1) {
                html += `<div class="responseHeader">Response ${i + 1}</div>`;
            }

            Object.keys(parameter?.fields)?.forEach(data => {
                let totalKeys = [];
                summaryData?.content?.formFields?.paramFields?.forEach(param => {
                    totalKeys.push(param);
                });
                totalKeys.unshift(summaryData.content.formFields?.responseFields?.[0]);
                totalKeys.unshift(summaryData.content.formFields?.contextFields?.[0]);
                let dataKey = totalKeys?.find((obj) => obj?.key === data);

                html += `<div class="tvInputGroup">`;
                html += `<div class="grpName"><div class="nameTitle">${dataKey?.label ? dataKey?.label : data?.[0].toUpperCase() + data?.slice(1)}</div></div>`;

                if (data?.toLowerCase() === "content") {
                    if (parameter?.fields?.[data]?.type === "file") {
                        html += `
                            <div class="grpInput">
                                <div class="uploadedFile">
                                    <div class="uploadedChip">
                                        <div class="upImg"><img src="images/${getFileExtension(parameter?.fields?.[data]?.title)}.png" alt="" /></div>
                                        <div class="upText">${encodeHtml(getParameterValue(parameter?.fields?.[data]) || "file")}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="grpInput">
                                <sl-input readonly value="${parameter?.fields?.[data]?.value === "0" ? 'Initial Response' : `Response ${parameter?.fields?.[data]?.value}`}"></sl-input>
                            </div>
                        `;
                    }
                } else {
                    html += `<div class="grpInput">`;
                    if (data?.toLowerCase() === "prompt") {
                        html += `
                            <div class="promptId" contenteditable="false">
                                ${parseContent(parameter?.fields?.prompt?.value || parameter?.fields?.prompt)}
                            </div>
                        `;
                    } else {
                        if (parameter?.fields?.[data]?.type === "simpleText") {
                            html += `
                                <div class="grpInput answerFromChip">
                                    <sl-input readonly value="${encodeHtml(getParameterValue(parameter?.fields?.[data]))}"></sl-input>
                                </div>
                            `;
                        } else {
                            if (parameter?.fields?.[data]?.type === "dropdown") {
                                if (Array.isArray(parameter?.fields?.[data]?.value)) {
                                    html += `
                                        <div class="grpInput answerFromChip">
                                            <sl-input readonly value="${encodeHtml(getMultiDataValueForMultiAnswer(parameter?.fields?.[data]?.value, data, i))}"></sl-input>
                                        </div>
                                    `;
                                } else {
                                    html += `
                                        <div class="grpInput answerFromChip">
                                            <sl-input readonly value="${encodeHtml(getDataValueforMultiAnswer(parameter?.fields?.[data]?.value, data, i))}"></sl-input>
                                        </div>
                                    `;
                                }
                            } else {
                                html += `
                                    <div class="grpInput answerFromChip">
                                        <sl-input readonly value="${encodeHtml(getParameterValue(parameter?.fields?.[data]))}"></sl-input>
                                    </div>
                                `;
                            }
                        }
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            });
            html += `</div>`;
        });

        return html;
    }
}

export default GPTFormSummary;

