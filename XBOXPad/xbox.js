const HID = require('node-hid')
    , device = new HID.HID(1118, 654)
    , instrus = {}

let state = {
  a: false,
  b: false,
  x: false,
  y: false,
  start: false,
  select: false,
  r1: false,
  l1: false,
  rh: false,
  lh: false,
  pad: 0,
  rx: 0,
  ry: 0,
  lx: 0,
  ly: 0,
  z: 0
}
let curMap = {}
for (let k in state) {
  curMap[k] = (arg)=>{console.log("Nothing for",k, arg)}
}

device.on('error', console.log)

function mapEntry(buf) {
  let chg = updateXBOX(buf)
  
  for (let k in chg) {
    curMap[k](chg[k])
  }
}

let prevStr = ''
function bufPrint(buf) {
  let str = '',
      ind = ''
  for (let i = 0 ; i < buf.length ; i++) {
    let tmp = buf[i].toString(2)
    while (tmp.length < 8) tmp = '0'+tmp
    str += '   '+tmp
    ind += ' '+i.toString(buf.length)+' 12345678'
  }
  console.log(ind)
  let tmp = str.split('')
  tmp.forEach((v,i,a)=>{if (v == prevStr[i]) tmp[i] = ' '})
  tmp = tmp.join('')
  console.log(tmp)
  prevStr = str
}

function updateXBOX(buf) {
  let cur = {//TODO Take care of jitter here instead of main index
    lx: buf[1],
    ly: buf[3],
    rx: buf[5],
    ry: buf[7],
    z: buf[9],
    pad: buf[11]>>2,
    a: (buf[10]&1) != 0,
    b: (buf[10]&2) != 0,
    x: (buf[10]&4) != 0,
    y: (buf[10]&8) != 0,
    l1: (buf[10]&16) != 0,
    r1: (buf[10]&32) != 0,
    select: (buf[10]&64) != 0,
    start: (buf[10]&128) != 0,
    lh: (buf[11]&1) != 0,
    rh: (buf[11]&2) != 0
  }
  
  let res = {}
  for (let key in cur) {
    if (cur[key] != state[key]) res[key] = cur[key]
  }
  state = cur
  return res
}

/*
10: btns
1 start
2 sel
3 R1
4 L1
5 y
6 x
7 b
8 a

11 3-6 int4 (0-15): pad
0 center
1-8 up to left-up clockwise

11:
7 R hat
8 R hat

1+2: LX
3+4: LY
5+6: RX
7+8: RY
9: Gachettes
*/

module.exports = {
  addInstrument: i=>Object.assign(instrus, i),
  start: ()=>device.on('data', mapEntry),
  chgMap: (m)=>Object.assign(curMap, m)
}
