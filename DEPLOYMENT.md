# 📋 Production Deployment Guide - Inspection Platform

## 🔧 Prerequisites

- Ubuntu/Debian server (20.04 or later recommended)
- Root or sudo access
- Domain name (for SSL certificate)
- PostgreSQL 12+ installed locally or remote

---

## 📦 Step 1: Install PostgreSQL Locally

### On your development PC (for testing):

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE inspection_platform;
CREATE USER inspection_user WITH PASSWORD 'your-secure-password';
ALTER ROLE inspection_user SET client_encoding TO 'utf8';
ALTER ROLE inspection_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE inspection_user SET default_transaction_deferrable TO on;
ALTER ROLE inspection_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE inspection_platform TO inspection_user;
\q
EOF

# Test connection
psql -h localhost -U inspection_user -d inspection_platform
```

---

## 🔐 Step 2: Configure Environment Variables

### Create `.env` file:

```bash
cp .env.example .env
nano .env  # Edit with your values
```

### Sample `.env` for PostgreSQL:

```env
# Django
DEBUG=False
SECRET_KEY=your-very-secret-key-at-least-50-chars-randomize-it
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# PostgreSQL (from Step 1)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=inspection_platform
DB_USER=inspection_user
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME=28800
JWT_REFRESH_TOKEN_LIFETIME=604800

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,https://your-domain.com

# Security (HTTPS)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Gunicorn
GUNICORN_WORKERS=4
GUNICORN_BIND=0.0.0.0:8000
GUNICORN_TIMEOUT=30
```

---

## 📥 Step 3: Install Dependencies

```bash
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 🗄️ Step 4: Run Migrations

```bash
source venv/bin/activate
python manage.py migrate

# Create superuser (for admin)
python manage.py createsuperuser
```

---

## 📁 Step 5: Collect Static Files

```bash
source venv/bin/activate
python manage.py collectstatic --noinput
```

---

## 🚀 Step 6: Start Gunicorn

### Option A: Direct command

```bash
source venv/bin/activate
gunicorn -c gunicorn.conf.py config.wsgi:application
```

### Option B: Systemd service (recommended for production)

Create `/etc/systemd/system/inspection-platform.service`:

```ini
[Unit]
Description=Inspection Platform Gunicorn Service
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/home/barre/projects/inspection_platform
Environment="PATH=/home/barre/projects/inspection_platform/venv/bin"
EnvironmentFile=/home/barre/projects/inspection_platform/.env
ExecStart=/home/barre/projects/inspection_platform/venv/bin/gunicorn \
    -c /home/barre/projects/inspection_platform/gunicorn.conf.py \
    --timeout 30 \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    config.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable inspection-platform
sudo systemctl start inspection-platform
sudo systemctl status inspection-platform
```

---

## 🌐 Step 7: Configure Nginx

1. **Copy nginx.conf**:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/inspection-platform
   ```

2. **Edit domain and SSL paths**:
   ```bash
   sudo nano /etc/nginx/sites-available/inspection-platform
   # Change "your-domain.com" to your actual domain
   # Update SSL certificate paths
   ```

3. **Enable site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/inspection-platform /etc/nginx/sites-enabled/
   ```

4. **Test Nginx config**:
   ```bash
   sudo nginx -t
   ```

5. **Restart Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

---

## 🔒 Step 8: Setup SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (automatic with ubuntu)
sudo certbot renew --dry-run
```

---

## ✅ Step 9: Health Checks

```bash
# Test API login
curl -X POST https://your-domain.com/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Check static files
curl https://your-domain.com/api/docs/

# View logs
sudo journalctl -u inspection-platform -f
tail -f /var/log/nginx/error.log
```

---

## 📊 Step 10: Backup Strategy

```bash
# Backup database
pg_dump -h localhost -U inspection_user inspection_platform > backup-$(date +%Y%m%d).sql

# Backup Django files
tar -czf inspection-platform-backup-$(date +%Y%m%d).tar.gz \
  /home/barre/projects/inspection_platform \
  --exclude=venv --exclude=.git --exclude=db.sqlite3

# Store in safe location (S3, Google Drive, etc.)
```

---

## 🔧 Troubleshooting

### Gunicorn won't start:
```bash
source venv/bin/activate
python manage.py check
gunicorn -c gunicorn.conf.py config.wsgi:application --log-level debug
```

### Database connection error:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U inspection_user -d inspection_platform

# Check .env DB credentials
cat .env | grep DB_
```

### Nginx reverse proxy issues:
```bash
# Check Nginx error log
sudo tail -n 50 /var/log/nginx/error.log

# Verify Gunicorn is listening
netstat -tlnp | grep 8000
```

### Static files not loading:
```bash
python manage.py collectstatic --noinput --clear
sudo chown -R www-data:www-data staticfiles/
```

---

## 📈 Performance Optimization

```bash
# Enable Gzip compression in Nginx (already in nginx.conf)
# Increase worker processes based on CPU cores
# Enable caching for static files
# Monitor with: top, htop, iotop
```

---

## 🎯 Monitoring & Maintenance

```bash
# Systemd logs
sudo journalctl -u inspection-platform -f --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Disk usage
df -h

# Memory usage
free -h
```

---

## 🔐 Security Checklist

- [ ] Change SECRET_KEY in .env
- [ ] Set DEBUG=False
- [ ] Enable HTTPS with valid certificate
- [ ] Configure firewall (ufw):
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] Setup regular backups
- [ ] Monitor logs regularly
- [ ] Keep system packages updated: `sudo apt update && sudo apt upgrade`
- [ ] Setup email alerts for errors
- [ ] Rate limit API endpoints

---

## 📝 Environment Variables Reference

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| DEBUG | bool | False | Disable in production |
| SECRET_KEY | string | - | Django secret (CHANGE IT!) |
| ALLOWED_HOSTS | list | localhost,127.0.0.1 | Allowed domains |
| DB_ENGINE | string | sqlite3 | Database backend |
| DB_NAME | string | inspection_platform | Database name |
| DB_USER | string | inspection_user | DB user |
| DB_PASSWORD | string | - | DB password (CHANGE IT!) |
| DB_HOST | string | localhost | DB server |
| DB_PORT | int | 5432 | DB port |
| CORS_ALLOWED_ORIGINS | list | http://localhost:3000 | Frontend origins |

---

## 🎓 Useful Commands

```bash
# Restart application
sudo systemctl restart inspection-platform

# View logs in real-time
sudo journalctl -u inspection-platform -f

# Create Django admin user
source venv/bin/activate
python manage.py createsuperuser

# Access Django shell
python manage.py shell
>>> from dossiers.models import Dossier
>>> Dossier.objects.count()

# Database backup/restore
pg_dump -h localhost -U inspection_user inspection_platform > backup.sql
psql -h localhost -U inspection_user inspection_platform < backup.sql
```

---

## 🆘 Quick Support

- Django Docs: https://docs.djangoproject.com/
- DRF Docs: https://www.django-rest-framework.org/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Gunicorn Docs: https://docs.gunicorn.org/
- Nginx Docs: https://nginx.org/en/docs/
