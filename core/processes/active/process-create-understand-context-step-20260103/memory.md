# Process Memory: Create understand-context Step

## Metadata
- **Process**: process-create-understand-context-step-20260103
- **Created**: 2026-01-03 22:31:31
- **Last Updated**: 2026-01-03 22:31:31
- **Current Step**: Not started yet

---

## Step 1: Plan and design step

### Information Produced
- Requirements analysis: Need for general-purpose context-gathering step
- Purpose statement: Fully understand context, sources, and requirements for any task or process
- Use cases: Beginning of any process type (investigations, implementations, reviews)
- Category selection: `planning` category (rationale: preparatory step before execution)
- Step structure plan: All 10 required sections identified
- Flow diagram: Mermaid flowchart with 8 nodes including iterative loop for missing information
- Substeps outline: 8 concrete, actionable substeps
- Examples outline: 3 scenarios (investigation, implementation, review)
- Common pitfalls outline: 3 pitfalls with problems and solutions
- Design document: `step-1-design.md` with complete design specification

### Decisions Made
- Category: `planning` (fits with other planning steps, preparatory nature)
- Self-contained: No references to other steps
- General-purpose: Not limited to investigations, usable by any process type
- Iterative design: Includes loop for requesting missing information
- Memory-focused: Primary output is memory.md documentation
- Tool-enabled: Uses codebase_search, read_file, and other tools

### Files Modified/Created
- Created: `step-1-design.md` (complete design specification with Q&A guidance integrated in substep 7)

### Notes
- Reviewed existing planning steps to understand patterns
- Confirmed no similar general-purpose step exists
- Design follows step-template.md structure
- Flow diagram matches substep sequence exactly
- Examples cover different process types to demonstrate general-purpose nature

**Updated**: 2026-01-04 06:59:37

---

## Step 2: Create step file

### Information Produced
- Step file created: `core/processes/steps/planning/understand-context.md`
- All required sections included:
  - Header comment block with step name and purpose
  - Step title
  - Description section
  - Output section
  - Guidance section with mandatory logging, specific actions, files/folders, tools, best practices
  - Memory File Usage section
  - Flow diagram with mermaid code
  - Substeps section with 8 concrete tasks
  - Examples section with 3 scenarios (investigation, implementation, review)
  - Common Pitfalls section with 3 pitfalls
- Validation report: `step-2-validation.md` with all checks passing
- Validation results: All 8 validation checks passed (self-contained, sections, diagram, guidance, examples, pitfalls, naming, best practices)

### Decisions Made
- Step is self-contained (no references to other steps)
- Q&A guidance integrated directly in substep 7 (not separate file)
- Flow diagram uses flowchart TD format matching design
- Examples cover different process types to demonstrate general-purpose nature

### Files Modified/Created
- Created: `core/processes/steps/planning/understand-context.md` (complete step file with all sections)

### Notes
- Step file follows step-template.md structure
- All sections from design document included
- Flow diagram matches substep sequence exactly
- Guidance includes Q&A format template in substep 7
- Examples demonstrate general-purpose usage across different process types

**Updated**: 2026-01-04 07:10:02

---

## Step 3: Validate step structure

### Information Produced
- Comprehensive validation report: `step-3-validation-report.md`
- Validation results: All 8 checks passed
  - Self-contained check: PASS (no @step: references)
  - Section completeness: PASS (all 10 required sections present)
  - Diagram validation: PASS (mermaid syntax valid, matches all 8 substeps)
  - Guidance quality: PASS (detailed and actionable)
  - Examples quality: PASS (3 relevant examples)
  - Pitfalls documentation: PASS (3 pitfalls)
  - Naming compliance: PASS (kebab-case, correct directory)
  - Best practices compliance: PASS (follows README guidelines)
- Overall status: ALL CHECKS PASS - step file ready for use

### Decisions Made
- Step file meets all requirements and is ready for use
- No issues found requiring fixes
- Proceed to Step 4 (Continuous Improvement)

### Files Modified/Created
- Created: `step-3-validation-report.md` (comprehensive validation report)

### Notes
- Step file is self-contained and general-purpose
- All sections properly formatted and complete
- Flow diagram accurately represents workflow
- Examples demonstrate usage across different process types
- Step is ready to be referenced in process templates

**Updated**: 2026-01-04 07:21:19

---

## Step 4: Continuous Improvement & Learning

### Information Produced
- (To be filled during step execution)

### Decisions Made
- (To be filled during step execution)

### Files Modified/Created
- (To be filled during step execution)

### Notes
- (To be filled during step execution)

**Updated**: (To be filled during step execution)

---

## Cross-References

### API Endpoints
Quick reference to all API endpoints discovered/created:
- (Not applicable for this process)

### Database Changes
Quick reference to all database changes:
- (Not applicable for this process)

### Key Decisions
Quick reference to important decisions:
- (To be filled during process execution)

---

## Search Helpers

### By Category
- **Step Design**: See Steps 1, 2
- **Validation**: See Step 3
- **Improvements**: See Step 4

**Note**: This section is optional and can be maintained for quick navigation

