/* this script relies on digi.js, tree.js, and advent.js */

/* Globals */

var lastUpdate = new Date("08-31-2018 10:14:41 GMT+0800");

var blank;
var linelayer;
var linecontext;

var selectedDigi = new Set();
var gemel = new Gemel();
var gemelCore = gemel.intersection();
var fragmentDigi = {};

var searchMode;
var filters = { // only global because of advents
    "query": new Set(),
    "tribe": new Set(),
    "rival": new Set(),
    "effect": new Set(),
    "special": new Set() // NOTE: used in updateAdvent
};
var exitSearchMode;
var updateSearchResults;

var settings = {
    "tree": 0,
    "sort": 0,
    "preview": 0,
    "size": 0,
    "awkn": 0,
    "skill": 0
};
var updateAdvent;

/* Helpers */

function addTapListener(e, f) {
    e.addEventListener("click", f);
    e.addEventListener("touchstart", function () {}); // somehow enables mobile responsiveness (no double tap)
}

function getProfileGroup(id) {
    var section = document.getElementById(id);
    var profileGroup = section.getElementsByClassName("profile-group")[0];
    return profileGroup;
}

function hide(element) {
    element.classList.add("hidden");
}

function show(element) {
    element.classList.remove("hidden");
}

/* Tree Visualization */

function update() {
    var profileGroups = document.getElementsByClassName("profile-group");

    gemel = new Gemel(selectedDigi);
    gemelCore = gemel.intersection();
    updateClones(); // wanted to call updateLines on portrait load, but that creates new problems
    updateProfiles();
    Array.from(profileGroups).forEach(function (profileGroup) { // for safari
        var rect = profileGroup.getBoundingClientRect();
        if (rect.width < window.innerWidth) {
            profileGroup.parentNode.scrollTo(0, 0);
        }
    });
    if (settings.sort == 2) {
        untangleProfiles();
    }
    else {
        updateLines();
    }
}

function updateClones() {
    var selection = getProfileGroup("selection");
    selection.innerHTML = "";

    function deselectProfile() {
        selectedDigi.delete(this.parentNode.id.slice(0, -6));
        update();
    }
    if (selectedDigi.size) {
        Array.from(selectedDigi).forEach(function (mon) {
            var profile = document.getElementById(mon);
            var clone = profile.cloneNode(true);
            clone.classList.remove("root");
            clone.classList.remove("core-node");
            clone.classList.remove("node");
            clone.classList.remove("preview");
            show(clone);
            clone.id = mon + "-clone";
            var card = clone.getElementsByClassName("card")[0];
            addTapListener(card, deselectProfile);
            selection.appendChild(clone);
        });
    }
    else {
        selection.appendChild(blank);
    }
}

function updateProfiles() {
    for (var mon in digi) {
        var profile = document.getElementById(mon);
        profile.classList.remove("root");
        profile.classList.remove("core-node");
        profile.classList.remove("node");
        show(profile);
        if (selectedDigi.size) {
            if (gemel.roots.has(mon)) {
                profile.classList.add("root");
            }
            else if (gemelCore.nodes.has(mon)) {
                profile.classList.add("core-node");
            }
            else if (settings.tree && gemel.nodes.has(mon)) {
                profile.classList.add("node");
            }
            else {
                hide(profile);
            }
        }
    }
}

function untangleProfiles() { // TODO: improve this algorithm
    var visited = new Set();

    function dfs(mon, d, repeat) {
        if (!visited.has(mon) || repeat) {
            var gem = [gemelCore, gemel][settings.tree];
            visited.add(mon);
            if (d <= 0) {
                Array.from(prev(mon)).forEach(function (prevmon) {
                    if (gem.nodes.has(prevmon)) {
                        dfs(prevmon, -1, false);
                    }
                });
            }
            if (d >= 0) {
                for (var nextmon of next(mon)) {
                    if (gem.nodes.has(nextmon)) {
                        dfs(nextmon, 1, false);
                    }
                }
            }
        }
    }

    Array.from(selectedDigi).forEach(function (mon) {
        dfs(mon, 0, true);
    });
    for (var mon in digi) {
        visited.add(mon);
    }
    sortProfiles(visited);
}

function sortProfiles(sortedDigi) {
    Array.from(sortedDigi).forEach(function (mon) {
        var profileGroup = getProfileGroup(digi[mon].evol);
        var profile = document.getElementById(mon);
        profileGroup.appendChild(profile);
    });
    updateLines();
}

function updateLines() { // cannot update individually because of line borders
    var scale = 2;
    linecontext.clearRect(0, 0, linelayer.width, linelayer.height);
    if (!searchMode) {
        linelayer.width = scale * window.innerWidth;
        linelayer.height = scale * document.body.getBoundingClientRect().height; // body is taller than window
        linecontext.scale(scale, scale);
        if (settings.tree) {
            gemel.forEachEdge(function (edge, JSONedge) {
                if (!gemelCore.JSONedges.has(JSONedge)) {
                    drawEdge(edge, "#000", 4);
                }
            });
            gemel.forEachEdge(function (edge, JSONedge) {
                if (!gemelCore.JSONedges.has(JSONedge)) {
                    drawEdge(edge, "#aaa", 2);
                }
            });
        }
        gemelCore.forEachEdge(function (edge, JSONedge) {
            drawEdge(edge, "#000", 4);
        });
        gemelCore.forEachEdge(function (edge, JSONedge) {
            drawEdge(edge, "#fff", 2);
        });
    }
}

function drawEdge(edge, color, width) {
    var a = getPoint(edge[0], "bottom");
    var b = getPoint(edge[1], "top");
    drawLine(a, b, color, width);
}

function getPoint(mon, side) {
    var profile = document.getElementById(mon);
    var card = profile.getElementsByClassName("card")[0];
    var rect = card.getBoundingClientRect();
    var dy = {
        "top": 1,
        "bottom": -1
    };
    var point = {
        "x": window.scrollX + (rect.left + rect.right) / 2,
        "y": window.scrollY + rect[side] + dy[side]
    };
    return point;
}

function drawLine(a, b, color, width) {
    linecontext.beginPath();
    linecontext.moveTo(a.x, a.y);
    if (a.y < b.y) {
        linecontext.quadraticCurveTo(
            a.x, (0.75 * a.y + 0.25 * b.y),
            0.5 * a.x + 0.5 * b.x, 0.5 * a.y + 0.5 * b.y
        );
        linecontext.quadraticCurveTo(
            b.x, (0.25 * a.y + 0.75 * b.y),
            b.x, b.y
        );
    }
    else {
        var sign = b.x - a.x >= 0 ? 1 : -1;
        var dx = sign * [32, 40, 24][settings.size];
        var dy = [10, 12, 8][settings.size];
        linecontext.bezierCurveTo(
            a.x, a.y + dy,
            a.x + dx, a.y + dy,
            0.5 * a.x + 0.5 * b.x, 0.5 * a.y + 0.5 * b.y
        );
        linecontext.bezierCurveTo(
            b.x - dx, b.y - dy,
            b.x, b.y - dy,
            b.x, b.y
        );
    }
    linecontext.strokeStyle = color;
    linecontext.lineWidth = width;
    linecontext.stroke();
    linecontext.closePath();
}

/* Initialization */

function init() {
    blank = document.getElementById("blank");
    linelayer = document.getElementById("linelayer");
    linecontext = linelayer.getContext("2d");
    initProfiles();
    initAdvent();
    initEvolLabels();
    initFiltration();
    initVisualization();
    initPlanner();
    initFooter();
    initLineListeners();
}

function initProfiles() {
    function newProfile(mon) {
        var profile = document.createElement("div");
            profile.className = "profile";
            profile.id = mon;
            if (digi[mon].fragments) {
                var fragments = document.createElement("input");
                    fragments.className = "fragments";
                    fragments.type = "number";
                    fragments.placeholder = "0";
                    fragments.min = "0";
                    fragments.max = "999";
                    fragments.addEventListener("input", setFragments);
                profile.appendChild(fragments);
            }
            var card = document.createElement("div");
                card.className = "card";
                var portrait = document.createElement("img");
                    portrait.className = "portrait";
                    portrait.src = "img/mon/0/" + mon + ".png";
                    if (mon == "birdramon") {
                        var r = Math.random();
                        if (r < 0.001) {
                            portrait.src = "img/mon/birdramon.png";
                        }
                    }
                    portrait.alt = mon + "+0";
                card.appendChild(portrait);
                var tribe = document.createElement("img");
                    tribe.className = "tribe";
                    tribe.src = "img/tribes/" + digi[mon].tribe + ".png";
                    tribe.alt = digi[mon].tribe;
                card.appendChild(tribe);
                var moniker = document.createElement("div");
                    moniker.className = "moniker";
                    moniker.innerHTML = digi[mon].name.replace(/([a-z])([A-Z]+|mon)/g, "$1&shy;$2");
                card.appendChild(moniker);
            profile.appendChild(card);
            var signatureSet = document.createElement("div");
                signatureSet.className = "signature-set";
                Array.from(digi[mon].skills).forEach(function (skill) {
                    var signature = document.createElement("div");
                        var rival = document.createElement("img");
                            rival.className = "rival";
                            rival.src = "img/tribes/" + skill.rival + ".png";
                            rival.alt = skill.rival;
                        signature.appendChild(rival);
                        var effect = document.createElement("span");
                            effect.innerHTML = ["Support", "ST", "AoE"][skill.effect];
                        signature.appendChild(effect);
                        var tier = document.createElement("span");
                            tier.className = "tier";
                            tier.innerHTML = skill.tier ? ("[" + skill.tier + "]") : "";
                        signature.appendChild(tier);
                    signatureSet.appendChild(signature);
                });
            profile.appendChild(signatureSet);
            var growlmon = document.createElement("div");
                growlmon.className = "growlmon";
                var anchor = document.createElement("a");
                    anchor.href = "http://growlmon.net/digimon/" + mon;
                    anchor.target = "_blank";
                    anchor.innerHTML = "Growlmon.Net";
                growlmon.appendChild(anchor);
            profile.appendChild(growlmon);
        return profile;
    }

    function selectProfile() {
        selectedDigi.add(this.parentNode.id);
        if (searchMode) {
            exitSearchMode();
        }
        else {
            update();
        }
    }

    function setFragments(e) {
        var mon = this.parentNode.id;
        if (this.value == "" || this.value <= 0) {
            this.value = "";
            delete fragmentDigi[mon];
        }
        else {
            if (this.value > 999) {
                this.value = 999;
            }
            fragmentDigi[mon] = parseInt(this.value);
        }
    }

    for (var mon in digi) { // skip sorting step, growlmon.js alphabetizes digi.js in preprocessing
        var profile = newProfile(mon);
        var card = profile.getElementsByClassName("card")[0];
        addTapListener(card, selectProfile);
        getProfileGroup(digi[mon].evol).appendChild(profile);
    }
}

function initAdvent() {
    updateAdvent = function (repeat) { // NOTE: used in updateSearchResults
        var now = Date.now();
        for (var mon in advent) {
            var profile = document.getElementById(mon);
            if (isAdvent(mon, now)) {
                profile.classList.add("advent");
                if (filters.special.has("advent")) {
                    show(profile);
                }
            }
            else {
                profile.classList.remove("advent");
                if (filters.special.has("advent")) {
                    hide(profile);
                }
            }
        }
        if (repeat) {
            setTimeout(function () { // check every minute
                requestAnimationFrame(updateAdvent);
            }, 60000);
        }
    }

    function isAdvent(mon, now) {
        if (mon in advent) {
            var start = advent[mon][0] - 43200000; // show advents half a day ahead of schedule
            var end = advent[mon][1];
            return start <= now && now <= end;
        }
        return false;
    }

    updateAdvent(true);
}

function initEvolLabels() {
    var evolLabels = document.getElementsByClassName("evol-label");

    function selectProfileGroup() {
        var section = this.parentNode.parentNode;
        var profiles = section.getElementsByClassName("profile");
        selectedDigi.clear();
        Array.from(profiles).forEach(function (profile) {
            if (!profile.classList.contains("hidden")) {
                selectedDigi.add(profile.id);
            }
        });
        if (searchMode) {
            exitSearchMode();
        }
        else {
            update();
        }
    }

    Array.from(evolLabels).forEach(function (evolLabel) {
        addTapListener(evolLabel, selectProfileGroup);
    });
}

function initFiltration() {
    var selection = document.getElementById("selection");
    var filtration = document.getElementById("filtration");
    var enterSearch = document.getElementById("enter-search");
    var exitSearch = document.getElementById("exit-search");
    var search = document.getElementById("search");
    var switches = filtration.getElementsByClassName("switch");

    function enterSearchMode() {
        hide(selection);
        show(filtration);
        search.focus();
        searchMode = true;
        updateLines();
        updateSearchResults();
    }

    exitSearchMode = function() { // NOTE: used in selectProfile and selectEvolLabel
        show(selection);
        hide(filtration);
        search.value = "";
        Array.from(switches).forEach(function (s) {
            s.classList.remove("selected");
        });
        filters.query.clear();
        filters.tribe.clear();
        filters.rival.clear();
        filters.effect.clear();
        filters.special.clear();
        searchMode = false;
        update();
    }

    function setQuery() {
        var lower = this.value.toLowerCase();
        var parsed = lower.split(/[^a-z]+/);
        filters.query = new Set(parsed);
        filters.query.delete("");
        updateSearchResults();
    }

    function enterBlur(e) {
        if (e.keyCode == 13 || e.key == "Enter" || e.code == "Enter") {
            search.blur();
        }
    }

    function flipSwitch() {
        var splitId = this.id.split("-");
        var key = splitId[0];
        var value = splitId[1];
        if (this.classList.contains("selected")) {
            this.classList.remove("selected");
            filters[key].delete(value);
        }
        else {
            this.classList.add("selected");
            filters[key].add(value);
        }
        updateSearchResults();
    }

    updateSearchResults = function() { // NOTE: used in setTree
        updateAdvent(false);
        for (var mon in digi) {
            var profile = document.getElementById(mon);
            show(profile);
            if (!okFilters(mon)) {
                hide(profile);
            }
        }
    }

    function okFilters(mon) {
        var okQuery = !filters.query.size || Array.from(filters.query).every(function (term) {
            return mon.includes(term);
        });
        var okTribe = !filters.tribe.size || filters.tribe.has(digi[mon].tribe);
        var okSkill = digi[mon].skills.some(function (skill) {
            var okRival = !filters.rival.size || filters.rival.has(skill.rival);
            var effect = ["support", "st", "aoe"][skill.effect];
            var okEffect = !filters.effect.size || filters.effect.has(effect);
            return okRival && okEffect;
        });
        var okTree = !filters.special.has("tree") || [gemelCore, gemel][settings.tree].nodes.has(mon);
        var okDNA2 = !filters.special.has("dna") || digi[mon].skills.length > 1;
        var okV2 = !filters.special.has("v2") || digi[mon].v2;
        var profile = document.getElementById(mon);
        var okAdvent = !filters.special.has("advent") || profile.classList.contains("advent");
        var okSpecial = okTree && okDNA2 && okV2 && okAdvent;
        return okQuery && okTribe && okSkill && okSpecial;
    }

    addTapListener(blank, enterSearchMode);
    addTapListener(enterSearch, enterSearchMode);
    addTapListener(exitSearch, exitSearchMode);
    search.addEventListener("input", setQuery);
    search.addEventListener("keydown", enterBlur);
    Array.from(switches).forEach(function (s) {
        addTapListener(s, flipSwitch);
    });

    exitSearchMode();
}

function initVisualization() {
    var visualization = document.getElementById("visualization");
    var slideSets = visualization.getElementsByClassName("slide-set");
    var setters = {
        "tree": setTree,
        "sort": setSort,
        "size": setSize,
        "awkn": setAwkn,
        "preview": setPreview,
        "skill": setSkill
    };

    function setTree(n) {
        update();
        if (searchMode) {
            updateSearchResults();
        }
    }

    function setSort(n) {
        if (n == 2) {
            untangleProfiles();
        }
        else {
            var basis = n ? byTribe : byAlphabet;
            var keys = Object.keys(digi);
            keys.sort(basis);
            sortProfiles(keys);
        }
    }

    function byAlphabet(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    function byTribe(a, b) {
        var tribes = ["mirage", "blazing", "glacier", "electric", "earth", "bright", "abyss"];
        var tribeComparison = tribes.indexOf(digi[a].tribe) - tribes.indexOf(digi[b].tribe);
        return tribeComparison ? tribeComparison : byAlphabet(a, b);
    }

    function setSize(n) {
        var profiles = document.getElementsByClassName("profile");
        var size = ["", "large", "small"][n];
        Array.from(profiles).forEach(function (profile) {
            profile.classList.remove("large");
            profile.classList.remove("small");
            if (settings.size) {
                profile.classList.add(size);
            }
        });
        updateLines();
    }

    function setAwkn(n) {
        var portraits = document.getElementsByClassName("portrait");
        var awkn = n == 2 ? 1 : n;
        for (var portrait of portraits) {
            var mon = portrait.parentNode.parentNode.id;
            if (mon == "blank") {
                continue;
            }
            if (mon.endsWith("clone")) {
                mon = mon.slice(0, -6);
            }
            if (awkn != 5 || digi[mon].v2) {
                portrait.src = portrait.src.replace(/mon\/[01345]/, "mon/" + awkn);
                portrait.alt = portrait.alt.replace(/\+[01345]/, "+" + awkn);
            }
        }
    }

    function setPreview(n) {
        for (var mon in digi) {
            var profile = document.getElementById(mon);
            var card = profile.getElementsByClassName("card")[0];
            if (n) {
                card.addEventListener("mouseover", previewGemel);
                card.addEventListener("touchstart", previewGemel);
                card.addEventListener("mouseout", deviewGemel);
                card.addEventListener("touchend", deviewGemel);
            }
            else {
                card.removeEventListener("mouseover", previewGemel);
                card.removeEventListener("touchstart", previewGemel);
                card.removeEventListener("mouseout", deviewGemel);
                card.removeEventListener("touchend", deviewGemel);
            }
        }
    }

    function previewGemel() {
        if (!searchMode) {
            var tree = new Gemel(this.parentNode.id);
            Array.from(tree.nodes).forEach(function (node) {
                var profile = document.getElementById(node);
                profile.classList.add("preview");
                var card = profile.getElementsByClassName("card")[0];
                var rect = card.getBoundingClientRect();
                linecontext.clearRect(
                    rect.left + window.scrollX + 1,
                    rect.top + window.scrollY + 1,
                    rect.width - 2,
                    rect.height - 2
                );
            });
            tree.forEachEdge(function (edge, JSONedge) {
                var profile0 = document.getElementById(edge[0]);
                var profile1 = document.getElementById(edge[1]);
                if (!profile0.classList.contains("hidden") && !profile1.classList.contains("hidden")) {
                    drawEdge(edge, "#000", 4);
                }
            });
        }
    }

    function deviewGemel() {
        if (!searchMode) {
            var tree = new Gemel(this.parentNode.id);
            Array.from(tree.nodes).forEach(function (node) {
                var profile = document.getElementById(node);
                profile.classList.remove("preview");
            });
            updateLines();
        }
    }

    function setSkill(n) {
        var signatureSets = document.getElementsByClassName("signature-set");
        for (var signatureSet of signatureSets) {
            if (n) {
                signatureSet.style.display = "block";
            }
            else {
                signatureSet.removeAttribute("style");
            }
        }
        updateLines();
    }

    function setSlide(key, value) {
        var slideSet = document.getElementById(key);
        var slides = slideSet.getElementsByClassName("slide");
        for (var slide of slides) {
            hide(slide);
            if (slide == slides[value]) {
                show(slide);
            }
        }
        settings[key] = value;
        setters[key](value);
    }

    function advanceSlide() {
        var key = this.id;
        var slides = this.getElementsByClassName("slide");
        var value = (settings[key] + 1) % slides.length;
        setSlide(key, value);
    }

    function saveSettings() {
        var settingsJSON = JSON.stringify(settings);
        window.localStorage.setItem("settings", settingsJSON);
    }

    function loadSettings() {
        var settingsJSON = window.localStorage.getItem("settings");
        settings = JSON.parse(settingsJSON);
    }

    function deleteLegacyLocalStorage() { // TODO: delete this in the next version?
        window.localStorage.removeItem("tree");
        window.localStorage.removeItem("sort");
        window.localStorage.removeItem("preview");
        window.localStorage.removeItem("size");
        window.localStorage.removeItem("awkn");
        window.localStorage.removeItem("skill");
    }

    function hideUselessSettings() {
        var uselessSettings = ["skill"];
        uselessSettings.forEach(function (uselessSetting) {
            var slideSet = document.getElementById(uselessSetting);
            var slidebox = slideSet.parentNode;
            hide(slidebox);
        })
    }

    try {
        deleteLegacyLocalStorage();
        loadSettings();
        window.addEventListener("beforeunload", saveSettings);
    }
    catch (e) {
        console.log(e);
    }
    Array.from(slideSets).forEach(function (slideSet) {
        var key = slideSet.id;
        var value = settings[key];
        setSlide(key, value)
        addTapListener(slideSet, advanceSlide);
    });
    hideUselessSettings();
}

function initPlanner() {
    "use strict";
    var entrylist = document.getElementById("entrylist");
    var entryadd = document.getElementById("entryadd");
    var plans = localStorage.getItem("planner") ? JSON.parse(localStorage.getItem("planner")) : [];

    function addEntry(i) {
        var entry = document.createElement("div");
            entry.className = "entry";
            entry.dataset.i = i;
            var x = document.createElement("div");
                x.className = "x";
                addTapListener(x, deleteEntry);
            entry.appendChild(x);
            var awkn = document.createElement("div");
                awkn.className = "awkn";
                if (plans[i].awkn == 5) {
                    awkn.innerHTML = "+4/V2";
                }
                else {
                    awkn.innerHTML = "+" + plans[i].awkn;
                }
            entry.appendChild(awkn);
            var viewer = document.createElement("div");
                viewer.className = "viewer";
                for (var mon of plans[i].digi) {
                    var photo = document.createElement("img");
                        if (plans[i].awkn != 5 || digi[mon].v2) {
                            photo.src = "img/mon/" + [0, 1, 1, 3, 4, 5][plans[i].awkn] + "/" + mon + ".png";
                        }
                        else {
                            photo.src = "img/mon/" + [0, 1, 1, 3, 4, 4][plans[i].awkn] + "/" + mon + ".png";
                        }
                    viewer.appendChild(photo);
                }
                addTapListener(viewer, viewEntry);
            entry.appendChild(viewer);
            var note = document.createElement("textarea");
                note.className = "note";
                note.placeholder = "Notes";
                note.value = plans[i].note;
                note.addEventListener("input", editNote);
            entry.appendChild(note);
            var handle = document.createElement("div");
                handle.className = "handle";
                handle.addEventListener("mousedown", startDrag);
            entry.appendChild(handle);
        entrylist.appendChild(entry);
    }

    function deleteEntry() {
        var i = parseInt(this.parentNode.dataset.i);
        plans = plans.slice(0, i).concat(plans.slice(i + 1));
        for (var entry of document.getElementsByClassName("entry")) {
            if (entry.dataset.i > i) {
                entry.dataset.i -= 1;
            }
        }
        this.parentNode.remove();
        updateLines();
    }

    function viewEntry() {
        var i = this.parentNode.dataset.i;
        selectedDigi = new Set(plans[i].digi);
        var awknSlide = document.getElementById("awkn");
        var x = (plans[i].awkn - settings.awkn + 6) % 6;
        for (var j = 0; j < x; j++) {
            awknSlide.click(); // TODO: change this hacky bullshit
        }
        update();
    }

    function editNote() {
        var message = this.value;
        var i = this.parentNode.dataset.i;
        plans[i].note = message;
    }

    function addSelection() {
        plans.push({
            "digi": Array.from(selectedDigi).sort(byEvol),
            "awkn": settings.awkn,
            "note": ""
        });
        addEntry(plans.length - 1);
        updateLines();
    }

    function byEvol(a, b) {
        var evols = ["in-training-i", "in-training-ii", "rookie", "champion", "ultimate", "mega"];
        var rank = evols.indexOf(digi[a].evol) - evols.indexOf(digi[b].evol);
        // if (rank) {
            return rank;
        // }
        // return byAlphabet(a, b);
    }

    var a;
    var b;
    function startDrag() {
        window.addEventListener("mousemove", drag);
        window.addEventListener("mouseup", stopDrag);
        var rect = this.getBoundingClientRect();
        a = {
            "x": window.scrollX + (rect.left + rect.right) / 2,
            "y": window.scrollY + (rect.top + rect.bottom) / 2
        };
    }

    function drag(e) {
        console.log(a, b);
        if (b) {
            linecontext.clearRect(
                Math.min(a.x, b.x) - 5,
                Math.min(a.y, b.y) - 5,
                Math.abs(b.x - a.x) + 10,
                Math.abs(b.y - a.y) + 10
            );
        }
        b = {
            "x": window.scrollX + e.x,
            "y": window.scrollY + e.y
        };
        linecontext.beginPath();
        linecontext.moveTo(a.x, a.y);
        linecontext.lineTo(b.x, b.y);
        linecontext.strokeStyle = "#fff";
        linecontext.lineWidth = 5;
        linecontext.stroke();
        linecontext.closePath();
    }

    function stopDrag(e) {
        linecontext.clearRect(
            Math.min(a.x, b.x) - 5,
            Math.min(a.y, b.y) - 5,
            Math.abs(b.x - a.x) + 10,
            Math.abs(b.y - a.y) + 10
        );
        window.removeEventListener("mousemove", drag);
        window.removeEventListener("mouseup", stopDrag);
        console.log(e.target.closest(".entry"));
    }

    for (var i = 0; i < plans.length; i++) {
        addEntry(i);
    }
    addTapListener(entryadd, addSelection);
    window.addEventListener("beforeunload", function () {
        localStorage.setItem("planner", JSON.stringify(plans));
    });
    document.getElementById("foot-planner").click();
}

function initFooter() {
    var footAbout = document.getElementById("foot-about");
    var footQA = document.getElementById("foot-qa");
    var footCalculate = document.getElementById("foot-calculate");
    var footPlanner = document.getElementById("foot-planner");
    var footClose = document.getElementById("foot-close");
    var timestamp = document.getElementById("timestamp");
    var toeAbout = document.getElementById("toe-about");
    var toeQA = document.getElementById("toe-qa");
    var toeCalculate = document.getElementById("toe-calculate");
    var toePlanner = document.getElementById("toe-planner");
    var toeClose = document.getElementById("toe-close");

    function initTimestamp() {
        var months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        var month = months[lastUpdate.getMonth()];
        var date = lastUpdate.getDate();
        var year = lastUpdate.getFullYear();
        timestamp.innerHTML = month + " " + date + ", " + year;
    }

    function costPlugins() {
        var plugins = [
            {
                "champion": [8, 3, 0, 0],
                "ultimate": [24, 20, 7, 6],
                "mega": [0, 0, 20, 17]
            },
            {
                "champion": [12, 5, 0, 0],
                "ultimate": [36, 30, 11, 9],
                "mega": [0, 0, 30, 26]
            },
            {
                "champion": [16, 6, 0, 0],
                "ultimate": [48, 40, 14, 12],
                "mega": [0, 0, 40, 34]
            },
            {
                "champion": [24, 9, 0, 0],
                "ultimate": [72, 60, 21, 18],
                "mega": [0, 0, 60, 51]
            },
            {
                "champion": [24, 9, 0, 0],
                "ultimate": [72, 60, 21, 18],
                "mega": [0, 0, 60, 51]
            },
            {
                "mega": [0, 0, 100, 85]
            }
        ];

        var gem = [gemelCore, gemel][settings.tree];
        var evols = ["in-training-i", "in-training-ii", "rookie", "champion", "ultimate", "mega"];
        var youngestIndex = 6;
        var oldestIndex = -1;
        var youngestMon = "";
        var oldestMon = "";
        var oldestMega = "";

        Array.from(gem.roots).forEach(function (root) {
            var evol = digi[root].evol;
            var evolIndex = evols.indexOf(evol);
            if (evolIndex < youngestIndex) {
                youngestIndex = evolIndex;
                youngestMon = root;
            }
            if (evolIndex > oldestIndex) {
                oldestIndex = evolIndex;
                oldestMon = root;
            }
            if (evol == "mega") {
                if (oldestMega == "") {
                    oldestMega = root;
                }
                else if (oldestMega != root) {
                    var oldestMegaTree = new Gemel(oldestMega);
                    if (oldestMegaTree.nodes.has(root)) {
                        var rootTree = new Gemel(root);
                        if (rootTree.nodes.size > oldestMegaTree.nodes.size) {
                            oldestMega = root;
                        }
                    }
                    else {
                        calculate.innerHTML = "Please narrow your selection to eliminate conflicting megas.";
                        return true;
                    }
                }
            }
        });
        var selectedEvols = evols.slice(youngestIndex + 1, oldestIndex + 1);
        console.log(selectedEvols);
        var selectedMegas = oldestMega == "" ? [] : [oldestMega];
        for (var mega of selectedMegas) {
            for (var prevmon of prev(mega)) {
                if (gem.nodes.has(prevmon) && !selectedMegas.includes(prevmon) && digi[prevmon].evol == "mega") {
                    selectedMegas.push(prevmon);
                }
            }
        }
        console.log(selectedMegas);
        if (selectedEvols.length == 0 && selectedMegas.length < 2) {
            calculate.innerHTML = "Please selected at least two Digimon.";
            return true;
        }

        var selectedTribe = {
            "in-training-i": "",
            "in-training-ii": "",
            "rookie": "",
            "champion": "",
            "ultimate": ""
        };
        Array.from(gem.nodes).forEach(function (node) {
            var evol = digi[node].evol;
            if (evol != "mega" && selectedEvols.includes(evol)) {
                var tribe = digi[node].tribe;
                if (selectedTribe[evol] == "") {
                    selectedTribe[evol] = tribe;
                }
                else if (selectedTribe[evol] != tribe) {
                    calculate.innerHTML = "Please narrow your selection to eliminate conflicting tribes.";
                    return true;
                }
            }
        });

        var selectedPlugins = {
            "mirage": [0, 0, 0, 0],
            "blazing": [0, 0, 0, 0],
            "glacier": [0, 0, 0, 0],
            "electric": [0, 0, 0, 0],
            "earth": [0, 0, 0, 0],
            "bright": [0, 0, 0, 0],
            "abyss": [0, 0, 0, 0]
        };
        var pluginCosts = plugins[settings.awkn];
        Array.from(selectedEvols).forEach(function (evol) {
            if (evol != "mega" && evol in pluginCosts) {
                for (var i = 0; i < 4; i++) {
                    selectedPlugins[selectedTribe[evol]][i] += pluginCosts[evol][i];
                }
            }
        });
        for (var mega of selectedMegas) {
            for (var i = 0; i < 4; i++) {
                selectedPlugins[digi[mega].tribe][i] += pluginCosts.mega[i];
            }
        }

        calculate.innerHTML = "This route (" + (digi[youngestMon].name) + " → " + (digi[oldestMega == "" ? oldestMon : oldestMega].name) + ") at awakening +" + settings.awkn + " costs<br>";
        for (var evol in selectedPlugins) {
            for (var i = 0; i < 4; i++) {
                if (selectedPlugins[evol][i]) {
                    var img = document.createElement("img");
                    img.className = "plugin";
                    img.src = "img/plugins/" + (i + 1) + "/" + evol + ".png";
                    img.alt = evol + (i + 1) + ".0";
                    calculate.innerHTML += selectedPlugins[evol][i] + " ";
                    calculate.appendChild(img);
                    calculate.innerHTML += ", ";
                }
            }
        }
        calculate.innerHTML += "<br> and maybe some other stuff (this thing only calculates plugins, and it's inaccurate for multiple megas).";
    }

    initTimestamp();
    hide(footAbout);
    hide(footQA);
    hide(footPlanner);
    hide(footCalculate);
    hide(footClose);
    addTapListener(aboutFoot, function () {
        show(footAbout);
        hide(footQA);
        hide(footCalculate);
        hide(footPlanner);
        show(footClose);
        updateLines();
    });
    addTapListener(qaFoot, function () {
        hide(footAbout);
        show(footQA);
        hide(footCalculate);
        hide(footPlanner);
        show(footClose);
        updateLines();
    });
    addTapListener(calculateFoot, function () {
        costPlugins();
        hide(footAbout);
        hide(footQA);
        show(footCalculate);
        hide(footPlanner);
        show(footClose);
        updateLines();
    });
    addTapListener(plannerFoot, function () {
        hide(footAbout);
        hide(footQA);
        hide(footCalculate);
        show(footPlanner);
        show(footClose);
        updateLines();
    });
    addTapListener(closeFoot, function () {
        hide(footAbout);
        hide(footQA);
        hide(footCalculate);
        hide(footPlanner);
        hide(footClose);
        updateLines();
    });

    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    document.body.appendChild(canvas);

    function exportPlanner() {
        var chars = localStorage.planner;
        var codes = [];
        for (var i = 0; i < chars.length; i++) {
            var code = chars.charCodeAt(i);
            if (code < 255) {
                codes.push(code);
            }
            else {
                var multiplier = Math.floor(code / 256)
                codes.push(255);
                codes.push(multiplier);
                codes.push(code - 256 * multiplier);
            }
        }
        var size = Math.ceil(Math.sqrt(codes.length / 3));
        while (codes.length < 3 * Math.pow(size, 2)) {
        	codes.push(0);
        }

        canvas.width = size;
        canvas.height = size;
        var imageData = context.createImageData(size, size);
        var d = 0;
        for (var i = 0; i < Math.pow(size, 2) * 4; i++) {
        	imageData.data[i] = codes[i - d];
        	if (!((i + 1) % 4)) {
        		imageData.data[i] = 255;
                d++;
            }
        }
        context.putImageData(imageData, 0, 0);

        return {codes:codes, chars:chars};
    }

    function importPlanner() {
        function skipAlpha(value, index) {
            return (index + 1) % 4;
        }

        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var data = Array.from(imageData.data);
        var codes = data.filter(skipAlpha);
        var chars = "";
        for (var i = 0; i < codes.length; i++) {
            if (codes[i] < 255) {
                if (codes[i] > 0) {
                    chars += String.fromCharCode(codes[i]);
                }
            }
            else {
                var code = 256 * codes[i + 1] + codes[i + 2];
                chars += String.fromCharCode(code);
                i += 2;
            }
        }

        return {codes:codes, chars:chars};
    }

    // var exported = exportPlanner();
    // var imported = importPlanner();
    //
    // var k = [0, 0, 0, [], []];
    // for (var i = 0; i < exported.codes.length; i++) {
    //     if (exported.codes[i] != imported.codes[i]) {
    //         k[i % 3] += 1;
    //         k[3].push(getChar(exported.codes[i]));
    //         k[4].push(getChar(imported.codes[i]));
    //     }
    // }
    // console.log(k);
    // console.log(exported.chars == imported.chars);
}

function initLineListeners() {
    var profileGroups = document.getElementsByClassName("profile-group");
    Array.from(profileGroups).forEach(function (profileGroup) {
        var scroller = profileGroup.parentNode;
        scroller.addEventListener("scroll", updateLines);
    });
    window.addEventListener("resize", updateLines);
}

window.addEventListener("DOMContentLoaded", init);
