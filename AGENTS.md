# AGENTS.md — PharmaConnect Execution Guide

## Project State
This project is already partially built and actively being improved.

Agents MUST:
- improve the current system
- NOT rebuild from scratch
- preserve working functionality
- avoid large rewrites unless explicitly requested

## Instruction Hierarchy
When instructions conflict, follow this order:
1. Direct user request
2. CLAUDE.md
3. AGENTS.md
4. Existing code conventions

## Before Making Changes
Always:
1. Read the relevant files first
2. Understand current behavior
3. Preserve existing architecture unless change is necessary
4. Prefer the smallest safe change

## Safe Change Rules
- Do not rewrite full modules without clear need
- Do not rename files/functions broadly without strong reason
- Do not change database schema casually
- Do not break existing API contracts
- Do not introduce major new dependencies unless justified
- Do not mix patient UUID with personal identity data

## Task Scope
Prefer small, isolated tasks such as:
- fix a bug
- improve one screen
- add validation
- improve loading/error states
- refactor one component
- add tests for one workflow

Avoid vague or dangerous tasks such as:
- improve the whole app
- redesign the architecture
- rebuild the module from scratch

## Product-Aware Constraints
This is a healthcare and compliance-sensitive product.

Always respect:
- patient privacy model
- role-based access control
- offline-first expectations
- auditability
- Phase 1 scope limits

If current code violates an important rule:
- do not perform a massive surprise rewrite
- flag the issue
- suggest a safe migration or phased fix

## Frontend Rules
- Prefer existing UI patterns and components
- Keep design professional, clean, and mobile-friendly
- Improve clarity before adding visual complexity
- Do not redesign the whole UI unless requested

## Backend Rules
- Validate inputs
- Preserve backward compatibility where possible
- Add meaningful error handling
- Keep business logic clear and contained
- Avoid hidden side effects

## Testing and Validation
After meaningful changes:
- run relevant checks/tests if available
- explain what changed
- explain risks
- explain what to test manually

## For Next.js Work
This project may use a newer Next.js version than many examples assume.

Before framework-level changes:
- inspect current package versions and config
- follow the project's existing conventions
- avoid outdated patterns
- check whether app router, server components, and current folder conventions are already in use

## Output Style
Be concise, practical, and implementation-focused.

For each task, provide:
- current issue
- planned change
- files affected
- risks
- test steps