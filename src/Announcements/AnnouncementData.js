import store from "../redux/store";


const AnnouncementData = async (props) => {   

    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(() => {
            const state = store.getState();
            const { status, error, data } = state.global.announcements;
            if (status !== 'loading') {
                unsubscribe();
                resolve({
                    status,
                    error,
                    data: data?.announcements || []
                });
            }
        });
    });
};

export default AnnouncementData;
