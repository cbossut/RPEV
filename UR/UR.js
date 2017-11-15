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
    loopMode = {UR3:0,UR5:0},
    posFilePath = __dirname+"/positions.json",
    positions,
    curJointPos = {UR3:[],UR5:[]}, // radians updated on UR data
    serialPos = [], // 0-1023 updated on serial data
    initPos = [], // to map from Serial from starting position when serial is started
    period = 100,
    a = 10,
    v = 10

function init(IP3, IP5, port) {
  sock3 = net.connect(port, IP3, () => console.log("UR3 connected")).on('error', (err)=>console.log("URror3 :",err)).on('data', (data)=>decodeURMessage(data, 3))
  sock5 = net.connect(port, IP5, () => console.log("UR5 connected")).on('error', (err)=>console.log("URror5 :",err)).on('data', (data)=>decodeURMessage(data, 5))
  positions = JSON.parse(fs.readFileSync(posFilePath)) // positions registered via Lemur
}

function lemurConfig(sendLemur) {
  sendLemur("/UR3/Mode/x", 0)
  sendLemur("/UR5/Mode/x", 0)
  sendLemur("/UR3/Loop/x", 0)
  sendLemur("/UR5/Loop/x", 0)
}

//TODO save and load positions from and to a file
function manageLemurMessage(mess, sendLemur) {
  if (!mess.address.startsWith("/UR")) return;
  let addr = mess.address.split('/'),
      nUR = addr[1].slice(2),
      info = '/'+addr[1]+"/Info"
  
  if (addr[2] == "Mode") getMode[addr[1]] = mess.args[0]
  else if (addr[2] == "Loop") loopMode[addr[1]] = mess.args[0]
  
  else if (addr[2] == "Stop" && mess.args[0]) sendUR("stopj(10)", sendLemur, nUR)
  
  else if (addr[2].startsWith("Move") && mess.args[0]) {
    let n = addr[2].slice(4)
    if (addr[3][0] == '_') {
      let m = addr[3].slice(1)
      if (getMode[addr[1]]) {
        if (!positions[addr[1]].moves[n]) positions[addr[1]].moves[n] = []
        positions[addr[1]].moves[n][m] = curJointPos[addr[1]]
        sendLemur(info, ["@content", "Registered move"+n+','+m+" to "+curJointPos[addr[1]]])
        sendLemur('/'+addr[1]+"/Mode/x", 0)
        getMode[addr[1]] = 0
        fs.writeFileSync(posFilePath, JSON.stringify(positions))
      } else {
        if (!positions[addr[1]].moves[n] || !positions[addr[1]].moves[n][m])
          sendLemur(info, ["@content", "No pos registered at "+n+','+m])
        else
          sendUR("if True:stopj(10)movej(["+positions[addr[1]].moves[n][m]+"],"+a+','+v+")end", sendLemur, nUR)
      }
    } else if ((addr[3] == 'd' || addr[3] == 'g' || addr[3] == 'p')) {
      let moves = positions[addr[1]].moves[n]
      if (!moves) {
        sendLemur(info, ["@content", "No moves "+n])
        return
      }
      let cmd = (loopMode[addr[1]] ? "while" : "if") + " True:stopj(10)"
      if (addr[3] == 'p') cmd += "movej(["+positions[addr[1]].Passage+"],"+a+','+v+")"
      for (let i = 0 ; i < moves.length ; i++) {
        let j = addr[3]=='g' ? (moves.length - i - 1) : i
        if (moves[j]) cmd += "movej(["+moves[j]+"],"+a+','+v+")" // Need stop between move ?
      }
      sendUR(cmd+"end", sendLemur, nUR)
    }
  }
  
  else if (addr[2] == "Other" && mess.args[0]) {//TODO Crappy copy paste of above
    if (getMode[addr[1]]) {
      positions[addr[1]][addr[3]] = curJointPos[addr[1]]
      sendLemur(info, ["@content", "Registered "+addr[3]+" to "+curJointPos[addr[1]]])
      sendLemur('/'+addr[1]+"/Mode/x", 0)
      getMode[addr[1]] = 0
      fs.writeFileSync(posFilePath, JSON.stringify(positions))
    } else {
      if (!positions[addr[1]][addr[3]])
        sendLemur(info, ["@content", "No pos registered at "+addr[3]])
      else
        sendUR("if True:stopj(10)movej(["+positions[addr[1]][addr[3]]+"],"+a+','+v+")end", sendLemur, nUR)
    }
  }
}

//NOTE See Client_Interface.xlsx, tab DataStreamFromURController
function decodeURMessage(mess, UR) {
  try {
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
  catch (err) {
   console.log("Catched URrorDecode", err)
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

