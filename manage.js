document.addEventListener('DOMContentLoaded', async () => {
  await db.init();

  const tableBody = document.getElementById('products-table');
  const pagination = document.getElementById('pagination-controls');
  const searchBar = document.getElementById('search-bar');
  const addBtn = document.getElementById('add-product-btn');
  const modal = document.getElementById('product-modal');
  const saveBtn = document.getElementById('save-product-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const importBtn = document.getElementById('import-btn');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const modalTitle = document.getElementById('modal-title');
  // THÊM MỚI: Lấy các ô input giá từ modal
  const importPriceInput = document.getElementById('import-price');
  const wholesalePriceInput = document.getElementById('wholesale-price');
  const retailPriceInput = document.getElementById('retail-price');

  let products = await db.getAllProducts();
  products.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  let currentPage = 1;
  const rowsPerPage = 30;

  // THAY ĐỔI: Tạo hàm mới chỉ để định dạng số, không có ký hiệu tiền tệ
  const formatNumber = (n) =>
    new Intl.NumberFormat('vi-VN').format(n || 0);

  // --- Render phân trang ---
  const renderPagination = (totalItems) => {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (totalPages <= 1) return;

    const createBtn = (text, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.innerHTML = text;
      btn.className = `px-3 py-1 rounded-md ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`;
      btn.disabled = disabled;
      if (!disabled) btn.onclick = () => {
        currentPage = page;
        renderTable();
      };
      return btn;
    };

    pagination.appendChild(createBtn('«', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
        pagination.appendChild(createBtn(i, i, false, i === currentPage));
      } else if (i === 2 && currentPage > 4) {
        pagination.appendChild(document.createTextNode('...'));
      } else if (i === totalPages - 1 && currentPage < totalPages - 3) {
        pagination.appendChild(document.createTextNode('...'));
      }
    }
    pagination.appendChild(createBtn('»', currentPage + 1, currentPage === totalPages));
  };

  // --- Render bảng ---
  const renderTable = () => {
    const query = searchBar.value.toLowerCase();
    const filtered = products.filter((p) => p.name.toLowerCase().includes(query));
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);

    tableBody.innerHTML = '';
    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Không có sản phẩm nào.</td></tr>`;
    } else {
      pageData.forEach((p) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        // THAY ĐỔI: Sử dụng formatNumber thay vì formatCurrency
        row.innerHTML = `
          <td class="px-6 py-3">${p.id}</td>
          <td class="px-6 py-3">${p.name}</td>
          <td class="px-6 py-3">${p.unit}</td>
          <td class="px-6 py-3 text-right">${formatNumber(p.importPrice)}</td>
          <td class="px-6 py-3 text-right">${formatNumber(p.wholesalePrice)}</td>
          <td class="px-6 py-3 text-right">${formatNumber(p.retailPrice)}</td>
          <td class="px-6 py-3 text-center space-x-3">
            <button class="text-blue-600 hover:underline" onclick="app.edit('${p.id}')">Chỉnh sửa</button>
            <button class="text-red-600 hover:underline" onclick="app.delete('${p.id}')">Xóa</button>
          </td>`;
        tableBody.appendChild(row);
      });
    }
    renderPagination(filtered.length);
  };

  // --- Mở modal thêm/sửa ---
  const openModal = (product = null) => {
    document.getElementById('product-form').reset();
    if (product) {
      modalTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-unit').value = product.unit;
      // THAY ĐỔI: Hiển thị giá đã định dạng trong modal
      importPriceInput.value = formatNumber(product.importPrice);
      wholesalePriceInput.value = formatNumber(product.wholesalePrice);
      retailPriceInput.value = formatNumber(product.retailPrice);
    } else {
      modalTitle.textContent = 'Thêm Sản Phẩm';
    }
    modal.classList.remove('hidden');
  };

  // --- Đóng modal ---
  const closeModal = () => modal.classList.add('hidden');

  // --- Lưu sản phẩm ---
  saveBtn.onclick = async () => {
    // THAY ĐỔI: Chuyển đổi giá trị đã định dạng về dạng số trước khi lưu
    const importPrice = parseFloat(importPriceInput.value.replace(/\./g, '')) || 0;
    const wholesalePrice = parseFloat(wholesalePriceInput.value.replace(/\./g, '')) || 0;
    const retailPrice = parseFloat(retailPriceInput.value.replace(/\./g, '')) || 0;

    const id = document.getElementById('product-id').value || Date.now().toString();
    const product = {
      id,
      name: document.getElementById('product-name').value.trim(),
      unit: document.getElementById('product-unit').value.trim(),
      importPrice,
      wholesalePrice,
      retailPrice,
    };
    if (!product.name) return alert('Tên hàng hóa không được để trống.');

    const exists = products.find((p) => p.id === id);
    if (exists) await db.updateProduct(product);
    else await db.addProduct(product);

    products = await db.getAllProducts();
    products.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    
    renderTable();
    closeModal();
  };
  
  // THÊM MỚI: Hàm tự động định dạng số khi người dùng nhập
  const autoFormatNumberInput = (e) => {
    const input = e.target;
    let value = input.value.replace(/\D/g, ''); // Bỏ hết các ký tự không phải số
    input.value = value ? formatNumber(value) : '';
  };

  // THÊM MỚI: Gán sự kiện cho các ô nhập giá
  importPriceInput.addEventListener('input', autoFormatNumberInput);
  wholesalePriceInput.addEventListener('input', autoFormatNumberInput);
  retailPriceInput.addEventListener('input', autoFormatNumberInput);

  cancelBtn.onclick = closeModal;
  addBtn.onclick = () => openModal();
  searchBar.oninput = () => {
    currentPage = 1;
    renderTable();
  };

  // --- Nhập Excel ---
  importBtn.onclick = () => importInput.click();

  importInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        alert('File Excel không có dữ liệu hoặc không đúng định dạng.');
        importInput.value = '';
        return;
      }
      const firstRow = rows[0];
      if (!firstRow.hasOwnProperty('ID') || !firstRow.hasOwnProperty('HH_Ten')) {
          alert("File Excel không đúng định dạng. Cần phải có ít nhất 2 cột 'ID' và 'HH_Ten'.");
          importInput.value = '';
          return;
      }

      const newData = rows
        .filter((r) => r.ID && r.HH_Ten)
        .map((r) => ({
          id: String(r.ID).trim(),
          name: r.HH_Ten?.toString().trim() || '',
          unit: r.HH_DonVi?.toString().trim() || '',
          importPrice: parseFloat(String(r.HH_GiaNhap).replace(/[^\d.-]/g, '')) || 0,
          wholesalePrice: parseFloat(String(r.HH_GiaBan).replace(/[^\d.-]/g, '')) || 0,
          retailPrice: parseFloat(String(r.HH_GiabanLe).replace(/[^\d.-]/g, '')) || 0,
          note: r['Ghi chu']?.toString().trim() || '',
        }));

      if (newData.length === 0) {
        alert("Không tìm thấy sản phẩm hợp lệ nào trong file Excel để nhập.");
        importInput.value = '';
        return;
      }

      await db.overwriteStore(db.STORES.products, newData);
      
      alert(`Đã nhập ${newData.length} sản phẩm thành công! Trang sẽ tự động tải lại.`);
      location.reload();

    } catch (error) {
        console.error("Lỗi khi nhập file:", error);
        alert("Đã xảy ra lỗi khi đọc file. Vui lòng đảm bảo bạn chọn một file Excel hợp lệ (.xlsx, .xls).");
    } finally {
        importInput.value = '';
    }
  };

  // --- Xuất Excel ---
  exportBtn.onclick = () => {
    if (products.length === 0) {
        alert('Chưa có sản phẩm nào để xuất ra file Excel.');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Hàng Hóa');
    XLSX.writeFile(wb, 'DanhSachHangHoa.xlsx');
  };

  // --- Edit / Delete ---
  window.app = {
    edit: (id) => openModal(products.find((p) => p.id === id)),
    delete: async (id) => {
      if (confirm('Xóa sản phẩm này?')) {
        await db.deleteProduct(id);
        products = await db.getAllProducts();
        products.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        renderTable();
      }
    },
  };

  renderTable();
});