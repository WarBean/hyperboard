import time
import math
import json
import random
from hyperboard import Agent

agent = Agent()

metric2scale = { 'cross entropy': 10, 'accuracy': 1, 'BLEU': 100 }
criteria2metric = {
    'train loss': 'cross entropy',
    'valid loss': 'cross entropy',
    'train accu': 'accuracy',
    'valid accu': 'accuracy',
    'test BELU': 'BLEU'
}

name_list = []
criteria_list = []
offset_list = []
for learning_rate in [0.1, 0.01, 0.001]:
    for batch_size in [128, 256]:
        for optimizer in ['SGD', 'Adam']:
            for criteria in criteria2metric.keys():
                for corpus in ['wikipedia', 'PennTreeBank']:
                    hyperparameters = {
                        'learning rate': learning_rate,
                        'batch size': batch_size,
                        'criteria': criteria,
                        'corpus': corpus,
                        'optimizer': optimizer,
                        'momentum': 0.9,
                        'num hidden': 300,
                    }
                    metric = criteria2metric[criteria]
                    print('register criteria <%s> as metric <%s>' % (criteria, metric))
                    name = agent.register(hyperparameters, metric)
                    name_list.append(name)
                    criteria_list.append(criteria)
                    offset_list.append(abs(random.random() * 0.5))

for i in range(10000):
    print('append %d' % i)
    for name, criteria, offset in zip(name_list, criteria_list, offset_list):
        value = math.exp(- i / 10.0) + offset + random.random() * 0.05
        metric = criteria2metric[criteria]
        if metric == 'accuracy': value = 1 - value
        scale = metric2scale[metric]
        value *= scale
        agent.append(name, i, value)
    time.sleep(0.1)
