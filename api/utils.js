exports.handleUnexpectedError = function (err, res) {
    res.status(500).send('An unexpected error occurred during database operation.');
    console.err(err);
};

exports.invalidInput = function (str) {
    return str === null || str.match(/^ *$/) !== null;
};