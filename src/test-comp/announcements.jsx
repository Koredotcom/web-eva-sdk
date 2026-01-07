import React, { useEffect, useRef, useState } from "react";
import AnnouncementsInterface from "../Announcements/AnnouncementsInterface";
import { AnnouncementData } from "../Announcements";

const Announcements = () => {
    const announcementsRef = useRef();
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        announcementsRef.current = AnnouncementsInterface();
        
        // Get initial data
        const initialData = announcementsRef.current.getData();
        setAnnouncements(initialData?.data || []);

        // Subscribe to updates
        const unsubscribe = announcementsRef.current.subscribe((result) => {
            setAnnouncements(result?.data?.announcements || []);
        });

        return () => {
            unsubscribe();
        };
    }, []);


    const getAnnouncementsData = async () => {
        const res = await AnnouncementData()
        // setAnnouncements(res?.payload?.announcements)
    }
    const handleDelete = async (announcementId) => {
        if (announcementsRef.current) {
            await announcementsRef.current.deleteAnnouncement(announcementId);
        }
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Announcements</h1>

            

            {announcements?.length === 0 && (
                <>
                <p style={styles.empty}>No announcements available</p>
                <button onClick={getAnnouncementsData}>Get Announcements</button>
                </>
            )}

            {announcements?.length > 0 && announcements?.map((announcement) => (
                <div key={announcement.announcementId} style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>
                            {announcement.name || "Announcement"}
                        </h3>
                        <button
                            style={styles.closeButton}
                            onClick={() => handleDelete(announcement.announcementId)}
                            aria-label="Dismiss announcement"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <p style={styles.cardBody}>
                        {announcement.message || announcement.description || ""}
                    </p>
                    {announcement.createdAt && (
                        <span style={styles.timestamp}>
                            {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

const styles = {
    container: {
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
    },
    title: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "20px",
    },
    loading: {
        color: "#666",
        fontStyle: "italic",
    },
    error: {
        color: "#dc3545",
    },
    empty: {
        color: "#888",
        textAlign: "center",
        padding: "40px 0",
    },
    card: {
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "12px",
        position: "relative",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "8px",
    },
    cardTitle: {
        margin: 0,
        fontSize: "16px",
        fontWeight: "600",
        flex: 1,
    },
    closeButton: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        color: "#666",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        transition: "background-color 0.2s, color 0.2s",
    },
    cardBody: {
        margin: 0,
        color: "#495057",
        fontSize: "14px",
        lineHeight: "1.5",
    },
    timestamp: {
        display: "block",
        marginTop: "8px",
        fontSize: "12px",
        color: "#888",
    },
};

export default Announcements;

