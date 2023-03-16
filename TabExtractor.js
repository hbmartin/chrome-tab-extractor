(function() {
  const queryInfo = { windowType: "normal" };

  const getMatchingTabs = function(text, callback) {
    chrome.tabs.query(queryInfo, function(tabs) {
      const keywords = text.trim().toLowerCase().split(" ");
      if (keywords[0] === "") {
        return callback([]);
      }
      const matchingTabs = tabs.filter(tab => {
        return keywords.some(keyword => {
          return tab.url.toLowerCase().includes(keyword) || tab.title.toLowerCase().includes(keyword);
        });
      });
      callback(matchingTabs);
    });
  };

  const getPinnedTabIDs = function(tabs) {
    return tabs.filter(t => t.pinned).map(t => t.id);
  }

  chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
    getMatchingTabs(text, function(matchingTabs) {
      const suggestionText = (matchingTabs.length < 1)
        ? "0 matching tabs. Try a different search or press esc to cancel."
        : matchingTabs.length + " matching tabs. Press enter to move them to a new window.";
      suggest([{ content: " ", description: suggestionText }]);
    });
  });

  chrome.omnibox.onInputEntered.addListener(function(text) {
    getMatchingTabs(text, function(matchingTabs) {
      if (matchingTabs.length > 0) {
        chrome.windows.create({ type: "normal" }, function(win) {
          const newWindow = win;
          const pinnedTabIDs = getPinnedTabIDs(matchingTabs)

          chrome.tabs.move(matchingTabs.map(t => t.id), { windowId: newWindow.id, index: -1 }, function() {
            pinnedTabIDs.forEach(function(id) {
              chrome.tabs.update(id, { pinned: true });
            });
          });
          chrome.tabs.remove(newWindow.tabs[newWindow.tabs.length - 1].id);
        });
      }
    });
  });
})();
