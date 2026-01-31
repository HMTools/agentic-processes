# Process Memory Template

Use this template when creating a new process memory file.

## Purpose & Usage

Use this template when:
- Creating a new memory file for a process instance
- Understanding what information should be stored between steps
- Learning how to maintain process state effectively

**Memory files track**: Information produced, decisions made, files modified, and cross-references for quick navigation.

## Quick Reference

| Section | Purpose |
|---------|---------|
| Metadata | Process identification and current step |
| Step Sections | Information from each completed step |
| Cross-References | Quick lookup for common items |

**Location**: `.user-processes/active/{process-name}/memory.json`

---

## Agent Layer

### JSON Instance Schema

When creating a new process instance, initialize `memory.json` with this structure:

```json
{
  "type": "memory-file",
  "metadata": {
    "process": "{process-name-YYYYMMDD}",
    "template": "{template-category/template-name}",
    "created": "{ISO 8601 timestamp}",
    "lastUpdated": "{ISO 8601 timestamp}",
    "currentStep": "{StepId UUID}"
  },
  "subProcessState": {
    "parentProcessPath": null,
    "childSubProcesses": [],
    "syncPoints": []
  },
  "steps": {},
  "crossReferences": {
    "keyDecisions": [],
    "filesModified": []
  },
  "searchHelpers": {
    "byCategory": {}
  }
}
```

### Step Section Schema

When a step is completed, add/update its entry in `steps` (keyed by StepId UUID):

```json
{
  "steps": {
    "{StepId UUID}": {
      "name": "{Step Name}",
      "status": "completed",
      "startedAt": "{ISO 8601 timestamp}",
      "updatedAt": "{ISO 8601 timestamp}",
      "informationProduced": {
        "key": "value or nested object"
      },
      "decisionsMade": [
        "Decision 1 with rationale",
        "Decision 2 with rationale"
      ],
      "filesModifiedCreated": [
        "path/to/file1.cs",
        "path/to/file2.cs"
      ],
      "notes": "Additional context and references to previous steps"
    }
  }
}
```

### Sub-Process State Schema

For processes with parent-child relationships:

```json
{
  "subProcessState": {
    "parentProcessPath": ".user-processes/active/parent-process-id",
    "childSubProcesses": [
      {
        "processPath": ".user-processes/active/child-process-id",
        "template": "{template-name}",
        "status": "running",
        "spawnedAtStepId": "{StepId UUID}",
        "syncPointStepId": "{StepId UUID}"
      }
    ],
    "syncPoints": ["{StepId UUID}"]
  }
}
```

### Usage Guidelines

#### When to Update Memory

Update memory.json when:
1. A step begins execution (set status to "in_progress")
2. The step produces information that should be remembered
3. The step makes decisions that affect future work
4. A step completes (set status to "completed")

#### What to Include

**informationProduced:**
- Files created or modified
- API endpoints defined
- Database schema changes
- Requirements identified
- Technical designs created
- Code implementations completed

**decisionsMade:**
- Technical approach choices
- Architecture decisions
- Library/framework selections
- Design pattern choices
- Performance optimization strategies

**filesModifiedCreated:**
- Full relative paths from project root
- Can include brief description as object: `{"path": "...", "description": "..."}`

**notes:**
- Context that helps understand the work
- References to previous steps
- Constraints or limitations discovered
- Future considerations identified

#### Cross-References

Update crossReferences for quick lookup:

```json
{
  "crossReferences": {
    "keyDecisions": [
      "Step 1: Use JWT for authentication",
      "Step 3: BCrypt for password hashing"
    ],
    "apiEndpoints": [
      {"step": 2, "method": "POST", "path": "/api/auth/login"},
      {"step": 2, "method": "POST", "path": "/api/auth/refresh"}
    ],
    "filesModified": [
      "Service/AuthService.cs",
      "API/Controllers/AuthController.cs"
    ]
  }
}
```

### Guidelines

1. **Be Specific**: Include enough detail to be useful later
2. **Be Concise**: Focus on what matters for future steps
3. **Use Timestamps**: Update lastUpdated when modifying
4. **Reference Steps**: Use step numbers to link related information
5. **Keep Current**: Update currentStep in metadata as you progress
6. **Structured Data**: Use objects/arrays for complex data, not free text

### Example Memory File

```json
{
  "type": "memory-file",
  "metadata": {
    "process": "process-user-auth-20251206",
    "template": "development/develop-user-story",
    "created": "2025-12-06T10:00:00Z",
    "lastUpdated": "2025-12-06T14:45:00Z",
    "currentStep": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "subProcessState": {
    "parentProcessPath": null,
    "childSubProcesses": [],
    "syncPoints": []
  },
  "steps": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "name": "Requirements Analysis",
      "status": "completed",
      "startedAt": "2025-12-06T10:00:00Z",
      "updatedAt": "2025-12-06T10:30:00Z",
      "informationProduced": {
        "authRequirements": "JWT-based with 15-min access tokens, 7-day refresh",
        "authorizationModel": "Role-based access control (RBAC)",
        "passwordRequirements": "8+ chars, mixed case, numbers, special char",
        "scope": ["Login", "Logout", "Token refresh"]
      },
      "decisionsMade": [
        "Use existing JWT library (System.IdentityModel.Tokens.Jwt)",
        "Store refresh tokens in MongoDB (not in-memory)",
        "Implement BCrypt for password hashing"
      ],
      "filesModifiedCreated": [
        "plans/user-authentication/requirements.md"
      ],
      "notes": "Must maintain backward compatibility with existing sessions. Dependency: User collection schema must be created first."
    }
  },
  "crossReferences": {
    "keyDecisions": [
      "Step 1: JWT for authentication",
      "Step 1: BCrypt for password hashing",
      "Step 1: MongoDB for refresh token storage"
    ],
    "filesModified": []
  },
  "searchHelpers": {
    "byCategory": {}
  }
}
```

### Tips

- Start simple - you can always add more detail later
- Focus on information that helps future steps
- Don't duplicate what's obvious from code
- Use crossReferences for frequently accessed information
- Keep the metadata section updated as you progress
