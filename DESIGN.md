# SynergeLab design

## Direction

A calm, compact workspace for a small Korean team. The latest request changes the sidebar layout into a website with a full-width header. Preserve the blue brand, compact cards, three neutral columns and warm yellow in-progress emphasis. No enterprise dashboard or decorative imagery. Member initials replace stock photographs intentionally.

## Tokens

Runtime source: src/styles.css :root. Brand #1451b8, ink #263448, muted #626f80, canvas #ffffff, sidebar #f5f6f8, column #f2f4f6, focus column #fff1ae. System sans-serif with Korean fallbacks; headings 26px, card titles 13–14px, body 11–12px, utility 9–12px. The wordmark uses the same system sans-serif, with a slightly tighter weight and tracking. Spacing 4/8/12/16/24/32. Card radius 6px; subtle border and shadow.

## Layout

Full-width white header with a 3px blue top border: brand at left, team/personal/memo navigation in the middle, help/settings/profile at right. Header and main share a centered 1440px container with 48px desktop side padding. Breadcrumbs and live save state sit beneath the header. The board retains its three columns and compact card layout. At 760px and below, navigation moves to a second header row; the 600px horizontal-board breakpoint is unchanged. Native modal dialogs remain the editor owner.

## Behavior

See UX-CONTRACT.md. All icons use Phosphor. No remote images/fonts needed. Focus, hover, active, reduced-motion and global scrollbars are owned by styles.css. Sample tasks clearly labeled. Cloudflare-backed shared boards. The header owns workspace navigation and utilities; share/create remain beside the board title. Members share a capability link.

## Compact cards

Cards use a three-row grid: label/priority alongside ID/assignee, title, then a one-line description preview. Vertical padding is 8px at all viewport sizes. Full description remains in the editor and the preview tooltip. Long titles wrap naturally; there is no fixed height or text clipping on titles. Standard cards target roughly half the former height.
