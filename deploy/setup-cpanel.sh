#!/bin/bash
# ============================================================
#  UBMS — cPanel Deployment Script
#  GoManilaHost Shared Hosting
#  Account: rushmedz | Server: 107.178.108.106
#
#  Run this via cPanel → Terminal, or SSH:
#    bash ~/ubms/deploy/setup-cpanel.sh
# ============================================================

set -e
HOME_DIR="/home/rushmedz"
APP_DIR="$HOME_DIR/ubms"
BACKEND_DIR="$APP_DIR/ubms-backend"

echo "============================================"
echo "  UBMS — cPanel Production Setup"
echo "  Server: 107.178.108.106"
echo "============================================"

# ─────────────────────────────────────────────
# Step 1: Install Node.js dependencies
# ─────────────────────────────────────────────
echo ""
echo "📦 Installing Node.js dependencies..."
cd "$BACKEND_DIR"

# Use .env.production if .env doesn't exist yet
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from .env.production template..."
    cp .env.production .env
    echo ""
    echo "⚠️  IMPORTANT: Edit $BACKEND_DIR/.env with your actual MySQL credentials!"
    echo "   nano $BACKEND_DIR/.env"
    echo ""
fi

# npm install (use production only)
npm install --production
echo "✅ Dependencies installed."

# ─────────────────────────────────────────────
# Step 2: Create domain document root folders if missing
# ─────────────────────────────────────────────
echo ""
echo "📁 Setting up domain document roots..."

# dheekaybuilders.com
DHEEKAY_ROOT="$HOME_DIR/dheekaybuilders.com"
if [ ! -d "$DHEEKAY_ROOT" ]; then
    mkdir -p "$DHEEKAY_ROOT"
fi
cp "$APP_DIR/deploy/dheekaybuilders.com/.htaccess" "$DHEEKAY_ROOT/.htaccess" 2>/dev/null || true
echo "✅ dheekaybuilders.com document root ready."

# kdchavitconstruction.com
KDCHAVIT_ROOT="$HOME_DIR/kdchavitconstruction.com"
if [ ! -d "$KDCHAVIT_ROOT" ]; then
    mkdir -p "$KDCHAVIT_ROOT"
fi
cp "$APP_DIR/deploy/kdchavitconstruction.com/.htaccess" "$KDCHAVIT_ROOT/.htaccess" 2>/dev/null || true
echo "✅ kdchavitconstruction.com document root ready."

# ─────────────────────────────────────────────
# Step 3: Create log directory
# ─────────────────────────────────────────────
mkdir -p "$HOME_DIR/logs/ubms"
echo "✅ Log directory created: ~/logs/ubms/"

# ─────────────────────────────────────────────
# Step 4: Set file permissions
# ─────────────────────────────────────────────
echo ""
echo "🔒 Setting permissions..."
chmod -R 755 "$APP_DIR"
chmod 600 "$BACKEND_DIR/.env"
echo "✅ Permissions set."

# ─────────────────────────────────────────────
# Step 5: Test database connection
# ─────────────────────────────────────────────
echo ""
echo "🔧 Testing Node.js app startup..."
cd "$BACKEND_DIR"
timeout 10 node -e "
    require('dotenv').config();
    const mysql = require('mysql2/promise');
    (async()=>{
        try {
            const conn = await mysql.createConnection({
                host: process.env.DB_HOST||'localhost',
                user: process.env.DB_USER||'root',
                password: process.env.DB_PASSWORD||'',
                port: process.env.DB_PORT||3306
            });
            console.log('✅ MySQL connection successful!');
            await conn.end();
        } catch(e) {
            console.log('❌ MySQL connection FAILED:', e.message);
            console.log('   Edit $BACKEND_DIR/.env with correct credentials.');
        }
    })();
" 2>/dev/null || echo "⚠️  Could not test DB (timeout)."

echo ""
echo "============================================"
echo "  ✅ FILE SETUP COMPLETE"
echo "============================================"
echo ""
echo "  NEXT STEPS (do these in cPanel):"
echo ""
echo "  1. ADDON DOMAINS (cPanel → Domains)"
echo "     Add: dheekaybuilders.com"
echo "       Document root: dheekaybuilders.com"
echo "     Add: kdchavitconstruction.com"
echo "       Document root: kdchavitconstruction.com"
echo ""
echo "  2. SSL CERTIFICATES (cPanel → SSL/TLS Status)"
echo "     Click 'Run AutoSSL' to get free SSL"
echo "     for both domains"
echo ""
echo "  3. MYSQL DATABASE (cPanel → MySQL Databases)"
echo "     Create DB:   rushmedz_ubms"
echo "     Create User: rushmedz_ubms_user"
echo "     Grant: All Privileges"
echo "     Then edit: $BACKEND_DIR/.env"
echo ""
echo "  4. SETUP NODE.JS APP (cPanel → Setup Node.js App)"
echo "     Node version: 18"
echo "     App mode: Production"
echo "     App root: ubms/ubms-backend"
echo "     App URL: dheekaybuilders.com"
echo "     Startup file: app.js"
echo "     → Click 'Run NPM Install'"
echo "     → Click 'Start App'"
echo ""
echo "  5. DNS (OVH Cloud Manager)"
echo "     dheekaybuilders.com     A → 107.178.108.106"
echo "     www.dheekaybuilders.com A → 107.178.108.106"
echo "     kdchavitconstruction.com     A → 107.178.108.106"
echo "     www.kdchavitconstruction.com A → 107.178.108.106"
echo ""
echo "============================================"
