chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "downloadProfileCorpusFile") {
    return;
  }

  downloadProfileCorpusFile(message)
    .then((downloadId) => sendResponse({ ok: true, downloadId }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || "Download failed." }));

  return true;
});

async function downloadProfileCorpusFile(message) {
  const fileName = sanitizeFileName(message?.fileName || "profile.txt");
  const fileText = String(message?.fileText || "");

  if (!fileText.trim()) {
    throw new Error("No corpus content to download.");
  }

  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(fileText)}`;
  return chrome.downloads.download({
    url: dataUrl,
    filename: fileName,
    conflictAction: "overwrite",
    saveAs: true
  });
}

function sanitizeFileName(name) {
  return String(name || "profile.txt")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^\.+/, "")
    .slice(0, 64) || "profile.txt";
}
