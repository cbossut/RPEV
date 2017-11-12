import sys
import socket
from fivebot import Car

if __name__ == "__main__":
    if len(sys.argv) == 1:
        print("ip addr as arg")
        sys.exit()
    car = Car('/dev/ttyUSB0')
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind((sys.argv[1], 12345))
    sock.listen(1)
    print("waiting for client")
    client, addr = sock.accept()
    print("connected to ", addr)
    msg = b''
    while 1:
        msg += client.recv(255)
        print("received ", msg)
        while len(msg) >= 15:
            keep = msg[0:15]
            msg = msg[15:]
        print("keep ", keep)
        print("left ", msg)
        if keep == b"close"*3:
            sys.exit()
        args = [keep[0:5],keep[5:10],keep[10:15]]
        res = [-float(arg.decode('utf-8'))*20 for arg in args]
        print(res)
        car.set_speed(res[0], res[1], res[2], True)
