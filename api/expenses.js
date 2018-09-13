/*
 * API Handler for Expenses, comes from /group/:groupId.
 */

const router = require('express').Router();

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
