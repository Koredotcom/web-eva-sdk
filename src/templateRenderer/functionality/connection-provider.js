import { InitiateChatConversationAction } from "../../chat";
import { basicAuth, getSpecificSkills } from "../../redux/actions/global.action";
import store from "../../redux/store";
import eventBus from "../utils/eventbus";
import SSOMethods from "../utils/sso-methods";

const ConnectionProviderFunc = (data, response) => {

    eventBus.on("postOauth2Connection", (res) => postOauth2ConnectionHandler(res));

    let state = store.getState().global
    let userId = state?.profile?.data?.id
    let type;

    !!response ? type = "basic" : type = "oauth2";

    const addConn = async () => {
        const response = await store.dispatch(getSpecificSkills({userId: userId, connectorId: data?.provider}));
        
        if(response?.payload?.authProfiles?.[0]?.type === "oauth2"){
            const config = {
                label: `Connection ${response?.payload?.connections?.length + 1}`,
                allowedCapabilities: response?.payload?.capabilities
            }
            new SSOMethods().connect(data?.provider, null, config);
        }else{
            eventBus.dispatch("basicAuth", {response, data})
        }
    }

    const postOauth2ConnectionHandler = (res) => {
            let obj = {
                question : data?.question,
            }
        InitiateChatConversationAction({payload : obj, params : {qId: data?.id, type: data?.type, reqId: data?.reqId, messageId: data?.messageId, retry : true}});
    }

    const basicAuthSubmitHandler = async() => {

        let userGivenInput = {}; 

        let inputFields = response?.payload?.authProfiles?.[0]?.inputFields;

        inputFields?.filter((inputField) => inputField?.hidden !== true)?.forEach(field => {
            let value = document.getElementById(`basicAuthInput-${data?.id}-${field?.key}`).value;
            if(value){
                userGivenInput[field?.key] = value;
            }else {
                return;
            }
        });
        
        let payload = {
            "idp": data?.provider,
            "auth_data": userGivenInput,
            "label": `Connection ${response?.payload?.connections?.length + 1}`,
            "allowedCapabilities": response?.payload?.capabilities
        }
        let res = await store.dispatch(basicAuth({userId: userId, payload}));
        if(res?.payload?.status === 200){
            let obj = {
                question : data?.question,
            }
            InitiateChatConversationAction({payload : obj, params : {qId: data?.id, type: data?.type, reqId: data?.reqId, messageId: data?.messageId, retry : true}});
            basicAuthCancelHandler();
        }
    }

    const basicAuthCancelHandler = () => {
        const dialog = document.getElementById(`basicAuthDialog-${data?.id}`);
        if(dialog){
            dialog.close();
            dialog.remove();
        }
    }

    
    if (type === "basic") {
        const form = document.getElementById(`basicAuthForm-${data?.id}`);
        const submitBtn = document.getElementById(`basicAuthSubmitBtn-${data?.id}`);
        const cancelBtn = document.getElementById(`basicAuthCancelBtn-${data?.id}`);

        if(form && !form.hasEventListener){
            form.addEventListener('submit', (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                basicAuthSubmitHandler();
            })
            form.hasEventListener = true;
        }
        if(cancelBtn && !cancelBtn.hasEventListener){
            cancelBtn.addEventListener('click', (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                basicAuthCancelHandler();
            })
            cancelBtn.hasEventListener = true;
        }
    } else {
        const addConnection = document.getElementById(`addConnection-${data?.id}`);
        if (addConnection && !addConnection.hasEventListener) {
            addConnection.onclick = (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                addConn(data)
            }
            addConnection.hasEventListener = true;
        }
    }
}
 
export default ConnectionProviderFunc;