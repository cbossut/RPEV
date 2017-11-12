const xb = require('./XBOXPad/xbox.js')
    , mb = require('./Metabot/metabot.js')

mb.init()

xb.addInstrument({Metabot:mb})

xb.start()

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

function mapXBtoMB(v, range=100) {
  v *= range/255
  v -= range/2
  return Math.abs(v) < 6.5 ? 0 : Math.round(v)
}
