var isLoggedIn

/* <Initialization> */

init()

async function init(){
    isLoggedIn = await getLoginState()
    manageNavigationBar()
    attachEventListeners()
}

function manageNavigationBar(){

    if (isLoggedIn)
        document.querySelector(".navbar .logged-in").classList.remove("hidden")
    else
        document.querySelector(".navbar .logged-out").classList.remove("hidden")

}

function attachEventListeners(){

    asinInput.addEventListener("focus", onInputFocus)
    keywordsTextarea.addEventListener("focus", onInputFocus)
    uidInput.addEventListener("focus", () => { uidInput.classList.remove("is-invalid") })
    passwordInput.addEventListener("focus", () => { passwordInput.classList.remove("is-invalid") })
    checkRanksButton.addEventListener("click", onCheckRanksButtonClick)
    tableSearchInput.addEventListener("input", onTableSearchInput)
    downloadCSVButton.addEventListener("click", downloadCSV)
    downloadExcelButton.addEventListener("click", downloadExcel)
    loginButton.addEventListener("click", onLoginButtonClick)
    logoutButton.addEventListener("click", logout)
    captchaContinueButton.addEventListener("click", onCaptchaContinueButtonClick)
    blockConfirmButton.addEventListener("click", onBlockConfirmButtonClick)

    for (const th of [ ...document.querySelectorAll("#resultsTable th") ]){
        th.addEventListener("click", onTheadClick)
    }

}

/* </Initialization> */

/* <Event listeners */

function onInputFocus(){

    if (!isLoggedIn)
        return $("#loginModal").modal("show")

    this.classList.remove("is-invalid")

}

async function onCheckRanksButtonClick(e){

    e.preventDefault()

    if (!isLoggedIn)
        return $("#loginModal").modal("show")

    const marketplace = marketplaceSelect.value
    const asin = asinInput.value
    const keywords = keywordsTextarea.value.trim().split('\n').filter(Boolean) /* filtering the possible empty values right away */
    const pageIndexArray = [...Array(21).keys()].slice(1) /* [ 1, 2, 3... 20 ] */

    if (!asin)
        asinInput.classList.add("is-invalid")

    if (!keywords.length){
        keywordsTextarea.nextElementSibling.textContent = "Keywords are required"
        keywordsTextarea.classList.add("is-invalid")
    }

    if (keywords.length > 200){
        keywordsTextarea.nextElementSibling.textContent = "Keywords are limited to 200 in one time"
        keywordsTextarea.classList.add("is-invalid")
    }

    if (!asin || !keywords.length || keywords.length > 200)
        return

    prepare()

    try {
        await checkRanks(marketplace, asin, keywords, pageIndexArray)
    } catch (err) {
        console.log("Error occured:")
        console.log(err)
    } finally {
        stopProgress()
    }

    this.disabled = false

}

function onTableSearchInput(){

    const searchTerm = this.value

    for (const row of resultsTable.querySelectorAll("tbody tr")){

        if (row.getAttribute("data-keyword").includes(searchTerm))
            row.style.display = "table-row"
        else
            row.style.display = "none"

    }

}

async function onLoginButtonClick(){

    this.disabled = true

    await login()

    this.disabled = false

}

function onCaptchaContinueButtonClick(){
    this.setAttribute("data-clicked", "true")
}

function onBlockConfirmButtonClick(){
    $("#blockModal").modal("hide")
}

function onTheadClick(){

    let col = this.getAttribute("data-col")
    let reverse = this.getAttribute("data-reverse") === "true"

    sortTable(resultsTable, col, !reverse)

    this.setAttribute("data-reverse", !reverse)

}

/* </Event listeners> */

/* <Main stuff> */

async function checkRanks(marketplace, asin, keywords, pageIndexArray){

    const itemsLength = keywords.length
    let processedItems = 0

    let resultItems = keywords.map(keyword => { return { keyword, indexed: false, rank: 0, position: 0, reachedLastPage: false }})

    /* Indexation part */
    while (true){

        resultItems = await Promise.all(resultItems.map(resultItem => getItemIndexationForKeyword(resultItem, marketplace, asin)))

        let block = resultItems.find(resultItem => resultItem.block)

        if (block){
            $("#blockModal").modal("show")
            throw "Temporary block."
        }

        let captcha = resultItems.find(resultItem => resultItem.captcha)

        if (captcha){
            $("#captchaModal").modal("show")
            await waitForCaptchaSubmission()
            resultItems = clearCaptchaItems(resultItems)
            continue
        }

        break

    }

    addToResultsTable(getNotIndexedItems(resultItems))
    processedItems += getNotIndexedItems(resultItems).length
    updateProgress(processedItems, itemsLength)
    resultItems = getIndexedItems(resultItems)

    await wait(500)

    /* Main part */
    for (let pageIndex = 1; pageIndex < 21; pageIndex++){

        resultItems = await Promise.all(resultItems.map(resultItem => getItemDataForKeywordPerPage(resultItem, marketplace, pageIndex, asin)))

        let block = resultItems.find(resultItem => resultItem.block)

        if (block){
            $("#blockModal").modal("show")
            throw "Temporary block."
        }

        let captcha = resultItems.find(resultItem => resultItem.captcha)

        if (captcha){
            $("#captchaModal").modal("show")
            await waitForCaptchaSubmission()
            resultItems = clearCaptchaItems(resultItems)
            pageIndex--
            continue
        }

        addToResultsTable(getFinishedItems(resultItems))
        processedItems += getFinishedItems(resultItems).length
        updateProgress(processedItems, itemsLength)
        resultItems = getNotFinishedItems(resultItems)

        await wait(500)

    }

}

function prepare(){
    checkRanksButton.disabled = true
    tableSearchInput.value = ""
    clearResultsTable()
    initiateProgress()
}

function getIndexedItems(resultItems){
    return resultItems.filter(resultItem => resultItem.indexed)
}

function getNotIndexedItems(resultItems){
    return resultItems.filter(resultItem => !resultItem.indexed)
}

function getFinishedItems(resultItems){
    return resultItems.filter(resultItem => resultItem.rank > 0 || resultItem.reachedLastPage)
}

function getNotFinishedItems(resultItems){
    return resultItems.filter(resultItem => resultItem.rank == 0 && !resultItem.reachedLastPage)
}

function clearCaptchaItems(resultItems){
    return resultItems.map(resultItem => {
        resultItem.captcha = false
        return resultItem
    })
}

/* </Main stuff> */

/* <Table management> */

function addToResultsTable(items){

    const resultsTableTBody = resultsTable.querySelector("tbody")

    for (const item of items){
        const row = `
            <tr data-keyword="${ item.keyword }">
                <td>${ item.keyword }</td>
                <td>${ item.indexed ? "Yes" : "No" }</td>
                <td>${ item.rank ? item.rank : "321+" }</td>
                <td data-position="${ item.position ? item.position : 21 }">${ item.position ? `Page ${ item.position }` : "Page 21+" }</td>
            </tr>
        `

        resultsTableTBody.insertAdjacentHTML("beforeend", row)
    }

}

function populateResultsTable(resultArray){

    const resultsTableTBody = resultsTable.querySelector("tbody")

    for (const resultItem of resultArray){

        const row = `
            <tr data-keyword="${ resultItem.keyword }">
                <td>${ resultItem.keyword }</td>
                <td>${ resultItem.rank ? "Yes" : "No" }</td>
                <td>${ resultItem.rank ? resultItem.rank : "321+" }</td>
                <td data-position="${ resultItem.position ? resultItem.position : 21 }">${ resultItem.position ? `Page ${ resultItem.position }` : "Page 21+" }</td>
            </tr>
        `

        resultsTableTBody.insertAdjacentHTML("beforeend", row)

    }

}

function clearResultsTable(){
    resultsTable.querySelector("tbody").innerHTML = ""
}

function sortTable(table, col, reverse) {

    let tb = table.tBodies[0]
    let tr = Array.prototype.slice.call(tb.rows, 0)
    let i

    reverse = -((+reverse) || -1)

    /* Text-based */
    if (col < 2){
        tr = tr.sort(function (a, b) {
            return reverse * (a.cells[col].textContent.trim().localeCompare(b.cells[col].textContent.trim()))
        })
    }

    /* Numeric-based */
    if (col == 2){
        tr = tr.sort(function (a, b) {
            return reverse * (+a.cells[col].textContent.trim().replace('+', '') - +b.cells[col].textContent.trim().replace('+', ''))
        })
    }

    /* Numeric-based */
    if (col == 3){
        tr = tr.sort(function (a, b) {
            return reverse * (+a.cells[col].getAttribute("data-position") - +b.cells[col].getAttribute("data-position"))
        })
    }

    for (i = 0; i < tr.length; ++i) tb.appendChild(tr[i])

}

/* </Table management> */

/* <Progress management> */

function initiateProgress(){
    progressContainer.querySelector(".progress-icon").classList.add("rotating")
    progressContainer.querySelector(".progress-fill").style.width = "0%"
    progressContainer.querySelector(".progress-text").textContent = "0%"
    progressContainer.style.opacity = "1"
}

function updateProgress(current, maximum){

    const percents = Math.floor(current / maximum * 100)

    progressContainer.querySelector(".progress-fill").style.width = `${ percents }%`
    progressContainer.querySelector(".progress-text").textContent = `${ percents }%`

}

function stopProgress(){
    progressContainer.querySelector(".progress-icon").classList.remove("rotating")
    // progressContainer.querySelector(".progress-fill").style.width = "100%"
    // progressContainer.querySelector(".progress-text").textContent = "100%"
}

/* </Progress management> */

/* <Scraping part> */

async function getPage(url){

    const response = await fetch(url)

    if (response.status == 503)
        return "block"

    const html = await response.text()
    const page = new DOMParser().parseFromString(html, "text/html")

    if (page.querySelector("#captchacharacters"))
        return "captcha"

    return page

}

function getItems(page){
    return page.querySelectorAll(`.s-main-slot.s-result-list.s-search-results.sg-row > div:not([data-asin=""], .AdHolder)`)
}

async function getItemIndexationForKeyword(resultItem, marketplace, asin){

    const url = `https://www.${ marketplace }/s?k=${ asin }%2B${ resultItem.keyword.split(' ').filter(Boolean).join('+') }`
    const page = await getPage(url)

    if (page == "block"){
        resultItem.block = true
        return resultItem
    }

    if (page == "captcha"){
        resultItem.captcha = true
        return resultItem
    }

    const items = getItems(page)
    const rank = [ ...items ].findIndex(item => item.getAttribute("data-asin") == asin) + 1

    if (rank)
        resultItem.indexed = true
    else
        resultItem.indexed = false

    return resultItem

}

async function getItemDataForKeywordPerPage(resultItem, marketplace, pageIndex, asin){

    const url = `https://www.${ marketplace }/s?k=${ resultItem.keyword.split(' ').filter(Boolean).join('+') }&page=${ pageIndex }`
    const page = await getPage(url)

    if (page == "block"){
        resultItem.block = true
        return resultItem
    }

    if (page == "captcha"){
        resultItem.captcha = true
        return resultItem
    }

    const items = getItems(page)
    const rank = [ ...items ].findIndex(item => item.getAttribute("data-asin") == asin) + 1

    if (rank){
        resultItem.rank = (pageIndex - 1) * 16 + rank
        resultItem.position = pageIndex
    }

    resultItem.reachedLastPage = items.length < 16

    return resultItem

}

/* </Scraping part> */

/* <Authentication part> */

async function login(){

    hideStatusMessage()

    const uid = uidInput.value
    const password = passwordInput.value
    const valid = uid.trim() && password.trim()

    if (!uid.trim())
        uidInput.classList.add("is-invalid")

    if (!password.trim())
        passwordInput.classList.add("is-invalid")

    if (!valid)
        return

    const options = {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        credentials: "omit",
        body: JSON.stringify({
            username: uid.includes('@') ? undefined : uid,
            email: uid.includes('@') ? uid : undefined,
            password
        })
    }

    try {

        const response = await fetch("https://api.thebatonline.com/login/", options)
        const json = await response.json()

        if (!response.ok && json.non_field_errors)
            return handleLoginFailure(json.non_field_errors[0])

        if (!response.ok)
            return handleLoginFailure("Couldn't login")

        handleLoginSuccess()

    } catch (err){
        handleLoginFailure("Couldn't login")
    }


}

async function logout(){
    handleLogoutSuccess()
}

function handleLoginFailure(text){
    loginStatusMessage.classList.add("failure")
    loginStatusMessage.textContent = text
}

async function handleLoginSuccess(){

    await setLoginState(true)

    loginStatusMessage.classList.add("success")
    loginStatusMessage.textContent = "Successfully logged in!"

    await wait(1337)
    location.reload()

}

async function handleLogoutSuccess(){
    await setLoginState(false)
    location.reload()
}

function hideStatusMessage(){
    loginStatusMessage.classList.remove("failure")
    loginStatusMessage.classList.remove("success")
    loginStatusMessage.textContent = ""
}

function getLoginState(){
    return new Promise(resolve => {
        chrome.storage.local.get("isLoggedIn", object => { resolve(object.isLoggedIn) })
    })
}

function setLoginState(isLoggedIn){
    return new Promise(resolve => {
        chrome.storage.local.set({ isLoggedIn }, resolve)
    })
}

/* </Authentication part> */

/* <Captcha/block management> */

function waitForCaptchaSubmission(){
    return new Promise(resolve => {

        $("#captchaModal").modal("show")
        captchaContinueButton.setAttribute("data-clicked", "false")

        check()

        function check(){

            let clicked = captchaContinueButton.getAttribute("data-clicked")

            if (clicked == "true"){
                $("#captchaModal").modal("hide")
                return resolve()
            }

            setTimeout(check, 100)

        }

    })
}

/* </Captcha/block management> */

/* <General utils> */

function wait(ms){
    return new Promise(resolve => { setTimeout(resolve, ms) })
}

function downloadCSV(e){

    if (!resultsTable.querySelector("tbody tr"))
        return e.preventDefault()

    return ExcellentExport.csv(this, "resultsTable")

}

function downloadExcel(e){

    if (!resultsTable.querySelector("tbody tr"))
        return e.preventDefault()

    return ExcellentExport.excel(this, "resultsTable", "Keywords")

}

/* </General utils> */
