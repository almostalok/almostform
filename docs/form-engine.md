# Form Engine & Logic Documentation

## Normalized Runtime Schema (`ExperienceSchema`)
The form engine relies on a normalized schema structure that acts as the single source of truth across the Form Builder, Preview Mode, Public Respondent Runtime (`/f/[slug]`), and Response Management Dashboard.

```typescript
export interface ExperienceSchema {
  id: string;
  workspaceId: string;
  versionId: string;
  versionNumber: number;
  metadata: {
    title: string;
    description?: string;
    type: "GENERAL" | "SURVEY" | "QUIZ" | "HIRING";
    slug: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  };
  scenes: SceneSchema[];
  logicRules: LogicRuleSchema[];
  settings: {
    responseCollectionEnabled: boolean;
  };
}
```

## Form Logic Engine (`evaluateLogic`)
Conditional logic rules are evaluated deterministically whenever a respondent updates an answer:
- **Operators**: `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `GREATER_THAN`, `LESS_THAN`
- **Actions**: `SHOW_SCENE`, `HIDE_SCENE`

```typescript
const { hiddenSceneIds, shownSceneIds } = evaluateLogic(schema, answersMap);
```
Scenes matching `SHOW_SCENE` are revealed when their condition evaluates to `true`; otherwise they remain hidden.
