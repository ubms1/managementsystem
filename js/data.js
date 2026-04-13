/* ========================================
   UBMS - Sample Data Store
   Multi-tenant data for all 4 companies
   ======================================== */

const DataStore = {
    // ============================================================
    //  COMPANIES
    // ============================================================
    companies: {
        dheekay: {
            id: 'dheekay', name: 'Dheekay Builders OPC', type: 'construction',
            address: 'Tuguegarao City, Cagayan Valley', phone: '(078) 844-1234',
            email: 'info@dheekaybuilders.com', tin: '123-456-789-000',
            color: '#16a085', icon: 'fa-hard-hat', logo: 'assets/logos/dheekay.png'
        },
        kdchavit: {
            id: 'kdchavit', name: 'KDChavit Construction', type: 'construction',
            address: 'Tuguegarao City, Cagayan Valley', phone: '(078) 844-5678',
            email: 'info@kdchavit.com', tin: '987-654-321-000',
            color: '#2c3e50', icon: 'fa-building', logo: 'assets/logos/kdchavit.png'
        },
        nuatthai: {
            id: 'nuatthai', name: 'Nuat Thai Foot & Body Massage', type: 'wellness',
            address: 'Enrile Boulevard, Carig, Tuguegarao City', phone: '(078) 844-1234',
            email: 'hello@nuatthai.ph', tin: '456-789-012-000',
            color: '#FFD700', icon: 'fa-spa', logo: 'assets/logos/nuatthai.png',
            branches: [
                { id: 'tuguegarao', name: 'Nuat Thai Tuguegarao', address: 'Enrile Boulevard, Carig, Tuguegarao City' }
            ]
        },
        autocasa: {
            id: 'autocasa', name: 'AutoCasa Auto Expert & Repair Services', type: 'automotive',
            address: 'Metro Manila, Philippines', phone: '(02) 8987-6543',
            email: 'service@autocasa.ph', tin: '321-654-987-000',
            color: '#e74c3c', icon: 'fa-car', logo: 'assets/logos/autocasa.png',
            website: 'https://autocasa.ph'
        }
    },

    // ============================================================
    //  CRM - CUSTOMERS (Unified)
    // ============================================================
    customers: [],

    // ============================================================
    //  FINANCIAL - ACCOUNTS & TRANSACTIONS
    // ============================================================
    chartOfAccounts: [
        { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', company: 'all' },
        { code: '1100', name: 'Accounts Receivable', type: 'asset', company: 'all' },
        { code: '1200', name: 'Inventory', type: 'asset', company: 'all' },
        { code: '1300', name: 'Prepaid Expenses', type: 'asset', company: 'all' },
        { code: '2000', name: 'Accounts Payable', type: 'liability', company: 'all' },
        { code: '2100', name: 'Accrued Expenses', type: 'liability', company: 'all' },
        { code: '3000', name: 'Owner\'s Equity', type: 'equity', company: 'all' },
        { code: '4000', name: 'Service Revenue', type: 'revenue', company: 'all' },
        { code: '4100', name: 'Project Revenue', type: 'revenue', company: 'dheekay' },
        { code: '4200', name: 'Project Revenue', type: 'revenue', company: 'kdchavit' },
        { code: '4300', name: 'Massage Service Revenue', type: 'revenue', company: 'nuatthai' },
        { code: '4400', name: 'Repair Service Revenue', type: 'revenue', company: 'autocasa' },
        { code: '5000', name: 'Cost of Goods Sold', type: 'expense', company: 'all' },
        { code: '5100', name: 'Materials Cost', type: 'expense', company: 'all' },
        { code: '5200', name: 'Labor Cost', type: 'expense', company: 'all' },
        { code: '6000', name: 'Operating Expenses', type: 'expense', company: 'all' },
        { code: '6100', name: 'Salaries & Wages', type: 'expense', company: 'all' },
        { code: '6200', name: 'Rent Expense', type: 'expense', company: 'all' },
        { code: '6300', name: 'Utilities', type: 'expense', company: 'all' }
    ],

    invoices: [],

    expenses: [],

    // ============================================================
    //  CONSTRUCTION - PROJECTS
    // ============================================================
    projects: [],

    subcontractors: [],

    // ============================================================
    //  WELLNESS - SERVICES, THERAPISTS, BOOKINGS
    // ============================================================
    spaServices: [
        { id: 'SVC-001', name: 'Thai Foot Massage', duration: 60, price: 499, category: 'Foot', description: 'Traditional Thai foot reflexology' },
        { id: 'SVC-002', name: 'Full Body Thai Massage', duration: 90, price: 899, category: 'Body', description: 'Authentic Thai body massage with stretching' },
        { id: 'SVC-003', name: 'Deep Tissue Massage', duration: 60, price: 699, category: 'Body', description: 'Targeted deep pressure for muscle relief' },
        { id: 'SVC-004', name: 'Hot Stone Therapy', duration: 90, price: 1199, category: 'Premium', description: 'Heated stones with massage combination' },
        { id: 'SVC-005', name: 'Aromatherapy Massage', duration: 60, price: 799, category: 'Body', description: 'Essential oils combined with gentle massage' },
        { id: 'SVC-006', name: 'Combination Package', duration: 120, price: 1499, category: 'Premium', description: 'Foot + body massage combo' },
        { id: 'SVC-007', name: 'Head & Shoulder Massage', duration: 30, price: 349, category: 'Quick', description: 'Quick relief for tension headaches' },
        { id: 'SVC-008', name: 'Thai Herbal Compress', duration: 90, price: 999, category: 'Premium', description: 'Herbal compress with traditional massage' },
        { id: 'SVC-009', name: 'Foot Reflexology', duration: 30, price: 299, category: 'Foot', description: 'Quick foot pressure point treatment' },
        { id: 'SVC-010', name: 'Couples Massage', duration: 90, price: 1599, category: 'Premium', description: 'Side-by-side massage experience' },
        { id: 'SVC-011', name: 'Back & Neck Focus', duration: 45, price: 449, category: 'Body', description: 'Targeted back and neck relief' }
    ],

    therapists: [],

    bookings: [],

    memberships: [],

    membershipPackages: [
        { id: 'PKG-001', name: 'Platinum', price: 9999, sessions: 30, sessionsLabel: 'Unlimited', period: 'month', benefits: ['Unlimited massage sessions', '20% discount on add-ons', 'Priority booking', 'Free hot stone upgrade'], status: 'active' },
        { id: 'PKG-002', name: 'Gold', price: 5999, sessions: 12, sessionsLabel: '12 sessions', period: 'month', benefits: ['12 sessions per month', '10% discount on add-ons', 'Birthday free session', '1 free guest pass/month'], status: 'active' },
        { id: 'PKG-003', name: 'Silver', price: 2999, sessions: 6, sessionsLabel: '6 sessions', period: 'month', benefits: ['6 sessions per month', '5% discount on services', 'Priority booking', 'Special promo access'], status: 'active' }
    ],

    // ============================================================
    //  AUTOMOTIVE - VEHICLES, JOBS, PARTS
    // ============================================================
    autoServices: [
        { id: 'AS-001', name: 'Engine Oil Change', price: 2500, duration: 60, category: 'Maintenance' },
        { id: 'AS-002', name: 'Coolant Flushing', price: 3500, duration: 90, category: 'Maintenance' },
        { id: 'AS-003', name: 'Brake Cleaning Service', price: 2000, duration: 45, category: 'Brakes' },
        { id: 'AS-004', name: 'Brake Fluid Flushing', price: 2800, duration: 60, category: 'Brakes' },
        { id: 'AS-005', name: 'Sparkplugs Replace', price: 3000, duration: 60, category: 'Engine' },
        { id: 'AS-006', name: 'Air Filter Replace', price: 1500, duration: 30, category: 'Engine' },
        { id: 'AS-007', name: 'Fuel Filter Replace', price: 2200, duration: 45, category: 'Engine' },
        { id: 'AS-008', name: 'Engine Decarb', price: 5500, duration: 120, category: 'Engine' },
        { id: 'AS-009', name: 'ATF Dialysis', price: 6500, duration: 120, category: 'Transmission' },
        { id: 'AS-010', name: 'Regular Check-Up', price: 1500, duration: 60, category: 'Inspection' },
        { id: 'AS-011', name: 'Rotor Reface', price: 3500, duration: 90, category: 'Brakes' },
        { id: 'AS-012', name: 'Aircon Service', price: 4000, duration: 90, category: 'HVAC' }
    ],

    vehicles: [],

    jobCards: [],

    autoParts: [],

    // ============================================================
    //  CONSTRUCTION - EQUIPMENT & FLEET
    // ============================================================
    equipment: [],

    // ============================================================
    //  CONSTRUCTION - SAFETY / QHSE RECORDS
    // ============================================================
    safetyRecords: [],

    // ============================================================
    //  CONSTRUCTION - DOCUMENT MANAGEMENT
    // ============================================================
    documents: [],

    // ============================================================
    //  CONSTRUCTION - PROJECT MILESTONES & MONITORING
    // ============================================================
    projectMilestones: [],

    // ============================================================
    //  WELLNESS - SPA INVENTORY (Supplies & Products)
    // ============================================================
    spaInventory: [],

    // ============================================================
    //  AUTOMOTIVE - ESTIMATES / QUOTES
    // ============================================================
    estimates: [],

    // ============================================================
    //  BIR-COMPLIANT INVOICES / OFFICIAL RECEIPTS
    // ============================================================
    birInvoices: [],

    // ============================================================
    //  EMPLOYEES & PAYROLL
    // ============================================================
    employees: [],
    payslips: [],

    // ============================================================
    //  INVENTORY IN/OUT MODULE (Scanner-enabled)
    // ============================================================
    inventoryItems: [],
    inventoryTransactions: [],

    // Inspections (automotive)
    inspections: [],

    // Bank reconciliation records (per company per period)
    bankReconciliations: [],
    collectionReceipts: [],

    // Performance reviews, timesheets, incident reports
    performanceReviews: [],
    timesheets: [],
    incidentReports: [],

    // Inventory categories per business type
    inventoryCategories: {
        construction: ['Purchases', 'Supplies', 'Office Supplies', 'Snacks & Drinks', 'Tools', 'PPE', 'Raw Materials', 'Transformers', 'Electrical Equipment', 'Heavy Equipment'],
        wellness: ['Purchases', 'Supplies', 'Office Supplies', 'Oils Inventory', 'Towels & Linens', 'Skincare Products', 'Spa Consumables'],
        automotive: ['Purchases', 'Supplies', 'Office Supplies', 'Auto Parts', 'Lubricants & Fluids', 'Tires', 'Accessories', 'Electrical Equipment']
    },

    // Transformer types and KVA ratings for inventory
    transformerTypes: ['Silicon', 'Amorphous'],
    transformerRatings: ['10 KVA', '25 KVA', '37.5 KVA', '50 KVA', '75 KVA', '100 KVA'],

    // Philippine Electric Cooperatives (all regions)
    electricCooperatives: [
        // CAR - Cordillera Administrative Region
        { abbr: 'ABRECO', name: 'Abra Electric Cooperative', region: 'CAR', province: 'Abra' },
        { abbr: 'BENECO', name: 'Benguet Electric Cooperative', region: 'CAR', province: 'Benguet' },
        { abbr: 'IFELCO', name: 'Ifugao Electric Cooperative', region: 'CAR', province: 'Ifugao' },
        { abbr: 'KAELCO', name: 'Kalinga-Apayao Electric Cooperative', region: 'CAR', province: 'Kalinga' },
        { abbr: 'MOPRECO', name: 'Mountain Province Electric Cooperative', region: 'CAR', province: 'Mountain Province' },
        // Region I - Ilocos Region
        { abbr: 'INEC', name: 'Ilocos Norte Electric Cooperative', region: 'Region I', province: 'Ilocos Norte' },
        { abbr: 'ISECO', name: 'Ilocos Sur Electric Cooperative', region: 'Region I', province: 'Ilocos Sur' },
        { abbr: 'LUELCO', name: 'La Union Electric Cooperative', region: 'Region I', province: 'La Union' },
        { abbr: 'PANELCO I', name: 'Pangasinan I Electric Cooperative', region: 'Region I', province: 'Pangasinan' },
        { abbr: 'PANELCO II', name: 'Pangasinan II Electric Cooperative', region: 'Region I', province: 'Pangasinan' },
        { abbr: 'CENPELCO', name: 'Central Pangasinan Electric Cooperative', region: 'Region I', province: 'Pangasinan' },
        // Region II - Cagayan Valley
        { abbr: 'BATANELCO', name: 'Batanes Electric Cooperative', region: 'Region II', province: 'Batanes' },
        { abbr: 'CAGELCO I', name: 'Cagayan I Electric Cooperative', region: 'Region II', province: 'Cagayan' },
        { abbr: 'CAGELCO II', name: 'Cagayan II Electric Cooperative', region: 'Region II', province: 'Cagayan' },
        { abbr: 'ISELCO I', name: 'Isabela I Electric Cooperative', region: 'Region II', province: 'Isabela' },
        { abbr: 'ISELCO II', name: 'Isabela II Electric Cooperative', region: 'Region II', province: 'Isabela' },
        { abbr: 'NUVELCO', name: 'Nueva Vizcaya Electric Cooperative', region: 'Region II', province: 'Nueva Vizcaya' },
        { abbr: 'QUIRELCO', name: 'Quirino Electric Cooperative', region: 'Region II', province: 'Quirino' },
        // Region III - Central Luzon
        { abbr: 'AURELCO', name: 'Aurora Electric Cooperative', region: 'Region III', province: 'Aurora' },
        { abbr: 'NEECO I', name: 'Nueva Ecija I Electric Cooperative', region: 'Region III', province: 'Nueva Ecija' },
        { abbr: 'NEECO II - Area 1', name: 'Nueva Ecija II Electric Cooperative (Area 1)', region: 'Region III', province: 'Nueva Ecija' },
        { abbr: 'NEECO II - Area 2', name: 'Nueva Ecija II Electric Cooperative (Area 2)', region: 'Region III', province: 'Nueva Ecija' },
        { abbr: 'PELCO I', name: 'Pampanga I Electric Cooperative', region: 'Region III', province: 'Pampanga' },
        { abbr: 'PELCO II', name: 'Pampanga II Electric Cooperative', region: 'Region III', province: 'Pampanga' },
        { abbr: 'PELCO III', name: 'Pampanga III Electric Cooperative', region: 'Region III', province: 'Pampanga' },
        { abbr: 'PRESCO', name: 'Pampanga Rural Electric Service Cooperative', region: 'Region III', province: 'Pampanga' },
        { abbr: 'SAJELCO', name: 'San Jose City Electric Cooperative', region: 'Region III', province: 'Nueva Ecija' },
        { abbr: 'TARELCO I', name: 'Tarlac I Electric Cooperative', region: 'Region III', province: 'Tarlac' },
        { abbr: 'TARELCO II', name: 'Tarlac II Electric Cooperative', region: 'Region III', province: 'Tarlac' },
        { abbr: 'ZAMECO I', name: 'Zambales I Electric Cooperative', region: 'Region III', province: 'Zambales' },
        { abbr: 'ZAMECO II', name: 'Zambales II Electric Cooperative', region: 'Region III', province: 'Zambales' },
        { abbr: 'PENELCO', name: 'Peninsula Electric Cooperative', region: 'Region III', province: 'Bataan' },
        // Region IV-A - CALABARZON
        { abbr: 'BATELEC I', name: 'Batangas I Electric Cooperative', region: 'Region IV-A', province: 'Batangas' },
        { abbr: 'BATELEC II', name: 'Batangas II Electric Cooperative', region: 'Region IV-A', province: 'Batangas' },
        { abbr: 'FLECO', name: 'First Laguna Electric Cooperative', region: 'Region IV-A', province: 'Laguna' },
        { abbr: 'QUEZELCO I', name: 'Quezon I Electric Cooperative', region: 'Region IV-A', province: 'Quezon' },
        { abbr: 'QUEZELCO II', name: 'Quezon II Electric Cooperative', region: 'Region IV-A', province: 'Quezon' },
        // Region IV-B - MIMAROPA
        { abbr: 'BISELCO', name: 'Busuanga Island Electric Cooperative', region: 'Region IV-B', province: 'Palawan' },
        { abbr: 'LUBELCO', name: 'Lubang Electric Cooperative', region: 'Region IV-B', province: 'Occidental Mindoro' },
        { abbr: 'MARELCO', name: 'Marinduque Electric Cooperative', region: 'Region IV-B', province: 'Marinduque' },
        { abbr: 'OMECO', name: 'Occidental Mindoro Electric Cooperative', region: 'Region IV-B', province: 'Occidental Mindoro' },
        { abbr: 'ORMECO', name: 'Oriental Mindoro Electric Cooperative', region: 'Region IV-B', province: 'Oriental Mindoro' },
        { abbr: 'PALECO', name: 'Palawan Electric Cooperative', region: 'Region IV-B', province: 'Palawan' },
        { abbr: 'ROMELCO', name: 'Romblon Electric Cooperative', region: 'Region IV-B', province: 'Romblon' },
        { abbr: 'TIELCO', name: 'Tablas Island Electric Cooperative', region: 'Region IV-B', province: 'Romblon' },
        // Region V - Bicol Region
        { abbr: 'ALECO', name: 'Albay Electric Cooperative', region: 'Region V', province: 'Albay' },
        { abbr: 'CANORECO', name: 'Camarines Norte Electric Cooperative', region: 'Region V', province: 'Camarines Norte' },
        { abbr: 'CASURECO I', name: 'Camarines Sur I Electric Cooperative', region: 'Region V', province: 'Camarines Sur' },
        { abbr: 'CASURECO II', name: 'Camarines Sur II Electric Cooperative', region: 'Region V', province: 'Camarines Sur' },
        { abbr: 'CASURECO III', name: 'Camarines Sur III Electric Cooperative', region: 'Region V', province: 'Camarines Sur' },
        { abbr: 'CASURECO IV', name: 'Camarines Sur IV Electric Cooperative', region: 'Region V', province: 'Camarines Sur' },
        { abbr: 'FICELCO', name: 'First Catanduanes Electric Cooperative', region: 'Region V', province: 'Catanduanes' },
        { abbr: 'MASELCO', name: 'Masbate Electric Cooperative', region: 'Region V', province: 'Masbate' },
        { abbr: 'SORECO I', name: 'Sorsogon I Electric Cooperative', region: 'Region V', province: 'Sorsogon' },
        { abbr: 'SORECO II', name: 'Sorsogon II Electric Cooperative', region: 'Region V', province: 'Sorsogon' },
        { abbr: 'TISELCO', name: 'Ticao Island Electric Cooperative', region: 'Region V', province: 'Masbate' },
        // Region VI - Western Visayas
        { abbr: 'AKELCO', name: 'Aklan Electric Cooperative', region: 'Region VI', province: 'Aklan' },
        { abbr: 'ANTECO', name: 'Antique Electric Cooperative', region: 'Region VI', province: 'Antique' },
        { abbr: 'CAPELCO', name: 'Capiz Electric Cooperative', region: 'Region VI', province: 'Capiz' },
        { abbr: 'GUIMELCO', name: 'Guimaras Electric Cooperative', region: 'Region VI', province: 'Guimaras' },
        { abbr: 'ILECO I', name: 'Iloilo I Electric Cooperative', region: 'Region VI', province: 'Iloilo' },
        { abbr: 'ILECO II', name: 'Iloilo II Electric Cooperative', region: 'Region VI', province: 'Iloilo' },
        { abbr: 'ILECO III', name: 'Iloilo III Electric Cooperative', region: 'Region VI', province: 'Iloilo' },
        { abbr: 'NOCECO', name: 'Negros Occidental Electric Cooperative', region: 'Region VI', province: 'Negros Occidental' },
        { abbr: 'NONECO', name: 'Northern Negros Electric Cooperative', region: 'Region VI', province: 'Negros Occidental' },
        // Region VII - Central Visayas
        { abbr: 'BANELCO', name: 'Bantayan Electric Cooperative', region: 'Region VII', province: 'Cebu' },
        { abbr: 'BOHECO I', name: 'Bohol I Electric Cooperative', region: 'Region VII', province: 'Bohol' },
        { abbr: 'BOHECO II', name: 'Bohol II Electric Cooperative', region: 'Region VII', province: 'Bohol' },
        { abbr: 'CEBECO I', name: 'Cebu I Electric Cooperative', region: 'Region VII', province: 'Cebu' },
        { abbr: 'CEBECO II', name: 'Cebu II Electric Cooperative', region: 'Region VII', province: 'Cebu' },
        { abbr: 'CEBECO III', name: 'Cebu III Electric Cooperative', region: 'Region VII', province: 'Cebu' },
        { abbr: 'CELCO', name: 'Camotes Electric Cooperative', region: 'Region VII', province: 'Cebu' },
        { abbr: 'NORECO I', name: 'Negros Oriental I Electric Cooperative', region: 'Region VII', province: 'Negros Oriental' },
        { abbr: 'NORECO II', name: 'Negros Oriental II Electric Cooperative', region: 'Region VII', province: 'Negros Oriental' },
        { abbr: 'PROSIELCO', name: 'Province of Siquijor Electric Cooperative', region: 'Region VII', province: 'Siquijor' },
        // Region VIII - Eastern Visayas
        { abbr: 'BILECO', name: 'Biliran Electric Cooperative', region: 'Region VIII', province: 'Biliran' },
        { abbr: 'DORELCO', name: 'Don Orestes Romualdez Electric Cooperative', region: 'Region VIII', province: 'Leyte' },
        { abbr: 'ESAMELCO', name: 'Eastern Samar Electric Cooperative', region: 'Region VIII', province: 'Eastern Samar' },
        { abbr: 'LEYECO II', name: 'Leyte II Electric Cooperative', region: 'Region VIII', province: 'Leyte' },
        { abbr: 'LEYECO III', name: 'Leyte III Electric Cooperative', region: 'Region VIII', province: 'Leyte' },
        { abbr: 'LEYECO IV', name: 'Leyte IV Electric Cooperative', region: 'Region VIII', province: 'Leyte' },
        { abbr: 'LEYECO V', name: 'Leyte V Electric Cooperative', region: 'Region VIII', province: 'Leyte' },
        { abbr: 'NORSAMELCO', name: 'Northern Samar Electric Cooperative', region: 'Region VIII', province: 'Northern Samar' },
        { abbr: 'SAMELCO I', name: 'Samar I Electric Cooperative', region: 'Region VIII', province: 'Samar' },
        { abbr: 'SAMELCO II', name: 'Samar II Electric Cooperative', region: 'Region VIII', province: 'Samar' },
        { abbr: 'SOLECO', name: 'Southern Leyte Electric Cooperative', region: 'Region VIII', province: 'Southern Leyte' },
        // Region IX - Zamboanga Peninsula
        { abbr: 'ZAMCELCO', name: 'Zamboanga City Electric Cooperative', region: 'Region IX', province: 'Zamboanga City' },
        { abbr: 'ZANECO', name: 'Zamboanga del Norte Electric Cooperative', region: 'Region IX', province: 'Zamboanga del Norte' },
        { abbr: 'ZAMSURECO I', name: 'Zamboanga del Sur I Electric Cooperative', region: 'Region IX', province: 'Zamboanga del Sur' },
        { abbr: 'ZAMSURECO II', name: 'Zamboanga del Sur II Electric Cooperative', region: 'Region IX', province: 'Zamboanga del Sur' },
        // Region X - Northern Mindanao
        { abbr: 'BUSECO', name: 'Bukidnon II Electric Cooperative', region: 'Region X', province: 'Bukidnon' },
        { abbr: 'CAMELCO', name: 'Camiguin Electric Cooperative', region: 'Region X', province: 'Camiguin' },
        { abbr: 'FIBECO', name: 'First Bukidnon Electric Cooperative', region: 'Region X', province: 'Bukidnon' },
        { abbr: 'LANECO', name: 'Lanao del Norte Electric Cooperative', region: 'Region X', province: 'Lanao del Norte' },
        { abbr: 'MOELCI I', name: 'Misamis Occidental I Electric Cooperative', region: 'Region X', province: 'Misamis Occidental' },
        { abbr: 'MOELCI II', name: 'Misamis Occidental II Electric Cooperative', region: 'Region X', province: 'Misamis Occidental' },
        { abbr: 'MORESCO I', name: 'Misamis Oriental I Rural Electric Service Cooperative', region: 'Region X', province: 'Misamis Oriental' },
        { abbr: 'MORESCO II', name: 'Misamis Oriental II Electric Cooperative', region: 'Region X', province: 'Misamis Oriental' },
        // Region XI - Davao Region
        { abbr: 'DASURECO', name: 'Davao del Sur Electric Cooperative', region: 'Region XI', province: 'Davao del Sur' },
        { abbr: 'DORECO', name: 'Davao Oriental Electric Cooperative', region: 'Region XI', province: 'Davao Oriental' },
        { abbr: 'NORDECO', name: 'Northern Davao Electric Cooperative', region: 'Region XI', province: 'Davao del Norte' },
        // Region XII - SOCCSKSARGEN
        { abbr: 'COTELCO', name: 'Cotabato Electric Cooperative', region: 'Region XII', province: 'Cotabato' },
        { abbr: 'SOCOTECO I', name: 'South Cotabato I Electric Cooperative', region: 'Region XII', province: 'South Cotabato' },
        { abbr: 'SOCOTECO II', name: 'South Cotabato II Electric Cooperative', region: 'Region XII', province: 'South Cotabato' },
        { abbr: 'SUKELCO', name: 'Sultan Kudarat Electric Cooperative', region: 'Region XII', province: 'Sultan Kudarat' },
        // Region XIII - CARAGA
        { abbr: 'ANECO', name: 'Agusan del Norte Electric Cooperative', region: 'Region XIII', province: 'Agusan del Norte' },
        { abbr: 'ASELCO', name: 'Agusan del Sur Electric Cooperative', region: 'Region XIII', province: 'Agusan del Sur' },
        { abbr: 'DIELCO', name: 'Dinagat Island Electric Cooperative', region: 'Region XIII', province: 'Dinagat Islands' },
        { abbr: 'SIARELCO', name: 'Siargao Electric Cooperative', region: 'Region XIII', province: 'Surigao del Norte' },
        { abbr: 'SURNECO', name: 'Surigao del Norte Electric Cooperative', region: 'Region XIII', province: 'Surigao del Norte' },
        { abbr: 'SURSECO I', name: 'Surigao del Sur I Electric Cooperative', region: 'Region XIII', province: 'Surigao del Sur' },
        { abbr: 'SURSECO II', name: 'Surigao del Sur II Electric Cooperative', region: 'Region XIII', province: 'Surigao del Sur' },
        // BARMM - Bangsamoro Autonomous Region in Muslim Mindanao
        { abbr: 'BASELCO', name: 'Basilan Electric Cooperative', region: 'BARMM', province: 'Basilan' },
        { abbr: 'CASELCO', name: 'Cagayan de Sulu Electric Cooperative', region: 'BARMM', province: 'Tawi-Tawi' },
        { abbr: 'LASURECO', name: 'Lanao del Sur Electric Cooperative', region: 'BARMM', province: 'Lanao del Sur' },
        { abbr: 'MAGELCO', name: 'Maguindanao Electric Cooperative', region: 'BARMM', province: 'Maguindanao' },
        { abbr: 'SIASELCO', name: 'Siasi Electric Cooperative', region: 'BARMM', province: 'Sulu' },
        { abbr: 'SULECO', name: 'Sulu Electric Cooperative', region: 'BARMM', province: 'Sulu' },
        { abbr: 'TAWELCO', name: 'Tawi-Tawi Electric Cooperative', region: 'BARMM', province: 'Tawi-Tawi' },
    ],

    // ============================================================
    //  GROUP FINANCIAL SUMMARY
    // ============================================================
    getFinancialSummary(company = 'all') {
        const filter = (items) => company === 'all' ? items : items.filter(i => i.company === company);
        const invs = filter(this.invoices);
        const exps = filter(this.expenses);
        const _n = (v) => Utils.safeNum(v);

        const totalRevenue = invs.reduce((s, i) => s + _n(i.paid), 0);
        const totalReceivable = invs.reduce((s, i) => s + (_n(i.amount) - _n(i.paid)), 0);
        const totalExpenses = exps.reduce((s, e) => s + _n(e.amount), 0);

        return {
            totalRevenue,
            totalReceivable,
            totalExpenses,
            netIncome: totalRevenue - totalExpenses,
            invoiceCount: invs.length,
            paidInvoices: invs.filter(i => i.status === 'paid').length,
            unpaidInvoices: invs.filter(i => i.status === 'unpaid').length,
            partialInvoices: invs.filter(i => i.status === 'partial').length
        };
    },

    getCompanySummary(companyId) {
        const fin = this.getFinancialSummary(companyId);
        const company = this.companies[companyId];
        const _n = (v) => Utils.safeNum(v);
        let extra = {};

        if (company.type === 'construction') {
            const projs = this.projects.filter(p => p.company === companyId);
            const activeProjs = projs.filter(p => p.status === 'in-progress');
            extra = {
                activeProjects: activeProjs.length,
                totalProjects: projs.length,
                totalBudget: projs.reduce((s, p) => s + _n(p.budget), 0),
                avgProgress: activeProjs.reduce((s, p) => s + _n(p.progress), 0) / (activeProjs.length || 1)
            };
        } else if (company.type === 'wellness') {
            const bks = this.bookings.filter(b => b.company === companyId);
            const today = new Date().toISOString().split('T')[0];
            extra = {
                todayBookings: bks.filter(b => b.date === today).length,
                totalBookings: bks.length,
                activeMembers: this.memberships.filter(m => m.status === 'active').length,
                availableTherapists: this.therapists.filter(t => t.status === 'available').length
            };
        } else if (company.type === 'automotive') {
            const jcs = this.jobCards.filter(j => j.company === companyId);
            extra = {
                activeJobs: jcs.filter(j => !['completed'].includes(j.status)).length,
                completedJobs: jcs.filter(j => j.status === 'completed').length,
                totalVehicles: this.vehicles.length,
                lowStockParts: this.autoParts.filter(p => p.quantity <= p.minStock).length
            };
        }

        return { ...fin, ...extra, company };
    },

    // Monthly revenue data by company
    monthlyRevenue: {
        dheekay:  [0,0,0,0,0,0,0,0,0,0,0,0],
        kdchavit: [0,0,0,0,0,0,0,0,0,0,0,0],
        nuatthai: [0,0,0,0,0,0,0,0,0,0,0,0],
        autocasa: [0,0,0,0,0,0,0,0,0,0,0,0]
    },

    // Activity log
    activityLog: [],

    // Notifications
    notifications: []
};
