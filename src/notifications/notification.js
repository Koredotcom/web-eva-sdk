import { JoinChatThread } from "../chat"
import { getNotification } from "../redux/actions/global.action"
import { setNotifications } from "../redux/globalSlice"
import store from "../redux/store"

const Notification = () => {
    let state = store.getState().global

    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            let alert = ''
                callback(state.notifications.notifications, state.notifications.hasMore, state.notifications.bell, alert);
        });

        return () => {
            unsubscribe();
        };
    };

    const getNotifications = async () => {
        let userId = state.profile.data.id
        const res = await store.dispatch(getNotification(userId))
        store.dispatch(setNotifications(res.payload))
    }

    const notifyLatestNotification = () => {
        console.log("notifyLatestNotification")
    }

    const redirectToNotificationChatThread = (notification) => {
        let reqdBoardId = notification?.cd?.ed?.payload?.boardId
        JoinChatThread({ boardId: reqdBoardId })
    }

    const getMoreNotifications = async () => {
        console.log("getMoreNotifications")
    }

    const markAllAsRead = async () => {
        console.log("markAllAsRead")
    }

    return {
        subscribe,
        getNotifications,
        notifyLatestNotification,
        redirectToNotificationChatThread,
        getMoreNotifications,
        markAllAsRead
    }
}

export default Notification;