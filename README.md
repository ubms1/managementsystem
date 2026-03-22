# Unified Business Management System (UBMS)

A comprehensive, consolidated business management platform for managing **four distinct businesses** under one roof — built with modern vanilla HTML, CSS, and JavaScript.

---

## 🏢 Companies Managed

| Company | Industry | Brand Color |
|---------|----------|-------------|
| **Dheekay Builders OPC** | Construction / Contracting | `#16a085` (Green) |
| **KDChavit Construction** | Construction / Contracting | `#2c3e50` (Dark Navy) |
| **Nuat Thai Foot & Body Massage** | Wellness / Spa Services | `#FFD700` (Gold) |
| **AutoCasa Auto Expert & Repair** | Automotive Repair | `#e74c3c` (Red) |

---

## ✨ Features

### Phase 1 — Core Foundation
- **Multi-Tenant Architecture** — Single system, four companies, company-scoped data views
- **Role-Based Access Control** — Owner, Manager, Accountant, Staff roles with granular permissions
- **Group Dashboard** — Consolidated KPIs, revenue charts, activity feed across all companies
- **Unified CRM** — Cross-company customer directory with tags, history, and cross-sell identification
- **Financial Core** — Invoices (AR), Expenses (AP), Chart of Accounts, Bank Reconciliation
- **Consolidated Reporting** — Group P&L, Cash Flow, Tax Summary, Budget vs Actual
- **Dark/Light Theme** — Persistent theme toggle with CSS custom properties

### Phase 2 — Industry-Specific Hubs

#### 🏗️ Construction Hub (Dheekay + KDChavit)
- Project management with progress tracking
- Gantt-style timeline view
- Job costing — budget vs actual with over-budget alerts
- Subcontractor management & rating
- Phase-based cost breakdown

#### 💆 Wellness Hub (Nuat Thai)
- Booking management (create, view, complete, filter)
- Therapist cards with specialties, ratings, commission rates
- **Point of Sale (POS)** — Service cart, walk-in/member clients, GCash/Maya/Cash/Card
- Membership packages (Platinum, Gold, Silver) with session tracking

#### 🔧 Automotive Hub (AutoCasa)
- **Workshop status board** (Kanban: In Queue → Under Repair → Waiting Parts → Ready)
- Digital job cards with service selection and priority
- Vehicle database with service history
- Parts inventory with low-stock alerts and reorder triggers
- Digital vehicle inspection checklists (4 categories, 30+ check items)

### Administration
- User management with role assignment
- Role definitions & permission matrix
- Company profile settings (address, TIN, brand color)
- System preferences (currency, date format, fiscal year, VAT rate)
- Audit log with timestamps, user, action, and level filtering

---

## 📁 Project Structure

```
UNIFIED BUSINESS MANAGEMENT SYSTEM/
├── login.html              # Authentication page (4 demo accounts)
├── index.html              # Main app shell (SPA)
├── css/
│   ├── main.css            # Core layout, theming, responsive design
│   └── components.css      # Reusable UI: grids, tables, forms, cards, modals
├── js/
│   ├── utils.js            # Currency/date formatting, DOM helpers, chart utils
│   ├── data.js             # Sample data store for all 4 companies
│   ├── auth.js             # Session management & role-based access
│   ├── app.js              # Main controller, routing, navigation, modals
│   ├── dashboard.js        # Group & company-specific dashboards
│   ├── crm.js              # Unified CRM module
│   ├── financial.js        # Invoices, Expenses, COA, Bank Recon
│   ├── construction.js     # Projects, Job Costing, Subcontractors
│   ├── wellness.js         # Bookings, Therapists, POS, Memberships
│   ├── automotive.js       # Workshop, Vehicles, Parts, Inspections
│   ├── reports.js          # P&L, Cash Flow, Tax, Budget vs Actual
│   └── settings.js         # Users, Roles, Company, Audit Log
└── README.md
```

---

## 🚀 Getting Started

### Quick Start
1. Open `login.html` in any modern browser
2. Log in with one of the demo accounts below
3. Explore the system!

### Demo Accounts

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `owner` | `owner123` | Owner | All companies, full access |
| `manager` | `manager123` | Manager | Dheekay Builders |
| `accountant` | `acct123` | Accountant | Financial modules |
| `staff` | `staff123` | Staff | Limited access |

### Requirements
- Modern web browser (Chrome, Edge, Firefox, Safari)
- No server required — runs entirely in the browser
- No build step needed

---

## 🛠️ Technical Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic markup, app shell |
| **CSS3** | Custom properties, Grid, Flexbox, responsive |
| **Vanilla JavaScript** | SPA routing, DOM manipulation, state management |
| **Chart.js 4.4.1** | Dashboard charts (CDN) |
| **Font Awesome 6.5.1** | Icons (CDN) |
| **Google Fonts (Inter)** | Typography (CDN) |
| **localStorage** | Session persistence, theme preference |

---

## 💱 Localization

- **Currency**: Philippine Peso (₱ / PHP)
- **Locale**: `en-PH`
- **Tax**: BIR-compliant tax references (VAT 12%, Income Tax 25%, Withholding 2%)
- **Date Format**: MMM DD, YYYY

---

## 🎨 Theming

The system supports **dark and light themes** via CSS custom properties. Toggle with the moon/sun icon in the top bar. Theme preference is saved to localStorage.

Company-specific accent colors appear in:
- Sidebar company selector
- Dashboard KPI cards
- Report headers
- Badge tags

---

## 📊 Sample Data

The system ships with comprehensive sample data including:
- **4 company profiles** with addresses and TIN
- **10 customers** across companies
- **6 construction projects** with phases and budgets
- **5 subcontractors** with ratings
- **11 spa services** and **7 therapists**
- **8 bookings** and **4 memberships**
- **12 automotive services** and **12 auto parts**
- **5 vehicles** and **5 job cards**
- **8 invoices** and **10 expenses**
- **12 months of revenue data** per company
- **Activity logs** and **notifications**

---

## 📋 License

Internal business system — proprietary.

---

*Built for consolidated business operations management in the Philippines.*
