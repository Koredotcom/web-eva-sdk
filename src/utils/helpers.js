import moment from "moment";
import store from "../redux/store";
import { cloneDeep, debounce } from "lodash";
import { setErrorState } from "../redux/globalSlice";
import ReactDOM from "react-dom/server";
import { getSuggestedContactListNew } from "../redux/actions/global.action";
import { attachmentIcon } from "../templateRenderer/icons-library";

export const Timedifference = (time) => {
    let daysdiff = new Date().getDate() - new Date(time).getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let daysuffix;
    daysuffix = moment.localeData().ordinal(new Date(time).getDate())
    if (daysdiff === 0 && new Date().getMonth() === new Date(time).getMonth() && new Date().getFullYear() === new Date(time).getFullYear()) {
        return 'TODAY'
    }
    else if (daysdiff === 1 && new Date().getMonth() === new Date(time).getMonth() && new Date().getFullYear() === new Date(time).getFullYear()) {
        return 'YESTERDAY'
    }
    else {
        return daysuffix + " " + months[new Date(time).getMonth()]
    }
}

export const generateShortUUID = () => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(5));
    const hexString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 9);

    const shortUUID = `#${hexString}`;

    return shortUUID;
}

export const getUID = function (len) {
    len = len || 10;
    var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a => a + p[~~(Math.random() * p.length)], '');
}

export const getFileExtension = (fileName) => {
    const parts = fileName?.split('.');
    if (parts?.length > 1 && parts[parts?.length - 1].trim() !== '') {
        if (supportedImagesOfFileUpload.includes(parts[parts?.length - 1].toLowerCase())) {
            return parts[parts?.length - 1].toLowerCase()
        }
        return 'default';
    } else {
        return 'default';
    }
}

export const supportedImagesOfFileUpload = ['png', 'jpg', 'jpeg', 'gif', 'csv', 'ppt', 'pptx', 'pdf', 'doc', 'docx', 'text', 'txt', 'xls', 'xlsx', 'svg']

export const generateComponentId = () => {
    let cId = Math.random().toString(36).slice(2);
    return cId.substring(0, 6);
}

export const getQueryParams = (url) => {
    const queryParams = {};
    const queryString = url.split('?')[1];

    if (queryString) {
        const paramPairs = queryString.split('&');

        paramPairs.forEach(pair => {
            const [key, value] = pair.split('='); // Split each parameter pair into key and value
            queryParams[key] = decodeURIComponent(value); // Store the key-value pair in the result object
        });
    }

    return queryParams;
}

export const getCidByMessageId = (data, messageId) => {
    for (const key in data) {
        if (data[key].messageId === messageId) {
            return data[key].cId;
        }
    }
    return null; // or an appropriate value if no match is found
};

export const isMSEnv = () => {
    return store.getState().global?.env === 'MS';
}

export const getSdkAssetBase = () => {
    if (typeof window === "undefined") {
        return "";
    }
    return window.__EVA_SDK_ASSET_BASE__ || "";
};

export const resolveSdkAssetPath = (assetPath = "") => {
    if (!assetPath) {
        return assetPath;
    }
    const base = getSdkAssetBase();
    if (!base) {
        return assetPath;
    }
    if (/^(data:|https?:)?\/\//.test(assetPath)) {
        return assetPath;
    }
    const normalizedPath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
    return `${base}/${normalizedPath}`;
};

export const getReqIdByMessageId = (messageId) => {
    let questions = cloneDeep(store.getState().global?.questions)
    for (const key in questions) {
        if (questions[key]?.messageId === messageId) {
            return questions[key]?.historicalData ? questions[key]?.id
                : questions[key]?.isTask ? questions[key]?.cId
                    : questions[key]?.reqId;
        }
    }
    return null; // or an appropriate value if no match is found
};

export const getCidByReqId = (questions, reqId) => {
    for (const key in questions) {
        if (questions[key].reqId === reqId) {
            return questions[key].cId;
        }
    }
    return null;
}

export const renderIcons = (provider, extIcon, providerIcon, iconUrl, isSupervisor) => { //providerIcon will be helpful for history, in case the existing connection is deleted and no connections left for that specific integration

    const state = store.getState().global
    const { enabledAgents, config } = state;
    const sourcesConfig = config?.source || config?.data?.source;

    let icon = sourcesConfig?.[provider]?.icon ||
        (provider === 'attachment' && sourcesConfig?.["accountKnowledge"]?.icon) ||
        enabledAgents?.find(skill => skill.id === provider || skill?.appId === provider)?.icon ||
        providerIcon;

    if (!icon) {
        icon = enabledAgents?.find(item => item?.id === provider)?.icon
    }

    const Icondiv = document.createElement('div');
    Icondiv.className = 'srcimg';

    let renderIconContent = '';
    if (provider === 'webSearch' && iconUrl) {
        renderIconContent = `<img class="backgroundIcon" src="${iconUrl}" />`;
    } else if (isSupervisor && iconUrl) {
        renderIconContent = `<img class="backgroundIcon" src="${iconUrl}" />`;
    } else if (iconUrl && provider === 'accountKnowledge') {
        renderIconContent = `<img class="backgroundIcon" src="${iconUrl}" />`;
    } else if (!iconUrl && provider === 'accountKnowledge' && extIcon) {
        renderIconContent = `<img class="backgroundIcon" src="${extIcon}" />`;
    } else if (!!extIcon && !providerIcon && !iconUrl) {
        renderIconContent = `<img class="backgroundIcon" src="${extIcon}" />`;
    } else if (!icon && provider === 'attachment') {
        renderIconContent = attachmentIcon({ className: "backgroundIcon" });
    } else {
        renderIconContent = icon ? `<img src="${icon}" class="backgroundIcon" />` : '';
        if (iconUrl) {
            renderIconContent += `<img class="subIcon" src="${iconUrl}" />`;
        }
    }

    Icondiv.innerHTML = renderIconContent;
    return Icondiv;
}

export const htmlDecode = (input) => {
    const e = document.createElement('div');

    // Universal search breaking issue workaround
    if (Array.isArray(input)) {
        input = input[0];
    }

    input = input ? input.replace(/&quot;/g, '') : '';

    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : (e.childNodes[0].nodeValue || e.childNodes[0].outerHTML);
};

export const getCurrentQuestion = (item) => {
    let state = store.getState().global;
    let _questions = cloneDeep(state.questions);
    let requiredQuestion = Object.values(_questions).find(it => it.reqId === item?.reqId);
    return requiredQuestion;
}

export const handleErrorState = (error, name = null) => {
    let currentErrorState = cloneDeep(store.getState().global.errorState) || [];
    let obj = {
        error: error?.response?.data?.errors?.[0]
    }

    if (name) {
        obj.failedCall = name;
    }

    currentErrorState.push(obj);
    store.dispatch(setErrorState(currentErrorState));
};

export const convertTemplateToHtml = (element) => {
    // Create a temporary div
    const tempDiv = document.createElement("div");

    // Render React element to HTML string
    const htmlString = ReactDOM.renderToString(element);

    // Set the HTML string to the div
    tempDiv.innerHTML = htmlString;

    // Return the HTML string
    return tempDiv.innerHTML;
};

export function encodeHtml(text) {
    text = text?.toString();
    text = text?.replace(/&nbsp;/g, " ");
    text = text?.replace(/&amp;/g, "&");
    text = text?.replace(/&lt;/g, "<");
    text = text?.replace(/&gt;/g, ">");
    text = text?.replace(/&quot;/g, '"');
    text = text?.replace(/&apos;/g, "'");
    return text;
}

export const formatToDDMMYY = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date)) return '';

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-based
    const yy = String(date.getFullYear()).slice(-2);

    return `${dd}/${mm}/${yy}`;
};

export const delayedSearchCallback = async (value, type) => {
    let userId = store?.getState()?.global?.profile?.data?.id;

    if (type === 'getSuggestedContactList') {
        // store.dispatch(getSuggestedContactList(value?.value));
    } else {
        // store.dispatch(getContactList(value?.value));
        let params = {
            source: value?.connectionSource,
            userId: userId,
        }
        let payload = {
            "dataType": "listPeople",
            "fieldId": "to",
            "connectionId": value?.connectionId,
            "params": {
                "q": value?.value
            },
            "meta": {
                "page": 0
            }
        }
        const response = await store.dispatch(getSuggestedContactListNew({ params, payload }))
        return response?.payload?.choices;
    }
}
export const checkHistoryAccessed = (questions) => {
    return Object.values(questions || {}).every(q => q?.historicalData)
}

// Placeholder functions for missing icons
export const getExtIcon = (extension) => {
    // Return a simple file icon based on extension
    const iconMap = {
        'pdf': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNyIgaGVpZ2h0PSIxNyIgdmlld0JveD0iMCAwIDE3IDE3IiBmaWxsPSJub25lIj48cmVjdCB5PSIwLjA1MTM5MTYiIHdpZHRoPSIxNi4wMDQ3IiBoZWlnaHQ9IjE2LjAwNDciIHJ4PSIzLjIwMDkzIiBmaWxsPSIjRjA0NDM4Ii8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yLjQwMDcgNC44OTIzSDQuMzY0MzZDNC43Nzg2NCA0Ljg5MjMgNS4wOTIxIDQuOTY0MTEgNS4zMDQ3NiA1LjEwNzczQzUuNTE3NDMgNS4yNTEzNCA1LjY2MTA0IDUuNDYxMjQgNS43MzU2MSA1LjczNzQyQzUuODEwMTggNi4wMTM2MSA1Ljg0NzQ2IDYuMzg5MjEgNS44NDc0NiA2Ljg2NDI1QzUuODQ3NDYgNy4zMTE2NyA1LjgxMjk0IDcuNjczNDcgNS43NDM5IDcuOTQ5NjVDNS42NzQ4NSA4LjIyNTg0IDUuNTM0IDguNDQyNjQgNS4zMjEzMyA4LjYwMDA3QzUuMTA4NjcgOC43NTc0OSA0Ljc4OTY4IDguODM2MiA0LjM2NDM2IDguODM2MkgzLjcyNjM4VjExLjIxNTFIMi40MDA3VjQuODkyM1pNNC4wMjQ2NSA3LjcwOTM3QzQuMTg0ODQgNy43MDkzNyA0LjI5NTMxIDcuNjkyOCA0LjM1NjA3IDcuNjU5NjZDNC40MTY4MyA3LjYyNjUyIDQuNDU4MjYgNy41NTQ3MSA0LjQ4MDM2IDcuNDQ0MjRDNC41MDI0NSA3LjMzMzc2IDQuNTEzNSA3LjE0MDQ0IDQuNTEzNSA2Ljg2NDI1QzQuNTEzNSA2LjU4ODA3IDQuNTAzODMgNi4zOTQ3NCA0LjQ4NDUgNi4yODQyN0M0LjQ2NTE3IDYuMTczNzkgNC40MjM3NCA2LjEwMTk5IDQuMzYwMjIgNi4wNjg4NEM0LjI5NjY5IDYuMDM1NyA0LjE4NzYgNi4wMTkxMyA0LjAzMjk0IDYuMDE5MTNIMy43MjYzOFY3LjcwOTM3SDQuMDI0NjVaTTYuNTY4OTQgNC44OTIzSDguMTc2MzNDOC43Nzg0MSA0Ljg5MjMgOS4yMDc4NyA0Ljk3NjU0IDkuNDY0NzIgNS4xNDUwMUM5LjcyMTU3IDUuMzEzNDggOS44ODAzOCA1LjU3NzI0IDkuOTQxMTQgNS45MzYyOEMxMC4wMDE5IDYuMjk1MzIgMTAuMDMyMyA2Ljg5NzM5IDEwLjAzMjMgNy43NDI1MkMxMC4wMzIzIDguNTgyMTIgMTAuMDAxOSA5LjgwNTIxIDkuOTQxMTQgMTAuMTY3QzkuODgwMzggMTAuNTI4OCA5LjcyMTU3IDEwLjc5NCA5LjQ2NDcyIDEwLjk2MjRDOS4yMDc4NyAxMS4xMzA5IDguNzc4NDEgMTEuMjE1MSA4LjE3NjMzIDExLjIxNTFINi41Njg5NFY0Ljg5MjNaTTguMTY4MDQgMTAuMDhDOC4zNjY4OSAxMC4wOCA4LjQ5ODA4IDEwLjA1MzggOC41NjE2IDEwLjAwMTNDOC42MjUxMyA5Ljk0ODgzIDguNjg1ODkgOS41MTczNiA4LjY4NTg5IDguOTg1MzRDOC42ODU4OSA4LjQ1MzMzIDguNzE0ODggOC4zNjExNyA4LjcxNDg4IDcuNzQyNTJDOC43MTQ4OCA3LjEyOTM5IDguNzA1MjIgNi43MTY1IDguNjg1ODkgNi41MDM4M0M4LjY2NjU1IDYuMjkxMTcgOC42MjM3NCA2LjE1ODYgOC41NTc0NiA2LjEwNjEzQzguNDkxMTggNi4wNTM2NSA4LjM2MTM3IDYuMDI3NDIgOC4xNjgwNCA2LjAyNzQySDcuODg2MzNWMTAuMDhIOC4xNjgwNFpNMTAuODg2MyAxMS4yMTUxVjQuODkyM0gxMy42MDRWNi4wMjc0MkgxMi4yMTJWNy4yODY4MUgxMy40M1Y4LjQyMTkzSDEyLjIxMlYxMS4yMTUxSDEwLjg4NjNaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
        'doc': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNyIgaGVpZ2h0PSIxNyIgdmlld0JveD0iMCAwIDE3IDE3IiBmaWxsPSJub25lIj48cmVjdCB5PSIwLjA3OTQwNjciIHdpZHRoPSIxNi4wMDQ3IiBoZWlnaHQ9IjE2LjAwNDciIHJ4PSIzLjIwMDkzIiBmaWxsPSIjMjk3MEZGIi8+PHBhdGggZD0iTTQuNjg3NTUgNC4zMDQ1SDMuMTQ2MThMNS4yMjY1OSAxMS44NTg3SDYuNTI1OUw4LjAwMTgxIDYuNTEzODJMOS40NzM4NSAxMS44NTg3SDEwLjc3MzJMMTIuODU4NyA0LjMwNDVIMTEuMzEyNEwxMC4xMTI3IDkuMjA4NTdMOC43NjE2OSA0LjMwNDVINy4yMzgyMkw1Ljg4NjYgOS4yMDg1N0w0LjY4NzU1IDQuMzA0NVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
        'txt': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFASURBVHgB7ZU9S8NAGMf/Fx0cTZxau/hSUCkKQmmRbg6Cn8JBl3aIdqoujtXBN9Rdv0mHgkI3BZf6sjRmzTd4vAvcEWm4tNcsLf1ByHP/S+6f58kdDzDusOjgrF49J2LHPJyHGQFf8al5/XgihRkZnNZrNyDW4OEczBHvlis7RdZ+6bSEYKkpwgFSghFzZWxFdNOyxKHWmk16cnk1j6WVvBp/vL/B/+1hULQG2cUcDqtun57huu/1BjKydJPrhc1Y3XYcHNVcZLI5JJFYoji+P7vhPcwkIYuhDbaLJRWLTEQWOpOhDWxnAbt7+/80nYH2H6TB1GA0A7kddYiTrUO7i36+uri/amKjsBU/zz9g5HPge154mRItUYD0CPoMiOgOKUFgzzJWHa392mlVyiWbMazBvKsFvOVeXtw+NDAx/AGKX1RjUuBfmAAAAABJRU5ErkJggg=='
    };
    return iconMap[extension?.toLowerCase()] || iconMap['txt'];
};

export const getDownloadIcon = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTJWMiBNMTIgOEg4TDEwIDZMMTIgOEg4WiIgc3Ryb2tlPSIjNjY3MDg1IiBzdHJva2Utd2lkdGg9IjEuMzMiLz4KPC9zdmc+Cg==';
};

export const getAgentType = (type) => {
    switch (type) {
        case 'gptAgent':
            return 'Prompt Agent';
        case 'botAgent':
            return 'Bot Agent';
        case 'aAAgent':
            return 'Autonomous Agent';
        case 'dataAgent':
            return 'API Agent';
        case 'galeAgent':
            return 'Workflow Agent';
        case 'searchAgent':
            return 'Search Agent';
        case 'agenticApp':
            return 'Agentic Flow';
        case 'mcpAgent':
            return 'MCP Agent';
        default:
            return type || 'Agent';
    }
}

export const isUserNearBottom = (el, threshold = 200) => {
    const delta = el.scrollHeight - el.scrollTop - el.clientHeight;
    return delta <= threshold;
};

/**
 * DOM Manipulation Utilities - Aggressive immediate hiding/showing of elements
 * These functions force immediate DOM updates without delays
 */


export const hideElementImmediately = (element, options = {}) => {
    if (!element) return;

    const { enableLogging = false } = options;

    // Clean up any pending show timeouts
    if (element._showTimeout) {
        clearTimeout(element._showTimeout);
        delete element._showTimeout;
    }

    // Clean up any existing observer
    if (element._hideObserver) {
        element._hideObserver.disconnect();
        delete element._hideObserver;
    }

    element.style.display = 'none';
    element.setAttribute('hidden', 'true');
    element.setAttribute('aria-hidden', 'true');

    if (enableLogging) {
        console.log('Element hidden:', element);
    }
};


export const showElementImmediately = (element, displayValue = 'block', enableLogging = false) => {
    if (!element) return;

    if (element._showTimeout) {
        clearTimeout(element._showTimeout);
        delete element._showTimeout;
    }


    if (element._hideObserver) {
        element._hideObserver.disconnect();
        delete element._hideObserver;
    }


    element.style.display = displayValue;
    element.removeAttribute('hidden');
    element.removeAttribute('aria-hidden');

};

export const showElementDelayed = (element, delay = 100, displayValue = 'block', enableLogging = false) => {
    if (!element) return;




    if (element._showTimeout) {
        clearTimeout(element._showTimeout);
        delete element._showTimeout;

    }

    // Mark element as intended to be visible (but delayed)
    element._intendedState = 'visible-delayed';

    // Set up the timeout
    element._showTimeout = setTimeout(() => {
        if (element._intendedState === 'visible-delayed') { // Only show if not overridden
            showElementImmediately(element, displayValue, enableLogging);
        }
        delete element._showTimeout;
    }, delay);


};




export const quickHide = (target, options = {}) => {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        hideElementImmediately(element, options);
    } else {
        console.warn('Element not found:', target);
    }
};


export const quickShow = (target, displayValue = 'block', enableLogging = false) => {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        showElementImmediately(element, displayValue, enableLogging);
    } else if (enableLogging) {
        console.warn('Element not found:', target);
    }
};

export const getIconsList = (agent = {}, icons = []) => {
    const intentList = icons;
    if (intentList?.length === 0) {
        agent?.config?.executionPipeline?.map((task, index) => {
            task?.intents?.map((intent) => {
                if (intentList?.find((i) => i?.agentMeta?.name === intent?.agentMeta?.name)) return;
                intentList?.push(intent)
            })
        });
    }

    let html = '';

    // Add first 3 icons
    intentList?.slice(0, 1).forEach((intent, idx) => {
        html += `            
            <span class="agentBorder" title="${intent?.agentMeta?.name}">
                <img src="${intent?.agentMeta?.icon}" size="16" alt="Agent ${idx + 1}" />
            </span>            
        `;
    });

    // Add count indicator if more than 3 icons
    if (intentList?.length > 1) {
        html += `
            <span class="agent-count">
                +${intentList.length - 1}
            </span>
        `;
    }

    return html;
}

export const convertToTimeFormat = (isoDate) => {
    if (!isoDate) return moment().local().format("hh:mm A");
    return moment().utc(isoDate).local().format("hh:mm A");
}

export function markdownToPlainText(md) {
    if (!md || typeof md !== 'string') return '';
    let text = md;

    // Extract code blocks and replace with a unique placeholder
    // We'll keep a map of placeholders to code content
    const codeBlocks = [];
    text = text.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        // Instead of using a placeholder like __CODE_BLOCK_0__, use 'CODEBLOCK0', 'CODEBLOCK1', etc.
        const placeholder = `CODEBLOCK${codeBlocks.length}`;
        codeBlocks.push(code.replace(/\r\n/g, '\n')); // normalize line endings
        return `\n${placeholder}\n`;
    });

    // Remove inline code backticks but preserve content
    text = text.replace(/`([^`]+)`/g, '$1');
    // Replace bold/italic/strikethrough
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    text = text.replace(/~~(.*?)~~/g, '$1');
    // Remove images ![alt](url)
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');
    // Replace links [text](url) with just text (or text + url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, p1, p2) => {
        if (!p2) return p1;
        if (p1 === p2) return p1;
        return `${p1} (${p2})`;
    });
    // Remove headings (allow for leading/trailing spaces)
    text = text.replace(/^\s*#{1,6}\s+/gm, '');
    // Remove blockquotes
    text = text.replace(/^\s*>+\s?/gm, '');
    // Remove unordered list markers
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    // Remove ordered list markers
    text = text.replace(/^\s*\d+\.\s+/gm, '');
    // Remove horizontal rules (allow for spaces)
    text = text.replace(/^\s*([-*_]\s*){3,}$/gm, '');

    // Remove HTML tags, but NOT inside code blocks (we'll restore code blocks later)
    text = text.replace(/<[^>]+>/g, '');

    // Replace multiple newlines with two
    text = text.replace(/\n{3,}/g, '\n\n');
    // Remove leading/trailing whitespace on each line
    text = text.split('\n').map(line => line.trimEnd()).join('\n');
    // Collapse multiple spaces (but not indentation at line start)
    text = text.replace(/([^\S\r\n]{2,})/g, ' ');

    // Restore code blocks (with original indentation and HTML tags preserved)
    // Now look for CODEBLOCK0, CODEBLOCK1, etc.
    text = text.replace(/CODEBLOCK(\d+)/g, (_, idx) => {
        let code = codeBlocks[Number(idx)] || '';
        code = code.replace(/^\n+/, '').replace(/\n+$/, '');
        return code ? code : '';
    });

    // Final trim
    return trimWithEllipsis(text).trim();
}
export const isTask = (messageId) => {
    let questions = cloneDeep(store.getState().global?.questions)
    const currentQuestion = Object.values(questions).find(question => question?.pId === messageId)
    if (currentQuestion?.isTask) {
        return true
    }
    return false;
}

export const getTaskIdBypId = (messageId) => {
    let questions = cloneDeep(store.getState().global?.questions)
    const currentQuestion = Object.values(questions).find(question => question?.pId === messageId)
    if (currentQuestion?.isTask) {
        return currentQuestion?.cId;
    }
    return null;
}

const trimWithEllipsis = (str, max=100) =>
  str.length > max ? str.slice(0, max) + "..." : str;

/**
 * Section keys for segregated history (display order).
 */
export const HISTORY_SECTIONS = {
    TODAY: "Today",
    YESTERDAY: "Yesterday",
    LAST_7_DAYS: "Last 7 days",
    LAST_30_DAYS: "Last 30 days",
    OLDER: "Older",
};

/* Returns YYYY-MM-DD for consistent string comparison. Uses en-CA in timezone when provided. */
const getDateStringInZone = (date, timeZone) => {
    if (timeZone) {
        return date.toLocaleDateString("en-CA", { timeZone });
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

/* Normalize createdOn: API may return seconds (e.g. Unix) or milliseconds. */
const normalizeCreatedOn = (ts) => {
    if (ts == null || typeof ts !== "number") return ts;
    if (ts < 1e12) return ts * 1000;
    return ts;
};

export const segregateHistoryBySections = (items, timeZone) => {
    const result = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        older: [],
    };
    if (!Array.isArray(items) || items.length === 0) return result;

    const now = new Date();
    const todayStr = getDateStringInZone(now, timeZone);

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getDateStringInZone(yesterdayDate, timeZone);

    const sevenDaysAgoDate = new Date(now);
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgoStr = getDateStringInZone(sevenDaysAgoDate, timeZone);

    const thirtyDaysAgoDate = new Date(now);
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const thirtyDaysAgoStr = getDateStringInZone(thirtyDaysAgoDate, timeZone);

    for (const item of items) {
        const raw = item?.createdOn;
        if (raw == null) {
            result.older.push(item);
            continue;
        }
        const ts = normalizeCreatedOn(raw);
        const itemDate = new Date(ts);
        if (Number.isNaN(itemDate.getTime())) {
            result.older.push(item);
            continue;
        }
        const itemStr = getDateStringInZone(itemDate, timeZone);

        if (itemStr === todayStr) {
            result.today.push(item);
        } else if (itemStr === yesterdayStr) {
            result.yesterday.push(item);
        } else if (itemStr >= sevenDaysAgoStr && itemStr < yesterdayStr) {
            result.last7Days.push(item);
        } else if (itemStr >= thirtyDaysAgoStr && itemStr < sevenDaysAgoStr) {
            result.last30Days.push(item);
        } else {
            result.older.push(item);
        }
    }

    return result;
};
