const xb = require('./XBOXPad/xbox.js')
    , lemur = require('./Lemur/index.js')
    , mb = require('./Metabot/metabot.js')
    , fb = require('./FiveBot/fivebot.js')
    , jouets = require('./Jouets/jouets.js')
    , UR = require('./UR/UR.js')
    , lemurListenPort = 8000
    , RPIP = "192.168.0.40"
    , RPPort = 12345
    , UR3IP = "192.168.0.43"
    , UR5IP = "192.168.0.45"
    , URPort = 30002

mb.init()

fb.init(RPIP, RPPort)

UR.init(UR3IP, UR5IP, URPort)

//TOBO Currently useless, by this design, xbox should call mb methods itself, Lemur selecting the way xbox maps, treating xbox as an instrment for Lemur
xb.addInstrument({Metabot:mb, Fivebot:fb})

// Metabot map
xb.chgMap({
  start: (arg)=>arg && mb.start(),
  select: (arg)=>arg && mb.send("stop"),
  a: (arg)=>arg && mb.send('h -55'),
  b: (arg)=>arg && mb.send('h -100'),
  x: (arg)=>arg && mb.send('h -30'),
  y: (arg)=>arg && mb.send('h -130'),
  lx: (arg)=>mb.send('dy ' + mapXBtoMB(arg)),
  rx: (arg)=>mb.send('extraY ' + -mapXBtoMB(arg)),
  ly: (arg)=>mb.send('dx ' + -mapXBtoMB(arg)),
  ry: (arg)=>mb.send('extraX ' + mapXBtoMB(arg)),
  z: (arg)=>mb.send('turn ' + -mapXBtoMB(arg, 180))
})

// Fivebot map
/*
let x=0, y=0, r=0
xb.chgMap({
  select: (arg)=>arg && fb.close(),
  lx: (arg)=>{y = mapXBtoFB(arg); fb.sendXYR(x,y,r)},
  ly: (arg)=>{x = mapXBtoFB(arg); fb.sendXYR(x,y,r)},
  z: (arg)=>{r = mapXBtoFB(arg); fb.sendXYR(x,y,r)}
})*/

xb.start()



lemur.addInstrument({UR:UR, XBOX:xb, Jouets:jouets})

lemur.start(lemurListenPort)



function mapXBtoFB(v) {
  return v*10/255 - 5
}

function mapXBtoMB(v, range=100) {
  v *= range/255
  v -= range/2
  return Math.abs(v) < 6.5 ? 0 : Math.round(v)
}
