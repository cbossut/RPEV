var lemurIP = "192.168.0.31",
    lemurPort = 8000,
    fs = require("fs"),
    http = require("http"),
    osc = require("osc"),
    udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 8000
    }),
    jouets = JSON.parse(fs.readFileSync("../Jouets/jouets.json"))

for (var i = 1 ; i < jouets.length ; i++) {
  jouets[i].PWMWait = false
}

//console.log(jouets)

function sendLemur(addr, args) {
  udpPort.send({address:addr,args:args},lemurIP,lemurPort)
}

udpPort.on("ready", function() {
  console.log("UDP Port Ready !")
  for (let i = 1 ; i < jouets.length ; i++) {
    var jouet = jouets[i]
    sendLemur("/Jouet"+i+"/Name", ["@content", jouet.name])
    for (let j = 1 ; j <= 3 ; j++) { //TODO Btns should be an array ? limited by max Btns in Lemur
      var btn = "Btn"+j
      if (jouet[btn].startsWith("trigger")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 1])
      } else if (jouet[btn].startsWith("toggle")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 0])
      } else {
        sendLemur("/Jouet"+i+"/"+btn, ["@outline", 0])
      }
    }
  }
})

udpPort.on("message", function(mess) {
  //console.log("Message received :", mess)
  
  var addr = mess.address.split('/')
  if (addr[1].startsWith('Jouet')) {
    var jouet = jouets[addr[1][addr[1].length-1]]
    if (addr[2] == "PWM" && !jouet.PWMWait) {
      jouet.PWMWait = true
      var PWMval = mess.args[0]*(jouet.PWMBorns[1]-jouet.PWMBorns[0])+jouet.PWMBorns[0]
      http.get("http://"+jouet.ip+"/PWM?v="+PWMval, (res)=>{
        jouet.PWMWait = false
        res.setEncoding('utf8')
        res.on('data', (data)=>{
         sendLemur("/"+addr[1]+"/PWMValue", ["@content",data.slice(1)])
        })
      })
    } else if (addr[2].startsWith("Btn") && mess.args[0]) {
      console.log("Saying ", jouet[addr[2]], " to ", jouet.name)
      http.get("http://"+jouet.ip+"/"+jouet[addr[2]], (res)=>{
        res.setEncoding('utf8')
        res.on('data', (data)=>{
          sendLemur("/"+addr[1]+"/Mess", ["@content", data])
        })
      })
    } else if (addr[2] == "Reset") {
      http.get("http://"+jouet.ip+"/reset", (res)=>{
        res.setEncoding('utf8')
        res.on('data', (data)=>{
          sendLemur("/"+addr[1]+"/Mess", ["@content",data])
        })
      })
    }
  }
  
  
  
  
  
  if (mess.address == "/Switches/x") {//NOTE Only little test feature to get rid of some day
    sendLemur("/Text", ["@content", mess.args[0]?"Clicked":"Noped"])
  }
})

udpPort.open()



