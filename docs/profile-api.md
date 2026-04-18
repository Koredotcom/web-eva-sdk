# Profile API — Developer Documentation

## Overview

The `profile` module of the EVA Web SDK provides functions to manage user memory, including the **About Me** section and **Instructions**. All functions automatically resolve the user ID from the SDK's internal store — the client application does not need to pass it.

### Importing

```javascript
import {
    getAboutMe,
    updateAboutMe,
    getInstructions,
    createInstruction,
    updateSpecificInstruction,
} from "eva-web-sdk";
```

### TypeScript Definition (for client definition files)

If your project uses a declaration file to type the SDK, add the following:

```typescript
declare module "eva-web-sdk" {
    // About Me
    export function getAboutMe(): Promise<{
        status: "success" | "failed";
        error?: { message: string };
        data: any;
    }>;

    export function updateAboutMe(instruction: string): Promise<{
        status: "success" | "failed";
        error?: { message: string };
        data: {
            userId: string;
            accountId: string;
            instruction: string;
            scope: string;
            instructionId: string;
            createdBy: string;
            updatedBy: string;
            cOn: string;
            lMod: string;
        } | null;
    }>;

    // Instructions
    export function getInstructions(options?: {
        scope?: "global" | "agent";
        agentId?: string;
        limit?: number;
        skip?: number;
    }): Promise<{
        status: "success" | "failed";
        error?: { message: string };
        data: {
            instructions: Array<{
                instructionId: string;
                instruction: string;
                scope: "global" | "agent";
                userId: string;
                accountId: string;
                createdBy: string;
                updatedBy: string;
                cOn: string;
                lMod: string;
                agentId?: string;
                agentName?: string;
            }>;
        } | null;
    }>;

    export function createInstruction(params: {
        instruction: string;
        scope?: "global" | "agent";
        agentId?: string;
    }): Promise<{
        status: "success" | "failed";
        error?: { message: string };
        data: {
            instructionId: string;
            instruction: string;
            scope: "global" | "agent";
            userId: string;
            accountId: string;
            createdBy: string;
            updatedBy: string;
            cOn: string;
            lMod: string;
            agentId?: string;
        } | null;
    }>;

    export function updateSpecificInstruction(params: {
        instructionId: string;
        instruction: string;
    }): Promise<{
        status: "success" | "failed";
        error?: { message: string };
        data: any;
    }>;
}
```

---

## `getAboutMe()`

Fetches the user's "About Me" memory data.

### Signature

```javascript
const result = await getAboutMe();
```

### Parameters

None. The user ID is resolved automatically from the SDK store.

### Return Value

```javascript
// On success
{
    status: "success",
    data: {
        summary: null,
        lastUpdatedAt: null,
        edits: [
            {
                userId: "u-xxxx-xxxx-xxxx",
                accountId: "ac-xxxx-xxxx-xxxx",
                instruction: "im a developer",
                scope: "aboutMe",
                createdBy: "u-xxxx-xxxx-xxxx",
                updatedBy: "u-xxxx-xxxx-xxxx",
                cOn: "2026-04-02T13:04:11.000Z",
                lMod: "2026-04-02T13:04:11.000Z",
                instructionId: "69ce694bc635c36419172927"
            }
        ]
    }
}

// On failure
{ status: "failed", error: { message: "..." }, data: null }
```

### Response Fields


| Field                 | Type           | Description                                         |
| --------------------- | -------------- | --------------------------------------------------- |
| summary               | string or null | Auto-generated summary of all edits. May be null.   |
| lastUpdatedAt         | string or null | ISO 8601 timestamp of the last update. May be null. |
| edits                 | array          | List of individual edit instructions.               |
| edits[].instruction   | string         | The instruction text that was submitted.            |
| edits[].scope         | string         | Always "aboutMe" for this endpoint.                 |
| edits[].instructionId | string         | Unique ID of this edit.                             |
| edits[].cOn           | string         | ISO 8601 timestamp when the edit was created.       |
| edits[].lMod          | string         | ISO 8601 timestamp when the edit was last modified. |


### Example

```javascript
import { getAboutMe } from "eva-web-sdk";

const result = await getAboutMe();

if (result.status === "success") {
    console.log("About Me:", result.data);
} else {
    console.error("Error:", result.error.message);
}
```

---

## `updateAboutMe(instruction)`

Edits the user's "About Me" memory by sending a natural language instruction.

### Signature

```javascript
const result = await updateAboutMe(instruction);
```

### Parameters


| Parameter   | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| instruction | string | Yes      | The instruction text to update About Me. Must be non-empty. |


### Return Value

```javascript
// On success
{
    status: "success",
    data: {
        userId: "u-xxxx-xxxx-xxxx",
        accountId: "ac-xxxx-xxxx-xxxx",
        instruction: "I prefer concise responses in bullet points",
        scope: "aboutMe",
        createdBy: "u-xxxx-xxxx-xxxx",
        updatedBy: "u-xxxx-xxxx-xxxx",
        cOn: "2026-04-02T13:31:44.000Z",
        lMod: "2026-04-02T13:31:44.000Z",
        instructionId: "69cexxxxxxxxxxxxxxxxxxxx"
    }
}

// On failure
{ status: "failed", error: { message: "..." }, data: null }
```

### Response Fields


| Field         | Type   | Description                                                |
| ------------- | ------ | ---------------------------------------------------------- |
| userId        | string | The ID of the user who owns this instruction.              |
| accountId     | string | The account ID associated with the user.                   |
| instruction   | string | The instruction text that was submitted.                   |
| scope         | string | Always `"aboutMe"` for this endpoint.                      |
| createdBy     | string | The user ID of the creator.                                |
| updatedBy     | string | The user ID of the last modifier.                          |
| cOn           | string | ISO 8601 timestamp when the instruction was created.       |
| lMod          | string | ISO 8601 timestamp when the instruction was last modified. |
| instructionId | string | Unique ID of the created/updated instruction.              |

### Example

```javascript
import { updateAboutMe } from "eva-web-sdk";

const result = await updateAboutMe("I prefer concise responses in bullet points");

if (result.status === "success") {
    console.log("Updated:", result.data.instructionId);
} else {
    console.error("Error:", result.error.message);
}
```

---

## `getInstructions(options?)`

Fetches the list of memory instructions for the current user. Supports filtering by scope, agent, and pagination.

### Signature

```javascript
const result = await getInstructions(options);
```

### Parameters


| Parameter       | Type   | Required | Description                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------- |
| options         | object | No       | Options object. All fields optional.                       |
| options.scope   | string | No       | Filter by scope: `global` or `agent`. Omit to get both.    |
| options.agentId | string | No       | Filter by a specific agent ID.                             |
| options.limit   | number | No       | Max number of results to return. Defaults to 100.          |
| options.skip    | number | No       | Number of results to skip (for pagination). Defaults to 0. |


### Return Value

```javascript
// On success
{
    status: "success",
    data: {
        instructions: [
            {
                instructionId: "69cd0ec8df039ee970536397",
                instruction: "Always respond in formal English",
                scope: "global",
                userId: "u-xxx",
                accountId: "ac-xxx",
                createdBy: "u-xxx",
                updatedBy: "u-xxx",
                cOn: "2026-04-01T12:25:44.000Z",
                lMod: "2026-04-01T12:25:44.000Z"
            },
            {
                instructionId: "69cd0ec8df039ee970536398",
                instruction: "Use bullet points",
                scope: "agent",
                agentId: "ag-xxx",
                agentName: "Sales Bot",
                userId: "u-xxx",
                accountId: "ac-xxx",
                createdBy: "u-xxx",
                updatedBy: "u-xxx",
                cOn: "2026-04-01T13:00:00.000Z",
                lMod: "2026-04-01T13:00:00.000Z"
            }
        ]
    }
}

// On failure
{ status: "failed", error: { message: "..." }, data: null }
```

### Examples

```javascript
import { getInstructions } from "eva-web-sdk";

// Fetch all instructions (global + agent)
const all = await getInstructions();

// Fetch only global instructions
const global = await getInstructions({ scope: "global" });

// Fetch instructions for a specific agent
const agentSpecific = await getInstructions({
    scope: "agent",
    agentId: "ag-b0b6c3b6-df0a-5316-8a9f-35bf43babd1e",
});

// Paginate: get 10 results, skip first 20
const page3 = await getInstructions({ limit: 10, skip: 20 });
```

---

## `createInstruction(params)`

Creates a new memory instruction for the current user. Instructions can be global or scoped to a specific agent.

### Signature

```javascript
const result = await createInstruction({ instruction, scope, agentId });
```

### Parameters


| Parameter   | Type   | Required    | Description                                   |
| ----------- | ------ | ----------- | --------------------------------------------- |
| instruction | string | Yes         | The instruction text. Max 2000 characters.    |
| scope       | string | No          | `global` or `agent`. Defaults to `global`.    |
| agentId     | string | Conditional | The agent ID. Required when scope is `agent`. |


### Validation Rules

- `instruction` must be a non-empty string, max 2000 characters.
- `scope` must be `global` or `agent` if provided. Defaults to `global` when omitted.
- `agentId` is required when scope is `agent`. Ignored when scope is `global`.

### Return Value

```javascript
// On success
{
    status: "success",
    data: {
        instructionId: "69cd0ec8df039ee970536397",
        instruction: "Always respond in formal English",
        scope: "global",
        userId: "u-xxx",
        accountId: "ac-xxx",
        createdBy: "u-xxx",
        updatedBy: "u-xxx",
        cOn: "2026-04-01T12:25:44.000Z",
        lMod: "2026-04-01T12:25:44.000Z"
    }
}

// On failure
{ status: "failed", error: { message: "..." }, data: null }
```

### Examples

```javascript
import { createInstruction } from "eva-web-sdk";

// Create a global instruction
const result = await createInstruction({
    instruction: "Always respond in formal English",
});

// Create a global instruction (explicit scope)
const result2 = await createInstruction({
    instruction: "Keep responses under 200 words",
    scope: "global",
});

// Create an agent-scoped instruction
const result3 = await createInstruction({
    instruction: "Use bullet points in all responses",
    scope: "agent",
    agentId: "ag-b0b6c3b6-df0a-5316-8a9f-35bf43babd1e",
});

if (result.status === "success") {
    console.log("Created:", result.data.instructionId);
} else {
    console.error("Error:", result.error.message);
}
```

---

## `updateSpecificInstruction(params)`

Updates an existing memory instruction by ID. Use this after you have an instruction record (for example from `getInstructions`, or the `instructionId` returned by `createInstruction`). The SDK sends `PUT` to `1.1/users/{userId}/memory/instructions/{instructionId}` with body `{ instruction }`.

### Signature

```javascript
const result = await updateSpecificInstruction({ instructionId, instruction });
```

### Parameters

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| instructionId   | string | Yes      | The ID of the instruction to update (Mongo-style id from the API). |
| instruction     | string | Yes      | The new instruction text. Must be non-empty (whitespace-only is rejected). Max 2000 characters. |

### SDK validation errors

The SDK validates inputs before calling the API. On failure, `result.error.message` is one of the following strings:

| Condition | `error.message` |
| --------- | --------------- |
| No user ID in the SDK store | `validated at sdk function level and identified the User ID not available` |
| Missing `instructionId` | `validated at sdk functionlevel and identified the instructionId is required and not provided` |
| Empty or whitespace-only `instruction` | `validated at sdk function level and identified the Instruction provided is empty or whitespace only` |
| `instruction` longer than 2000 characters | `validated at sdk function level and identified the Instruction provided must not exceed 2000 characters` |

Network or API failures after validation return `error` from the server or a generic fallback: `Unable to update instruction`.

### Return Value

```javascript
// On success
{
    status: "success",
    data: { /* server response body */ }
}

// On failure
{ status: "failed", error: { message: "..." }, data: null }
```

### Example

```javascript
import { getInstructions, updateSpecificInstruction } from "eva-web-sdk";

const list = await getInstructions({ scope: "global" });
if (list.status === "success" && list.data?.instructions?.length) {
    const id = list.data.instructions[0].instructionId;
    const result = await updateSpecificInstruction({
        instructionId: id,
        instruction: "Always use British spelling.",
    });
    if (result.status === "success") {
        console.log("Updated");
    } else {
        console.error(result.error.message);
    }
}
```

### Typical flow with `createInstruction`

1. Call `getInstructions`. If `instructions` is empty, use `createInstruction` to create the first global (or agent-scoped) instruction.
2. For every later edit, call `updateSpecificInstruction` with the same `instructionId` returned from the list or from create.

---

## Error Handling

All functions return a consistent response shape. You never need to wrap calls in try/catch — errors are returned in the response object:

```javascript
const result = await createInstruction({ instruction: "" });

if (result.status === "failed") {
    // result.error.message contains the reason
    console.error(result.error.message);
    // e.g. "Instruction is required"
}
```

### Common Error Messages

Shared across **`getAboutMe`**, **`updateAboutMe`**, **`getInstructions`**, and **`createInstruction`** (and the same conditions for those functions):

| Error                                       | When                                             |
| ------------------------------------------- | ------------------------------------------------ |
| User ID not available                       | SDK is not initialized or user is not logged in. |
| Instruction is required                     | Empty, missing, or whitespace-only instruction (`updateAboutMe`, `createInstruction`). |
| Instruction must not exceed 2000 characters | Instruction text is too long (`createInstruction`). |
| Scope must be 'global' or 'agent'           | Invalid scope value (`getInstructions`, `createInstruction`). |
| agentId is required when scope is 'agent'   | Scope is agent but no agentId (`createInstruction`). |

**`updateSpecificInstruction`** uses the longer SDK validation messages in the **SDK validation errors** table above instead of the short strings in the shared table.

Other failure strings from thunks include: `Unable to fetch about me`, `Unable to update about me`, `Unable to fetch instructions`, `Unable to create instruction`, `Unable to update instruction`.


---

## Notes

- All functions resolve the user ID internally from the SDK store. The client never needs to pass it.
- The SDK handles authentication (Bearer token) and request headers automatically via the shared axios instance.
- All date fields in responses (`cOn`, `lMod`) are ISO 8601 strings.
- Agent-scoped instructions include `agentId` and `agentName` in the response. Global instructions do not.
- Use `createInstruction` to create a new instruction; use `updateSpecificInstruction` to change the text of an existing one identified by `instructionId`.

