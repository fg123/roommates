/*
 * Roommates login: https://docs.felixguo.me/architecture/roommates/login.md
 */

const auth = require('../auth.js');
const path = require('path');
const express = require('express');
const router = express.Router();

router.get('/logout', function(req, res) {
    console.log('/login/logout');
    // Opens logout.html, which logs user out of Google's OAuth, then back out
    res.sendFile(path.join(__dirname, 'logout.html'));
});

router.get('/', function(req, res) {
    if (auth.isLoggedIn(req)) {
        res.redirect(307, '/');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

module.exports = router;
