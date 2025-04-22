import { cloneDeep } from "lodash";
import { updateChatData } from "../../redux/globalSlice";
import store from "../../redux/store";
import { sessionItemHandler } from "../../Attachments/createContext";

const AnsFromChipFunctionality = ({item, regeneratingAnswer}) => {

    const regeneratingAnswerListener = () => {
        console.log('regeneratingAnswerListener');
    }

    const tableChipLogic = () => {
        console.log('tableChipLogic');
    }

    const showDataAction = () => {

        if (!!item?.context && (item?.context?.type === "gptAgent"|| item?.context?.agentType === "gptAgent" || item?.context?.agentType === 'galeAgent')) {
            // TODO: Implement the logic for the gptAgent
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
    }

    const renderLogic = () => {
        if (regeneratingAnswer) {
            regeneratingAnswerListener();
        } else if (item?.viewType === "table") {
            tableChipLogic();
        } else {
            knowledgeChipLogic();
        }
    }

    return renderLogic();
}

export default AnsFromChipFunctionality;

