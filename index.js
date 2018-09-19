/*
 * Main Router for Roommates
 */

const auth = require('./auth');
const express = require('express');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

app.use(
    session({
        // This means when we redeploy, users will have to sign in again, since
        // the encryption method will be different. We could also use a single
        // string secret instead of generating randomly.
        secret: uuidv4(),
        resave: false,
        saveUninitialized: true
        //	cookie: { secure: true* }
    })
);

app.use('/login', require('./login/index'));
app.get('/logout', function(req, res) {
    // Take user to api's logout this destroys the JS session
    console.log('/logout');
    res.redirect(307, '/api/logout');
});

app.use('/api', require('./api/index'));
app.use('/api/staging', require('./api/staging'));

app.use('/static', express.static('./static'));

app.use('/', function(req, res, next) {
    if (!auth.isLoggedIn(req)) {
        res.redirect('/login');
    } else {
        req.url = `/dashboard/${req.url}`; 
    } // req.url = `/dashboard/${req.url}`;
    next();
});

app.use('/dashboard', express.static('./dashboard'));

app.listen(port);
console.log('Serving root on port ' + port);
