# Process Memory Template

Use this template when creating a new process memory file.

## Structure

```markdown
# Process Memory: {Process Name}

## Metadata
- **Process**: {process-name-YYYYMMDD}
- **Created**: {YYYY-MM-DD HH:mm:ss}
- **Last Updated**: {YYYY-MM-DD HH:mm:ss}
- **Current Step**: {step number}

---

## Step 1: {Step Name}

### Information Produced
- {List what was created or discovered}
- {Include specific details that future steps might need}

### Decisions Made
- {Document any technical or business decisions}
- {Include rationale where helpful}

### Files Modified/Created
- path/to/file1.cs
- path/to/file2.cs

### Notes
- {Additional context or observations}
- {References to previous steps if relevant}

**Updated**: {YYYY-MM-DD HH:mm:ss}

---

## Step 2: {Step Name}

### Information Produced
- {What this step created/discovered}

### Decisions Made
- {Technical or architectural decisions}

### Files Modified/Created
- path/to/file3.cs

### Notes
- {Additional context}
- {Reference Step 1 if needed}

**Updated**: {YYYY-MM-DD HH:mm:ss}

---

## Cross-References

### API Endpoints
Quick reference to all API endpoints discovered/created:
- Step {N}: {HTTP Method} {endpoint path}

### Database Changes
Quick reference to all database changes:
- Step {N}: {Description of schema change}

### Key Decisions
Quick reference to important decisions:
- Step {N}: {Decision summary}

---

## Search Helpers

### By Category
- **API Endpoints**: See Steps {N}, {M}
- **Database Schema**: See Steps {N}, {M}
- **Design Decisions**: See Steps {N}, {M}
- **Test Files**: See Steps {N}, {M}

**Note**: This section is optional and can be maintained for quick navigation
```

## Usage Guidelines

### When to Add a Step Section

Add a new step section when:
1. A step begins execution
2. The step produces information that should be remembered
3. The step makes decisions that affect future work

### What to Include

**Information Produced:**
- Files created or modified
- API endpoints defined
- Database schema changes
- Requirements identified
- Technical designs created
- Code implementations completed

**Decisions Made:**
- Technical approach choices
- Architecture decisions
- Library/framework selections
- Design pattern choices
- Performance optimization strategies

**Files Modified/Created:**
- Full relative paths from project root
- Brief description of what changed if not obvious
- Group by category (API, Service, Repository, Tests, etc.)

**Notes:**
- Context that helps understand the work
- References to previous steps
- Constraints or limitations discovered
- Future considerations identified

### When to Update Cross-References

Update the Cross-References section:
- After completing steps that define APIs or database schemas
- When making major technical decisions
- Periodically to keep it useful for quick lookup

### Best Practices

1. **Be Specific**: Include enough detail to be useful later
2. **Be Concise**: Focus on what matters for future steps
3. **Use Timestamps**: Update the timestamp when modifying a section
4. **Reference Steps**: Use step numbers to link related information
5. **Keep Current**: Update "Current Step" in metadata as you progress

### Example Memory Sections

#### Example 1: Requirements Analysis Step

```markdown
## Step 1: Requirements Analysis

### Information Produced
- Authentication requirements: JWT-based with 15-min access tokens, 7-day refresh
- Authorization model: Role-based access control (RBAC)
- Password requirements: 8+ chars, mixed case, numbers, special char
- Scope: Login, logout, token refresh (2FA deferred to Phase 2)

### Decisions Made
- Use existing JWT library (System.IdentityModel.Tokens.Jwt)
- Store refresh tokens in MongoDB (not in-memory)
- Implement BCrypt for password hashing

### Files Modified/Created
- plans/user-authentication/requirements.md

### Notes
- Must maintain backward compatibility with existing sessions
- Dependency: User collection schema must be created first

**Updated**: 2025-12-06 10:30:00
```

#### Example 2: Implementation Step

```markdown
## Step 6: Implement Service Layer

### Information Produced
- Created IAuthenticationService interface with methods:
  - LoginAsync(email, password)
  - RefreshTokenAsync(refreshToken)
  - RevokeTokenAsync(refreshToken)
- Implemented AuthenticationService with:
  - JWT token generation
  - Password validation with BCrypt
  - Refresh token management

### Decisions Made
- Use BCrypt work factor 12 (balance security vs. performance)
- Implement rate limiting: max 5 login attempts per 15 minutes
- Account lockout: 30 minutes after 5 failed attempts

### Files Modified/Created
- Service/Managers/Interfaces/IAuthenticationService.cs
- Service/Managers/AuthenticationService.cs
- Service/Validators/LoginRateLimitValidator.cs

### Notes
- Based on Step 2 decision for JWT authentication
- Implements interface defined in Step 4
- Uses User repository from Step 5

**Updated**: 2025-12-06 14:45:00
```

#### Example 3: Testing Step

```markdown
## Step 9: Write Unit Tests

### Information Produced
- Created 28 unit tests for AuthenticationService
- Test coverage: 96% (144/150 lines)
- All tests passing

### Decisions Made
- Use Moq for mocking IUserRepository
- Test both success and failure paths
- Include edge cases: concurrent logins, expired tokens

### Files Modified/Created
- Tests/Unit/Service/Managers/AuthenticationServiceTests.cs

### Notes
- Discovered edge case with concurrent logins (added lock mechanism)
- Tests verify rate limiting from Step 6
- Tests validate JWT structure from Step 2 design

**Updated**: 2025-12-06 16:20:00
```

## Tips

- Start simple - you can always add more detail later
- Focus on information that helps future steps
- Don't duplicate what's obvious from code
- Use cross-references to avoid repeating information
- Keep the metadata section updated as you progress
