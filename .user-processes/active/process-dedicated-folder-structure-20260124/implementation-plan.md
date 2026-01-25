# Implementation Plan: Dedicated Folder Structure

**Process**: Set Dedicated Folder Structure Concept  
**Step**: 4 - Design Implementation Plan  
**Date**: 2026-01-24  
**Status**: ⏳ Awaiting Approval

## Requested State Specification

Each step and template will have a dedicated folder within its category:

**Before:**
```
.processes/steps/planning/understand-context.md
.processes/steps/planning/understand-context.json
```

**After:**
```
.processes/steps/planning/understand-context/understand-context.md
.processes/steps/planning/understand-context/understand-context.json
```

## Implementation Approach

### Strategy: Batch by Category
Changes will be applied category by category to minimize risk and allow incremental verification.

### Operations Per Item:
1. Create dedicated folder: `{category}/{item-name}/`
2. Move MD file: `{item-name}.md` → `{item-name}/{item-name}.md`
3. Move JSON file: `{item-name}.json` → `{item-name}/{item-name}.json`
4. Delete original files (after verification)

---

## Change Proposals

### BATCH-STEPS-01: Steps - API Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-001 | implement-controller-layer | Create folder, move .md and .json |

**Files affected:**
- `.processes/steps/api/implement-controller-layer.md` → `.processes/steps/api/implement-controller-layer/implement-controller-layer.md`
- `.processes/steps/api/implement-controller-layer.json` → `.processes/steps/api/implement-controller-layer/implement-controller-layer.json`

---

### BATCH-STEPS-02: Steps - Common Category (3 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-002 | apply-changes | Create folder, move .md and .json |
| MOV-003 | notify-parent-complete | Create folder, move .md and .json |
| MOV-004 | spawn-sub-process | Create folder, move .md and .json |

---

### BATCH-STEPS-03: Steps - Data Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-005 | implement-repository-layer | Create folder, move .md and .json |

---

### BATCH-STEPS-04: Steps - Documentation Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-006 | update-documentation | Create folder, move .md and .json |

---

### BATCH-STEPS-05: Steps - External-Services Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-007 | implement-api-client | Create folder, move .md and .json |

---

### BATCH-STEPS-06: Steps - Guideline Category (2 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-008 | create-guideline-file | Create folder, move .md and .json |
| MOV-009 | link-guideline-to-steps | Create folder, move .md and .json |

---

### BATCH-STEPS-07: Steps - Investigation Category (4 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-010 | final-summary | Create folder, move .md and .json |
| MOV-011 | identify-files | Create folder, move .md and .json |
| MOV-012 | propose-fixes | Create folder, move .md and .json |
| MOV-013 | review-verify-document | Create folder, move .md and .json |

---

### BATCH-STEPS-08: Steps - Learning Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-014 | continuous-improvement | Create folder, move .md and .json |

---

### BATCH-STEPS-09: Steps - Planning Category (7 items + 1 anomaly)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-015 | analyze-affected-system | Create folder, move .md and .json |
| MOV-016 | create-high-level-plan | Create folder, move .md and .json |
| MOV-017 | create-low-level-design | Create folder, move .md and .json |
| MOV-018 | design-implementation-plan | Create folder, move .md and .json |
| MOV-019 | gather-relevant-information | Create folder, move .md and .json |
| MOV-020 | get-user-story-parameters | Create folder, move .md and .json |
| MOV-021 | understand-context | Create folder, move .md and .json |
| MOV-022 | create-detailed-step-plans | ⚠️ Create folder, move .md only (no JSON) |

---

### BATCH-STEPS-10: Steps - Service Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-023 | implement-service-layer | Create folder, move .md and .json |

---

### BATCH-STEPS-11: Steps - Template Category (6 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-024 | create-step-file | Create folder, move .md and .json |
| MOV-025 | create-template-file | Create folder, move .md and .json |
| MOV-026 | plan-and-design-step | Create folder, move .md and .json |
| MOV-027 | plan-and-design-template | Create folder, move .md and .json |
| MOV-028 | validate-process-steps-exist | Create folder, move .md and .json |
| MOV-029 | validate-step-structure | Create folder, move .md and .json |

---

### BATCH-STEPS-12: Steps - Testing Category (6 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-030 | capture-test-failure | Create folder, move .md and .json |
| MOV-031 | diagnose-integration-test-failure | Create folder, move .md and .json |
| MOV-032 | implement-integration-test-fix | Create folder, move .md and .json |
| MOV-033 | verify-test-passes | Create folder, move .md and .json |
| MOV-034 | write-integration-tests-api | Create folder, move .md and .json |
| MOV-035 | write-unit-tests-service | Create folder, move .md and .json |

---

### BATCH-TEMPLATES-01: Templates - Development Category (2 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-036 | develop-user-story | Create folder, move .md and .json |
| MOV-037 | low-level-design-user-story | Create folder, move .md and .json |

---

### BATCH-TEMPLATES-02: Templates - Infrastructure Category (4 items)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-038 | create-guideline | Create folder, move .md and .json |
| MOV-039 | create-process-step-template | Create folder, move .md and .json |
| MOV-040 | create-process-template | Create folder, move .md and .json |
| MOV-041 | set-concept | Create folder, move .md and .json |

---

### BATCH-TEMPLATES-03: Templates - Review Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-042 | review-and-verify | Create folder, move .md and .json |

---

### BATCH-TEMPLATES-04: Templates - Testing Category (1 item)
| Change ID | Item | Operation |
|-----------|------|-----------|
| MOV-043 | integration-test-fix | Create folder, move .md and .json |

---

## Summary

| Category | Batches | Items | Operations |
|----------|---------|-------|------------|
| Steps | 12 | 35 | 70 files moved |
| Templates | 4 | 8 | 16 files moved |
| **Total** | **16** | **43** | **86 files moved** |

## Verification Approach

After each batch:
1. Verify folders created
2. Verify files moved correctly
3. Verify original files can be deleted

After all batches:
1. Verify `@framework-step:` references resolve correctly
2. Run any existing tests if available

---

## Approval Options

Please choose one of the following:

1. **Approve All** - Apply all 43 change proposals (16 batches)
2. **Approve Specific Batches** - Specify which BATCH-* IDs to apply
3. **Approve Specific Items** - Specify which MOV-* IDs to apply
4. **Request Modifications** - Ask for changes to the plan
5. **Reject** - Cancel the implementation

**Recommended**: Approve All (this is a straightforward structural change)

