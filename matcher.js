/**
 * Pure tab-matching logic, kept free of extension APIs so it can be unit
 * tested in Node. Loaded into the background context via `importScripts`
 * (Chrome service worker) or the `background.scripts` array (Firefox).
 */

/**
 * A minimal shape of the tabs.Tab objects this module cares about.
 * `url` and `title` can be missing on some tab states, so both are optional.
 * @typedef {Object} TabLike
 * @property {number} [id]
 * @property {string} [url]
 * @property {string} [title]
 * @property {boolean} [pinned]
 */

/**
 * A parsed omnibox query.
 * @typedef {Object} Query
 * @property {string} phrase - Lowercased phrase that tabs must contain.
 * @property {string[]} excludes - Lowercased terms that tabs must not contain.
 */

/**
 * Parse omnibox text into an include phrase and exclusion terms.
 * Whitespace-separated tokens prefixed with "-" become exclusions; the
 * remaining tokens are kept in order as a single phrase, so multi-word
 * searches still match as one substring.
 * @param {string} text
 * @returns {Query}
 */
function parseQuery(text) {
  const excludes = [];
  const phraseTokens = [];
  for (const token of text.trim().split(/\s+/)) {
    if (token.length > 1 && token.startsWith("-")) {
      excludes.push(token.slice(1).toLowerCase());
    } else if (token !== "") {
      phraseTokens.push(token);
    }
  }
  return { phrase: phraseTokens.join(" ").toLowerCase(), excludes };
}

/**
 * Whether a tab's URL or title contains the given lowercased term.
 * @param {TabLike} tab
 * @param {string} term
 * @returns {boolean}
 */
function tabContains(tab, term) {
  return (
    (tab.url ?? "").toLowerCase().includes(term) ||
    (tab.title ?? "").toLowerCase().includes(term)
  );
}

/**
 * Filter tabs against omnibox text. A tab matches when it contains the
 * include phrase (if any) and none of the exclusion terms. Empty text
 * matches nothing; exclusion-only text matches every non-excluded tab.
 * @param {TabLike[]} tabs
 * @param {string} text
 * @returns {TabLike[]}
 */
function filterTabs(tabs, text) {
  const { phrase, excludes } = parseQuery(text);
  if (phrase === "" && excludes.length === 0) {
    return [];
  }
  return tabs.filter(
    (tab) =>
      (phrase === "" || tabContains(tab, phrase)) &&
      !excludes.some((term) => tabContains(tab, term)),
  );
}

/**
 * Extract the hostname from a URL, or null when the URL is missing,
 * unparseable, or has no hostname (e.g. about:blank).
 * @param {string} [url]
 * @returns {string | null}
 */
function hostnameOf(url) {
  if (!url) {
    return null;
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname === "" ? null : hostname;
  } catch {
    return null;
  }
}

/**
 * All tabs whose URL has exactly the given hostname.
 * @param {TabLike[]} tabs
 * @param {string} hostname
 * @returns {TabLike[]}
 */
function tabsMatchingHostname(tabs, hostname) {
  return tabs.filter((tab) => hostnameOf(tab.url) === hostname);
}

// Node (tests) sees a CommonJS module; browser contexts use the globals.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseQuery,
    tabContains,
    filterTabs,
    hostnameOf,
    tabsMatchingHostname,
  };
}
