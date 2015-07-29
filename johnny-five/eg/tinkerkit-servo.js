var five = require("../lib/johnny-five.js");
var board = new five.Board();

board.on("ready", function() {
  var servo = new five.Servo("O0");
  servo.center();

  this.repl.inject({
    s: servo
  });
});
