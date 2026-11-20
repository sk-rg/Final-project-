/* booking-lib 2.4.1 (trusted, reviewed copy). Used by Lab 2 (Wanderly Travel).
   If you reformat the factory, regenerate PINNED_INTEGRITY: node tools/print-hash.js */
(function (global) {
  'use strict';
  var registry = global.WanderlyRegistry = global.WanderlyRegistry || { factories: {} };

  registry.factories['2.4.1'] = function BookingLibFactory() {
    return {
      version: '2.4.1',
      processBooking: function (data) {
        return { ref: data.reference, status: 'Booking confirmed for ' + data.destination };
      }
    };
  };
})(window);
