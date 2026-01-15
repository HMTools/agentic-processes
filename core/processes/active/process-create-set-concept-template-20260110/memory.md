# Process Memory: Create set-concept Template

## Metadata
- **Process**: process-create-set-concept-template-20260110
- **Created**: 2026-01-10 20:18:37
- **Last Updated**: 2026-01-10 20:18:37
- **Current Step**: 1

---

## Step 1: Plan and design template

### Information Produced
- Requirements document: Complete analysis of the set-concept template requirements
- Purpose statement: Systematic workflow for implementing/updating concepts across files
- Use cases documentation: Three primary use cases (new implementation, updating existing, verification)
- Step breakdown plan: 7 steps total (including mandatory continuous improvement)
- Parameter lists:
  - Required: conceptName, conceptDescription, targetFiles
  - Optional: existingState, requestedState, verificationCriteria, excludePatterns
- Process flow structure outline: Understanding → Discovery → Planning → Implementation → Verification → Learning
- Mermaid flow diagram code: Complete flowchart with decision points
- Step organization plan: All 7 steps with references, descriptions, and outputs
- Template design document: `template-design.md` with complete design specification

### Decisions Made
- Combined "Define Requested State" into "Design Implementation Plan" step for efficiency
- Reused existing generic steps from planning, investigation, and common categories
- Used file-oriented approach (not code-specific) to support any file type
- Designed flow to handle already-implemented cases (skip to verification)
- Included decision points in flow diagram (not as separate steps)
- Made step descriptions generic and reusable across concept types

### Files Modified/Created
- `template-design.md` (complete design document)

### Notes
- Template reuses existing steps: understand-context, identify-files, review-verify-document, create-high-level-plan, apply-changes, continuous-improvement
- Flow handles "already implemented" case by checking after Step 3 and skipping to verification
- All steps work with files generically, not code-specific
- Step 4 includes both requested state definition and implementation planning
- **CRITICAL**: This template is specifically for NON-CODE files only: documentation, processes, AI agentic files, best practices, etc. NOT for code development. Code development has dedicated process templates.
- **File Creation Support**: Template can create new files when needed to fully implement a concept (e.g., template files, documentation files, process files)
- **No Code Examples**: All examples in the design are for non-code files only (documentation, processes, AI agentic files, best practices)
- **No Verification Use Case**: Verification has its own dedicated process template. This template handles already-implemented cases by skipping implementation, not by verifying.

**Updated**: 2026-01-10 20:32:15

---

## Step 2: Create template file

### Information Produced
- Template file created: `core/processes/templates/set-concept.md` with all required sections
- Header comment block with all metadata (Template name, Purpose, Required/Optional parameters, When to use)
- Process header with {{processName}} placeholder
- Complete Parameters section with all 7 parameters (3 required, 4 optional)
- Context section with relevant variables
- Process Flow section with mermaid diagram matching design
- Complete Steps section with all 7 steps properly formatted
- Final Phase section with Step 7 (Continuous Improvement)
- Memory File section
- Errors & Notes section
- Audit Log section
- Validation report confirming all checks pass

### Decisions Made
- Used "Analysis Criteria" instead of "Verification Criteria" in Step 3 (per design review)
- Included all optional parameters in Parameters section for clarity
- Context section includes repository, conceptName, targetFiles, excludePatterns
- Step descriptions kept generic and aligned with actual step files
- Flow diagram simplified to match approved design

### Files Modified/Created
- `core/processes/templates/set-concept.md` (template file created)
- `core/processes/active/process-create-set-concept-template-20260110/validation-report.md` (validation report)

### Notes
- All step references verified to exist
- All step descriptions align with step files
- Flow diagram matches step sequence and shows correct decision logic
- No steps are flow transitions - all represent actual work
- Template complies with all best practices
- Validation: All checks passed

**Updated**: 2026-01-10 21:50:29

---

## Step 3: Validate required process-steps exist

### Information Produced
- Validation report of existing vs. missing process-steps
- List of all 7 step references (6 unique) with existence status
- Confirmation that all required process-steps exist
- Step validation report: `step-validation-report.md`

### Decisions Made
- Confirmed all step references are valid and exist
- Noted that `@step:investigation/review-verify-document` is appropriately reused for both Step 3 and Step 6
- Validated that mandatory continuous improvement step exists

### Files Modified/Created
- `core/processes/active/process-create-set-concept-template-20260110/step-validation-report.md` (validation report)

### Notes
- All 6 unique process-steps exist in their expected locations
- No missing process-steps require creation
- Template is ready to proceed to Step 4 (Continuous Improvement)
- Validation status: ✅ PASS - All process-steps exist

**Updated**: 2026-01-10 21:55:56

---

## Step 4: Continuous Improvement & Learning

### Information Produced
- (To be populated during step execution)

### Decisions Made
- (To be populated during step execution)

### Files Modified/Created
- (To be populated during step execution)

### Notes
- (To be populated during step execution)

**Updated**: (To be populated during step execution)

---

## Cross-References

### API Endpoints
Quick reference to all API endpoints discovered/created:
- (None for this process)

### Database Changes
Quick reference to all database changes:
- (None for this process)

### Key Decisions
Quick reference to important decisions:
- (To be populated during process execution)

---

## Search Helpers

### By Category
- **Template Design**: See Steps 1, 2
- **Validation**: See Steps 2, 3
- **Improvements**: See Step 4

**Note**: This section is optional and can be maintained for quick navigation
