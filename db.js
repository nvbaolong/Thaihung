// File: db.js

(function () {
    // --- CẤU HÌNH CƠ SỞ DỮ LIỆU ---
    const DB_NAME = 'salesDashboardDB';
    // THAY ĐỔI: Tăng phiên bản DB để kích hoạt onupgradeneeded
    const DB_VERSION = 2;
    const STORES = {
        products: 'products',
        orders: 'orders',
        customers: 'customers',
        // THÊM MỚI: Store cho phiếu nhập và nhà cung cấp
        purchases: 'purchases',
        suppliers: 'suppliers',
        invoices: 'invoices' // THÊM MỚI
    };

    // ... (keep existing code) ...

    window.db = {
        init: initDB,
        STORES: STORES,

        getAllProducts: () => getAll(STORES.products),
        addProduct: (product) => add(STORES.products, product),
        updateProduct: (product) => update(STORES.products, product),
        deleteProduct: (id) => remove(STORES.products, id),

        getAllOrders: () => getAll(STORES.orders),
        addOrder: (order) => add(STORES.orders, order),
        updateOrder: (order) => update(STORES.orders, order),
        deleteOrder: (id) => remove(STORES.orders, id),

        getAllCustomers: () => getAll(STORES.customers),
        addCustomer: (customer) => add(STORES.customers, customer),
        updateCustomer: (customer) => update(STORES.customers, customer),
        deleteCustomer: (id) => remove(STORES.customers, id),

        getAllPurchases: () => getAll(STORES.purchases),
        addPurchase: (purchase) => add(STORES.purchases, purchase),
        updatePurchase: (purchase) => update(STORES.purchases, purchase),
        deletePurchase: (id) => remove(STORES.purchases, id),

        getAllSuppliers: () => getAll(STORES.suppliers),
        addSupplier: (supplier) => add(STORES.suppliers, supplier),
        updateSupplier: (supplier) => update(STORES.suppliers, supplier),
        deleteSupplier: (id) => remove(STORES.suppliers, id),

        // THÊM MỚI: Các hàm cho Hóa đơn
        getAllInvoices: () => getAll(STORES.invoices),
        addInvoice: (invoice) => add(STORES.invoices, invoice),
        updateInvoice: (invoice) => update(STORES.invoices, invoice),
        deleteInvoice: (id) => remove(STORES.invoices, id),

        overwriteStore: overwriteStore,
    };
})();