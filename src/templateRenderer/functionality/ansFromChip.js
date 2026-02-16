import { cloneDeep } from "lodash";
import { updateChatData, setAnswerSources } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";
import { getRelevantQuestions } from "../../redux/actions/global.action";
import { highlightQuotedText } from "../utils/helper";
import { InitiateChatConversationAction, toast } from "../../chat";
import { submitUserFeedback } from "../../Feedback";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import chatInterface from "../../chat/ChatInterface";
import SourcesSidebarInstance from "../../sources/SourcesSidebar.js";
import { renderIcons } from "../../utils/helpers";
import { tickMarkIcon } from "../icons-library";

const AnsFromChipFunctionality = ({ item }) => {
	/**
	 * Force-hide Shoelace menu-item chevron via JS.
	 * Some builds/themes can make the chevron difficult to override with CSS alone.
	 */
	const hideShoelaceMenuItemChevron = async (menuItemEl) => {
		try {
			// Wait for the component to finish rendering (best-effort)
			if (menuItemEl?.updateComplete && typeof menuItemEl.updateComplete.then === "function") {
				await menuItemEl.updateComplete;
			}
		} catch (e) { }

		try {
			const sr = menuItemEl?.shadowRoot;
			if (!sr) return;

			// Try multiple selectors across Shoelace versions/builds
			const chevron =
				sr.querySelector('.menu-item__chevron') ||
				sr.querySelector('[part="submenu-icon"]') ||
				sr.querySelector('[exportparts~="submenu-icon"]') ||
				sr.querySelector('sl-icon[part="submenu-icon"]');

			if (chevron) {
				chevron.style.display = "none";
				chevron.setAttribute?.("hidden", "true");
				chevron.setAttribute?.("aria-hidden", "true");
			}

			// Extra safety: sometimes the icon lives inside the suffix container
			const suffix = sr.querySelector('[part="suffix"]');
			if (suffix && suffix.querySelector('.menu-item__chevron, [part="submenu-icon"]')) {
				suffix.style.display = "none";
				suffix.setAttribute?.("hidden", "true");
				suffix.setAttribute?.("aria-hidden", "true");
			}
		} catch (e) { }
	};

	const getRelevantQuestionsData = async () => {
		let state = store.getState()?.global;
		let _questions = cloneDeep(state?.questions);
		let constId = item?.reqId || item?.id;

		if (item?.altQuestions?.showAltQuestions) {
			_questions[constId].altQuestions.showAltQuestions = false;
		} else if (
			item?.altQuestions?.questions?.length > 0 &&
			item?.altQuestions?.showAltQuestions === false
		) {
			_questions[constId].altQuestions.showAltQuestions = true;
		} else {
			let userId = state?.profile?.data?.id;

			let context = item?.context;

			let params = {
				userId: userId,
				sessionId: context?.sessionId,
				appId: context?.tabId,
				qId: item?.id,
			};

			const response = await store.dispatch(getRelevantQuestions(params));

			if (!!response?.payload) {
				let altQuestions = response?.payload?.altQuestions;
				let alternateQuestionsObj = {
					questions: altQuestions,
					showAltQuestions: true,
				};
				_questions[constId].altQuestions = alternateQuestionsObj;
			}
		}
		store.dispatch(updateChatData(_questions));
	};

	const tableChipLogic = () => {
		let chip = document.getElementById(`ansFromChip-${item?.id}`);
		if (chip && !chip.eventListenerAdded) {
			chip.addEventListener("click", (e) => {
				e?.preventDefault();
				e?.stopPropagation();
				showDataAction();
			});
			chip.eventListenerAdded = true;
		}

		if (item?.showData) {
			// any actions on Table Chip has to be added here

			if (
				item?.sources?.[0]?.canSetAsSourceContext !== false &&
				(item?.context?.source === "jira" ||
					item?.context?.source === "hubspot" ||
					item?.context?.source === "zendesk")
			) {
				let relevantQuestions = document.getElementById(
					`relevantQuestions-${item?.id}`
				);
				if (
					relevantQuestions &&
					!relevantQuestions.eventListenerAdded
				) {
					relevantQuestions.addEventListener("click", (e) => {
						e?.preventDefault();
						e?.stopPropagation();
						getRelevantQuestionsData();
					});
					relevantQuestions.eventListenerAdded = true;
				}

				if (
					item?.altQuestions?.showAltQuestions &&
					item?.altQuestions?.questions?.length > 0
				) {
					item?.altQuestions?.questions?.map((question, i) => {
						let relevantQuestionsItem = document.getElementById(
							`relevantQuestionsItem-${item?.id}-${i}`
						);
						if (
							relevantQuestionsItem &&
							!relevantQuestionsItem.eventListenerAdded
						) {
							relevantQuestionsItem.addEventListener(
								"click",
								(e) => {
									e?.preventDefault();
									e?.stopPropagation();
									let payload = {
										question: question,
									};
									InitiateChatConversationAction({ payload });
								}
							);
							relevantQuestionsItem.eventListenerAdded = true;
						}
					});
				}
			}
		}
	};

	const showDataAction = () => {
		if (
			!!item?.context &&
			(item?.context?.type === "gptAgent" ||
				item?.context?.agentType === "gptAgent" ||
				item?.context?.agentType === "galeAgent")
		) {
			let state = store.getState()?.global;
			let _questions = cloneDeep(state?.questions);
			let constId = item?.reqId || item?.id;
			if (item?.isTask) {
				constId = item?.stepId;
			}
			let showGPTDialog = !!_questions[constId]?.showGPTDialog;
			_questions[constId].showGPTDialog = !showGPTDialog;
			store.dispatch(updateChatData(_questions));
		}
		if (
			item?.sources?.length === 1 &&
			item?.sources[0]?.hasOwnProperty("redirectUrl")
		) {
			openInNewTab(item?.sources?.[0]);
		} else {
			// Open SourcesSidebar for multiple sources or single source with data
			openSourcesSidebar(item);
		}
	};

	const openInNewTab = (data) => {
		window.open(data?.redirectUrl?.dweb, "_blank");
	};

	/**
	 * Open SourcesSidebar with item data
	 * @param {Object} itemData - The item data
	 * @param {string} type - 'sources' or 'searchResults'
	 */
	const openSourcesSidebar = (itemData, type = 'sources') => {
		// Prepare sources data in the format expected by SourcesSidebar
		const sourcesData = {
			...itemData,
			id: itemData?.reqId || itemData?.id,
			question: itemData?.question,
			boardId: itemData?.boardId,
			messageId: itemData?.messageId
		};

		// Update Redux state
		store.dispatch(setAnswerSources(sourcesData));

		// Open sidebar with the specified type
		const sidebar = SourcesSidebarInstance();
		sidebar.open(sourcesData, type === 'searchResults' ? 'searchResults' : null);
	};

	const copyAnswerToClipboard = async () => {
		try {
			if (item?.answer) {
				await navigator.clipboard.writeText(item.answer);
				toast.success("Response copied");
			}
		} catch (err) {
			console.error("Failed to copy answer to clipboard:", err);
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = item?.answer || "";
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
		}
	};

	const exportAnswerToWord = () => {
		try {
			if (!item?.answer) {
				console.warn("No answer to export");
				return;
			}

			// Convert markdown to HTML using the custom renderer
			const renderedAnswer = customMarkdownRenderer(item.answer);

			// Create HTML content for the Word document
			const htmlContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>Answer Export</title>
					<style>
						body { 
							font-family: Arial, sans-serif; 
							margin: 20px; 
							line-height: 1.6; 
						}
						h1, h2, h3, h4, h5, h6 { 
							color: #333; 
							margin-top: 20px; 
							margin-bottom: 10px; 
						}
						p { margin-bottom: 10px; }
						ul, ol { margin-bottom: 10px; }
						li { margin-bottom: 5px; }
						blockquote { 
							border-left: 4px solid #ddd; 
							padding-left: 15px; 
							margin: 10px 0; 
							color: #666; 
						}
						code { 
							background-color: #f5f5f5; 
							padding: 2px 4px; 
							border-radius: 3px; 
							font-family: monospace; 
						}
						pre { 
							background-color: #f5f5f5; 
							padding: 10px; 
							border-radius: 5px; 
							overflow-x: auto; 
						}
						table { 
							border-collapse: collapse; 
							width: 100%; 
							margin: 10px 0; 
						}
						th, td { 
							border: 1px solid #ddd; 
							padding: 8px; 
							text-align: left; 
						}
						th { background-color: #f2f2f2; }
						.answer-content { margin-top: 20px; }
					</style>
				</head>
				<body>					
					<div class="answer-content">
						${renderedAnswer}
					</div>
					<hr>
					<p><small>Exported on: ${new Date().toLocaleString()}</small></p>
				</body>
				</html>
			`;

			// Create blob with HTML content
			const blob = new Blob([htmlContent], {
				type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			});

			// Create download link
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${item?.messageId}-${new Date().toISOString().slice(0, 10)}.doc`;

			// Trigger download
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			// Clean up
			URL.revokeObjectURL(url);

			console.log("Answer exported to Word document");
		} catch (err) {
			console.error("Failed to export answer to Word:", err);
		}
	};

	const onSetAsSource = (e, data) => {
		e.stopPropagation();
		if (data?.ext === "gsheet") {
			// fetchListItems(e)
		} else {
			let state = store.getState()?.global;
			let _agents = cloneDeep(state?.enabledAgents);
			let isAgentSetAsSource = _agents.find(
				(ag) => ag?.id === data?.source
			);
			let sourceType = isAgentSetAsSource ? "agent" : null;

			let obj = {
				item: data,
				duplicateErr: true,
				type: sourceType,
				viewType: item?.viewType,
				invokeFrom: 'menuOptions',
				setViaMenuOptions: true
			};

			const currentSelectedContext = state.selectedContext?.data;
			const currentSessionMessageId = currentSelectedContext?.messageId;
			const thisMessageId = item?.id || item?.messageId;

			// For search results, follow Kora-React's additive/replacement patterns
			if (item?.templateType === 'search_results' || item?.type === 'search' || item?.templateType === 'search_answer') {
				// Set discardPrevSession ONLY if this is a NEW message interaction.
				// If we are already selecting items for THIS message, discardPrevSession should be false to allow additive selection.
				obj.discardPrevSession = (!!currentSessionMessageId && currentSessionMessageId !== thisMessageId);
				obj.type = (data?.source === 'attachment') ? 'attachment' : 'accountKnowledge';

				// Always pass messageId and boardId for tracking in Redux, 
				// but tell sessionItemHandler to skip them in the API payload for multi-source search results
				// to prevent the backend from automatically adding all sources of the message.
				obj.messageId = thisMessageId;
				obj.boardId = item?.boardId;
				if (item?.sources?.length > 1) {
					obj.skipPayloadMessageId = true;
				}
			} else {
				// Default followup behavior
				obj.boardId = item?.boardId;
				obj.messageId = thisMessageId;
			}

			console.log(`[onSetAsSource] Item: ${thisMessageId}, discardPrevSession: ${obj.discardPrevSession}, data:`, data);
			sessionItemHandler(obj);
		}
	};

	/*Latest functionality for askFollowup*/
	const setContextData = (e, item) => {
		e.stopPropagation()
		const msgType = item?.type
		// const messageId = msgType === "followup" ? ellipsisDr?.parentMessageId : ellipsisDr?.messageId;
		const messageId = item?.messageId; //Shpuld send the messageId of the question clicked for Followup
		const _selectedContext = { ...item?.context, messageId, sources: item?.sources, viewType: item?.viewType }
		let obj = {}
		let enabledUserAgents = store.getState()?.global?.allAgents?.data?.agents?.filter(a => !!a?.enabled)
		let _agents = cloneDeep(enabledUserAgents)
		let isAgentSetAsSource = _agents.find(ag => ag.id === item?.sources?.[0]?.source)
		let sourceType = isAgentSetAsSource ? "agent" : null

		if (item?.viewType === "table" && _selectedContext?.hasOwnProperty("sessionId")) {
			sessionItemHandler({
				item: { ..._selectedContext, source: 'attachment' },
				viewType: item?.viewType,
				type: sourceType,
				invokeFrom: 'menuOptions',
				setViaMenuOptions: true
			});
		} else if (item?.templateType === 'search_results') {
			// Specific for search result 
			obj = {
				item: item?.sources?.[0],
				type: 'accountKnowledge',
				discardPrevSession: true,
				invokeFrom: 'menuOptions',
				setViaMenuOptions: true
			}
			sessionItemHandler(obj)
		} else {
			obj = {
				boardId: item.boardId,
				messageId,
				item: item?.sources?.[0],
				duplicateErr: true,
				viewType: item?.viewType,
				type: sourceType,
				invokeFrom: 'menuOptions',
				setViaMenuOptions: true  // Set flag to indicate context was set via menu options
			}
			// if(selectedContext?.sources?.[0]?.isAgent) {
			if (sourceType === 'agent') {
				obj.discardPrevSession = true
			}
			// if (selectedContext?.viewType === "table") {
			// 	obj.override = true
			// }
			sessionItemHandler(obj)
		}
		// menuHide()

	}

	const IntegrationsActions = (e, source, item) => {
		let payload = {}
		if (source === 'gmail') {
			payload = {
				question: "Send as email",
				contextParams: {
					messageId: item?.messageId
				},
				source: 'gmail',
				intent: 'sendEmail'
			}
		}
		if (source === 'msteams') {
			/*append the above payload */
			payload = {
				question: "Send as Teams message",
				contextParams: {
					messageId: item?.messageId
				},
				source: 'msteams',
				intent: 'sendTeamsMessage'
			}
		}


		if (source === 'slack') {
			payload = {
				question: "Send as Slack message",
				contextParams: {
					messageId: item?.messageId
				},
				source: 'slack',
				intent: 'sendSlackMessage'
			}
		}
		if (source === 'jira') {
			payload = {
				question: "Create Jira Issue",
				contextParams: {
					messageId: item?.messageId
				},
				source: 'jira',
				intent: 'createJiraIssue'
			}
		}
		if (source === 'outlook') {
			payload = {
				question: "Send as email",
				contextParams: {
					messageId: item?.messageId
				},
				source: 'outlook',
				intent: 'sendEmail'
			}
		}
		chatInterface().initiateChatConversationAction({ payload, "action": "send" })
	}
	/*need to make advance search api call */




	const executeSlackAction = (e, item) => {
		const payload = {
			question: "Send as Slack message",
			contextParams: {
				messageId: item?.messageId
			},
		}
		/*need to make advance search api call */
		chatInterface().initiateChatConversationAction({ payload })
	}


	const knowledgeChipLogic = () => {
		if (item?.sources?.length > 1) {
			let chip = document.getElementById(`ansFromChip-${item?.id}`);
			if (chip && !chip.eventListenerAdded) {
				chip.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					showDataAction();
				});
				chip.eventListenerAdded = true;
			}
		}

		// Multi-source dropdown logic: show a dropdown for selecting context sources when there are multiple sources
		if (item?.sources?.length > 1) {
			const messageId = item?.id || item?.messageId;
			const dropdown = document.getElementById(`setContextDropdown-${messageId}`);
			if (dropdown && !dropdown._evaDropdownBound) {
				console.log('[Dropdown] Binding events for messageId:', messageId);

				// Handle item selection via sl-select
				dropdown.addEventListener('sl-select', (event) => {
					const itemEl = event.detail.item;
					const idxStr = itemEl.getAttribute('data-source-index');
					console.log(`Dropdown sl-select on message ${messageId}, index: ${idxStr}`);
					if (idxStr === null) return;

					const idx = parseInt(idxStr);
					const src = item?.sources?.[idx];
					if (src) {
						console.log(`Selected source at index ${idx} for message ${messageId}:`, src.title || src.source);
						const fakeEvent = { preventDefault: () => { }, stopPropagation: () => { } };
						onSetAsSource(fakeEvent, src);
					}
				});

				// Update selection state when dropdown is about to show
				dropdown.addEventListener('sl-show', async () => {
					console.log('Dropdown showing, updating selection UI');
					try {
						const globalSC = store.getState()?.global?.selectedContext;
						const selectedSources = globalSC?.data?.sources || globalSC?.sources || [];

						const menuItems = dropdown.querySelectorAll('sl-menu-item');
						for (const itemEl of menuItems) {
							const idxStr = itemEl.getAttribute('data-source-index');
							if (idxStr === null) continue;

							const idx = parseInt(idxStr);
							const src = item?.sources?.[idx];
							if (!src) continue;

							const isSelected = selectedSources?.some(s => {
								const sId = String(s?.docId || s?.id || s?.uID || s?.componentId || s?.contentId || '');
								const srcId = String(src?.docId || src?.id || src?.uID || src?.componentId || src?.contentId || '');
								const idMatch = !!sId && !!srcId && sId === srcId;
								const nameMatch = !!s?.title && s?.title === src?.title;
								return idMatch || nameMatch;
							});

							// Update selection state UI
							if (isSelected) {
								itemEl.classList.add('selected');
							} else {
								itemEl.classList.remove('selected');
							}
							// Remove built-in check attribute to avoid double ticks
							itemEl.removeAttribute('checked');

							// Update Prefix (Icon)
							const prefix = itemEl.querySelector('[slot="prefix"]');
							if (prefix) {
								const renderedIconDiv = renderIcons(src?.source, src?.extIcon, null, src?.iconUrl, src?.isSupervisor);
								prefix.innerHTML = renderedIconDiv?.outerHTML || '';
							}

							// Update Suffix (Tick mark)
							let suffix = itemEl.querySelector('[slot="suffix"]');
							if (isSelected) {
								if (!suffix) {
									suffix = document.createElement('span');
									suffix.setAttribute('slot', 'suffix');
									suffix.className = 'tick-wrapper';
									itemEl.appendChild(suffix);
								}
								suffix.innerHTML = tickMarkIcon({ size: 10, color: '#475467' });
							} else if (suffix) {
								suffix.remove();
							}

							// Force-hide the built-in chevron in the sl-menu-item shadow DOM
							await hideShoelaceMenuItemChevron(itemEl);
						}
					} catch (err) {
						console.error('Error updating context dropdown selection:', err);
					}
				});

				dropdown._evaDropdownBound = true;
			}
		}

		// Single-source "Set as Context" button logic
		if (item?.sources?.length === 1) {
			const messageId = item?.messageId || item?.id;
			const btn = document.getElementById(`setContextButton-${messageId}`);
			if (btn && !btn._evaSingleBound) {
				btn.addEventListener('click', (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					console.log('Single source context button clicked');
					onSetAsSource(ev, item.sources[0]);
				});
				btn._evaSingleBound = true;
			}
		}

		if (item?.showMultiSourceList) {
			item?.sources?.map((data, i) => {
				let listItem = document.getElementById(
					`multiSourceListItem-${item?.id}-${data?.docId}`
				);
				let askFollowupButton = document.getElementById(
					`askFollowupButton-${item?.id}-${data?.docId}`
				);
				if (listItem && !listItem.eventListenerAdded) {
					listItem.addEventListener("click", () => {
						openInNewTab(data);
					});
					listItem.eventListenerAdded = true;
				}
				if (
					askFollowupButton &&
					!askFollowupButton.eventListenerAdded
				) {
					askFollowupButton.addEventListener("click", (e) => {
						e?.preventDefault();
						e?.stopPropagation();
						onSetAsSource(e, data);
					});
					askFollowupButton.eventListenerAdded = true;
				}
			});
		}

		// if (item?.sources?.length === 1) {
		// 	let chip = document.getElementById(`ansFromChip-${item?.id}`);
		// 	if (chip && !chip.eventListenerAdded) {
		// 		chip.addEventListener("click", (e) => {
		// 			e?.preventDefault();
		// 			e?.stopPropagation();
		// 			showDataAction();
		// 		});
		// 		chip.eventListenerAdded = true;
		// 	}
		// }

		// When split panel is used, only left-splitter-opener toggles the panel (see below)
		const hasSplitPanel = !!(item?.hasData || item?.sources?.[0]?.source === "customQnAAPI");
		if (item?.sources?.length === 1 && !hasSplitPanel) {
			let chip = document.getElementById(`ansFromChip-${item?.id}`);

			if (chip && !chip.eventListenerAdded) {
				// Add listener to the chip element (capture phase to catch event early)
				chip.addEventListener("click", (e) => {
					// IGNORE clicks if they originate from action chips (context, feedback, copy, etc.)
					if (e.target.closest('.answerActionChips')) {
						return;
					}

					e?.preventDefault();
					e?.stopPropagation();
					showDataAction();
				}, true);

				// Add listener to all child elements (icon, text span, etc.)				
				const childElements = chip.querySelectorAll('*:not(.answerActionChips *)');
				childElements.forEach((child) => {
					child.addEventListener("click", (e) => {
						if (e.target.closest('.answerActionChips')) return;
						e?.stopPropagation();
						e?.preventDefault();
						showDataAction();
					}, true);
				});

				// Add listener to parent element
				const parent = chip.parentElement;
				if (parent && !parent.eventListenerAdded) {
					parent.addEventListener("click", (e) => {
						// IGNORE clicks from action chips
						if (e.target.closest('.answerActionChips')) {
							return;
						}

						e?.preventDefault();
						e?.stopPropagation();
						showDataAction();
					}, true);
					parent.eventListenerAdded = true;
					parent.style.cursor = 'pointer';
				}

				chip.eventListenerAdded = true;
			}
		}

		// Open chatFilterGroup in Shoelace drawer (aligned to window) when left-splitter-opener is clicked
		const chipForOpener = document.getElementById(`ansFromChip-${item?.id}`);
		const opener = chipForOpener?.querySelector(".left-splitter-opener");
		if (opener && !opener.drawerListenerAdded) {
			opener.drawerListenerAdded = true;
			opener.style.cursor = "pointer";
			opener.addEventListener("click", (e) => {
				e?.preventDefault();
				e?.stopPropagation();
				const drawer = document.getElementById(`ansFromChip-drawer-${item?.id}`);
				if (drawer && typeof drawer.show === "function") {
					drawer.show();
				} else {
					showDataAction();
				}
			});
		}

		// Add event listeners for sources chip and Related Search Results button
		// Find elements within the current item's container
		// Try multiple selectors to find the container
		const ansFromChipEl = document.getElementById(`ansFromChip-${item?.id}`);
		const itemContainer = ansFromChipEl?.closest('.answerFromChipDiv') ||
			ansFromChipEl?.closest('.ansFromChip')?.closest('.answerFromChipDiv') ||
			document.querySelector(`.answerFromChipDiv:has(#ansFromChip-${item?.id})`) ||
			document.querySelector(`[data-item-id="${item?.id}"]`);

		// Find buttons directly if container search fails
		const sourceChipItem = itemContainer?.querySelector(`[data-open-sources="sources"]`) ||
			document.querySelector(`#ansFromChip-${item?.id} [data-open-sources="sources"]`) ||
			document.querySelector(`.answerFromChipDiv:has(#ansFromChip-${item?.id}) [data-open-sources="sources"]`);
		const relatedSearchResultsBtn = itemContainer?.querySelector(`[data-open-sources="searchResults"]`) ||
			document.querySelector(`#ansFromChip-${item?.id} [data-open-sources="searchResults"]`) ||
			document.querySelector(`.answerFromChipDiv:has(#ansFromChip-${item?.id}) [data-open-sources="searchResults"]`);

		if (sourceChipItem && !sourceChipItem.eventListenerAdded) {
			sourceChipItem.eventListenerAdded = true;
			sourceChipItem.addEventListener("click", (e) => {
				e?.preventDefault();
				e?.stopPropagation();
				openSourcesSidebar(item, 'sources');
			});
		}

		if (relatedSearchResultsBtn && !relatedSearchResultsBtn.eventListenerAdded) {
			relatedSearchResultsBtn.eventListenerAdded = true;
			relatedSearchResultsBtn.addEventListener("click", (e) => {
				e?.preventDefault();
				e?.stopPropagation();
				openSourcesSidebar(item, 'searchResults');
			});
		}

		// Attach list item listeners when showData is true or when drawer exists (hasData/customQnAAPI) so drawer content is interactive
		if (item?.showData || item?.hasData || item?.sources?.[0]?.source === "customQnAAPI") {
			/*for morgan stanley customQnAAPI */
			if (item?.sources?.[0]?.source === "customQnAAPI") {
				item?.content?.payload?.text?.body?.content_links_for_answer?.map((data, i) => {
					let listItem = document.getElementById(
						`openInNewTabIcon-${item?.id}-${data?.content_id}`
					);
					if (listItem && !listItem.eventListenerAdded) {
						listItem.addEventListener("click", () => {
							openInNewTab({ ...data, redirectUrl: { dweb: data?.content_url } });
						});
						listItem.eventListenerAdded = true;
					}
				});
			}
			else if (Array.isArray(item?.data)) {
				item.data.map((data, i) => {
					let listItem = document.getElementById(
						`listItem-${item?.id}-${data?.docId}`
					);
					let newTabIcon = document.getElementById(
						`openInNewTabIcon-${item?.id}-${data?.docId}`
					);
					let askFollowupButton = document.getElementById(
						`askFollowupButton-${item?.id}-${data?.docId}`
					);
					if (listItem && !listItem.eventListenerAdded) {
						listItem.addEventListener("click", () => {
							openInNewTab(data);
						});
						listItem.eventListenerAdded = true;
					}
					if (newTabIcon && !newTabIcon.eventListenerAdded) {
						newTabIcon.addEventListener("click", () => {
							openInNewTab(data);
						});
						newTabIcon.eventListenerAdded = true;
					}
					if (
						askFollowupButton &&
						!askFollowupButton.eventListenerAdded
					) {
						askFollowupButton.addEventListener("click", (e) => {
							e?.preventDefault();
							e?.stopPropagation();
							onSetAsSource(e, data);
						});
						askFollowupButton.eventListenerAdded = true;
					}
				});
			}
		}



		// Add copy answer button event listener
		if (item?.answer) {
			// let copyAnswerButton = document.getElementById(
			// 	`copyAnswerButton-${item?.id}`
			// );
			// if (copyAnswerButton && !copyAnswerButton.eventListenerAdded) {
			// 	copyAnswerButton.addEventListener("click", (e) => {
			// 		e?.preventDefault();
			// 		e?.stopPropagation();
			// 		copyAnswerToClipboard();
			// 	});
			// 	copyAnswerButton.eventListenerAdded = true;
			// }

			let exportWordButton = document.getElementById(
				`exportWordButton-${item?.messageId}`
			);
			if (exportWordButton && !exportWordButton.eventListenerAdded) {
				exportWordButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					exportAnswerToWord();
				});
				exportWordButton.eventListenerAdded = true;
			}
		}

		if (!item?.disableFeedback) {
			let feedbackLikeButton = document.getElementById(
				`feedbackLikeButton-${item?.messageId}`
			);
			if (feedbackLikeButton && !feedbackLikeButton.eventListenerAdded) {
				feedbackLikeButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					console.log("feedbackLikeButton clicked");
					submitUserFeedback({
						type: "like",
						cId: item?.cId || item?.reqId,
						payload: {
							feedback: "like",
						},
					});
				});
			}
			let feedbackDislikeButton = document.getElementById(
				`feedbackDislikeButton-${item?.messageId}`
			);
			if (feedbackDislikeButton && !feedbackDislikeButton.eventListenerAdded) {
				feedbackDislikeButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					console.log("feedbackDislikeButton clicked");
					if (item?.feedback === "dislike") {
						submitUserFeedback({
							type: "dislike",
							cId: item?.cId || item?.reqId,
							payload: {
								"action": "undo",
							}
						});
						return;
					}

					// Toggle feedback popup overlay
					const feedbackPopup = document.getElementById(`feedbackPopup-${item?.messageId}`);
					if (feedbackPopup) {

						if (feedbackPopup.tagName.toLowerCase() === 'sl-popup' && typeof feedbackPopup.show !== 'function') {
							if (window.customElements && window.customElements.upgrade) {
								customElements.upgrade(feedbackPopup);
							}

						}

						const isOpen = feedbackPopup.hasAttribute('active') || feedbackPopup.active;

						if (isOpen) {
							// Hide popup with fallback
							if (typeof feedbackPopup.hide === 'function') {
								feedbackPopup.hide();
							} else {
								console.warn("Shoelace hide() method not available, using fallback");
								feedbackPopup.removeAttribute('active');
								feedbackPopup.style.display = 'none';
							}
							feedbackDislikeButton.classList.remove('active');
						} else {

							feedbackPopup.anchor = feedbackDislikeButton;


							// Show popup with fallback
							if (typeof feedbackPopup.show === 'function') {
								feedbackPopup.show();
							} else {
								feedbackPopup.setAttribute('active', '');
								feedbackPopup.style.display = 'block';
							}
							feedbackDislikeButton.classList.add('active');
						}
					} else {
						console.error("Feedback popup not found:", `feedbackPopup-${item?.messageId}`);
					}
				});
			}
			feedbackLikeButton.eventListenerAdded = true;
			feedbackDislikeButton.eventListenerAdded = true;

			const checkSubmitButtonState = () => {
				const feedbackPopup = document.getElementById(`feedbackPopup-${item?.messageId}`);
				const submitBtn = feedbackPopup?.querySelector('button[data-action="submit-feedback"]');

				if (submitBtn && feedbackPopup) {
					// Check if any feedback option is selected
					const selectedOptionsData = feedbackPopup.getAttribute('data-selected-options');
					const selectedOptions = selectedOptionsData ? JSON.parse(selectedOptionsData) : [];
					const hasSelectedOption = selectedOptions.length > 0;

					// Check if textarea has content
					const textarea = feedbackPopup.querySelector('sl-textarea');
					const hasTextContent = textarea && textarea.value && textarea.value.trim().length > 0;

					// Enable submit button if either condition is met
					if (hasSelectedOption || hasTextContent) {
						submitBtn.disabled = false;
						submitBtn.classList.remove('disable');
					} else {
						submitBtn.disabled = true;
						submitBtn.classList.add('disable');
					}
				}
			};

			// Add feedback options multi-selection functionality for Shoelace buttons
			const feedbackOptions = document.querySelectorAll(`.feedbackChip[data-message-id="${item?.messageId}"]`);
			feedbackOptions.forEach(option => {
				if (!option.eventListenerAdded) {
					option.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();

						// Toggle active state for Shoelace button
						const isActive = option.classList.contains('selectedChip');
						if (isActive) {
							option.classList.remove('selectedChip');
							option.variant = 'default';
						} else {
							option.classList.add('selectedChip');
							option.variant = 'primary';
						}

						// Log selected options for debugging
						const selectedOptions = Array.from(feedbackOptions)
							.filter(opt => opt.classList.contains('selectedChip'))
							.map(opt => ({
								id: opt.getAttribute('data-feedback-id'),
								label: opt.textContent.trim()
							}));


						// Storing selected options in data attribute for submission
						const feedbackPopup = document.getElementById(`feedbackPopup-${item?.messageId}`);
						if (feedbackPopup) {
							feedbackPopup.setAttribute('data-selected-options', JSON.stringify(selectedOptions));
						}

						// Check if submit button should be enabled
						checkSubmitButtonState();
					});
					option.eventListenerAdded = true;
				}
			});

			const feedbackPopup = document.getElementById(`feedbackPopup-${item?.messageId}`);
			if (feedbackPopup) {
				const textarea = feedbackPopup.querySelector('sl-textarea');
				if (textarea && !textarea.inputListenerAdded) {
					textarea.addEventListener('sl-input', () => {
						checkSubmitButtonState();
					});
					textarea.inputListenerAdded = true;
				}
			}

			if (feedbackPopup && !feedbackPopup.eventListenerAdded) {

				// Submit button handler
				const submitBtn = feedbackPopup.querySelector('button[data-action="submit-feedback"]');
				if (submitBtn) {
					submitBtn.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();

						// Get message ID from button data attribute
						const messageId = submitBtn.getAttribute('data-message-id');

						// Get selected options
						const selectedOptionsData = feedbackPopup.getAttribute('data-selected-options');
						const selectedOptions = selectedOptionsData ? JSON.parse(selectedOptionsData) : [];

						// Get textarea content - Shoelace textarea
						const textarea = feedbackPopup.querySelector('sl-textarea');
						const comment = textarea ? textarea.value.trim() : '';

						// Submit feedback with selected options and comment
						submitUserFeedback({
							type: "dislike",
							cId: item?.cId || item?.reqId,
							messageId: messageId, // Use the messageId from button attribute
							payload: {
								feedback: "dislike",
								comment: comment,
								category: selectedOptions.map(opt => opt.label) // For backward compatibility
							},
						});

						/*need to display received feedback text*/
						const feedbacksuccesstextDiv = document.querySelector('.feedbacksuccesstext');
						if (feedbacksuccesstextDiv) {
							feedbacksuccesstextDiv.style.display = 'block';
						}
						setTimeout(() => {
							if (typeof feedbackPopup.hide === 'function') {
								feedbackPopup.hide();
							} else {
								feedbackPopup.setAttribute('active', true);
								feedbackPopup.style.display = 'none';
							}
						}, 2000);

					});
				}

				// Handle click outside to close popup
				const handlePopupHide = () => {
					const dislikeBtn = document.getElementById(`feedbackDislikeButton-${item?.messageId}`);
					if (dislikeBtn) {
						dislikeBtn.classList.remove('active');
					}
				};

				// Listen for hide events
				feedbackPopup.addEventListener('sl-hide', handlePopupHide);
				feedbackPopup.addEventListener('sl-after-hide', handlePopupHide);

				// Click outside to close popup
				const clickOutsideHandler = (event) => {
					const isPopupOpen = feedbackPopup.hasAttribute('active') || feedbackPopup.active;

					if (isPopupOpen) {
						// Check if click is outside the popup and dislike button
						const isClickInsidePopup = feedbackPopup.contains(event.target);
						const isClickOnDislikeButton = event.target.closest(`#feedbackDislikeButton-${item?.messageId}`);

						if (!isClickInsidePopup && !isClickOnDislikeButton) {
							submitUserFeedback({
								type: "dislike",
								cId: item?.cId || item?.reqId,
								payload: {
									feedback: "dislike"
								},
							});

							// Hide popup with fallback
							if (typeof feedbackPopup.hide === 'function') {
								feedbackPopup.hide();
							} else {
								console.warn("Shoelace hide() method not available, using fallback");
								feedbackPopup.removeAttribute('active');
								feedbackPopup.style.display = 'none';
							}

							// Remove active state from dislike button
							const dislikeBtn = document.getElementById(`feedbackDislikeButton-${item?.messageId}`);
							if (dislikeBtn) {
								dislikeBtn.classList.remove('active');
							}
						}
					}
				};

				// Add click outside listener to document
				document.addEventListener('click', clickOutsideHandler);

				// Store reference to remove listener later if needed
				feedbackPopup._clickOutsideHandler = clickOutsideHandler;

				// Also check for attribute changes as fallback
				const observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.type === 'attributes' && mutation.attributeName === 'active') {
							if (!feedbackPopup.hasAttribute('active')) {
								handlePopupHide();
							}
						}
					});
				});
				observer.observe(feedbackPopup, { attributes: true, attributeFilter: ['active'] });

				feedbackPopup.eventListenerAdded = true;
			}
		}


		// Add three dot menu functionality
		const messageId = item?.messageId || item?.reqId;
		const threeDotTrigger = document.querySelector(`[data-three-dot-trigger="${messageId}"]`);
		const threeDotDropdown = document.querySelector(`[data-three-dot-dropdown="${messageId}"]`);


		// Let Shoelace handle dropdown behavior automatically - no manual control needed

		// Add menu item event listeners
		if (threeDotDropdown && !threeDotDropdown.eventListenerAdded) {
			const menuItems = threeDotDropdown.querySelectorAll('.menu-item');

			menuItems.forEach(menuItem => {
				menuItem.addEventListener('click', (e) => {
					console.log('Menu item clicked');
					e.preventDefault();
					e.stopPropagation();

					const action = menuItem.getAttribute('data-menu-action');
					const actionType = menuItem.getAttribute('data-action-type');

					// Close Shoelace dropdown after selection
					const dropdown = threeDotDropdown.closest('sl-dropdown');
					if (dropdown) {
						dropdown.hide();
					}

					console.log('Menu action:', action, 'Type:', actionType);

					// Handle integration actions
					if (actionType === 'integration') {
						console.log(`Executing integration action: ${action}`);

						switch (action) {
							case 'gmail':
								IntegrationsActions(e, 'gmail', item);
								// Add Gmail integration logic here
								break;
							case 'outlook':
								IntegrationsActions(e, 'outlook', item);
								// Add Outlook integration logic here
								break;
							case 'slack':
								IntegrationsActions(e, 'slack', item);
								// Add Slack integration logic here
								break;
							case 'msteams':
								IntegrationsActions(e, 'msteams', item);
								// Add Teams integration logic here
								break;
							case 'jira':
								IntegrationsActions(e, 'jira', item);
								// Add Jira integration logic here
								break;
							default:
								console.log('Unknown integration action:', action);
						}
						return;
					}

					// Handle default actions
					switch (action) {
						case 'copy':
							// Trigger copy functionality
							const copyButton = document.getElementById(`copyAnswerButton-${item?.id}`);
							if (copyButton) {
								copyButton.click();
							} else {
								console.log('Copy button not found for id:', `copyAnswerButton-${item?.id}`);
							}
							break;
						case 'regenerate':
							// Trigger regenerate functionality
							console.log('Regenerate response for:', messageId);
							// Add regenerate logic here
							break;
						case 'feedback':
							// Trigger feedback functionality
							console.log('Provide feedback for:', messageId);
							// Add feedback logic here
							break;
						case 'share':
							// Trigger share functionality
							console.log('Share response for:', messageId);
							// Add share logic here
							break;
						default:
							console.log('Unknown menu action:', action);
					}
				});
			});

			threeDotDropdown.eventListenerAdded = true;
		}

		// Shoelace handles outside clicks automatically - no manual handling needed
	};

	const renderLogic = () => {
		if (item?.viewType === "table") {
			tableChipLogic();
		} else {
			knowledgeChipLogic();
		}
	};

	return renderLogic();
};

export default AnsFromChipFunctionality;
