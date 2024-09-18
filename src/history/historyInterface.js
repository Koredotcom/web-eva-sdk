import { deleteHistory, updateHistory } from "../redux/actions/global.action";
import { setAllHistory } from "../redux/globalSlice";
import store from "../redux/store";

const HistoryInterface = (props) => {
    let state = store.getState().global;

    // Subscribe to store updates
    const subscribe = (cb) => {
        // let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // // If callback exists and API call is completed, invoke it
            // if (state.advanceSearchRes.status !== 'loading' && callback) {
            //     callback(state.questions, state.advanceSearchRes.data);
            // }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };



    const deleteHistoryBoard = async (arg) => {
        const response = await store.dispatch(deleteHistory({ boardId: arg?.id }))
        if (response?.payload?.success) {
            let newHistory = { 
                ...state.AllHistory, 
                data: {
                  ...state.AllHistory.data,
                  boards: state.AllHistory.data.boards.filter(item => item?.id !== response?.meta?.arg?.boardId)
                }
              };
              
              store.dispatch(setAllHistory(newHistory));      
        }
    }

    const updateHistoryBoardName = async (arg) => {
        let params = {
            "boardId": arg?.boardId
        }
        let payload = {
            "name": arg?.newName
        }
        const response = await store.dispatch(updateHistory({ params, payload }))
        if (response) {
            let newBoard = state?.AllHistory?.data?.boards;
            let updatedBoardIndex = newBoard?.findIndex(item => item.id === arg.boardId);
            let updatedBoard = [
                ...newBoard.slice(0, updatedBoardIndex),
                response.payload,
                ...newBoard.slice(updatedBoardIndex + 1)
            ];
            let newHistory = {
                ...state.AllHistory,
                data: {
                    ...state.AllHistory.data,
                    boards: updatedBoard
                }
            };
            store.dispatch(setAllHistory(newHistory));
        }
    }
    return {
        subscribe,
        deleteHistoryBoard,
        updateHistoryBoardName
    }
}

export default HistoryInterface;