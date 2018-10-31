/* Utilities for Date */

import moment from 'moment';

export default {
    toDateString: function(utc) {
        if (utc === undefined) throw 'Date provided is not defined!';
        return moment.utc(utc).local().format('MMMM DD, YYYY');
    },
    toMonthYearString: function(utc) {
        return moment.utc(utc).local().format('MMMM YYYY');
    }
};
