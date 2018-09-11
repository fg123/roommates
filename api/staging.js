/*
 * Roommates API - Staging: https://docs.felixguo.me/architecture/roommates/core.md
 */

const clientId = '115168994184-ib3eggt9l4saeaf20bcn6sh5piourkut.apps.googleusercontent.com';
const auth = require('../auth.js');
const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(clientId);

router.get('/auth', function(req, res) {
    res.send('ok');
});

router.post('/login', function(req, res) {
    auth.login(req);
    async function verifyAndGetPayload() {
        const ticket = await client.verifyIdToken({
            idToken: req.body.id_token,
            audience: clientId
        });
        return ticket.getPayload();
    }
    verifyAndGetPayload()
        .then(payload => {
            console.log(payload);
            // Construct user. Since Google gives up to date info, we should
            // update database with new info if it's different (always use Google)
            // as source of truth.
            req.session.user = {
                name: payload.name,
                email: payload.email,
                picture: payload.picture,

                // taken from database
                created_time: 1535996325,
                id: 12345
            };
            res.send('ok');
        })
        .catch(err => {
            console.error(err);
            res.status(401).send('error verifying google token');
        });
});

router.get('/logout', function(req, res) {
    auth.logout(req);
    res.redirect(307, '/login/logout');
});

router.get('/user', function(req, res) {
    res.send(req.session.user);
});

router.get('/user/:userId', function(req, res) {
    // req.params.userId
    res.send('ok');
});

router.get('/groups', function(req, res) {
    // Should be returned in reverse chronological order
    res.send([
        {
            name: '181 Fall 2018',
            id: 3,
            created_time: 1535996325
        },
        {
            name: '181 Spring 2017',
            id: 2,
            created_time: 1535996324
        },
        {
            name: '181 Fall 2017',
            id: 1,
            created_time: 1535996323
        }
    ]);
});

module.exports = router;
