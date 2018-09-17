/*
 * Roommates API - Staging: https://docs.felixguo.me/architecture/roommates/core.md
 */

const clientId = '115168994184-ib3eggt9l4saeaf20bcn6sh5piourkut.apps.googleusercontent.com';
const auth = require('../auth.js');
const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(clientId);
var url = 'mongodb://localhost:27017';
var MongoClient = require('mongodb').MongoClient;
const uuidv4 = require('uuid/v4');

const bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

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
            // Construct user. Since Google gives up to date info, we should
            // update database with new info if it's different (always use Google)
            // as source of truth.
            req.session.user = {
                name: payload.name,
                email: payload.email,
                picture: payload.picture,

                // taken from database
                created_time: Date.now(),
                id: payload.sub,
                group_id: []
            };
            res.send('ok');

            console.log(req.session.user);

            var currentUserID = req.session.user.id;

            MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                if (err) throw err;
                
                const dbase = db.db('roommate');
                console.log('Connected to ' + dbase.databaseName + ' database!');

                dbase.collection('user').find({ id: currentUserID }).count(function(err, result) {
                    if (err) throw err;
                    if (result === 0){
                        dbase.collection('user').insertOne(req.session.user);
                        console.log(currentUserID);
                    } else {
                        console.log(currentUserID + ' is already in the database.');
                        dbase.collection('user').updateOne(
                            {
                                id: currentUserID
                            },{
                                $set:
                                {
                                    'name': payload.name,
                                    'email': payload.email,
                                    'picture': payload.picture,
                                }
                            });
                    }
                    db.close();
                });
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
    var userID = req.params.userId;
    res.send('ok');
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {

        var currentUserID = req.session.user.id;

        if (err) throw err;
        
        const dbase = db.db('roommate');
        
        dbase.collection('groups').find({ members: [ currentUserID, userID ] }).toArray(function(err, result){
            if (err) throw err;
            if (result.length > 0){
                dbase.collection('user').find({ id: userID }).toArray(function(e, r){
                    if (e) throw e;
                    res.send(r[0]);
                    db.close();
                });
            }else{
                res.status(403).send('You are not authorized to get this user\'s info/this user may not exist.');
            }
        });
        db.close();
    });
});

router.get('/groups', function(req, res) {
    // Should be returned in reverse chronological order
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');

        var currentUserID = req.session.user.id;


        dbase.collection('groups').find({ $or: [ { members: currentUserID }, 
            { pending: currentUserID} ] }).sort({ pending: -1, created_time: -1 }).toArray(function(err, result){
            if (err) throw err;
            res.send(result);
        });

        db.close();
    });
});

/* takes a group name, creates a unique ID and creates a group, joins user to group, 
then returns the new group */

router.post('/groups', function(req, res){ 
    var currentUserID = req.session.user.id;
    
    var newGroup = {
        name: req.body.name,
        id: uuidv4(),
        created_time: new Date(),
        members: [currentUserID],
        pending: []
    };

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');
        dbase.collection('groups').insertOne(newGroup);

        dbase.collection('user').find({ id: currentUserID }).toArray(function(err, result){
            if (err) throw err;
            result = result[0];
            result.group_id.push(newGroup.id);
            dbase.collection('user').updateOne(
                {
                    id: currentUserID
                },{
                    $set:
                        {
                            'group_id': result.group_id
                        }
                });
        });

        db.close();
    });

    res.send(newGroup);
});

router.post('/group/:groupId/join', function(req, res) {
    var currentUserID = req.session.user.id;
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');

        var groupID = req.params.groupId;


        dbase.collection('groups').find({ id: groupID }).toArray(function(err, result){
            if (err) throw err;
            result = result[0];
            var index = result.pending.indexOf(currentUserID);
            if (index > -1){
                var newPending = result.pending.splice(index, 1);
                result.members.push(currentUserID);
                if (index < 1) newPending = [];
                dbase.collection('groups').updateOne(
                    {
                        id: groupID
                    },{
                        $set:
                        {
                            'members': result.members,
                            'pending': newPending
                        }
                    });
                res.status(200).send('ok');
                dbase.collection('user').find({ id: currentUserID }).toArray(function(err, r){
                    if (err) throw err;
                    r = r[0];
                    r.group_id.push(groupID);
                    dbase.collection('user').updateOne(
                        {
                            id: currentUserID
                        },{
                            $set:
                            {
                                'group_id': r.group_id
                            }
                        });
                });
            }else{
                res.status(403).send('No invite recieved for this group.');
            }
            db.close();
        });
    });
});

router.post('/group/:groupId/decline', function(req, res) {
    var currentUserID = req.session.user.id;
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');

        var groupID = req.params.groupId;


        dbase.collection('groups').find({ id: groupID }).toArray(function(err, result){
            if (err) throw err;
            result = result[0];
            var index = result.pending.indexOf(currentUserID);
            if (index > -1){
                var newPending = result.pending.splice(index, 1);
                if (index < 1) newPending = [];
                dbase.collection('groups').updateOne(
                    {
                        id: groupID
                    },{
                        $set:
                        {
                            'pending': newPending
                        }
                    });
                res.status(200).send('ok');
            }else{
                res.status(403).send('Cannot decline invitation for this group.');
            }
            db.close();
        });
    });
});
/*

router.post('/group/:groupId/add', function(req, res){
    var groupID = req.params.groupId;
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');

        var email = req.body.email;

        dbase.collection('group').find({ id: groupID }).toArray(function(err, result){
            if (err) throw err;
            if (result.length > 0){

            }else{
                res.status(403).send('This group does not exist');
            }
        });
    });
});

router.post('/group/:groupId/leave', function(req, res){
    var groupID = req.params.groupId;
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        
        const dbase = db.db('roommate');

        dbase.collection('groups').find({ id: groupID }).toArray(function(err, result){
            if (err) throw err;
            if (result.length < 1) res.status(404).send('You are not part of this group');
            result = result[0];
            var index = result.members.indexOf(currentUserID)
            if (index > -1){
                var newMembers = result.members.splice(index, 1);
                if (index < 1) newMembers = [];
                dbase.collection('groups').updateOne(
                    {
                        id: groupID
                    },{
                        $set:
                        {
                            'members': newMembers
                        }
                });
                res.status(200).send('ok');
            }else{
                res.status(403).send('This group does not exist');
            }
        });
        db.close()
    });
}); */
    
module.exports = router;
