"use strict";

function sayHi() {
    if (localStorage.getItem('username') != null && localStorage.getItem('username').length > 0) {
        revealClass('repeatVisitor');
        confirmIdentity();
    }
};
function beIntroduced() {
    localStorage.setItem('username', document.getElementById("usernameInput").value);
    makeIntroductions();
    revealClass('auth');
};
function makeIntroductions() {
    var username = localStorage.getItem('username') || 'Stranger';
    setClassInnerHTML('username', ' ' + username);
    concealID('usernameForm');
};
function confirmIdentity() {
    concealID('identityQuestion');
    revealClass('confirmedIdentity');
};
function reset() {
    localStorage.clear();
    window.location.reload();
};
//--- utility functions
function revealClass(className) {
    adjustDisplayForClass(className, 'inline');
};
function concealClass(className) {
    adjustDisplayForClass(className, 'none');
};
function revealID(id) {
    adjustDisplayForID(id, 'inline');
};
function concealID(id) {
    adjustDisplayForID(id, 'none');
};
function adjustDisplayForID(id, displayStyle) {
    document.getElementById(id).style.display = displayStyle;
};
function adjustDisplayForClass(className, displayStyle) {
    var elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++) {
        elements[i].style.display = displayStyle;
    }
};
function setClassInnerHTML(className, html) {
    var elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = html;
    }
};
