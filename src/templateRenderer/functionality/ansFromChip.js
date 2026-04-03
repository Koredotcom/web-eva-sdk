import { cloneDeep } from "lodash";
import { updateChatData, setAnswerSources, setSelectedContext } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";
import { getRelevantQuestions, submitFeedback } from "../../redux/actions/global.action";
import { highlightQuotedText } from "../utils/helper";
import { InitiateChatConversationAction } from "../../chat";
import { submitUserFeedback } from "../../Feedback";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import chatInterface from "../../chat/ChatInterface";
import SourcesSidebarInstance from "../../sources/SourcesSidebar.js";
import { renderIcons } from "../../utils/helpers";
import { createThumbsUp, createThumbsUpFilled, createThumbsDown, createThumbsDownFilled, tickMarkIcon } from "../icons-library";

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
		const showCopiedMessage = () => {
			const el = document.getElementById(`copyAnswerMessage-${item?.messageId}`);
			if (!el) return;
			el.style.display = "flex";
			setTimeout(() => {
				el.style.display = "none";
			}, 3000);
		};

		try {
			if (!item?.answer) return;

			const messageDiv = document.querySelector(`#answer-${item?.messageId} .message-renderer`);
			if (messageDiv && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
				const htmlData = messageDiv.outerHTML;
				const blob = new Blob([htmlData], { type: "text/html" });
				const clipboardItem = new ClipboardItem({ "text/html": blob });
				await navigator.clipboard.write([clipboardItem]);
				showCopiedMessage();
				return;
			}

			await navigator.clipboard.writeText(item.answer);
			showCopiedMessage();
		} catch (err) {
			console.error("Failed to copy answer to clipboard:", err);
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = item?.answer || "";
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			showCopiedMessage();
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

// Convert HTML to formatted plain text (for PDF export, ported from Kora-React MenuOptions)
const htmlToFormattedText = (html) => {
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = html;
	const processNode = (node, indent = '') => {
		let result = '';
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent.replace(/\s+/g, ' ');
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return '';
		const tagName = node.tagName.toLowerCase();
		const children = Array.from(node.childNodes);
		switch (tagName) {
			case 'h1': result += '\n' + processChildren(children, indent) + '\n\n'; break;
			case 'h2': result += '\n' + processChildren(children, indent) + '\n\n'; break;
			case 'h3': case 'h4': case 'h5': case 'h6':
				result += '\n' + processChildren(children, indent) + '\n\n'; break;
			case 'p': result += processChildren(children, indent) + '\n\n'; break;
			case 'br': result += '\n'; break;
			case 'ul': result += processChildren(children, indent + '  ', 'ul') + '\n'; break;
			case 'ol': result += processChildren(children, indent + '  ', 'ol', 0) + '\n'; break;
			case 'li': result += indent + '- ' + processChildren(children, indent + '  ').trim() + '\n'; break;
			case 'strong': case 'b': result += processChildren(children, indent); break;
			case 'em': case 'i': result += processChildren(children, indent); break;
			case 'code': result += '`' + processChildren(children, indent) + '`'; break;
			case 'pre': result += '\n' + processChildren(children, indent) + '\n\n'; break;
			case 'blockquote': result += '\n> ' + processChildren(children, indent).trim() + '\n\n'; break;
			case 'table': result += processTable(node, indent) + '\n'; break;
			case 'a': result += processChildren(children, indent); break;
			default: result += processChildren(children, indent); break;
		}
		return result;
	};
	const processChildren = (children, indent, listType, startNum) => {
		let result = '';
		let num = startNum !== undefined ? startNum : 1;
		children.forEach(child => {
			if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li' && listType === 'ol') {
				result += indent + num + '. ' + processNode(child, indent + '   ').replace(/^- /, '').trim() + '\n';
				num++;
			} else {
				result += processNode(child, indent);
			}
		});
		return result;
	};
	const processTable = (table, indent) => {
		let result = '\n';
		const rows = table.querySelectorAll('tr');
		rows.forEach((row, rowIdx) => {
			const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
			result += indent + cells.join(' | ') + '\n';
			if (rowIdx === 0) result += indent + cells.map(() => '---').join(' | ') + '\n';
		});
		return result;
	};
	return processNode(tempDiv, '').trim();
};

// Sanitize text to ASCII-safe characters for PDF (basic fonts don't support Unicode)
const sanitizeForPDF = (text) => {
	let result = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
	const replacements = {
		'•': '-', '●': '-', '○': '-', '◦': '-', '▪': '-', '▫': '-', '◆': '-', '◇': '-',
		'►': '>', '▶': '>', '→': '->', '←': '<-', '↓': 'v', '↑': '^',
		'\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201A': "'", '`': "'",
		'\u2013': '-', '\u2014': '-', '\u2015': '-', '\u2010': '-',
		'\u00A0': ' ', '\u2003': ' ', '\u2002': ' ', '\u2009': ' ',
		'\u00B7': '.', '\u2022': '-', '\u25CF': '-', '\u25CB': 'o',
		'\u00AE': '(R)', '\u00A9': '(C)', '\u2122': '(TM)',
		'\u00B0': 'deg', '\u00B1': '+/-', '\u00D7': 'x', '\u00F7': '/',
		'\u2026': '...', '\u2019': "'",
	};
	Object.entries(replacements).forEach(([k, v]) => { result = result.split(k).join(v); });
	// Remove remaining non-ASCII characters
	result = result.replace(/[^\x00-\x7E]/g, '?');
	return result;
};

// Pure JS PDF Generator (ported from Kora-React MenuOptions)
const createPDF = (textContent) => {
	const pageWidth = 595, pageHeight = 842, margin = 50, lineHeight = 16, fontSize = 11;
	const maxLineWidth = pageWidth - margin * 2;
	const charsPerLine = Math.floor(maxLineWidth / (fontSize * 0.5));
	const escapePdfText = (text) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
	const wrapText = (text, maxChars) => {
		const lines = [];
		text.split('\n').forEach(line => {
			if (line.trim() === '') { lines.push(''); return; }
			const leading = line.match(/^(\s*)/)[1];
			const trimmed = line.trim();
			const effMax = maxChars - leading.length;
			if (trimmed.length <= effMax) { lines.push(leading + trimmed); return; }
			const words = trimmed.split(/\s+/);
			let cur = leading;
			words.forEach(word => {
				const test = cur + (cur.trim() ? ' ' : '') + word;
				if (test.length <= maxChars) { cur = test; }
				else { if (cur.trim()) lines.push(cur); cur = leading + word; }
			});
			if (cur.trim()) lines.push(cur);
		});
		return lines;
	};
	const allLines = wrapText(textContent, charsPerLine);
	const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
	const pages = [];
	for (let i = 0; i < allLines.length; i += linesPerPage) pages.push(allLines.slice(i, i + linesPerPage));
	if (pages.length === 0) pages.push(['']);
	let offsets = [];
	let pdf = '%PDF-1.4\n';
	const addObj = (c) => { offsets.push(pdf.length); pdf += c; };
	addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
	const pageRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
	addObj(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj\n`);
	let objNum = 3;
	const fontObjNum = 3 + pages.length * 2;
	pages.forEach(pageLines => {
		const contentObjNum = objNum + 1;
		addObj(`${objNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj\n`);
		objNum++;
		let stream = `BT\n/F1 ${fontSize} Tf\n${margin} ${pageHeight - margin} Td\n0 -${lineHeight} Td\n`;
		pageLines.forEach(line => { stream += `(${escapePdfText(line)}) Tj\n0 -${lineHeight} Td\n`; });
		stream += 'ET';
		addObj(`${objNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
		objNum++;
	});
	addObj(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);
	const xref = pdf.length;
	const total = fontObjNum + 1;
	pdf += `xref\n0 ${total}\n0000000000 65535 f \n`;
	offsets.forEach(o => { pdf += o.toString().padStart(10, '0') + ' 00000 n \n'; });
	pdf += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
	return pdf;
};

const exportAnswerToPDF = () => {
	try {
		if (!item?.answer) { console.warn("No answer to export"); return; }
		const rendered = customMarkdownRenderer(item.answer);
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = rendered;
		const formatted = htmlToFormattedText(rendered);
		const plain = sanitizeForPDF(formatted);
		const pdfContent = createPDF(plain);
		const blob = new Blob([pdfContent], { type: 'application/pdf' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'Response.pdf';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
	} catch (err) {
		console.error('Error generating PDF:', err);
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
		// Clear any existing agent/attachment context first, then set the integration
		// agent as the new context so the compose bar banner updates to show the
		// integration (Gmail/Slack/Teams/Outlook/Jira) instead of the previous agent.
		store.dispatch(setSelectedContext(null));

		const state = store.getState()?.global;
		const allAgents = state?.allAgents?.data?.agents || [];
		const integrationAgent = allAgents.find(
			a => a?.appId === source && a?.custom === false && a?.type === 'dataAgent'
		);
		if (integrationAgent) {
			const contextData = {
				data: {
					sources: [{
						source: integrationAgent.id || integrationAgent._id,
						title: integrationAgent.name,
						name: integrationAgent.name,
						icon: integrationAgent.icon || integrationAgent.iconUrl,
						isAgent: true,
						agentType: integrationAgent.type,
						appId: integrationAgent.appId,
					}],
					isAgent: true,
				}
			};
			store.dispatch(setSelectedContext(contextData));
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
		store.dispatch(setSelectedContext(null));
		chatInterface().initiateChatConversationAction({ payload })
	}


	const knowledgeChipLogic = () => {
		// Main "Answer From" chip click logic
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
		const ansFromChipEl = document.getElementById(`ansFromChip-${item?.id}`);
		const itemContainer = ansFromChipEl?.closest('.answerFromChipDiv') ||
			ansFromChipEl?.closest('.ansFromChip')?.closest('.answerFromChipDiv') ||
			document.querySelector(`.answerFromChipDiv:has(#ansFromChip-${item?.id})`) ||
			document.querySelector(`[data-item-id="${item?.id}"]`);

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

		// Attach list item listeners when showData is true or when drawer exists
		if (item?.showData || item?.hasData || item?.sources?.[0]?.source === "customQnAAPI") {
			if (item?.sources?.[0]?.source === "customQnAAPI") {
				item?.content?.payload?.text?.body?.content_links_for_answer?.map((data, i) => {
					let listItem = document.getElementById(`openInNewTabIcon-${item?.id}-${data?.content_id}`);
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
					let listItem = document.getElementById(`listItem-${item?.id}-${data?.docId}`);
					let newTabIcon = document.getElementById(`openInNewTabIcon-${item?.id}-${data?.docId}`);
					let askFollowupButton = document.getElementById(`askFollowupButton-${item?.id}-${data?.docId}`);
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
					if (askFollowupButton && !askFollowupButton.eventListenerAdded) {
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
	};

	const actionChipsLogic = () => {
		const messageId = item?.messageId || item?.id;

		// 1. Multi-source dropdown logic
		if (item?.sources?.length > 1) {
			const dropdown = document.getElementById(`setContextDropdown-${messageId}`);
			if (dropdown && !dropdown._evaDropdownBound) {
				dropdown.addEventListener('sl-show', () => dropdown.classList.add('active'));
				dropdown.addEventListener('sl-hide', () => dropdown.classList.remove('active'));
				dropdown.addEventListener('sl-after-hide', () => dropdown.classList.remove('active'));

				dropdown.addEventListener('sl-select', (event) => {
					const itemEl = event.detail.item;
					const idxStr = itemEl.getAttribute('data-source-index');
					if (idxStr === null) return;
					const idx = parseInt(idxStr);
					const src = item?.sources?.[idx];
					if (src) {
						const fakeEvent = { preventDefault: () => { }, stopPropagation: () => { } };
						onSetAsSource(fakeEvent, src);
					}
				});

				dropdown.addEventListener('sl-show', async () => {
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
								return !!sId && !!srcId && sId === srcId;
							});

							if (isSelected) itemEl.classList.add('selected');
							else itemEl.classList.remove('selected');
							itemEl.removeAttribute('checked');

							const prefix = itemEl.querySelector('[slot="prefix"]');
							if (prefix) {
								const renderedIconDiv = renderIcons(src?.source, src?.extIcon, null, src?.iconUrl, src?.isSupervisor);
								prefix.innerHTML = renderedIconDiv?.outerHTML || '';
							}

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
							await hideShoelaceMenuItemChevron(itemEl);
						}
					} catch (err) { console.error('Error updating context dropdown selection:', err); }
				});

				dropdown._evaDropdownBound = true;
			}
		}

		// 2. Single-source "Set as Context" button logic
		if (item?.sources?.length === 1) {
			const btn = document.getElementById(`setContextButton-${messageId}`);
			if (btn && !btn._evaSingleBound) {
				btn.addEventListener('click', (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					onSetAsSource(ev, item.sources[0]);
				});
				btn._evaSingleBound = true;
			}
		}

		// 3. Multi-source list logic (e.g. follow-up list buttons)
		if (item?.showMultiSourceList) {
			item?.sources?.map((data, i) => {
				let askFollowupButton = document.getElementById(`askFollowupButton-${item?.id}-${data?.docId}`);
				if (askFollowupButton && !askFollowupButton.eventListenerAdded) {
					askFollowupButton.addEventListener("click", (e) => {
						e?.preventDefault();
						e?.stopPropagation();
						onSetAsSource(e, data);
					});
					askFollowupButton.eventListenerAdded = true;
				}
			});
		}

		// 4. Copy Answer Button
		if (item?.answer) {
			let copyAnswerButton = document.getElementById(`copyAnswerButton-${messageId}`);
			if (copyAnswerButton && !copyAnswerButton.eventListenerAdded) {
				copyAnswerButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					copyAnswerToClipboard();
				});
				copyAnswerButton.eventListenerAdded = true;
			}
		}

		// 5. Export Dropdown (PDF + Word)
		if (item?.answer) {
			const exportButton = document.getElementById(`exportButton-${messageId}`);
			const exportDropdownMenu = document.getElementById(`exportDropdownMenu-${messageId}`);
			if (exportButton && exportDropdownMenu && !exportButton.exportEventAdded) {
				exportButton.addEventListener("click", (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					const isOpen = exportDropdownMenu.style.display !== 'none';
					exportDropdownMenu.style.display = isOpen ? 'none' : 'block';
					exportButton.classList.toggle('active', !isOpen);
				});
				// Close dropdown when clicking outside
				document.addEventListener('click', (e) => {
					if (!exportButton.contains(e.target)) {
						exportDropdownMenu.style.display = 'none';
						exportButton.classList.remove('active');
					}
				});
				// Handle dropdown item clicks
				exportDropdownMenu.querySelectorAll('.exportDropdownItem').forEach(dropItem => {
					dropItem.addEventListener('click', (e) => {
						e?.preventDefault();
						e?.stopPropagation();
						const type = dropItem.getAttribute('data-export-type');
						exportDropdownMenu.style.display = 'none';
						exportButton.classList.remove('active');
						if (type === 'pdf') exportAnswerToPDF();
						else if (type === 'word') exportAnswerToWord();
					});
				});
				exportButton.exportEventAdded = true;
			}
		}

		// 6. Feedback (Like / Dislike)
		if (!item?.disableFeedback) {
			const cId = item?.cId || item?.reqId;

			const updateFeedbackUI = (newFeedback) => {
				const likeBtn = document.getElementById(`feedbackLikeButton-${messageId}`);
				const dislikeBtn = document.getElementById(`feedbackDislikeButton-${messageId}`);
				const isLiked = newFeedback === 'like';
				const isDisliked = newFeedback === 'dislike';
				if (likeBtn) {
					likeBtn.classList.toggle('active', isLiked);
					const span = likeBtn.querySelector('span');
					if (span) span.innerHTML = isLiked ? createThumbsUpFilled({ size: 16, color: '#12B76A' }) : createThumbsUp({ size: 16, color: '#667085' });
				}
				if (dislikeBtn) {
					dislikeBtn.classList.toggle('active', isDisliked);
					const span = dislikeBtn.querySelector('span');
					if (span) span.innerHTML = isDisliked ? createThumbsDownFilled({ size: 16, color: '#F04438' }) : createThumbsDown({ size: 16, color: '#667085' });
				}
			};

			const dispatchFeedback = async (payload) => {
				const state = store.getState().global;
				const msgId = item?.messageId;
				return store.dispatch(submitFeedback({
					boardId: state.activeBoardId,
					messageId: msgId,
					cId,
					payload
				}));
			};

			const syncReduxFeedback = (newFeedback) => {
				const questions = cloneDeep(store.getState().global.questions);
				if (questions[cId]) {
					questions[cId].feedback = newFeedback;
					questions[cId].userFeedback = newFeedback ? { type: newFeedback } : null;
					store.dispatch(updateChatData(questions));
				}
			};

			let feedbackLikeButton = document.getElementById(`feedbackLikeButton-${messageId}`);
			if (feedbackLikeButton && !feedbackLikeButton.eventListenerAdded) {
				feedbackLikeButton.addEventListener("click", async (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					const isCurrentlyLiked = feedbackLikeButton.classList.contains('active');
					const payload = isCurrentlyLiked ? { action: "undo" } : { feedback: "like" };
					const result = await dispatchFeedback(payload);
					if (result?.payload) {
						const newFeedback = isCurrentlyLiked ? null : 'like';
						updateFeedbackUI(newFeedback);
						syncReduxFeedback(newFeedback);
					}
				});
				feedbackLikeButton.eventListenerAdded = true;
			}

			let feedbackDislikeButton = document.getElementById(`feedbackDislikeButton-${messageId}`);
			if (feedbackDislikeButton && !feedbackDislikeButton.eventListenerAdded) {
				feedbackDislikeButton.addEventListener("click", async (e) => {
					e?.preventDefault();
					e?.stopPropagation();
					const isCurrentlyDisliked = feedbackDislikeButton.classList.contains('active');

					if (isCurrentlyDisliked) {
						const result = await dispatchFeedback({ action: "undo" });
						if (result?.payload) {
							updateFeedbackUI(null);
							syncReduxFeedback(null);
						}
						return;
					}

				const feedbackPopup = document.getElementById(`feedbackPopup-${messageId}`);
				if (feedbackPopup) {
					if (feedbackPopup.tagName.toLowerCase() === 'sl-popup' && typeof feedbackPopup.show !== 'function') {
						if (window.customElements && window.customElements.upgrade) customElements.upgrade(feedbackPopup);
					}
					const isOpen = feedbackPopup.hasAttribute('active') || feedbackPopup.active;
					const questionsContainer = document.getElementById('questions-container');
					if (isOpen) {
						if (typeof feedbackPopup.hide === 'function') feedbackPopup.hide();
						else feedbackPopup.removeAttribute('active');
						feedbackDislikeButton.classList.remove('active');
						questionsContainer?.classList.remove('feedback-popup-open');
					} else {
						feedbackPopup.anchor = feedbackDislikeButton;
						if (typeof feedbackPopup.show === "function") feedbackPopup.show();
						else feedbackPopup.setAttribute('active', '');
						feedbackDislikeButton.classList.add('active');
						questionsContainer?.classList.add('feedback-popup-open');
					}
				}
			});
			feedbackDislikeButton.eventListenerAdded = true;
		}

			// Feedback Popup logic (options, submit, outside-click)
			const feedbackPopup = document.getElementById(`feedbackPopup-${messageId}`);
			if (feedbackPopup && !feedbackPopup.popupListenersAdded) {
				const checkSubmitButtonState = () => {
					const submitBtn = feedbackPopup.querySelector('button[data-action="submit-feedback"]');
					const selectedOptionsData = feedbackPopup.getAttribute('data-selected-options');
					const selectedOptions = selectedOptionsData ? JSON.parse(selectedOptionsData) : [];
					const textarea = feedbackPopup.querySelector('sl-textarea');
					const hasTextContent = textarea && textarea.value && textarea.value.trim().length > 0;

					if (selectedOptions.length > 0 || hasTextContent) {
						submitBtn.disabled = false;
						submitBtn.classList.remove('disable');
					} else {
						submitBtn.disabled = true;
						submitBtn.classList.add('disable');
					}
				};

				const feedbackOptions = document.querySelectorAll(`.feedbackChip[data-message-id="${messageId}"]`);
				feedbackOptions.forEach(option => {
					option.addEventListener('click', (e) => {
						e.preventDefault(); e.stopPropagation();
						option.classList.toggle('selectedChip');
						const selectedOptions = Array.from(feedbackOptions)
							.filter(opt => opt.classList.contains('selectedChip'))
							.map(opt => ({ id: opt.getAttribute('data-feedback-id'), label: opt.textContent.trim() }));
						feedbackPopup.setAttribute('data-selected-options', JSON.stringify(selectedOptions));
						checkSubmitButtonState();
					});
				});

				const textarea = feedbackPopup.querySelector('sl-textarea');
				if (textarea) textarea.addEventListener('sl-input', checkSubmitButtonState);

				const submitBtn = feedbackPopup.querySelector('button[data-action="submit-feedback"]');
				if (submitBtn) {
					submitBtn.addEventListener('click', async (e) => {
						e.preventDefault(); e.stopPropagation();
						const selectedOptionsData = feedbackPopup.getAttribute('data-selected-options');
						const selectedOptions = selectedOptionsData ? JSON.parse(selectedOptionsData) : [];
						const comment = textarea ? textarea.value.trim() : '';

						const result = await dispatchFeedback({
							feedback: "dislike", comment, category: selectedOptions.map(opt => opt.label)
						});

						if (result?.payload) {
							updateFeedbackUI('dislike');
							syncReduxFeedback('dislike');
						}

						const successText = feedbackPopup.querySelector('.feedbacksuccesstext');
						if (successText) successText.style.display = 'block';
						setTimeout(() => {
							if (typeof feedbackPopup.hide === "function") feedbackPopup.hide();
							else feedbackPopup.removeAttribute('active');
						}, 2000);
					});
				}

				const handlePopupHide = () => {
				feedbackDislikeButton?.classList.remove('active');
				document.getElementById('questions-container')?.classList.remove('feedback-popup-open');
			};
				feedbackPopup.addEventListener('sl-hide', handlePopupHide);
				feedbackPopup.addEventListener('sl-after-hide', handlePopupHide);

			document.addEventListener('click', (event) => {
				if (!feedbackPopup.contains(event.target) && !feedbackDislikeButton?.contains(event.target)) {
					if (feedbackPopup.hasAttribute('active') || feedbackPopup.active) {
						if (typeof feedbackPopup.hide === "function") feedbackPopup.hide();
						else feedbackPopup.removeAttribute('active');
						feedbackDislikeButton?.classList.remove('active');
						document.getElementById('questions-container')?.classList.remove('feedback-popup-open');
					}
				}
			});

				feedbackPopup.popupListenersAdded = true;
			}
		}

		// 7. Three-Dot Actions Menu
		const threeDotDropdown = document.querySelector(`.three-dot-menu-container sl-dropdown:has([data-three-dot-trigger="${messageId}"])`);
		const threeDotMenuEl = threeDotDropdown?.querySelector(`sl-menu[data-three-dot-dropdown="${messageId}"]`) || document.querySelector(`sl-menu[data-three-dot-dropdown="${messageId}"]`);
		if (threeDotMenuEl && !threeDotMenuEl.eventListenerAdded) {
			threeDotMenuEl.querySelectorAll('.menu-item').forEach(menuItem => {
				menuItem.addEventListener('click', (e) => {
					e.preventDefault(); e.stopPropagation();
					const action = menuItem.getAttribute('data-menu-action');
					const actionType = menuItem.getAttribute('data-action-type');
					threeDotMenuEl.closest('sl-dropdown')?.hide();

					if (actionType === 'integration') {
						IntegrationsActions(e, action, item);
					} else if (action === 'copy') {
						document.getElementById(`copyAnswerButton-${messageId}`)?.click();
					}
				});
			});
			threeDotMenuEl.eventListenerAdded = true;
		}
	};

	const renderLogic = () => {
		if (item?.viewType === "table") {
			tableChipLogic();
		} else {
			knowledgeChipLogic();
		}
		actionChipsLogic();
	};

	return renderLogic();
};

export default AnsFromChipFunctionality;
