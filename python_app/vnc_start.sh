#!/bin/bash
Xvfb :99 -screen 0 1280x800x24 &
fluxbox &
x11vnc -display :99 -nopw -forever -shared &
exec "$@"