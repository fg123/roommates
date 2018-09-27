/*
 * API Handler for Grocery List, comes from /group/:groupId.
 */

const router = require('express').Router();
const uuidv4 = require('uuid/v4');
const utils = require('./utils.js');

const GROCERY_DB = 'groceries';
const USER_DB = 'users';

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
            for (let index = 0; index < groceryList[0].items.length; index++) {
                req.db.collection(USER_DB).find({ id: groceryList[0].items[index].added_by }).toArray(function(err, user) {
                    if (err) {
                        utils.handleUnexpectedError(err, res);
                        return;
                    }
                    groceryList[0].items[index].added_by = user[0];
                    if (index == groceryList[0].items.length - 1) res.send(groceryList[0].items);
                });
            }
        }
    });
});

router.post('/group/:groupId/groceries/add', function(req, res) {
    const currentUserID = '104339510018991244463';
    //const currentUserID = req.session.user.id;
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
            id: uuidv4(),
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
                res.send(newGroceryList.items);
            });
        } else {
            groceryList[0].items.push(newItem);

            req.db.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: groceryList[0].items }}, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send(groceryList[0].items);
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
            res.send('ok');
        });
    });
});

module.exports = router;