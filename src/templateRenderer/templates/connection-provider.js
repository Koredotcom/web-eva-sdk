import ConnectionProviderFunc from "../functionality/connection-provider";
import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function render(data) {
    // const { providers, selectedProvider, status, validation } = data;

    const accountBox = document.createElement("div");
    accountBox.class = "accountBox";

    const mainActWrap = document.createElement("div");
    mainActWrap.class = "mainactwrap";

    const choosenImage = document.createElement("div");
    choosenImage.class = "choosenimage";

    const img = document.createElement("img");
    img.src = data?.templateInfo?.icon || data?.icon || "";
    img.alt = "";

    choosenImage.appendChild(img);

    const choosedText = document.createElement("div");
    choosedText.class = "choosedtext";
    choosedText.textContent = data?.templateInfo?.label || data?.label || "";

    mainActWrap.appendChild(choosenImage);
    mainActWrap.appendChild(choosedText);

    const authenticationStatus = document.createElement("div");
    authenticationStatus.class = "authenticationstatus";

    const authenticateVerify = document.createElement("div");
    authenticateVerify.class = "authenticateverify";

    if (
        ["outlook", "gmail", "gdrive", "onedrive"].includes(data?.provider)
    ) {
        authenticateVerify.textContent = `Please provide the authentication to ${profile?.emailId} so we can proceed with your request.;`
    } else {
        authenticateVerify.textContent = `Please complete the ${data?.label || data?.templateInfo?.label
            } authentication so we can proceed with your request.`;
    }

    authenticationStatus.appendChild(authenticateVerify);

    const addConnection = document.createElement("div");
    addConnection.class = "addConnection";
    addConnection.onclick = () => addConnectionHandler();

    const acIcon = document.createElement("div");
    acIcon.class = "acIcon";
    acIcon.innerHTML = `<svg width="13" height="13" fill="#155EEF"></svg>`;

    const acText = document.createElement("div");
    acText.class = "acText";
    acText.id = `addConnection-${data?.id}`;
    acText.textContent = "Add connection";

    addConnection.appendChild(acIcon);
    addConnection.appendChild(acText);
    authenticationStatus.appendChild(addConnection);

    accountBox.appendChild(mainActWrap);
    accountBox.appendChild(authenticationStatus);

    let timeout;
    clearTimeout(timeout)
    timeout = setTimeout(() => {
        ConnectionProviderFunc(data);
    }, 1000);

    return accountBox.innerHTML;
}

export { render };
