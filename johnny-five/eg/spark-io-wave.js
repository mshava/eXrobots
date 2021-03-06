var five = require("../lib/johnny-five.js");
var Spark = require("spark-io");

var board = new five.Board({
  io: new Spark({
    token: process.env.SPARK_TOKEN,
    deviceId: process.env.SPARK_DEVICE_WHEELJACK
  })
});

board.on("ready", function() {
  var dir = 0;
  var servo = new five.Servo("A0");

  setInterval(function() {
    var pos = 120;
    if (dir ^= 1) {
      pos = 60;
    }
    servo.to(pos);
  }, 750);
});
