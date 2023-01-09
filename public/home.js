//Send an XMLHttpRequest of type "method" to location "action" alongside "data" and execute callback() upon success
//If specified, expected_status is the expected successful response code
//If specified, error_callback() is called instead on non-success
function SendRequest(method, action, callback, expected_status=200, data=null, ctype="text/plain", error_callback=null) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === expected_status) {
            callback(this);
        }
        else if(this.readyState === 4 && error_callback) { error_callback(this); }
    };
    xhr.open(method, action);
    xhr.setRequestHeader("Content-Type", ctype);
    xhr.send(data);
}

function update(xhr) {
    let parser = new DOMParser();
    let xml = parser.parseFromString(decodeURIComponent(xhr.responseText), "text/xml");
    //Put this user's first and last name in "name" classed locations
    let name = xml.getElementsByTagName('name')[0].childNodes[0].nodeValue;
    let name_fields = document.getElementsByClassName('name');
    for(let name_field of name_fields) {
        if(name_field.innerHTML != name) {
            name_field.innerHTML = name;
        }
    }
    //Enumerate this user's accounts in the "accounts" block if they have any
    let accounts = xml.getElementsByTagName('account');
    if(accounts) {
        document.getElementById("accounts").innerHTML = "<tr><th>Account ID</th><th>Balance</th></tr>";
        let first = true;
        for(let account of xml.getElementsByTagName('account')) {
            let id = account.getElementsByTagName("id")[0].childNodes[0].nodeValue;
            let balance = account.getElementsByTagName('balance')[0].childNodes[0].nodeValue;
            //Insert this account as an option in all selection forms
            let options = '<option value="'+id+'">'+id+'</option>';
            for(let selector of document.getElementsByTagName('select')) {
                selector.innerHTML = first ? options : selector.innerHTML + options;
            }
            first = false;
            //Display this account in the table
            document.getElementById("accounts").innerHTML += "<tr><td>" + id
                + "</td><td>" + balance;
                + "</td></tr>";
        }
    }
}

function createAcc() {
    SendRequest("GET", "create", function() { SendRequest("GET", "status", update); }, 201);
    //We could parse the new account directly here but sending another update request is easier
}

//For a user transferring money between their accounts
//The server handles validation
function transfer() {
    //Place the selections and amount into XML format
    let data = "<transfer><account><id>" + encodeURIComponent(document.getElementById("t_from").value) + "</id></account>"
        + "<account><id>" + encodeURIComponent(document.getElementById("t_to").value) + "</id></account>"
        + "<amount>" + encodeURIComponent(parseFloat(document.getElementById("t_amt").value)) + "</amount></transfer>";
    SendRequest("POST", "transfer", function() { SendRequest("GET", "status", function(xhr) { update(xhr); alert("Success!"); }); }, 200, data, "application/xml",
        function(xhr) { alert(xhr.responseText); });
}

//For a user depositing into their account
//The server handles validation
function deposit() {
    let data = "<deposit><account><id>" + encodeURIComponent(document.getElementById("into").value) + "</id></account>"
        + "<amount>" + encodeURIComponent(parseFloat(document.getElementById("d_amt").value)) + "</amount></deposit>";
    SendRequest("POST", "deposit", function() { SendRequest("GET", "status", function(xhr) { update(xhr); alert("Success!"); }); }, 200, data, "application/xml",
        function(xhr) { alert(xhr.responseText); });
}

//For a user withdrawing from an account
//The server handles validation
function withdraw() {
    let data = "<withdraw><account><id>" + encodeURIComponent(document.getElementById("outof").value) + "</id></account>"
        + "<amount>" + encodeURIComponent(parseFloat(document.getElementById("w_amt").value)) + "</amount></withdraw>";
    SendRequest("POST", "withdraw", function() { SendRequest("GET", "status", function(xhr) { update(xhr); alert("Success!"); }); }, 200, data, "application/xml",
        function(xhr) { alert(xhr.responseText); });
}

function unhide(elem) {
    if(elem && elem.nextElementSibling) {
        elem.nextElementSibling.hidden = !elem.nextElementSibling.hidden;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    SendRequest("GET", "status", update);
    for(let expando of document.getElementsByClassName("expando")) {
        expando.addEventListener('click', function() { unhide(expando); });
    }
    document.getElementById("create").addEventListener('click', createAcc);
    document.getElementById("t_btn").addEventListener('click', transfer);
    document.getElementById("d_btn").addEventListener('click', deposit);
    document.getElementById("w_btn").addEventListener('click', withdraw);
});
