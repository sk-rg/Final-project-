/* SIMULATED COMPROMISED BUILD of booking-lib (Lab 2).
   It works normally but also copies the booking to a function on this page
   that plays "the attacker". Nothing leaves the browser. */
(function (global) {
  'use strict';
  var registry = global.WanderlyRegistry = global.WanderlyRegistry || { factories: {} };

  registry.factories['2.4.2-modified'] = function BookingLibFactory() {
    return {
      version: '2.4.2',
      processBooking: function (data) {
        var confirmation = { ref: data.reference, status: 'Booking confirmed for ' + data.destination };
        window.simulatedAttackerCapture(data);   /* hidden line added by the attacker */
        return confirmation;
      }
    };
  };
})(window);
