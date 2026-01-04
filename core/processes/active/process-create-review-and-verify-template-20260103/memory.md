# Process Memory: Create review-and-verify Template

## Metadata
- **Process**: process-create-review-and-verify-template-20260103
- **Created**: 2026-01-03 17:51:12
- **Last Updated**: 2026-01-03 17:51:12
- **Current Step**: 1

---

## Step 1: Plan and design template

**Status**: ✅ Completed

### Information Produced
- **Requirements Document**: Generic investigation and verification template that supports iterative review-fix-verify cycles
- **Purpose Statement**: A reusable process template for systematic investigation, review, and verification tasks that can handle various types of codebase analysis (file references, project-specific content, code quality, etc.)
- **Use Cases Documentation**: 
  1. Review and verify file references are correct across the codebase
  2. Review and verify files are not project-specific (generic/reusable)
  3. Any investigation task requiring systematic review, verification, and iterative fixes
- **Step Breakdown Plan**: 12 steps total (11 investigation steps + 1 continuous improvement)
- **Required Parameters**: 
  - `investigationScope`: Description of what to investigate (e.g., "file references", "project-specific content")
  - `verificationCriteria`: What to verify against (e.g., "all references must exist", "no hardcoded project names")
- **Optional Parameters**:
  - `targetFiles`: Specific files/directories to review (if not provided, reviews entire codebase)
  - `excludePatterns`: Patterns to exclude from review (e.g., "*.log", "node_modules/")
- **Process Flow Structure**: Sequential with iterative loop for review-fix-verify cycle
- **Mermaid Flow Diagram**: Designed with decision points for issues found and user approval
- **Step Organization Plan**: 
  1. Understand investigation scope
  2. Identify files to review
  3. Review files/content
  4. Verify against criteria
  5. Document findings
  6. If issues: propose fixes
  7. Wait for user approval
  8. Apply approved fixes
  9. Re-verify after fixes
  10. Iterate if needed
  11. Final summary
  12. Continuous improvement

### Decisions Made
- **Template Name**: `review-and-verify` (kebab-case, descriptive)
- **Step Granularity**: Medium detail - each major phase gets a step, with iterative loop for fix cycle
- **Parameter Design**: Minimal required parameters (scope + criteria), optional for flexibility
- **Flow Organization**: Sequential with conditional loop for iterative fixes
- **Step References**: Will need to create new investigation steps (no existing steps found for this purpose)
- **Iteration Strategy**: Loop back to verification step after fixes are applied until all issues resolved

### Files Modified/Created
- (None yet - design phase)

### Notes
- No existing templates found for investigation/review workflows
- Template must be generic enough for various investigation types
- Key pattern: Review → Verify → Document → Fix (if needed) → Re-verify → Iterate
- User approval checkpoint required before applying fixes
- Final summary regardless of whether issues were found

**Updated**: 2026-01-03 17:51:12

---

## Step 2: Create template file

### Information Produced
- Template file created: core/processes/templates/review-and-verify.md
- Complete template with all required sections:
  - Header comment block with metadata
  - Process header
  - Parameters section
  - Context section
  - Process flow mermaid diagram
  - 12 step definitions
  - Continuous improvement step
  - Memory File section
- Validation report: All checks passed

### Decisions Made
- Step category: investigation (new category for investigation/review steps)
- Flow diagram syntax: flowchart TD (modern mermaid syntax)
- Step 10 documented as implicit iteration step
- All steps include Context section where relevant

### Files Modified/Created
- core/processes/templates/review-and-verify.md (created, then updated based on user feedback)

### Notes
- Template structure validated and passes all checks
- All parameter placeholders properly documented
- Flow diagram matches step sequence
- Ready for Step 3: Validate process-steps exist

**Updated**: 2026-01-03 17:55:36

---

## Step 3: Validate required process-steps exist

### Information Produced
- Validation report: 1 step exists, 11 steps missing
- Missing category: investigation (needs to be created)
- Existing step: @step:learning/continuous-improvement
- List of all missing steps with file paths

### Decisions Made
- Process paused until user creates missing steps
- All investigation steps need to be created in new investigation category

### Files Modified/Created
- (None - validation only)

### Notes
- Process is PAUSED
- After template updates: 8 total steps referenced (down from 12)
- User must create planning/understand-context step (planning category exists)
- User must create investigation category directory: core/processes/steps/investigation/
- User must create 6 investigation step files (down from 11 after merging steps and removing approval/iterate steps)
- Reference: core/processes/steps/README.md and core/processes/steps/step-template.md for step creation guidelines
- Once all steps exist, user resumes process at Step 4

**Updated**: 2026-01-03 21:13:12

---

## Cross-References

### Key Decisions
Quick reference to important decisions:
- (To be populated as process progresses)

---

## Search Helpers

### By Category
- **Template Design**: See Steps 1, 2
- **Step Validation**: See Step 3
- **Improvements**: See Step 4

