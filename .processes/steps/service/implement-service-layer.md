<!--
Step: Implement Service Layer
Purpose: Implement business logic in the service layer following SOLID principles and clean architecture patterns
-->

# Step: Implement Service Layer

## Description

Implement business logic in the service layer following SOLID principles and clean architecture patterns. Creates service components including managers, calculators, checkers, validators, publishers, subscribers, and utility services.

## Purpose & Usage

Use this step when you need to:
- Implement new service layer components with business logic
- Create managers, calculators, validators, or other service types
- Add business operations that orchestrate repositories and external services
- Implement domain rules and validation logic

**Output**: Service component files in `Service/` directory with interfaces and implementations.

## Quick Reference

| Component Type | Purpose | Example |
|----------------|---------|---------|
| Manager | Orchestrate business operations | `UserManager`, `LoanManager` |
| Calculator | Compute values/decisions | `InterestCalculator`, `EligibilityCalculator` |
| Checker | Validate conditions | `EligibilityChecker`, `LimitChecker` |
| Validator | Validate input data | `RequestValidator`, `DataValidator` |
| Publisher | Publish events | `NotificationPublisher` |
| Subscriber | Handle events | `PaymentSubscriber` |

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines
- [pre-implementation-patterns.md](../_components/pre-implementation-patterns.md) - Pattern verification
- Project-specific code conventions and SOLID principles documentation

### Metadata
- **Prerequisites**: Service requirements defined, domain models defined (if applicable)
- **Dependencies**: Repository layer (if data access needed), external service integrations (if applicable)

### Context Parameters

- `components` (required): List of service components to implement:
  - `type`: Component type (Manager, Calculator, Checker, Validator, Publisher, Subscriber, Configuration, Util)
  - `name`: Name of the component (e.g., "User", "Loan", "Eligibility")
  - `operations`: List of operations/methods to implement
  - `businessRules`: Specific business rules or logic
  - `dependencies`: Required dependencies

### Guidance

<!-- @include: _components/mandatory-logging.md -->

<!-- @include: _components/pre-implementation-patterns.md -->

**Service-Specific Pattern Checks:**
- [ ] Search for similar managers/calculators/validators in `Service/` subdirectories
- [ ] Check naming conventions (e.g., `UserManager`, `LoanCalculator`, `EligibilityChecker`)
- [ ] Search `Contracts.Internal/Arguments/` for similar argument models
- [ ] Search `Contracts.Internal/Results/` for similar result models
- [ ] Review how existing services interact with repositories
- [ ] Review patterns for calling external APIs
- [ ] Check event publishing patterns (if using publishers)
- [ ] Review data mapping approaches
- [ ] Check DI registration patterns
- [ ] Note reusable helper classes in `Service/Utils/`

### Flow

```mermaid
flowchart TD
    Start([Start: Implement Service Layer]) --> ParseComponents[Parse Components List]
    ParseComponents --> ForEachComponent[For Each Component]
    ForEachComponent --> StudyPatterns[Study Existing Patterns]
    StudyPatterns --> CreateInterface[Create Interface]
    CreateInterface --> CreateImplementation[Create Implementation]
    CreateImplementation --> AddToContainer[Register in DI Container]
    AddToContainer --> MoreComponents{More Components?}
    MoreComponents -->|Yes| ForEachComponent
    MoreComponents -->|No| Complete([Complete])
```

### Substeps

- [ ] **Substep 1: Parse Components and Study Patterns**
  - Parse the components list from context parameters
  - For each component type, search for existing patterns
  - Document naming conventions and implementation patterns

- [ ] **Substep 2: Create Service Interface**
  - Create interface in appropriate `Service/Managers/Interfaces/` folder
  - Define method signatures following discovered patterns
  - Include documentation comments

- [ ] **Substep 3: Create Service Implementation**
  - Create implementation class
  - Inject required dependencies via constructor
  - Implement business logic for each operation
  - Apply SOLID principles
  - Add appropriate logging

- [ ] **Substep 4: Create Arguments/Results Models**
  - Create argument models in `Contracts.Internal/Arguments/`
  - Create result models in `Contracts.Internal/Results/`
  - Follow existing naming patterns

- [ ] **Substep 5: Register in Dependency Injection**
  - Add service registration to DI container
  - Follow existing registration patterns

- [ ] **Substep 6: Verify Implementation**
  - Verify code compiles
  - Verify follows project patterns
  - Update memory with files created

### Memory File Usage

**When to Use Memory:**
- Track service components created
- Document implementation decisions

**Memory Usage for This Step:**
- **Write to**: Current step section in memory.md
  - Information Produced: Service components created, interfaces, implementations
  - Decisions Made: Pattern choices, naming decisions
  - Files Modified/Created: List of all service files
