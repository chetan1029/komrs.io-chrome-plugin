var appTabId = null

init()

function init(){
    chrome.browserAction.onClicked.addListener(openApp)
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
