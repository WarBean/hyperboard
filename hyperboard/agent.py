import sys
import math
import json
import requests

class Agent:

    def __init__(self, username = '', password = '', address = '127.0.0.1', port = 5000):
        self.url = 'http://%s:%d' % (address, port)
        self.auth = (username, password)

    def register(self, hyperparameters, metric, overwrite = False):
        url = self.url + '/register'
        data = { 'json': json.dumps(dict(
            hyperparameters = hyperparameters,
            metric = metric,
            overwrite = overwrite,
        ))}
        r = requests.get(url, auth = self.auth, data = data)
        result = r.content.decode()
        if result == 'Unauthorized Access':
            print('Error: %s, please provide your username and password by:' % result)
            print('\tagent = Agent(your_username, your_password)')
            sys.exit()
        if result == '<fail>':
            msg = ''
            while msg not in ['Y', 'y', 'N', 'n']:
                print('overwrite? [Y/n]')
                msg = sys.stdin.readline().strip()
            if msg in 'Nn':
                print('Record already exist, choose not to overwrite.')
                sys.exit()
            data = { 'json': json.dumps(dict(
                hyperparameters = hyperparameters,
                metric = metric,
                overwrite = True,
            ))}
            r = requests.get(url, auth = self.auth, data = data)
        name = r.content.decode()
        return name

    def append(self, name, index, value):
        if math.isinf(value):
            print('HyperBorad agent get invalid value: %f' % value)
            sys.exit()
        url = self.url + '/append'
        data = { 'json': json.dumps(dict(
            name = name,
            index = index,
            value = value,
        ))}
        r = requests.get(url, auth = self.auth, data = data)
        result = r.content.decode()
        if result != 'success':
            print('HyperBorad agent failed to append: %s' % result)
            sys.exit()
