const lemurIP = "192.168.1.41",
      lemurPort = 8000,
      osc = require("osc"),
      udpPort = new osc.UDPPort({
        localAddress: "0.0.0.0",
        localPort: 8000
      }),
      jouets = require("../Jouets/jouets.js")

function sendLemur(addr, args) {
  //console.log("Send ", args, " to Lemur's ", addr) //NOTE Debug
  udpPort.send({address:addr,args:args}, lemurIP, lemurPort)
}

udpPort.on("ready", () => {
  console.log("\nUDP Port Ready !")
  jouets.lemurConfig(sendLemur)
})

udpPort.on("message", mess => {
  //console.log("Message received :", mess) //NOTE Debug
  
  jouets.manageLemurMessage(mess, sendLemur)
  

  if (mess.address == "/Switches/x") {//NOTE Only little test feature to get rid of some day
    sendLemur("/Text", ["@content", mess.args[0]?"Clicked":"Noped"])
  }
})

udpPort.open()
