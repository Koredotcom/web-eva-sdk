# ComposeBar Component

A standalone compose bar component built in plain JavaScript that can be easily integrated into any web application. This component provides a rich chat input interface with support for quick actions, keyboard shortcuts, and various customization options.

## Features

- ✅ **Plain JavaScript** - No dependencies, works in any modern browser
- ✅ **Auto-resizing textarea** - Grows with content up to a maximum height
- ✅ **Keyboard shortcuts** - Enter to send, Shift+Enter for new line
- ✅ **Quick action chips** - Configurable action buttons
- ✅ **Loading states** - Visual feedback for ongoing operations
- ✅ **Event-driven** - Comprehensive callback system
- ✅ **Responsive design** - Mobile-friendly styling
- ✅ **Accessibility** - Proper focus management and keyboard navigation
- ✅ **Dark mode** - Automatic dark mode support
- ✅ **Customizable** - Extensive configuration options

## Quick Start

### 1. Include the files

```html
<link rel="stylesheet" href="src/styles/composebar.css">
<script src="src/components/ComposeBar.js"></script>
```

### 2. Create a container

```html
<div id="my-compose-bar"></div>
```

### 3. Initialize the component

```javascript
const composeBar = new ComposeBar('#my-compose-bar', {
    placeholder: 'Type your message...',
    quickActions: [
        { id: 'help', label: 'Help' },
        { id: 'settings', label: 'Settings' }
    ]
});

// Handle message sending
composeBar.on('send', (message) => {
    console.log('Message sent:', message);
    // Send message to your chat service
});

// Handle quick actions
composeBar.on('quickAction', (action) => {
    console.log('Quick action:', action);
    // Handle the specific action
});
```

## API Reference

### Constructor

```javascript
new ComposeBar(container, options)
```

**Parameters:**
- `container` (string|Element) - CSS selector or DOM element
- `options` (Object) - Configuration options

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | string | `'Ask question...'` | Input placeholder text |
| `showQuickActions` | boolean | `true` | Show/hide quick action chips |
| `showNewButton` | boolean | `true` | Show/hide new chat button |
| `showStopButton` | boolean | `true` | Show/hide stop button |
| `quickActions` | Array | `[]` | Array of quick action objects |

### Quick Action Object

```javascript
{
    id: 'unique-id',        // Unique identifier
    label: 'Display Text'   // Text shown on the chip
}
```

### Methods

#### Event Handling

```javascript
composeBar.on(event, callback)
```

**Available Events:**
- `send` - Message sent (callback receives message text)
- `newChat` - New chat button clicked
- `stop` - Stop button clicked  
- `quickAction` - Quick action clicked (callback receives action object)
- `change` - Input value changed (callback receives current value)

#### Value Management

```javascript
// Set input value
composeBar.setValue('Hello world');

// Get current value
const value = composeBar.getValue();

// Clear input
composeBar.clearInput();
```

#### State Management

```javascript
// Set loading state
composeBar.setLoading(true);

// Disable/enable component
composeBar.setDisabled(true);

// Show/hide component
composeBar.setVisible(false);

// Focus input
composeBar.focus();
```

#### Configuration

```javascript
// Update quick actions
composeBar.setQuickActions([
    { id: 'new-action', label: 'New Action' }
]);

// Cleanup
composeBar.destroy();
```

## Examples

### Basic Usage

```javascript
const composeBar = new ComposeBar('#compose-container');

composeBar.on('send', (message) => {
    // Handle message sending
    sendMessageToServer(message);
});
```

### With Quick Actions

```javascript
const composeBar = new ComposeBar('#compose-container', {
    quickActions: [
        { id: 'help', label: '❓ Help' },
        { id: 'settings', label: '⚙️ Settings' },
        { id: 'feedback', label: '💬 Feedback' }
    ]
});

composeBar.on('quickAction', (action) => {
    switch(action.id) {
        case 'help':
            showHelpDialog();
            break;
        case 'settings':
            openSettings();
            break;
        case 'feedback':
            openFeedbackForm();
            break;
    }
});
```

### Advanced Configuration

```javascript
const composeBar = new ComposeBar('#compose-container', {
    placeholder: 'What can I help you with today?',
    showNewButton: false,
    showStopButton: true,
    quickActions: [
        { id: 'summarize', label: '📄 Summarize' },
        { id: 'translate', label: '🌍 Translate' }
    ]
});

// Chain event handlers
composeBar
    .on('send', handleSendMessage)
    .on('quickAction', handleQuickAction)
    .on('change', handleInputChange)
    .on('newChat', startNewConversation)
    .on('stop', stopCurrentOperation);

// Dynamic updates
function addNewQuickAction() {
    const currentActions = composeBar.options.quickActions;
    currentActions.push({ id: 'analyze', label: '🔍 Analyze' });
    composeBar.setQuickActions(currentActions);
}
```

### Loading States

```javascript
composeBar.on('send', async (message) => {
    // Show loading state
    composeBar.setLoading(true);
    
    try {
        const response = await sendMessage(message);
        displayResponse(response);
    } catch (error) {
        displayError(error);
    } finally {
        // Hide loading state
        composeBar.setLoading(false);
    }
});
```

## Styling

The component comes with comprehensive CSS that includes:

- Responsive design for mobile and desktop
- Dark mode support
- High contrast mode support
- Reduced motion support
- Modern, accessible styling

### Custom Styling

You can override the default styles by targeting the CSS classes:

```css
/* Custom primary button color */
.eva-btn-primary {
    background-color: #your-brand-color;
    border-color: #your-brand-color;
}

/* Custom textarea styling */
.eva-compose-textarea {
    border-radius: 16px;
    font-size: 16px;
}

/* Custom quick action chips */
.eva-quick-reply-chip {
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    color: white;
    border: none;
}
```

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with ES6 support

## Integration Tips

1. **Module Systems**: The component supports CommonJS, AMD, and global window attachment
2. **Framework Integration**: Can be easily wrapped for React, Vue, Angular, etc.
3. **Server Integration**: Use the event callbacks to integrate with your backend API
4. **Persistence**: Save and restore input state using `getValue()` and `setValue()`
5. **Validation**: Add custom validation in the `send` event handler

## License

This component is part of the EVA Web SDK and follows the same licensing terms.