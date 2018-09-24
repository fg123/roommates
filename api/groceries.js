/*
 * API Handler for Grocery List, comes from /group/:groupId.
 */

const router = require('express').Router();
const uuidv4 = require('uuid/v4');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// This is a global variable we'll use for handing the MongoDB client
let mongodb;

// Connection URL
const url = 'mongodb://localhost:27017/roommate';

const USER_DB = 'users';
const GROUP_DB = 'groups';
const GROCERY_DB = 'groceries';

// Create the db connection
MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    assert.equal(null, err);
    mongodb = db.db();
    mongodb.collection(USER_DB).createIndex('id');
    mongodb.collection(GROUP_DB).createIndex('id');
    mongodb.collection(GROCERY_DB).createIndex('id');
});

function handleUnexpectedError(err, res) {
    res.status(500).send('An unexpected error occurred during database operation.');
    console.err(err);
}

function invalidInput(str) {
    return !str || str.match(/^ *$/) !== null;
}

router.all('/group/:groupId/groceries/*', function(req, res, next) {
    const currentUserID = req.session.user.id;
    const groupID = req.params.groupId;
    
    mongodb.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, group) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (group.length < 1) {
            res.status(404).send('This group does not exist.');
            return;
        }
        next();
    });
});


router.get('/group/:groupId/groceries', function(req, res) {
    const currentUserID = req.session.user.id;
    const groupID = req.params.groupId;
    
    mongodb.collection(GROUP_DB).find({ id: groupID, members: { $in: [currentUserID] }}).toArray(function(err, group) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (group.length < 1) {
            res.status(404).send('This group does not exist.');
            return;
        }
        mongodb.collection(GROCERY_DB).find({ id: groupID }).toArray(function(err, groceryList) {
            if (err) {
                handleUnexpectedError(err, res);
                return;
            }
            if (groceryList.length < 1) {
                const newGroceryList = {
                    id: groupID,
                    items: []
                };
                mongodb.collection(GROCERY_DB).insertOne(newGroceryList, function(err) {
                    if (err) {
                        handleUnexpectedError(err, res);
                        return;
                    }
                    res.send([]);
                });
            } else {
                res.send(groceryList[0].items);
            }
        });
    });
});

router.post('/group/:groupId/groceries/add', function(req, res) {
    const currentUserID = req.session.user.id;
    const groupID = req.params.groupId;
    const item = req.body.item;
    
    if (invalidInput(item)){
        res.status(400).send('Invalid item entered.');
        return;
    }

    mongodb.collection(GROCERY_DB).find({ id: groupID }).toArray(function(err, groceryList) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (groceryList.length < 1) {
            res.status(400).send('Your group does not have a grocery list.');
            return;
        }

        const newItem = {
            id: uuidv4(),
            item: item,
            added_by: currentUserID,
            created_time: Date.now()
        };
        
        groceryList[0].items.push(newItem);

        mongodb.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: groceryList[0].items }}, function(err) {
            if (err) {
                handleUnexpectedError(err, res);
                return;
            }
            res.send(groceryList[0].items);
        });
    });
});

router.delete('/group/:groupId/groceries/:itemId', function(req, res) {
    const groupID = req.params.groupId;
    const itemID = req.params.itemId;
    
    mongodb.collection(GROCERY_DB).find({ id: groupID, 'items.id': itemID }).toArray(function(err, item) {
        if (err) {
            handleUnexpectedError(err, res);
            return;
        }
        if (item.length < 1) {
            res.status(400).send('The itemID provided is invalid in your grocery list.');
            return;
        }
        const newList = item[0].items.filter(item => item.id !== itemID);

        mongodb.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: newList }}, function(err) {
            if (err) {
                handleUnexpectedError(err, res);
                return;
            }
            res.send('ok');
        });
    });
});

module.exports = router;