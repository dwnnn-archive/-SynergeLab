# SynergeLab design

## Direction

A calm, compact workspace for a small Korean team. The supplied screenshot is the visual authority: blue utility rail, pale sidebar, three neutral columns, and one warm yellow in-progress column. No enterprise dashboard or decorative imagery. Member initials replace stock photographs intentionally.

## Tokens

Runtime source: src/styles.css :root. Brand #1451b8, ink #263448, muted #626f80, canvas #ffffff, sidebar #f5f6f8, column #f2f4f6, focus column #fff1ae. System sans-serif with Korean fallbacks; headings 26px, card titles 13–14px, body 11–12px, utility 9–12px. The wordmark uses the same system sans-serif, with a slightly tighter weight and tracking. Spacing 4/8/12/16/24/32. Card radius 6px; subtle border and shadow.

## Layout

56px blue rail + 214px sidebar + fluid main. Content header, board/list tabs, search/filter toolbar, three equal-width columns. In-progress yellow is the sole visual signature. At 1100px sidebar narrows; below 800px it hides, main rail becomes a compact header, board scrolls horizontally with visible scrollbar. Forms use native modal dialog.

## Behavior

See UX-CONTRACT.md. All icons use Phosphor. No remote images/fonts needed. Focus, hover, active, reduced-motion and global scrollbars are owned by styles.css. Sample tasks clearly labeled. Cloudflare-backed shared boards. The existing UI is preserved; the header adds a share action and live/server-save status. Members share a capability link.

## Compact cards

Cards use a three-row grid: label/priority alongside ID/assignee, title, then a one-line description preview. Vertical padding is 8px at all viewport sizes. Full description remains in the editor and the preview tooltip. Long titles wrap naturally; there is no fixed height or text clipping on titles. Standard cards target roughly half the former height.
