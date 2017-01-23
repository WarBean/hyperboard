from os import path
from setuptools import setup

setup(
    name = 'HyperBoard',
    version = '0.1',
    packages = ['HyperBoard'],
    url='https://github.com/WarBean/HyperBoard',
    author = 'Huabin Zheng',
    author_email = 'warbean@qq.com',
    description = 'A web-based dashboard for Deep Learning',
    long_description = open(path.join(path.abspath(path.dirname(__file__)), 'README.rst'), encoding = 'utf-8').read(),
    license = 'MIT',
    keywords = 'dashboard deep learning hyperparameter DL',
    package_data={
        'HyperBoard': ['HyperBoard/templates', 'HyperBoard/static']
    },
    include_package_data = True,
    zip_safe = False,
    install_requires = ['flask', 'flask_auth', 'requests', 'numpy'],
    entry_points={
        'console_scripts': [
            'hyperboard-run = HyperBoard.hyperboard_run:main'
        ],
    }
)
