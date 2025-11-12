# Multi-Intent Execution Component - Implementation Guide

## 1. Understanding Template-Based Rendering

### The `templateType` Differentiator

In the EVA SDK, the `questions` object from the store contains various items, each with a `templateType` property. This `templateType` is the **differentiator** that determines which UI component to render.

**Your application should route to the appropriate UI based on `templateType`:**

```javascript
// Subscribe to get questions from store
const questions = store.getState().global.questions;

// Render UI for each question item based on templateType
Object.values(questions)?.map((ques) => {
  const renderUITemplates = (item) => {
    if (item.templateType === 'multi_intent_execution') {
      return <MultiIntentExecutionComponent data={item} />;
    } else if (item.templateType === 'gpt_form_template') {
      return <GptFormComponent data={item} />;
    }
    // ... handle other template types
  };
  
  return renderUITemplates(ques);
});
```

---

### Nested Template Rendering

When `templateType === "multi_intent_execution"`, you render the multi-intent execution UI. However, **inside the execution pipeline**, each individual task's response also contains a `templateType` that determines how its response should be rendered.

**Key Concept:** You must **reuse the same `renderUITemplates` function** to render each task's response UI based on its `templateType`.

```javascript
// Inside MultiIntentExecutionComponent
items.executionPipeline.map((task, index) => {
  // Merge task with real-time state from questions store
  const mergedTask = { 
    ...task, 
    ...questions[task._id], 
    isTask: true 
  };
  
  return (
      <h3>Task {index + 1}</h3>
      <p>{mergedTask.utterance}</p>
      
      {/* Show loading/error states and buttons */}
      {mergedTask.loading && <LoadingIndicator />}
      {mergedTask.error && <ErrorButtons />}
      
      {/* When task completes, render response using the same renderUITemplates function */}
      {mergedTask.showResponse && (
          {renderUITemplates(mergedTask)}
      )}
  );
});
```

**How It Works:**

1. **Top-level routing**: Your app checks `item.templateType === 'multi_intent_execution'` and renders `<MultiIntentExecutionComponent>`
2. **Inside the component**: Iterate through `executionPipeline` tasks
3. **Merge task states**: Combine static task data with real-time state from `questions` store
4. **Render task response**: When `mergedTask.showResponse === true`, call `renderUITemplates(mergedTask)` 
5. **Nested rendering**: The `renderUITemplates` function checks the task's `templateType` and returns the appropriate component (card, table, form, etc.)

**Example Flow:**

```
item (templateType: "multi_intent_execution")
  └─ Renders <MultiIntentExecutionComponent>
      └─ executionPipeline.map(task => ...)
          ├─ task-1 response (templateType: "agent_welcome_template")      → renderUITemplates() → <WelcomeTemplateComponent>
          ├─ task-2 response (templateType: "gpt_form_template")     → renderUITemplates() → <GPTFormComponent>
          └─ task-3 response (templateType: "Search_answer")  → renderUITemplates() → <AnswerRenderer>
```

This ensures **consistent rendering logic** across your application - the same `renderUITemplates` function handles both top-level questions and nested task responses within multi-intent execution.

---

## 2. Accessing Real-Time Task Updates

Task status updates are available through the SDK's **subscriber method**. You must subscribe to receive real-time updates about task execution states.

**Implementation (Framework Agnostic):**

```javascript
// Subscribe to store updates
const unsubscribe = store.subscribe(() => {
  const questions = store.getState().global.questions;
  // Update your UI with the latest task states
});

// Clean up subscription when component unmounts
unsubscribe();
```

**What You Receive:**
The `questions` object contains task states indexed by task `_id`:

```javascript
questions[taskId] = {
  loading: true/false,      // Task is currently executing
  error: true/false,        // Task execution failed
  showResponse: true/false, // Response is ready to display
  skipped: true/false       // Task was skipped
}
```

---

## 3. Data Structure & Parameters

### Real-World Example: The `items` Object

When `templateType === "multi_intent_execution"`, the `items` object (from the `questions` store) contains the complete execution configuration. Here's what it actually looks like:

```javascript
{
  "_id": "690b7624156fc",
  "templateType": "multi_intent_execution",
  "status": "draft",
  "question": "Complete all assigned tasks.",
  
  "templateInfo": {
    "label": "This is what I'll perform. Review and let me know",
    "action": "Start"
  },
  
  "executionPipeline": [
    {
      "_id": "690b7624156fcadc46849e97",
      "utterance": "Validate the resume",
      "status": "draft",
      "intents": [
        {
          "agentId": "ag-81461fbf-a899-5078-96d8-a94fb60ab450",
          "agentMeta": {
            "name": "Resume validator",
            "icon": "https://staticqa-kora.kore.ai/.../document/cyan.svg"
          }
        }
      ]
    },
    {
      "_id": "690b7624156fcadc46849e9d",
      "utterance": "tell me about India",
      "status": "draft",
      "intents": []
    }
  ]
}
```

### Key Fields Explained

**Top-Level Properties:**

- **`_id`**: Unique identifier for this execution instance (e.g., `"690b7624156fcadc46849e88"`)
- **`templateType`**: Must be `"multi_intent_execution"` to trigger this UI
- **`status`**: Current execution state - `"draft"`, `"in-progress"`, or `"completed"`
- **`question`**: The original user query that triggered this multi-intent execution

**`templateInfo` Object:**

- **`label`**: The instructional message shown to the user at the top (e.g., "Please review the flow and click 'Start'")
- **`action`**: The text displayed on the Start button (e.g., "Start")

**`executionPipeline` Array:**

This array contains all tasks to be executed sequentially. Each task has:

- **`_id`**: Unique task identifier - CRITICAL for matching with real-time updates from the store
- **`utterance`**: The query/command this task will execute (e.g., "get my emails", "Validate the resume")
- **`status`**: Initial status (starts as `"draft"`)
- **`intents`**: Array of agents that will handle this task
  - **`agentId`**: Unique identifier for the agent
  - **`agentMeta.name`**: Display name of the agent (e.g., "Gmail", "Jira")
  - **`agentMeta.icon`**: URL to the agent's icon

**Note:** Some tasks may have empty `intents` arrays, meaning no specific agent is assigned.

### How to Use These Fields

**Pass to SDK Methods:**
- Use entire `items` object for `runTask(items)`
- Use entire `items` object for `restartExecution(items)`

**For UI Rendering:**
- Display `templateInfo.label` as the title
- Display `templateInfo.action` as the start button text
- Iterate through `executionPipeline` to render each task
- Show agent icons from `intents[].agentMeta.icon`
- Show task query from `utterance`

**For State Management:**
- Check `items.status` to show/hide the Start button
- Use task `_id` to merge with real-time updates from `questions` store

---

### Creating the `mergedTask` Object

The `mergedTask` is created by **merging** a static task from `executionPipeline` with its real-time execution state from the `questions` store.

**Why Merge?**
- Tasks in `executionPipeline` contain static configuration (utterance, intents, etc.)
- The `questions` store contains dynamic execution states (loading, error, showResponse, etc.)
- You need both to properly render the UI

**How to Create `mergedTask`:**

```javascript
// 1. Get the static task from executionPipeline
const task = items.executionPipeline[0];
// task = {
//   _id: "690b7624156fcadc46849e97",
//   utterance: "Validate the resume",
//   status: "draft",
//   intents: [...]
// }

// 2. Get real-time state from questions store (via subscriber)
const questions = store.getState().global.questions;
const taskState = questions["690b7624156fcadc46849e97"];
// taskState = {
//   loading: true,
//   error: false,
//   showResponse: false,
//   skipped: false
// }

// 3. Merge them together
const mergedTask = {
  ...task,              // Spread static task data
  ...taskState,         // Spread real-time state
  isTask: true          // Flag to identify as task
};

// Result: mergedTask
// {
//   _id: "690b7624156fcadc46849e97",
//   utterance: "Validate the resume",
//   status: "draft",
//   intents: [...],
//   loading: true,           // from questions store
//   error: false,            // from questions store
//   showResponse: false,     // from questions store
//   skipped: false,          // from questions store
//   isTask: true
// }
```

**When to Use `mergedTask`:**
- Pass to `cancelTask(mergedTask)` to skip the current task
- Check `mergedTask.loading` to show/hide loading indicator
- Check `mergedTask.error` to show/hide error buttons
- Check `mergedTask.showResponse` to display task response
- Check `mergedTask.skipped` to determine if task was skipped

**In Practice:**

```javascript
// Iterate through execution pipeline and create mergedTask for each
items.executionPipeline.map((task) => {
  const mergedTask = {
    ...task,
    ...questions[task._id],
    isTask: true
  };
  
  // Now use mergedTask for rendering and button logic
  return (
    <div>
      {mergedTask.loading && <LoadingIndicator />}
      {mergedTask.error && <ErrorButtons onRestart={() => restartExecution(items)} />}
      {mergedTask.showResponse && renderUITemplates(mergedTask)}
    </div>
  );
});
```

---

## 4. Initializing Multi-Intent Execution

Before using the multi-intent execution methods, you need to initialize the `MultiIntentExecution` hook/function in your component.

```javascript
import { MultiIntentExecution } from './path-to-sdk/chat';

// Inside your component
const { runTask, cancelTask, restartExecution, fetchHistoricalTask } = MultiIntentExecution();
```

**What You Get:**

The `MultiIntentExecution()` function returns an object with four methods:
- **`runTask`** - Start the execution pipeline
- **`cancelTask`** - Skip the current task
- **`restartExecution`** - Restart the entire pipeline
- **`fetchHistoricalTask`** - Fetch historical task data when viewing from history

These methods are now available for use in your component to control the execution flow.

---

## 5. SDK Methods

### Method 1: `runTask(items)`

**Purpose:** Start the execution pipeline

**Usage:**
```javascript
<button onClick={() => runTask(items)}>Start</button>
```

**Effect:** Changes status to "in-progress" and begins executing tasks sequentially

---

### Method 2: `cancelTask(mergedTask)`

**Purpose:** Skip the current task and proceed to the next

**Usage:**
```javascript
<button onClick={() => cancelTask(mergedTask)}>Skip</button>
```

**Effect:** Marks task as skipped, continues to next task in pipeline

---

### Method 3: `restartExecution(items)`

**Purpose:** Restart the entire pipeline from the beginning

**Usage:**
```javascript
<button onClick={() => restartExecution(items)}>Restart</button>
```

**Effect:** Resets all task states and re-executes from the first task

---

### Method 4: `fetchHistoricalTask(items, mergedTask)`

**Purpose:** Fetch historical task data when viewing execution from history

**Parameters:**
- `items` - The complete execution object
- `mergedTask` - The specific task to fetch history for

**Usage:**
```javascript
<button onClick={() => fetchHistoricalTask(items, mergedTask)}>
  View Details
</button>
```

**Effect:** Fetches and updates the task data from history in the questions store

---

## 6. Task States & Button Visibility

### State 1: Draft (Initial State)

**Condition:** `status === "draft"` AND `executionPipeline.length > 0`

**UI Action:**
```javascript
// Show Start button
<button onClick={() => runTask(data)}>
  {data.templateInfo.action}
</button>
```

---

### State 2: Task Loading

**Condition:** `mergedTask.loading === true`

**UI Action:**
```javascript
// Show loading indicator + Skip button
<div className="loading-indicator">Analyzing...</div>
<button onClick={() => cancelTask(mergedTask)}>
  Skip this step
</button>
```

---

### State 3: Task Error

**Condition:** `mergedTask.error === true`

**UI Action:**
```javascript
// Show Restart button (always)
<button onClick={() => restartExecution(data)}>
  Restart Execution
</button>

// Show Skip button (only if not already skipped)
{!mergedTask.skipped && (
  <button onClick={() => cancelTask(mergedTask)}>
    Skip this step
  </button>
)}
```

---

### State 4: Task Completed

**Condition:** `mergedTask.showResponse === true`

**UI Action:**
```javascript
// Display task response
<div className="response-container">
  {/* Render response using TemplateRenderer or your own renderer */}
</div>
```

---

## 7. Implementation Checklist

✅ **Subscribe to SDK Store:** Implement subscriber to receive real-time task updates

✅ **Check Template Type:** Render multi-intent UI when `templateType === "multi_intent_execution"`

✅ **Define Execution Pipeline:** Structure your tasks array with required fields (`_id`, `utterance`, `intents`)

✅ **Merge Task States:** Combine static pipeline data with real-time state from subscriber

✅ **Implement Button Logic:** Show/hide buttons based on task states:
   - Start button: `status === "draft"`
   - Skip button: `loading === true` OR `error === true`
   - Restart button: `error === true`

✅ **Call SDK Methods:** Use `runTask()`, `cancelTask()`, `restartExecution()`, `fetchHistoricalTask()` with correct parameters

✅ **Handle Response Display:** Show task responses when `showResponse === true`

---

## Conclusion

The **EVA Web SDK** provides a flexible multi-intent execution framework that can be integrated into any JavaScript application. By following this implementation guide:

1. Subscribe to the SDK store to receive real-time task updates
2. Structure your execution pipeline according to the defined schema
3. Implement conditional button rendering based on task states
4. Use the provided SDK methods (`runTask`, `cancelTask`, `restartExecution`, `fetchHistoricalTask`) to control execution flow

The above references demonstrates best practices for React, but the same principles apply to Angular, Vue, or vanilla JavaScript implementations. Adapt the state management and UI rendering to your framework of choice while maintaining the core logic and method calls outlined in this guide.

