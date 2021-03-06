var Board = require("../lib/board.js"),
  Descriptor = require("descriptor"),
  __ = require("../lib/fn.js"),
  events = require("events"),
  util = require("util");

var priv = new Map();


var MPU6050 = {
  DEFAULT_ADDRESS: 0x68,
  CLOCK_PLL_XGYRO: 0x01,
  CLOCK_PLL_YGYRO: 0x02,
  CLOCK_PLL_ZGYRO: 0x03,
  RA_WHO_AM_I: 0x75,
  WHO_AM_I_BIT: 6,
  WHO_AM_I_LENGTH: 6,
  RA_PWR_MGMT_1: 0x6B,
  PWR1_DEVICE_RESET_BIT: 7,
  PWR1_SLEEP_BIT: 6,
  PWR1_CYCLE_BIT: 5,
  PWR1_TEMP_DIS_BIT: 3,
  PWR1_CLKSEL_BIT: 2,
  PWR1_CLKSEL_LENGTH: 3,
};


var Devices = {
  MPU6050: {
    // https://www.sparkfun.com/products/11028
    init: function() {

      // this.i2c = new I2C(MPU6050.DEFAULT_ADDRESS, this.io);


      // setClockSource
      this.writeBits([
        MPU6050.DEFAULT_ADDRESS,
        MPU6050.RA_PWR_MGMT_1,
        MPU6050.PWR1_CLKSEL_BIT,
        MPU6050.PWR1_CLKSEL_LENGTH,
        MPU6050.CLOCK_PLL_XGYRO
      ]);

      // setFullScaleGyroRange
      this.writeBits([
        MPU6050.DEFAULT_ADDRESS,
        MPU6050.RA_GYRO_CONFIG,
        MPU6050.GCONFIG_FS_SEL_BIT,
        MPU6050.GCONFIG_FS_SEL_LENGTH,
        MPU6050.GYRO_FS_250
      ]);

      // setFullScaleAccelRange
      this.writeBits([
        MPU6050.DEFAULT_ADDRESS,
        MPU6050.RA_ACCEL_CONFIG,
        MPU6050.ACONFIG_AFS_SEL_BIT,
        MPU6050.ACONFIG_AFS_SEL_LENGTH,
        MPU6050.ACCEL_FS_2
      ]);

      // setSleepEnabled (false)
      this.writeBits([
        MPU6050.DEFAULT_ADDRESS,
        MPU6050.RA_PWR_MGMT_1,
        MPU6050.PWR1_SLEEP_BIT,
        false
      ]);

      // this.i2c.writeBits(
      //   MPU6050.RA_PWR_MGMT_1,
      //   MPU6050.PWR1_CLKSEL_BIT,
      //   MPU6050.PWR1_CLKSEL_LENGTH,
      //   MPU6050.CLOCK_PLL_XGYRO
      // );

      // board.sendI2CWriteRequest(
      //   MPU6050.DEFAULT_ADDRESS,
      //   [ 0x22,0x00,0x08,0x2A ]
      // );

      this.io.sendI2CReadRequest(MPU6050.DEFAULT_ADDRESS, 1, function(data) {

        console.log("sendI2CReadRequest", data);


        // var mask = this.bitMask(bit, bitLength);

        // this.readBytes(func, 1, function(err, buf) {
        //   var bits = (buf[0] & mask) >> (1 + bit - bitLength);
        //   callback(err, bits);
        // });

      }.bind(this));


      this.read([0x68, 0x6, 0x6], function(data) {

        console.log(data);

      });
    },
    descriptor: {


    }
  }
};

function bitMask(bit, length) {
  return ((1 << length) - 1) << (1 + bit - length);
}

function readBits(func, bit, length, callback) {
  var mask = bitMask(bit, length);

  this.readBytes(func, 1, function(err, buf) {
    var bits = (buf[0] & mask) >> (1 + bit - length);
    callback(err, bits);
  });
}


// cmd, len, null, callback

// Otherwise known as...
Devices["GY-521"] = Devices.MPU6050;

function IMU(opts) {

  if (!(this instanceof IMU)) {
    return new IMU(opts);
  }

  // Initialize a Device instance on a Board
  Board.Device.call(
    this, opts = Board.Options(opts)
  );

  var device = Devices[opts.device];


  if (device) {

    device.init.call(this);

    Object.defineProperties(this, device.descriptor);
  }
}

util.inherits(IMU, events.EventEmitter);


IMU.prototype.write = function(bytes, callback) {
  // bytes: [ address, [register, ...data] ]
  // bytes: [ address, [...data] ]

  var data = [0xF0, 0x76];

  // address, mode
  data.push(bytes.shift(), 0x00 << 3);

  // ...data
  for (var i = 0, len = bytes.length; i < len; i++) {
    data.push(
      bytes[i] & 0x7F, (bytes[i] >> 7) & 0x7F
    );
  }

  data.push(0xF7);

  this.io.sp.write(data);

  callback();
};

IMU.prototype.writeBits = function(register, bit, length, value, callback) {
  var mask = bitMask(bit, length);

  this.read(register, function(data) {
    var oldValue = (mask[0] & mask) >> (1 + bit - length);
    var newValue = oldValue ^ ((oldValue ^ (value << bit)) & mask);

    this.write([register, newValue], callback);
  }.bind(this));
};


IMU.prototype.read = function(bytes, callback) {
  // bytes: [ address, [register], numBytes ]
  // bytes: [ address, numBytes ]

  var data = [0xF0, 0x76];
  var address, register, numBytes;

  address = bytes.shift();

  // address, mode
  data.push(address, 0x01 << 3);

  // register
  if (bytes.length === 2) {
    register = bytes.shift();

    data.push(
      register & 0x7F, (register >> 7) & 0x7F
    );
  }

  // number of bytes to read
  numBytes = bytes.shift();

  data.push(
    numBytes & 0x7F, (numBytes >> 7) & 0x7F
  );

  data.push(0xF7);

  this.io.sp.write(data);

  this.io.once('I2C-reply-' + address + '-' + register, callback);
};

IMU.prototype.readBits = function(register, bit, length, callback) {
  var mask = bitMask(bit, length);

  this.read(register, 1, function(err, buf) {
    var bits = (buf[0] & mask) >> (1 + bit - length);
    callback(err, bits);
  });
};



// function I2C(address, io) {
//   this.address = address;
//   this.io = io;
// }

// I2C.prototype.bitMask = function(bit, bitLength) {
//   return ((1 << bitLength) - 1) << (1 + bit - bitLength);
// };

// I2C.prototype.readBits = function(func, bit, bitLength, callback) {
//   var mask = this.bitMask(bit, bitLength);

//   if (callback) {
//     this.readBytes(func, 1, function(err, buf) {
//       var bits = (buf[0] & mask) >> (1 + bit - bitLength);
//       callback(err, bits);
//     });
//   } else {
//     var buf = this.readBytes(func, 1);
//     return (buf[0] & mask) >> (1 + bit - bitLength);
//   }
// };

// I2C.prototype.readBit = function(func, bit, bitLength, callback) {
//   return this.readBits(func, bit, 1, callback);
// };

// I2C.prototype.writeBits = function(func, bit, bitLength, value, callback) {
//   var oldValue = this.readBytes(func, 1);
//   var mask = this.bitMask(bit, bitLength);
//   var newValue = oldValue ^ ((oldValue ^ (value << bit)) & mask);
//   this.writeBytes(func, [newValue], callback);
// };

// I2C.prototype.writeBit = function(func, bit, value, callback) {
//   this.writeBits(func, bit, 1, value, callback);
// };

// util.inherits(I2C, events.EventEmitter);

module.exports = IMU;


// http://www.acroname.com/robotics/info/articles/sharp/sharp.html
