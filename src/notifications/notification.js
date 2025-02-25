import { cloneDeep } from "lodash"
import { JoinChatThread } from "../chat"
import { getNotification, readNotification } from "../redux/actions/global.action"
import { setNotifications } from "../redux/globalSlice"
import store from "../redux/store"

const Notification = () => {
    let state = store.getState().global

    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            callback(state?.notifications?.notifications, state?.notifications?.hasMore, state?.notifications?.bell, state?.notifications?.alert);
        });

        return () => {
            unsubscribe();
        };
    };

    const getNotifications = async () => {
        //Method to get notifications
        let userId = state?.profile?.data?.id
        const res = await store.dispatch(getNotification({userId}))
        store.dispatch(setNotifications(res.payload))
    }

    const notifyLatestNotification = async (notification) => {
        if(notification?.nStats?.bell === 0) return;
        
        //Method to notify the latest notification
        let _notificationState = cloneDeep(state?.notifications);
        _notificationState.bell = notification?.nStats?.bell;
        let alerts = _notificationState?.alert?.length ? _notificationState?.alert : [];
        alerts.unshift({message : notification?.notification, cd : notification?.customdata});
        _notificationState.alert = alerts;
        store.dispatch(setNotifications(_notificationState))
    }

    const redirectToNotificationChatThread = (notification) => {
        //Method to redirect to the current notification chat thread
        let reqdBoardId = notification?.cd?.ed?.payload?.boardId
        JoinChatThread({ boardId: reqdBoardId , redirectFromNotification: true})

    }

    const getMoreNotifications = async () => {
        let limit = 20;
        let offset = state?.notifications?.notifications?.length;
        let userId = state?.profile?.data?.id
        const res = await store.dispatch(getNotification({userId, limit, offset, loadMore: true}))
        let _notificationState = cloneDeep(state?.notifications);
        _notificationState.notifications = [..._notificationState.notifications, ...res.payload.notifications]
        _notificationState.hasMore = res.payload.hasMore
        _notificationState.bell = res.payload.bell
        store.dispatch(setNotifications(_notificationState))
    }

    const markAllAsRead = async () => {
        //Method to mark all the notifications that are displayedas read
        let userId = state?.profile?.data?.id
        let payload = {
            "readTill": state?.notifications?.notifications?.[0]?._id
        }
        const res = await store.dispatch(readNotification({userId, payload}))
        if(res?.payload?.SUCCESS){
            let _notificationState = cloneDeep(state?.notifications);
            _notificationState.notifications = _notificationState.notifications.map(notification => {
                notification.isRead = true;
                return notification;
            });
            store.dispatch(setNotifications(_notificationState))
        }
    }

    const redirectToLatestAlert = async (notification) => {
        //Method to redirect to the latest alert
        let id = notification?.cd?.nId
        let userId = state?.profile?.data?.id
        let payload = {
            "read": id
        }
        const res = await store.dispatch(readNotification({userId, payload}))
        redirectToNotificationChatThread(notification)

        //Clearing the alert from the state
        let _notificationState = cloneDeep(state?.notifications);
        _notificationState.alert = _notificationState.alert.filter(alert => alert?.cd?.nId !== id)
        _notificationState.bell = _notificationState.bell - 1;
        store.dispatch(setNotifications(_notificationState))
    }

    const clearNotifications = async () => {
       store.dispatch(setNotifications({}))
    }

    return {
        subscribe,
        getNotifications,
        notifyLatestNotification,
        redirectToNotificationChatThread,
        getMoreNotifications,
        markAllAsRead,
        redirectToLatestAlert,
        clearNotifications
    }
}

export default Notification;