const launchButton = document.getElementById("launchButton");
const statusElement = document.getElementById("status");

initializePopup();

launchButton.addEventListener("click", async () => {
  setStatus("Opening floating analyzer on the current page...");
  launchButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url) {
      throw new Error("No active tab found.");
    }

    if (!isSupportedUrl(tab.url)) {
      throw new Error("Open an Indeed or LinkedIn job page first.");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"]
    });

    setStatus("Floating analyzer opened on this page.");
    window.setTimeout(() => window.close(), 250);
  } catch (error) {
    setStatus(error.message || "Unable to open the floating analyzer.", true);
    launchButton.disabled = false;
  }
});

async function initializePopup() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      setStatus("Open an Indeed or LinkedIn job page to launch the analyzer.");
      launchButton.disabled = true;
      return;
    }

    if (!isSupportedUrl(tab.url)) {
      setStatus("This launcher currently supports Indeed and LinkedIn job pages only.");
      launchButton.disabled = true;
      return;
    }

    const hostname = new URL(tab.url).hostname.replace(/^www\./, "");
    setStatus(`Ready to open the floating analyzer on ${hostname}.`);
  } catch (error) {
    setStatus(error.message || "Unable to inspect the active tab.", true);
    launchButton.disabled = true;
  }
}

function isSupportedUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com") ||
      hostname === "indeed.com" ||
      hostname.endsWith(".indeed.com")
    );
  } catch (_error) {
    return false;
  }
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b91c1c" : "#1f2933";
}
