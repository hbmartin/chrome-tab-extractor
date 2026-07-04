/**
 * Background script: wires the omnibox and context menu to the matching
 * logic in matcher.js and moves matching tabs to a new window.
 */

// Firefox exposes the promise-based `browser` namespace; Chrome MV3's
// `chrome` namespace returns promises when no callback is passed.
const api = globalThis.browser ?? globalThis.chrome;

// Chrome runs this file as a service worker, where matcher.js must be
// pulled in explicitly. Firefox loads both files via `background.scripts`.
if (typeof importScripts === "function") {
  importScripts("matcher.js");
}

const DOMAIN_MENU_ID = "extract-domain";

const isThenable = (value) =>
  value !== null &&
  (typeof value === "object" || typeof value === "function") &&
  typeof value.then === "function";

const callWithOptionalCallback = (operation) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const callback = () => {
      const message = api.runtime.lastError?.message;
      settle(message ? new Error(message) : null);
    };

    try {
      const result = operation(callback);
      if (isThenable(result)) {
        result.then(() => settle(null), settle);
      }
    } catch (error) {
      settle(error);
    }
  });

const removeAllContextMenus = () => {
  if (api === globalThis.browser) {
    return api.contextMenus.removeAll();
  }
  return callWithOptionalCallback((callback) =>
    api.contextMenus.removeAll(callback),
  );
};

/**
 * Query every tab in normal browser windows.
 * @returns {Promise<TabLike[]>}
 */
const queryTabs = () => api.tabs.query({ windowType: "normal" });

/**
 * Move the given tabs into a new window, preserving their pinned state
 * and relative order. The first tab seeds the new window directly, so no
 * throwaway blank tab is ever created.
 * @param {TabLike[]} tabs
 * @returns {Promise<void>}
 */
const extractTabs = async (tabs) => {
  if (tabs.length === 0) {
    return;
  }
  const [first, ...rest] = tabs;
  const pinnedTabIds = tabs.filter((t) => t.pinned).map((t) => t.id);
  const newWindow = await api.windows.create({ tabId: first.id });
  if (rest.length > 0) {
    await api.tabs.move(
      rest.map((t) => t.id),
      { windowId: newWindow.id, index: -1 },
    );
  }
  // Moving a tab between windows clears its pinned state; restore it.
  await Promise.all(
    pinnedTabIds.map((id) => api.tabs.update(id, { pinned: true })),
  );
};

api.omnibox.onInputChanged.addListener(async (text) => {
  try {
    const matchingTabs = filterTabs(await queryTabs(), text);
    const description =
      matchingTabs.length < 1
        ? "0 matching tabs. Try a different search or press esc to cancel."
        : `${matchingTabs.length} matching tabs. Press enter to move them to a new window.`;
    api.omnibox.setDefaultSuggestion({ description });
  } catch (error) {
    console.error("Tab Extractor: failed to update suggestion", error);
  }
});

api.omnibox.onInputEntered.addListener(async (text) => {
  try {
    await extractTabs(filterTabs(await queryTabs(), text));
  } catch (error) {
    console.error("Tab Extractor: failed to extract tabs", error);
  }
});

api.runtime.onInstalled.addListener(async () => {
  try {
    // onInstalled also fires on update; clear any previously created menu
    // so re-creating it can't fail with a duplicate-id error.
    await removeAllContextMenus();
    api.contextMenus.create(
      {
        id: DOMAIN_MENU_ID,
        title: "Extract all tabs from this domain",
        contexts: ["page"],
      },
      () => {
        if (api.runtime.lastError) {
          console.error(
            "Tab Extractor: failed to create context menu",
            api.runtime.lastError.message,
          );
        }
      },
    );
  } catch (error) {
    console.error("Tab Extractor: failed to set up context menu", error);
  }
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== DOMAIN_MENU_ID) {
    return;
  }
  try {
    const hostname = hostnameOf(tab?.url);
    if (hostname === null) {
      return;
    }
    await extractTabs(tabsMatchingHostname(await queryTabs(), hostname));
  } catch (error) {
    console.error("Tab Extractor: failed to extract domain tabs", error);
  }
});
