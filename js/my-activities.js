// 分页和懒加载相关变量
let displayedActivitiesCount = 0;
const activitiesToLoad = 3;
let allMyActivities = []; // 存储当前用户发布的所有活动

document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是社团负责人
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || userInfo.role !== 'club_leader') {
    window.location.href = 'index.html';
    return;
  }

  // 获取用户详细信息
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  document.getElementById('userName').textContent = userInfo.username;
  const userAvatar = document.getElementById('userAvatar');
  if (userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 处理用户菜单事件
  document.getElementById('editProfile').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'edit-profile.html';
  });

  document.getElementById('changePassword').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'change-password.html';
  });

  document.getElementById('logout').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.removeItem('userInfo');
    window.location.href = 'index.html';
  });

  // 添加筛选和排序事件监听器
  document.getElementById('statusFilter').addEventListener('change', filterAndSortActivities);
  document.getElementById('sortFilter').addEventListener('change', filterAndSortActivities);

  // 加载更多按钮事件监听器
  document.getElementById('loadMoreBtn').addEventListener('click', loadMoreActivities);

  // 初始加载我的发布活动
  loadMyPublishedActivities();
});

// 加载我的发布活动
function loadMyPublishedActivities() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  // 只显示当前登录用户作为社团负责人发布的活动
  allMyActivities = activities.filter(activity => activity.publisher === userInfo.username);

  if (allMyActivities.length === 0) {
    const container = document.getElementById('myPublishedActivities');
    container.innerHTML = `
      <div class="no-data">
        <i class="ri-calendar-event-line"></i>
        <p>暂无发布的活动</p>
        <p>点击"发布新活动"按钮创建您的第一个活动</p>
      </div>
    `;
    document.getElementById('loadMoreBtn').style.display = 'none'; // 隐藏加载更多按钮
    return;
  }

  // 默认按最新发布排序
  allMyActivities.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

  // 重置显示数量并加载第一批活动
  displayedActivitiesCount = 0;
  document.getElementById('myPublishedActivities').innerHTML = ''; // 清空列表
  loadMoreActivities(); // 加载第一批活动

  updateStatusOptionCounts();
}

// 加载更多活动
function loadMoreActivities() {
  const container = document.getElementById('myPublishedActivities');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  const activitiesToDisplay = allMyActivities.slice(displayedActivitiesCount, displayedActivitiesCount + activitiesToLoad);

  if (activitiesToDisplay.length > 0) {
    container.innerHTML += activitiesToDisplay.map(activity => createActivityCard(activity)).join('');
    displayedActivitiesCount += activitiesToDisplay.length;
  }

  // 检查是否还有更多活动
  if (displayedActivitiesCount >= allMyActivities.length) {
    loadMoreBtn.style.display = 'none'; // 没有更多活动，隐藏按钮
  } else {
    loadMoreBtn.style.display = 'block'; // 还有更多活动，显示按钮
  }

  // 添加菜单点击事件 (需要重新绑定，因为DOM内容更新了)
  document.querySelectorAll('.menu-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = trigger.nextElementSibling;
      document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show')); // 关闭其他菜单
      dropdown.classList.toggle('show');
    });
  });

  // 点击其他地方关闭菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.activity-card')) { // 如果点击区域不在卡片内
      document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });
}

// 筛选和排序活动
function filterAndSortActivities() {
  const statusFilter = document.getElementById('statusFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  // 筛选当前用户发布的活动
  let tempFilteredActivities = activities.filter(activity => activity.publisher === userInfo.username);

  // 根据状态筛选
  if (statusFilter !== 'all') {
    tempFilteredActivities = tempFilteredActivities.filter(activity => activity.status === statusFilter);
  }

  // 根据排序方式排序
  switch (sortFilter) {
    case 'newest':
      tempFilteredActivities.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      break;
    case 'oldest':
      tempFilteredActivities.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
      break;
    case 'points':
      tempFilteredActivities.sort((a, b) => (b.points || 0) - (a.points || 0));
      break;
    case 'participants':
      tempFilteredActivities.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));
      break;
  }

  allMyActivities = tempFilteredActivities; // 更新全局的活动列表

  // 重置显示数量并加载第一批活动
  displayedActivitiesCount = 0;
  document.getElementById('myPublishedActivities').innerHTML = ''; // 清空列表
  loadMoreActivities(); // 加载第一批活动

  updateStatusOptionCounts();
}

// 创建活动卡片
function createActivityCard(activity) {
  return `
    <div class="activity-card">
      <div class="activity-menu">
        <button class="menu-trigger">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div class="menu-dropdown">
          <button class="menu-item edit-btn" onclick="editActivity('${activity.id}')">
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button class="menu-item delete-btn" onclick="deleteActivity('${activity.id}')">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
      </div>
      <div class="activity-content">
        <img src="${activity.image || 'images/default-activity.jpg'}" alt="${activity.name}" class="activity-image">
        <div class="activity-info">
          <h3>${activity.name}</h3>
          <div class="activity-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${activity.location}</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(activity.date)}</span>
            <span><i class="fas fa-clock"></i> 报名截止：${formatDate(activity.registrationDeadline)}</span>
            <span><i class="fas fa-users"></i> ${activity.currentParticipants}/${activity.capacity}</span>
            <span><i class="fas fa-star"></i> ${activity.points}积分</span>
          </div>
          <p class="activity-description">${activity.description}</p>
          <div class="activity-status ${getStatusClass(activity.status)}">
            状态：${getStatusText(activity.status)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || status;
}

// 获取状态类
function getStatusClass(status) {
  const statusClass = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  };
  return statusClass[status] || 'status-unknown';
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 编辑活动
function editActivity(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    showToast('未找到活动信息', 'error');
    return;
  }

  // 创建编辑弹框
  const modalHtml = `
    <div class="modal" id="editActivityModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-edit"></i> 编辑活动</h2>
          <button class="close-btn" onclick="closeEditModal()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editActivityForm">
            <div class="form-row">
              <div class="form-group">
                <label for="editActivityName"><i class="fas fa-heading">区别：活动名称</label>
                <input type="text" id="editActivityName" value="${activity.name}" required>
              </div>
              <div class="form-group">
                <label for="editActivityLocation"><i class="fas fa-map-marker-alt"></i> 活动地点</label>
                <input type="text" id="editActivityLocation" value="${activity.location}" required>
              </div>
            </div>
            <div class="form-group">
              <label for="editActivityDescription"><i class="fas fa-align-left"></i> 活动描述</label>
              <textarea id="editActivityDescription" required>${activity.description}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="editActivityDate"><i class="fas fa-calendar"></i> 活动日期</label>
                <input type="date" id="editActivityDate" value="${activity.date}" required>
              </div>
              <div class="form-group">
                <label for="editActivityTime"><i class="fas fa-clock"></i> 活动时间</label>
                <input type="time" id="editActivityTime" value="${activity.time}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="editActivityCapacity"><i class="fas fa-users"></i> 报名人数上限</label>
                <input type="number" id="editActivityCapacity" value="${activity.capacity}" min="1" required>
              </div>
              <div class="form-group">
                <label for="editActivityPoints"><i class="fas fa-star"></i> 活动积分</label>
                <input type="number" id="editActivityPoints" value="${activity.points}" min="0" required>
              </div>
            </div>
            <div class="form-group">
              <label for="editRegistrationDeadline"><i class="fas fa-calendar-times"></i> 报名截止日期和时间</label>
              <input type="datetime-local" id="editRegistrationDeadline" value="${activity.registrationDeadline}" required>
            </div>
            <div class="form-group">
                <label for="editActivityImage">活动图片</label>
                <input type="file" id="editActivityImage" accept="image/*">
                ${activity.image ? `<img src="${activity.image}" alt="当前图片" style="max-width: 100px; margin-top: 10px;">` : ''}
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeEditModal()">取消</button>
              <button type="button" class="btn btn-primary" onclick="saveActivityChanges('${activity.id}')">保存修改</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeEditModal() {
  const modal = document.getElementById('editActivityModal');
  if (modal) {
    modal.remove();
  }
}

async function saveActivityChanges(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activityIndex = activities.findIndex(a => a.id === activityId);

  if (activityIndex === -1) {
    showToast('未找到活动信息', 'error');
    closeEditModal();
    return;
  }

  const activity = activities[activityIndex];

  // 获取表单数据
  const editedActivityName = document.getElementById('editActivityName').value;
  const editedActivityLocation = document.getElementById('editActivityLocation').value;
  const editedActivityDescription = document.getElementById('editActivityDescription').value;
  const editedActivityDate = document.getElementById('editActivityDate').value;
  const editedActivityTime = document.getElementById('editActivityTime').value;
  const editedActivityCapacity = document.getElementById('editActivityCapacity').value;
  const editedActivityPoints = document.getElementById('editActivityPoints').value;
  const editedRegistrationDeadline = document.getElementById('editRegistrationDeadline').value;
  const editedActivityImageInput = document.getElementById('editActivityImage');

  // 更新活动对象
  activity.name = editedActivityName;
  activity.title = editedActivityName; // 假设 title 和 name 相同
  activity.location = editedActivityLocation;
  activity.description = editedActivityDescription;
  activity.date = editedActivityDate; // 活动日期
  activity.time = editedActivityTime; // 活动时间
  activity.startTime = `${editedActivityDate}T${editedActivityTime}:00`; // 合并日期和时间
  activity.endTime = activity.startTime; // 假设开始和结束时间相同，或需要另外字段
  activity.capacity = parseInt(editedActivityCapacity);
  activity.points = parseInt(editedActivityPoints);
  activity.registrationDeadline = editedRegistrationDeadline; // 报名截止日期和时间

  // 处理图片上传
  if (editedActivityImageInput.files && editedActivityImageInput.files[0]) {
    const file = editedActivityImageInput.files[0];
    // 简单的Base64编码示例，实际应用中可能需要更复杂的图片处理和上传到服务器
    const reader = new FileReader();
    reader.onload = function (e) {
      activity.image = e.target.result; // 将图片数据存储到活动对象
      // 保存到 localStorage
      localStorage.setItem('activities', JSON.stringify(activities));
      showToast('活动修改成功！', 'success');
      closeEditModal();
      // 刷新列表以显示更新
      loadMyPublishedActivities();
    };
    reader.readAsDataURL(file);
  } else {
    // 没有选择新图片，直接保存其他修改
    localStorage.setItem('activities', JSON.stringify(activities));
    showToast('活动修改成功！', 'success');
    closeEditModal();
    // 刷新列表以显示更新
    loadMyPublishedActivities();
  }
}

// 删除活动
function deleteActivity(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    showToast('未找到活动信息！', 'error');
    return;
  }

  // 检查是否有参与者
  if (activity.participants && activity.participants.length > 0) {
    showToast('该活动已有参与者，无法删除！', 'error');
    return;
  }

  if (confirm('确定要删除该活动吗？')) {
    let activities = JSON.parse(localStorage.getItem('activities')) || [];
    const initialLength = activities.length;
    activities = activities.filter(activity => activity.id !== activityId);

    if (activities.length < initialLength) {
      localStorage.setItem('activities', JSON.stringify(activities));
      showToast('活动删除成功！', 'success');
      // 刷新列表以显示更新
      loadMyPublishedActivities();
    } else {
      showToast('未找到活动信息或删除失败！', 'error');
    }
  }
}

// 显示Toast提示
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'toast show toast-' + type;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000); // 3秒后隐藏Toast
  }
}

// 更新状态选项数量显示
function updateStatusOptionCounts() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  // 筛选当前用户发布的活动
  const myActivities = activities.filter(activity => activity.publisher === userInfo.username);

  const counts = {
    all: myActivities.length,
    pending: myActivities.filter(a => a.status === 'pending').length,
    approved: myActivities.filter(a => a.status === 'approved').length,
    rejected: myActivities.filter(a => a.status === 'rejected').length
  };

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.options[0].text = `全部 (${counts.all})`;
    statusFilter.options[1].text = `待审核 (${counts.pending})`;
    statusFilter.options[2].text = `已通过 (${counts.approved})`;
    statusFilter.options[3].text = `已拒绝 (${counts.rejected})`;
  }
} 