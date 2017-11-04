const URIP = "192.168.0.103",
      URPort = 30002, // 1 more mess ? 3 125Hz instead 10
      net = require("net"),
      sock = net.connect(URPort, URIP, () => console.log("UR's TCP Socket Ready !")).on('error', console.log).on('data', decodeURMessage)

function sendUR(cmd, sendLemur) {
  //console.log(cmd) //NOTE Debug
  sendLemur("/UR/Info", ["@content", "Sending "+cmd+" to UR"])
  sock.write(cmd+'\n')
}

let getMode = 0,
    sel = -1,
    positions = [], // positions registered via Lemur
    curJointPos = [], // radians updated on UR data
    serialPos = [], // 0-1023 updated on serial data
    initPos = [] // to map from Serial from starting position when serial is started

//TODO save and load positions from and to a file
function manageLemurMessage(mess, sendLemur) {
  if (mess.address.startsWith("/UR/Mode")) getMode = mess.args[0]
  
  else if (mess.address.startsWith("/UR/Positions")) {
    let on = []
    for (let i = 0 ; i < mess.args.length ; i++) {
      if (mess.args[i]) on.push(i)
    }
    if (!on.length) sel = -1
    else if (sel == -1 && on.length == 1) {
      sel = on[0]
      if (getMode) {
        positions[sel] = curJointPos
        sendLemur("/UR/Info", ["@content", "Registered pos "+sel+" to "+curJointPos])
      } else {
        sendUR("if True:stopj(10)movej(["+positions[sel]+"])end", sendLemur)
      }
    }
  }
}

//NOTE See Client_Interface.xlsx, tab DataStreamFromURController
function decodeURMessage(mess) {
  let pos = 0,
      size = bufToInt(mess, pos)
  pos += 5
  while(pos < size) {
    let curSize = bufToInt(mess,pos),
        curType = mess[pos+4]
    if (curType == 1) {
      getPosFromJointData(mess.slice(pos, pos+curSize))
    }
    pos += curSize
  }
}

function getPosFromJointData(mess) {
  let jointPos = []
  for (let pos = 5 ; pos < mess.length ; pos += 41) {
    jointPos.push(mess.readDoubleBE(pos))
  }
  curJointPos = jointPos
}


/////// Serial

function startSerial() {
  const serial = require("serialport")
  
  serial.list((err, res) => {
    let p, myport
    for (let i = 0 ; i < res.length ; i++) {
      if (res[i].manufacturer != 'Microsoft') p = res[i].comName
    }

    myport = new serial(p, {baudRate: 115200}, () => {
      console.log('Serial opened !')
      initPos = curJointPos.slice() // copy array !!!
      setInterval(mapSerialToUR, 50)
    })

    myport.setEncoding('utf8')
    myport.on('data', decodeSerialData)
  })
}

let serialPacket = ""
function decodeSerialData(data) {
  if (!data.startsWith('i')) {
    if (serialPacket.startsWith('i')) {
      data = serialPacket + data
      serialPacket = ""
    }
  }
  if (data.startsWith('i')) {
    let end = data.indexOf('f')
    if (end != -1) {
      let posSerialAll = data.slice(1).split(';').slice(0,-1) // temporary for two potar test
      posSerial = [posSerialAll[0], posSerialAll[5]]
    } else {
      serialPacket = data
    }
  }
}


function mapSerialToUR() {
  let targetPos = curJointPos.slice() // copy array !!!!!
  targetPos[0] = (posSerial[1]/2048) * Math.PI + initPos[0]
  targetPos[3] = (posSerial[0]/2048) * Math.PI + initPos[3]
  let targetSpeed = []
  for (let i = 0 ; i < 6 ; i++) {
    let diff = targetPos[i] - curJointPos[i]
    targetSpeed[i] = Math.abs(diff) > 0.01 ? diff * 4 : 0
    //targetSpeed[i] = Math.abs(diff) > 0.1 ? (diff > 0 ? 10 : -10) : 0
  }
  console.log("Current : ", curJointPos, "Target : ", targetPos)
  let cmd = "speedj(["+targetSpeed+"],5,0.055)\n"
  console.log(cmd)
  console.log(posSerial)
  sock.write(cmd)
}

module.exports = {
  sock:sock,
  startSerial:startSerial,
  manageLemurMessage:manageLemurMessage
}

