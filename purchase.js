document.addEventListener('DOMContentLoaded', async () => {
    await db.init();

    let state = {
        products: [],
        suppliers: [],
        allPurchases: [],
        purchaseTabs: [],
        activePurchaseId: 1,
        nextPurchaseId: 2,
        filterBySupplier: false,
        
        activeOverlayTab: 'purchases', 
        supplierListSearchQuery: '',
        purchaseHistory: {
            searchQuery: '',
            currentPage: 1,
            rowsPerPage: 30,
            sortDirection: 'desc'
        }
    };

    // --- DOM ELEMENTS ---
    const historyOverlay = document.getElementById('history-overlay');
    const showHistoryOverlayBtn = document.getElementById('show-history-overlay-btn');
    const backToPurchaseBtn = document.getElementById('back-to-purchase-btn');

    const productSearchInput = document.getElementById('product-search');
    const autocompleteResultsContainer = document.getElementById('autocomplete-results');
    const currentPurchaseItemsContainer = document.getElementById('current-purchase-items');
    const savePurchaseBtn = document.getElementById('save-purchase-btn');
    const supplierNameSearchInput = document.getElementById('supplier-name-search');
    const supplierAutocompleteResults = document.getElementById('supplier-autocomplete-results');
    const summaryTotalEl = document.getElementById('summary-total');
    const summaryItemCountEl = document.getElementById('summary-item-count');
    const purchaseTabsContainer = document.getElementById('purchase-tabs-container');
    const newPurchaseBtn = document.getElementById('new-purchase-btn');
    const supplierProductToggle = document.getElementById('supplier-product-toggle');

    const quickSupplierModal = document.getElementById('quick-supplier-modal');
    const quickAddSupplierBtn = document.getElementById('quick-add-supplier-btn');
    const closeQuickSupplierModalBtn = document.getElementById('close-quick-supplier-modal-btn');
    const saveQuickSupplierBtn = document.getElementById('save-quick-supplier-btn');
    const quickSupplierNameInput = document.getElementById('quick-supplier-name');
    
    // Quick Add Product Elements
    const quickAddProductBtn = document.getElementById('quick-add-product-btn');
    const quickProductModal = document.getElementById('quick-product-modal');
    const closeQuickProductModalBtn = document.getElementById('close-quick-product-modal-btn');
    const saveQuickProductBtn = document.getElementById('save-quick-product-btn');
    const quickProductNameInput = document.getElementById('quick-product-name');
    const quickProductImportPriceInput = document.getElementById('quick-product-import-price');

    const overlayTabs = document.getElementById('overlay-tabs');
    const supplierListView = document.getElementById('supplier-list-view');
    const purchaseHistoryView = document.getElementById('purchase-history-view');
    
    const supplierListTableBody = document.getElementById('supplier-list-table-body');
    const supplierListSearchBar = document.getElementById('supplier-list-search-bar');
    const addNewSupplierBtn = document.getElementById('add-new-supplier-btn');

    const purchaseHistoryTableHead = document.getElementById('purchase-history-table-head');
    const purchaseHistoryTableBody = document.getElementById('purchase-history-table-body');
    const purchaseHistorySearchBar = document.getElementById('purchase-history-search-bar');
    const purchaseHistoryPagination = document.getElementById('purchase-history-pagination');

    const supplierEditModal = document.getElementById('supplier-edit-modal');
    const supplierEditModalTitle = document.getElementById('supplier-edit-modal-title');
    const supplierEditIdHidden = document.getElementById('supplier-edit-id-hidden');
    const supplierEditNameInput = document.getElementById('supplier-edit-name');
    const saveSupplierEditBtn = document.getElementById('save-supplier-edit-btn');
    const closeSupplierEditModalBtn = document.getElementById('close-supplier-edit-modal-btn');

    // --- DATA HANDLING & STATE ---
    const saveUiState = () => {
        const uiState = {
            purchaseTabs: state.purchaseTabs,
            nextPurchaseId: state.nextPurchaseId,
            activePurchaseId: state.activePurchaseId,
        };
        localStorage.setItem('purchaseDashboardUiState', JSON.stringify(uiState));
    };

    const loadData = async () => {
        state.products = await db.getAllProducts();
        state.suppliers = await db.getAllSuppliers();
        state.allPurchases = await db.getAllPurchases();
        
        const uiStateData = localStorage.getItem('purchaseDashboardUiState');
        if (uiStateData) {
            const parsed = JSON.parse(uiStateData);
            state.purchaseTabs = parsed.purchaseTabs && parsed.purchaseTabs.length > 0 ? parsed.purchaseTabs : [{ id: 1, items: [], supplierName: '', total: 0, originalPurchaseId: null }];
            state.nextPurchaseId = parsed.nextPurchaseId || 2;
            state.activePurchaseId = parsed.activePurchaseId || 1;
        } else {
            state.purchaseTabs = [{ id: 1, items: [], supplierName: '', total: 0, originalPurchaseId: null }];
        }
    };

    const getActivePurchase = () => state.purchaseTabs.find(p => p.id === state.activePurchaseId);
    
    // --- FORMATTING ---
    const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
    const formatDateTime = (isoString) => new Date(isoString).toLocaleString('vi-VN');
    const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');


    // --- RENDER FUNCTIONS ---
    
    const renderPurchaseHistoryPagination = (totalItems) => {
        purchaseHistoryPagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / state.purchaseHistory.rowsPerPage);
        if (totalPages <= 1) return;
        const createBtn = (text, page, disabled = false, active = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = `px-3 py-1 rounded-md ${active ? 'bg-blue-600 text-white' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`;
            btn.disabled = disabled;
            if (!disabled) {
                btn.onclick = () => {
                    state.purchaseHistory.currentPage = page;
                    renderPurchaseHistory();
                };
            }
            return btn;
        };
        purchaseHistoryPagination.appendChild(createBtn('«', state.purchaseHistory.currentPage - 1, state.purchaseHistory.currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - state.purchaseHistory.currentPage) <= 2) {
                purchaseHistoryPagination.appendChild(createBtn(i, i, false, i === state.purchaseHistory.currentPage));
            } else if (purchaseHistoryPagination.lastChild.textContent !== '...' && ((i < state.purchaseHistory.currentPage && i === 2) || (i > state.purchaseHistory.currentPage && i === totalPages - 1))) {
                purchaseHistoryPagination.appendChild(document.createTextNode('...'));
            }
        }
        purchaseHistoryPagination.appendChild(createBtn('»', state.purchaseHistory.currentPage + 1, state.purchaseHistory.currentPage === totalPages));
    };

    const renderPurchaseHistory = () => {
        purchaseHistoryTableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3">ID Phiếu Nhập</th>
                <th class="px-6 py-3">Nhà Cung Cấp</th>
                <th id="sort-purchase-by-date" class="px-6 py-3 cursor-pointer hover:bg-gray-100">Ngày Nhập <i class="fas fa-sort-down ml-1"></i></th>
                <th class="px-6 py-3 text-right">Tổng Tiền</th>
                <th class="px-6 py-3">Thao Tác</th>
            </tr>
        `;
        let filtered = state.allPurchases;
        if (state.purchaseHistory.searchQuery) {
            const query = removeDiacritics(state.purchaseHistory.searchQuery.toLowerCase());
            filtered = filtered.filter(p => p.id.toLowerCase().includes(query) || (p.supplierName && removeDiacritics(p.supplierName.toLowerCase()).includes(query)));
        }
        filtered.sort((a, b) => state.purchaseHistory.sortDirection === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
        const start = (state.purchaseHistory.currentPage - 1) * state.purchaseHistory.rowsPerPage;
        const end = start + state.purchaseHistory.rowsPerPage;
        const paginated = filtered.slice(start, end);
        purchaseHistoryTableBody.innerHTML = paginated.map(p => `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium">${p.id}</td>
                <td class="px-6 py-4">${p.supplierName || 'N/A'}</td>
                <td class="px-6 py-4">${formatDateTime(p.date)}</td>
                <td class="px-6 py-4 font-semibold text-right">${formatCurrency(p.total)}</td>
                <td class="px-6 py-4 text-left whitespace-nowrap">
                    <button class="text-blue-500 hover:underline" onclick="app.viewPurchaseDetails('${p.id}')">Xem</button>
                    <button class="text-green-600 hover:underline ml-2" onclick="app.editPurchase('${p.id}')">Sửa</button>
                    <button class="text-red-600 hover:underline ml-2" onclick="app.deletePurchase('${p.id}')">Xóa</button>
                </td>
            </tr>
        `).join('');
        renderPurchaseHistoryPagination(filtered.length);

        const sortByDateBtn = document.getElementById('sort-purchase-by-date');
        if (sortByDateBtn) {
            sortByDateBtn.onclick = () => {
                state.purchaseHistory.sortDirection = state.purchaseHistory.sortDirection === 'desc' ? 'asc' : 'desc';
                renderPurchaseHistory();
            };
        }
    };

    const updatePurchaseSummary = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase) return;
        const total = activePurchase.items.reduce((sum, item) => sum + (item.importPrice * item.quantity), 0);
        const itemCount = activePurchase.items.length;
        activePurchase.total = total;
        summaryTotalEl.textContent = formatNumber(total);
        summaryItemCountEl.textContent = itemCount;
        savePurchaseBtn.disabled = itemCount === 0;
        saveUiState();
    };

    const renderCurrentPurchaseItems = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase || activePurchase.items.length === 0) {
            currentPurchaseItemsContainer.innerHTML = `<p class="text-gray-900 text-center py-4">Chưa có sản phẩm nào</p>`;
        } else {
            const table = document.createElement('table');
            table.className = 'w-full text-left text-sm';
            table.innerHTML = `<thead class="uppercase bg-gray-50 text-xs"><tr><th class="px-2 py-2">Tên hàng</th><th class="px-2 py-2 text-center">SL</th><th class="px-2 py-2 text-right">Giá nhập</th><th class="px-2 py-2 text-right">Thành tiền</th><th class="px-2 py-2 text-center">Xóa</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            activePurchase.items.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'bg-white border-b';
                row.innerHTML = `
                    <td class="px-2 py-2 font-medium">${item.name}</td>
                    <td class="px-2 py-2 text-center"><input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="w-16 text-center border rounded-md quantity-input"></td>
                    <td class="px-2 py-2 text-right"><input type="text" value="${formatNumber(item.importPrice)}" data-id="${item.id}" class="w-28 text-right border rounded-md px-1 py-1 import-price-input bg-gray-50 focus:bg-white"></td>
                    <td class="px-2 py-2 font-semibold text-right">${formatNumber(item.importPrice * item.quantity)}</td>
                    <td class="px-2 py-2 text-center"><button class="text-red-500" data-id="${item.id}" onclick="app.removeFromPurchase('${item.id}')"><i class="fas fa-trash-alt"></i></button></td>
                `;
                tbody.appendChild(row);
            });
            currentPurchaseItemsContainer.innerHTML = '';
            currentPurchaseItemsContainer.appendChild(table);
        }
        updatePurchaseSummary();
    };
    
    const renderPurchaseTabs = () => {
        Array.from(purchaseTabsContainer.children).forEach(child => {
            if (child.id !== 'new-purchase-btn') purchaseTabsContainer.removeChild(child);
        });
        state.purchaseTabs.forEach((purchase, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `px-4 py-2 text-sm font-medium border-r border-gray-200 ${purchase.id === state.activePurchaseId ? 'bg-white text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`;
            const tabName = purchase.originalPurchaseId ? `Sửa PN ${purchase.originalPurchaseId.slice(-4)}` : `Phiếu ${index + 1}`;
            tabButton.textContent = tabName;
            tabButton.dataset.id = purchase.id;
            tabButton.addEventListener('click', () => {
                state.activePurchaseId = purchase.id;
                renderActivePurchaseUI();
            });
            if (state.purchaseTabs.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.innerHTML = '&times;';
                closeBtn.className = 'ml-2 px-1 rounded-full hover:bg-red-200 text-red-500 font-bold';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    closePurchaseTab(purchase.id);
                };
                tabButton.appendChild(closeBtn);
            }
            purchaseTabsContainer.insertBefore(tabButton, newPurchaseBtn);
        });
    };
    
    const renderActivePurchaseUI = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase) return;
        supplierNameSearchInput.value = activePurchase.supplierName;
        renderPurchaseTabs();
        renderCurrentPurchaseItems();
    };

    const renderAutocompleteResults = (results, container, clickHandler, nameField = 'name') => {
        container.innerHTML = '';
        if (results.length === 0) container.innerHTML = `<div class="p-3 text-gray-500">Không tìm thấy</div>`;
        else {
            results.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0';
                itemEl.innerHTML = `<div class="font-semibold">${item[nameField]}</div>`;
                itemEl.addEventListener('click', () => clickHandler(item));
                container.appendChild(itemEl);
            });
        }
    };
    
    const closePurchaseTab = (purchaseId) => {
        const index = state.purchaseTabs.findIndex(p => p.id === purchaseId);
        if (index > -1) state.purchaseTabs.splice(index, 1);
        if (state.purchaseTabs.length === 0) {
            const newPurchase = { id: state.nextPurchaseId++, items: [], supplierName: '', total: 0, originalPurchaseId: null };
            state.purchaseTabs.push(newPurchase);
            state.activePurchaseId = newPurchase.id;
        } else if (state.activePurchaseId === purchaseId) {
            state.activePurchaseId = state.purchaseTabs[0].id;
        }
        renderActivePurchaseUI();
    };

    const renderSupplierListTable = () => {
        let filteredSuppliers = state.suppliers;
        const query = state.supplierListSearchQuery.toLowerCase().trim();
        if (query) {
            const normalizedQuery = removeDiacritics(query);
            filteredSuppliers = state.suppliers.filter(s => removeDiacritics(s.name.toLowerCase()).includes(normalizedQuery));
        }
        supplierListTableBody.innerHTML = filteredSuppliers.map(s => `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium">${s.id}</td>
                <td class="px-6 py-4">${s.name}</td>
                <td class="px-6 py-4 text-center space-x-4">
                    <button class="text-blue-600 hover:underline font-medium" onclick="app.editSupplier('${s.id}')">Chỉnh sửa</button>
                    <button class="text-red-600 hover:underline font-medium" onclick="app.deleteSupplier('${s.id}')">Xóa</button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="3" class="text-center py-4">Không tìm thấy nhà cung cấp.</td></tr>`;
    };

    const openSupplierEditModal = (supplier = null) => {
        document.getElementById('supplier-edit-form').reset();
        if (supplier) {
            supplierEditModalTitle.textContent = 'Chỉnh Sửa Nhà Cung Cấp';
            supplierEditIdHidden.value = supplier.id;
            supplierEditNameInput.value = supplier.name;
        } else {
            supplierEditModalTitle.textContent = 'Thêm Nhà Cung Cấp Mới';
            supplierEditIdHidden.value = '';
        }
        supplierEditModal.classList.remove('hidden');
        supplierEditNameInput.focus();
    };

    const closeSupplierEditModal = () => supplierEditModal.classList.add('hidden');

    // --- LOGIC & EVENT HANDLERS ---
    window.app = {
        addToPurchase: (productId) => {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const product = state.products.find(p => p.id === productId);
            if (!product) return;
            const existingItem = activePurchase.items.find(item => item.id === productId);
            if (existingItem) existingItem.quantity++;
            else {
                activePurchase.items.push({ id: product.id, name: product.name, importPrice: product.importPrice || 0, quantity: 1 });
            }
            renderCurrentPurchaseItems();
        },
        removeFromPurchase: (productId) => {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            activePurchase.items = activePurchase.items.filter(item => item.id !== productId);
            renderCurrentPurchaseItems();
        },
        editSupplier: (supplierId) => {
            const supplier = state.suppliers.find(s => s.id === supplierId);
            if (supplier) openSupplierEditModal(supplier);
        },
        deleteSupplier: async (supplierId) => {
            if (confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
                await db.deleteSupplier(supplierId);
                state.suppliers = await db.getAllSuppliers();
                renderSupplierListTable();
                alert('Đã xóa nhà cung cấp.');
            }
        },
        viewPurchaseDetails: (purchaseId) => { window.location.href = `purchase-detail.html?id=${purchaseId}`; },
        editPurchase: (purchaseId) => { window.location.href = `purchase.html?edit=${purchaseId}`; },
        deletePurchase: async (purchaseId) => {
            if (confirm('Bạn có chắc chắn muốn xóa phiếu nhập này? Thao tác này không thể hoàn tác.')) {
                try {
                    await db.deletePurchase(purchaseId);
                    state.allPurchases = state.allPurchases.filter(p => p.id !== purchaseId);
                    renderPurchaseHistory();
                    alert('Đã xóa phiếu nhập thành công!');
                } catch (error) {
                    console.error("Lỗi khi xóa phiếu nhập:", error);
                    alert('Đã xảy ra lỗi khi xóa phiếu nhập.');
                }
            }
        }
    };
    
    showHistoryOverlayBtn.addEventListener('click', () => {
        historyOverlay.classList.remove('hidden');
        if(state.activeOverlayTab === 'suppliers') {
            renderSupplierListTable();
        } else {
            renderPurchaseHistory();
        }
    });

    backToPurchaseBtn.addEventListener('click', () => {
        historyOverlay.classList.add('hidden');
    });

    overlayTabs.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const view = e.target.dataset.view;
        state.activeOverlayTab = view;
        overlayTabs.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        e.target.classList.add('border-blue-500', 'text-blue-600');
        e.target.classList.remove('border-transparent', 'text-gray-500');
        if (view === 'suppliers') {
            supplierListView.classList.remove('hidden');
            purchaseHistoryView.classList.add('hidden');
            addNewSupplierBtn.classList.remove('hidden');
            renderSupplierListTable();
        } else {
            supplierListView.classList.add('hidden');
            purchaseHistoryView.classList.remove('hidden');
            addNewSupplierBtn.classList.add('hidden');
            renderPurchaseHistory();
        }
    });

    supplierListSearchBar.addEventListener('input', (e) => {
        state.supplierListSearchQuery = e.target.value;
        renderSupplierListTable();
    });
    
    purchaseHistorySearchBar.addEventListener('input', (e) => {
        state.purchaseHistory.searchQuery = e.target.value;
        state.purchaseHistory.currentPage = 1;
        renderPurchaseHistory();
    });

    addNewSupplierBtn.addEventListener('click', () => openSupplierEditModal());
    closeSupplierEditModalBtn.addEventListener('click', closeSupplierEditModal);

    saveSupplierEditBtn.addEventListener('click', async () => {
        const id = supplierEditIdHidden.value;
        const name = supplierEditNameInput.value.trim();
        if (!name) return alert('Tên NCC không được để trống.');
        const isDuplicate = state.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id);
        if (isDuplicate) return alert(`Tên NCC "${name}" đã tồn tại.`);
        if (id) {
            const supplierToUpdate = state.suppliers.find(s => s.id === id);
            if (supplierToUpdate) {
                supplierToUpdate.name = name;
                await db.updateSupplier(supplierToUpdate);
            }
        } else {
            const newSupplier = { id: `NCC-${Date.now()}`, name };
            await db.addSupplier(newSupplier);
        }
        state.suppliers = await db.getAllSuppliers();
        renderSupplierListTable();
        closeSupplierEditModal();
    });

    supplierProductToggle.addEventListener('change', (e) => {
        state.filterBySupplier = e.target.checked;
        productSearchInput.value = '';
        autocompleteResultsContainer.classList.add('hidden');
        productSearchInput.focus();
    });

    const handleProductSearch = () => {
        const rawQuery = productSearchInput.value.trim();
        
        let sourceProducts = state.products;
        let showEvenIfEmpty = false;

        if (state.filterBySupplier) {
            showEvenIfEmpty = true;
            const activePurchase = getActivePurchase();
            const supplierName = activePurchase ? activePurchase.supplierName.trim() : '';
            if (supplierName) {
                const supplier = state.suppliers.find(s => s.name === supplierName);
                if (supplier && supplier.productIds && supplier.productIds.length > 0) {
                    const supplierProductIds = new Set(supplier.productIds);
                    sourceProducts = state.products.filter(p => supplierProductIds.has(p.id));
                } else {
                    sourceProducts = []; 
                }
            } else {
                sourceProducts = [];
            }
        }

        if (!rawQuery && !showEvenIfEmpty) {
            autocompleteResultsContainer.classList.add('hidden');
            return;
        }

        let results = sourceProducts;
        if (rawQuery) {
            const normalizedQuery = removeDiacritics(rawQuery.toLowerCase());
            const keywords = normalizedQuery.split(/\s+/).filter(Boolean);
            results = sourceProducts.filter(p => {
                const normalizedName = removeDiacritics(p.name.toLowerCase());
                return keywords.every(kw => normalizedName.includes(kw) || String(p.id).toLowerCase().includes(kw));
            });
        }
        
        renderAutocompleteResults(results, autocompleteResultsContainer, (product) => {
            app.addToPurchase(product.id);
            productSearchInput.value = '';
            autocompleteResultsContainer.classList.add('hidden');
        });
        autocompleteResultsContainer.classList.remove('hidden');
    }

    productSearchInput.addEventListener('input', handleProductSearch);
    productSearchInput.addEventListener('focus', handleProductSearch);


    const selectSupplier = (supplier) => {
        const activePurchase = getActivePurchase();
        if (activePurchase) {
            supplierNameSearchInput.value = supplier.name;
            activePurchase.supplierName = supplier.name;
            saveUiState();
        }
        supplierAutocompleteResults.classList.add('hidden');
    };

    supplierNameSearchInput.addEventListener('focus', () => {
        if (!supplierNameSearchInput.value.trim()) {
            renderAutocompleteResults(state.suppliers.slice(0, 10), supplierAutocompleteResults, selectSupplier);
            supplierAutocompleteResults.classList.remove('hidden');
        }
    });

    supplierNameSearchInput.addEventListener('input', (e) => {
        const rawQuery = e.target.value;
        const activePurchase = getActivePurchase();
        if (activePurchase) activePurchase.supplierName = rawQuery.trim();
        saveUiState();
        const query = rawQuery.trim().toLowerCase();
        if (!query) {
            renderAutocompleteResults(state.suppliers.slice(0, 10), supplierAutocompleteResults, selectSupplier);
            supplierAutocompleteResults.classList.remove('hidden');
            return;
        }
        const normalizedQuery = removeDiacritics(query);
        const keywords = normalizedQuery.split(/\s+/).filter(Boolean);
        const results = state.suppliers.filter(s => {
            const normalizedName = removeDiacritics(s.name.toLowerCase());
            return keywords.every(kw => normalizedName.includes(kw));
        });
        renderAutocompleteResults(results.slice(0, 10), supplierAutocompleteResults, selectSupplier);
        supplierAutocompleteResults.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!productSearchInput.contains(e.target)) autocompleteResultsContainer.classList.add('hidden');
        if (!supplierNameSearchInput.contains(e.target)) supplierAutocompleteResults.classList.add('hidden');
    });

    currentPurchaseItemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const id = e.target.dataset.id;
            const quantity = parseInt(e.target.value, 10);
            const item = activePurchase.items.find(i => i.id === id);
            if (item) {
                if (quantity > 0) item.quantity = quantity;
                else app.removeFromPurchase(id);
                renderCurrentPurchaseItems();
            }
        }
    });

    currentPurchaseItemsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('import-price-input')) {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const id = e.target.dataset.id;
            const input = e.target;
            let value = input.value.replace(/\D/g, '');
            input.value = value ? formatNumber(value) : '';
            const newPrice = parseFloat(value) || 0;
            const item = activePurchase.items.find(i => i.id === id);
            if (item) {
                item.importPrice = newPrice;
                const row = input.closest('tr');
                if (row) {
                    const totalCell = row.querySelector('td:nth-child(4)');
                    totalCell.textContent = formatNumber(item.importPrice * item.quantity);
                }
                updatePurchaseSummary();
            }
        }
    });

    savePurchaseBtn.addEventListener('click', async () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase || activePurchase.items.length === 0) return;
        
        const supplierName = activePurchase.supplierName.trim();
        if (supplierName) {
            const supplier = state.suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
            if (supplier) {
                const productIdsInPurchase = activePurchase.items.map(item => item.id);
                if (!supplier.productIds) supplier.productIds = [];
                const updatedProductIds = new Set([...supplier.productIds, ...productIdsInPurchase]);
                supplier.productIds = Array.from(updatedProductIds);
                await db.updateSupplier(supplier);
            }
        }

        let savedPurchase;
        if (activePurchase.originalPurchaseId) {
            const purchaseToUpdate = state.allPurchases.find(p => p.id === activePurchase.originalPurchaseId);
            if (purchaseToUpdate) {
                purchaseToUpdate.supplierName = activePurchase.supplierName.trim() || 'N/A';
                purchaseToUpdate.items = activePurchase.items;
                purchaseToUpdate.total = activePurchase.total;
                purchaseToUpdate.date = new Date().toISOString();
                await db.updatePurchase(purchaseToUpdate);
                savedPurchase = purchaseToUpdate;
                alert(`Đã cập nhật thành công phiếu nhập: ${savedPurchase.id}`);
            } else {
                alert(`Không tìm thấy phiếu nhập gốc để cập nhật.`);
                return;
            }
        } else {
            const newPurchase = {
                id: `PN-${Date.now()}`,
                date: new Date().toISOString(),
                supplierName: activePurchase.supplierName.trim() || 'N/A',
                items: activePurchase.items,
                total: activePurchase.total,
            };
            await db.addPurchase(newPurchase);
            savedPurchase = newPurchase;
        }
        closePurchaseTab(activePurchase.id);
        if (savedPurchase) {
            window.location.href = `purchase-detail.html?id=${savedPurchase.id}`;
        }
    });

    quickAddSupplierBtn.addEventListener('click', () => {
        quickSupplierNameInput.value = supplierNameSearchInput.value;
        quickSupplierModal.classList.remove('hidden');
        quickSupplierNameInput.focus();
    });
    closeQuickSupplierModalBtn.addEventListener('click', () => quickSupplierModal.classList.add('hidden'));
    saveQuickSupplierBtn.addEventListener('click', async () => {
        const name = quickSupplierNameInput.value.trim();
        if (!name) {
            alert('Tên Nhà Cung Cấp không được để trống.');
            return;
        }
        const normalizedNewName = name.toLowerCase();
        const isDuplicate = state.suppliers.some(supplier => supplier.name.toLowerCase() === normalizedNewName);
        if (isDuplicate) {
            alert(`Tên nhà cung cấp "${name}" đã tồn tại. Vui lòng nhập tên khác.`);
            return;
        }
        const newSupplier = { id: `NCC-${Date.now()}`, name, productIds: [] };
        await db.addSupplier(newSupplier);
        state.suppliers.push(newSupplier);
        const activePurchase = getActivePurchase();
        if (activePurchase) {
            supplierNameSearchInput.value = name;
            activePurchase.supplierName = name;
        }
        quickSupplierModal.classList.add('hidden');
        alert(`Đã thêm NCC mới: ${name}`);
    });

    newPurchaseBtn.addEventListener('click', () => {
        const newPurchase = { id: state.nextPurchaseId++, items: [], supplierName: '', total: 0, originalPurchaseId: null };
        state.purchaseTabs.push(newPurchase);
        state.activePurchaseId = newPurchase.id;
        renderActivePurchaseUI();
    });
    
    // --- QUICK ADD PRODUCT LOGIC ---
    const formatNumberInput = (e) => {
        const input = e.target;
        let value = input.value.replace(/\D/g, '');
        input.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';
    };
    quickProductImportPriceInput.addEventListener('input', formatNumberInput);

    quickAddProductBtn.addEventListener('click', () => {
        quickProductNameInput.value = productSearchInput.value.trim();
        quickProductModal.classList.remove('hidden');
        quickProductNameInput.focus();
    });

    closeQuickProductModalBtn.addEventListener('click', () => {
        quickProductModal.classList.add('hidden');
    });

    saveQuickProductBtn.addEventListener('click', async () => {
        const name = quickProductNameInput.value.trim();
        if (!name) {
            alert('Tên sản phẩm không được để trống.');
            return;
        }

        const importPrice = parseFloat(quickProductImportPriceInput.value.replace(/\./g, '')) || 0;

        const newProduct = {
            id: Date.now().toString(),
            name: name,
            unit: 'Cái', 
            importPrice: importPrice,
            wholesalePrice: 0,
            retailPrice: 0,
        };

        await db.addProduct(newProduct);
        state.products.push(newProduct);
        app.addToPurchase(newProduct.id);

        quickProductModal.classList.add('hidden');
        document.getElementById('quick-product-form').reset();
        
        alert(`Đã thêm sản phẩm "${name}" và đưa vào phiếu nhập.`);
    });


    // --- INITIALIZATION ---
    const init = async () => {
        await loadData();
        
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseIdToEdit = urlParams.get('edit');
        const purchaseIdToClone = urlParams.get('clone');

        if (purchaseIdToClone) {
            const purchaseToClone = state.allPurchases.find(p => p.id === purchaseIdToClone);
            if (purchaseToClone) {
                const newPurchaseTab = {
                    id: state.nextPurchaseId++,
                    items: JSON.parse(JSON.stringify(purchaseToClone.items)),
                    supplierName: purchaseToClone.supplierName,
                    total: purchaseToClone.total,
                    originalPurchaseId: null 
                };
                state.purchaseTabs.push(newPurchaseTab);
                state.activePurchaseId = newPurchaseTab.id;
            }
            window.history.replaceState({}, document.title, window.location.pathname);

        } else if (purchaseIdToEdit) { 
            const purchaseToEdit = state.allPurchases.find(p => p.id === purchaseIdToEdit);
            if (purchaseToEdit) {
                const existingTab = state.purchaseTabs.find(p => p.originalPurchaseId === purchaseIdToEdit);
                if (!existingTab) {
                    const newPurchaseTab = {
                        id: state.nextPurchaseId++,
                        items: JSON.parse(JSON.stringify(purchaseToEdit.items)),
                        supplierName: purchaseToEdit.supplierName,
                        total: purchaseToEdit.total,
                        originalPurchaseId: purchaseIdToEdit
                    };
                    state.purchaseTabs.push(newPurchaseTab);
                    state.activePurchaseId = newPurchaseTab.id;
                } else {
                    state.activePurchaseId = existingTab.id;
                }
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        renderActivePurchaseUI();
    };

    init();
});

