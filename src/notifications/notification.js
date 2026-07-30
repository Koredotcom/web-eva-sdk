import { cloneDeep, isEmpty } from "lodash"
import { JoinChatThread, NewChat, InitiateChatConversationAction } from "../chat"
import { fetchHistory, getNotification, readNotification } from "../redux/actions/global.action"
import { setNotifications } from "../redux/globalSlice"
import store from "../redux/store"
import { LoadMoreHistoryData } from "../history"

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
        /*bell count object format should be changed */
        store.dispatch(setNotifications(res.payload))
    }

    const notifyLatestNotification = async (notification) => {
        if(notification?.nStats?.bell === 0) return;
        if(!notification?.channels?.includes("bell")) return;
        
        //Method to notify the latest notification
        let _notificationState = cloneDeep(state?.notifications);
        _notificationState.bell = { 'bell': notification?.nStats?.bell };
        let alerts = _notificationState?.alert?.length ? _notificationState?.alert : [];
        alerts.unshift({message : notification?.notification, cd : notification?.customdata});
        _notificationState.alert = alerts;
        store.dispatch(setNotifications(_notificationState))
        if(_notificationState?.alert?.[0]?.cd?.category === 'scheduler'){
            /*need to invoke fetchmoreHistory with 20 limit*/
            store.dispatch(fetchHistory({onload: true, params: {limit: 20}}))
        }
    }

    const redirectToNotificationChatThread = async (notification) => {
        /* adding the logic to change the 'read' state of the notification if it is unread */
        if (!notification?.isRead) {
            await markNotificationAsRead(notification)
        }
        let reqdBoardId = notification?.cd?.ed?.payload?.boardId
        JoinChatThread({ boardId: reqdBoardId, redirectFromNotification: true })

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
        let payload;
        if (state?.notifications?.alert?.length > 0) {
            payload = {
                "readTill": state?.notifications?.alert?.[0]?.cd?.nId
            }
            const alertNotificationRes = await store.dispatch(readNotification({ userId, payload }))  
            console.log("alertNotificationRes", alertNotificationRes)
        }

        payload = {
            "readTill": state?.notifications?.notifications?.[0]?._id
        }     
        /*get the total notifications to update the isRead state of the notifications*/                  
        const res = await store.dispatch(readNotification({ userId, payload }))    
        /*in case alert is there, when clicked on mark all as read, need to mark read for that alert as well */                    
        if(res?.payload?.SUCCESS){
            let wholeNotifications = [];
            let _notificationState = cloneDeep(state?.notifications);
            wholeNotifications = _notificationState?.notifications
            if(_notificationState?.alert?.length > 0){                
                wholeNotifications = [..._notificationState?.alert, ..._notificationState?.notifications]
                delete _notificationState?.alert;
            }
            else{
                wholeNotifications = _notificationState?.notifications
            }
            
            _notificationState.notifications = wholeNotifications?.map(notification => {
                notification.isRead = true;
                return notification;
            });
            /*Bell count is should be update to 0, as all notifications are read */
            _notificationState.bell = {bell: 0};
            store.dispatch(setNotifications(_notificationState))
        }
    }

    const redirectToLatestAlert = async (notification) => {
        //Method to redirect to the latest alert
        /*the below read method is handled in  redirectToNotificationChatThread, so commenting the below*/
        let id = notification?.cd?.nId
        // let userId = state?.profile?.data?.id
        // let payload = {
        //     "read": id
        // }
        // const res = await store.dispatch(readNotification({userId, payload}))        
        redirectToNotificationChatThread(notification)

        // Clearing the alert from the state
        // let _notificationState = cloneDeep(state?.notifications);
        // _notificationState.alert = _notificationState.alert.filter(alert => alert?.cd?.nId !== id)
        // _notificationState.bell = _notificationState.bell - 1;
        // store.dispatch(setNotifications(_notificationState))
    }

    const clearNotifications = async () => {
       store.dispatch(setNotifications({}))
    }

    const markNotificationAsRead = async (notification) => {
        if(notification?.isRead) return;
        let userId = state?.profile?.data?.id
        let id = notification?.cd?.nId || notification?._id 
        let payload = {
            "read": id
        }   
        const res = await store.dispatch(readNotification({userId, payload}))
        if(res?.payload?.SUCCESS){
            let _notificationState;
            if(isEmpty(state?.notifications)){
                getMoreNotifications();
            }
            _notificationState = cloneDeep(state?.notifications);
            if(_notificationState?.hasOwnProperty("alert")){
                //Clearing the alert from the state                
                _notificationState.alert = _notificationState.alert.filter(alert => alert?.cd?.nId !== id)                            

            }else{
                _notificationState.notifications = _notificationState.notifications.map(notification => {
                    if ((notification?.cd?.nId || notification?._id) === id) {
                        notification.isRead = true;
                    }
                    return notification;
                });
            }
            if (_notificationState?.bell?.bell){
                _notificationState.bell = { 'bell': _notificationState?.bell?.bell - 1 };   
            }            
            store.dispatch(setNotifications(_notificationState))
            if(state?.enableDebugging){
                console.log("notification marked as read: ", id)
            }
        }
        
    }

    /*
    Stamps the thread a postback just created onto the notification itself, at
    `cd.ed.payload = { boardId, messageId }`. A postback creates a brand-new
    board, so before this the notification has no reference to it and a second
    click would fire the action again. With the reference in place,
    `redirectToNotificationChatThread` can reopen that exact thread.
    Both the notification list and the alert list are stamped, since the same
    notification can be present in either.
    */
    const stampThreadOnNotification = (notification, { boardId, messageId }) => {
        if (!boardId) return;
        const targetId = notification?.cd?.nId || notification?._id;
        if (!targetId) return;
        const _notificationState = cloneDeep(store.getState().global?.notifications);
        if (isEmpty(_notificationState)) return;
        const stamp = (item) => {
            if ((item?.cd?.nId || item?._id) !== targetId) return item;
            const cd = { ...(item?.cd || {}) };
            cd.ed = {
                ...(cd.ed || {}),
                payload: { ...(cd.ed?.payload || {}), boardId, messageId }
            };
            return { ...item, cd };
        };
        if (Array.isArray(_notificationState?.notifications)) {
            _notificationState.notifications = _notificationState.notifications.map(stamp);
        }
        if (Array.isArray(_notificationState?.alert)) {
            _notificationState.alert = _notificationState.alert.map(stamp);
        }
        store.dispatch(setNotifications(_notificationState));
        if (store.getState().global?.enableDebugging) {
            console.log("notification stamped with postback thread: ", targetId, { boardId, messageId });
        }
    }

    const sendNotificationPostBack = async (notification, button) => {
        /*
        Handles the click of an action button inside a notification (postback).
        Mirrors Kora-React's notification button actionHandler/handleActionButton:
        - "viewConversation" buttons open the existing chat thread of that notification
        - every other button triggers a postback: a NEW thread is created (no boardId
          is sent, so the backend creates a new board) and the button's utterance +
          payload are sent to the agent through the advancedsearch API as
          { question, agentId, postbackPayload }
        */
        if (button?.action === "viewConversation" || button?.type === "viewConversation") {
            /* read state + JoinChatThread are already handled inside redirectToNotificationChatThread */
            redirectToNotificationChatThread(notification)
            return;
        }

        /* mark the notification as read before triggering the agent */
        if (!notification?.isRead) {
            await markNotificationAsRead(notification)
        }

        /* alerts carry the entity data under `cd`, raw socket notifications under `customdata` */
        const customData = notification?.cd || notification?.customdata;
        /* notifications with a defaultAction carry the agent id at the root level,
           the rest carry it inside the entity data (ed) */
        const agentId = customData?.ed?.id;
        const payload = {
            question: button?.utterance,
            agentId,
            postbackPayload: button?.payload
        }

        /*
        Force a new thread: clear activeBoardId/selectedContext/questions so the
        advancedsearch call goes out without a boardId (same as Kora-React's
        forceNewThread flow) and the backend creates a fresh board for this postback.
        */
        NewChat()
        const res = await InitiateChatConversationAction({ payload })
        /* mirrors how chat-utils resolves the board for a settled response */
        const boardId = res?.payload?.boardId || res?.payload?.history?.bId
        stampThreadOnNotification(notification, { boardId, messageId: res?.payload?.messageId })
    }

    return {
        subscribe,
        getNotifications,
        notifyLatestNotification,
        redirectToNotificationChatThread,
        getMoreNotifications,
        markAllAsRead,
        redirectToLatestAlert,
        clearNotifications,
        markNotificationAsRead,
        sendNotificationPostBack
    }
}

export default Notification;