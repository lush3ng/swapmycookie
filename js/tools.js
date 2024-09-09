async function restoreSession(index, callback) {
    if (index >= 0 && index < sessions.length) {
        let cookiesToRestore = sessions[index].cookies;
        let currentCookies = await chrome.cookies.getAll({});
        
        // Lưu phiên hiện tại
        sessions[activeSession].cookies = currentCookies;
        await ls.set("data_sessions", sessions);
        
        // Thay đổi phiên hiện tại
        activeSession = index;
        await ls.set("data_activeSession", activeSession);
        
        await switchProfile(cookiesToRestore, callback);
    } else {
        console.error("Index out of bounds!");
    }
}

function switchProfile(cookiesToRestore, callback, callbackParam) {
    var connectToID = (isInstalledETC && integrateETC) ? editThisCookieID : swapMyCookiesID;
    console.log("connectToID: " + connectToID + " | isInstalledETC: " + isInstalledETC + " | integrateETC: " + integrateETC);
    
    if (!isInstalledETC || !integrateETC) {
        chrome.cookies.getAll({}, function(cks) {
            console.log("Deleting...");
            deleteCookies(cks);
            if (cookiesToRestore) {
                console.log("Restoring...");
                restoreCookies(cookiesToRestore);
            }
            if (callback) {
                console.log("Calling callback...");
                callback(callbackParam);
            }
        });
    } else {
        var port = chrome.extension.connect(connectToID, { "name": "Swap My Cookies" });
        port.postMessage({ "action": "pause" });
        console.log("Sending message...");
        port.onMessage.addListener(function(response) {
            console.log("Processing response...");
            if (response.pause !== undefined) {
                if (response.pause) {
                    chrome.cookies.getAll({}, function(cks) {
                        console.log("Deleting...");
                        deleteCookies(cks);
                        if (cookiesToRestore) {
                            console.log("Restoring...");
                            restoreCookies(cookiesToRestore);
                        }
                        port.postMessage({ "action": "resume" });
                    });
                } else {
                    console.error("Error pausing");
                }
            } else if (response.resume !== undefined) {
                if (response.resume) {
                    if (callback) {
                        console.log("Calling callback...");
                        callback(callbackParam);
                    }
                } else {
                    console.error("Error resuming");
                }
            }
        });
    }
}

function deleteCookies(cks) {
    console.log("Deleting " + cks.length + " cookies...");
    for (var i = 0; i < cks.length; i++) {
        try {
            var curr = cks[i];
            var url = ((curr.secure) ? "https://" : "http://") + curr.domain + curr.path;
            deleteCookie(url, curr.name, curr.storeId);
        } catch (err) {
            console.error("Error caught deleting cookie:\n" + err);
        }
    }
}

function deleteCookie(url, name, storeId) {
    chrome.cookies.remove({
        "url": url,
        "name": name,
        "storeId": storeId
    });
}

function restoreCookies(cks) {
    for (var i = 0; i < cks.length; i++) {
        try {
            var current = cks[i];
            var newCookie = {};
            
            var prefix = current.secure ? "https://" : "http://";
            if (current.domain.charAt(0) == ".") {
                prefix += "www";
            }
            var cookie_url = prefix + current.domain + current.path;
            
            newCookie.url = cookie_url;
            newCookie.name = current.name;
            newCookie.storeId = current.storeId;
            newCookie.value = current.value;
            if (!current.hostOnly) newCookie.domain = current.domain;
            newCookie.path = current.path;
            newCookie.secure = current.secure;
            newCookie.httpOnly = current.httpOnly;
            if (!current.session) newCookie.expirationDate = current.expirationDate;
            chrome.cookies.set(newCookie);
        } catch (err) {
            console.error("Error caught restoring cookie:\n" + err);
        }
    }
}

var reloadFunction = function(tab) {
    if (tab.url.startsWith("https://chrome.google") || tab.url.startsWith("http://chrome.google") || tab.url.startsWith("chrome://")) {
        if (tab.url.includes("profileChooser.html")) return;
        chrome.tabs.update(tab.id, { "url": tab.url, "selected": tab.selected });
    } else {
        chrome.tabs.executeScript(tab.id, { code: 'window.location.reload(true)' });
    }
};

function updateTabs() {
    console.log("Updating Tabs...");
    triggerUpdateData();
    if (refreshSettings == 0) {
        return;
    } else if (refreshSettings == 1) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            reloadFunction(tabs[0]);
        });
    } else if (refreshSettings == 2) {
        chrome.windows.getCurrent(function(window) {
            forEveryTab(window, reloadFunction);
        });
    } else if (refreshSettings == 3) {
        forEveryTab(reloadFunction);
    } else {
        forEveryTab(updateData);
    }
}

function stringifyDateDifference(dateDifferenceObj) {
    if (!dateDifferenceObj.valid) return "Never";
    var years = dateDifferenceObj.years;
    var months = dateDifferenceObj.months;
    var days = dateDifferenceObj.days;
    var hours = dateDifferenceObj.hours;
    var minutes = dateDifferenceObj.minutes;
    var seconds = dateDifferenceObj.seconds;
    var differenceString = "";
    if (years) {
        differenceString = years + " year" + (years > 1 ? "s" : "") + " ";
    } else if (months) {
        differenceString = months + " month" + (months > 1 ? "s" : "") + " ";
    } else if (days) {
        differenceString = days + " day" + (days > 1 ? "s" : "") + " ";
    } else if (hours) {
        differenceString = hours + "h";
    } else if (minutes) {
        differenceString = minutes + "min";
    } else {
        differenceString = (seconds ? seconds : "1") + "sec";
    }
    return differenceString;
}

function forEveryTab(args1, args2) {
    var window = (args2 === undefined) ? null : args1;
    var callback = (args2 === undefined) ? args1 : args2;
    
    chrome.windows.getAll({ populate: true }, function(windows) {
        for (var i = 0; i < windows.length; i++) {
            var currentWindow = windows[i];
            if (window === null || window.id == currentWindow.id) {
                var tabs = currentWindow.tabs;
                for (var x = 0; x < tabs.length; x++) {
                    var currentTab = tabs[x];
                    callback(currentTab);
                }
                if (window !== null) break;
            }
        }
    });
}

var _gaq = _gaq || [];
function googleStats() {
    _gaq.push(['_setAccount', 'UA-18085343-3']);
    _gaq.push(['_trackPageview']);
    (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();
}
