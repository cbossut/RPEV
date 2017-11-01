module.exports = {
  lemurConfig: lemurConfig,
  manageLemurMessage: manageLemurMessage
}

//TODO Separate interface code and jouets computing ?

const http = require("http"),
      fs = require("fs"),
      jouets = JSON.parse(fs.readFileSync(__dirname+"/jouets.json"))
      PWMMaxWait = 2 //FUTURE could check max connections total for each jouet, and keep some free for btns/emergency ?

for (let i = 1 ; i < jouets.length ; i++) {
  jouets[i].PWMSent = 0
}

function sendJouet(n, path, clbk) { //TODO could be even more generic cause similar clbks
  console.log("Send ", path, " to ", jouets[n].name) //NOTE Debug
  http.get("http://"+jouets[n].ip+"/"+path, clbk).on('error', (err)=>{
    jouets[n].PWMSent = 0
    errClbk(err)
  })
}

function errClbk(err) {console.log(err.code, " at ", err.address)}

function lemurConfig(sendLemur) {
  for (let i = 1 ; i < jouets.length ; i++) {
    const jouet = jouets[i]
    sendLemur("/Jouet"+i+"/Name", ["@content", jouet.name])
    for (let j = 1 ; j <= 3 ; j++) { //TODO Btns should be an array ? limited by max Btns in Lemur
      const btn = "Btn"+j
      if (jouet[btn].startsWith("trigger")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 1])
      } else if (jouet[btn].startsWith("toggle")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 0])
      } else {
        sendLemur("/Jouet"+i+"/"+btn, ["@outline", 0])
      }
    }
  }
}

function manageLemurMessage(mess, sendLemur) {
  const addr = mess.address.split('/')
  if (addr[1].startsWith('Jouet')) {
    const n = addr[1][addr[1].length-1], //TODO Warning ! n seems to be a number but is a char
          jouet = jouets[n]
    
    
    
    if (addr[2] == "PWM" && addr[3] == 'x' && jouet.PWMSent < PWMMaxWait) {
      jouet.PWMSent++
      let PWMval = Math.round(mess.args[0]*(jouet.PWMBorns[1]-jouet.PWMBorns[0])+jouet.PWMBorns[0])
      sendJouet(n, "PWM?v="+PWMval, res => {
        jouet.PWMSent--
        res.setEncoding('utf8')
        res.on('data', data => sendLemur("/"+addr[1]+"/PWMValue", ["@content",data.slice(1)]))
      })
      
      
      
    } else if (addr[2].startsWith("Btn") && (jouet[addr[2]].startsWith("toggle") || mess.args[0])) { //TODO Strange way to manage trig and tog
      sendJouet(n, jouet[addr[2]], res => {
        res.setEncoding('utf8')
        res.on('data', data => sendLemur("/"+addr[1]+"/Mess", ["@content", data]))
      })
      
      
      
    } else if (addr[2] == "Reset" && mess.args[0]) {
      sendJouet(n, "reset", res => {
        res.setEncoding('utf8')
        res.on('data', data => sendLemur("/"+addr[1]+"/Mess", ["@content",data]))
      })
    }
  }
}
