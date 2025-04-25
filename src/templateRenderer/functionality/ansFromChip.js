import { cloneDeep } from "lodash";
import { updateChatData } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";
import { getRelevantQuestions } from "../../redux/actions/global.action";
import { highlightQuotedText } from "../utils/helper";
import { InitiateChatConversationAction } from "../../chat";

const AnsFromChipFunctionality = ({item}) => {

    const getRelevantQuestionsData = async () => {
        let state = store.getState()?.global;
        let _questions = cloneDeep(state?.questions);
        let constId = item?.cId || item?.id;

        if(item?.altQuestions?.showAltQuestions){
            _questions[constId].altQuestions.showAltQuestions = false;
        }else if(item?.altQuestions?.questions?.length > 0 && item?.altQuestions?.showAltQuestions === false){
            _questions[constId].altQuestions.showAltQuestions = true;
        }
        else{
            let userId = state?.profile?.data?.id;
    
            let context = item?.context;
     
            let params = {
                "userId": userId,
                "sessionId": context?.sessionId,
                "appId": context?.tabId,
                "qId": item?.id,
            }
    
            const response = await store.dispatch(getRelevantQuestions(params));
    
            if(!!response?.payload){
                let altQuestions = response?.payload?.altQuestions;
                let alternateQuestionsObj = {
                    questions: altQuestions,
                    showAltQuestions: true
                }
                _questions[constId].altQuestions = alternateQuestionsObj;
            }
        }
        store.dispatch(updateChatData(_questions));   
    }

    const tableChipLogic = () => {
        let chip = document.getElementById(`ansFromChip-${item?.id}`);
        if (chip && !chip.eventListenerAdded) {
            chip.addEventListener('click', (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                showDataAction();
            });
            chip.eventListenerAdded = true;
        }

        if (item?.showData) {
            // any actions on Table Chip has to be added here

            if (item?.sources?.[0]?.canSetAsSourceContext !== false && (item?.context?.source === "jira" || item?.context?.source === "hubspot" || item?.context?.source === "zendesk")) {
                let relevantQuestions = document.getElementById(`relevantQuestions-${item?.id}`);
                if (relevantQuestions && !relevantQuestions.eventListenerAdded) {
                    relevantQuestions.addEventListener('click', (e) => {
                        e?.preventDefault();
                        e?.stopPropagation();
                        getRelevantQuestionsData();
                    });
                    relevantQuestions.eventListenerAdded = true;
                }

                if (item?.altQuestions?.showAltQuestions && item?.altQuestions?.questions?.length > 0) {
                    item?.altQuestions?.questions?.map((question, i) => {
                        let relevantQuestionsItem = document.getElementById(`relevantQuestionsItem-${item?.id}-${i}`);
                        if(relevantQuestionsItem && !relevantQuestionsItem.eventListenerAdded){
                            relevantQuestionsItem.addEventListener('click', (e) => {
                                e?.preventDefault();
                                e?.stopPropagation();
                                let payload = {
                                    question: question
                                }
                                InitiateChatConversationAction({payload});
                            });
                            relevantQuestionsItem.eventListenerAdded = true;
                        }
                    });
                }


            }
        }
    }

    const showDataAction = () => {

        if (!!item?.context && (item?.context?.type === "gptAgent"|| item?.context?.agentType === "gptAgent" || item?.context?.agentType === 'galeAgent')) {
            let state = store.getState()?.global;
            let _questions = cloneDeep(state?.questions);
            let constId = item?.cId || item?.id;
            let showGPTDialog = !!_questions[constId]?.showGPTDialog;
            _questions[constId].showGPTDialog = !showGPTDialog;
            store.dispatch(updateChatData(_questions));
        }
        if ((item?.sources?.length === 1) && item?.sources[0]?.hasOwnProperty("redirectUrl")){
            openInNewTab(item?.sources?.[0]) 
        } else if (item?.sources?.length > 1){
            let state = store.getState()?.global;
            let _questions = cloneDeep(state?.questions);
            let constId = item?.cId || item?.id;
            let showMultiSourceList = !!_questions[constId]?.showMultiSourceList;
            _questions[constId].showMultiSourceList = !showMultiSourceList;
            store.dispatch(updateChatData(_questions));
        }
        else {
            let state = store.getState()?.global;
            let _questions = cloneDeep(state?.questions);
            let constId = item?.cId || item?.id;
            let showData = !!_questions[constId]?.showData;
            _questions[constId].showData = !showData;
            store.dispatch(updateChatData(_questions));
        }
    }

    const openInNewTab = (data) => {
        window.open(data?.redirectUrl?.dweb, '_blank');
    }

    const onSetAsSource = (e, data) => {
        e.stopPropagation()
        if(data?.ext === "gsheet") {
            // fetchListItems(e)
        } else {
            let state = store.getState()?.global;
            let _agents = cloneDeep(state?.enabledAgents);
            let isAgentSetAsSource = _agents.find(ag => ag?.id === data?.source)
            let sourceType = isAgentSetAsSource ? "agent" : null
            sessionItemHandler({
                item: data, 
                duplicateErr: true,
                type : sourceType
            })
        }
    }

    const knowledgeChipLogic = () => {

        if (item?.sources?.length > 1) {
            let chip = document.getElementById(`ansFromChip-${item?.id}`);
            if(chip && !chip.eventListenerAdded){
                chip.addEventListener('click', (e) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    showDataAction();
                });
                chip.eventListenerAdded = true;
            }
        }

        if(item?.showMultiSourceList){
            item?.sources?.map((data, i) => {
                let listItem = document.getElementById(`multiSourceListItem-${item?.id}-${data?.docId}`);
                let askFollowupButton = document.getElementById(`askFollowupButton-${item?.id}-${data?.docId}`);
                if(listItem && !listItem.eventListenerAdded){
                    listItem.addEventListener('click', () => {
                        openInNewTab(data);
                    });
                    listItem.eventListenerAdded = true;
                }
                if(askFollowupButton && !askFollowupButton.eventListenerAdded){
                    askFollowupButton.addEventListener('click', (e) => {
                        e?.preventDefault();
                        e?.stopPropagation();
                        onSetAsSource(e, data);
                    });
                    askFollowupButton.eventListenerAdded = true;
                }
            })
        }

        if (item?.sources?.length === 1) {
            let chip = document.getElementById(`ansFromChip-${item?.id}`);
            if(chip && !chip.eventListenerAdded){
                chip.addEventListener('click', (e) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    showDataAction();
                });
                chip.eventListenerAdded = true;
            }
        }

        if(item?.showData){
            item?.data?.map((data, i) => {
                let listItem = document.getElementById(`listItem-${item?.id}-${data?.docId}`);
                let askFollowupButton = document.getElementById(`askFollowupButton-${item?.id}-${data?.docId}`);
                if(listItem && !listItem.eventListenerAdded){
                    listItem.addEventListener('click', () => {
                        openInNewTab(data);
                    });
                    listItem.eventListenerAdded = true;
                }
                if(askFollowupButton && !askFollowupButton.eventListenerAdded){
                    askFollowupButton.addEventListener('click', (e) => {
                        e?.preventDefault();
                        e?.stopPropagation();
                        onSetAsSource(e, data);
                    });
                    askFollowupButton.eventListenerAdded = true;
                }
            });
        }

        if(item?.showGPTDialog){
            let dialog = document.getElementById(`gptDialog-${item?.id}`);
            let closeBtn = document.getElementById(`close-btn-dialog-${item?.id}`);
            if(closeBtn && !closeBtn.eventListenerAdded){
                closeBtn.addEventListener('click', () => {
                    dialog.close();
                    dialog.remove();
                });
                closeBtn.eventListenerAdded = true;
            }
        }
    }

    const renderLogic = () => {
        if (item?.viewType === "table") {
            tableChipLogic();
        } else {
            knowledgeChipLogic();
        }
    }

    return renderLogic();
}

export default AnsFromChipFunctionality;

