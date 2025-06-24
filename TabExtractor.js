(() => {
  const queryInfo = { windowType: "normal" };

  const getMatchingTabs = (text, callback) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (text === "") {
        return callback([]);
      }
      const textLower = text.toLowerCase();
      const matchingTabs = tabs.filter((tab) => {
        return (
          tab.url.toLowerCase().includes(textLower) ||
          tab.title.toLowerCase().includes(textLower)
        );
      });
      callback(matchingTabs);
    });
  };

  const getPinnedTabIDs = (tabs) =>
    tabs.filter((t) => t.pinned).map((t) => t.id);

  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    getMatchingTabs(text, (matchingTabs) => {
      const suggestionText =
        matchingTabs.length < 1
          ? "0 matching tabs. Try a different search or press esc to cancel."
          : matchingTabs.length +
            " matching tabs. Press enter to move them to a new window.";
      suggest([{ content: " ", description: suggestionText }]);
    });
  });

  chrome.omnibox.onInputEntered.addListener((text) => {
    getMatchingTabs(text, (matchingTabs) => {
      if (matchingTabs.length > 0) {
        chrome.windows.create({ type: "normal" }, (win) => {
          const newWindow = win;
          const pinnedTabIDs = getPinnedTabIDs(matchingTabs);

          chrome.tabs.move(
            matchingTabs.map((t) => t.id),
            { windowId: newWindow.id, index: -1 },
            () => {
              pinnedTabIDs.forEach((id) => {
                chrome.tabs.update(id, { pinned: true });
              });
            },
          );
          chrome.tabs.remove(newWindow.tabs[newWindow.tabs.length - 1].id);
        });
      }
    });
  });
})();
