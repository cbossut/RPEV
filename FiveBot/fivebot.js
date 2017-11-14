const net = require('net')

let fb

function openTCPSocket(RPIP, RPPort) {
  fb = net.connect(RPPort, RPIP, () => console.log("FiveBot (rasp) TCP Socket Ready !")).on('error', (err)=>console.log("Raspberry error :",err)).setEncoding('utf8').on('data', console.log)//DEBUG
}

function sendSpeed(x, y, r) { // -5 to 5
  fb.write(formatSpeed(x*.8) + formatSpeed(y*.8) + formatSpeed(r*.8), 'binary')
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
