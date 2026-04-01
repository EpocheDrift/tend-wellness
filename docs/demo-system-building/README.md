# Demo / System Building Docs

This section holds the working documentation for the current build cycle across three connected layers:

1. [Vision](./vision/README.md): the frozen working spec for the current phase.
2. [Demo](./demo/README.md): the outward-facing narrative, flow, and showable experience derived from Vision.
3. [System](./system/README.md): the internal build structure derived from Vision.

[Drafts](./drafts/README.md) is the temporary holding area for unfinished thinking that is not yet part of the active working spec.

## Working Rule

- Vision changes first.
- Demo and System derive from the active Vision spec.
- Drafts can explore future changes without silently changing the active spec.
- Major changes should become the next Vision version, not an untracked rewrite of the current one.

## Structure

- [vision/](./vision/README.md): versioned working specs.
- [demo/](./demo/README.md): demo narrative, flow, script, and checklist.
- [system/](./system/README.md): architecture, modules, data model, and interfaces.
- [drafts/](./drafts/README.md): incomplete notes, proposals, migration staging, and versioning discussions.

## Migration Notes

This area is intentionally lightweight so material from Notion can be migrated in gradually. Likely migration sources include:

- high overview
- info requirement follow up
- outreach and meetings
- application drafts

Move material into the smallest appropriate document first, then refine and promote it as needed.
