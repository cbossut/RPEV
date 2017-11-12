const serial = require('serialport')
    , mbs = {
      '98D331B42728': "Green-T",
      '201603081530': "Pink-I"
    }

let mb

function connectToFirstMB() {
  serial.list( (err, res) => {
    for (let i = 0 ; i < res.length ; i++) {
      if (res[i].pnpId.startsWith('BTHENUM')) {
        let btaddr = res[i].pnpId.split('_')[1].split('&')[4]
        if (mbs[btaddr]) {
          mb = new serial(res[i].comName, {baudRate: 921600}, (err)=>{
            console.log("Connected to", mbs[btaddr], "Metabot with error", err)
            module.exports.d = mb
          }).setEncoding('utf8').on('data', console.log)//DEBUG
          return;
        }
      }
    }
  })
}

function sendCommand(cmd) {
  //console.log(cmd) //DEBUG
  mb.write(cmd+'\r\n')
}

module.exports = {
  init: connectToFirstMB,
  start: ()=>sendCommand("start"),
  send: sendCommand,
  d: mb
}
