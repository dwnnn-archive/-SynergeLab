# SynergeLab design

## Direction

A calm, compact workspace for a small Korean team. The supplied screenshot is the visual authority: blue utility rail, pale sidebar, neutral to-do, warm yellow in-progress, and pale green completed columns. No enterprise dashboard or decorative imagery. Member initials replace stock photographs intentionally.

## Tokens

Runtime source: src/styles.css :root. Brand #1451b8, ink #263448, muted #626f80, canvas #ffffff, sidebar #f5f6f8, column #f2f4f6, focus column #fff1ae, completed column #edf5e6. System sans-serif with Korean fallbacks; headings 26px, card titles 13–14px, body 11–12px, utility 9–12px. The wordmark uses the same system sans-serif, with a slightly tighter weight and tracking. Spacing 4/8/12/16/24/32. Card radius 6px; subtle border and shadow.

## Layout

58px blue rail + 220px sidebar + fluid main. The introductory heading and breadcrumb are removed. A single control row places board/list tabs and compact creation/options actions on the left; labels, member filters, and card search align to the far right in that order. Sharing remains in board options. Each of the three columns fills the remaining viewport height, with a fixed heading and add button around an independently scrolling card area. Save/connection status and completion progress sit in a compact bottom footer. Below 1150px the sidebar narrows; below 850px it hides. Below 600px the rail becomes a compact top bar, filters occupy a second row, and columns scroll horizontally while their cards retain vertical scrolling. Forms use native modal dialog.

## Behavior

See UX-CONTRACT.md. All icons use Phosphor. No remote images/fonts needed. Focus, hover, active, reduced-motion and global scrollbars are owned by styles.css. Cloudflare-backed shared boards use sample tasks only for initial creation. Board options own sharing; the footer owns live/server-save status. Authenticated team members share a board link.

## Compact cards

Cards use a three-row grid: label/priority alongside ID/assignee, title, then a one-line description preview. Vertical padding is 8px at all viewport sizes. Full description remains in the editor and the preview tooltip. Long titles wrap naturally; there is no fixed height or text clipping on titles. Standard cards target roughly half the former height.

## Card creation and drop position

New cards always go first in their selected column; the creation dialog has no position selector. The existing-card editor retains position selection for keyboard/touch reordering. After the server confirms insertion, the new card fades in over 220ms and existing cards move down with a brief opacity dip over 280ms. Motion uses measured card slots and is skipped for reduced-motion preferences, initial loading and filter changes. A locally created card scrolls its column to the top. Priority cards use a restrained amber left border and filled flag badge without increasing their compact height.

During a card drag, a 3px green line (`--drop-marker: #279566`) with small round ends marks the insertion boundary. It is an absolute overlay in the existing card gap, so showing it never pushes cards around. It follows the pointer above/below each card midpoint and supports the beginning, middle, end and empty columns. The editor's native “카드 위치” select provides the same ordering without dragging.

## Password entry and profile

The login screen uses a static board-shaped background with a 20px blur and 0.55 opacity. The real board is never rendered before server authentication. A centered white panel (390px maximum width) contains the blue SynergeLab mark, one password input and one primary action. Invalid passwords clear the input and show the inline Korean message with reserved vertical space. Desktop and mobile retain the same form hierarchy.

The large rail avatar belongs to the signed-in account. It shows a circular uploaded photo or the first character of the name. Profile settings reuse the existing native dialog, buttons and error styles; uploaded photos are square-cropped, and the rest of the compact board layout remains unchanged.

## Column labels and current members

The uppercase column labels (TO DO / IN PROGRESS / DONE) use 10.67px type, increased by approximately 2pt from 8px. Column actions and compact card sizes stay unchanged. Member controls list 봄, 대원 and 세현; retired member names are not rendered. 세현 has no password and cannot sign in yet.

## Dialog scrolling

Card, memo and other dialogs use the native browser scroll container with a flat translucent backdrop (#182b4660). Do not add backdrop-filter to this shared overlay: repeated local Chromium traces showed the full-viewport blur increased frame intervals during dialog scrolling. The static login preview retains its separate blur effect.
