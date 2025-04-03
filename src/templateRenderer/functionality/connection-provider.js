import { getSpecificSkills } from "../../redux/actions/global.action";
import store from "../../redux/store";
import SSOMethods from "../utils/sso-methods";

const ConnectionProviderFunc = (data) => {

    let state = store.getState().global
    let userId = state?.profile?.data?.id

    const addConn = async () => {
        const response = await store.dispatch(getSpecificSkills({userId: userId, connectorId: data?.provider}));
        
        if(response?.payload?.authProfiles?.[0]?.type === "oauth2"){
            const config = {
                label: `Connection ${response?.payload?.connections?.length + 1}`,
                allowedCapabilities: response?.payload?.capabilities
            }
            new SSOMethods().connect(data?.provider, null, config);
        }else{
            //basic auth
        }
    }

    const addConnection = document.getElementById(`addConnection-${data?.id}`);
    addConnection.onclick = () => addConn(data)
}
 
export default ConnectionProviderFunc;