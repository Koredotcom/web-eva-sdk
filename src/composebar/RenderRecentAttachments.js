import store from "../redux/store.js";
import { attachmentIcon, createDeleteIcon } from "../templateRenderer/icons-library.js";
import { getFileExtension } from "../utils/helpers.js";


const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    
    return `${size} ${sizes[i]}`;
};


const formatDate = (date) => {
    if (!date) return '';
    
    try {
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        
        return d.toLocaleDateString();
    } catch (error) {
        return '';
    }
};

const handleFileAttach = (file, options = {}) => {
    try {
        console.log('Attaching file:', file);
        
        // You can call a callback if provided in options
        if (options.onFileAttach && typeof options.onFileAttach === 'function') {
            options.onFileAttach(file);
        }
    } catch (error) {
        console.error('Error attaching file:', error);
    }
};

const handleFileRemove = (file, item, options = {}) => {
    try {
        console.log('Removing file from recent:', file);
        
        // Add fade out animation before removal
        item.style.opacity = '0.5';
        item.style.transition = 'opacity 0.3s ease';

        // Remove from DOM after animation
        setTimeout(() => {
            item.remove();
        }, 300);

        // You can call a callback if provided in options
        if (options.onFileRemove && typeof options.onFileRemove === 'function') {
            options.onFileRemove(file);
        }
    } catch (error) {
        console.error('Error removing file:', error);
    }
};


const renderRecentFilesList = (targetEl, files, listType = 'recent', options = {}) => {
    if (!files || files.length === 0) {
        targetEl.innerHTML = `<li class="no-files-message">No recent files found</li>`;
        return;
    }

    // Generate HTML for each file
    const itemsHtml = files.map(file => {
        const safeName = (file?.name || file?.fileName || 'Untitled').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const fileExtension = getFileExtension(file?.name || file?.fileName || '');
        const fileSize = formatFileSize(file?.size);        
        const lastModified = formatDate(file?.lastModified || file?.updatedAt);

        return `<li class="eva-file-item" data-file-id="${file.id || file.fileId}" data-file-type="${listType}">
            <div class="file-icon"></div>
            <div class="file-details">
                <div class="file-name" title="${safeName}">${safeName}</div>
                <div class="file-meta">
                    <span class="file-extension">${fileExtension.toUpperCase()}</span>
                    ${fileSize ? `<span>•</span><span class="file-size">${fileSize}</span>` : ''}
                    ${lastModified ? `<span>•</span><span class="file-date">${lastModified}</span>` : ''}
                </div>
            </div>            
        </li>`;
    }).join('');

    targetEl.innerHTML = itemsHtml;

    // Attach click handlers
    targetEl.querySelectorAll('.eva-file-item').forEach(item => {
        // Main file item click (attach file)
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (e.target.closest('.file-action-btn')) return;

            const fileId = item.getAttribute('data-file-id');
            const file = files.find(f => String(f.id || f.fileId) === String(fileId));
            if (!file) return;

            handleFileAttach(file, options);
        });

        // Attach button click
        const attachBtn = item.querySelector('.attach-btn');
        if (attachBtn) {
            attachBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = item.getAttribute('data-file-id');
                const file = files.find(f => String(f.id || f.fileId) === String(fileId));
                if (!file) return;

                handleFileAttach(file, options);
            });
        }

        // Delete button click
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = item.getAttribute('data-file-id');
                const file = files.find(f => String(f.id || f.fileId) === String(fileId));
                if (!file) return;

                handleFileRemove(file, item, options);
            });
        }
    });
};


const renderRecentFiles = (targetEl, options = {}) => {
    try {
        const state = store.getState();
        const files = state?.global?.AllrecentFiles?.data?.files || [];
        renderRecentFilesList(targetEl, files, 'recent', options);
    } catch (error) {
        console.error('Error rendering recent files:', error);
        targetEl.innerHTML = `<li class="error-message">Failed to load recent files</li>`;
    }
};

/**
 * Search and render filtered recent files
 * @param {HTMLElement} targetEl - The target DOM element
 * @param {string} searchTerm - Search term to filter files
 * @param {Object} options - Options object with callbacks
 */
const searchAndRenderRecentFiles = (targetEl, searchTerm = '', options = {}) => {
    try {
        const state = store.getState();
        let files = state?.global?.AllrecentFiles?.data?.files || [];
        
        // Filter files by search term if provided
        if (searchTerm?.length > 0) {
            const term = searchTerm.toLowerCase();
            files = files.filter(file => 
                (file?.name || file?.fileName || '').toLowerCase().includes(term) ||
                getFileExtension(file?.name || file?.fileName || '').toLowerCase().includes(term)
            );
        }

        renderRecentFilesList(targetEl, files, 'search', options);
    } catch (error) {
        console.error('Error searching recent files:', error);
        targetEl.innerHTML = `<li class="error-message">Failed to search recent files</li>`;
    }
};

export { 
    renderRecentFilesList, 
    renderRecentFiles, 
    searchAndRenderRecentFiles,    
    formatFileSize,
    formatDate,
    handleFileAttach,
    handleFileRemove
};