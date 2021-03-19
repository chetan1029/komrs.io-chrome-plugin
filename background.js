init()

function init(){
    chrome.browserAction.onClicked.addListener(openApp)
}

async function openApp(){

    const url = chrome.runtime.getURL("index.html")
    const appTab = await getAppTab(url)

    if (!appTab)
        return chrome.tabs.create({ url })
    
    chrome.windows.update(appTab.windowId, { focused: true })
    chrome.tabs.update(appTab.id, { active: true })
        
}

function getAppTab(url){
    return new Promise(resolve => {
        chrome.tabs.query({ url }, tabs => { resolve(tabs[0]) })
    })
}