const lemurIP = "192.168.0.31",
      lemurPort = 8000,
      osc = require("osc"),
      udpPort = new osc.UDPPort({
        localAddress: "0.0.0.0",
        localPort: 8000
      }),
      jouets = require("../Jouets/jouets.js"),
      UR = require("../UR/UR.js")

function sendLemur(addr, args) {
  //console.log("Send ", args, " to Lemur's ", addr) //NOTE Debug
  udpPort.send({address:addr,args:args}, lemurIP, lemurPort)
}

udpPort.on("ready", () => {
  console.log("\nLemur's UDP Port Ready !")
  jouets.lemurConfig(sendLemur)
})

udpPort.on("message", mess => {
  //console.log("Received from Lemur: ", mess) //NOTE Debug
  
  jouets.manageLemurMessage(mess, sendLemur)
  UR.manageLemurMessage(mess, sendLemur)
  

  if (mess.address == "/Switches/x") {//NOTE Only little test feature to get rid of some day
    sendLemur("/Text", ["@content", mess.args[0]?"Clicked":"Noped"])
  }
})

udpPort.open()
