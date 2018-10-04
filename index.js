/*
 * Main Router for Roommates
 */

const auth = require('./auth');
const express = require('express');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
const bodyParser = require('body-parser');
const expressMongoDb = require('express-mongo-db');

const USER_DB = 'users';
const GROUP_DB = 'groups';
const GROCERY_DB = 'groceries';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressMongoDb(process.env.MONGO_URL || 'mongodb://localhost:27017/roommate', { useNewUrlParser: true }, function(err, db) {
    db.collection(USER_DB).createIndex('id');
    db.collection(GROUP_DB).createIndex('id');
    db.collection(GROCERY_DB).createIndex('id');
}));

const port = process.env.PORT || 3000;
const sessionOptions = {
    // This means when we redeploy, users will have to sign in again, since
    // the encryption method will be different. We could also use a single
    // string secret instead of generating randomly.
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production'
    }
};

app.use(session(sessionOptions));

app.use('/login', require('./login/index'));
app.get('/logout', function(req, res) {
    // Take user to api's logout this destroys the JS session
    console.log('/logout');
    res.redirect(307, '/api/logout');
});

app.use('/api', require('./api/index'));

app.use('/static', express.static('./static'));

app.use('/', function(req, res, next) {
    if (!auth.isLoggedIn(req)) {
        res.redirect('/login');
    } else {
        req.url = `/dashboard/dist/${req.url}`;
    }
    next();
});

app.use('/dashboard', express.static('./dashboard'));

app.listen(port);
console.log('Serving root on port ' + port);
