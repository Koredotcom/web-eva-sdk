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
            if (state.announcements.status !== 'loading') {
                callback({
                    data: state.announcements || [],
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

    const setNewAnnouncements = (data)=>{
		const currentAnnouncements = store.getState().global.announcements;
        const alreadyAddedAnnouncement = currentAnnouncements.filter(el => data?.data?.announcements?.some(d => d?.announcementId === el.announcementId));
		if(data?.action === 'add'){
			if(alreadyAddedAnnouncement?.length === 0){
				const newAnnouncement = data?.data?.announcements
				const allNewAnnouncements = [...currentAnnouncements , ...newAnnouncement]
				store.dispatch(setAnnouncements({announcements : allNewAnnouncements}))
			}
			else {
				const newAnnouncements = currentAnnouncements?.map(el => {
					const found = data?.data?.announcements?.find(d => d?.announcementId === el.announcementId);
					return found ? {...el, ...found} : el;
				});
				store.dispatch(setAnnouncements({announcements : newAnnouncements}))
			}
		}
		else{
			if(alreadyAddedAnnouncement?.length >= 1){
				const newAnnouncements = currentAnnouncements?.filter(el => !data?.data?.announcements?.some(d => d?.announcementId === el?.announcementId))
				store.dispatch(setAnnouncements({announcements : newAnnouncements}))
			}
		}
	
    }

    return {
        subscribe,
        getData,
        setNewAnnouncements
    };
};

export default AnnouncementsInterface; 