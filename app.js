'use strict'

const express = require("express");
const app = express();
app.use(express.static('public'));
const https = require("https");
const fs = require("fs");
const https_options = {
  key: fs.readFileSync("aequiz3.key"),
  cert: fs.readFileSync("aequiz3.crt")
};
const bodyParser = require("body-parser");
require("body-parser-xml")(bodyParser);
app.use(bodyParser.xml({
    xmlParseOptions: {
        explicitArray: false //Only use array if >1
    }
}));
const parseString = require("xml2js").parseString;
const xssFilters = require("xss-filters");
const mysql = require('mysql2');
var db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '1234Kwadwo',
    database: 'bank'
});
const bcrypt = require("bcrypt");
const bcrypt_saltRounds = 3;
const csp = require("helmet-csp");
app.use(csp({
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'","'unsafe-inline'"]
    },
}));
const session = require("client-sessions");
app.use(session({
    cookieName: "session",
    secret: "gd89s7fd89sgSADIFJ(#$RL@#SAGd897gfidgd",
    duration: 180000, //3 Minutes
    activeDuration: 180000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));

/*const bankDbFile = __dirname + '/bank_db';
const initDbFile = __dirname + '/init_db.sql';

Check if db exists and if not create it
if(!fs.existsSync(bankDbFile)) {
    if(!fs.existsSync(initDbFile)) {
        console.log("You need to create " + initDbFile + "!");
        return;
    }
    //Read the schema SQL from init_db.sql
    let data = fs.readFileSync(initDbFile, 'utf8');
    if(!data) {
        console.log("Failed to read " + initDbFile);
        console.log("Skipping creation of database...");
        return;
    }
    db.query(bankDbFile, (err, dbres) => {
        if(err) {
            console.log(err);
        }
        else {
            console.log("Initialized the database schema");
        }
    });
}*/

app.get('/', function(req, res) {
    if(!req.session || !req.session.user) {
        res.redirect("/login");
    }
    else {
        res.sendFile(__dirname + "/index.html");
    }
});

//@status - sends the user's name and accounts as XML
app.get('/status', function(req, res) {
    if(!req.session || !req.session.user) {
        res.redirect("/login");
    }
    else {
        res.set("Content-Type", "application/xml");
        let xml = "<user><name>" + req.session.name + "</name>";
        //Get the user's account info from the database
        let sql = mysql.format("SELECT acc_id,balance FROM accounts WHERE user_id=?", [req.session.user]);
        db.query(sql, function(err, dbres) {
            if(!err && dbres && dbres.length > 0) {
                for(let account of dbres) {
                    xml += "<account><id>" + account.acc_id + "</id>"
                        + "<balance>" + account.balance + "</balance></account>";
                }
            }
            xml += "</user>";
            res.send(xml);
        });
    }
});

app.get('/create', function(req, res) {
    if(req.session && req.session.user) {
        let query = db.format("INSERT INTO accounts(balance,user_id) VALUES (?, ?)", [0, req.session.user]);
        db.query(query, function(err) {
            if(err) {
                res.status(503).send("Failed to create a new account - please try again later");
                return;
            }
            res.setHeader("Content-Type", "application/xml");
            res.status(201).send("<account><id>" + this.lastID + "</id><balance>0</balance></account>");
        });
    }
    else {
        req.session.reset();
        res.redirect("/");
    }
});

//Pretending the non-existent money is magically accepted on a deposit
//Values smaller than a cent (10^-3) are truncated/ignored
app.post('/deposit', function(req, res) {
    if(!req.session || !req.session.user) {
        req.session.reset();
        res.redirect("/");
        return;
    }
    let data = req.body["deposit"];
    if(data.amount) {
        data.amount = Number(Number(decodeURIComponent(data.amount)).toFixed(2)); //Can't go smaller than 1 cent
    }
    if(!data.amount || data.amount <= 0.009 || data.amount > Number.MAX_VALUE) {
        res.status(400).send("Invalid amount specified!");
        return;
    }
    let query = db.format("SELECT balance FROM accounts WHERE user_id=? AND acc_id=?", [req.session.user, data.account.id]);
    db.query(query, function(err, rows) {
        if(err || !rows) {
            console.log(err);
            res.status(400).send("Invalid source account!");
            return;
        }
        let row = rows[0];
        db.query(db.format("UPDATE accounts SET balance=? WHERE acc_id=?", [Number(row.balance+data.amount).toFixed(2), data.account.id]), function(err) {
            if(err) {
                console.log(err);
                res.status(503).send();
                return;
            }
            res.status(200).send();
        });
    });
});

//Pretending the non-existent money magically gets sent somewhere on a withdrawal
//Values smaller than a cent are truncated/ignored
app.post('/withdraw', function(req, res) {
    if(!req.session || !req.session.user) {
        req.session.reset();
        res.redirect("/");
        return;
    }
    let data = req.body["withdraw"];
    if(data.amount) {
        data.amount = Number(Number(decodeURIComponent(data.amount)).toFixed(2)); //Can't go smaller than 1 cent
    }
    if(!data.amount || data.amount <= 0.009 || data.amount > Number.MAX_VALUE) {
        res.status(400).send("Invalid amount specified!");
        return;
    }
    db.query(db.format("SELECT balance FROM accounts WHERE user_id=? AND acc_id=?",[req.session.user, data.account.id]), function(err, rows) {
        if(err || !rows) {
            console.log(err);
            res.status(400).send("Invalid source account!");
            return;
        }
        let row = rows[0];
        if(Number(row.balance) < data.amount) {
            res.status(400).send("Account funds are insufficient for the specified value.");
            return;
        }
        db.query(db.format("UPDATE accounts SET balance=? WHERE acc_id=?", [Number(row.balance-data.amount).toFixed(2), data.account.id]), function(err) {
            if(err) {
                console.log(err);
                res.status(503).send();
                return;
            }
            res.status(200).send();
        });
    });
});

//For a user transferring dosh between their Accounts
//Values smaller than a cent are truncated/ignored
app.post('/transfer', function(req, res) {
    if(!req.session || !req.session.user) {
        req.session.reset();
        res.redirect("/");
        return;
    }
    let data = req.body["transfer"];
    data.amount = Number(Number(decodeURIComponent(data.amount)).toFixed(2)); //Can't go smaller than 1 cent
    if(data && data["account"] && data["account"][0] && data["account"][1]) {
        if(data["account"][0].id === data["account"][1].id) {
            res.status(400).send("Source and Destination account must be different!");
            return;
        }
    }
    db.query(db.format("SELECT * FROM accounts WHERE user_id=?", [req.session.user]), function(err, rows) {
        let from = null;
        let to = null;
        for(let row of rows) {
            if(row.acc_id === parseInt(decodeURIComponent(data.account[0].id))) { from = row; }
            else if(row.acc_id === parseInt(decodeURIComponent(data.account[1].id))) { to = row; }
            if(from && to) { break; }
        }
        if(!from) { res.status(400).send("Invalid source account!"); return; }
        else if(!to) { res.status(400).send("Invalid destination account!"); return; }
        else if(from.balance >= data.amount && data.amount >= 0.01) {
            db.beginTransaction(function(err) {
                let query = "UPDATE accounts SET balance=? WHERE acc_id=?";
                let on_err = function(err) {
                    return db.rollback(function() { throw err; res.status(503).send(); });
                };
                db.query(db.format(query, [from.balance-data.amount,from.acc_id]), function(err) {
                    if(err) { on_err(err); return; }
                });
                db.query(db.format(query, [to.balance+data.amount,to.acc_id]), function(err) {
                        if(err) { on_err(err); return; }
                });
                db.commit(function(err) {
                    if(err) { on_err(err); return; }
                    res.status(200).send("Transferred!");
                });
            });
        }
        else { res.status(400).send("An invalid quantity was specified!"); }
    });
});

app.get('/login', function(req, res) {
    res.sendFile(__dirname + "/login.html");
});

app.post('/login', function(req, res) {
    if(!db) { res.status(503).end(); } //Can't login if the db is down
    if(req.session.attempts && req.session.attempts > 5) {
        res.status(403).send("You have failed to login too many times, please try again later.");
    }
    let form_data = req.body["user"];
    //Decode the XML-escapes
    let first_name = decodeURIComponent(form_data.first_name);
    let last_name = decodeURIComponent(form_data.last_name);
    let pwd = decodeURIComponent(form_data.password);
    //Find this user in the database
    let query = db.format("SELECT * FROM users WHERE first_name=? AND last_name=?", [first_name, last_name]);
    db.query(query, function(err, rows) {
        if(err || !rows) {
            if(err) { console.log(err); }
            res.status(404).send("No such user");
            return;
        }
        else {
            //bcypt compares the password hash+salt from the database to the plaintext form password
            bcrypt.compare(pwd, rows[0].pwd_hash, function(err, valid) {
                if(valid == true) {
                    //Save the user's info from the database for quick future lookups and to serve as their session
                    req.session.user = rows[0].user_id;
                    //Encoding special characters because the name will be used in html and/or javascript contexts
                    //This should have happened already when the account was created so this may be redundant
                    req.session.name = xssFilters.inHTMLData(rows[0].first_name) + " " + xssFilters.inHTMLData(rows[0].last_name);
                    res.redirect("/");
                }
                else {
                    res.status(401).send("Incorrect password.");
                    if(req.session.attempts) {
                        req.session.attempts++;
                        console.log(req.session.attempts + " failed attempts to login as " + first_name + " " + last_name);
                    } else { req.session.attempts = 1; }
                    return;
                }
            });
        }
    });
});
app.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect("/");
});
app.get('/register.html', function(req, res) {
    res.sendFile(__dirname + "/register.html");
});
//Validate the data a user tries to register with
//On invalid, return BAD REQUEST.
//The front-end is also performing validation, so invalid requests should only happen if they bypass it somehow.
app.post('/register.html', async function(req, res) {
    if(!db) { res.status(503).end(); } //Can't create users if the db is down
    let form_data = req.body["user"];
    //First decode the XML-escapes, but then escape for HTML use with xssFilters
    let first_name = xssFilters.inHTMLData(decodeURIComponent(form_data.first_name));
    let last_name = xssFilters.inHTMLData(decodeURIComponent(form_data.last_name));
    let address = xssFilters.inHTMLData(decodeURIComponent(form_data.address));
    let pwd = decodeURIComponent(form_data.password);
    //Check if the password meets OWASP's requirements from https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authentication_Cheat_Sheet.md#password-complexity
    //Note: these are the same requirements the front-end attempts to enforce
	if(!pwd || pwd.length < 10 || /(.)\1\1/.test(pwd)) { //regex for checking 3 of the same character in a row
		res.status(400).send("Password does not meet requirements");
        return;
	}
    //Checking password complexity via regex
	let criteria = 0;
	if(/[a-z]/.test(pwd)) { criteria++; }
	if(/[A-Z]/.test(pwd)) { criteria++; }
	if(/[0-9]/.test(pwd)) { criteria++; }
	if(/[ !@#$%^&*)(_\-+=}\]{\["':;?/>.<,]/.test(pwd)) { criteria++; }
	if(criteria < 3) {
        res.status(400).send("Password does not meet requirements"); //Password does not meet complexity requirements
        return;
    }
    //Check to see if the supplied name and address are reasonable
    let name_reg = /[a-zA-Z]{2,32}/;
    let address_reg = /[a-zA-Z0-9&,.# -]{4,128}/;
    if(!name_reg.test(first_name) || !name_reg.test(last_name) || !address_reg.test(address)) {
        res.status(400).send("Name or address is invalid");
        return;
    }
    //Everything is fine, add this person to the database
    //Using prepared statements to prevent injection
    let query = "INSERT INTO users(first_name,last_name,address,pwd_hash) VALUES(?,?,?,?)";
    bcrypt.hash(pwd, bcrypt_saltRounds, function(err, pwd_hash) {
        if(err) {
            throw err;
            return res.status(503).send();
        }
        db.query(db.format(query, [first_name,last_name,address,pwd_hash]), function(dberr, dbres) {
            if(dberr) {
                console.log(dberr);
                res.status(409).send("User already exists");
                return;
            }
            console.log("Created new user " + first_name + " " + last_name + " from " + address);
            //Setting up the session using their newly assigned primary key
            req.session.user = dbres.insertId;
            req.session.name = first_name + " " + last_name; //These are filtered above to be ok in HTML context
            let query2 = "INSERT INTO accounts(balance,user_id) VALUES(?, ?)";
            db.query(db.format(query2, [0, req.session.user])); //Give the new user a default, empty account
            res.redirect(201, "/");
        });
    });
});

//app.listen(3000);
https.createServer(https_options, app).listen(3000);

process.on('SIGTERM', () => {
    if(db) {
        db.end();
    }
    server.close();
});
