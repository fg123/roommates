/*
 * API Handler for Expenses, comes from /group/:groupId.
 */

const router = require('express').Router();
const utils = require('./utils.js');
const shortid = require('shortid');

const GROUP_DB = 'groups';
const EXPENSE_DB = 'expenses';

router.get('/group/:groupId/expenses', function(req, res) {
    const groupID = req.params.groupId;

    req.db.collection(EXPENSE_DB).find({ roommate_group: groupID }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length < 1) {
            res.send([]);
        } else {
            expenseGroup.forEach(group => {
                delete group.transactions;
            });
            res.send(expenseGroup);
        }
    });
});

router.post('/group/:groupId/expenses/add', function(req, res) {
    const groupID = req.params.groupId;
    const name = req.body.name;

    if (utils.invalidInput(name)){
        res.status(400).send('Invalid expense group name entered.');
        return;
    }

    req.db.collection(EXPENSE_DB).find({ name: name }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length > 1) {
            res.status(400).send('This expense group name is already taken.');
            return;
        }

        req.db.collection(GROUP_DB).find({ id: groupID }).toArray(function(err) {
            if (err) {
                utils.handleUnexpectedError(err, res);
                return;
            }

            const newExpenseGroup = {
                roommate_group: groupID,
                name: name,
                id: shortid.generate(),
                created: Date.now(),
                modified: Date.now(),
                transactions: [],
                owing: {}
            };

            req.db.collection(EXPENSE_DB).insertOne(newExpenseGroup, function(err) {
                if (err) {
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send('ok');
            });
        });
    });
});

router.get('/group/:groupId/expenses/:expenseGroupId', function(req, res) {
    const expenseGroupID = req.params.expenseGroupId;

    req.db.collection(EXPENSE_DB).find({ id:  expenseGroupID }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length < 1) {
            res.send([]);
        } else {
            res.send(expenseGroup[0]);
        }
    });
});

router.get('/group/:groupId/expenses/:expenseGroupId/transactions', function(req, res) {
    const expenseGroupID = req.params.expenseGroupId;
    req.db.collection(EXPENSE_DB).find({ id:  expenseGroupID }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length < 1) {
            res.status(404).send('This expense group does not exist.');
            return;
        }
        res.send(expenseGroup[0].transactions);
    });
});

router.post('/group/:groupId/expenses/:expenseGroupId/transactions/add', function(req, res) {
    const expenseGroupID = req.params.expenseGroupId;
    const owee = req.body.owee;
    let owers = req.body.owers; // takes in an array of userIDs
    const value = req.body.value;
    const description = req.body.description;

    if (utils.invalidInput(owee)) {
        res.status(400).send('Invalid owee was entered.');
        return;
    }
    if (owers.length == 0) {
        res.status(400).send('No owers were selected.');
        return;
    }
    if (utils.invalidInput(value)) {
        res.status(400).send('Invalid value was entered.');
        return;
    }
    if (utils.invalidInput(description)) {
        res.status(400).send('Invalid description was entered.');
        return;
    }
    if (Number(value) <= 0) {
        res.status(400).send('Cannot enter $0 or negative transaction amount.');
    }

    req.db.collection(EXPENSE_DB).find({ id: expenseGroupID }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length < 1) {
            res.status(404).send('This expense group does not exist.');
            return;
        }
        const totalOwers = owers.length;
        const currentOwing = expenseGroup[0].owing;

        /* This is a map of owerId: owed so that random cent splitting can be
         * kept track of */
        let owingsDelta = {};

        /* Reset owers to 0, owee can be an ower too! */
        owers.forEach(ower => owingsDelta[ower] = 0);
        
        /* Value is a string in dollars and stored as cents in database */
        owingsDelta[owee] = -(Number(value) * 100);
        
        /* Split amount amongst rest */
        const totalCents = Math.floor(Number(value) * 100);
        const baseAmountCents = Math.floor(totalCents / totalOwers);
        
        let centsLeft = totalCents - (baseAmountCents * totalOwers);

        owers.forEach(ower => owingsDelta[ower] += baseAmountCents);

        /* CentsLeft < randomOwers.length guaranteed */
        let randomOwers = owers.slice(0);
        while (centsLeft > 0) {
            const index = Math.floor(Math.random() * randomOwers.length);
            owingsDelta[randomOwers[index]]++;
            randomOwers.splice(index, 1);
            centsLeft--;
        }

        /* Apply the delta map to the cached owings */
        Object.keys(owingsDelta).forEach(id => {
            if (!currentOwing[id]) { 
                currentOwing[id] = 0;
            }
            currentOwing[id] += owingsDelta[id];
        });

        const newTransaction = {
            value: value,
            owee: owee,
            owers: owingsDelta,
            description: description,
            id: shortid.generate(),
            created: Date.now(),
            is_invalidated: false,
            invalidatedBy: null,
            invalidatedReason: null,
            invalidatedTime: null
        };

        expenseGroup[0].transactions.push(newTransaction);

        req.db.collection(EXPENSE_DB).updateOne(
            {
                id: expenseGroupID
            }, {
                $set:
                    {
                        owing: expenseGroup[0].owing,
                        modified: Date.now(),
                        transactions: expenseGroup[0].transactions
                    }
            }, function(err) {
                if (err){
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send(expenseGroup[0].transactions);
            });
    });
});

router.post('/group/:groupId/expenses/:expenseGroupId/transaction/:transactionId/invalidate', function(req, res) {
    if (!req.session.user){
        res.status(500).send('Bad access.');
        return;
    }

    const currentUserID = req.session.user.id;
    const expenseGroupID = req.params.expenseGroupId;
    const transactionID = req.params.transactionId;
    const invalidateReason = req.body.reason;

    req.db.collection(EXPENSE_DB).find({ id: expenseGroupID }).toArray(function(err, expenseGroup) {
        if (err) {
            utils.handleUnexpectedError(err, res);
            return;
        }
        if (expenseGroup.length < 1) {
            res.status(404).send('This expense group does not exist.');
            return;
        }

        let transactionExist = false;

        for (let index = 0; index < expenseGroup[0].transactions.length; index++) {
            if (expenseGroup[0].transactions[index].id == transactionID) {
                let currentTransaction = expenseGroup[0].transactions[index];

                currentTransaction.isInvalidated = true;
                currentTransaction.invalidatedReason = invalidateReason;
                currentTransaction.invalidatedTime = Date.now();
                currentTransaction.invalidatedBy = currentUserID;
                transactionExist = true;

                Object.keys(currentTransaction.owers).forEach(id => {
                    expenseGroup[0].owing[id] -= currentTransaction.owers[id];
                });
                break;
            }
        }

        if (!transactionExist) {
            res.status(404).send('This transaction does not exist.');
            return;
        }

        req.db.collection(EXPENSE_DB).updateOne(
            {
                id: expenseGroupID
            }, {
                $set:
                    {
                        owing: expenseGroup[0].owing,
                        modified: Date.now(),
                        transactions: expenseGroup[0].transactions
                    }
            }, function(err) {
                if (err){
                    utils.handleUnexpectedError(err, res);
                    return;
                }
                res.send('ok');
            });
    });
});

module.exports = router;
