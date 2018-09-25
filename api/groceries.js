/*
 * API Handler for Grocery List, comes from /group/:groupId.
 */

const router = require('express').Router();
const uuidv4 = require('uuid/v4');
const utils = require('./utils');

const GROCERY_DB = 'groceries';

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
            res.send(groceryList[0].items);
        }
    });
});

router.post('/group/:groupId/groceries/add', function(req, res) {
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

        req.db.collection(GROCERY_DB).updateOne({ id: groupID }, { $set: { items: groceryList[0].items }}, function(err) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }
            res.send(groceryList[0].items);
        });
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