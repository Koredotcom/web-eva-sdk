import React, { useState, useRef } from 'react';
import './announcements.scss';
import { createClose } from '../../templateRenderer/icons-library';

const Announcements = (props) => {
    const [showDialog, setShowDialog] = useState(false);
    const dialogRef = useRef(null);
    
    const handleViewMore = () => {
        setShowDialog(true);
        if (dialogRef.current) {
            dialogRef.current.show();
        }
    };

    const renderAnnouncements = () => {
        return (
            <div className='announcements-dialog-container'>
                {props.announcements?.map((announcement, index) => {
                    return (
                        <div className='more-announcements-header'>
                            <span className='announcements-header'>{announcement.title}</span>
                            <div className='announcements-desc'>{announcement.description}</div>
                            {index !== props.announcements.length - 1 && <div className='line-break'></div>}
                        </div>
                    )
                })}
            </div>
        )
    }
    
    return (
        props.announcements?.length > 0 && (
        <>
            <div className='announcements-container'>
                <div className='announcements-header'>
                    <span>Systems maintenance for agent:</span> We will be performing scheduled system maintenance on July 10, 2025, from 2:00 AM to 5:00 AM (IST). During this time, the platform may be temporarily unavailable. This update includes essential security patches, performance improvements.
                </div>
                <div className='announcements-view-more' onClick={handleViewMore}>View More</div>
                <div className='close-icon' dangerouslySetInnerHTML={{ __html: createClose({size: 12, color: '#737373' }) }}></div>
            </div>

            <sl-dialog 
                ref={dialogRef}
                label={`Announcements (${props.announcements?.length})`} 
                onSlAfterHide={() => setShowDialog(false)}
                class="announcements-dialog"
            >
                {renderAnnouncements()}
            </sl-dialog>
        </>
    ))
}

export default Announcements;