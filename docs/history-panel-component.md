# History Panel Component

## Overview

The **History Panel** is a sidebar component that provides users with access to their conversation history. It renders automatically as part of the Parent Component, appearing on the left side of the application interface.

## Default Rendering Behavior

When the `renderParentComponent()` function is called, the History Panel is automatically initialized and rendered within the `history-drawer-container` element. No additional configuration is required—the component is ready to use out of the box.

```javascript
import { renderParentComponent } from 'eva-web-sdk';

// The History Panel renders automatically as part of this call
renderParentComponent('your-container-id');
```

## Features

### 1. Conversation History Display

The History Panel displays all past conversations, organized into intuitive time-based groups:

| Group | Description |
|-------|-------------|
| **Today** | Conversations from the current day |
| **Yesterday** | Conversations from the previous day |
| **Last 7 Days** | Conversations from the past week |
| **Older** | All other historical conversations |

### 2. Sidebar Toggle

The panel can be opened and closed using:

- **Toggle Button**: A floating button appears when the panel is closed, allowing users to reopen it
- **Close Button**: Located in the panel header to collapse the sidebar
- **Keyboard Shortcut**: Press `Ctrl+B` (or `Cmd+B` on Mac) to toggle the panel

### 3. New Chat

A "New Chat" button in the panel header allows users to:
- Start a fresh conversation
- Automatically display the recent agents section
- Clear the current chat context

### 4. Conversation Actions

Each conversation item in the history list supports the following actions:

| Action | Description |
|--------|-------------|
| **Click** | Resume the selected conversation |
| **Bookmark** | Save the conversation for quick access |
| **Delete** | Remove the conversation from history |

### 5. Real-time Updates

The History Panel subscribes to conversation updates and automatically refreshes when:
- A new conversation is created
- An existing conversation is modified
- A conversation is deleted or bookmarked

## Component Structure

The History Panel consists of two main visual elements:

1. **Sidebar Panel** (`history-drawer-panel`)
   - Header with title and action buttons
   - Scrollable content area with grouped conversation items

2. **Floating Toggle** (`floating-toggle`)
   - Appears when the sidebar is closed
   - Provides quick access to reopen the panel

## Events

The History Panel dispatches the following custom events:

| Event | Description |
|-------|-------------|
| `drawer-open` | Fired when the panel is opened |
| `drawer-close` | Fired when the panel is closed |
| `new-chat` | Fired when the New Chat button is clicked |

### Listening to Events

```javascript
document.addEventListener('drawer-open', () => {
    console.log('History panel opened');
});

document.addEventListener('drawer-close', () => {
    console.log('History panel closed');
});

document.addEventListener('new-chat', () => {
    console.log('New chat started');
});
```

## Programmatic Control

If you need to control the History Panel programmatically, you can access its methods:

```javascript
import HistoryDrawerFunc from 'eva-web-sdk';

const historyPanel = HistoryDrawerFunc();

// Open the panel
historyPanel.openDrawer();

// Close the panel
historyPanel.closeDrawer();

// Toggle the panel state
historyPanel.toggleDrawer();

// Check if the panel is open
const isOpen = historyPanel.isDrawerOpen();
```

## Loading States

The component displays skeleton loading indicators while fetching conversation history, providing visual feedback to users during data retrieval.

## Empty State

When no conversations exist, the panel displays a friendly "No conversations yet" message, guiding users to start their first chat.

## Cleanup

The History Panel properly cleans up its subscriptions when destroyed, preventing memory leaks:

```javascript
const historyPanel = HistoryDrawerFunc();

// When done, clean up
historyPanel.destroyHistoryDrawer();
```

## Layout Integration

The History Panel is designed to work seamlessly with the main content area:

```
┌──────────────────────────────────────────────────────┐
│                    Application                        │
├─────────────┬────────────────────────────────────────┤
│             │                                         │
│   History   │           Main Content                  │
│   Panel     │                                         │
│             │    ┌─────────────────────────────┐     │
│  - Today    │    │     Questions/Chat Area      │     │
│  - Yesterday│    │                              │     │
│  - Last 7   │    └─────────────────────────────┘     │
│  - Older    │                                         │
│             │    ┌─────────────────────────────┐     │
│             │    │        Compose Bar           │     │
│             │    └─────────────────────────────┘     │
│             │                                         │
│             │    ┌─────────────────────────────┐     │
│             │    │      Recent Agents           │     │
│             │    └─────────────────────────────┘     │
│             │                                         │
└─────────────┴────────────────────────────────────────┘
```

## Browser Support

The History Panel uses standard DOM APIs and Shoelace components, ensuring compatibility with all modern browsers.
