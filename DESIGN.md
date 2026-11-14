# SynergeLab design

## Direction

A calm, compact workspace for a small Korean team. The supplied screenshot is the visual authority: blue utility rail, pale sidebar, three neutral columns, and one warm yellow in-progress column. No enterprise dashboard or decorative imagery. Member initials replace stock photographs intentionally.

## Tokens

Runtime source: src/styles.css :root. Brand #1451b8, ink #263448, muted #626f80, canvas #ffffff, sidebar #f5f6f8, column #f2f4f6, focus column #fff1ae. System sans-serif with Korean fallbacks; headings 26px, card titles 13–14px, body 11–12px, utility 9–12px. The wordmark uses the same system sans-serif, with a slightly tighter weight and tracking. Spacing 4/8/12/16/24/32. Card radius 6px; subtle border and shadow.

## Layout

56px blue rail + 214px sidebar + fluid main. Content header, board/list tabs, search/filter toolbar, three equal-width columns. In-progress yellow is the sole visual signature. At 1100px sidebar narrows; below 800px it hides, main rail becomes a compact header, board scrolls horizontally with visible scrollbar. Forms use native modal dialog.

## Behavior

See UX-CONTRACT.md. All icons use Phosphor. No remote images/fonts needed. Focus, hover, active, reduced-motion and global scrollbars are owned by styles.css. Sample tasks clearly labeled. Cloudflare-backed shared boards. The existing UI is preserved; the header adds a share action and live/server-save status. Authenticated team members share a board link.

## Compact cards

Cards use a three-row grid: label/priority alongside ID/assignee, title, then a one-line description preview. Vertical padding is 8px at all viewport sizes. Full description remains in the editor and the preview tooltip. Long titles wrap naturally; there is no fixed height or text clipping on titles. Standard cards target roughly half the former height.

## Compact heading and drop position

The breadcrumb bar is 36px high. Main top padding is 10–14px, heading bottom spacing is 8–10px, and board/list tabs are 30px high. These reduce the tall introductory region while preserving text sizes and the sidebar layout. Card density stays unchanged.

During a card drag, a 3px green line (`--drop-marker: #279566`) with small round ends marks the insertion boundary. It is an absolute overlay in the existing card gap, so showing it never pushes cards around. It follows the pointer above/below each card midpoint and supports the beginning, middle, end and empty columns. The editor's native “카드 위치” select provides the same ordering without dragging.

## Password entry and profile

The login screen uses a static board-shaped background with a 20px blur and 0.55 opacity. The real board is never rendered before server authentication. A centered white panel (390px maximum width) contains the blue SynergeLab mark, one password input and one primary action. Invalid passwords clear the input and show the inline Korean message with reserved vertical space. Desktop and mobile retain the same form hierarchy.

The large rail avatar belongs to the signed-in account. It shows a circular uploaded photo or the first character of the name. Profile settings reuse the existing native dialog, buttons and error styles; uploaded photos are square-cropped, and the rest of the compact board layout remains unchanged.

## Column labels and current members

The uppercase column labels (TO DO / IN PROGRESS / DONE) use 10.67px type, increased by approximately 2pt from 8px. Column actions and compact card sizes stay unchanged. Member controls list 봄, 대원 and 세현; retired member names are not rendered. 세현 has no password and cannot sign in yet.
