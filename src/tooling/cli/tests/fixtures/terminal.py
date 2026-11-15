"""Drive the actual CLI using a native terminal, keeping final stdout separate."""
import errno
import json
import os
import pty
import selectors
import signal
import subprocess
import sys
import termios

master, slave = pty.openpty()
original = termios.tcgetattr(slave)
child = subprocess.Popen(sys.argv[1:], stdin=slave, stdout=subprocess.PIPE, stderr=slave)
selector = selectors.DefaultSelector()
selector.register(master, selectors.EVENT_READ, 'stderr')
selector.register(child.stdout, selectors.EVENT_READ, 'stdout')
selector.register(sys.stdin, selectors.EVENT_READ, 'control')

def emit(kind, value):
    print(json.dumps({kind: value}), flush=True)

while child.poll() is None or len(selector.get_map()) > 1:
    for key, _ in selector.select(0.1):
        if key.data == 'control':
            line = sys.stdin.readline()
            if not line:
                child.terminate()
                selector.unregister(sys.stdin)
                continue
            command = json.loads(line)
            if 'input' in command:
                os.write(master, command['input'].encode())
            if 'signal' in command:
                child.send_signal(getattr(signal, command['signal']))
        else:
            try:
                data = os.read(key.fd, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                data = b''
            if data:
                emit(key.data, data.decode(errors='replace'))
            else:
                selector.unregister(key.fileobj)
    if child.poll() is not None:
        # The slave stays open to verify restoration; drain then finish.
        ready = selector.select(0)
        if not any(key.data != 'control' for key, _ in ready):
            break
emit('code', child.wait())
emit('restored', termios.tcgetattr(slave) == original)
os.close(master)
os.close(slave)
