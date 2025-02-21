import React, { useEffect, useRef, useState } from "react";
import Notification from "../notifications/notification";

const Notifications = () => {

    const NotificationRef = useRef()
    const [notifications, setNotifications] = useState([])
    const [hasMore, setHasMore] = useState(false)

    useEffect(() => {
        NotificationRef.current = Notification()
        NotificationRef.current.subscribe((notifications, hasMore, bell, alerts) => {
            setNotifications(notifications)
            setHasMore(hasMore)
            console.log("notifications", notifications, hasMore, bell, alerts)
        })
    }, [])
    return (
        <>
            <h1>Notifications</h1>
            {notifications?.map((notification, index) => {
                return (<>
                    <div key={index} onClick={() => NotificationRef.current.redirectToNotificationChatThread(notification)}>
                        <h3>{notification?.message?.title}</h3>
                        <p>{notification?.message?.body}</p>
                    </div>

                </>)
            })}
            <button onClick={() => NotificationRef.current.getNotifications()}>Get Notifications</button>
            {hasMore && <button onClick={() => NotificationRef.current.getMoreNotifications()}>Get More Notifications</button>}
        </>
    )
}

export default Notifications
