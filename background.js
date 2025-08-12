chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

// Listen for tab changes and notify side panel
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Notify side panel that the active tab changed
    chrome.runtime.sendMessage({
      action: 'tabChanged',
      tabId: activeInfo.tabId
    });
  } catch (error) {
    console.log('Side panel not open or available');
  }
});

// Listen for tab updates (navigation within same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    try {
      // Notify side panel that the page has loaded/changed
      chrome.runtime.sendMessage({
        action: 'pageUpdated',
        tabId: tabId,
        url: tab.url
      });
    } catch (error) {
      console.log('Side panel not open or available');
    }
  }
});
