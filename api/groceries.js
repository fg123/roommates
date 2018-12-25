/*
 * API Handler for Grocery List, comes from /group/:groupId.
 */

const router = require('express').Router();
const utils = require('./utils.js');
const shortid = require('shortid');

const GROCERY_DB = 'groceries';
const USER_DB = 'users';
const GROUP_DB = 'groups';

router.get('/group/:groupId/groceries', function(req, res) {
    const groupID = req.params.groupId;
    
    req.db.collection(GROCERY_DB).find({ id: groupID }).toArray(function(err, groceryList) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (groceryList.length < 1) {
            const newGroceryList = {
                id: groupID,
                items: []
            };
            req.db.collection(GROCERY_DB).insertOne(newGroceryList, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send([]);
            });
        } else {
            const listOfUsersToRequest = new Set(groceryList[0].items.map(item => item.added_by));
            const usersToIDs = new Map();
            
            req.db.collection(USER_DB).find({ id: { $in: Array.from(listOfUsersToRequest) }}).toArray(function(err, users) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                for (let index = 0; index < users.length; index++) {
                    usersToIDs.set(users[index].id, users[index]);
                }
                for (let i = 0; i < groceryList[0].items.length; i++) {
                    groceryList[0].items[i].added_by = usersToIDs.get(groceryList[0].items[i].added_by);
                }
                res.send(groceryList[0].items);
            });
        }
    });
});

router.post('/group/:groupId/groceries/add', function(req, res) {
    if (!req.session.user){
        res.status(500).send('Bad access.');
        return;
    }

    const currentUserID = req.session.user.id;
    const groupID = req.params.groupId;
    const item = req.body.item;
    
    if (utils.invalidInput(item)){
        res.status(400).send('Invalid item entered.');
        return;
    }

    req.db.collection(GROCERY_DB).find({ id: groupID }).toArray(function(err, groceryList) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }

        const newItem = {
            id: shortid.generate(),
            item: item,
            added_by: currentUserID,
            created_time: Date.now()
        };

        if (groceryList.length < 1) {
            const newGroceryList = {
                id: groupID,
                items: [newItem]
            };
            
            req.db.collection(GROCERY_DB).insertOne(newGroceryList, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }

                const currentDate = new Date();

                req.db.collection(GROUP_DB).updateOne({ id: groupID }, { $set: { 'last_modified': currentDate }}, function (err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    res.send(groceryList[0].items);
                });
            });
        } else {
            groceryList[0].items.push(newItem);

            req.db.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: groceryList[0].items }}, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }

                const currentDate = new Date();

                req.db.collection(GROUP_DB).updateOne({ id: groupID }, { $set: { 'last_modified': currentDate }}, function (err) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    res.send(groceryList[0].items);
                });
            });
        }
    });
});

router.delete('/group/:groupId/groceries/:itemId', function(req, res) {
    const groupID = req.params.groupId;
    const itemID = req.params.itemId;
    
    req.db.collection(GROCERY_DB).find({ id: groupID, 'items.id': itemID }).toArray(function(err, item) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (item.length < 1) {
            res.status(400).send('The itemID provided is invalid in your grocery list.');
            return;
        }
        const newList = item[0].items.filter(item => item.id !== itemID);

        req.db.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: newList }}, function(err) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }

            const currentDate = new Date();
                
            req.db.collection(GROUP_DB).updateOne({ id: groupID }, { $set: { 'last_modified': currentDate }}, function (err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send('ok');
            });
        });
    });
});

module.exports = router;
