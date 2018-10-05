exports.handleUnexpectedError = function(err, res) {
    res.status(500).send('An unexpected error occurred.');
    console.error(err);
};

exports.invalidInput = function(str) {
    return !str || str.match(/^ *$/) !== null;
};