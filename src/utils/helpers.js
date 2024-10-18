
import moment from "moment";
import store from "../redux/store";

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
    // Generate a random 5-byte buffer and convert it to a hex string
    const randomBytes = crypto.getRandomValues(new Uint8Array(5));
    const hexString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 9);

    // Prefix with '#'
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
        return parts[parts?.length - 1].toLowerCase();
    } else {
        return '';
    }
}

export const generateComponentId = () => {
    let cId = Math.random().toString(36).slice(2);
    return cId.substring(0, 6);
}

export const getQueryParams = (url) => {
    const queryParams = {};
    const queryString = url.split('?')[1]; // Split the URL at the '?' character to get the query string

    if (queryString) {
        const paramPairs = queryString.split('&'); // Split the query string into parameter pairs

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

export const getCidByReqId = (data, reqId) => {
    for (const key in data) {
        if (data[key].reqId === reqId) {
            return data[key].cId;
        }
    }
    return null;
}

export const renderIcons = (provider, extIcon, providerIcon) => { //providerIcon will be helpful for history, in case the existing connection is deleted and no connections left for that specific integration

    const state = store.getState().global
    const { enabledAgents } = state;
    let icon = enabledAgents?.find(skill => skill.id === provider || skill?.appId === provider)?.icon || providerIcon
    if (!icon) {
        icon = enabledAgents?.find(item => item?.id === provider)?.icon
    }

    const Icondiv = document.createElement('div');
    Icondiv.className = 'srcimg';

    const img = document.createElement('img');
    img.src = providerIcon;
    img.className = 'backgroundIcon';

    Icondiv.appendChild(img);

    if (extIcon) {
        const subImg = document.createElement('img');
        subImg.src = extIcon; 
        subImg.className = 'subIcon';
        Icondiv.appendChild(subImg); 
    }

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
