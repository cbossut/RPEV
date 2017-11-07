import tty
import sys
import termios
import serial
import threading
import inputs
import random
random.seed()

debug = False


# Map a range to another
def num_map(val, from_min, from_max, to_min, to_max):
    return (val - from_min)*(to_max-to_min)/(from_max-from_min) + to_min

# To forward tty output with a thread
term = None
term_flag = False
term_lock = threading.Lock()


def read_int_tty_loop():
    while True:
        term_lock.acquire()
        res = term.read()
        if len(res) and res[0] != 0xf0:
            print(res.decode('utf-8'), end='')
        term_lock.release()
read_thread = threading.Thread(target=read_int_tty_loop)


# Generic to write a command to the tty
def command(com):
    global term_flag
    # DEBUG print('debug ', debug)
    if debug:
        print(com)
    else:
        term_lock.acquire()
        term.write((com+'\r\n').encode('utf-8'))
        term.flush()
        term_flag = True
        term_lock.release()


# Establishing the connection (plus read thread & check connection with version)
def co(port="/dev/ttyACM0"):
    global term
    term = serial.Serial(port=port, baudrate=115200, timeout=0)
    read_thread.start()
    command('version')


# ---------------- MAIN FUNCS ----------------

def menu_factory(m):
    def func(state):
        state['menu'] = m
        print(m['name'])
    return func


def start_stop(state):
    if state['started']:
        command('stop')
        state['started'] = False
    else:
        command('start')
        state['started'] = True


def toggle_fear(state):
    if state['fear']:
        command('bhv 0')
        state['fear'] = False
    else:
        command('bhv 6')
        state['fear'] = True


# ---------------- GAMEPAD FUNCS ----------------

gamepad_map = None
gamepad_map_lock = threading.Lock()


def none_f(val):
    del val


def reset_map():
    global gamepad_map
    gamepad_map_lock.acquire()
    gamepad_map = {
        'l_stick': {'x': none_f, 'y': none_f, 'btn': none_f},  # x => right ; y => down
        'r_stick': {'x': none_f, 'y': none_f, 'btn': none_f},  # 0-255 ~10% giggle
        'pad': {'up': none_f, 'down': none_f, 'left': none_f, 'right': none_f},
        'triggers': {'left': none_f, 'right': none_f},  # 0-255
        'shoulders': {'left': none_f, 'right': none_f},
        'start': none_f,
        'select': none_f,
        'mode': none_f,
        'a': none_f,
        'b': none_f,
        'x': none_f,
        'y': none_f
    }
    gamepad_map_lock.release()
    print("Reset mapping")


def update_map_factory(mapping):
    def func(state):
        del state
        global gamepad_map
        gamepad_map_lock.acquire()
        for k, v in mapping.items():
            path = k.split('/')
            if len(path) == 1:
                gamepad_map[path[0]] = v
            elif len(path) == 2:
                gamepad_map[path[0]][path[1]] = v
            else:
                print("Wrong map format: ", mapping)
        gamepad_map_lock.release()
        print(mapping['name'])
    return func


def map_factory(com, range_from=None, range_to=None, fmt='%.2f', map=True):
    if map:
        def func(val):
            command(com + ' ' +
                    fmt%num_map(val, range_from[0], range_from[1], range_to[0], range_to[1]))
    else:
        def func(val):
            command(com + ' ' + fmt%val)
    return func

range_stick = [-256, 256]

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


def gamepad_event_loop():
    reset_map()
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
    while True:
        events = inputs.get_gamepad()
        for event in events:
            if event.ev_type != "Sync":
                if event.code in event_interpretation:
                    path = event_interpretation[event.code]
                    val = event.state
                    gamepad_map_lock.acquire()
                    if len(path) == 1:
                        if val != gamepad_state[path[0]]:
                            gamepad_state[path[0]] = val
                            gamepad_map[path[0]](val)
                    elif len(path) == 2:
                        if path[1] == 'x' or path[1] == 'y':  # Map sticks values to 0-255
                            val = val//(2**7)
                            if -30 < val < 30:
                                val = 0
                        if val != gamepad_state[path[0]][path[1]]:
                            gamepad_state[path[0]][path[1]] = val
                            gamepad_map[path[0]][path[1]](val)
                    else:  # Weird HAT0X/Y for pad
                        if val > 0:
                            if val != gamepad_state[path[0]][path[2]]:
                                gamepad_state[path[0]][path[2]] = val
                                gamepad_map[path[0]][path[2]](val)
                        elif val < 0:
                            if val != gamepad_state[path[0]][path[1]]:
                                gamepad_state[path[0]][path[1]] = val
                                gamepad_map[path[0]][path[1]](val)
                        else:
                            gamepad_map[path[0]][path[2]](val)
                            gamepad_map[path[0]][path[1]](-val)
                    gamepad_map_lock.release()
                else:
                    print("Unknown event: ", event.code, event.state)
        # DEBUG print(gamepad_state)

gamepad_thread = threading.Thread(target=gamepad_event_loop)
gamepad_thread.start()


# ---------------- BEEPS FUNCS ----------------

def beep_command(freq):
    command('beep ' + str(freq) + ' 10000')


def beep_factory(midi=None, freq=None):
    if not freq:
        if midi:
            freq = 2**((midi - 69)/12) * 440
        else:
            freq = 0

    def func(state):
        del state
        beep_command(freq)
    return func


def beep_rand_factory(min_freq):
    def func(state):
        del state
        beep_command(min_freq + random.random()*100)
    return func


# ---------------- LEDS FUNCS ----------------

def led_factory(color):
    def func(state):
        del state
        if color is None:
            command('led')
        else:
            command('led ' + str(color))
    return func

# ---------------- MENUS ----------------

# ================ MAIN ================

commands = {
    'name': 'commands',
    '\r': start_stop,
    'F': toggle_fear,
    ' ': beep_factory()
}

# ================ GAMEPAD MAPPINGS ================

mappings = {
    'name': 'mappings',
    '>': menu_factory(commands),
    '.': lambda state: reset_map()
}
commands.update({
    '8': update_map_factory({
        'name': 'classic',
        'l_stick/x': map_factory('dy', range_stick, [-50, 50]),
        'l_stick/y': lambda val: command('dx ' + '%.2f' % num_map(val, -256, 256, 50, -50)),
        'r_stick/x': lambda val: command('extraY ' + '%.2f' % num_map(val, -256, 256, 50, -50)),
        'r_stick/y': lambda val: command('extraX ' + '%.2f' % num_map(val, -256, 256, -50, 50)),
        'triggers/left': lambda val: command('turn ' + '%.2f' % (-val*90/255)),
        'triggers/right': lambda val: command('turn ' + '%.2f' % (val*90/255)),
        'a': lambda val: command('h -55') if val else None,
        'b': lambda val: command('h -100') if val else None,
        'x': lambda val: command('h -30') if val else None,
        'y': lambda val: command('h -130') if val else None
    }),
    '9': update_map_factory({
        'name': 'leg',
        'r_stick/x': map_factory('extraX 0', range_stick, [-30, 80]),
        'r_stick/y': map_factory('extraY 0', range_stick, [-30, 80]),
        'triggers/left': map_factory('extraZ 0', [0, 255], [0, -50]),
        'triggers/right': map_factory('extraZ 0', [0, 255], [0, 50])
    })
})

keyboard_map = [
    ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à'],
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!']
]

# Access from main menu
commands['M'] = menu_factory(mappings)

# ================ BEEPS ================

# Piano keyboard
beep_keys = ['a', 'é', 'z', '"', 'e', 'r', '(', 't', '-', 'y', 'è', 'u',
             'w', 's', 'x', 'd', 'c', 'v', 'g', 'b', 'h', 'n', 'j', ',',
             'A', '2', 'Z', '3', 'E', 'R', '5', 'T', '6', 'Y', '7', 'U',
             'W', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', '?']

# Remaining keys to random beep
beep_rand = ['_', 'ç', 'à', ')', '=', 'i', 'o', 'p', '^', '$',
             'k', 'l', 'm', 'ù', '*', ';', ':', '!']

beeps = {
    'name': 'beeps',
    '>': menu_factory(commands),
    ' ': beep_factory()
}

# Populate with above key maps
beeps.update({beep_keys[i]: beep_factory(i+48) for i in range(len(beep_keys))})
beeps.update({beep_rand[i]: beep_rand_factory(50 + 100*i) for i in range(len(beep_rand))})
commands.update({beep_rand[i]: beep_rand_factory(50 + 100*i) for i in range(len(beep_rand))})

# Access from main menu
commands['B'] = menu_factory(beeps)

# ================ LEDS ================

# Auto-populate main menu:
# 1: Blue
# 2: Green
# 3: Cyan
# 4: Red
# 5: Magenta
# 6: Yellow(ish)
# 7: White
# 0: Off
# .: Decustom
commands.update({str(i): led_factory(i) for i in range(8)})
commands['.'] = led_factory(None)


# |-|-|-|-|-|-|-|-| Main function |-|-|-|-|-|-|-|-|

def keys():
    state = {
        'menu': commands,
        'started': False,
        'fear': False
    }

    orig_settings = termios.tcgetattr(sys.stdin)

    tty.setraw(sys.stdin)
    x = 0
    try:
        while x != chr(27):  # ESC
            x = sys.stdin.read(1)[0]
            if x in state['menu']:
                state['menu'][x](state)
            else:
                print('Nothing for ', x)
    finally:
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, orig_settings)
