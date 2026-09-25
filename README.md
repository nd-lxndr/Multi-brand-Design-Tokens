# Multi-brand-Design-Tokens
A manifest-driven token build pipeline that turns a multi-brand, multi-mode Figma token export into CSS custom properties — with example components consuming the output.

Rebuilt similar as the architecture of the design system I led as Design System Manager. Brand names, colors, and identifying details have been anonymized; the structure and logic are accurate. See the [case study repo]([../enterprise-design-system-case-study](https://github.com/nd-lxndr/Enterprise-Design-System-Leadership-Case-Study) for the fuller story of leading that system.

---

## The 3-tier structure

```
Primitives → Semantic [Brand] → Components
```

| Tier | What it contains | When it's used |
|---|---|---|
| **Primitives** | Raw values only — full color palette, type scale, spacing scale. No meaning attached. | Never applied directly — building blocks only. |
| **Semantic** | Brand-specific meaning layered on primitives — "this color is for interactive elements." One set per brand. | Used when no component token exists yet for what's being built. |
| **Components** | Token values scoped to a specific component — button, card, accordion. | The default choice whenever working within an existing component. |

The pipeline discovers every brand + mode combination automatically from `tokens/manifest.json` — nothing brand-specific is hardcoded in the build script, so adding a new brand or mode means adding token files, not touching the pipeline itself.

## A real naming decision: appearance vs. role

One architecture decision worth calling out, because it's the kind of thing that only becomes obvious once a system has to survive more than one theme.

The system's earliest semantic tokens were named after what they *looked like*:
`surface-light`, `surface-dark`, `content-dark`, `content-light`.

That worked fine in a single-theme product. The moment dark mode and a second brand theme entered the picture, it broke down — in dark mode, `surface-light` could render as a *dark* surface. The token name was describing its appearance in one specific theme, not the role it played in the interface, so nothing about the name could be trusted once more than one theme existed.

The fix was a full rename to role-based, theme-independent names:

| Appearance-based (old) | Role-based (new) | Why |
|---|---|---|
| `surface-light` | `surface-subtle` | Describes visual weight, not a color — stays meaningful in any theme |
| `surface-dark` | `surface-strong` | Same principle |
| `content-dark` | `content-secondary` | Communicates hierarchy, not color |
| `content-light` | `content-disabled` | Names the actual state it represented, which "light" obscured entirely |

The underlying principle: **token names should describe intent, not value.** The value is free to change per brand or theme; the name shouldn't have to. This is also what makes adding a new brand possible without inventing a parallel token set — the same semantic names simply resolve to different values.

## Repo structure

```
design-tokens-pipeline/
├── tokens/                 → Figma export goes here
│   ├── manifest.json
│   ├── Primitives.Value.tokens.json
│   ├── Semantic Brand 1.Light mode.tokens.json
│   ├── Components.Brand 1.tokens.json
│   └── ...
├── scripts/
│   └── build-tokens.ts     → reads manifest.json, resolves references, writes CSS
├── dist/                   → generated output, one CSS file per brand/mode
├── src/components/
│   └── Button.tsx           → example component consuming the tokens
├── package.json
└── tsconfig.json
```

## Running it

```bash
npm install
npm run build:tokens
```

This reads `tokens/manifest.json`, discovers every brand/mode combination, merges Primitives → Semantic → Components for each one, resolves all `{references}`, and writes one CSS file per combination to `/dist` — e.g. `tokens.brand-1.light-mode.css`.

Each file is scoped with a data-attribute selector:

```css
[data-brand="brand-1"][data-mode="light-mode"] {
  --button-accent-outlined-content-default: #4f3894;
  /* ...every resolved token for this brand/mode */
}
```

A page can switch brand or theme live by setting two attributes on `<html>`:

```html
<html data-brand="brand-1" data-mode="dark-mode">
```

## Why this structure

Most token-to-CSS scripts assume one brand, one theme. This one assumes several — because that's what an enterprise system, serving multiple products under different visual identities, actually needs from day one. Designing for that case from the start avoids the more painful rewrite that appearance-based naming (above) eventually forced.

---

**Related:** [Case study — leading this design system →]([../enterprise-design-system-case-study](https://github.com/nd-lxndr/Enterprise-Design-System-Leadership-Case-Study))
