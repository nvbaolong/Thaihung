document.addEventListener('DOMContentLoaded', async () => {

    // Helper function to remove Vietnamese diacritics
    const removeDiacritics = (str) => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    };

    let state = {
        orders: [],
        searchQuery: '',
        filterType: 'all',
        currentPage: 1,
        rowsPerPage: 30,
        sortDirection: 'desc'
    };

    // --- DOM ELEMENTS ---
    const customersTable = document.getElementById('customers-table');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const customerModal = document.getElementById('customer-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveCustomerBtn = document.getElementById('save-customer-btn');
    const customerForm = document.getElementById('customer-form');
    const modalTitle = document.getElementById('modal-title');
    const customerIdHidden = document.getElementById('customer-id-hidden');
    const customerNameInput = document.getElementById('customer-name');
    const customerInitialDebtInput = document.getElementById('customer-initial-debt');
    const debtLabel = document.getElementById('debt-label');
    const customerSearchBar = document.getElementById('customer-search-bar');
    const sortByDebtBtn = document.getElementById('sort-by-debt');
    const debtSortIcon = document.getElementById('debt-sort-icon');
    const payDebtModal = document.getElementById('pay-debt-modal');
    const closePayDebtModalBtn = document.getElementById('close-pay-debt-modal-btn');
    const savePaymentBtn = document.getElementById('save-payment-btn');
    const payDebtCustomerId = document.getElementById('pay-debt-customer-id');
    const payDebtCustomerName = document.getElementById('pay-debt-customer-name');
    const payDebtTotalDebt = document.getElementById('pay-debt-total-debt');
    const payDebtAmountInput = document.getElementById('pay-debt-amount');

    // --- DATA HANDLING ---
    // Xóa saveData() và loadData() cũ

    const formatCurrency = (value) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numValue);
    };

    // Hàm này giữ nguyên vì nó hoạt động trên state đã được tải
    const calculateCustomerDebts = () => {
        const customerDebts = {};
        state.orders.forEach(order => {
            if (order.customerName) {
                if (!customerDebts[order.customerName]) {
                    customerDebts[order.customerName] = 0;
                }
                customerDebts[order.customerName] += order.debtAmount || 0;
            }
        });
        return customerDebts;
    };

    // --- RENDER FUNCTIONS ---
    const renderCustomersTable = () => {
        customersTable.innerHTML = '';

        let filteredCustomers = state.customers;
        if (state.searchQuery) {
            const normalizedQuery = removeDiacritics(state.searchQuery.toLowerCase());
            filteredCustomers = state.customers.filter(c =>
                removeDiacritics(c.name.toLowerCase()).includes(normalizedQuery)
            );
        }

        if (filteredCustomers.length === 0) {
            customersTable.innerHTML = `<tr><td colspan="4" class="text-center py-4">Không tìm thấy khách hàng nào.</td></tr>`;
            return;
        }

        const customerDebts = calculateCustomerDebts();

        let customersWithTotalDebt = filteredCustomers.map(customer => {
            const currentDebt = customerDebts[customer.name] || 0;
            const totalDebt = (customer.initialDebt || 0) + currentDebt;
            return { ...customer, totalDebt };
        });

        customersWithTotalDebt.sort((a, b) => {
            if (state.debtSortDirection === 'asc') {
                return a.totalDebt - b.totalDebt;
            } else {
                return b.totalDebt - a.totalDebt;
            }
        });

        customersWithTotalDebt.forEach(customer => {
            const row = document.createElement('tr');
            row.className = "bg-white border-b hover:bg-gray-50";
            row.innerHTML = `
                <td class="px-6 py-4 font-medium">${customer.id}</td>
                <td class="px-6 py-4">${customer.name}</td>
                <td class="px-6 py-4 font-bold text-red-600 text-right">${formatCurrency(customer.totalDebt)}</td>
                <td class="px-6 py-4 text-center space-x-4">
                    <button class="text-green-600 hover:underline font-medium" onclick="app.payDebt('${customer.id}')">Trả nợ</button>
                    <button class="text-blue-600 hover:underline font-medium" onclick="app.editCustomer('${customer.id}')">Chỉnh sửa</button>
                    <button class="text-red-600 hover:underline font-medium" onclick="app.deleteCustomer('${customer.id}')">Xóa</button>
                </td>
            `;
            customersTable.appendChild(row);
        });
        
        debtSortIcon.classList.remove('fa-sort-up', 'fa-sort-down');
        debtSortIcon.classList.add(state.debtSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
    };

    // --- MODAL & FORM HANDLING ---
    const openCustomerModal = (customer = null) => {
        customerForm.reset();
        if (customer) {
            modalTitle.textContent = 'Chỉnh Sửa Khách Hàng';
            debtLabel.textContent = 'Tổng Nợ Hiện Tại:';
            customerIdHidden.value = customer.id;
            customerNameInput.value = customer.name;
            
            const customerDebts = calculateCustomerDebts();
            const currentDebt = customerDebts[customer.name] || 0;
            const totalDebt = (customer.initialDebt || 0) + currentDebt;
            customerInitialDebtInput.value = new Intl.NumberFormat('vi-VN').format(totalDebt);

        } else {
            modalTitle.textContent = 'Thêm Khách Hàng Mới';
            debtLabel.textContent = 'Nợ Ban Đầu:';
            customerIdHidden.value = '';
        }
        customerModal.classList.remove('hidden');
    };

    const closeCustomerModal = () => customerModal.classList.add('hidden');

   // File: customers.js

// TÌM VÀ THAY THẾ TOÀN BỘ HÀM NÀY
saveCustomerBtn.addEventListener('click', async () => {
    const id = customerIdHidden.value;
    const name = customerNameInput.value.trim();
    const debtValueRaw = customerInitialDebtInput.value.replace(/\./g, '');
    const debtValue = parseFloat(debtValueRaw) || 0;

    if (!name) {
        alert('Tên khách hàng là bắt buộc.');
        return;
    }

    // --- LOGIC KIỂM TRA TÊN TRÙNG LẶP ---
    const normalizedNewName = name.toLowerCase();
    let isDuplicate;

    if (id) {
        // Khi CHỈNH SỬA: tìm tên trùng ở một khách hàng KHÁC với khách hàng hiện tại
        isDuplicate = state.customers.some(
            c => c.name.toLowerCase() === normalizedNewName && c.id !== id
        );
    } else {
        // Khi THÊM MỚI: tìm tên trùng ở bất kỳ khách hàng nào
        isDuplicate = state.customers.some(
            c => c.name.toLowerCase() === normalizedNewName
        );
    }

    if (isDuplicate) {
        alert(`Tên khách hàng "${name}" đã tồn tại. Vui lòng sử dụng tên khác.`);
        return; // Dừng lại nếu tên đã tồn tại
    }
    // --- KẾT THÚC KIỂM TRA ---

    if (id) { // Editing logic
        const customer = state.customers.find(c => c.id === id);
        if (customer) {
            const customerDebts = calculateCustomerDebts();
            // Lấy nợ từ các đơn hàng của TÊN CŨ
            const debtFromOrders = customerDebts[customer.name] || 0;
            
            const newTotalDebt = debtValue;
            const newInitialDebt = newTotalDebt - debtFromOrders;

            customer.name = name; // Cập nhật tên mới
            customer.initialDebt = newInitialDebt;
            await db.updateCustomer(customer);
        }
    } else { // Adding new logic
        const newCustomer = {
            id: `KH-${Date.now()}`,
            name: name,
            initialDebt: debtValue,
        };
        await db.addCustomer(newCustomer);
    }
    
    // Tải lại dữ liệu mới nhất và render lại bảng
    state.customers = await db.getAllCustomers();
    renderCustomersTable();
    closeCustomerModal();
});

    const openPayDebtModal = (customer, totalDebt) => {
        payDebtCustomerId.value = customer.id;
        payDebtCustomerName.textContent = customer.name;
        payDebtTotalDebt.textContent = formatCurrency(totalDebt);
        payDebtAmountInput.value = '';
        payDebtModal.classList.remove('hidden');
    };

    const closePayDebtModal = () => payDebtModal.classList.add('hidden');

    savePaymentBtn.addEventListener('click', async () => {
        const customerId = payDebtCustomerId.value;
        const paymentAmountRaw = payDebtAmountInput.value.replace(/\./g, '');
        const paymentAmount = parseFloat(paymentAmountRaw);
        const customer = state.customers.find(c => c.id === customerId);

        if (!customer || isNaN(paymentAmount) || paymentAmount <= 0) {
            alert('Vui lòng nhập số tiền trả hợp lệ.');
            return;
        }

        const customerDebts = calculateCustomerDebts();
        const currentDebt = customerDebts[customer.name] || 0;
        const totalDebt = (customer.initialDebt || 0) + currentDebt;

        if (paymentAmount > totalDebt) {
            alert('Số tiền trả không được lớn hơn tổng nợ hiện tại.');
            return;
        }

        const paymentRecord = {
            id: `PAY-${Date.now()}`,
            customerName: customer.name,
            date: new Date().toISOString(),
            items: [],
            total: 0,
            paidAmount: paymentAmount,
            debtAmount: -paymentAmount,
            priceType: 'payment',
        };

        await db.addOrder(paymentRecord);
        
        // Tải lại dữ liệu và render lại bảng
        state.orders = await db.getAllOrders();
        renderCustomersTable();
        closePayDebtModal();
    });
    

    // --- GLOBAL API ---
    window.app = {
        editCustomer: (id) => {
            const customer = state.customers.find(c => c.id === id);
            if (customer) openCustomerModal(customer);
        },
        deleteCustomer: async (id) => {
            if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
                await db.deleteCustomer(id);
                // Tải lại và render lại
                state.customers = await db.getAllCustomers();
                renderCustomersTable();
            }
        },
        payDebt: (id) => {
            const customer = state.customers.find(c => c.id === id);
            if (!customer) return;

            const customerDebts = calculateCustomerDebts();
            const currentDebt = customerDebts[customer.name] || 0;
            const totalDebt = (customer.initialDebt || 0) + currentDebt;

            if (totalDebt <= 0) {
                alert('Khách hàng này không có nợ.');
                return;
            }
            openPayDebtModal(customer, totalDebt);
        }
    };

    // --- INITIALIZATION ---
    const init = async () => {
        await db.init();
        state.customers = await db.getAllCustomers();
        state.orders = await db.getAllOrders(); // Cần tải orders để tính nợ
        renderCustomersTable();

        addCustomerBtn.addEventListener('click', () => openCustomerModal());
        closeModalBtn.addEventListener('click', closeCustomerModal);
        closePayDebtModalBtn.addEventListener('click', closePayDebtModal);

        customerSearchBar.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderCustomersTable();
        });

        sortByDebtBtn.addEventListener('click', () => {
            state.debtSortDirection = state.debtSortDirection === 'desc' ? 'asc' : 'desc';
            renderCustomersTable();
        });

        const formatNumberInput = (e) => {
            const input = e.target;
            let value = input.value.replace(/\D/g, '');
            input.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';
        };

        payDebtAmountInput.addEventListener('input', formatNumberInput);
        customerInitialDebtInput.addEventListener('input', formatNumberInput);
    };

    // === EXPORT / IMPORT ALL DATA (Logic được sao chép và cập nhật từ script.js) ===
    const exportAllBtn = document.getElementById('export-all-btn');
    const importAllBtn = document.getElementById('import-all-btn');
    const importAllInput = document.getElementById('import-all-input');

    const exportAllData = async () => {
        try {
            alert('Đang chuẩn bị dữ liệu để xuất, vui lòng chờ...');
            const products = await db.getAllProducts();
            const orders = await db.getAllOrders();
            const customers = await db.getAllCustomers();

            if (products.length === 0 && orders.length === 0 && customers.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }

            const wb = XLSX.utils.book_new();
            const wsProducts = XLSX.utils.json_to_sheet(products);
            const wsOrders = XLSX.utils.json_to_sheet(orders);
            const wsCustomers = XLSX.utils.json_to_sheet(customers);
            XLSX.utils.book_append_sheet(wb, wsProducts, "Products");
            XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
            XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

            const today = new Date().toISOString().split('T')[0];
            const filename = `SalesDashboard_Backup_${today}.xlsx`;
            XLSX.writeFile(wb, filename);
            alert('Đã xuất dữ liệu thành công!');
        } catch(error) {
            console.error("Lỗi khi xuất dữ liệu:", error);
            alert("Đã xảy ra lỗi trong quá trình xuất dữ liệu.");
        }
    };

    const importAllData = (file) => {
        if (!confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay thế bằng dữ liệu từ tệp Excel. Bạn có chắc chắn muốn tiếp tục?')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const productsSheet = workbook.Sheets["Products"];
                const ordersSheet = workbook.Sheets["Orders"];
                const customersSheet = workbook.Sheets["Customers"];

                if (!productsSheet || !ordersSheet || !customersSheet) {
                    alert("File không hợp lệ. Hãy đảm bảo có đủ 3 sheet: Products, Orders, và Customers.");
                    return;
                }

                const products = XLSX.utils.sheet_to_json(productsSheet);
                const orders = XLSX.utils.sheet_to_json(ordersSheet);
                const customers = XLSX.utils.sheet_to_json(customersSheet);

                await db.overwriteStore(db.STORES.products, products);
                await db.overwriteStore(db.STORES.orders, orders);
                await db.overwriteStore(db.STORES.customers, customers);
                
                localStorage.removeItem('salesDashboardUiState');

                alert('Đã nhập dữ liệu thành công! Trang sẽ được tải lại.');
                location.reload();

            } catch(error) {
                console.error("Lỗi khi nhập dữ liệu:", error);
                alert("Đã xảy ra lỗi trong quá trình nhập dữ liệu. Vui lòng kiểm tra lại định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);
        importAllInput.value = '';
    };

    if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllData);
    if (importAllBtn && importAllInput) {
        importAllBtn.addEventListener('click', () => importAllInput.click());
        importAllInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) importAllData(file);
        });
    }

    init();
});