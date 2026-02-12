import { htmlDecode, renderIcons, getFileExtension, getExtIcon, getDownloadIcon, encodeHtml } from "../../utils/helpers";
import AnsFromChipFunctionality from "../functionality/ansFromChip";
import { getTimeline, highlightQuotedText } from "../utils/helper";
import htmlTableRenderer from "./htmlTableRenderer";
import { createCopyIcon, createExport, createThumbsDown, createThumbsDownFilled, createThumbsUp, createThumbsUpFilled, setContextIcon, EllipsisVertical, Gmail, Outlookimg, Slackimg, Teamsimg, JiraCommentsIcon, RadioButtonChecked, tickMarkIcon, Close } from "../icons-library";
import store from "../../redux/store";

// Helper functions for MS environment icons
const isMSEnv = () => store.getState()?.global?.env === 'MS';

const getThumbsUpIcon = (filled = false) => {
    if (isMSEnv()) {
        return `<img src="images/MS-Icons/thumbs-up-ms.svg" alt="Thumbs Up" width="16" height="16" />`;
    }
    return filled ? createThumbsUpFilled({ size: 16, color: "#12B76A" }) : createThumbsUp({ size: 16, color: "#667085" });
};

const getExportWordIcon = () => {
    if (isMSEnv()) {
        return `<img src="images/MS-Icons/share-ms.svg" alt="Export doc" width="16" height="16" />`;
    }
    return createExport({ size: 16, color: "#667085" });
};

const getThumbsDownIcon = (filled = false) => {
    if (isMSEnv()) {
        return `<img src="images/MS-Icons/thumbs-down-ms.svg" alt="Thumbs Down" width="16" height="16" />`;
    }
    return filled ? createThumbsDownFilled({ size: 16, color: "#F04438" }) : createThumbsDown({ size: 16, color: "#667085" });
};

const getThreeDotIcon = () => {
    if (isMSEnv()) {
        return `<img src="images/MS-Icons/dots-vertical.svg" alt="More options" width="16" height="16" />`;
    }
    return EllipsisVertical({ size: 16, color: "#667085" });
};
import { updateChatData } from "../../redux/globalSlice";
import { cloneDeep } from "lodash";
import * as feedbackTemplate from "./feedback-template";
import * as copyQuestion from "./copy-question";
import { initializeQuillEditor } from "../../utils/quillUtils";

const AnsFromChip = ({ item, regeneratingAnswer }) => {
	const regeneratingChipRenderer = () => {
		return `
            <div class="threadName">
                <span class="ansFrom">Answer from:</span>
                <span class="koraSpecDr">
                    <div class="contextIcon"></div>
                    <span class="krSpecName">${htmlDecode(
			item?.title || "No subject"
		)}</span>
                </span>
            </div>
        `;
	};

	// Get available actions based on enabled agents
	const getAvailableActions = () => {
		const items = [
			{ icon: Gmail({ size: 14 }), label: 'Gmail', actionType: "send", appId: "gmail" },
			{ icon: Outlookimg({ size: 14 }), label: 'O365 mail', actionType: "send", appId: 'outlook' },
			{ icon: Slackimg({ size: 14 }), label: 'Slack', actionType: "send", appId: 'slack' },
			{ icon: Teamsimg({ size: 14 }), label: 'Teams', actionType: "send", appId: 'msteams' },
			{ icon: JiraCommentsIcon({ size: 15 }), label: 'Create Jira Issue', actionType: "create", appId: 'jira' },
		];

		const state = store.getState();
		const allAgents = state?.global?.allAgents?.data?.agents;

		const preBuitAgents = allAgents?.filter(agent => agent?.custom === false && agent?.type === 'dataAgent')?.map(item => item?.appId);

		return items?.filter(item => preBuitAgents?.includes(item?.appId));
	};

	const relevantQuestionsRenderer = () => {
		let html = "";

		let relevantQuestionsHeader = `
            <div class="relevantQuestionsHeader" id = "relevantQuestions-${item?.id}">
                <span class="relevantQuestionsHeader">Relevant Questions</span>
            </div>
        `;
		html += relevantQuestionsHeader;

		if (
			item?.altQuestions?.showAltQuestions &&
			item?.altQuestions?.questions?.length > 0
		) {
			let relevantQuestions = item?.altQuestions?.questions
				?.map((question, i) => {
					return `
                    <div class="relevantQuestionsItem" id="relevantQuestionsItem-${item?.id}-${i}">
                        ${highlightQuotedText(question)}
                    </div>
                `;
				})
				.join("");
			html += relevantQuestions;
		}

		return html;
	};

	const tableChipRenderer = () => {
		let body = "";

		const source = item?.sources?.[0] || {};
		const attachment = source.source === "attachment";
		const icon = renderIcons(
			source.source,
			source.extIcon,
			source.providerIcon || source.icon
		).outerHTML;

		body += `
            <div class="tableChipRenderer" id = "ansFromChip-${item?.id}">
                <span class="datachip">${item?.sources?.length > 1 ? "Data:" : "Answer From:"
			}</span>
                <div class="contextIcon${attachment ? " attachment" : ""}">
                    ${icon}
                </div>
                <span class="krSpecName">${htmlDecode(
				source.title || ""
			)}</span>
            </div>
        `;

		if (item?.showData) {
			let payload = {
				columnData: item?.data?.[0]?.columns,
				rowData: item?.data?.[0]?.rows,
				cso: item?.data?.[0]?.views?.[0]?.cso,
				id: item?.id || item?.cId || item?.pId,
				showAllData: item?.showAllData,
			};
			let html = htmlTableRenderer(payload);
			body += html;

			if (
				item?.sources?.[0]?.canSetAsSourceContext !== false &&
				(item?.context?.source === "jira" ||
					item?.context?.source === "hubspot" ||
					item?.context?.source === "zendesk")
			) {
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
		let icon = renderIcons(
			source.source,
			source.extIcon || source.iconUrl,
			source.providerIcon || source.icon
		).outerHTML;
		if(isMSEnv()){
			if(source?.source === 'llm' || source?.source === 'customQnAAPI' || source?.source === 'web') {
				icon = `<img src="images/MS-Icons/aims-favicon.svg" alt="AIMS" width="16" height="16" />`;
			}
		}

		const chipTitle = source?.title?.[0]?.toUpperCase() + source?.title?.slice(1) || source?.source || "No subject";

		return `
            <div class="leftWrapperBlock">
                <span class="koraSpecDr${warning ? " fromWarning" : ""
			}" id = "ansFromChip-${item?.id}">
                    <div class="contextIcon">
                        ${icon}
                    </div>
                    <span class="krSpecName">${htmlDecode(
				 chipTitle || "No subject"
			)}</span>                    
                </span>
				${warning
				? `<div class="warningText">${warning}</div>`
				: ""
			}
            </div>            
        `;
	};

	const chatFilterGroupRenderer = (options = {}) => {
		const { forDrawer = false } = options;
		if (!forDrawer && !item?.showData) {
			return '';
		}

		// Normalize to array: item.data can be array or object
		const getDataList = () => {
			if (Array.isArray(item?.data)) return item.data;
			if (item?.data && typeof item.data === 'object') return Object.values(item.data);
			return [];
		};
		const getContentLinksList = () => {
			const links = item?.content?.payload?.text?.body?.content_links_for_answer;
			if (Array.isArray(links)) return links;
			if (links && typeof links === 'object') return Object.values(links);
			return [];
		};

		let body = `<div class="chatFilterGroup">`;
		body += `<div class="threadListGroup">`;
		if (item?.sources?.[0]?.source === "customQnAAPI") {
			getContentLinksList().map((data, i) => {
				body += `<div class="threadListItem" key="${i}">
	<div class="rightCol">
		<div class="leftDetails">
			<div class="nameGroup">
				<div class="name" id="listItem-${item?.id}-${data?.content_id}">
					${data?.app_name?.toUpperCase()} - ${data?.content_title}
				</div>
			</div>

			<div class="details">
				<span class="dtName">
					Sent by:
					${data?.fromEmail},
					${getTimeline(data?.content_published_date, "dayDateAndTime")}
				</span>
			</div>
		</div>

		<div class="rightDetails">
			<div class="openInNewTabIcon" id="openInNewTabIcon-${item?.id}-${data?.content_id}">
				<span>
					<svg class="wa-ChangeLog" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
						viewBox="0 0 20 20" fill="none">
						<path d="M5.83333 14.1667L14.1667 5.83334M14.1667 5.83334H5.83333M14.1667 5.83334V14.1667"
							stroke="#667085" stroke-width="1.33" stroke-linecap="round"
							stroke-linejoin="round"></path>
					</svg>
				</span>
			</div>
		</div>
	</div>
</div>
					       
						`;
			});
		}
		else {
			const dataList = getDataList();
			if (dataList.length === 0 && (item?.sources?.length > 0)) {
				// Fallback: show source chips when no thread data
				item.sources.forEach((source, i) => {
					const title = source?.name || source?.title || source?.source || 'Source';
					const icon = renderIcons(source?.source, source?.extIcon || source?.iconUrl, source?.providerIcon || source?.icon)?.outerHTML || '';
					body += `<div class="threadListItem" key="src-${i}">
						<div class="leftCol">${icon}</div>
						<div class="rightCol">
							<div class="leftDetails">
								<div class="namgeGroup"><div class="name">${htmlDecode(title)}</div></div>
							</div>
						</div>
					</div>`;
				});
			} else {
				dataList.map((data, i) => {
				body += `<div class="threadListItem" key="${i}">
                                <div class='leftCol'>
                                ${renderIcons(data?.source, null)?.outerHTML}
                            </div>
                            <div class="rightCol">
                                <div class="leftDetails">
                                    <div class="namgeGroup">
                                        <div class="name" id="listItem-${item?.id}-${data?.docId}">${data?.title}</div>
                                    </div>
                                    <div class='details'>
                                        <span class='dtName'>Sent by: 
                                            ${data?.fromEmail}, ${getTimeline(
						data?.date,
						"dayDateAndTime"
					)}
                                        </span>
                                    </div>
                                </div>
                                <div class="rightDetails">
                                    ${data?.canSetAsSourceContext ? `
								<div class="listView setContextDr">									
									<div class="subText">
                                            <span class="dtText askFollowupButton" id="askFollowupButton-${item?.id}-${data?.docId}">Ask Followup
                                            </span>
                                        </div>
                                    </div>` : ""}                                        
                                   <div class="openInNewTabIcon" id="openInNewTabIcon-${item?.id}-${data?.docId}">
                                        <span>
                                            <svg class="wa-ChangeLog" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5.83333 14.1667L14.1667 5.83334M14.1667 5.83334H5.83333M14.1667 5.83334V14.1667" stroke="#667085" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                                        </span>
                                   </div>
                                </div>
                            </div>
                        </div>`;
				});
			}
		}
		body += `</div>`;
		body += `</div>`;

		return body;
	};

	/**
	 * Render sources chip tag (similar to sourcesChipTagRefactored in Kora-React)
	 * Shows sources chip when multiple sources exist
	 */
	const sourcesChipTagRefactored = () => {
		const sources = item?.sources || [];
		if (sources.length === 0) return '';

		// Check invalid scenarios
		const firstSource = sources[0];
		const sourceType = firstSource?.source;
		if (sources.length === 1 && !firstSource?.hasOwnProperty('redirectUrl') && sourceType === 'llm') {
			return '';
		}
		if (item?.viewType === "threadView") {
			return '';
		}

		const isMultiSource = sources.length > 1;
		const isSearchResults = item?.templateType === 'search_results';

		// Get unique sources (handle webSearch agentId case)
		const agentId = item?.agentId;
		const uniqueSources = sources.reduce((acc, source) => {
			let identifier;
			if (agentId === 'webSearch') {
				identifier = source?.domainIcon?.iconUrl || null;
			} else {
				identifier = source?.iconUrl || source?.extIcon || source?.source;
			}
			if (!acc.find(existing => {
				const existingIdentifier = agentId === 'webSearch' 
					? (existing?.domainIcon?.iconUrl || null)
					: (existing?.iconUrl || existing?.extIcon || existing?.source);
				return existingIdentifier === identifier;
			})) {
				acc.push(source);
			}
			return acc;
		}, []);

		// Render multi-source chip
		const renderMultiSourceChip = () => {
			const sourcesToShow = uniqueSources.slice(0, 3);
			const avatarsHtml = sourcesToShow.map((source, index) => {
				// Handle webSearch agentId case
				let iconSrc;
				if (agentId === 'webSearch') {
					iconSrc = source?.domainIcon?.iconUrl || null;
				} else {
					iconSrc = source?.iconUrl || source?.extIcon;
				}
				
				if (iconSrc) {
					return `<img src="${encodeHtml(iconSrc)}" alt="" class="source-avatar" style="width: 20px; height: 20px; border-radius: 50%;" />`;
				} else {
					const iconEl = renderIcons(source?.source, source?.extIcon, null, source?.iconUrl, source?.isSupervisor);
					return `<span class="sourceIcon" style="width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; margin-right: -8px;">${iconEl?.outerHTML || ''}</span>`;
				}
			}).join('');

			return `
				<div class="sourceChipItemTextGroup">
					<div class="p-avatar">
						${avatarsHtml}
					</div>
					<span class="sourceChipItemText">Sources</span>
				</div>
			`;
		};

		// Render single source chip
		const renderSingleSourceChip = () => {
			const source = firstSource;
			const sourceType = source?.source;
			const attachment = sourceType === 'attachment';
			const defaultRag = sourceType === 'accountKnowledge';
			
			// GPT form template case
			if (source?.templateType === 'gpt_form_template') {
				const documentIcon = `<svg width="14px" height="14px" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M9.84975 1.89124V5.33335C9.84975 5.80006 9.84975 6.03342 9.94058 6.21168C10.0205 6.36848 10.148 6.49596 10.3048 6.57586C10.483 6.66669 10.7164 6.66669 11.1831 6.66669H14.6252M9.84975 14.1666H4.84975M11.5164 10.8333H4.84975M14.8498 8.32348V14.3333C14.8498 15.7334 14.8498 16.4335 14.5773 16.9683C14.3376 17.4387 13.9551 17.8211 13.4847 18.0608C12.95 18.3333 12.2499 18.3333 10.8498 18.3333H5.51642C4.11629 18.3333 3.41622 18.3333 2.88144 18.0608C2.41104 17.8211 2.02859 17.4387 1.7889 16.9683C1.51642 16.4335 1.51642 15.7334 1.51642 14.3333V5.66663C1.51642 4.26649 1.51642 3.56643 1.7889 3.03165C2.02859 2.56124 2.41104 2.17879 2.88144 1.93911C3.41622 1.66663 4.11629 1.66663 5.51642 1.66663H8.1929C8.80438 1.66663 9.11011 1.66663 9.39783 1.7357C9.65292 1.79694 9.89678 1.89795 10.1205 2.03503C10.3728 2.18963 10.5889 2.40582 11.0213 2.8382L13.6782 5.49505C14.1106 5.92743 14.3267 6.14362 14.4814 6.39591C14.6184 6.61959 14.7194 6.86346 14.7807 7.11855C14.8498 7.40627 14.8498 7.712 14.8498 8.32348Z" stroke="#79716B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>`;
				
				const hasContextFields = (Object.keys(item?.content?.formData?.contextFields || {}))?.length > 0;
				const hasRequestParamsWithFields = item?.content?.formData?.requestParams?.some(param => 
					Object.keys(param?.fields || {})?.length > 0
				);
				const hasNoContent = !hasContextFields && !hasRequestParamsWithFields;
				
				return `
					<div class="gpt-agents-source-chip ${hasNoContent ? 'no-content' : ''}" style="display: flex; align-items: center; gap: 6px;">
						<div class="icon-cls">${documentIcon}</div>
						<div class="sourceTitle">${htmlDecode(source?.title || 'Data')}</div>
					</div>
				`;
			}
			
			// Get icon
			const iconSrc = source?.iconUrl || source?.extIcon;
			const iconEl = renderIcons(
				sourceType,
				source?.extIcon || null,
				null,
				source?.iconUrl || source?.icon,
				source?.isSupervisor
			);
			const iconHtml = iconEl?.outerHTML || '';
			
			// Attachment or defaultRag without hasData
			if (!item.hasData && (attachment || defaultRag)) {
				const avatarHtml = iconSrc ? 
					`<img src="${encodeHtml(iconSrc)}" alt="" class="avatar-sources-chip" style="width: 16px; height: 16px; border-radius: 50%;" />` :
					`<span class="sourceIcon">${iconHtml}</span>`;
				
				return `
					<div class="sourceChipItemText buttonchip" style="display: flex; align-items: center; gap: 6px;">
						${avatarHtml}
						<span class="sourceTitle">Source</span>
					</div>
				`;
			}
			
			// hasData case
			if (item.hasData) {
				if (isSearchResults) {
					const avatarHtml = iconSrc ? 
						`<img src="${encodeHtml(iconSrc)}" alt="" style="width: 16px; height: 16px; border-radius: 50%;" />` :
						`<span class="sourceIcon">${iconHtml}</span>`;
					
					// For single source, show "Source" (singular), not "Sources"
					return `
						<div class="sourceChipItemText buttonchip" style="display: flex; align-items: center; gap: 6px;">
							${avatarHtml}
							<span class="sourceTitle">Source</span>
						</div>
					`;
				} else {
					// CheckList icon for hasData non-search-results
					const checkListIcon = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M11.6667 3.5L5.25 9.91667L2.33333 7" stroke="#79716B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>`;
					
					return `
						<div class="sourceChipItemText buttonchip" style="display: flex; align-items: center; gap: 6px;">
							<span class="sourceIcon">${checkListIcon}</span>
							<span class="sourceTitle">${htmlDecode(source?.title || 'Data')}</span>
						</div>
					`;
				}
			}
			
			// DEFAULT CASE - Handles all other scenarios including file sources
			const avatarHtml = iconSrc ? 
				`<img src="${encodeHtml(iconSrc)}" alt="" style="width: 16px; height: 16px; border-radius: 50%;" />` :
				`<span class="sourceIcon">${iconHtml}</span>`;
			
			return `
				<div class="sourceChipItemText buttonchip" style="display: flex; align-items: center; gap: 6px;">
					${avatarHtml}
					<span class="sourceTitle">${htmlDecode(source?.title || 'Source')}</span>
				</div>
			`;
		};

		return `
			<div class="sourcesChip"">
				<div class="sourceChipItem" data-open-sources="sources">
					${isMultiSource ? renderMultiSourceChip() : renderSingleSourceChip()}
				</div>
				${isSearchResults ? `<div class="lineSeperator">|</div>` : ''}
			</div>
		`;
	};

	/**
	 * Render "Related Search Results" button
	 */
	const renderRelatedSearchResults = () => {
		if (item?.templateType !== "search_results") return '';

		return `
			<div class="search-results-ans-block" data-open-sources="searchResults">
				<div class="inline-flex-wrapper">
					<span class="normal-text">Related Search Results</span>
					<span class="icon-cls">
						<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5.83325 14.1667L14.1666 5.83334M14.1666 5.83334H5.83325M14.1666 5.83334V14.1667" stroke="#A9A29D" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
				</div>
			</div>
		`;
	};

	const knowledgeChipRenderer = () => {
		let body = "";

		// Determine if we should show sources chip
		// Similar to Kora-React: showSources = !!botMsg?.sources?.length && !isSuperSearchAgent && isEnterpriseKnowledge
		// For web-eva-sdk, we'll show sources when there are sources (let sourcesChipTagRefactored handle invalid scenarios)
		const sources = item?.sources || [];
		const hasSources = sources.length > 0;
		
		// Get sources chip HTML (will be empty string if invalid scenarios)
		const sourcesChipHtml = sourcesChipTagRefactored();
		const hasSourcesChip = sourcesChipHtml.trim().length > 0;
		const hasRelatedSearchResults = item?.templateType === "search_results";

		// Add sources chip and Related Search Results button container
		if (hasSourcesChip || hasRelatedSearchResults) {
			body += `<div class="ansFromChip widthChip" id="ansFromChip-${item?.id}">`;
			body += `<div class="sourceGroup-item">`;
			
			if (hasSourcesChip) {
				body += sourcesChipHtml;
			}
			
			body += renderRelatedSearchResults();
			
			body += `</div>`;
			body += `</div>`;
		}

		// Do NOT show ansFromChip-wrapper (from sourceChipRender) when we're showing Sources button
		// Only show sourceChipRender when we don't have Sources chip
		if (!hasSourcesChip) {
			// For search_results template type, do NOT render data wrapper - results should only appear in SourcesSidebar
			if (
				(!!item?.data?.length || item?.hasData) &&
				!item?.citationAnswers?.length &&
				item?.templateType !== "search_results"
			) {
				body += `<div class="leftWrapperBlockCntr new-layout">`;
			}
			body += sourceChipRender();
			if (
				(!!item?.data?.length || item?.hasData) &&
				!item?.citationAnswers?.length &&
				item?.templateType !== "search_results"
			) {
				body += `</div>`;
			}
		}

		return `<div class="ansFromChip">${body}</div>`;
	};

	const getDataValueforMultiAnswer = (id, value, index) => {
		let contextKey = Object.keys(
			item?.content?.formData?.contextFields
		)?.[0];
		let responseKey = item?.content?.formFields?.responseFields?.[0]?.key;
		let requiredField;
		let selectedFormField;
		if (value === contextKey) {
			selectedFormField = id === "0" ? "Initial Input" : `Response ${id}`;
		} else if (value === responseKey) {
			requiredField = item?.content?.formFields?.responseFields?.[0];
			selectedFormField = requiredField?.value?.choices?.find(
				(data) => data?.id === id
			)?.label;
		} else {
			requiredField = item?.content?.formFields?.paramFields?.find(
				(form) => form?.key === value
			);
			selectedFormField = requiredField?.value?.choices?.find(
				(data) => data?.id === id?.toLowerCase()
			)?.label;
		}
		return selectedFormField;
	};

	const getMultiDataValueForMultiAnswer = (values, value, index) => {
		let selectedLabels = [];
		values?.forEach((key) => {
			let requiredField = item?.content?.formFields?.paramFields?.find(
				(form) => form?.key === value
			);
			let selectedFormField = requiredField?.value?.choices?.find(
				(data) => data?.id === key
			)?.label;
			if (selectedFormField) {
				selectedLabels.push(selectedFormField);
			}
		});
		return selectedLabels.join(", ");
	};

	const multiAnswerChipRenderer = () => {
		let html = "";
		const contextKey = item?.content?.formData?.contextFields
			? Object.keys(item?.content?.formData?.contextFields)?.[0]
			: "";
		const responseLength = item?.content?.formData?.requestParams?.length;

		const contextValue =
			item?.content?.formData?.contextFields?.[contextKey]?.type === "file"
				? item?.content?.formData?.contextFields?.[contextKey]?.value?.[0]?.title
				: item?.content?.formData?.contextFields?.[contextKey]?.value || "";
		if (
			Object.keys(item?.content?.formData?.contextFields || {}).length > 0
		) {
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

			Object.keys(parameter?.fields).forEach((data) => {
				if (data.toLowerCase() === "content") {
					return;
				}
				let totalKeys = [];
				item?.content?.formFields?.paramFields?.forEach((param) =>
					totalKeys.push(param)
				);
				totalKeys.unshift(item.content.formFields?.responseFields?.[0]);
				totalKeys.unshift(item.content.formFields?.contextFields?.[0]);

				let dataKey = totalKeys?.find((obj) => obj?.key === data);
				let label =
					dataKey?.label || data[0].toUpperCase() + data.slice(1);

				html += `<div class='tvInputGroup'>`;
				html += `<div class='grpName'><div class='nameTitle'>${label}</div></div>`;

				if (data.toLowerCase() === "content") {
					if (parameter?.fields?.[data]?.type === "file") {
						html += `
                            <div class='grpInput'>
                                <div class='uploadedFile'>
                                    <div class='uploadedChip'>
                                        <div class='upImg'><img src="${getExtIcon(
							getFileExtension(
								parameter?.fields?.[data]?.title
							)
						)}" alt='' /></div>
                                        <div class='upText'>${parameter?.fields?.[data]?.title ||
							"file"
							}</div>
                                        <div class='downloadImg'>
                                            <img src="${getDownloadIcon()}" alt='' width="16"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
					} else {
						const val =
							parameter?.fields?.[data]?.value === "0"
								? "Initial Response"
								: `Response ${parameter?.fields?.[data]?.value}`;
						html += `
                            <div class='grpInput'>
                                <input type="text" readonly value="${val}" />
                            </div>
                        `;
					}
				} else {
					html += `<div class='grpInput'>`;

					if (data.toLowerCase() === "prompt") {
						const parsed = parameter?.fields?.prompt?.value || parameter?.fields?.prompt;
						const editorId = `quill-prompt-editor-${item?.id}-${Date.now()}`;
						
						html += `<div id="${editorId}" class="quill-prompt-container" style="height: 200px; border: 1px solid #ccc;"></div>`;
												
						initializeQuillEditor(editorId, parsed);
					} else {
						const field = parameter?.fields?.[data];
						const fieldValue =
							field?.type === "file"
								? field?.value?.length > 0
									? field?.value?.[0]?.title
									: ""
								: field?.title || field?.value;

						if (field?.type === "simpleText") {
							html += `<div class='grpInput answerFromChip'><input type="text" readonly value="${fieldValue}" /></div>`;
						} else if (field?.type === "dropdown") {
							let dropdownValue = Array.isArray(field?.value)
								? getMultiDataValueForMultiAnswer(
									field?.value,
									data,
									i
								)
								: getDataValueforMultiAnswer(
									field?.value,
									data,
									i
								);
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

	const sourceChipRender = () => {
		const sources = item?.sources || [];
		if (sources.length === 0) {
			return null;
		}
		const sourceChips = sources.map((source) => {
			const warning = source?.warning;
			let iconHtml = "";
			try {
				const iconEl = renderIcons(
					source.source,
					source.extIcon || source.iconUrl,
					source.providerIcon || source.icon
				);
				iconHtml = iconEl?.outerHTML || "";
			} catch (e) {
				iconHtml = "";
			}
			if (isMSEnv()) {
				if (source?.source === "llm" || source?.source === "customQnAAPI" || source?.source === "web") {
					iconHtml = `<img src="images/MS-Icons/aims-favicon.svg" alt="AIMS" width="16" height="16" />`;
				}
			}
			const chipTitle = source?.title?.[0]?.toUpperCase() + source?.title?.slice(1) || source?.source || "No subject";
			return `
            <div class="leftWrapperBlock">
				<span class="koraSpecDr${warning ? " fromWarning" : ""}">
                    <div class="contextIcon">${iconHtml}</div>
                    <span class="krSpecName">${htmlDecode(chipTitle || "No subject")}</span>
                </span>
				 ${warning ? `<div class="warningText">${warning}</div>` : ""}
            </div>`;
		}).join("");
		return `
			<div id="ansFromChip-${item?.id}" class="ansFromChip-wrapper">
				<div class="left-splitter-opener">
					${sourceChips}
				</div>
				<div class="chip-wrapper">
					<span class="ansFrom">Answer from :</span>
					<div class="chip-item">
						<div class="img-cls">
							<img src="${item?.context?.sources?.[0]?.icon}" />
						</div>
						<span class="text-cls">${htmlDecode(item?.context?.sources?.[0]?.title || "No subject")}</span>
					</div>
				</div>
			</div>`;
	};
	
	const copyAnswerChip = () => {
		return `
			<div class="copyAnswerButton"title="Copy Response" id="copyAnswerButton-${item?.messageId}">
			${copyQuestion.render(item, 'answer')}
			</div>
		`;
	}
	/*feedbackTemplate */
	const feedbackChip = () => {
		return `
			<div class="feedbackChip">
			    ${item?.feedback === "like" ?
				`<div class="feedbackLikeButton ${item?.feedback === "like" ? "active" : ""}" id="feedbackLikeButton-${item?.messageId}" title="Helpful">${getThumbsUpIcon(true)}</div>`
				:
				`<div class="feedbackLikeButton" id="feedbackLikeButton-${item?.messageId}" title="Helpful">${getThumbsUpIcon(false)}</div>`
			}
				${item?.feedback === "dislike" ?
				`<div class="feedbackDislikeButton ${item?.feedback === "dislike" ? "active" : ""}" id="feedbackDislikeButton-${item?.messageId}" title="Not Helpful">${getThumbsDownIcon(true)}</div>`
				:
				`<div class="feedbackDislikeButton" id="feedbackDislikeButton-${item?.messageId}" title="Not Helpful">${getThumbsDownIcon(false)}</div>`
			}
				${renderFeedbackForm()}
			</div>
		`;
	}

	const exportWordChip = () => {
		return `
			<div class="exportWordButton" id="exportWordButton-${item?.messageId}" title="Export Response">${getExportWordIcon()}</div>
		`;
	}

	const setContextChip = () => {
		const messageId = item?.messageId || item?.id;
		const displayMenu = !item?.isTask && !item?.noResultFound && item?.viewType !== "list" && (item?.type === "search" || item?.type === "followup");
		const isMultiSource = item?.sources?.length > 1;
		// Match Kora-React: button has 'hide' class when displayMenu is false, and 'multiSource' class when multiple sources
		const hideClass = displayMenu ? '' : 'hide';
		const multiSourceClass = isMultiSource ? 'multiSource' : '';
		return `
			<div class="setContextButton optionWrapper ${multiSourceClass} ${hideClass}" id="setContextButton-${messageId}" title="Set as Context: Set the sources as context and ask queries.">
				${setContextIcon({ size: 16, color: "#667085" })}
				${isMultiSource ? `<div class="cheveron-icon"><svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3L4 5L6 3" stroke="#344054" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : ''}
			</div>
		`;
	}

	const renderFeedbackForm = () => {
		// Feedback options array
		const feedbackOptions = [
			{ label: "Not factually correct", id: 0, active: false },
			{ label: "Intent mismatch", id: 1, active: false },
			{ label: "Delayed response", id: 2, active: false },
			{ label: "Incorrect source", id: 3, active: false },
			{ label: "Other", id: 4, active: false }
		];

		// Generate Shoelace button tags for feedback options
		const feedbackOptionsHtml = feedbackOptions.map(option =>
			`<button 
				class="feedbackChip ${option.active ? 'selectedChip' : ''}" 
				data-feedback-id="${option.id}" 
				data-message-id="${item?.messageId}">
				<div class="textsuggest">${option.label}</div>
				<div class='tickIcon'>${tickMarkIcon({ size: 10, color: "#475467" })}</div>
			</button>`
		).join('');

		return `
        <sl-popup 
			id="feedbackPopup-${item?.messageId}" 
			class="feedback-popup"
			placement="top-end" 
			strategy="absolute"
			auto-size="vertical">
			<div class="p-overlaypanel feedbackDownvoteOverlay">
				<div class="p-overlaypanel-content">
					<div class="downVoteOverlayData">
						<div class='disagreefeedbackbox'>
							<div class='disagreeheadertext'>Reasons for downvoting (optional)</div>
							<div class='feedbacklist'>
								${feedbackOptionsHtml}
							</div>
							<div class='commentsInput'>
                                <sl-textarea 
									placeholder="Additional comments.."
									resize="vertical"
									rows="3"
									id="feedbackInput-${item?.messageId}">
									${encodeHtml(item?.feedback?.comment || "")}
								</sl-textarea>
                            </div>
							<div class='submitfeedbackwrap'>
								<div class="feedbacksuccesstext" style="display: none;">
									<div class='radiocheckbtn'>${RadioButtonChecked({ size: 18 })}</div>
									<div class='recievedfeedbacktext'>Thanks for your feedback</div>
								</div>
								<button
									data-action="submit-feedback" 
									data-message-id="${item?.messageId}"
									class="kr-primary-btn-black btn-sm disable"
									disabled>
									Submit
								</button>
                            </div>
						</div>
					</div>
				</div>
			</div>
			
		</sl-popup>
    `;
	}

	/*need to creata a menufunction that displays a shoelace menu on clicking */
	const threeDotMenu = () => {
		const messageId = item?.messageId || item?.id;
		
		
		// Get available integration actions
		const availableActions = getAvailableActions();
		
		// Generate Shoelace menu items for integration actions
		const integrationMenuItems = availableActions.map(action => `
			<button class="menu-item" data-menu-action="${action.appId}" data-action-type="integration">
				<div class="menu-item-icon">
					${action.icon}
				</div>
				<div class="menu-item-label">
					${action.label}
				</div>
			</button>
		`).join('');
		
		return `
			<div class="three-dot-menu-container">
				<sl-dropdown>
					<button class="three-dot-trigger" data-three-dot-trigger="${messageId}" title="More options" slot="trigger">${getThreeDotIcon()}</button>				
					<sl-menu class="three-dot-dropdown" data-three-dot-dropdown="${messageId}">
						${integrationMenuItems}
					</sl-menu>
				</sl-dropdown>
			</div>
		`;
	}
	

	const renderChip = () => {
		let state = store.getState()?.global;
		let chipHTML = "";		
		let chatFilterGroupHTML = "";
		if (regeneratingAnswer) {
			chipHTML = regeneratingChipRenderer();
		} else if (item?.viewType === "table") {
			chipHTML = tableChipRenderer();
		} else {
			chipHTML = knowledgeChipRenderer();
			if (item?.showGPTDialog) {
				// Check if dialog already exists to prevent duplicates
				const existingDialog = document.getElementById(`gptDialog-${item?.id}`);
				if (!existingDialog) {
					const source = item?.sources?.[0] || {};
					const icon = renderIcons(
						source.source,
						source.extIcon || source.iconUrl,
						source.providerIcon || source.icon
					).outerHTML;
					const title = htmlDecode(source?.title || item?.title || "No subject");
					
					let html = `
	                    <sl-dialog class="gpt-form-dialog" id="gptDialog-${item?.id}" label="">
							<div class="gpt-form-dialog-header">
								<div class="left-section">
									<div class="gpt-form-dialog-header-icon">
										${icon}
									</div>
									<div class="gpt-form-dialog-header-title">
										${title}
									</div>
								</div>
								<div class="right-section" id="closeDialog-${item?.id}">
									${Close({ size: 12, color: "#667085" })}
								</div>
							</div>
	                        <div class="formModalContent">
	                            ${multiAnswerChipRenderer()}
	                        </div>
	                    </sl-dialog>
	                `;
					const container = document.createElement("div");
					container.innerHTML = html;
					const dialog = container.firstElementChild;
					document.body.appendChild(dialog);
					
					// Add close button functionality
					const closeButton = document.getElementById(`closeDialog-${item?.id}`);
					if (closeButton) {
						closeButton.addEventListener('click', () => {
							dialog.hide();
						});
					}
					
					// Show the dialog
					dialog.show();
					
					
					dialog.addEventListener('sl-hide', () => {
						// Update state to set showGPTDialog = false
						try {							
							let _questions = cloneDeep(state?.questions);
							let constId = item?.reqId || item?.id;
							
							if (_questions[constId]) {
								_questions[constId].showGPTDialog = false;
								store.dispatch(updateChatData(_questions));
								console.log('Dialog closed - showGPTDialog set to false for:', constId);
							}
						} catch (error) {
							console.error('Error updating showGPTDialog state:', error);
						}
						
						// Remove dialog from DOM after state update
						setTimeout(() => {
							if (document.body.contains(dialog)) {
								document.body.removeChild(dialog);
							}
						}, 300);
					});
				} else {
					existingDialog.show();
				}
			}
		}
		let actionChipsHTML = `<div class="answerActionChips">`;
		// Add copy answer chip if answer exists
		if (item?.answer) {
			actionChipsHTML += copyAnswerChip();
		}

		// Add export to Word chip if answer exists
		if (item?.answer && !state?.ansFromChipElements?.disableExporttoWordDoc) {
			actionChipsHTML += exportWordChip();
		}
		// Add Set as Context button with conditions matching Kora-React MenuOptions
		// Conditions: !llm && !testAgentFlow && showSetAsSource && !isPersonalKnowledge
		// Also need to check: item has sources, not threadView, not bot_template, not isEnterpriseKnowledge
		const llm = item?.sources?.[0]?.source === "llm";
		// canSetAsSourceContext defaults to true if undefined (only false when explicitly set to false)
		const showSetAsSource = item?.sources?.[0]?.canSetAsSourceContext !== false;
		const testAgentFlow = state?.ansFromChipElements?.testAgentFlow || false;
		const isPersonalKnowledge = item?.context?.provider === "personalKnowledge";
		const displayMenu = !item?.isTask && !item?.noResultFound && item?.viewType !== "list" && (item?.type === "search" || item?.type === "followup");
		const hasSources = !!item?.sources?.length;
		const isThreadView = item?.viewType === "threadView";
		const isBotTemplate = item?.templateType === "bot_template";
		const isEnterpriseKnowledge = item?.sources?.[0]?.isSupervisor || item?.isSupervisor;
		
		// Match Kora-React conditions: MenuOptions is shown when: !!item?.sources?.length && (item?.viewType !== "threadView" && item?.templateType !== "bot_template" && !isEnterpriseKnowledge)
		// And Set as Context is shown when: !llm && !testAgentFlow && showSetAsSource && !isPersonalKnowledge
		// Note: Kora-React does NOT check disableSetAsContext - it's always shown when conditions are met
		// The disableSetAsContext flag is an SDK-specific feature flag that can be used to disable it if needed
		const shouldShowSetAsContext = hasSources && !isThreadView && !isBotTemplate && !isEnterpriseKnowledge && 
		                                !llm && !testAgentFlow && showSetAsSource && !isPersonalKnowledge;
		
		// Debug logging
		console.log('Set as Context conditions check:', {
			hasSources,
			isThreadView,
			isBotTemplate,
			isEnterpriseKnowledge,
			llm,
			testAgentFlow,
			showSetAsSource,
			isPersonalKnowledge,
			disableSetAsContext: state?.ansFromChipElements?.disableSetAsContext,
			shouldShowSetAsContext,
			itemId: item?.id,
			sources: item?.sources,
			viewType: item?.viewType,
			templateType: item?.templateType
		});
		
		if (shouldShowSetAsContext) {
			actionChipsHTML += setContextChip();
			console.log('Set as Context button added to actionChipsHTML for item:', item?.id);
		} else {
			console.log('Set as Context button NOT added - conditions not met for item:', item?.id);
		}

		if (!item?.disableFeedback && !state?.ansFromChipElements?.disableFeedback) {
			actionChipsHTML += feedbackChip();
		}

		// Add three dot menu
		const checkAvailableActions = getAvailableActions();
		if (checkAvailableActions?.length > 0 && !state?.ansFromChipElements?.disableThreeDotMenu) {
			actionChipsHTML += threeDotMenu();
		}

		actionChipsHTML += `</div>`;

		// Debug: Log actionChipsHTML content
		console.log('actionChipsHTML content:', actionChipsHTML);
		console.log('chipHTML includes ansFromChip:', chipHTML.includes('class="ansFromChip"'));

		// In Kora-React, MenuOptions (which contains Set as Context) is in a SEPARATE ansFromChip div
		// Line 1213: <div className={`ansFromChip${...}`}> contains <MenuOptions />
		// So we need to wrap actionChipsHTML in a separate ansFromChip div, similar to Kora-React structure
		// Only add the wrapper if we have action chips to show
		if (actionChipsHTML.includes('setContextButton') || actionChipsHTML.includes('copyAnswerButton') || 
		    actionChipsHTML.includes('exportWordButton') || actionChipsHTML.includes('feedbackChip') || 
		    actionChipsHTML.includes('three-dot-menu-container')) {
			// Wrap action chips in a separate ansFromChip div (matching Kora-React structure)
			const actionChipsWrapper = `<div class="ansFromChip">${actionChipsHTML}</div>`;
			chipHTML += actionChipsWrapper;
			console.log('Action chips wrapper added to chipHTML');
		} else {
			console.log('No action chips to add');
		}

		// Generate the chat filter group content for the drawer (forDrawer: true so content is always built regardless of showData)
		// For search_results template type, do NOT render chatFilterGroup in main area - results should only appear in SourcesSidebar
		if((item?.hasData || item?.sources?.[0]?.source === "customQnAAPI") && item?.templateType !== "search_results") {
			chatFilterGroupHTML = chatFilterGroupRenderer({ forDrawer: true });
		}

		// When chatFilterGroup exists, show it in a Shoelace drawer (opened by clicking left-splitter-opener), aligned to viewport
		if (chatFilterGroupHTML) {
			const drawerHTML = `
				<sl-drawer id="ansFromChip-drawer-${item?.id}" label="Sources" placement="end" class="ansFromChip-drawer" style="--size: 35vw;">
					<div class="ansFromChip-drawer-body">${chatFilterGroupHTML}</div>
				</sl-drawer>`;
			return `<div class="answerFromChipDiv">${chipHTML}${drawerHTML}</div>`;
		}
		
		return `<div class="answerFromChipDiv">${chipHTML}</div>`;
	};

	// Initialize functionality after DOM insertion (delay so chip/split panel are in the DOM)
	setTimeout(() => {
		AnsFromChipFunctionality({
			item: item,
			regeneratingAnswer: regeneratingAnswer,
		});
	}, 200);

	return renderChip();
};

export default AnsFromChip;
