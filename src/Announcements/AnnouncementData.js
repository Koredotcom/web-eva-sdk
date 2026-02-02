import { getAllAnnouncements } from "../redux/actions/global.action";
import store from "../redux/store";

const AnnouncementData = async () => {
    try {
        // Get userId from profile in store
        const state = store.getState();
        const userId = state.global.profile?.data?.id;
<<<<<<< HEAD
        
        if (!userId) {
            throw new Error('User ID not found in profile. Make sure SDK is properly initialized.');
        }

=======

        if (!userId) {
            throw new Error('User ID not found in profile. Make sure SDK is properly initialized.');
        }

>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
        // Dispatch the action to fetch announcements and put them in store
        const result = await store.dispatch(getAllAnnouncements({
            params: { userId }
        }));
        return result;
    } catch (error) {
        throw error;
    }
};

export default AnnouncementData;
