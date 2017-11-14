const URIP = "192.168.0.102",
      URPort = 30002, // 1 more mess ? 3 125Hz instead 10
      net = require("net"),
      sock = net.connect(URPort, URIP, () => console.log("UR's TCP Socket Ready !")).on('error', (err)=>console.log("URror :",err)).on('data', decodeURMessage),
      fs = require('fs')

function sendUR(cmd, sendLemur) {
  //console.log(cmd) //NOTE Debug
  sendLemur("/UR/Info", ["@content", "Sending "+cmd+" to UR"])
  sock.write(cmd+'\n')
}

let getMode = 0,
    r = -1, // sel row
    c = -1, // sel col
    posFilePath = __dirname+"/positions.json",
    positions = JSON.parse(fs.readFileSync(posFilePath)), // positions registered via Lemur
    curJointPos = [], // radians updated on UR data
    serialPos = [], // 0-1023 updated on serial data
    initPos = [], // to map from Serial from starting position when serial is started
    period = 100,
    row = 4,
    column = 4


function lemurConfig(sendLemur, r, c) {
  row = r
  column = c
  sendLemur("/UR/Positions", ["@row", row, "@multilabel", 1])
  sendLemur("/UR/Positions", ["@column", column])
  for (let i = 0 ; i < row ; i++) if (!positions[i]) positions[i] = []
}

//TODO save and load positions from and to a file
function manageLemurMessage(mess, sendLemur) {
  if (mess.address.startsWith("/UR/Mode")) getMode = mess.args[0]
  
  else if (mess.address.startsWith("/UR/Save"))
    fs.writeFileSync(posFilePath, JSON.stringify(positions))
  
  else if (mess.address.startsWith("/UR/Positions")) {
    // Check just on pad was just pushed
    let on = []
    for (let i = 0 ; i < mess.args.length ; i++) {
      if (mess.args[i]) on.push(i)
    }
    if (!on.length) r = -1
    else if (r == -1 && on.length == 1) {// on[0] is the only pad pushed
      r = Math.floor(on[0]/row)
      c = on[0] % column
      if (c = column - 1) {
        let cmd = "if True:"
        for (let i = 0 ; i < column - 1 ; i++) {
          if (positions[r][i]) cmd += "stopj(10)movej(["+positions[r][i]+"])" 
        }
        sendUR(cmd+"end", sendLemur)
      } else if (getMode) {
        positions[r][c] = curJointPos
        sendLemur("/UR/Info", ["@content", "Registered pos "+r+','+c+" to "+curJointPos.map(Math.round())])
      } else {
        sendUR("if True:stopj(10)movej(["+positions[sel]+"])end", sendLemur)
      }
    }
  }
}

//NOTE See Client_Interface.xlsx, tab DataStreamFromURController
function decodeURMessage(mess) {
  let pos = 0,
      size = mess.readInt32BE(pos)
  pos += 5
  while(pos < size) {
    let curSize = mess.readInt32BE(pos),
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
      setInterval(mapSerialToUR, period)
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
      let serialPosAll = data.slice(1).split(';').slice(0,-1) // temporary for two potar test
      serialPos = [serialPosAll[0], serialPosAll[5]]
    } else {
      serialPacket = data
    }
  }
}

let prevError = [],
    p = period*0.08,
    d = 10
function mapSerialToUR() {
  let targetPos = curJointPos.slice() // copy array !!!!!
  targetPos[0] = (serialPos[1]/2048) * Math.PI + initPos[0]
  targetPos[3] = (serialPos[0]/2048) * Math.PI + initPos[3]
  let targetSpeed = []
  for (let i = 0 ; i < 6 ; i++) {
    let error = targetPos[i] - curJointPos[i]
    targetSpeed[i] = Math.abs(error) > 0.01 ? error * p + (error - prevError[i]) * d : 0
    //targetSpeed[i] = Math.abs(error) > 0.1 ? (diff > 0 ? 10 : -10) : 0
    prevError[i] = error
  }
  console.log("Current : ", curJointPos, "Target : ", targetPos)
  let cmd = "speedj(["+targetSpeed+"],5,"+(period*1.1/1000)+")\n"
  console.log(cmd)
  console.log(serialPos)
  sock.write(cmd)
}

module.exports = {
  sock:sock,
  startSerial:startSerial,
  manageLemurMessage:manageLemurMessage,
  lemurConfig:lemurConfig
}

