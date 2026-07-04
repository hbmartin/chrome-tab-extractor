  1. Action verbs, not just "move to new window" — let the keyword take a verb: ex group foo, ex close foo, ex bookmark foo, ex copy foo (URLs to clipboard), ex reload foo, ex mute foo. The current
  single-action design wastes the omnibox's expressiveness.
  2. Tab Groups support — for many users, a colored tab group is lighter-weight than a whole new window. Could be the default action, with new-window as an opt-in verb.
  3. Live tab list in suggestions — instead of a single "N matching tabs" line, populate suggest() with up to ~6 actual matching tabs (title + URL). Selecting one would jump to that tab; pressing
  enter on the input still does the bulk move. This makes the extension useful even for "find" alone.
  4. Search operators — domain:github.com, title:invoice, url:, -exclude, /regex/, and quoted phrases. Today everything is a single substring over title+URL.
  5. Scope toggle — currentwindow vs allwindows. Right now it always scans every normal window, which surprises people with multiple monitors/profiles.
  6. ex dupes — find tabs with the same URL (or same origin+path). One of the most common reasons people install tab extensions.
  7. Undo — remember the source window for each moved tab so ex undo puts them back. Cheap, very satisfying.

  Configurability

  8. Options page — configurable keyword (currently hard-coded ex), default action, case sensitivity, max-suggestions, scope default.
  9. Keyboard shortcut — add a commands entry so users can bind Cmd+Shift+E to focus the omnibox prefilled with ex . Avoids the "type ex, space, query" dance.
  10. i18n — move the two hard-coded English strings to _locales/en/messages.json so the extension can be translated.

  Code quality / correctness

  11. Race in window creation (TabExtractor.js:50) — chrome.tabs.remove(newWindow.tabs[…]) is fired without waiting for chrome.tabs.move's callback. With a slow move it can target a tab that's
  already been replaced. Safer: await move, then remove the placeholder tab returned in windows.create's tabs array.
  12. Pinned-tab handling — the current "move then re-pin" works, but pinned tabs in the source window get implicitly unpinned mid-move. Consider an option to "skip pinned" (most users don't want
  pinned tabs ripped out of their main window).
  13. Modernize to Promise-based MV3 APIs — chrome.tabs.query/move/windows.create all return Promises now; the nested-callback style in TabExtractor.js is harder to reason about and is what caused
  #11.
  14. Empty-input UX — when the user types ex and nothing else, show a one-line cheatsheet in suggest() ("Type to filter open tabs. Verbs: group, close, copy…") instead of returning silently.

  Minor

  15. README typo: "winder" → "window" (README.md: description in manifest.json line 4 has it too).
  16. Audible/pinned indicators (🔊 / 📌) in the suggestion list once #3 is in.
  17. Firefox port — Manifest V3 + browser.* polyfill would make this trivially cross-browser.
