const lemurIP = "192.168.0.31",
      lemurGael = "192.168.0.32",
      lemurPort = 8000,
      localPort = 8000,
      osc = require("osc"),
      instruments = {}

let udpPort

function openUDPSocket (port) {
  udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: port
  })
  
  udpPort.on("ready", () => {
    console.log("\nLemur's UDP Port Ready !")
    for (k in instruments) {
      if (instruments[k].lemurConfig) instruments[k].lemurConfig(sendLemur)
    }
    /*
    jouets.lemurConfig(sendLemur)
    UR.lemurConfig(sendLemur, lignesUR, colonnesUR)
    */
  })
  
  udpPort.on("message", mess => {
    //console.log("Received from Lemur: ", mess) //NOTE Debug

    for (k in instruments) {
      if (instruments[k].manageLemurMessage) instruments[k].manageLemurMessage(mess, sendLemur)
    }
    /*
    jouets.manageLemurMessage(mess, sendLemur)
    UR.manageLemurMessage(mess, sendLemur)
    */

    if (mess.address == "/Switches/x") {//NOTE Only little test feature to get rid of some day
      sendLemur("/Text", ["@content", mess.args[0]?"Clicked":"Noped"])
    }
  })

  udpPort.open()
}

function sendLemur(addr, args) {
  //console.log("Send ", args, " to Lemur's ", addr) //NOTE Debug
  udpPort.send({address:addr,args:args}, lemurIP, lemurPort)
  udpPort.send({address:addr,args:args}, lemurGael, lemurPort)
}

module.exports = {
  addInstrument: i=>Object.assign(instruments, i),
  start: openUDPSocket
}


