const mysql = require("mysql");

const a = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"org_renewal"
});

//connect to app.js
module.exports = a; 