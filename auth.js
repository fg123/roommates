/* Functions that manage authentication */

module.exports = {
    isLoggedIn: function(req) {
        return req.session.auth;
    },
    login: function(req) {
        req.session.auth = true;
    },
    logout: function(req) {
        req.session.auth = false;
        req.session.destroy();
    }
};
