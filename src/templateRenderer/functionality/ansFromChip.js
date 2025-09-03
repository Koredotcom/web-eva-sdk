import { cloneDeep } from "lodash";
import { updateChatData } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";
import { getRelevantQuestions } from "../../redux/actions/global.action";
import { highlightQuotedText } from "../utils/helper";
import { InitiateChatConversationAction, toast } from "../../chat";
import { submitUserFeedback } from "../../Feedback";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import chatInterface from "../../chat/ChatInterface";

const AnsFromChipFunctionality = ({ item }) => {
	const getRelevantQuestionsData = async () => {
		let state = store.getState()?.global;
		let _questions = cloneDeep(state?.questions);
		let constId = item?.cId || item?.id;

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
			let constId = item?.cId || item?.id;
			let showGPTDialog = !!_questions[constId]?.showGPTDialog;
			_questions[constId].showGPTDialog = !showGPTDialog;
			store.dispatch(updateChatData(_questions));
		}
		if (
			item?.sources?.length === 1 &&
			item?.sources[0]?.hasOwnProperty("redirectUrl")
		) {
			openInNewTab(item?.sources?.[0]);
		} else if (item?.sources?.length > 1) {
			let state = store.getState()?.global;
			let _questions = cloneDeep(state?.questions);
			let constId = item?.cId || item?.id;
			let showMultiSourceList =
				!!_questions[constId]?.showMultiSourceList;
			_questions[constId].showMultiSourceList = !showMultiSourceList;
			store.dispatch(updateChatData(_questions));
		} else {
			let state = store.getState()?.global;
			let _questions = cloneDeep(state?.questions);
			let constId = item?.cId || item?.id;
			let showData = !!_questions[constId]?.showData;
			_questions[constId].showData = !showData;
			store.dispatch(updateChatData(_questions));
		}
	};

	const openInNewTab = (data) => {
		window.open(data?.redirectUrl?.dweb, "_blank");
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
			sessionItemHandler({
				item: data,
				duplicateErr: true,
				type: sourceType,
			});
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
			// sessionItemHandler({ appContext, dispatch, item: { ..._selectedContext, source: 'attachment' }, viewType: item?.viewType, type: sourceType })
		} else if (item?.templateType === 'search_results') {
			// Specific for search result 
			obj = {			
				item: item?.sources?.[0],
				type: 'accountKnowledge',
				discardPrevSession: true
			}
			sessionItemHandler(obj)
		} else {

			obj = {
				boardId: item.boardId,
				messageId,
			
				item: item?.sources?.[0],
				duplicateErr: true,
				viewType: item?.viewType,
				type: sourceType
			}
			// if(selectedContext?.sources?.[0]?.isAgent) {
			// if (sourceType === 'agent' || selectedContext?.sources?.[0]?.isAgent) {
			// 	obj.discardPrevSession = true
			// }
			// if (selectedContext?.viewType === "table") {
			// 	obj.override = true
			// }
			sessionItemHandler(obj)
		}
		// menuHide()
		
	}

	const IntegrationsActions = (e, source, item) => {	
		let payload = {}
		if(source === 'gmail') {
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
		chatInterface().initiateChatConversationAction({payload})
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

		if (item?.sources?.length === 1) {
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

		if (item?.showData) {
			item?.data?.map((data, i) => {
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

		if (item?.showGPTDialog) {
			let dialog = document.getElementById(`gptDialog-${item?.id}`);
			let closeBtn = document.getElementById(
				`close-btn-dialog-${item?.id}`
			);
			if (closeBtn && !closeBtn.eventListenerAdded) {
				closeBtn.addEventListener("click", () => {
					dialog.close();
					dialog.remove();
				});
				closeBtn.eventListenerAdded = true;
			}
		}

		// Add copy answer button event listener
		if (item?.answer) {
			let copyAnswerButton = document.getElementById(
				`copyAnswerButton-${item?.id}`
			);
			if (copyAnswerButton && !copyAnswerButton.eventListenerAdded) {
				copyAnswerButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					copyAnswerToClipboard();
				});
				copyAnswerButton.eventListenerAdded = true;
			}

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
		
		if(!item?.disableFeedback) {
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
					submitUserFeedback({
						type: "dislike",
						cId: item?.cId || item?.reqId,
						payload: {
							feedback: "dislike",
						},
					});
				});
			}
			feedbackLikeButton.eventListenerAdded = true;
			feedbackDislikeButton.eventListenerAdded = true;
		}

		if(item?.context?.enable){
			let setContextButton = document.getElementById(
				`setContextButton-${item?.messageId}`
			);
			if (setContextButton && !setContextButton.eventListenerAdded) {
				setContextButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();

				});
		}
	}


		// Add three dot menu functionality
		const messageId = item?.messageId || item?.reqId;
		const threeDotTrigger = document.querySelector(`[data-three-dot-trigger="${messageId}"]`);
		const threeDotDropdown = document.querySelector(`[data-three-dot-dropdown="${messageId}"]`);
		
		
		if (threeDotTrigger && threeDotDropdown && !threeDotTrigger.eventListenerAdded) {
			threeDotTrigger.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				
				// Toggle dropdown visibility
				const dropdown = threeDotDropdown;
				const isHidden = dropdown.style.display === 'none' || 
								dropdown.style.display === '' || 
								!dropdown.style.display;
				
				if (isHidden) {
					// Close any other open dropdowns first
					document.querySelectorAll('[data-three-dot-dropdown]').forEach(dd => {
						dd.style.display = 'none';
					});
					
					// Remove active class from all triggers
					document.querySelectorAll('[data-three-dot-trigger]').forEach(trigger => {
						trigger.classList.remove('active');
					});
					
					// Show this dropdown
					dropdown.style.display = 'flex';
					dropdown.style.position = 'fixed';
					dropdown.style.zIndex = '9999';
					
					// Add active class to this trigger
					threeDotTrigger.classList.add('active');
					
					// Position the dropdown relative to the trigger button
					const rect = threeDotTrigger.getBoundingClientRect();
					dropdown.style.top = `${rect.bottom + 5}px`;
					dropdown.style.left = `${Math.max(10, rect.right - 220)}px`; // 220px is menu width, with 10px minimum margin
					
				} else {
					dropdown.style.display = 'none';
					// Remove active class from this trigger
					threeDotTrigger.classList.remove('active');
				}
			});
			threeDotTrigger.eventListenerAdded = true;
		} else {
			console.log('Three dot trigger not found or already has listener:');
		}

		// Add menu item event listeners
		if (threeDotDropdown && !threeDotDropdown.eventListenerAdded) {
			const menuItems = threeDotDropdown.querySelectorAll('sl-menu-item');
			console.log('Found menu items:', menuItems.length);
			
			menuItems.forEach(menuItem => {
				menuItem.addEventListener('click', (e) => {
					console.log('Menu item clicked');
					e.preventDefault();
					e.stopPropagation();
					
					const action = menuItem.getAttribute('data-menu-action');
					const actionType = menuItem.getAttribute('data-action-type');
					threeDotDropdown.style.display = 'none'; // Close menu after selection
					
					// Remove active class from trigger when menu item is clicked
					threeDotTrigger.classList.remove('active');
					
					console.log('Menu action:', action, 'Type:', actionType);
					
					// Handle integration actions
					if (actionType === 'integration') {
						console.log(`Executing integration action: ${action}`);
						
						switch(action) {
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
					switch(action) {
						case 'copy':
							// Trigger copy functionality
							const copyButton = document.getElementById(`copyAnswerButton-${item?.id}`);
							if (copyButton) {
								console.log('Triggering copy button');
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

		// Close dropdown when clicking outside
		if (!document.threeDotOutsideClickAdded) {
			document.addEventListener('click', (e) => {
				if (!e.target.closest('.three-dot-menu-container')) {
					document.querySelectorAll('[data-three-dot-dropdown]').forEach(dd => {
						dd.style.display = 'none';
					});
					// Remove active class from all triggers when clicking outside
					document.querySelectorAll('[data-three-dot-trigger]').forEach(trigger => {
						trigger.classList.remove('active');
					});
				}
			});
			document.threeDotOutsideClickAdded = true;
		}
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
