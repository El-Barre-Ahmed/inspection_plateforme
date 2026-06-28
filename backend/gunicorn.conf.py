# Gunicorn configuration for Inspection Platform
# Location: gunicorn.conf.py

import os
import multiprocessing

# Server socket
bind = os.getenv('GUNICORN_BIND', '0.0.0.0:8000')
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv('GUNICORN_WORKER_CLASS', 'sync')
worker_connections = int(os.getenv('GUNICORN_WORKER_CONNECTIONS', 1000))
timeout = int(os.getenv('GUNICORN_TIMEOUT', 30))
keepalive = 2

# Logging
accesslog = os.getenv('GUNICORN_ACCESS_LOG', '-')
errorlog = os.getenv('GUNICORN_ERROR_LOG', '-')
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'inspection-platform'

# Server mechanics
daemon = False
umask = 0
tmp_upload_dir = None

# SSL (set in environment or Nginx proxy)
keyfile = None
certfile = None

# Server hooks
def on_starting(server):
    pass

def when_ready(server):
    print("Gunicorn server is ready.")

def on_exit(server):
    print("Gunicorn server is exiting.")
