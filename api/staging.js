/*
 * Roommates API - Staging: https://docs.felixguo.me/architecture/roommates/core.md
 */

const clientId = '115168994184-ib3eggt9l4saeaf20bcn6sh5piourkut.apps.googleusercontent.com';
const auth = require('../auth.js');
const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(clientId);
const uuidv4 = require('uuid/v4');
const utils = require('./utils');

const USER_DB = 'users';
const GROUP_DB = 'groups';

function createNewUser(name, email, picture) {
    return {
        name: name,
        email: email,
        picture: picture,
        created_time: Date.now(),
        id: undefined,
        group_ids: [],
        invitations: []
    };
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
            req.db.collection(USER_DB).find({ id: payload.sub }).count(function(err, result) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                if (result === 0) {
                    req.db.collection(USER_DB).find({ email: payload.email }).toArray(function(err, user) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        console.log(user.length);
                        if (user.length > 0) {
                            req.db.collection(USER_DB).findOneAndUpdate(
                                {
                                    email: payload.email
                                }, {
                                    $set:
                                        {
                                            'name': payload.name,
                                            'picture': payload.picture,
                                            'created_time': Date.now(),
                                            'id': payload.sub

                                        }
                                }, { 
                                    returnOriginal: false  
                                }, function(err, updatedUser) {
                                    if (err) {
                                        utils.handleUnexpectedError(err, res);
                                        return;
                                    }
                                    req.session.user = updatedUser.value;
                                    console.log(updatedUser.value);
                                    res.send('ok');
                                }
                            );
                        } else {
                            let newUser = createNewUser(payload.name, payload.email, payload.picture);
                            newUser.id = payload.sub;
                            req.db.collection(USER_DB).insertOne(newUser, function(err) {
                                if (err) {
                                    utils.handleUnexpectedError(err, res);
                                    return;
                                }
                                req.session.user = newUser;
                                console.log(req.session.user);
                                res.send('ok');
                            });   
                        }
                    });
                } else {
                    console.log(payload.sub + ' is already in the database.');
                    req.db.collection(USER_DB).findOneAndUpdate(
                        {
                            id: payload.sub
                        }, {
                            $set: {
                                name: payload.name,
                                email: payload.email,
                                picture: payload.picture
                            }
                        }, { 
                            returnOriginal: false 
                        }, function(err, updatedUser) {
                            if (err) {
                                utils.handleUnexpectedError(err, res);
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
    const currentUserID = req.session.user.id;

    req.db.collection(USER_DB).find({ id: currentUserID }).toArray(function(err, user) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        req.db.collection(GROUP_DB).find({ id: { $in: user[0].group_ids }}).toArray(function(err, groups) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            user[0].group_ids = groups;
            req.db.collection(GROUP_DB).find({ id: { $in: user[0].invitations }}).toArray(function(err, invitations) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                user[0].invitations = invitations;
                res.send(user[0]);
            });
        });
    });
});

router.get('/user/:userId', function(req, res) {
    const userID = req.params.userId;
    
    const currentUserID = req.session.user.id;
    
    let query = [currentUserID, userID];

    if (userID == currentUserID) query = [userID];
    
    req.db.collection(GROUP_DB).find({ members: query }).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (result.length > 0){
            req.db.collection(USER_DB).find({ id: userID }).toArray(function(err, user){
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send(user[0]);
            });
        } else {
            res.status(404).send('This user does not exist.');
        }
    });
});

/* takes a group name, creates a unique ID and creates a group, joins user to group, 
then returns the new group */

router.post('/groups', function(req, res) { 
    const currentUserID = req.session.user.id;

    if (utils.invalidInput(req.body.name)){
        res.status(400).send('Invalid group name entered.');
        return;
    }

    let newGroup = {
        name: req.body.name,
        id: uuidv4(),
        created_time: new Date(),
        members: [currentUserID],
        pending: []
    };

    req.db.collection(GROUP_DB).insertOne(newGroup);

    req.db.collection(USER_DB).find({ id: currentUserID }).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        result = result[0];
        result.group_ids.push(newGroup.id);
        req.db.collection(USER_DB).updateOne(
            {
                id: currentUserID
            }, {
                $set:
                    {
                        'group_ids': result.group_ids
                    }
            }, function(err) {
                if (err){
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send(newGroup);
            });
    });
});

router.post('/group/:groupId/join', function(req, res) {
    const currentUserID = req.session.user.id;
    
    const groupID = req.params.groupId;

    req.db.collection(GROUP_DB).find({ id: groupID }).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }

        result = result[0];
        const index = result.pending.indexOf(currentUserID);

        if (index < 0){
            res.status(404).send('This group does not exist.');
            return;
        }
        const newPending = result.pending.filter(item => item !== currentUserID);        
        result.members.push(currentUserID);
        req.db.collection(GROUP_DB).updateOne(
            {
                id: groupID
            }, {
                $set:
                {
                    'members': result.members,
                    'pending': newPending
                }
            });

        req.db.collection(USER_DB).find({ id: currentUserID }).toArray(function(err, user) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            user = user[0];
            user.group_ids.push(groupID);
            req.db.collection(USER_DB).updateOne(
                {
                    id: currentUserID
                }, {
                    $set:
                    {
                        'group_ids': user.group_ids
                    }
                }, function(err) {
                    if (err){
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    res.status(200).send('ok');
                });
        });
    });
});

router.post('/group/:groupId/decline', function(req, res) {
    const currentUserID = req.session.user.id;
    
    const groupID = req.params.groupId;

    req.db.collection(GROUP_DB).find({ id: groupID }).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        result = result[0];
        const index = result.pending.indexOf(currentUserID);
        if (index < 0){
            res.status(404).send('Cannot decline invitation for this group.');
            return;
        }
        const newPending = result.pending.filter(item => item !== currentUserID);        
        req.db.collection(GROUP_DB).updateOne(
            {
                id: groupID
            }, {
                $set:
                {
                    'pending': newPending
                }
            }, function (err) {
                if (err){
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.status(200).send('ok');        
            });
    });
});

router.get('/group/:groupId', function(req, res) {
    const groupID = req.params.groupId;
    const currentUserID = req.session.user.id;
    
    req.db.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (result.length <= 0){
            res.status(404).send('This group does not exist.');
            return;
        }
        req.db.collection(USER_DB).find({ id: { $in: result[0].members }}).toArray(function(err, innerResult) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            result[0].members = innerResult;
            res.send(result[0]);
        });
    });
});

router.post('/group/:groupId/leave', function(req, res) {
    const groupID = req.params.groupId;

    const currentUserID = req.session.user.id;
    
    req.db.collection(GROUP_DB).find({ id: groupID }).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }

        result = result[0];
        const groupIndex = result.members.indexOf(currentUserID);

        if (result.length < 1 || groupIndex < 0){
            res.status(404).send('This group does not exist.');
            return;
        }

        const newMembers = result.members.filter(item => item !== currentUserID);
        req.db.collection(GROUP_DB).updateOne(
            {
                id: groupID
            }, {
                $set:
                {
                    'members': newMembers
                }
            }, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                req.db.collection(USER_DB).find({ id: currentUserID }).toArray(function(err, user) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    user = user[0];
                    const userIndex = user.group_ids.indexOf(groupID);
                    
                    if (userIndex < 0) {
                        res.status(404).send('The group you are trying to leaving does not exist');
                        return;
                    }
                    
                    const newGroupIDs = user.group_ids.filter(item => item !== groupID);
                    req.db.collection(USER_DB).updateOne(
                        {
                            id: currentUserID
                        }, {
                            $set:
                        {
                            'group_ids': newGroupIDs
                        }
                        }, function(err) {
                            if (err){
                                utils.handleUnexpectedError(err, res);
                                return;
                            }
                            res.status(200).send('ok');
                        });
                });
            });
    });
});

router.post('/group/:groupId/invite', function(req, res) {
    const groupID = req.params.groupId;
    const email = req.body.email;
    const currentUserID = req.session.user.id;
    
    if (utils.invalidInput(email)){
        res.status(400).send('Invalid email entered.');
        return;
    }

    req.db.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, group) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (group.length < 1) {
            res.status(403).send('You do not have authorization to make this request.');
            return;
        }
        req.db.collection(USER_DB).find({ email: email }).toArray(function(err, user) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }

            if (user.length > 0) {
                if (user[0].invitations.includes(groupID)) {
                    res.status(400).send('This user has already been invited to this group.');
                    return;
                }

                if (user[0].group_ids.includes(groupID)) {
                    res.status(400).send('This user is already part of this group.');
                    return;
                }

                user[0].invitations.push(groupID);
                
                req.db.collection(USER_DB).updateOne({
                    id: user[0].id
                }, {
                    $set:
                    {
                        'invitations': user[0].invitations
                    }
                }, function(err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    group[0].pending.push(email);

                    req.db.collection(GROUP_DB).updateOne({
                        id: groupID
                    }, {
                        $set:
                            {
                                'pending': group[0].pending
                            }
                    }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.status(200).send('ok');
                    });
                });
            } else {
                let newUser = createNewUser(undefined, email, undefined);
                newUser.invitations.push(groupID);

                req.db.collection(USER_DB).insertOne(newUser, function(err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                
                    group[0].pending.push(email);

                    req.db.collection(GROUP_DB).updateOne({
                        id: groupID
                    }, {
                        $set:
                        {
                            'pending': group[0].pending
                        }
                    }, function(err) {
                        if (err) {
                            utils.handleUnexpectedError(err, res);
                            return;
                        }
                        res.status(200).send('ok');
                    });
                });
            }
        });
    });
});

router.delete('/group/:groupId/invite', function(req, res) {
    const groupID = req.params.groupId;
    const email = req.body.email;
    const currentUserID = req.session.user.id;

    req.db.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, group) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (group.length < 1) {
            res.status(403).send('You do not have authorization to make this request.');
            return;
        }
        req.db.collection(USER_DB).find({ email: email }).toArray(function(err, user) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            if (utils.invalidInput(email) || user.length < 1){
                res.status(400).send('Invalid email entered.');
                return;
            }

            const newInvites = user[0].invitations.filter(item => item !== groupID);  

            req.db.collection(USER_DB).updateOne({
                email: email
            }, {
                $set:
                    {
                        'invitations': newInvites
                    }
            }, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                const newPending = group[0].pending.filter(item => item !== email);  

                req.db.collection(GROUP_DB).updateOne({
                    id: groupID
                }, {
                    $set:
                    {
                        'pending': newPending
                    }
                }, function(err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    res.status(200).send('ok');
                });                       
            });
        });
    });
});

router.all('/group/:groupId/*', function(req, res, next) {
    const groupID = req.params.groupId;
    const currentUserID = req.session.user.id;
    
    req.db.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, result) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (result.length <= 0){
            res.status(404).send('This group does not exist.');
            return;
        }
        next();
    });
});

router.all('/group/:groupId/groceries*', require('./groceries'));

module.exports = router;