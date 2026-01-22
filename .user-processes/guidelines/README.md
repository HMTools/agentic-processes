# Guidelines

Guidelines answer **"How to do \<X\>?"** questions with practical, action-oriented content.

## Creating Guidelines

Name your guideline file as a question: `how-to-[action].md`

Keep it simple:
- **Title**: The "How to" question
- **Content**: Practical steps and examples to answer it

## Example

`api-design/how-to-implement-controllers.md`:

```markdown
# How to Implement Controllers

1. Create controller in `API/Controllers/`
2. Inherit from `BaseController`
3. Add route attribute...

## Example

```csharp
[Route("api/[controller]")]
public class UsersController : BaseController
{
    // ...
}
```
```

## Directory Structure

```
guidelines/
├── api-design/           # API layer guidelines
├── data-access/          # Data layer guidelines
├── docs/                 # Documentation guidelines
├── implementation/       # Service layer guidelines
├── planning/             # Planning guidelines
└── testing/              # Testing guidelines
```

Guidelines are created as needed and referenced by step JSON files via `userGuidelines`.
