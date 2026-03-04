# Policy: Major Release Management – Device Proxy Migration

## Status
**Official Engineering Policy**

## Purpose
This document defines the **mandatory process** for planning, implementing, and releasing a coordinated **major version upgrade** involving architectural changes across multiple microservices.

The policy is designed to:
- Prevent unreviewable, high-risk pull requests
- Enforce clear ownership and scope of changes
- Ensure consistency and traceability during breaking changes

This policy applies to all major releases that introduce **breaking changes**, especially those involving shared infrastructure or cross-service communication.

---

## Background

The reference use case for this policy is the introduction of a **Device Proxy Service**, replacing direct device integrations within individual microservices.

In this model:
- A centralized proxy abstracts multiple device types
- All device communication flows through a common interface
- API contracts and models are centrally defined and versioned

This policy generalizes that approach for similar architectural evolutions.

---

## Scope

This policy applies when **any** of the following conditions are met:

- Introduction of a new core/shared service
- Breaking API or contract changes
- Mandatory migration across multiple microservices
- Coordinated major version bump of the application

---

## Mandatory Principles

All major releases **MUST** adhere to the following principles:

1. **No Mega Pull Requests**  
   Changes must be split into small, reviewable PRs with a single, clear responsibility.

2. **Centralized Contracts**  
   Shared APIs and models must have a single source of truth and explicit versioning.

3. **Incremental Migration**  
   Services are migrated independently and merged progressively.

4. **Dedicated Integration Branch**  
   Major releases must be developed on an isolated integration branch.

5. **Backward Compatibility When Feasible**  
   Temporary compatibility mechanisms must be preferred to strict lockstep releases.

---

## Branching Policy

### Required Branches

- `main`  
  Stable, production-ready code only

- `release/v<MAJOR>`  
  Integration branch for the major release (e.g. `release/v2`)

- `feature/*`  
  Short-lived branches scoped to a single service or concern

### Rules

- Feature branches **MUST NOT** be merged directly into `main`
- All v<MAJOR> changes **MUST** target the corresponding `release` branch
- The `release` branch **MUST NOT** be deployed to production

---

## Required Execution Phases

### Phase 1: Introduce the Shared Service

**Objective:** Establish the new architectural component without impacting existing services.

**Requirements:**
- New service implemented in isolation
- Versioned API exposed (e.g. `/v1`)
- Tests included
- No changes to existing services

**Pull Request Scope:**
- New service only

---

### Phase 2: Publish Contracts and Models

**Objective:** Define the single source of truth for inter-service communication.

**Requirements:**
- OpenAPI (or equivalent) specification
- Generated client libraries or models
- Explicit semantic versioning

**Pull Request Scope:**
- Contracts and generated artifacts only

---

### Phase 3: Service-by-Service Migration

**Objective:** Incrementally migrate each microservice to the new architecture.

**Requirements (per service):**
- Independent feature branch
- Internal adapter/interface introduced
- Direct legacy integrations removed or deprecated
- Major version bump applied

**Pull Request Scope:**
- Single microservice only

This phase is repeated for each affected service.

---

### Phase 4: Compatibility Strategy (If Required)

To reduce coordination risk, teams **SHOULD** implement at least one of the following:

- Feature flags enabling dual execution paths
- Proxy-side support for legacy protocols

Compatibility mechanisms **MUST** be temporary and documented.

---

### Phase 5: Orchestration Update

**Objective:** Activate the new architecture at the system level.

**Requirements:**
- Add new shared services to orchestration (e.g. Docker Compose)
- Update all service image versions
- Remove deprecated wiring and credentials

**Pull Request Scope:**
- Orchestration files only

This phase **MUST** occur after all service migrations are merged.

---

### Phase 6: Final Release Pull Request

**Objective:** Merge the major release into `main`.

**Requirements:**
- Merge `release/v<MAJOR>` into `main`
- Minimal code changes
- Documentation-focused PR

**The final PR MUST include:**
- Application version bump
- List of included pull requests
- Breaking changes summary
- Migration notes

---

## Release Procedure

After merge into `main`:

```bash
git tag v<MAJOR>.0.0
git push --tags
```

A GitHub Release **MUST** be created including:
- Architectural overview
- Breaking changes
- Migration guidance

---

## Enforcement

- Pull requests violating this policy **MAY be rejected**
- Exceptions **REQUIRE explicit team agreement and documentation**
- Repeated violations should trigger a process review

---

## Guiding Rule

> **If a pull request cannot be clearly explained in under 30 seconds, it violates this policy.**

---

## Ownership

This policy is owned by the Engineering team and must be reviewed periodically to reflect architectural evolution.

