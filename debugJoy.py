import threading
import inputs

from fivebot import Car
from gui import DebugGui

c = Car('/dev/ttyUSB0')


def launch_gui():
    DebugGui().run(c)

gui_thread = threading.Thread(target=launch_gui)
gui_thread.start()

event_interpretation = {
    'ABS_X': ['l_stick', 'x'],
    'ABS_Y': ['l_stick', 'y'],
    'BTN_THUMBL': ['l_stick', 'btn'],
    'ABS_RX': ['r_stick', 'x'],
    'ABS_RY': ['r_stick', 'y'],
    'BTN_THUMBR': ['r_stick', 'btn'],
    'ABS_HAT0X': ['pad', 'left', 'right'],
    'ABS_HAT0Y': ['pad', 'up', 'down'],
    'ABS_Z': ['triggers', 'left'],
    'ABS_RZ': ['triggers', 'right'],
    'BTN_TL': ['shoulders', 'left'],
    'BTN_TR': ['shoulders', 'right'],
    'BTN_START': ['start'],
    'BTN_SELECT': ['select'],
    'BTN_MODE': ['mode'],
    'BTN_SOUTH': ['a'],
    'BTN_EAST': ['b'],
    'BTN_NORTH': ['x'],
    'BTN_WEST': ['y']
}
gamepad_state = {
    'l_stick': {'x': 0, 'y': 0, 'btn': 0},  # x => right ; y => down
    'r_stick': {'x': 0, 'y': 0, 'btn': 0},  # +/- 2^15 (32768) ~10% giggle
    'pad': {'up': 0, 'down': 0, 'left': 0, 'right': 0},
    'triggers': {'left': 0, 'right': 0},  # 0-255
    'shoulders': {'left': 0, 'right': 0},
    'start': 0,
    'select': 0,
    'mode': 0,
    'a': 0,
    'b': 0,
    'x': 0,
    'y': 0
}


def joy_loop():
    while True:
        gamepad_chg = False
        events = inputs.get_gamepad()
        for event in events:
            if event.ev_type != "Sync":
                if event.code in event_interpretation:
                    path = event_interpretation[event.code]
                    val = event.state
                    if len(path) == 1:
                        if val != gamepad_state[path[0]]:
                            gamepad_state[path[0]] = val
                            gamepad_chg = True
                    elif len(path) == 2:
                        if path[1] == 'x' or path[1] == 'y':  # Map sticks values to 0-255
                            val = val // (2 ** 7)
                            if -30 < val < 30:
                                val = 0
                        if val != gamepad_state[path[0]][path[1]]:
                            gamepad_state[path[0]][path[1]] = val
                            gamepad_chg = True
                    else:  # Weird HAT0X/Y for pad
                        if val > 0:
                            if val != gamepad_state[path[0]][path[2]]:
                                gamepad_state[path[0]][path[2]] = val
                                gamepad_chg = True
                        elif val < 0:
                            if val != gamepad_state[path[0]][path[1]]:
                                gamepad_state[path[0]][path[1]] = val
                                gamepad_chg = True
                else:
                    print("Unknown event: ", event.code, event.state)
        if gamepad_chg:
            if gamepad_state['select'] == 1:
                return
            v1 = gamepad_state['l_stick']['y']/5
            v2 = gamepad_state['l_stick']['x']/5
            v3 = (gamepad_state['triggers']['left'] - gamepad_state['triggers']['right'])/5
            #if gamepad_state['start'] == 1 or (v1 == 0 and v2 == 0 and v3 == 0):
            #    c.set_speed(0, 0, 0, True)
            #    print("reset")
            #else:
            c.set_speed(v1, v2, v3, True)

joy_thread = threading.Thread(target=joy_loop)
joy_thread.start()
