import HistoryComponentFunc, { 
    constructHistoryItem, 
    constructHistoryItems, 
    constructHistorySkeleton 
} from './HistoryComponent';
import HistoryDrawerFunc from './HistoryDrawer';

// History component exports
const historyComponentInstance = HistoryComponentFunc();
export const renderHistory = historyComponentInstance.renderHistory;
export const hideHistoryDiv = historyComponentInstance.hideHistoryDiv;
export const unHideHistoryDiv = historyComponentInstance.unHideHistoryDiv;
export const historyInstance = historyComponentInstance.historyInstance;

// History Drawer comp exports
const historyDrawerInstance = HistoryDrawerFunc();
export const renderHistoryDrawer = historyDrawerInstance.renderHistoryDrawer;
export const destroyHistoryDrawer = historyDrawerInstance.destroyHistoryDrawer;
export const openDrawer = historyDrawerInstance.openDrawer;
export const closeDrawer = historyDrawerInstance.closeDrawer;
export const toggleDrawer = historyDrawerInstance.toggleDrawer;

// Shared utilities for history item rendering
export { constructHistoryItem, constructHistoryItems, constructHistorySkeleton };

// Keeping the wrappers for backward compatibility
export { default as HistoryComponentFunc } from './HistoryComponent';
export { default as HistoryDrawerFunc } from './HistoryDrawer';