var original_updateData = updateData;

updateData = function() {
    var shortcuts = activateShortcuts;
    original_updateData();
    if (!shortcuts && activateShortcuts) {
        startInjection();
    }
    loadSettings();
};

function loadSettings() {
    var color, text;
    if (isInstalledETC && integrateETC) {
        color = [0, 224, 0, 255];
    } else {
        color = [255, 0, 0, 255];
    }

    if (showProfileNumber) {
        text = (parseInt(activeSession) + 1).toString();
    } else {
        text = "";
    }

    chrome.action.setBadgeBackgroundColor({
        color: color
    });

    chrome.action.setBadgeText({
        text: text
    });

    chrome.action.setTitle({
        title: sessions[activeSession].name
    });
}

function listenConnections(port) {
    console.assert(port.sender.id == editThisCookieID || port.sender.id == swapMyCookiesID || port.sender.id == forgetMeID);

    port.onMessage.addListener(function(request) {
        if (request.action != undefined) {
            if (request.action == "pause") {
                port.postMessage({ "pause": true });
            } else if (request.action == "resume") {
                port.postMessage({ "resume": true });
            } else {
                console.log("ACTION: " + request.action + ", IS UNKNOWN!");
            }
        } else {
            console.log("ACTION CANNOT BE UNDEFINED!");
        }
    });
}

function listenRequests(request, sender, sendResponse) {
    console.log("I received a message!");
    console.assert(sender.id == editThisCookieID || sender.id == swapMyCookiesID || sender.id == forgetMeID);

    if (request.action != undefined) {
        if (request.action == "ping") {
            console.log("I was pinged");
            sendResponse({});
        } else if (request.action == "switchProfile") {
            console.log("Gotta switch profile...");
            var index = activeSession;
            if (request.switchTo != undefined) {
                index = request.switchTo;
            } else if (request.step != undefined) {
                index = (index + request.step) % sessions.length;
                if (index < 0) index = sessions.length + index;
            } else {
                console.error("I have to switch but don't know how");
                return;
            }
            restoreSession(index, function() {
                updateTabs();
                sendResponse({ "switched": true });
            });
        } else if (request.action == "getProfiles") {
            var profiles = sessions.map(session => session.name);
            sendResponse({ "profiles": profiles, "activeSession": activeSession });
        } else {
            console.error("Unknown request:" + request.toString());
        }
    }
}

function checkETCinstalled() {
    isInstalledETC = false;
    ls.set("status_isInstalledETC", isInstalledETC);

    chrome.runtime.sendMessage(editThisCookieID, { "action": "ping" }, function(response) {
        if (chrome.runtime.lastError != undefined) {
            isInstalledETC = false;
        } else {
            isInstalledETC = true;
        }
        ls.set("status_isInstalledETC", isInstalledETC);
    });
}

function startInjection() {
    var injection = function(currentTab) {
        if (!activateShortcuts) return;
        if (currentTab.url.startsWith("https://chrome.google") ||
            currentTab.url.startsWith("http://chrome.google") ||
            currentTab.url.startsWith("chrome") ||
            currentTab.url.startsWith("about:") ||
            currentTab.url.length === 0) return;

        try {
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ["js/shortcuts_injected.js"]
            });
        } catch (e) {
            console.error(e);
        }
    };

    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(injection);
    });

    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        injection(tab);
    });

    chrome.tabs.onCreated.addListener(function(tab) {
        injection(tab);
    });
}

// Khởi chạy
loadSettings();

chrome.runtime.onConnect.addListener(function(port) {
    listenConnections(port);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    listenRequests(request, sender, sendResponse);
});

if (firstRun) {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
} else {
    if (showVersionChanges && justUpdated) {
        chrome.tabs.create({ url: chrome.runtime.getURL('changelog.html') });
    }
    if (showProfileChooser) {
        chrome.tabs.create({
            url: chrome.runtime.getURL('profileChooser.html'),
            active: true
        });
    }
}

if (activateShortcuts) startInjection();

chrome.windows.onCreated.addListener(function(window) {
    if (showProfileChooser && window.type === "normal") {
        chrome.windows.getAll({ populate: false }, function(windows) {
            var nNormalWindows = windows.filter(w => w.type === "normal").length;
            if (nNormalWindows === 1) {
                chrome.tabs.create({
                    windowId: window.id,
                    url: chrome.runtime.getURL('profileChooser.html'),
                    active: true
                });
            }
        });
    }
});

chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    if (request.action === 'create_profile') {
        var newSession = {
            name: request.name + " #" + sessions.length,
            cookies: [],
            created: new Date(),
            lastUsed: undefined
        };
        sessions.push(newSession);
        ls.set("data_sessions", sessions);
        sendResponse({ "create_profile": true, 'index': sessions.length - 1 });
    } else if (request.action === 'switch_profile') {
        restoreSession(request.index, function() {
            sendResponse({ "switch_profile": true });
        });
    } else {
        sendResponse({ "not_found": true });
    }
    return true;
});

importScripts('data.js');
importScripts('tools.js');
