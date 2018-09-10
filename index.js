/*
 * Main Router for Roommates
 */

const auth = require('./auth');
const express = require('express');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
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

app.get('/', function(req, res) {
    // Dashboard
    if (!auth.isLoggedIn(req)) {
        res.redirect('/login');
    } else {
        res.send('This is dashboard');
    }
});

app.use('/login', require('./login/index'));
app.get('/logout', function(req, res) {
    // Take user to api's logout this destroys the JS session
    console.log('/logout');
    res.redirect(307, '/api/logout');
});

app.use('/api', require('./api/index'));
app.listen(port);
console.log('Serving root on port ' + port);
