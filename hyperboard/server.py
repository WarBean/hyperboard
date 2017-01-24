import os
import sys
import json
from .recorder import Recorder
from flask_httpauth import HTTPBasicAuth
from flask import Flask, request, render_template, jsonify

class Server:

    def __init__(self, record_dir, auth_pair = None):

        recorder = Recorder(record_dir)
        self.prev_max_sample_count = -1
        self.prev_smooth_window = -1

        app = Flask(__name__)
        if auth_pair is None:
            class EmptyAuth:
                def get_password(self, func): return func
                def login_required(self, func): return func
            auth = EmptyAuth()
        else:
            auth = HTTPBasicAuth()

        @auth.get_password
        def get_pw(username):
            if username == auth_pair[0]: return auth_pair[1]
            else: return None

        @app.route('/')
        @auth.login_required
        def index():
            return render_template('curve.html')
        app.add_url_rule('/curve', 'index', index)

        @app.route('/update')
        @auth.login_required
        def update():
            def as_int(s, lower):
                s = s.strip()
                if s.isnumeric(): return max(lower, int(float(s)))
                else: return lower
            response = {}
            name2max_index = json.loads(request.args.get('name2max_index'))
            max_sample_count = as_int(request.args.get('max_sample_count'), 0)
            smooth_window = as_int(request.args.get('smooth_window'), 1)
            setup_changed = False
            if max_sample_count != self.prev_max_sample_count:
                setup_changed = True
                self.prev_max_sample_count = max_sample_count
            if smooth_window != self.prev_smooth_window:
                setup_changed = True
                self.prev_smooth_window = smooth_window
            for name, series in recorder.name2series.items():
                client_max_index = name2max_index.get(name, 0)
                server_max_index = recorder.max_index(name)
                if server_max_index == -1 or server_max_index > client_max_index or setup_changed:
                    response[name] = {
                        'hyperparameters': series['hyperparameters'],
                        'metric': series['metric'],
                        'records': recorder.sample(name, max_sample_count, smooth_window),
                        'server_max_index': server_max_index,
                    }
            for name in name2max_index:
                if name not in recorder.name2series:
                    response[name] = 'deleted'
            return jsonify(response)

        @app.route('/register')
        @auth.login_required
        def register():
            data = json.loads(request.form['json'])
            name = recorder.register(data['hyperparameters'], data['metric'], data['overwrite'])
            return name

        @app.route('/append')
        @auth.login_required
        def append():
            data = json.loads(request.form['json'])
            return recorder.append(data['name'], data['index'], data['value'])

        @app.route('/delete')
        @auth.login_required
        def delete():
            names = json.loads(request.args.get('names'))
            try: recorder.delete(names)
            except: return 'fail'
            return 'success'

        self.app = app

    def run(self, **kwargs):
        self.app.run(**kwargs)
