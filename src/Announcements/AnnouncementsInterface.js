import { deleteAnnouncementAction } from "../redux/actions/global.action";
import { setAnnouncements } from "../redux/globalSlice";
import store from "../redux/store";

const AnnouncementsInterface = (props) => {
    let state = store.getState().global;

    // Subscribe to store updates for announcements
    const subscribe = (cb) => {
        let callback = cb;



        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and we have announcements data, invoke it
            if (state.announcements?.status === 'success') {
                callback({
                    data: state.announcements?.data || [],
                    error: state.announcements.error || null,
                    loading: state.announcements.status === 'loading'
                });
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    // Method to get current data without subscribing
    const getData = () => {
        const currentState = store.getState().global;
        const announcements = currentState.announcements || {};
        return {
            data: announcements.data || announcements || [],
            error: announcements.error || null,
            loading: announcements.status === 'loading'
        };
    };

    const setNewAnnouncements = (data) => {
        const currentAnnouncements = store.getState().global.announcements?.data;
        const alreadyAddedAnnouncement = currentAnnouncements.filter(el => data?.data?.announcements?.some(d => d?.announcementId === el.announcementId));
        if (data?.action === 'add') {
            if (alreadyAddedAnnouncement?.length === 0) {
                const newAnnouncement = data?.data?.announcements
                const allNewAnnouncements = [...currentAnnouncements, ...newAnnouncement]
                store.dispatch(setAnnouncements({ data: allNewAnnouncements, status: 'success', error: null }))
            }
            else {
                const newAnnouncements = currentAnnouncements?.map(el => {
                    const found = data?.data?.announcements?.find(d => d?.announcementId === el.announcementId);
                    return found ? { ...el, ...found } : el;
                });
                store.dispatch(setAnnouncements({ data: newAnnouncements, status: 'success', error: null }))
            }
        }
        else {
            if (alreadyAddedAnnouncement?.length >= 1) {
                const newAnnouncements = currentAnnouncements?.filter(el => !data?.data?.announcements?.some(d => d?.announcementId === el?.announcementId))
                store.dispatch(setAnnouncements({ data: newAnnouncements, status: 'success', error: null }))
            }
        }

    }

    const deleteAnnouncement = async (announcementId) => {
        const currentAnnouncements = store.getState().global.announcements?.data?.announcements;
        const response = await store.dispatch(deleteAnnouncementAction({ userId: store?.getState()?.global?.profile?.data?.id, announcementId: announcementId }))
        const deletedAnnouncementId = response?.payload?.id || response?.payload?.announcementId || response?.meta?.arg?.announcementId;
        if(response?.payload?.status === 200 && deletedAnnouncementId === announcementId) {
            const newAnnouncements = currentAnnouncements?.filter(el => el?.announcementId !== announcementId)
            store.dispatch(setAnnouncements({ data: {'announcements': newAnnouncements}, status: 'success', error: null }))
        }
    }

    return {
        subscribe,
        getData,
        setNewAnnouncements,
        deleteAnnouncement
    };
};

export default AnnouncementsInterface; 