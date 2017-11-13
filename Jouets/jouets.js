module.exports = {
  lemurConfig: lemurConfig,
  manageLemurMessage: manageLemurMessage
}

//TODO Separate interface code and jouets computing ?
//TODO make sendLemur global ?

const http = require("http"),
      fs = require("fs"),
      jouets = JSON.parse(fs.readFileSync(__dirname+"/jouets.json"))
      PWMMaxWait = 2 //FUTURE could check max connections total for each jouet, and keep some free for btns/emergency ?

for (let i = 1 ; i < jouets.length ; i++) {
  jouets[i].PWMSent = 0
}

function sendJouet(n, path, clbk) { //TODO could be even more generic cause similar clbks
  //console.log("Send ", path, " to ", jouets[n].name) //DEBUG
  http.get("http://"+jouets[n].ip+"/"+path, clbk).on('error', (err)=>{
    jouets[n].PWMSent = 0
    errClbk(err)
  })
}

function errClbk(err) {console.log("Jouets :", err.code, " at ", err.address)}

function lemurConfig(sendLemur) {
  for (let i = 1 ; i < jouets.length ; i++) {
    const jouet = jouets[i]
    sendLemur("/Jouet"+i+"/Name", ["@content", jouet.name])
    //////////////////////////////WARNING !!!!!!!!! Change here the number of btns on the interface
    for (let j = 1 ; j <= 4 ; j++) { //TODO Btns should be an array ? limited by max Btns in Lemur
      const btn = "Btn"+j
      if (!jouet[btn]) {
        sendLemur("/Jouet"+i+"/"+btn, ["@outline", 0])
      } else if (jouet[btn].startsWith("trigger")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 1, "@outline", 1])
      } else {//if (jouet[btn].startsWith("toggle")) {
        sendLemur("/Jouet"+i+"/"+btn, ["@behavior", 0, "@outline", 1])
        sendLemur("/Jouet"+i+"/"+btn+"/x", 0)
      }
    }
    sendLemur("/Jouet"+i+"/Btn5", jouet.PWMInit ? ["@behavior", 1, "@outline", 1] : ["@outline", 0])
    if (jouet.PWMInit) sendLemur("/Jouet"+i+"/PWM/x", Math.abs((jouet.PWMInit-jouet.PWMBorns[0])/(jouet.PWMBorns[1]-jouet.PWMBorns[0])))
  }
}

function manageLemurMessage(mess, sendLemur) {
  const addr = mess.address.split('/')
  if (addr[1].startsWith('Jouet')) {
    const n = addr[1].slice('Jouet'.length), //TODO Warning ! n seems to be a number but is a char
          jouet = jouets[n]
    
    
    
    if (addr[2] == "PWM" && addr[3] == 'x' && jouet.PWMSent < PWMMaxWait) {
      jouet.PWMSent++
      let PWMval = Math.round(mess.args[0]*(jouet.PWMBorns[1]-jouet.PWMBorns[0])+jouet.PWMBorns[0])
      sendJouet(n, "PWM?v="+PWMval, res => {
        jouet.PWMSent--
        res.setEncoding('utf8')
        res.on('data', data => sendLemur("/"+addr[1]+"/PWMValue", ["@content",data.slice(1)]))
      })
      
      
      
    } else if (addr[2].startsWith("Btn")) {
      if (addr[2].slice('Btn'.length) == 5 && mess.args[0]) {
        sendJouet(n, "PWM?v="+jouet.PWMInit, res => {
          res.setEncoding('utf8')
          res.on('data', data => sendLemur("/"+addr[1]+"/PWMValue", ["@content",data.slice(1)]))
        })
        sendLemur("/"+addr[1]+"/PWM/x", Math.abs((jouet.PWMInit-jouet.PWMBorns[0])/(jouet.PWMBorns[1]-jouet.PWMBorns[0])))
      } else if (jouet[addr[2]]) {
        if (jouet[addr[2]].startsWith("toggle") || (jouet[addr[2]].startsWith("trigger") && mess.args[0])) {//TODO Strange way to manage trig and tog
          sendJouet(n, jouet[addr[2]], res => {
            res.setEncoding('utf8')
            res.on('data', data => sendLemur("/"+addr[1]+"/Mess", ["@content", data]))
          })
        } else if (jouet[addr[2]] == "move") {
          if (!jouet.Hpin) jouet.Hpin = 12
          sendJouet(n, "toggle?pin="+jouet.Hpin, res => {
            res.setEncoding('utf8')
            res.on('data', data => {/*jouet.move = data.endsWith('1');*/ sendLemur("/"+addr[1]+"/Mess", ["@content", data])})
          })
          jouet.move = !jouet.move
        } else if (jouet[addr[2]] == "switch") {
          if (jouet.Hpin == 12) jouet.Hpin = 14
          else jouet.Hpin = 12
          if (jouet.move) {
            sendJouet(n, "toggle?pin="+(jouet.Hpin==12?14:12), jouet.tmp = res => {
              sendJouet(n, "toggle?pin="+jouet.Hpin, res => {
                res.setEncoding('utf8')
                res.on('data', data => {sendLemur("/"+addr[1]+"/Mess", ["@content", data])})
              })
            })
            jouet.tmp({setEncoding:()=>{},on:()=>{}})
          }
        }
      }
      
      
    } else if (addr[2] == "Reset" && mess.args[0]) {
      sendJouet(n, "reset", res => {
        res.setEncoding('utf8')
        res.on('data', data => sendLemur("/"+addr[1]+"/Mess", ["@content",data]))
      })
    }
  }
}
