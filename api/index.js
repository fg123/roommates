/*
 * Roommates API: https://docs.felixguo.me/architecture/roommates/core.md
 */

const auth = require('../auth.js');
const router = require('express').Router();

router.get('/auth', function(req, res) {
    res.send('ok');
});

router.post('/login', function(req, res) {
    console.log('LOGIN FROM API');
    auth.login(req);
    res.send('ok');
});

router.get('/logout', function(req, res) {
    // API's logout takes you to login/logout, which logs out of the
    // Google's OAuth
    console.log('/api/logout');
    auth.logout(req);
    res.redirect(307, '/login/logout');
});

router.get('/user', function(req, res) {
    res.send('ok');
});

router.get('/user/:userId', function(req, res) {
    // req.params.userId
    res.send('ok');
});

router.get('/groups', function(req, res) {
    res.send('ok');
});

module.exports = router;
