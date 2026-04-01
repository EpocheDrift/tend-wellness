# Vision Spec Versioning

Related docs:

- [Top-Level README](../README.md)
- [Vision README](../vision/README.md)
- [Active Vision Spec](../vision/vision-spec-v0.1-demo-phase.md)

## Why This Exists

This project needs a stable working spec for execution even while broader product thinking continues to evolve.

The goal is to avoid silently changing the meaning of the current build phase while still allowing active ideation.

## One Active Vision Spec At A Time

Working execution should point to one explicit Vision spec version at a time.

That active version should define:

- what the current phase is trying to build
- what the demo should prove
- what the system needs to support

## Ideation Does Not Automatically Change The Active Spec

New ideas, reactions, meeting notes, or partial reframes do not automatically update the active Vision spec.

They should first live in Drafts or another clearly non-active area, then be reviewed and promoted intentionally.

## Major Changes Should Become The Next Version

When thinking changes scope, proof goals, wedge, or phase definition in a meaningful way, the change should be captured as the next explicit Vision version rather than rewriting the current one in place.

Placeholder future pattern:

- `vision-spec-v0.1-demo-phase.md`
- `vision-spec-v0.2-...md`
- `vision-spec-v1.0-...md`

## Promotion Guidance

Placeholder:

1. Capture rough thinking in Drafts.
2. Decide whether the change is minor clarification or a true version change.
3. If it is a true version change, create the next Vision spec file.
4. Update Demo and System docs against the active Vision spec only after that promotion.
