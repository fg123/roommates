/*
 * Roommates API - Staging: https://docs.felixguo.me/architecture/roommates/core.md
 */

const clientId = '115168994184-ib3eggt9l4saeaf20bcn6sh5piourkut.apps.googleusercontent.com';
const auth = require('../auth.js');
const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(clientId);
const uuidv4 = require('uuid/v4');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// This is a global variable we'll use for handing the MongoDB client
let mongodb;

// Connection URL
const url = 'mongodb://localhost:27017/roommate';

const USER_DB = 'users';
const GROUP_DB = 'groups';

// Create the db connection
MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {  
    assert.equal(null, err);
    mongodb = db.db();
});

function handleUnexpectedError(err, res) {
    res.status(500).send('An unexpected error occurred during database operation.');
    console.err(err);
}

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
            mongodb.collection(USER_DB).find({ id: payload.sub }).count(function(err, result) {
                if (err) {
                    handleUnexpectedError(err, res);
                    return;
                }
                if (result === 0) {
                    const newUser = {
                        name: payload.name,
                        email: payload.email,
                        picture: payload.picture,
                        created_time: Date.now(),
                        id: payload.sub,
                        group_ids: []
                    };
                    mongodb.collection(USER_DB).insertOne(newUser);
                    req.session.user = newUser;
                    console.log(req.session.user);
                    res.send('ok');
                } else {
                    console.log(payload.sub + ' is already in the database.');
                    mongodb.collection(USER_DB).findOneAndUpdate(
                        {
                            id: payload.sub
                        }, {
                            $set: {
                                name: payload.name,
                                email: payload.email,
                                picture: payload.picture
                            }
                        }, { 
                            returnNewDocument: true 
                        }, function(e, updatedUser) {
                            if (e) {
                                handleUnexpectedError(e, res);
                                return;
                            }
                            req.session.user = updatedUser.value;
                            console.log(updatedUser.value);
                            res.send('ok');
                        }
                    );
                }
            });
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
    const userID = req.params.userId;
    
    const currentUserID = req.session.user.id;
    
    let query = [currentUserID, userID];

    if (userID == currentUserID) query = [userID];
    
    mongodb.collection(GROUP_DB).find({ members: query }).toArray(function(err, result) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (result.length > 0){
            mongodb.collection(USER_DB).find({ id: userID }).toArray(function(e, r){
                if (e) {
                    handleUnexpectedError(e, res);
                    return;
                }
                res.send(r[0]);
            });
        } else {
            res.status(403).send('You are not authorized to get this user\'s info/this user may not exist.');
        }
    });
});

router.get('/groups', function(req, res) {
    // Should be returned in reverse chronological order
    const currentUserID = req.session.user.id;

    mongodb.collection(GROUP_DB).find({ $or: [ { members: currentUserID }, 
        { pending: currentUserID} ] }).sort({ pending: -1, created_time: -1 }).toArray(function(err, result) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        res.send(result);
    });
});

/* takes a group name, creates a unique ID and creates a group, joins user to group, 
then returns the new group */

router.post('/groups', function(req, res) { 
    const currentUserID = req.session.user.id;

    let newGroup = {
        name: req.body.name,
        id: uuidv4(),
        created_time: new Date(),
        members: [currentUserID],
        pending: []
    };

    mongodb.collection(GROUP_DB).insertOne(newGroup);

    mongodb.collection(USER_DB).find({ id: currentUserID }).toArray(function(err, result) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        result = result[0];
        result.group_ids.push(newGroup.id);
        mongodb.collection(USER_DB).updateOne(
            {
                id: currentUserID
            }, {
                $set:
                    {
                        'group_ids': result.group_ids
                    }
            }, function(e, r) {
                if (e){
                    handleUnexpectedError(e, res);
                    return;
                }
                res.send(newGroup);
            });
    });

    
});

router.post('/group/:groupId/join', function(req, res) {
    const currentUserID = req.session.user.id;
    
    const groupID = req.params.groupId;

    mongodb.collection(GROUP_DB).find({ id: groupID }).toArray(function(err, result) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        result = result[0];
        const index = result.pending.indexOf(currentUserID);
        if (index > -1){
            let newPending = result.pending.splice(index, 1);
            result.members.push(currentUserID);
            if (index < 1) newPending = [];
            mongodb.collection(GROUP_DB).updateOne(
                {
                    id: groupID
                }, {
                    $set:
                    {
                        'members': result.members,
                        'pending': newPending
                    }
                });

            mongodb.collection(USER_DB).find({ id: currentUserID }).toArray(function(e, r) {
                if (e) {
                    handleUnexpectedError(e, res);
                    return;
                }
                r = r[0];
                r.group_ids.push(groupID);
                mongodb.collection(USER_DB).updateOne(
                    {
                        id: currentUserID
                    }, {
                        $set:
                        {
                            'group_ids': r.group_ids
                        }
                    }, function(er, re) {
                        if (er){
                            handleUnexpectedError(er, res);
                            return;
                        }
                        res.status(200).send('ok');
                    });
            });
        } else {
            res.status(403).send('No invite recieved for this group.');
        }
    });
});

router.post('/group/:groupId/decline', function(req, res) {
    const currentUserID = req.session.user.id;
    
    const groupID = req.params.groupId;

    mongodb.collection(GROUP_DB).find({ id: groupID }).toArray(function(err, result) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        result = result[0];
        const index = result.pending.indexOf(currentUserID);
        if (index > -1){
            let newPending = result.pending.splice(index, 1);
            if (index < 1) newPending = [];
            mongodb.collection(GROUP_DB).updateOne(
                {
                    id: groupID
                }, {
                    $set:
                    {
                        'pending': newPending
                    }
                }, function (e, r) {
                    if (e){
                        handleUnexpectedError(e, res);
                        return;
                    }
                    res.status(200).send('ok');        
                });
        } 
        else {
            res.status(403).send('Cannot decline invitation for this group.');
        }
    });
});

router.get('/group/:groupId', function(req, res) {
    const groupID = req.params.groupId;
    
    const currentUserID = req.session.user.id;
    
    mongodb.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, result) {
        console.log(result);
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (result.length > 0){
            mongodb.collection(USER_DB).find({ id: { $in: result[0].members }}).toArray(function(e, innerResult) {
                if (e) {
                    handleUnexpectedError(e, res);
                    return;
                }
                result[0].members = innerResult;
                res.send(result[0]);
            });
        } else {
            res.status(404).send('You are not authorized to get this group\'s info/this group may not exist.');
        }
    });
});

module.exports = router;