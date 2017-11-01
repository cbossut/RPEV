const URIP = "192.168.0.1",
      URPort = 30001, // 2 less mess ? 3 125Hz instead 10
      net = require("net"),
      sock = net.connect(URIP, URPort, () => console.log("UR's TCP Socket Ready !")).on('error', console.log).on('data', console.log)

let getMode = 0,
    sel = -1,
    positions = []

function manageLemurMessages(mess) {
  if (mess.address == "/UR/Mode") getMode = mess.args[0]
  
  else if (mess.address == "/UR/Positions") {
    let on = []
    for (let i = 0 ; i < mess.args.length ; i++) {
      if (mess.args[i]) on.push(i)
    }
    if (!on.length) sel = -1
    else if (sel == -1 && on.length == 1) {
      sel = on[0]
      if (getMode) {
        sock.write("get_actual_joint_positions()\n")
      } else {
        sock.write("movej("+positions[sel]+")")
      }
    }
  }
}



/////// Serial

const serial = require("serialport")

let p = "",
    myport

serial.list((err, res) => {
  for (let i = 0 ; i < res.length ; i++) {
    if (res[i].manufacturer != 'Microsoft') p = res[i].comName
  }
  
  myport = new serial(p, {baudRate: 9600}, () => {console.log('opened !')})

  myport.setEncoding('utf8')
  myport.on('data', console.log)
})

