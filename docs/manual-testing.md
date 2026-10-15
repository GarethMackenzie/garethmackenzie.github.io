# Real-device and screen-reader checks

Automated checks (axe, Lighthouse, keyboard scripts, Chromium, Firefox and WebKit engines in CI) cannot replace these. They have **not been run**. Give this sheet to a tester; record device, OS, browser and version, then Pass / Fail with a note.

## Devices and browsers (visual and touch)

| # | Environment | Pages to open |
|---|---|---|
| 1 | iPhone Safari (current iOS) | Home, BUILT, Writing, one essay, Media, Contact |
| 2 | iPad Safari, portrait and landscape | Home, BUILT |
| 3 | Android Chrome | Home, BUILT, Contact |
| 4 | macOS Safari | Home, BUILT, one essay |
| 5 | Desktop Firefox | Home, BUILT, one essay |
| 6 | Desktop Edge | Home, Contact |

For each: [ ] fonts render as Newsreader and Instrument Sans, not a fallback; [ ] the author name and headlines do not jump when the page loads; [ ] no sideways scrolling; [ ] the BUILT cover overlaps the portrait without covering the name; [ ] the menu opens, closes and every link works; [ ] tap targets feel easy to hit; [ ] arrows (→ ↗ ←) look consistent; [ ] sharing the homepage link in iMessage, LinkedIn or Slack shows the author-led card; sharing /built/ shows the book card.

## Screen readers

| Reader | Browser |
|---|---|
| VoiceOver | macOS Safari |
| VoiceOver | iPhone Safari |
| NVDA | Windows Firefox or Chrome |
| TalkBack (if available) | Android Chrome |

Tasks, on Home, BUILT, Media, Contact and one essay:
1. [ ] Use the skip link; focus lands on the main content.
2. [ ] Navigate by headings: one `h1` per page, a sensible order, no repeated headings.
3. [ ] Navigate by landmarks: header, main navigation, main, footer.
4. [ ] The wordmark announces "Gareth Mackenzie, home"; the "Enquire" links on Media each announce who they are for.
5. [ ] Links that open a new tab say so.
6. [ ] The decorative section numbers ("01") are not read out.
7. [ ] Open and close the FAQ items (BUILT) with Enter and Space; state is announced.
8. [ ] Open the menu on a narrow screen; it announces expanded and collapsed; Escape closes it.
9. [ ] Contact form: every field announces its label; a missing required field is explained; the success message is announced after sending.
10. [ ] The cover and portrait images announce sensible alternative text or are skipped when decorative.

## Keyboard only (any desktop browser)

- [ ] Tab through the whole of Home and Contact: visible focus on every stop, logical order, no keyboard trap.
- [ ] Reduce motion in the operating system: the page loads without movement.
- [ ] Zoom to 200%: nothing is clipped or overlapping.

## Report back

Send failures with a screenshot or recording, the exact page, the device and the reader or browser version.
