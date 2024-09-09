var VERSION = "0.0.7";
var showVersionChanges = false;

var sessions;
var activeSession;
var backupData;
var refreshSettings;
var showProfileNumber;
var showProfileChooser;
var integrateETC;
var isInstalledETC;
var activateShortcuts;
var justUpdated;
var firstRun;
var installDate;

var editThisCookieID = "fngmhnnpilhplaeedifhccceomclgfbg";
var swapMyCookiesID = "dffhipnliikkblkhpjapbecpmoilcama";
var forgetMeID = "gekpdemielcmiiiackmeoppdgaggjgda";

var ls = {
    set: function(name, value) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [name]: value }, function() {
                resolve(value);
            });
        });
    },
    get: function(name) {
        return new Promise((resolve) => {
            chrome.storage.local.get([name], function(result) {
                resolve(result[name] || null);
            });
        });
    },
    remove: function(name) {
        return new Promise((resolve) => {
            chrome.storage.local.remove([name], function() {
                resolve();
            });
        });
    }
};

var updateData = async function() {
    sessions = await ls.get("data_sessions");
    
    if (!sessions || sessions.length === 0) {
        sessions = [
            {
                "name": "New Profile #0",
                "cookies": [],
                "created": new Date(),
                "lastUsed": undefined
            },
            {
                "name": "New Profile #1",
                "cookies": [],
                "created": new Date(),
                "lastUsed": undefined
            },
            {
                "name": "New Profile #2",
                "cookies": [],
                "created": new Date(),
                "lastUsed": undefined
            }
        ];
    }

    activeSession = await ls.get("data_activeSession");
    if (activeSession == null || activeSession >= sessions.length || activeSession < 0) {
        activeSession = 0;
    }
    sessions[activeSession].lastUsed = new Date();

    backupData = await ls.get("data_backupData");
    if (!backupData) {
        backupData = [];
    }

    refreshSettings = await ls.get("options_refreshSettings");
    if (refreshSettings == null) {
        refreshSettings = 2;
    }

    showProfileNumber = await ls.get("options_showProfileNumber");
    if (showProfileNumber == null) {
        showProfileNumber = true;
    }

    showProfileChooser = await ls.get("options_showProfileChooser");
    if (showProfileChooser == null) {
        showProfileChooser = false;
    }

    activateShortcuts = await ls.get("options_activateShortcuts");
    if (activateShortcuts == null) {
        activateShortcuts = false;
    }

    integrateETC = await ls.get("options_integrateETC");
    if (integrateETC == null) {
        integrateETC = true;
    }

    isInstalledETC = await ls.get("status_isInstalledETC");
    if (isInstalledETC == null) {
        isInstalledETC = false;
    }

    installDate = await ls.get("data_installDate");
    if (!installDate) {
        installDate = new Date();
        await ls.set("data_installDate", installDate);
    }

    var oldVersion = await ls.get("status_version");
    firstRun = await ls.get("status_firstRun") === null;

    justUpdated = (oldVersion !== VERSION);

    await ls.set("data_sessions", sessions);
    await ls.set("data_activeSession", activeSession);
    await ls.set("data_backupData", backupData);
    await ls.set("options_refreshSettings", refreshSettings);
    await ls.set("options_showProfileNumber", showProfileNumber);
    await ls.set("options_showProfileChooser", showProfileChooser);
    await ls.set("options_activateShortcuts", activateShortcuts);
    await ls.set("options_integrateETC", integrateETC);
    await ls.set("status_version", VERSION);
    await ls.set("status_firstRun", false);
};
