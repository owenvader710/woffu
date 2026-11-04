# WOFFU OS V2 — Practical UI guidelines

Visual direction from the AEKE S1 Pro Shooting Checklist workflow:
**black/white neutrals, restrained IRONTEC lime (#E5FF78), clear sections, and
one obvious action per task.** Mobile and desktop must show the same work state.

## Design decisions introduced in this branch
- Navigation: compact 270px desktop sidebar, Thai menu labels, direct active
  indicator, accessible icon descriptions and a neutral logout control.
- Page structure: one title, one-line context, consistent refresh action,
  immediate status/priority shortcuts.
- Dashboard: actionable QC / revision / overdue cards placed before long
  statistics, completion progress and direct links into projects.
- My Work: title/code/brand search, quick QC filters (waiting/needs revision),
  task completion progress, automatic refresh without full-page loading flicker.
- Projects: localized status filters and short search prompt.
- Project Draft QC: simple 4-step checklist, persistent draft history and clear
  pass / needs-changes / waiting states.
- Reusable pieces: `WorkspaceHeader`, `QuickLink`, `ChecklistProgress`,
  plus `woffu-clean-panel` and `woffu-input-simple` CSS.

## Accessibility and restraint
- Main controls have visible focus rings and a minimum 40px target.
- Lime indicates actions and progress; red indicates blocked/revision;
  yellow indicates items awaiting review.
- No fake checkboxes: checkmarks represent persisted DB state, not local-only
  clicks. The Draft decision is saved through the protected RPC.
- Status workflow and Draft QC are separate; progress percentages count
  project completions, never draft passes.
- When the Draft Review SQL migration is missing, show a clear message and
  disable QC operations rather than faking success.
- Avoid heavy glow effects and excessive text tracking in operational screens.

## Before release
- Verify mobile 360px, 390px, tablet 768px and desktop 1440px layouts.
- Validate contrast, tab order and keyboard access to menus and dialogs.
- Check long Thai job titles, long brand names and pasted Drive links.
- Verify account roles MEMBER / assigned QC MEMBER / LEADER / ADMIN.
- Confirm no duplicate work transitions from periodic refresh.
- Deploy Phase 2 & Phase 3 database migrations to **staging**, run flow tests,
  and only then consider production migration and merge.
