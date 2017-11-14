const RPIP = "192.168.0.40"
    , RPPort = 12345
    , net = require('net')

let fb

function openTCPSocket() {
  fb = net.connect(RPPort, RPIP, () => console.log("FiveBot (rasp) TCP Socket Ready !")).on('error', (err)=>console.log("Raspberry error :",err)).setEncoding('utf8').on('data', console.log)//DEBUG
}

function sendSpeed(x, y, r) { // -5 to 5
  fb.write(formatSpeed(x) + formatSpeed(y) + formatSpeed(r), 'binary')
  module.exports.sock = fb
}

function formatSpeed(v) {
  let str = (Math.sign(v) < 0 ? '' : '+') + v.toFixed(2)
  while (str.length < 5) str += '0'
  return str
}

module.exports = {
  init: openTCPSocket,
  sendXYR: sendSpeed,
  close: ()=>fb.write("closecloseclose", 'binary'),
  sock: fb
}