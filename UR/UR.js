const //URIP = "192.168.0.41",
      //URPort = 30002, // 1 more mess ? 3 125Hz instead 10
      net = require("net"),
      //sock = net.connect(URPort, URIP, () => console.log("UR's TCP Socket Ready !")).on('error', (err)=>console.log("URror :",err)).on('data', decodeURMessage),
      fs = require('fs')

let sock3, sock5

function sendUR(cmd, sendLemur, UR) {
  //console.log(cmd) //NOTE Debug
  sendLemur("/UR"+UR+"/Info", ["@content", "Sending "+cmd+" to UR"+UR])
  if (UR == 3) sock3.write(cmd+'\n')
  else sock5.write(cmd+'\n')
}

let getMode = {UR3:0,UR5:0}, //TODO crappy, could be in positions object ?
    r = {UR3:-1,UR5:-1}, // sel row
    c = -1, // sel col
    posFilePath = __dirname+"/positions.json",
    positions,
    curJointPos = {UR3:[],UR5:[]}, // radians updated on UR data
    serialPos = [], // 0-1023 updated on serial data
    initPos = [], // to map from Serial from starting position when serial is started
    period = 100,
    row = 4,
    column = 4

function init(IP3, IP5, port, lignes, colonnes) {
  row = lignes
  column = colonnes
  sock3 = net.connect(port, IP3, () => console.log("UR3 connected")).on('error', (err)=>console.log("URror3 :",err)).on('data', (data)=>decodeURMessage(data, 3))
  sock5 = net.connect(port, IP5, () => console.log("UR5 connected")).on('error', (err)=>console.log("URror5 :",err)).on('data', (data)=>decodeURMessage(data, 5))
  positions = JSON.parse(fs.readFileSync(posFilePath)) // positions registered via Lemur
  for (let i = 0 ; i < row ; i++) {
    if (!positions.UR3[i]) positions.UR3[i] = []
    if (!positions.UR5[i]) positions.UR5[i] = []
  }
}

function lemurConfig(sendLemur) {
  sendLemur("/UR3/Positions", ["@row", row])
  sendLemur("/UR3/Positions", ["@column", column])
  sendLemur("/UR3/Positions", ["@multilabel", 1])
  sendLemur("/UR3/Mode/x", 0)
  sendLemur("/UR5/Positions", ["@row", row])
  sendLemur("/UR5/Positions", ["@column", column])
  sendLemur("/UR5/Positions", ["@multilabel", 1])
  sendLemur("/UR5/Mode/x", 0)
}

//TODO save and load positions from and to a file
function manageLemurMessage(mess, sendLemur) {
  let UR
  if (mess.address.startsWith("/UR3")) UR = 3
  else UR = 5
  let addr = mess.address.split('/').slice(2).join('/'),
      URaddr = "UR"+UR
  
  if (addr.startsWith("Mode")) getMode[URaddr] = mess.args[0]
  
  else if (addr.startsWith("Save"))
    fs.writeFileSync(posFilePath, JSON.stringify(positions))
  
  else if (addr.startsWith("Positions")) {
    // Check just one pad was just pushed
    let on = []
    for (let i = 0 ; i < mess.args.length ; i++) {
      if (mess.args[i]) on.push(i)
    }
    if (!on.length) r[URaddr] = -1
    else if (r[URaddr] == -1 && on.length == 1) {// on[0] is the only pad pushed
      r[URaddr] = Math.floor(on[0]/row)
      c = on[0] % column
      if (c == column - 1) {
        let cmd = "if True:"
        for (let i = 0 ; i < column - 1 ; i++) {
          if (positions[URaddr][r[URaddr]][i]) cmd += "stopj(10)movej(["+positions[URaddr][r[URaddr]][i]+"])" 
        }
        sendUR(cmd+"end", sendLemur, UR)
      } else if (getMode[URaddr]) {
        positions[URaddr][r[URaddr]][c] = curJointPos[URaddr]
        sendLemur('/'+URaddr+'/'+"Info", ["@content", "Registered pos "+r[URaddr]+','+c+" to "+curJointPos[URaddr].map((v,i,a)=>v.toFixed(4))])
      } else {
        sendUR("if True:stopj(10)movej(["+positions[URaddr][r[URaddr]][c]+"],v=2)end", sendLemur, UR)
      }
    }
  }
}

//NOTE See Client_Interface.xlsx, tab DataStreamFromURController
function decodeURMessage(mess, UR) {
  let pos = 0,
      size = mess.readInt32BE(pos)
  pos += 5
  while(pos < size) {
    let curSize = mess.readInt32BE(pos),
        curType = mess[pos+4]
    if (curType == 1) {
      getPosFromJointData(mess.slice(pos, pos+curSize), UR)
    }
    pos += curSize
  }
}

function getPosFromJointData(mess, UR) {
  let jointPos = []
  for (let pos = 5 ; pos < mess.length ; pos += 41) {
    jointPos.push(mess.readDoubleBE(pos))
  }
  curJointPos["UR"+UR] = jointPos
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
  startSerial:startSerial,
  manageLemurMessage:manageLemurMessage,
  lemurConfig:lemurConfig,
  init:init
}

