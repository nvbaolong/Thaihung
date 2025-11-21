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
        suppliers: 'suppliers'
    };

    // Biến để giữ kết nối tới DB
    let db;

    // --- CÁC HÀM TIỆN ÍCH ---

    /**
     * Khởi tạo và mở kết nối tới IndexedDB.
     * Sẽ tạo các object store nếu chưa có.
     * @returns {Promise<void>} Một promise sẽ resolve khi DB sẵn sàng.
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                return resolve();
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('Lỗi khi mở IndexedDB:', event.target.error);
                reject('Lỗi IndexedDB');
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Kết nối IndexedDB thành công.');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Nâng cấp hoặc tạo cơ sở dữ liệu...');

                if (!db.objectStoreNames.contains(STORES.products)) {
                    db.createObjectStore(STORES.products, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.orders)) {
                    db.createObjectStore(STORES.orders, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.customers)) {
                    db.createObjectStore(STORES.customers, { keyPath: 'id' });
                }
                // THÊM MỚI: Tạo store khi nâng cấp DB
                if (!db.objectStoreNames.contains(STORES.purchases)) {
                    db.createObjectStore(STORES.purchases, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.suppliers)) {
                    db.createObjectStore(STORES.suppliers, { keyPath: 'id' });
                }
            };
        });
    }

    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    function overwriteStore(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            store.clear();
            data.forEach(item => store.add(item));
        });
    }


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

        // THÊM MỚI: Các hàm cho Nhập Hàng và NCC
        getAllPurchases: () => getAll(STORES.purchases),
        addPurchase: (purchase) => add(STORES.purchases, purchase),
        updatePurchase: (purchase) => update(STORES.purchases, purchase),
        deletePurchase: (id) => remove(STORES.purchases, id),

        getAllSuppliers: () => getAll(STORES.suppliers),
        addSupplier: (supplier) => add(STORES.suppliers, supplier),
        updateSupplier: (supplier) => update(STORES.suppliers, supplier),
        deleteSupplier: (id) => remove(STORES.suppliers, id),

        overwriteStore: overwriteStore,
    };
})();