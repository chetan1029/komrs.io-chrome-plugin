
try {
    importScripts("libs/jquery-3.1.0.min.js");
} catch (e) {
    console.log(e);
}

var appTabId = null

init()

function init(){
    chrome.action.onClicked.addListener(openApp)
    chrome.tabs.onRemoved.addListener(onTabRemoveListener)
}

async function openApp(){

    if (!appTabId)
        return chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }, tab => { appTabId = tab.id })

    const appTab = await getAppTab()

    chrome.windows.update(appTab.windowId, { focused: true })
    chrome.tabs.update(appTab.id, { active: true })

}

function getAppTab(){
    return new Promise(resolve => {
        chrome.tabs.get(appTabId, resolve)
    })
}

function onTabRemoveListener(tabId){

    if (tabId == appTabId)
        appTabId = null

}
