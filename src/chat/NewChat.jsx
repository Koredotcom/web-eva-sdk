import { setActiveBoardId } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
}

export default NewChat