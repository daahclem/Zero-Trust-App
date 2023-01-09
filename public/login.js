'use strict'

function attemptLogin(e) {
    let fname = encodeURIComponent(document.getElementById("first_name").value);
    let lname = encodeURIComponent(document.getElementById("last_name").value);
    let pwd = encodeURIComponent(document.getElementById("pwd").value);
    if(!fname || !lname || !pwd) { return 1; }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if(this.readyState === 4) {
            if(this.status !== 200) { alert(this.responseText); }
            else { window.location.href = '/'; }
        }
    };
    xhr.open("POST", "login");
    let data = "<user><first_name>" + fname + "</first_name>" +
        "<last_name>" + lname + "</last_name>" +
        "<password>" + pwd + "</password></user>";
    xhr.setRequestHeader("Content-Type", "application/xml");
    xhr.send(data);
}

function register() {
    window.location.href = '/register.html';
}

document.addEventListener('DOMContentLoaded', function() {
    let login_btn = document.getElementById("login_btn");
    login_btn.addEventListener('click', attemptLogin);
    let inputs = document.querySelectorAll("input");
    for(let i=0; i<inputs.length; i++) {
        inputs[i].addEventListener("keyup", function(e) {
            if(e.keyCode && e.keyCode === 13) {
                document.getElementById("login_btn").click();
            }
        }, true);
    }
    document.getElementById("register_btn").addEventListener('click', register);
});
