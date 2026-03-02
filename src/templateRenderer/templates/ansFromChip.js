import { htmlDecode, renderIcons, getFileExtension, getExtIcon, getDownloadIcon, encodeHtml, resolveSdkAssetPath } from "../../utils/helpers";
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

		// Special Case for Jira/Hubspot/Zendesk tables to match Kora-React layout
		// Structure: [Source Chip] -> [Table] -> [Agent Footer]
		const isJira = (item?.provider === 'jira' || source?.source === 'jira' || item?.context?.source === 'jira');
		const isHubspot = (item?.provider === 'hubspot' || source?.source === 'hubspot' || item?.context?.source === 'hubspot');
		const isZendesk = (item?.provider === 'zendesk' || source?.source === 'zendesk' || item?.context?.source === 'zendesk');

		if (isJira || isHubspot || isZendesk) {
			// 1. Render Source Chip (e.g. "List of issues" pill)
			const sourcesChipHtml = sourcesChipTagRefactored();
			if (sourcesChipHtml && sourcesChipHtml.trim().length > 0) {
				body += `
					<div class="sourceGroup-item">
						${sourcesChipHtml}
					</div>
				`;
			}

			// 2. Render Table content
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

				// 3. Relevant Questions (if applicable)
				if (
					item?.sources?.[0]?.canSetAsSourceContext !== false
				) {
					body += relevantQuestionsRenderer();
				}
			}

			// 4. Render Agent Footer ("Answer from: Jira")
			// We use agentMetaDetailsRenderer which we updated to handle Jira/Provider logic
			body += agentMetaDetailsRenderer();

			return `<div class="ansFromChip" id="ansFromChip-${item?.id}">${body}</div>`;
		}

		// Legacy Table Renderer for other types
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
		if (isMSEnv()) {
			if (source?.source === 'llm' || source?.source === 'customQnAAPI' || source?.source === 'web') {
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
					return `<img src="${encodeHtml(iconSrc)}" alt="" class="source-avatar"/>`;
				} else {
					const iconEl = renderIcons(source?.source, source?.extIcon, null, source?.iconUrl, source?.isSupervisor);
					return `<span class="sourceIcon">${iconEl?.outerHTML || ''}</span>`;
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
					`<img src="${encodeHtml(iconSrc)}" alt="" class="avatar-sources-chip"/>` :
					`<span class="sourceIcon">${iconHtml}</span>`;

				return `
					<div class="sourceChipItemText buttonchip">
						${avatarHtml}
						<span class="sourceTitle">Source</span>
					</div>
				`;
			}

			// hasData case
			if (item.hasData) {
				if (isSearchResults) {
					const avatarHtml = iconSrc ?
						`<img src="${encodeHtml(iconSrc)}" alt="" class="avatar-sources-chip"/>` :
						`<span class="sourceIcon">${iconHtml}</span>`;

					// For single source, show "Source" (singular), not "Sources"
					return `
						<div class="sourceChipItemText buttonchip">
							${avatarHtml}
							<span class="sourceTitle">Source</span>
						</div>
					`;
				} else {
					// CheckList icon for hasData non-search-results
					const checkListIcon = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M13 6.00016L5 6.00016M13 2.00016L5 2.00016M13 10.0002L5 10.0002M2.33333 6.00016C2.33333 6.36835 2.03486 6.66683 1.66667 6.66683C1.29848 6.66683 1 6.36835 1 6.00016C1 5.63197 1.29848 5.3335 1.66667 5.3335C2.03486 5.3335 2.33333 5.63197 2.33333 6.00016ZM2.33333 2.00016C2.33333 2.36835 2.03486 2.66683 1.66667 2.66683C1.29848 2.66683 1 2.36835 1 2.00016C1 1.63197 1.29848 1.3335 1.66667 1.3335C2.03486 1.3335 2.33333 1.63197 2.33333 2.00016ZM2.33333 10.0002C2.33333 10.3684 2.03486 10.6668 1.66667 10.6668C1.29848 10.6668 1 10.3684 1 10.0002C1 9.63197 1.29848 9.3335 1.66667 9.3335C2.03486 9.3335 2.33333 9.63197 2.33333 10.0002Z" stroke="#79716B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>`;

					return `
						<div class="sourceChipItemText buttonchip">
							<span class="sourceIcon">${checkListIcon}</span>
							<span class="sourceTitle">${htmlDecode(source?.title || 'Data')}</span>
						</div>
					`;
				}
			}

			// DEFAULT CASE - Handles all other scenarios including file sources
			const avatarHtml = iconSrc ?
				`<img src="${encodeHtml(iconSrc)}" alt="" class="avatar-sources-chip"/>` :
				`<span class="sourceIcon">${iconHtml}</span>`;

			return `
				<div class="sourceChipItemText buttonchip">
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
				<div class="results-chip-block">
					<span class="chip-text">Related Search Results</span>
					<span class="icon-cls">
						<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5.83325 14.1667L14.1666 5.83334M14.1666 5.83334H5.83325M14.1666 5.83334V14.1667" stroke="#A9A29D" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
				</div>
			</div>
		`;
	};

	const agentMetaDetailsRenderer = () => {
		// Extract agent metadata from context.sources if not already present
		// This handles cases where the backend sends agent info in context instead of agentMetaDetails
		let agentMetaDetails = item?.agentMetaDetails;
		let supervisorAgent = item?.supervisorAgent;

		// If agentMetaDetails is not populated, try to extract from context.sources
		if (item?.agentId && !agentMetaDetails) {
			// 1. Try item.context.sources
			if (item?.context?.sources) {
				const agentSource = item.context.sources.find(s => s.source === item.agentId || s.provider === item.agentId);
				if (agentSource) {
					agentMetaDetails = {
						name: agentSource.title,
						icon: agentSource.icon,
						isSupervisor: agentSource.isSupervisor || false,
						agentType: agentSource.agentType
					};
					if (agentSource.isSupervisor) {
						supervisorAgent = {
							name: agentSource.title,
							icon: agentSource.icon
						};
					}
				}
			}

			// 2. Try global allAgents list (Best for canonical Name & Icon)
			if (!agentMetaDetails) {
				const state = store.getState();
				const allAgents = state?.global?.allAgents?.data?.agents || [];
				// Match against _id, appId, or id
				const agentDef = allAgents.find(a => a._id === item.agentId || a.appId === item.agentId || a.id === item.agentId);

				if (agentDef) {
					agentMetaDetails = {
						name: agentDef.name,
						icon: agentDef.icon || agentDef.iconUrl,
						isSupervisor: false,
						agentType: agentDef.type
					};
				}
			}

			// 3. Try item.sources (Primary fallback if global list fails)
			if (!agentMetaDetails && item?.sources) {
				const agentSource = item.sources.find(s => s.source === item.agentId || s.provider === item.agentId || s.id === item.agentId);
				if (agentSource) {
					// Use intent name if available and source title has " form" suffix (common in gpt_form_template)
					let name = agentSource.title || agentSource.name;
					if (item.intent && name?.toLowerCase().endsWith(' form')) {
						name = item.intent;
					}

					agentMetaDetails = {
						name: name,
						icon: agentSource.icon || agentSource.iconUrl,
						isSupervisor: agentSource.isSupervisor || false,
						agentType: agentSource.agentType
					};
				}
			}
		}

		// 1. Special Case: Attachments (agentId === 'attachment')
		// This is a special pseudo-agent ID used when answer comes from user-uploaded attachments
		if (item?.agentId === 'attachment') {
			// Attachments Icon - try to use renderIcons, fallback to SVG
			let icon = '';
			try {
				const iconEl = renderIcons('attachment', null, null);
				icon = iconEl?.outerHTML || '';
			} catch (e) { }

			// Fallback SVG if renderIcons fails
			if (!icon) {
				icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;
			}

			return `
				<div class="agentMetaDetailsWrapper singleSourceWrapper">
					<span class="agentMetaDetailsLabel">Answer from:</span>
					<span class="agentMetaDetailsImage contextIcon">${icon}</span>
					<span class="agentMetaDetailsName">Attachments</span>
				</div>
			`;
		}

		// 1.5 Special Case: Web Search (agentId === 'webSearch')
		if (item?.agentId === 'webSearch') {
			let iconHtml = '';
			try {
				// Use 'web' source type for icon
				const iconEl = renderIcons('web', null, null);
				// Check if iconEl actually has content to avoid rendering empty div
				if (iconEl && iconEl.innerHTML && iconEl.innerHTML.trim() !== '') {
					iconHtml = iconEl.outerHTML;
				}
			} catch (e) { }

			// Fallback SVG if renderIcons fails or returns empty div (Globe icon)
			if (!iconHtml) {
				iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
			}

			return `
				<div class="agentMetaDetailsWrapper webSearchWrapper">
					<span class="agentMetaDetailsLabel">Answer from:</span>
					<span class="agentMetaDetailsImage contextIcon">${iconHtml}</span>
					<span class="agentMetaDetailsName">Web</span>
				</div>
			`;
		}

		// 1.8 Special Case: Jira Search Answer (provider === 'jira' && hasData === true)
		if (item?.provider === 'jira' && item?.hasData) {
			let iconHtml = '';
			try {
				// Use 'jira' source type for icon
				const iconEl = renderIcons('jira', null, null);
				if (iconEl && iconEl.innerHTML && iconEl.innerHTML.trim() !== '') {
					iconHtml = iconEl.outerHTML;
				}
			} catch (e) { }

			// Fallback if renderIcons fails: standard blue diamond
			if (!iconHtml) {
				iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.53 2.00016C11.53 2.00016 11.53 2.00016 11.53 2.00016ZM11.53 2.00016L2.36016 11.1702C2.12683 11.4035 2.00016 11.7168 2.00016 12.0435C2.00016 12.3702 2.12683 12.6835 2.36016 12.9168L11.53 22.0868C11.7633 22.3202 12.08 22.4502 12.41 22.4502C12.74 22.4502 13.0567 22.3202 13.29 22.0868L22.46 12.9168C22.6933 12.6835 22.82 12.3702 22.82 12.0435C22.82 11.7168 22.6933 11.4035 22.46 11.1702L13.29 2.00016C13.0567 1.76683 12.74 1.63683 12.41 1.63683C12.08 1.63683 11.7633 1.76683 11.53 2.00016Z" fill="#0052CC"/></svg>`;
			}

			// Use title case for provider name display
			const providerName = item.provider.charAt(0).toUpperCase() + item.provider.slice(1);

			return `
				<div class="agentMetaDetailsWrapper jiraSearchWrapper">
					<span class="agentMetaDetailsLabel">Answer from:</span>
					<span class="agentMetaDetailsImage contextIcon">${iconHtml}</span>
					<span class="agentMetaDetailsName">${providerName}</span>
				</div>
			`;
		}

		// 2. Agent Case (real agents, not 'attachment' or 'webSearch')
		// Match Kora-React logic: lines 1354-1385 in index.js
		if (item?.agentId) {
			// Use the local agentMetaDetails variable (extracted above if needed)
			const isSupervisor = agentMetaDetails?.isSupervisor;

			// Determine icon and name based on supervisor status
			const iconUrl = isSupervisor ? supervisorAgent?.icon : agentMetaDetails?.icon;
			const name = isSupervisor ? supervisorAgent?.name : agentMetaDetails?.name;

			let iconHtml = '';
			if (iconUrl) {
				iconHtml = `<span class="agentMetaDetailsImage"><img src="${encodeHtml(iconUrl)}" alt="agent" /></span>`;
			}

			// If agentMetaDetails is not available yet, show skeleton loader (like Kora-React)
			if (!agentMetaDetails || !name) {
				return `
					<div class="agentMetaDetailsWrapper">
						<span class="agentMetaDetailsLabel">Answer from:</span>
						<span class="agentMetaDetailsLoading">
							<span style="display:inline-block;width:7.5rem;height:1.25rem;background:#e0e0e0;border-radius:0.75rem;"></span>
						</span>
					</div>
				`;
			}

			return `
				<div class="agentMetaDetailsWrapper">
					<span class="agentMetaDetailsLabel">Answer from:</span>
					${iconHtml}
					<span class="agentMetaDetailsName">${htmlDecode(name)}</span>
				</div>
			`;
		}

		// 3. Personal Hub Case
		// Match Kora-React logic: lines 1386-1406 in index.js
		// Check context?.provider === 'personalKnowledge' (NOT context?.type)
		const contextData = item?.context;
		const isPersonalKnowledge = contextData?.provider === 'personalKnowledge';

		// Additional conditions from Kora-React (line 1391):
		// Don't show if: not historical/apiSuccess, has error, or no answer/citationAnswers
		if (isPersonalKnowledge) {
			// Check if we should render based on item state
			if ((!item?.historicalData && !item?.apiSuccess) || item?.error || (!item?.answer && !item?.citationAnswers)) {
				return '';
			}

			// Personal Hub Icon (Folder) - using same SVG as Kora-React
			const folderIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6938EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

			return `
				<div class="agentMetaDetailsWrapper personalKnowledgeWrapper">
					<span class="agentMetaDetailsLabel">Answer from:</span>
					<span class="folderIconSmall">${folderIcon}</span>
					<span class="agentMetaDetailsName">Personal Hub</span>
				</div>
			`;
		}

		// No agent or personal hub - return empty
		// Note: Single source "Answer from: [Source]" is handled by AnsFromChip component,
		// not by this agentMetaDetailsRenderer
		return '';
	};

	const knowledgeChipRenderer = () => {
		let body = "";

		// Determine if we should show sources chip
		const sources = item?.sources || [];

		// Get sources chip HTML
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

		// Render Agent/PersonalHub/Attribution details below the sources pill
		body += agentMetaDetailsRenderer();

		// Legacy/Fallback logic (Only if NO sources chip was shown, AND not covered above?)
		// If hasSourcesChip is FALSE, we might still want to show something?
		// Existing logic:
		// Legacy/Fallback logic (Only if NO sources chip was shown, AND NO agentId present)
		// If agentId is present, agentMetaDetailsRenderer handles the "Answer from" label.
		if (!hasSourcesChip && !item?.agentId) {
			// Check if agentMetaDetailsRenderer returned empty? 
			// If agentMetaDetailsRenderer rendered something, we might not want sourceChipRender?
			// But sourceChipRender is specific about 'left-splitter-opener'.

			// For now, preserving existing fallback behavior mostly, but if agentMetaDetailsRenderer covers it, we might double render?
			// item.sources.length===1 is covered by agentMetaDetailsRenderer. 
			// But sourceChipRender handles 'hasData' split panels.

			// If we entered agentMetaDetailsRenderer (e.g. single source), we probably don't need sourceChipRender unless it offers more functionality (like split panel opener).
			// sourceChipRender has "left-splitter-opener".

			if (
				(!!item?.data?.length || item?.hasData) &&
				!item?.citationAnswers?.length &&
				item?.templateType !== "search_results"
			) {
				body += `<div class="leftWrapperBlockCntr new-layout">`;
			}
			// Only render sourceChipRender if we didn't render agent details? Or render both?
			// sourceChipRender seems to rely on 'ansFromChip-wrapper' structure.
			// Let's keep it for now to avoid breaking other views, but it might need cleanup.
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
			<div class="copyAnswerButton" id="copyAnswerButton-${item?.messageId}">
			${copyQuestion.render(item, 'answer')}
			</div>
		`;
	}
	/*feedbackTemplate */
	const feedbackChip = () => {
		return `
			<div class="feedbackChip">
			    ${item?.feedback === "like" ?
				`<div class="feedbackLikeButton ${item?.feedback === "like" ? "active" : ""}" id="feedbackLikeButton-${item?.messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Helpful:</div>
						<div class="tooltip-subtitle">Response is appropriate and correct.</div>
					</div>
					<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getThumbsUpIcon(true)}</span>
				</sl-tooltip>
				</div>`
				:
				`<div class="feedbackLikeButton" id="feedbackLikeButton-${item?.messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Helpful:</div>
						<div class="tooltip-subtitle">Response is appropriate and correct.</div>
					</div>
					<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getThumbsUpIcon(false)}</span>
				</sl-tooltip>
				</div>`
			}
				${item?.feedback === "dislike" ?
				`<div class="feedbackDislikeButton ${item?.feedback === "dislike" ? "active" : ""}" id="feedbackDislikeButton-${item?.messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Not Helpful:</div>
						<div class="tooltip-subtitle">Response is incorrect or not relavant on your query.</div>
					</div>
					<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getThumbsDownIcon(true)}</span>
				</sl-tooltip>
				</div>`
				:
				`<div class="feedbackDislikeButton" id="feedbackDislikeButton-${item?.messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Not Helpful:</div>
						<div class="tooltip-subtitle">Response is incorrect or not relavant on your query.</div>
					</div>
					<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getThumbsDownIcon(false)}</span>
				</sl-tooltip>
				</div>`
			}
				${renderFeedbackForm()}
			</div>
		`;
	}

	const exportWordChip = () => {
		return `
			<div class="exportWordButton" id="exportWordButton-${item?.messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Export Response:</div>
						<div class="tooltip-subtitle">Export the response as a file.</div>
					</div>
					${getExportWordIcon()}
				</sl-tooltip>
			</div>
		`;
	}

	const setContextChip = () => {
		const messageId = item?.id || item?.messageId;
		const isMultiSource = item?.sources?.length > 1;
		const multiSourceClass = isMultiSource ? 'multiSource' : '';

		const buttonHtml = `
            <div class="setContextButton optionWrapper ${multiSourceClass}" id="setContextButton-${messageId}">
				<sl-tooltip placement="bottom">
					<div slot="content" class="caTooltips">
						<div class="tooltip-title">Set as Context:</div>
						<div class="tooltip-subtitle">Set the sources as context and ask queries.</div>
					</div>
					<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; gap: 0.125rem;">
						${setContextIcon({ size: 16, color: "#667085" })}
						${isMultiSource ? `<div class="cheveron-icon"><svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3L4 5L6 3" stroke="#344054" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : ''}
					</span>
				</sl-tooltip>
            </div>
        `;

		if (!isMultiSource) {
			return `<div>${buttonHtml}</div>`;
		}

		return `
            <sl-dropdown id="setContextDropdown-${messageId}" class="setContextDropdown" hoist>
                <div slot="trigger" style="cursor: pointer;">
                    ${buttonHtml}
                </div>
                <sl-menu class="setContextMenu">
                ${(() => {
				const seen = new Set();
				return item?.sources?.filter(src => {
					// Create a unique identifier for the source to prevent duplicates in the dropdown
					const id = src?.docId || src?.id || src?.uID || src?.componentId || src?.contentId || src?.title || JSON.stringify(src);
					if (seen.has(id)) return false;
					seen.add(id);
					return true;
				}).map((src, idx) => {
					// We do NOT check selection state here during initial render.
					// The selection state is dynamic and checked in the 'sl-show' event handler
					// in AnsFromChipFunctionality to ensure it reflects the latest Redux state.
					const label = src?.title || src?.source;
					const iconHtml = renderIcons(src?.source, src?.extIcon, null, src?.iconUrl, src?.isSupervisor)?.outerHTML || '';

					return `
                        <sl-menu-item class="dropdown-item" data-source-index="${idx}">
                            <div slot="prefix" class="source-icon-wrapper">${iconHtml}</div>
                            <span class="source-label">${label}</span>
                        </sl-menu-item>`;
				}).join('');
			})()}
                </sl-menu>
            </sl-dropdown>
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
		if(item?.status === 'threadRunning'){
			return;
		}
		if (regeneratingAnswer) {
			chipHTML = regeneratingChipRenderer();
		} else if (item?.viewType === "table") {
			chipHTML = tableChipRenderer();
		} else {
			chipHTML = knowledgeChipRenderer();
			// if (item?.showGPTDialog) {
			// 	// Check if dialog already exists to prevent duplicates
			// 	const existingDialog = document.getElementById(`gptDialog-${item?.id}`);
			// 	if (!existingDialog) {
			// 		const source = item?.sources?.[0] || {};
			// 		const icon = renderIcons(
			// 			source.source,
			// 			source.extIcon || source.iconUrl,
			// 			source.providerIcon || source.icon
			// 		).outerHTML;
			// 		const title = htmlDecode(source?.title || item?.title || "No subject");

			// 		let html = `
			//             <sl-dialog class="gpt-form-dialog" id="gptDialog-${item?.id}" label="">
			// 				<div class="gpt-form-dialog-header">
			// 					<div class="left-section">
			// 						<div class="gpt-form-dialog-header-icon">
			// 							${icon}
			// 						</div>
			// 						<div class="gpt-form-dialog-header-title">
			// 							${title}
			// 						</div>
			// 					</div>
			// 					<div class="right-section" id="closeDialog-${item?.id}">
			// 						${Close({ size: 12, color: "#667085" })}
			// 					</div>
			// 				</div>
			//                 <div class="formModalContent">
			//                     ${multiAnswerChipRenderer()}
			//                 </div>
			//             </sl-dialog>
			//         `;
			// 		const container = document.createElement("div");
			// 		container.innerHTML = html;
			// 		const dialog = container.firstElementChild;
			// 		document.body.appendChild(dialog);

			// 		// Add close button functionality
			// 		const closeButton = document.getElementById(`closeDialog-${item?.id}`);
			// 		if (closeButton) {
			// 			closeButton.addEventListener('click', () => {
			// 				dialog.hide();
			// 			});
			// 		}

			// 		// Show the dialog
			// 		dialog.show();


			// 		dialog.addEventListener('sl-hide', () => {
			// 			// Update state to set showGPTDialog = false
			// 			try {							
			// 				let _questions = cloneDeep(state?.questions);
			// 				let constId = item?.reqId || item?.id;

			// 				if (_questions[constId]) {
			// 					_questions[constId].showGPTDialog = false;
			// 					store.dispatch(updateChatData(_questions));
			// 					console.log('Dialog closed - showGPTDialog set to false for:', constId);
			// 				}
			// 			} catch (error) {
			// 				console.error('Error updating showGPTDialog state:', error);
			// 			}

			// 			// Remove dialog from DOM after state update
			// 			setTimeout(() => {
			// 				if (document.body.contains(dialog)) {
			// 					document.body.removeChild(dialog);
			// 				}
			// 			}, 300);
			// 		});
			// 	} else {
			// 		existingDialog.show();
			// 	}
			// }
		}
		// ============================================================
		// ACTION CHIPS — Matching Kora-React's MenuOptions.jsx conditions
		// ============================================================

		// --- Shared condition variables (matching Kora-React MenuOptions.jsx lines 1051-1057) ---
		const llm = item?.sources?.[0]?.source === "llm";
		const showSetAsSource = item?.sources?.[0]?.canSetAsSourceContext !== false;
		const testAgentFlow = state?.ansFromChipElements?.testAgentFlow || false;
		const isPersonalKnowledge = item?.context?.provider === "personalKnowledge";
		const hasSources = !!item?.sources?.length;
		const hasAgent = !!item?.agentId;
		const isThreadView = item?.viewType === "threadView";
		const isBotTemplate = item?.templateType === "bot_template";
		const isEnterpriseKnowledge = item?.sources?.[0]?.isSupervisor || item?.isSupervisor;

		// --- WRAPPER-LEVEL GATE (Kora-React index.js line 1212) ---
		// The entire action chips block is only rendered when these are true:
		// (!!item?.sources?.length || !!item?.agentId) && viewType !== threadView && templateType !== bot_template
		// Note: We used to exclude Enterprise Knowledge here, but Kora-React shows MenuOptions for them.
		const shouldShowActionChips = (hasSources || hasAgent) && !isThreadView && !isBotTemplate;

		if (shouldShowActionChips) {
			let actionChipsHTML = `<div class="answerActionChips">`;

			// displayMenu — Kora-React MenuOptions.jsx line 1056
			// Controls visibility of Copy, Export, Set as Context, and Three-dot.
			// When false (e.g. viewType "list" or type is not search/followup), 
			// Kora-React hides these chips via CSS `hide` class. 
			// In the SDK, we simply don't render them.
			const type = item?.type || item?.entities?.type || (item?.templateType === "search_answer" ? "search" : null);
			const displayMenu = !item?.isTask && !item?.noResultFound && item?.viewType !== "list" && (type === "search" || type === "followup");

			if (displayMenu) {
				// 1. COPY ANSWER — shown when displayMenu && answer exists
				if (item?.answer) {
					actionChipsHTML += `
						<div class="copyAnswerButton" id="copyAnswerButton-${item?.messageId}">
						${copyQuestion.render(item, 'answer')}
						</div>
					`;
				}

				// 2. EXPORT TO WORD — shown when displayMenu && answer exists
				if (item?.answer && !state?.ansFromChipElements?.disableExporttoWordDoc) {
					actionChipsHTML += `
						<div class="exportWordButton" id="exportWordButton-${item?.messageId}">
							<sl-tooltip placement="bottom">
								<div slot="content" class="caTooltips">
									<div class="tooltip-title">Export Response:</div>
									<div class="tooltip-subtitle">Export the response as a file.</div>
								</div>
								${getExportWordIcon()}
							</sl-tooltip>
						</div>
					`;
				}

				// 3. SET AS CONTEXT (Kora-React MenuOptions.jsx lines 1117-1122)
				// Conditions: !llm && !testAgentFlow && showSetAsSource && !isPersonalKnowledge
				const shouldShowSetAsContext = !llm && !testAgentFlow && showSetAsSource && !isPersonalKnowledge;
				if (shouldShowSetAsContext) {
					actionChipsHTML += setContextChip();
				}
			}

			// 4. FEEDBACK (Kora-React MenuOptions.jsx lines 1125-1132)
			// NOT gated by displayMenu — feedback shows independently
			// Conditions: !testAgentFlow && !disableFeedback && !isTask && response is complete
			const isResponseComplete = item?.status === "completed" || !!item?.answer || !!item?.feedback;
			const shouldShowFeedback = !testAgentFlow &&
				!item?.disableFeedback && !state?.ansFromChipElements?.disableFeedback &&
				isResponseComplete &&
				!item?.isTask;
			if (shouldShowFeedback) {
				actionChipsHTML += feedbackChip();
			}

			// 5. THREE-DOT ACTIONS MENU (Kora-React MenuOptions.jsx lines 1134-1147)
			// Gated by displayMenu — same as Copy/Export/SetAsContext
			// Conditions: !!actionsItems?.length && !testAgentFlow
			if (displayMenu) {
				const checkAvailableActions = getAvailableActions();
				if (checkAvailableActions?.length > 0 && !testAgentFlow && !state?.ansFromChipElements?.disableThreeDotMenu) {
					actionChipsHTML += threeDotMenu();
				}
			}

			actionChipsHTML += `</div>`;

			// Only add the wrapper if we actually have action chips to show
			if (actionChipsHTML.includes('copyAnswerButton') || actionChipsHTML.includes('exportWordButton') ||
				actionChipsHTML.includes('setContextButton') || actionChipsHTML.includes('setContextDropdown') ||
				actionChipsHTML.includes('feedbackChip') || actionChipsHTML.includes('three-dot-menu-container')) {
				// Wrap action chips in a separate ansFromChip div (matching Kora-React structure line 1213)
				const actionChipsWrapper = `<div class="ansFromChip">${actionChipsHTML}</div>`;
				chipHTML += actionChipsWrapper;
			}
		}

		// Generate the chat filter group content for the drawer (forDrawer: true so content is always built regardless of showData)
		// For search_results template type, do NOT render chatFilterGroup in main area - results should only appear in SourcesSidebar
		if ((item?.hasData || item?.sources?.[0]?.source === "customQnAAPI") && item?.templateType !== "search_results") {
			chatFilterGroupHTML = chatFilterGroupRenderer({ forDrawer: true });
		}

		// When chatFilterGroup exists, show it in a Shoelace drawer (opened by clicking left-splitter-opener), aligned to viewport
		if (chatFilterGroupHTML) {
			const drawerHTML = `
				<sl-drawer id="ansFromChip-drawer-${item?.id}" label="Sources" placement="end" class="ansFromChip-drawer" style="--size: 45vw;">
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
