from os import path
from setuptools import setup

setup(
    name = 'hyperboard',
    version = '0.1.1',
    packages = ['hyperboard'],
    url='https://github.com/WarBean/hyperboard',
    author = 'Huabin Zheng',
    author_email = 'warbean@qq.com',
    description = 'A web-based dashboard for Deep Learning',
    long_description = open(path.join(path.abspath(path.dirname(__file__)), 'README.rst')).read(),
    license = 'MIT',
    keywords = 'dashboard deep learning hyperparameter DL',
    package_data={
        'hyperboard': ['hyperboard/templates', 'hyperboard/static']
    },
    include_package_data = True,
    zip_safe = False,
    install_requires = ['flask', 'flask_httpauth', 'requests', 'numpy'],
    entry_points={
        'console_scripts': [
            'hyperboard-run = hyperboard.hyperboard_run:main'
        ],
    }
)
