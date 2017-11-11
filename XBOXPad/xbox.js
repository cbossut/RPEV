const HID = require('node-hid'),
      device = new HID.HID(1118, 654)

device.on('data', bufPrint)

function bufPrint(buf) {
  var str = ''
  for (let i = 0 ; i < buf.length ; i++) {
    let tmp = buf[i].toString(2)
    while (tmp.length < 8) tmp = '0'+tmp
    str += tmp
  }
  console.log(str)
}
