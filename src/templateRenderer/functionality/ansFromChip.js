import { cloneDeep } from "lodash";
import { updateChatData } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";
import { getRelevantQuestions } from "../../redux/actions/global.action";
import { highlightQuotedText } from "../utils/helper";
import { InitiateChatConversationAction } from "../../chat";
import { submitUserFeedback } from "../../Feedback";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";

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
				// Optional: Show success feedback
				console.log("Answer copied to clipboard");
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
