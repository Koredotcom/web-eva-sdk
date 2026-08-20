# SDK Testing and Release Plan

## Purpose

This plan defines the checks required before producing a client-facing build of
the EVA Web SDK. The goal is to catch regressions in public APIs, asynchronous
chat behavior, browser interactions, and package output before a build is
shared with a client application.

This is an incremental plan. We will begin with fast, deterministic tests and
then add integration and browser tests as the test seams become stable.

## Current baseline

- The SDK is a React browser package built with Rollup and developed with Vite.
- The package exposes the root SDK and multiple subpath entry points.
- Runtime behavior includes REST calls, Socket.IO streaming, Redux state,
  authentication, file uploads, schedulers, history, chat templates, and UI
  components.
- The production build currently completes, but reports circular-dependency
  warnings that should be reduced over time.
- There were no automated tests or CI checks when this plan was created.

## Test tools

| Area | Tool | Role |
| --- | --- | --- |
| Unit and integration tests | Vitest | Test runner, assertions, mocks, and coverage |
| Browser-like DOM tests | jsdom | DOM environment for component and browser utility tests |
| React behavior | React Testing Library | Test user-visible behavior and interactions |
| HTTP mocking | MSW or focused request mocks | Keep tests deterministic and independent of live services |
| Browser smoke tests | Playwright | Later-stage tests against a staging client application |
| Continuous integration | GitHub Actions | Run checks for every pull request and protected branch push |

## Test pyramid

### Phase 1: Critical unit and package checks

These tests are fast and should run for every pull request.

- Request/thread registry ownership and cleanup.
- Redux background-thread lifecycle and temporary-to-real thread migration.
- Authentication input validation, JWT client ID extraction, SSO response
  handling, and SDK initialization contract.
- Scheduler date/time conversion and validation.
- Package build, public exports, generated bundles, CSS, and package contents.

### Phase 2: Integration tests with mocked services

- SDK initialization dispatches the expected startup operations.
- Axios attaches the configured API URL, authorization token, and analytics
  header.
- API success and failure responses update Redux state correctly.
- Late HTTP responses and Socket.IO events update the owning chat thread rather
  than the currently visible thread.
- File upload success, failure, type, and size behavior.
- Scheduler request payloads match the documented API contract.

### Phase 3: Component behavior tests

Use React Testing Library for the highest-risk workflows:

- Send a chat message and render its response.
- Start a new chat while another response is generating.
- Reopen a background thread and preserve its messages.
- Render loading, empty, error, and retry states.
- Upload and remove attachments.
- Submit feedback.
- Create, edit, toggle, and delete schedules.

Prefer behavior and accessibility assertions over large snapshots.

### Phase 4: Staging end-to-end tests

Use Playwright against a dedicated staging client application and test account.
The first smoke suite should cover authentication, initial SDK loading, chat
submission, streamed response rendering, history navigation, and one file or
scheduler workflow. Credentials must be stored in CI secrets and never in the
repository.

## CI gates

### Pull request and protected branch checks

```text
npm ci
  -> unit/integration tests
  -> coverage report
  -> production build
  -> package/export verification
  -> upload build artifact
```

The test and build commands are blocking checks. Existing Rollup circular
dependency warnings are reported during the initial rollout; they become a
separate cleanup target rather than an immediate release blocker.

### Release checks

Release publishing must happen only after the pull-request checks pass. A tag
or manually approved release job may publish the package and retain the exact
generated artifact used by the release.

## TDD workflow for each change

1. Write a focused test describing the expected behavior.
2. Run the test and confirm it fails for the expected reason.
3. Implement the smallest production change that makes it pass.
4. Refactor while keeping the test green.
5. Run the complete local release check before opening a pull request.

Tests should describe externally observable behavior. Avoid testing private
implementation details unless they represent a real package contract or a
known concurrency invariant.

## Release checklist

- [ ] No credentials, access tokens, or client secrets are committed.
- [ ] Unit and integration tests pass.
- [ ] Coverage is reviewed for changed critical modules.
- [ ] Production build passes.
- [ ] Every declared package export is present in `dist`.
- [ ] Package contents contain only intended release files.
- [ ] Staging smoke tests pass when the release changes chat, auth, files, or
      scheduler behavior.
- [ ] Client-facing version and release notes are updated.

## Priority order

1. Authentication and initialization.
2. Chat request ownership, streaming, and background threads.
3. Redux state transitions and API failure handling.
4. Package exports and build output.
5. Files and attachments.
6. Schedulers and timezone behavior.
7. UI polish and lower-risk presentation components.

## Known security action

The demo entry point must not contain real access tokens or bot credentials.
Any credentials previously committed there should be revoked or rotated, then
replaced with environment-based local configuration or test fixtures before a
client-facing build is produced.
