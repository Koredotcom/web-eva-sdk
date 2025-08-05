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

    return {
        subscribe,
        getData
    };
};

export default AnnouncementsInterface; 