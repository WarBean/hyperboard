import os
import sys
import argparse
from os import path
from hyperboard import Server

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', help = 'server port, default 5000', type = int, default = 5000)
    parser.add_argument('--user', help = 'user name')
    parser.add_argument('--password', help = 'user password')
    parser.add_argument('--debug', help = 'use Flask\' s debug mode, better to run with --local', action="store_true")
    parser.add_argument('--local', help = 'only available to local access', action="store_true")
    args = parser.parse_args()

    if args.user is None or args.password is None: auth_pair = None
    else: auth_pair = (args.user, args.password)

    if args.local: host = '127.0.0.1'
    else: host = '0.0.0.0'

    record_dir = os.getcwd()
    server = Server(record_dir, auth_pair)
    server.run(host = host, debug = args.debug, port = args.port, threaded = True)
