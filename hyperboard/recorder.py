import os
import math
import json
import glob
import hashlib
import numpy as np

class Recorder:

    def __init__(self, dirname):
        self.dirname = dirname
        self.name2series = {}
        self.name2file = {}
        self.newbie = set()
        for path in glob.glob(os.path.join(dirname, '*.record')):
            name = os.path.basename(path)[:-len('.record')]
            f = open(path)
            hyperparameters = json.loads(f.readline())
            metric = f.readline().strip()
            records = []
            for line in f.readlines():
                index, value = line.split(' ')
                records.append([eval(index), eval(value)])
            f.close()
            if records != []:
                self.name2series[name] = {
                    'hyperparameters': hyperparameters,
                    'records': records,
                    'metric': metric,
                }

    def register(self, hyperparameters, metric, overwrite):
        md5 = hashlib.md5()
        hyperjson = json.dumps(hyperparameters, sort_keys = True)
        md5.update(hyperjson.encode())
        name = md5.hexdigest()
        if name in self.name2series:
            if overwrite:
                self.delete([name])
            else:
                return '<fail>'
        self.name2series[name] = {
            'hyperparameters': hyperparameters.copy(),
            'metric': metric,
            'records': [],
        }
        self.newbie.add(name)
        f = open(os.path.join(self.dirname, name + '.record'), 'w')
        f.write(hyperjson + '\n')
        f.write(metric + '\n')
        f.flush()
        self.name2file[name] = f
        return name

    def append(self, name, index, value):
        if name not in self.name2series:
            return 'record is already deleted!'
        self.name2series[name]['records'].append([index, value])
        self.name2file[name].write(str(index) + ' ' + str(value) + '\n')
        self.name2file[name].flush()
        return 'success'

    def delete(self, names):
        for name in names:
            if name in self.name2file:
                self.name2file[name].close()
                del self.name2file[name]
            del self.name2series[name]
            path = os.path.join(self.dirname, name + '.record')
            os.remove(path)

    def max_index(self, name):
        if name in self.newbie:
            self.newbie.remove(name)
            return -1
        records = self.name2series[name]['records']
        if len(records) == 0:
            return 0
        return records[-1][0]

    def sample(self, name, max_sample_count, smooth_window):
        if max_sample_count == 0: return []
        records = self.name2series[name]['records']
        length = len(records)
        if length == 0: return []
        delta = int(math.ceil(float(length) / max_sample_count))
        records = np.array(records)
        samples = [
            np.mean(records[index : index + smooth_window], axis = 0)
            for index in range(0, length + 1 - smooth_window, delta)
        ]
        samples = [[int(sample[0]), sample[1]] for sample in samples]
        return samples
