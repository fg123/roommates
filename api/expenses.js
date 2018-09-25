/*
 * API Handler for Expenses, comes from /group/:groupId.
 */

const router = require('express').Router();
const uuidv4 = require('uuid/v4');
const utils = require('./utils');

const USER_DB = 'users';
const GROUP_DB = 'groups';
const GROCERY_DB = 'groceries';

/*
Expense Group: {
	# which group it belongs to, this might not be needed depending on how data is stored
	roommate_group: 1234,
    name: "Groceries",
    id: 12345,
    created: 1536701274,
    modified: 1536701274,
    transactions: [list of transactions],

    # precomputed cached values:
    owing: {
    	user1_id: 123,
        user2_id: 1234
    }
} 

Transaction: {
    value: 123.45,
    owee: user_id,
    ower: [list of user_id],
    description: "For whatever",
    id: 1239198293,
    created: 1536701274,
    is_invalidated: false,
    # maybe have a invalidated reason?
}
*/

router.get('/expenses', function(req, res) {
    res.send('ok');
});

router.get('/expenses/:expenseGroupId', function(req, res) {
    res.send('ok');
});

router.get('/expenses/:expenseGroupId/transactions', function(req, res) {
    res.send('ok');
});

router.post('/expenses/:expenseGroupId/transactions', function(req, res) {
    res.send('ok');
});

router.post('/expenses/:expenseGroupId/transaction/:transactionId/invalidate', function(req, res) {
    res.send('ok');
});

module.exports = router;
