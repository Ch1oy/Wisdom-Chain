// js/prize-pool.js

document.addEventListener('DOMContentLoaded', function () {
  // 检查用户权限，确保是管理员
  const userInfo = Utils.DataManager.load('userInfo');
  // 示例：检查userInfo中是否有isAdmin标志，或者根据username判断
  // if (!userInfo || !userInfo.isAdmin) {
  //   Utils.Navigation.goto('index.html'); // 非管理员跳转到首页
  //   return;
  // }
  // TODO: 实现真正的管理员权限检查

  // 初始化页面
  initAdminPage();
  loadPrizesTable(); // 加载奖品列表
  setupEventListeners(); // 设置事件监听器
});

// 奖品数据 (示例数据，实际应从后端或更安全的地方加载和保存)
// 为了演示，继续使用localStorage，但在实际应用中不安全
const PRIZES_STORAGE_KEY = 'prizePoolPrizes';

// 初始化管理员页面
function initAdminPage() {
  // 更新用户信息显示 (如果管理员页面需要显示用户信息)
  // 假设navbar.js会处理用户信息的显示

  // 隐藏抽奖相关的元素（如果HTML中未完全移除）
  // const drawArea = document.querySelector('.draw-area');
  // if (drawArea) drawArea.style.display = 'none';
}

// 从 localStorage 加载奖品数据
function getPrizes() {
  const prizesJson = Utils.DataManager.load(PRIZES_STORAGE_KEY);
  return prizesJson || [];
}

// 保存奖品数据到 localStorage
function savePrizes(prizes) {
  if (!Array.isArray(prizes)) {
    return;
  }

  // 检查存储空间
  try {
    const prizesJson = JSON.stringify(prizes);
    const storageSize = new Blob([prizesJson]).size;

    if (storageSize > 4 * 1024 * 1024) { // 如果超过4MB
      Utils.UI.showToast('警告：奖品数据过大，可能无法保存所有奖品。请考虑压缩图片或减少奖品数量。', 'warning');
    }
  } catch (error) {
  }

  Utils.DataManager.save(PRIZES_STORAGE_KEY, prizes);
  // 验证保存是否成功
  const savedPrizes = Utils.DataManager.load(PRIZES_STORAGE_KEY);

  // 验证保存的数据是否完整
  if (savedPrizes.length !== prizes.length) {
    Utils.UI.showToast('警告：数据保存不完整，请尝试减少图片大小或奖品数量。', 'warning');
  }
}

// 加载并显示奖品列表表格
function loadPrizesTable() {
  const prizeTableBody = document.querySelector('#prizeTable tbody');
  if (!prizeTableBody) return;

  const prizes = getPrizes();
  prizeTableBody.innerHTML = ''; // 清空现有内容

  if (prizes.length === 0) {
    prizeTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">暂无奖品</td></tr>';
    return;
  }

  // 计算总概率
  const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

  // 添加总概率行
  const totalRow = prizeTableBody.insertRow();
  totalRow.innerHTML = `
    <td colspan="2" style="text-align:right;"><strong>总中奖率：</strong></td>
    <td colspan="2"><strong>${totalProbability.toFixed(1)}%</strong></td>
  `;

  // 如果总概率超过100%，添加警告样式
  if (totalProbability > 100) {
    totalRow.style.color = 'red';
    totalRow.innerHTML += '<td colspan="4" style="color:red;">警告：总中奖率超过100%！</td>';
  }

  prizes.forEach(prize => {
    const row = prizeTableBody.insertRow();
    row.innerHTML = `
      <td><img src="${prize.image}" alt="${prize.name}"></td>
      <td>${prize.name}</td>
      <td>${prize.probability.toFixed(1)}</td>
      <td class="actions">
        <button class="btn btn-sm btn-secondary edit-btn" data-id="${prize.id}">编辑</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${prize.id}">删除</button>
      </td>
    `;
  });
}

// 设置事件监听器
function setupEventListeners() {
  // "添加新奖品" 按钮
  const addPrizeBtn = document.getElementById('addPrizeBtn');
  if (addPrizeBtn) {
    addPrizeBtn.addEventListener('click', openAddModal);
  }

  // 奖品图片文件选择预览
  const prizeImageInput = document.getElementById('prizeImage');
  if (prizeImageInput) {
    prizeImageInput.addEventListener('change', handleImageSelect);
  }

  // 保存奖品表单提交
  const prizeForm = document.getElementById('prizeForm');
  if (prizeForm) {
    prizeForm.addEventListener('submit', handleSavePrize);
  }

  // 表格内的编辑和删除按钮 (使用事件委托)
  const prizeTableBody = document.querySelector('#prizeTable tbody');
  if (prizeTableBody) {
    prizeTableBody.addEventListener('click', handleTableActions);
  }
}

// 处理表格内的编辑和删除按钮点击
function handleTableActions(event) {
  const target = event.target;
  const prizeId = target.dataset.id;

  if (target.classList.contains('edit-btn')) {
    openEditModal(prizeId);
  } else if (target.classList.contains('delete-btn')) {
    deletePrize(prizeId);
  }
}

// 打开添加奖品模态框
function openAddModal() {
  const modal = document.getElementById('prizeModal');
  const modalTitle = document.getElementById('modalTitle');
  const prizeForm = document.getElementById('prizeForm');
  const prizeIdInput = document.getElementById('prizeId');
  const imagePreview = document.getElementById('imagePreview');

  if (modal && modalTitle && prizeForm && prizeIdInput && imagePreview) {
    modalTitle.textContent = '添加奖品';
    prizeForm.reset(); // 重置表单
    prizeIdInput.value = ''; // 清空id
    imagePreview.innerHTML = ''; // 清空图片预览
    modal.style.display = 'flex'; // 显示模态框
  }
}

// 打开编辑奖品模态框
function openEditModal(prizeId) {
  const prizes = getPrizes();
  const prizeToEdit = prizes.find(p => p.id == prizeId); // 注意：data-id是字符串，prize.id可能是数字

  if (!prizeToEdit) {
    Utils.UI.showToast('未找到该奖品', 'error');
    return;
  }

  const modal = document.getElementById('prizeModal');
  const modalTitle = document.getElementById('modalTitle');
  const prizeForm = document.getElementById('prizeForm');
  const prizeIdInput = document.getElementById('prizeId');
  const prizeNameInput = document.getElementById('prizeName');
  const prizeProbabilityInput = document.getElementById('prizeProbability');
  const imagePreview = document.getElementById('imagePreview');

  if (modal && modalTitle && prizeForm && prizeIdInput && prizeNameInput && prizeProbabilityInput && imagePreview) {
    modalTitle.textContent = '编辑奖品';
    prizeIdInput.value = prizeToEdit.id;
    prizeNameInput.value = prizeToEdit.name;
    prizeProbabilityInput.value = prizeToEdit.probability;
    // 显示当前图片预览
    imagePreview.innerHTML = `<img src="${prizeToEdit.image}" alt="${prizeToEdit.name}">`;

    modal.style.display = 'flex'; // 显示模态框
  }
}

// 关闭模态框
function closeModal() {
  const modal = document.getElementById('prizeModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 处理图片文件选择并预览
function handleImageSelect(event) {
  const file = event.target.files[0];
  const imagePreview = document.getElementById('imagePreview');

  if (imagePreview) {
    imagePreview.innerHTML = ''; // 清空现有预览
    if (file) {
      // 压缩图片
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          // 创建canvas进行压缩
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 如果图片尺寸超过800px，等比例缩小
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;

          // 绘制图片到canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为较低质量的JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

          // 显示预览
          const previewImg = document.createElement('img');
          previewImg.src = compressedDataUrl;
          imagePreview.appendChild(previewImg);

          // 存储压缩后的图片数据
          imagePreview.dataset.compressedImage = compressedDataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}

// 处理保存奖品（添加或编辑）
function handleSavePrize(event) {
  event.preventDefault(); // 阻止表单默认提交

  const prizeId = document.getElementById('prizeId').value;
  const prizeName = document.getElementById('prizeName').value;
  const prizeProbability = parseFloat(document.getElementById('prizeProbability').value);
  const prizeImageInput = document.getElementById('prizeImage');
  const imagePreview = document.getElementById('imagePreview');
  const currentImageSrc = imagePreview.dataset.compressedImage || document.querySelector('#imagePreview img')?.src;

  if (!prizeName || isNaN(prizeProbability)) {
    Utils.UI.showToast('请填写完整的奖品信息和正确的概率', 'warning');
    return;
  }

  // 验证中奖率总和
  const prizes = getPrizes();
  const currentPrizeIndex = prizes.findIndex(p => p.id == prizeId);
  let totalProbability = prizes.reduce((sum, prize, index) => {
    // 如果是编辑当前奖品，不计算其原有概率
    if (index === currentPrizeIndex) return sum;
    return sum + prize.probability;
  }, 0);

  // 加上新概率
  totalProbability += prizeProbability;

  if (totalProbability > 100) {
    Utils.UI.showToast(`中奖率总和不能超过100%，当前总和为：${totalProbability.toFixed(1)}%`, 'warning');
    return;
  }

  let newImageBase64 = currentImageSrc || null;

  const processSave = (imageBase64 = newImageBase64) => {
    if (prizeId) { // 编辑现有奖品
      const prizeIndex = prizes.findIndex(p => p.id == prizeId);
      if (prizeIndex > -1) {
        prizes[prizeIndex].name = prizeName;
        prizes[prizeIndex].probability = prizeProbability;
        if (imageBase64) {
          prizes[prizeIndex].image = imageBase64;
        } else if (!currentImageSrc) { // 如果是编辑，没有新图，也没有旧图
          Utils.UI.showToast('请上传奖品图片', 'warning');
          return;
        }
        Utils.UI.showToast('奖品更新成功！', 'success');
      } else {
        Utils.UI.showToast('未找到要编辑的奖品', 'error');
        return;
      }
    } else { // 添加新奖品
      if (!imageBase64) {
        Utils.UI.showToast('请上传奖品图片', 'warning');
        return;
      }
      const newPrize = {
        id: Date.now(), // 使用时间戳作为唯一ID
        name: prizeName,
        image: imageBase64,
        probability: prizeProbability
      };
      prizes.push(newPrize);
      Utils.UI.showToast('奖品添加成功！', 'success');
    }

    savePrizes(prizes);
    loadPrizesTable(); // 刷新表格
    closeModal(); // 关闭模态框
  };

  // 处理图片文件上传
  if (prizeImageInput.files && prizeImageInput.files[0]) {
    // 使用已经压缩过的图片数据
    processSave(currentImageSrc);
  } else {
    // 没有选择新图片，直接保存 (可能是编辑时未修改图片)
    if (!prizeId && !currentImageSrc) { // 添加时必须有图片
      Utils.UI.showToast('请上传奖品图片', 'warning');
      return;
    }
    processSave();
  }
}

// 删除奖品
function deletePrize(prizeId) {
  if (confirm('确定要删除该奖品吗？')) {
    let prizes = getPrizes();
    const initialLength = prizes.length;
    prizes = prizes.filter(p => p.id != prizeId); // 注意：data-id是字符串，prize.id可能是数字

    if (prizes.length < initialLength) {
      savePrizes(prizes);
      loadPrizesTable(); // 刷新表格
      Utils.UI.showToast('奖品删除成功！', 'success');
    } else {
      Utils.UI.showToast('未找到要删除的奖品', 'error');
    }
  }
} 