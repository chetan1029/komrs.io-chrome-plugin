var isLoggedIn;
var amazonSeller;
var asin_curr = '';
var prod_id = '';

/* <Initialization> */

init();

async function init() {
  isLoggedIn = await getLoginState();
  marketPlaces();
  manageNavigationBar();
  attachEventListeners();
}

function manageNavigationBar() {
  if (isLoggedIn)
    document.querySelector(".navbar .logged-in").classList.remove("hidden");
  else document.querySelector(".navbar .logged-out").classList.remove("hidden");
}

function attachEventListeners() {
  marketplaceSelect.addEventListener("change", grabCompany);
  keywordsTextarea.addEventListener("focus", onInputFocus);
  uidInput.addEventListener("focus", () => {
    uidInput.classList.remove("is-invalid");
  });
  passwordInput.addEventListener("focus", () => {
    passwordInput.classList.remove("is-invalid");
  });
  checkRanksButton.addEventListener("click", onCheckRanksButtonClick);
  tableSearchInput.addEventListener("input", onTableSearchInput);
  downloadCSVButton.addEventListener("click", downloadCSV);
  downloadExcelButton.addEventListener("click", downloadExcel);
  loginButton.addEventListener("click", onLoginButtonClick);
  passwordInput.addEventListener("keypress", function (e) {
    if (e.key === 'Enter') {
      onLoginButtonClick();
    }
  });
  logoutButton.addEventListener("click", logout);
  captchaContinueButton.addEventListener("click", onCaptchaContinueButtonClick);
  blockConfirmButton.addEventListener("click", onBlockConfirmButtonClick);
  sessionConfirmButton.addEventListener("click", onSessionConfirmButtonClick);

  for (const th of [...document.querySelectorAll("#resultsTable th")]) {
    th.addEventListener("click", onTheadClick);
  }
}

/* </Initialization> */

/* <Event listeners */

function onInputFocus() {
  if (!isLoggedIn) return $("#loginModal").modal("show");

  this.classList.remove("is-invalid");
}

function amazonSeller(marketplace) {
  var marketPlace = marketplace;
  console.log(marketPlace);
  setTimeout(() => {

  for(let iii=2; iii <= 8; iii++){
    var militime = Date.now() - iii * 86400000;
    var ddate = pastDate(new Date(militime), marketPlace);
    console.log(ddate);
    fetch(
        `https://sellercentral.${marketPlace}/gp/site-metrics/load-report-JSON.html/ref=au_xx_cont_sitereport?sortColumn=&filterFromDate=${ddate}&filterToDate=${ddate}&fromDate=${ddate}&toDate=${ddate}&cols=&reportID=102%3ADetailSalesTrafficBySKU&sortIsAscending=1&currentPage=0&dateUnit=1&viewDateUnits=ALL&runDate=`
      )
        .then((rrs) => {
          return rrs.text();
        })
        .then((rrs2) => {
          var div = document.createElement("div");
          div.innerHTML = rrs2;
          var menu = div.querySelectorAll("#sc-top-nav");
          if (menu.length > 0) {
            var tb = div.querySelectorAll("#sc-content-container");
            if (tb.length > 0) {
              // console.log(tb);
              var parsed_data = JSON.parse(tb[0].textContent);
              var session_details = [];
              var militime = Date.now() - iii * 86400000;
              if (parsed_data.data.rows.length > 0) {
                for (let i = 0; i < parsed_data.data.rows.length; i++) {
                  var obj = {};
                  obj.sku = parsed_data.data.rows[i][3];
                  obj.sessions = parseInt(parsed_data.data.rows[i][4]);
                  obj.page_views = parseInt(parsed_data.data.rows[i][6]);
                  obj.date = currentDate(new Date(militime));
                  session_details.push(obj);
                }
              }
              console.log(JSON.stringify(session_details));
              if (session_details.length > 0) {
                chrome.storage.local.get(["token", "comp_id"], (a) => {
                  if (a.token !== undefined) {
                    var comp_id = "";
                    if (a.comp_id !== undefined) {
                      comp_id = a.comp_id;
                    } else {
                      comp_id = 14;
                    }
                    fetch(
                      `https://api.komrs.io/companies/${comp_id}/amazon-product-sessions/bulk_create/`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `JWT ${a.token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(session_details),
                      }
                    )
                      .then((res) => {
                        return res.json();
                      })
                      .then((res2) => {
                        console.log(res2);
                      });
                  }
                });
              }
            }
          } else {
            console.log("not logged in");
            $("#alertpop").show();
          }
        });

  }
  }, 3000);
}

function pastDate (date, marketPlace) {
  var d = date,
  month = "" + (date.getMonth() + 1),
  day = "" + date.getDate(),
  year = "" + date.getFullYear();

if (month.length < 2) {
  month = "0" + month;
}
if (day.length < 2) {
  day = "0" + day;
}
if (marketPlace == "Amazon.com" || marketPlace == "Amazon.ca"){
var new_date = month + "%2F" + day + "%2F" + year;
}else{
var new_date = day + "%2F" + month + "%2F" + year;
}
return new_date;
}

function formatState (state) {
  if (!state.id) { return state.text; }
  // console.log(state.element);
  if (state.text.length > 150){
    state.text = state.text.substring(0,150)+"...";
  }
  var $state = $(
   '<span class="dd_span"><img sytle="display: inline-block;" class="dd_img" src="'+state.element.getAttribute('thumbnail')+'" /> <p class="dd_text">' + state.text + ' <br > '+state.element.getAttribute('value')+'</p></span>'
  );
  return $state;
 }

 function formatState2 (state) {
  if (!state.id) { return state.text; }
  if (state.text.length > 150){
    state.text = state.text.substring(0,150)+"...";
  }
  var $state = $(
   '<span class="dd_span"><img sytle="display: inline-block;" class="dd_img" src="'+state.element.getAttribute('thumbnail')+'" /> <p class="dd_text">' + state.text + ' <br > '+state.element.getAttribute('value')+'</p></span>'
  );
  keywords(state.element)
  asin_curr = state.element.value;
  prod_id = state.element.getAttribute('data-id');
  return $state;
 }

function marketPlaces() {
  if (isLoggedIn) {
    chrome.storage.local.get(["token", "comp_id"], (a) => {
      if (a.token !== undefined) {
        var opts = {
          method: "GET",
          headers: {
            Authorization: `JWT ${a.token}`,
          },
        };

        var comp_id = "";
        if (a.comp_id !== undefined) {
          comp_id = a.comp_id;
          console.log('fetched from comp');
        } else {
          comp_id = 14;
        }
        console.log(comp_id);

        fetch(
          `https://api.komrs.io/companies/${comp_id}/amazon-marketplaces/?limit=100000000`,
          opts
        )
          .then((res) => {
            return res.json();
          })
          .then((res2) => {
            console.log(res2);
            if (res2.count !== undefined) {
              var list = "";
              var ddData = [];
              for (let i = 0; i < res2.results.length; i++) {
                if (i == 0) {
                  list += `<option value="${res2.results[i].id}" market="${res2.results[i].sales_channel_name}" status="${res2.results[i].status}">Select Marketplace</option>`;
                }
                if (res2.results[i].status == "active") {
                  list += `<option value="${res2.results[i].id}" market="${res2.results[i].sales_channel_name}" status="${res2.results[i].status}">${res2.results[i].sales_channel_name} (Connected)</option>`;
                } else {
                  list += `<option value="${res2.results[i].id}" market="${res2.results[i].sales_channel_name}" status="${res2.results[i].status}">${res2.results[i].sales_channel_name}</option>`;
                }
              }
              $("#marketplaceSelect").html(list);

              for (let i = 0; i < res2.results.length; i++) {
                if (res2.results[i].status == "active") {
                  setTimeout(() => {
                    amazonSeller(res2.results[i].sales_channel_name);
                  }, 1000);
                }
              }
            }
          });
      }
    });
  }
}

function grabCompany(e) {
  console.log(e.target.value);
  document.querySelector("#keywordsTextarea").value = '';
  if(document.querySelector('#marketplaceSelect > option:checked').getAttribute("status") == "active"){
  chrome.storage.local.get(["token", "comp_id"], (a) => {
    if (a.token !== undefined) {
      $("#loader").show();
      var opts = {
        method: "GET",
        headers: {
          Authorization: `JWT ${a.token}`,
        },
      };

      var comp_id = "";
      if (a.comp_id !== undefined) {
        comp_id = a.comp_id;
      } else {
        comp_id = 14;
      }

      var marketplace_id = $("#marketplaceSelect").val();
      console.log(marketplace_id);

      fetch(
        `https://api.komrs.io/companies/${comp_id}/keyword-tracking-products/?limit=100000000&status__name=Active&marketplace=${marketplace_id}`,
        opts
      )
        .then((res) => {
          $("#loader").hide();
          return res.json();
        })
        .then((res2) => {
          console.log(res2);
          if (res2.count !== undefined) {
            var list = "";
            var ddData = [];
            for (let i = 0; i < res2.results.length; i++) {
              var obj = {};
              obj.text = res2.results[i].sku;
              obj.value = res2.results[i].asin;
              obj.description = res2.results[i].asin;
              obj.imageSrc = res2.results[i].thumbnail;
              obj.selected = false;
              ddData.push(obj);
              list += `<option value="${res2.results[i].asin}" thumbnail="${res2.results[i].thumbnail == ''? 'assets/img/dummy_image.svg': res2.results[i].thumbnail}" data-id="${res2.results[i].id}">${res2.results[i].title}</option>`;
            }
            console.log(list);
            $("#asinInput").show();
            $("#asin_input").hide();
            document.querySelector("#asinInput").innerHTML = list;
            $("#asinInput").select2({
              templateResult: formatState,
              templateSelection: formatState2,
              matcher: function(params, data) {
                // If there are no search terms, return all of the data
                if ($.trim(params.term) === '') {
                  return data;
                }

                console.log(params)
                console.log(data)

                // Do not display the item if there is no 'text' property
                if (typeof data.text === 'undefined') {
                  return null;
                }

                // `params.term` should be the term that is used for searching
                // `data.text` is the text that is displayed for the data object
                if (data.text.indexOf(params.term) > -1 || data.id.indexOf(params.term) > -1) {
                  var modifiedData = $.extend({}, data, true);

                  // You can return modified objects from here
                  // This includes matching the `children` how you want in nested data sets
                  return modifiedData;
                }

                // Return `null` if the term should not be displayed
                return null;
              }
             });
          }
        });
    }
  });
} else {
  $("#asinInput").hide();
  $("#asin_input").show();
  if(document.querySelectorAll('.select2-container').length > 0){
    document.querySelector('.select2-container').style.display = 'none';
  }
}
}

function keywords(e) {
  chrome.storage.local.get(["token", "comp_id"], (a) => {
    if (a.token !== undefined) {
      $("#loader").show();
      var opts = {
        method: "GET",
        headers: {
          Authorization: `JWT ${a.token}`,
        },
      };
      var comp_id = "";
      if (a.comp_id !== undefined) {
        comp_id = a.comp_id;
      } else {
        comp_id = 14;
      }

      var p_id = e.getAttribute('data-id');
      // p_id = 684;
      var newDate = currentDate(new Date());
      // console.log($('#asinInput:selected').attr('data-id'));
      // newDate = "2021-06-12";

      fetch(
        `https://api.komrs.io/companies/${comp_id}/product-keyword-rank/?productkeyword__amazonproduct=${p_id}&date=${newDate}&limit=10000`,
        opts
      )
        .then((res) => {
          $("#loader").hide();
          return res.json();
        })
        .then((res2) => {
          console.log(res2);
          if (res2.results.length > 0) {
            chrome.storage.local.set({ keywords_list: res2 });
            var arrr = [];
            for (let i = 0; i < res2.results.length; i++) {
              arrr.push(res2.results[i].productkeyword.keyword.name);
            }
            var arrr_string = arrr.join("\n");
            document.querySelector("#keywordsTextarea").value = arrr_string;
          } else {
            document.querySelector("#keywordsTextarea").value = '';
          }

        });

    }
  });
}

function currentDate(date) {
  var d = date,
    month = "" + (date.getMonth() + 1),
    day = "" + date.getDate(),
    year = "" + date.getFullYear();

  if (month.length > 2) {
    month = "0" + month;
  }
  if (day.length > 2) {
    day = "0" + day;
  }
  var new_date = year + "-" + month + "-" + day;

  return new_date;
}

async function onCheckRanksButtonClick(e) {
  e.preventDefault();

  if (!isLoggedIn) return $("#loginModal").modal("show");

  var marketplace = document.querySelector('#marketplaceSelect > option:checked').getAttribute('market').toLowerCase();
  const asin = asin_curr;
  const keywords = keywordsTextarea.value
    .trim()
    .split("\n")
    .filter(Boolean); /* filtering the possible empty values right away */
  const pageIndexArray = [...Array(21).keys()].slice(1); /* [ 1, 2, 3... 20 ] */

  if (!asin) asinInput.classList.add("is-invalid");

  if (!keywords.length) {
    keywordsTextarea.nextElementSibling.textContent = "Keywords are required";
    keywordsTextarea.classList.add("is-invalid");
  }

  // if (keywords.length > 200) {
  //   keywordsTextarea.nextElementSibling.textContent =
  //     "Keywords are limited to 200 in one time";
  //   keywordsTextarea.classList.add("is-invalid");
  // }

  // if (!asin || !keywords.length || keywords.length > 200) return;

  prepare();

  try {
    await checkRanks(marketplace, asin, keywords, pageIndexArray);
  } catch (err) {
    console.log("Error occured:");
    console.log(err);
  } finally {
    stopProgress();
    console.log("ended");
    post2DB();
  }

  this.disabled = false;
}

function post2DB() {
  chrome.storage.local.get(["keywords_list"], (e) => {
    if (e.keywords_list !== undefined) {
      var tr = document.querySelectorAll("tbody > tr");
      if (tr.length > 0) {
        var arr_rank = [];
        for (let i = 0; i < tr.length; i++) {
          var obj = {};
          obj.keyword_name = tr[i].getAttribute("data-keyword");
          obj.index =
            tr[i].querySelectorAll("td")[1].textContent == "No" ? false : true;
          obj.rank = parseInt(tr[i].querySelectorAll("td")[2].textContent);
          obj.page = parseInt(
            tr[i].querySelectorAll("td")[3].getAttribute("data-position")
          );
          obj.date = currentDate(new Date());
          obj.product_id = prod_id;
          arr_rank.push(obj);
        }
        console.log(JSON.stringify(arr_rank));
        if (arr_rank.length > 0) {
          chrome.storage.local.get(["token", "comp_id"], (a) => {
            if (a.token !== undefined) {
              var opts = {
                method: "POST",
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `JWT ${a.token}`
                },
                body: JSON.stringify(arr_rank)
              };
              var comp_id = "";
              if (a.comp_id !== undefined) {
                comp_id = a.comp_id;
              } else {
                comp_id = 14;
              }
              fetch(
                `https://api.komrs.io/companies/${comp_id}/product-keyword-rank/bulk_create/`,
                opts
              )
                .then((res) => {
                  return res.json();
                })
                .then((res2) => {
                  console.log(res2);
                });
            }
          });
        }
      }
    }
  });
}

function onTableSearchInput() {
  const searchTerm = this.value;

  for (const row of resultsTable.querySelectorAll("tbody tr")) {
    if (row.getAttribute("data-keyword").includes(searchTerm))
      row.style.display = "table-row";
    else row.style.display = "none";
  }
}

async function onLoginButtonClick() {
  this.disabled = true;
  $("#loader").show();
  await login();
  $("#loader").hide();
  this.disabled = false;
}

function onCaptchaContinueButtonClick() {
  this.setAttribute("data-clicked", "true");
}

function onBlockConfirmButtonClick() {
  $("#blockModal").modal("hide");
}

function onSessionConfirmButtonClick() {
  $("#sessionModal").modal("hide");
}

function onTheadClick() {
  let col = this.getAttribute("data-col");
  let reverse = this.getAttribute("data-reverse") === "true";

  sortTable(resultsTable, col, !reverse);

  this.setAttribute("data-reverse", !reverse);
}

/* </Event listeners> */

/* <Main stuff> */

async function checkRanks(marketplace, asin, keywords, pageIndexArray) {
  const itemsLength = keywords.length;
  let processedItems = 0;

  let resultItems = keywords.map((keyword) => {
    return {
      keyword,
      indexed: false,
      rank: 0,
      position: 0,
      reachedLastPage: false,
    };
  });

  /* Indexation part */
  while (true) {
    resultItems = await Promise.all(
      resultItems.map((resultItem) =>
        getItemIndexationForKeyword(resultItem, marketplace, asin)
      )
    );

    let block = resultItems.find((resultItem) => resultItem.block);

    if (block) {
      $("#blockModal").modal("show");
      throw "Temporary block.";
    }

    let captcha = resultItems.find((resultItem) => resultItem.captcha);

    if (captcha) {
      $("#captchaModal").modal("show");
      await waitForCaptchaSubmission();
      resultItems = clearCaptchaItems(resultItems);
      continue;
    }

    break;
  }

  addToResultsTable(getNotIndexedItems(resultItems));
  processedItems += getNotIndexedItems(resultItems).length;
  updateProgress(processedItems, itemsLength);
  resultItems = getIndexedItems(resultItems);

  await wait(500);

  /* Main part */
  for (let pageIndex = 1; pageIndex < 21; pageIndex++) {
    resultItems = await Promise.all(
      resultItems.map((resultItem) =>
        getItemDataForKeywordPerPage(resultItem, marketplace, pageIndex, asin)
      )
    );

    let block = resultItems.find((resultItem) => resultItem.block);

    if (block) {
      $("#blockModal").modal("show");
      throw "Temporary block.";
    }

    let captcha = resultItems.find((resultItem) => resultItem.captcha);

    if (captcha) {
      $("#captchaModal").modal("show");
      await waitForCaptchaSubmission();
      resultItems = clearCaptchaItems(resultItems);
      pageIndex--;
      continue;
    }

    addToResultsTable(getFinishedItems(resultItems));
    processedItems += getFinishedItems(resultItems).length;
    updateProgress(processedItems, itemsLength);
    resultItems = getNotFinishedItems(resultItems);

    await wait(500);
  }
}

function prepare() {
  checkRanksButton.disabled = true;
  tableSearchInput.value = "";
  clearResultsTable();
  initiateProgress();
}

function getIndexedItems(resultItems) {
  return resultItems.filter((resultItem) => resultItem.indexed);
}

function getNotIndexedItems(resultItems) {
  return resultItems.filter((resultItem) => !resultItem.indexed);
}

function getFinishedItems(resultItems) {
  return resultItems.filter(
    (resultItem) => resultItem.rank > 0 || resultItem.reachedLastPage
  );
}

function getNotFinishedItems(resultItems) {
  return resultItems.filter(
    (resultItem) => resultItem.rank == 0 && !resultItem.reachedLastPage
  );
}

function clearCaptchaItems(resultItems) {
  return resultItems.map((resultItem) => {
    resultItem.captcha = false;
    return resultItem;
  });
}

/* </Main stuff> */

/* <Table management> */

function addToResultsTable(items) {
  const resultsTableTBody = resultsTable.querySelector("tbody");

  for (const item of items) {
    const row = `
            <tr data-keyword="${item.keyword}">
                <td>${item.keyword}</td>
                <td>${item.indexed ? "Yes" : "No"}</td>
                <td>${item.rank ? item.rank : "321+"}</td>
                <td data-position="${item.position ? item.position : 21}">${
      item.position ? `Page ${item.position}` : "Page 21+"
    }</td>
            </tr>
        `;

    resultsTableTBody.insertAdjacentHTML("beforeend", row);
  }
}

function populateResultsTable(resultArray) {
  const resultsTableTBody = resultsTable.querySelector("tbody");

  for (const resultItem of resultArray) {
    const row = `
            <tr data-keyword="${resultItem.keyword}">
                <td>${resultItem.keyword}</td>
                <td>${resultItem.rank ? "Yes" : "No"}</td>
                <td>${resultItem.rank ? resultItem.rank : "321+"}</td>
                <td data-position="${
                  resultItem.position ? resultItem.position : 21
                }">${
      resultItem.position ? `Page ${resultItem.position}` : "Page 21+"
    }</td>
            </tr>
        `;

    resultsTableTBody.insertAdjacentHTML("beforeend", row);
  }
}

function clearResultsTable() {
  resultsTable.querySelector("tbody").innerHTML = "";
}

function sortTable(table, col, reverse) {
  let tb = table.tBodies[0];
  let tr = Array.prototype.slice.call(tb.rows, 0);
  let i;

  reverse = -(+reverse || -1);

  /* Text-based */
  if (col < 2) {
    tr = tr.sort(function (a, b) {
      return (
        reverse *
        a.cells[col].textContent
          .trim()
          .localeCompare(b.cells[col].textContent.trim())
      );
    });
  }

  /* Numeric-based */
  if (col == 2) {
    tr = tr.sort(function (a, b) {
      return (
        reverse *
        (+a.cells[col].textContent.trim().replace("+", "") -
          +b.cells[col].textContent.trim().replace("+", ""))
      );
    });
  }

  /* Numeric-based */
  if (col == 3) {
    tr = tr.sort(function (a, b) {
      return (
        reverse *
        (+a.cells[col].getAttribute("data-position") -
          +b.cells[col].getAttribute("data-position"))
      );
    });
  }

  for (i = 0; i < tr.length; ++i) tb.appendChild(tr[i]);
}

/* </Table management> */

/* <Progress management> */

function initiateProgress() {
  progressContainer.querySelector(".progress-icon").classList.add("rotating");
  progressContainer.querySelector(".progress-fill").style.width = "0%";
  progressContainer.querySelector(".progress-text").textContent = "0%";
  progressContainer.style.opacity = "1";
}

function updateProgress(current, maximum) {
  const percents = Math.floor((current / maximum) * 100);

  progressContainer.querySelector(
    ".progress-fill"
  ).style.width = `${percents}%`;
  progressContainer.querySelector(
    ".progress-text"
  ).textContent = `${percents}%`;
}

function stopProgress() {
  progressContainer
    .querySelector(".progress-icon")
    .classList.remove("rotating");
  // progressContainer.querySelector(".progress-fill").style.width = "100%"
  // progressContainer.querySelector(".progress-text").textContent = "100%"
}

/* </Progress management> */

/* <Scraping part> */

async function getPage(url) {
  const response = await fetch(url);

  if (response.status == 503) return "block";

  const html = await response.text();
  const page = new DOMParser().parseFromString(html, "text/html");

  if (page.querySelector("#captchacharacters")) return "captcha";

  return page;
}

function getItems(page) {
  return page.querySelectorAll(
    `.s-main-slot.s-result-list.s-search-results.sg-row > div:not([data-asin=""], .AdHolder)`
  );
}

async function getItemIndexationForKeyword(resultItem, marketplace, asin) {
  const url = `https://www.${marketplace}/s?k=${asin}%2B${resultItem.keyword
    .split(" ")
    .filter(Boolean)
    .join("+")}`;
  const page = await getPage(url);

  if (page == "block") {
    resultItem.block = true;
    return resultItem;
  }

  if (page == "captcha") {
    resultItem.captcha = true;
    return resultItem;
  }

  const items = getItems(page);
  const rank =
    [...items].findIndex((item) => item.getAttribute("data-asin") == asin) + 1;

  if (rank) resultItem.indexed = true;
  else resultItem.indexed = false;

  return resultItem;
}

async function getItemDataForKeywordPerPage(
  resultItem,
  marketplace,
  pageIndex,
  asin
) {
  const url = `https://www.${marketplace}/s?k=${resultItem.keyword
    .split(" ")
    .filter(Boolean)
    .join("+")}&page=${pageIndex}`;
  const page = await getPage(url);

  if (page == "block") {
    resultItem.block = true;
    return resultItem;
  }

  if (page == "captcha") {
    resultItem.captcha = true;
    return resultItem;
  }

  const items = getItems(page);
  const rank =
    [...items].findIndex((item) => item.getAttribute("data-asin") == asin) + 1;

  if (rank) {
    resultItem.rank = (pageIndex - 1) * 16 + rank;
    resultItem.position = pageIndex;
  }

  resultItem.reachedLastPage = items.length < 16;

  return resultItem;
}

/* </Scraping part> */

/* <Authentication part> */

async function login() {
  hideStatusMessage();

  const uid = uidInput.value;
  const password = passwordInput.value;
  const valid = uid.trim() && password.trim();

  if (!uid.trim()) uidInput.classList.add("is-invalid");

  if (!password.trim()) passwordInput.classList.add("is-invalid");

  if (!valid) return;

  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "omit",
    body: JSON.stringify({
      username: uid.includes("@") ? undefined : uid,
      email: uid.includes("@") ? uid : undefined,
      password,
    }),
  };

  try {
    const response = await fetch("https://api.komrs.io/login/", options);
    const json = await response.json();

    console.log(json);

    if (!response.ok && json.non_field_errors)
      return handleLoginFailure(json.non_field_errors[0]);

    if (!response.ok) return handleLoginFailure("Couldn't login");

    chrome.storage.local.set({ token: json.token }, () => {
      fetch("https://api.komrs.io/companies/", {
        method: "GET",
        headers: {
          Authorization: `JWT ${json.token}`,
        },
      })
        .then((res) => {
          return res.json();
        })
        .then((res2) => {
          if (res2.results[0].id !== undefined && res2.results[0].id !== "") {
            chrome.storage.local.set({ comp_id: res2.results[0].id });
          }
        });
    });
    handleLoginSuccess();
  } catch (err) {
    handleLoginFailure("Couldn't login");
  }
}

async function logout() {
  handleLogoutSuccess();
}

function handleLoginFailure(text) {
  loginStatusMessage.classList.add("failure");
  loginStatusMessage.textContent = text;
}

async function handleLoginSuccess() {
  await setLoginState(true);

  loginStatusMessage.classList.add("success");
  loginStatusMessage.textContent = "Successfully logged in!";

  await wait(1337);
  location.reload();
}

async function handleLogoutSuccess() {
  await setLoginState(false);
  location.reload();
}

function hideStatusMessage() {
  loginStatusMessage.classList.remove("failure");
  loginStatusMessage.classList.remove("success");
  loginStatusMessage.textContent = "";
}

function getLoginState() {
  return new Promise((resolve) => {
    chrome.storage.local.get("isLoggedIn", (object) => {
      resolve(object.isLoggedIn);
    });
  });
}

function setLoginState(isLoggedIn) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ isLoggedIn }, resolve);
  });
}

/* </Authentication part> */

/* <Captcha/block management> */

function waitForCaptchaSubmission() {
  return new Promise((resolve) => {
    $("#captchaModal").modal("show");
    captchaContinueButton.setAttribute("data-clicked", "false");

    check();

    function check() {
      let clicked = captchaContinueButton.getAttribute("data-clicked");

      if (clicked == "true") {
        $("#captchaModal").modal("hide");
        return resolve();
      }

      setTimeout(check, 100);
    }
  });
}

/* </Captcha/block management> */

/* <General utils> */

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function downloadCSV(e) {
  if (!resultsTable.querySelector("tbody tr")) return e.preventDefault();

  return ExcellentExport.csv(this, "resultsTable");
}

function downloadExcel(e) {
  if (!resultsTable.querySelector("tbody tr")) return e.preventDefault();

  return ExcellentExport.excel(this, "resultsTable", "Keywords");
}

/* </General utils> */
