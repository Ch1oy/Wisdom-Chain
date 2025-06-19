document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是管理员
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || userInfo.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // 获取筛选和搜索元素
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.getElementById('searchInput');
  const sortFilter = document.getElementById('sortFilter');
  const activityList = document.getElementById('activityList');
  const reviewModal = document.getElementById('reviewModal');
  const closeBtn = reviewModal.querySelector('.close');
  const cancelBtn = document.getElementById('cancelBtn');

  // 默认选中待审核
  if (statusFilter) {
    statusFilter.value = 'pending';
  }

  // 添加事件监听器
  statusFilter.addEventListener('change', filterActivities);
  searchInput.addEventListener('input', filterActivities);
  sortFilter.addEventListener('change', filterActivities);
  closeBtn.addEventListener('click', () => reviewModal.style.display = 'none');
  cancelBtn.addEventListener('click', () => reviewModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === reviewModal) {
      reviewModal.style.display = 'none';
    }
  });

  // 初始加载活动列表（默认筛选待审核）
  filterActivities();
  updateStatusOptionCounts();
});

// 加载活动列表
function loadActivities() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activityList = document.getElementById('activityList');

  if (activities.length === 0) {
    activityList.innerHTML = '<p class="no-data">暂无活动数据</p>';
    return;
  }

  activityList.innerHTML = activities.map(activity => createActivityCard(activity)).join('');
  updateStatusOptionCounts();
}

// 筛选活动
function filterActivities() {
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.getElementById('searchInput');
  const sortFilter = document.getElementById('sortFilter');
  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  // 筛选活动
  let filteredActivities = activities.filter(activity => {
    // 排除幸运抽奖活动
    if (activity.name === '幸运抽奖') {
      return false;
    }

    // 状态筛选
    const statusMatch = statusFilter.value === 'all' || activity.status === statusFilter.value;

    // 搜索筛选
    const searchTerm = searchInput.value.toLowerCase().trim();
    const searchMatch = searchTerm === '' ||
      (activity.name && activity.name.toLowerCase().includes(searchTerm)) ||
      (activity.publisherName && activity.publisherName.toLowerCase().includes(searchTerm)) ||
      (activity.description && activity.description.toLowerCase().includes(searchTerm)) ||
      (activity.location && activity.location.toLowerCase().includes(searchTerm)) ||
      (activity.publisher && activity.publisher.toLowerCase().includes(searchTerm));

    return statusMatch && searchMatch;
  });

  // 排序活动
  if (sortFilter) {
    switch (sortFilter.value) {
      case 'newest':
        filteredActivities.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
        break;
      case 'oldest':
        filteredActivities.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        break;
      case 'startTime':
        filteredActivities.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        break;
      case 'points':
        filteredActivities.sort((a, b) => (b.points || 0) - (a.points || 0));
        break;
      case 'participants':
        filteredActivities.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));
        break;
      default:
        // 默认按创建时间倒序
        filteredActivities.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    }
  }

  // 显示筛选结果
  const activityList = document.getElementById('activityList');
  if (filteredActivities.length === 0) {
    activityList.innerHTML = `
      <div class="no-data">
        <i class="ri-calendar-event-line"></i>
        <p>未找到匹配的活动</p>
        <p>请尝试调整筛选条件</p>
      </div>
    `;
    return;
  }

  activityList.innerHTML = filteredActivities.map(activity => createActivityCard(activity)).join('');
  updateStatusOptionCounts();
}

// 显示活动详情
function showActivityDetails(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    Utils.UI.showToast('活动不存在！', 'error');
    return;
  }

  const reviewModal = document.getElementById('reviewModal');
  const activityDetails = document.getElementById('activityDetails');

  activityDetails.innerHTML = `
    <div class="activity-profile">
      <img src="${activity.image || 'images/default-activity.jpg'}" alt="活动图片" class="activity-image-large">
      <div class="activity-info-detailed">
        <h3>${activity.name}</h3>
        <p><strong>发布社团：</strong>${activity.publisherName || '未知社团'}</p>
        <p><strong>发布者：</strong>${activity.publisher || '未知'}</p>
        <p><strong>开始时间：</strong>${formatDate(activity.startTime)}</p>
        <p><strong>结束时间：</strong>${formatDate(activity.endTime)}</p>
        <p><strong>活动地点：</strong>${activity.location}</p>
        <p><strong>活动积分：</strong>${activity.points || 0} 分</p>
        <p><strong>活动状态：</strong><span class="activity-status ${activity.status}">${getStatusText(activity.status)}</span></p>
        <p><strong>活动描述：</strong>${activity.description || '暂无描述'}</p>
        ${activity.participants && activity.participants.length > 0 ? `
          <div class="participants-list">
            <h4>报名名单</h4>
            <ul>
              ${activity.participants.map(username => `<li>${username}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  reviewModal.style.display = 'block';
  reviewModal.dataset.activityId = activityId;
}

// 审核活动
async function handleReview(action, activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activityIndex = activities.findIndex(a => a.id === activityId);

  if (activityIndex === -1) {
    Utils.UI.showToast('活动不存在！', 'error');
    return;
  }

  const activity = activities[activityIndex];
  const actionText = action === 'approve' ? '通过' : '拒绝';

  if (confirm(`确定要${actionText}该活动吗？`)) {
    // 更新活动状态和审核时间
    activity.status = action === 'approve' ? 'approved' : 'rejected';
    activity.reviewTime = new Date().toISOString();

    // 如果是批准活动，可能需要生成报名记录（如果之前没有）
    if (action === 'approve' && !activity.participants) {
      activity.participants = []; // 假设批准后才开始收集参与者
    }

    localStorage.setItem('activities', JSON.stringify(activities));
    Utils.UI.showToast(`活动已${actionText}`, 'success');
    document.getElementById('reviewModal').style.display = 'none';

    // 刷新活动列表，保持筛选状态
    filterActivities();
    updateStatusOptionCounts(); // 更新状态数量显示
  }
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

function createActivityCard(activity) {
  const statusText = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };

  const statusClass = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  };

  return `
    <div class="activity-card" onclick="showActivityDetails('${activity.id}')">
      <div class="activity-image">
        <img src="${activity.image || 'images/default-activity.jpg'}" alt="${activity.title}">
      </div>
      <div class="activity-content">
        <h3 class="activity-title">${activity.name}</h3>
        <div class="activity-info">
         <div class="activity-club">
            <i class="fas fa-users"></i>
            <span>社团：${activity.publisherName || '未知社团'}</span>
          </div>
          <div class="activity-creator">
            <i class="fas fa-user"></i>
            <span>发布者：${activity.publisher}</span>
          </div>
          <div class="activity-time">
            <i class="fas fa-clock"></i>
            <span>开始时间：${formatDate(activity.date)}</span>
          </div>
          <div class="activity-location">
            <i class="fas fa-map-marker-alt"></i>
            <span>地点：${activity.location || '未设置'}</span>
          </div>
          <div class="activity-points">
            <i class="fas fa-star"></i>
            <span>活动积分：${activity.points || 0}</span>
          </div>
        </div>
        <div class="activity-status ${statusClass[activity.status]}">
          ${statusText[activity.status]}
        </div>
        <div class="activity-actions">
          ${activity.status === 'pending' ? `
            <button class="btn btn-primary" onclick="event.stopPropagation(); handleReview('approve', '${activity.id}')">
              <i class="fas fa-check"></i> 通过
            </button>
            <button class="btn btn-danger" onclick="event.stopPropagation(); handleReview('reject', '${activity.id}')">
              <i class="fas fa-times"></i> 拒绝
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="event.stopPropagation(); handleReview('${activity.status === 'approved' ? 'reject' : 'approve'}', '${activity.id}')">
              <i class="fas fa-sync-alt"></i> 修改状态
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function updateStatusOptionCounts() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];

  // 排除幸运抽奖活动进行统计
  const activitiesForCount = activities.filter(activity => activity.name !== '幸运抽奖');

  const counts = {
    all: activitiesForCount.length,
    pending: activitiesForCount.filter(a => a.status === 'pending').length,
    approved: activitiesForCount.filter(a => a.status === 'approved').length,
    rejected: activitiesForCount.filter(a => a.status === 'rejected').length
  };
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.options[0].text = `全部 (${counts.all})`;
    statusFilter.options[1].text = `待审核 (${counts.pending})`;
    statusFilter.options[2].text = `已通过 (${counts.approved})`;
    statusFilter.options[3].text = `已拒绝 (${counts.rejected})`;
  }
} 
