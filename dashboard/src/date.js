/* Utilities for Date */

import moment from 'moment';

export default {
    toDateString: function(utc) {
        return moment.utc(utc).local().format('MMMM DD, YYYY');
    },
    toMonthYearString: function(utc) {
        return moment.utc(utc).local().format('MMMM YYYY');
    }
};
