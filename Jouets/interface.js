var jouets = 0
 
function clbk(data) {console.log("answer: "+data)}
 
function preload() {
  jouets = loadJSON("jouets.json")
}
 
function setup() {
  var i = 0
  while (jouets[++i]) {
    var jouet = jouets[i]
    for (var j = 0 ; j < jouet.functions.length ; j++) {
      var gui
      let func = jouet.functions[j]
      if (func == "pitch") {
        gui = createSlider(0, 1023)
        gui.mouseClicked(()=>httpGet("http://192.168.1.10/?p="+gui.value(), callback=clbk))
      } else {
        gui = createButton(jouet.name + func)
        gui.mousePressed(()=>httpGet("http://192.168.1.10/"+func, callback=clbk))
      }
    }
  }
}
 
function draw() {
  // put drawing code here
}