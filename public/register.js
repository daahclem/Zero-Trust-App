'use strict'

//Submission script derived from https://stackoverflow.com/a/19843756
function submitForm(e) {
    let form = e.currentTarget;
    if(!validatePassword()) { return; }
    if(!form.checkValidity()) { return; }
    e.preventDefault();
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState === 4) {
            if(this.status === 201) {
                window.location.href = "/";
            }
            else { alert(this.responseText); }
        }
    };
    xhr.open("POST", form.action, true);
    //The form elements need to be encoded so the XML parser in the server doesn't get confused
    let data = "<user><first_name>" + encodeURIComponent(form.fname.value) + "</first_name>" +
        "<last_name>" + encodeURIComponent(form.lname.value) + "</last_name>" +
        "<address>" + encodeURIComponent(form.address.value) + "</address>" +
        "<password>" + encodeURIComponent(form.pwd.value) + "</password></user>";
    /*Note: I tested trying to sneak already-encoded text into the password e.g. "%%253"
        -   js' encoding and decoding scheme is smart enough to keep the password exactly as it was originally after decoding */
    xhr.setRequestHeader("Content-Type", "application/xml");
    xhr.send(data);
}
function validatePassword() {
    let pwd = document.getElementById("pwd");
    if(/(.)\1\1/.test(pwd.value)) {
        pwd.setCustomValidity("Password must not contain 3 of the same character in a row.");
        return false;
    }
    let criteria = 0;
    if(/[a-z]/.test(pwd.value)) { criteria++; }
    if(/[A-Z]/.test(pwd.value)) { criteria++; }
    if(/[0-9]/.test(pwd.value)) { criteria++; }
    if(/[ !@#$%^&*)(_\-+=}\]{\["':;?/>.<,]/.test(pwd.value)) { criteria++; }
    let pwd_requirements = document.getElementById("pwd_requirements");
    if(criteria < 3) {
        pwd.setCustomValidity("Password does not meet requirements.");
        pwd_requirements.hidden=false;
        return false;
    }
    else {
        pwd.setCustomValidity("");
        pwd_requirements.hidden=true;
    }
    let confirm_pwd = document.getElementById("confirm_pwd");
    if(pwd.value !== confirm_pwd.value) {
        confirm_pwd.setCustomValidity("Passwords must match.");
        return false;
    } else {
        confirm_pwd.setCustomValidity("");
        return true;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let form = document.getElementById('reg_form');
    form.addEventListener('submit', submitForm, false);
    document.getElementById('pwd').addEventListener('keyup', validatePassword);
    document.getElementById('confirm_pwd').addEventListener('keyup', validatePassword);
});
