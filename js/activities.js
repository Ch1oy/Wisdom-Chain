document.addEventListener('DOMContentLoaded', function () {
  // 检查登录状态
  const userInfo = Utils.DataManager.load('userInfo');
  if (!userInfo) {
    Utils.Navigation.goto('index.html');
    return;
  }

  // 初始化页面
  initPage();
  loadActivities();
});

// 初始化页面
function initPage() {
  // 获取用户信息
  const userInfo = Utils.DataManager.load('userInfo');
  const users = Utils.DataManager.load('users') || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = userInfo.name || userInfo.username;
  }

  const userAvatarElement = document.getElementById('userAvatar');
  if (userAvatarElement && userDetails.avatar) {
    userAvatarElement.src = userDetails.avatar;
  }

  // 绑定导航事件
  const editProfileBtn = document.getElementById('editProfile');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('edit-profile.html');
    });
  }

  const changePasswordBtn = document.getElementById('changePassword');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('change-password.html');
    });
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      const confirmed = await Utils.UI.confirm('确定要退出登录吗？');
      if (confirmed) {
        Utils.DataManager.save('userInfo', null);
        Utils.Navigation.goto('index.html');
      }
    });
  }

  // 初始化筛选按钮事件
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', function () {
      // 移除所有按钮的active类
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // 为当前点击的按钮添加active类
      this.classList.add('active');
      // 执行筛选
      filterActivities();
    });
  });

  // 默认选中"进行中"的筛选按钮
  // 先移除所有按钮的active类，再只给"进行中"加active
  filterButtons.forEach(btn => btn.classList.remove('active'));
  const ongoingButton = document.querySelector('.filter-btn[data-status="ongoing"]');
  if (ongoingButton) {
    ongoingButton.classList.add('active');
  }

  // 初始化搜索框事件
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', filterActivities);

  // 搜索框清空按钮逻辑
  const clearBtn = document.getElementById('clearSearchBtn');
  if (searchInput && clearBtn) {
    searchInput.addEventListener('input', function () {
      clearBtn.style.display = this.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', function () {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      filterActivities();
    });
  }

  // 绑定筛选和搜索事件
  const statusFilter = document.getElementById('statusFilter');
  const sortSelect = document.getElementById('sortSelect');

  if (statusFilter) {
    statusFilter.addEventListener('change', filterActivities);
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', filterActivities);
  }

  updateActivityCounts();

  // 加载更多按钮懒加载
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      renderActivitiesPage(false);
    });
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 懒加载相关全局变量
let activitiesData = [];
let activitiesLoadedCount = 0;
const ACTIVITIES_PAGE_SIZE = 3;

// 筛选和搜索活动
function filterActivities() {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const statusFilter = document.querySelector('.filter-btn.active').dataset.status;
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const now = new Date();
  activitiesData = activities.filter(activity => {
    if (activity.status !== 'approved') return false;
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm) ||
      (activity.description && activity.description.toLowerCase().includes(searchTerm));
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'ongoing') {
        matchesStatus = now < new Date(activity.registrationDeadline);
      } else if (statusFilter === 'ended') {
        matchesStatus = now >= new Date(activity.registrationDeadline);
      }
    }
    return matchesSearch && matchesStatus;
  });
  activitiesLoadedCount = 0;
  renderActivitiesPage(true);
  updateActivityCounts();
}

// 获取状态样式类
function getStatusClass(status) {
  const classes = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  };
  return classes[status] || '';
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return texts[status] || status;
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

// 报名参加活动
async function joinActivity(activityId) {
  try {
    const userInfo = Utils.DataManager.load('userInfo');
    const users = Utils.DataManager.load('users') || {};
    const userDetails = users[userInfo.username] || {};
    const activities = Utils.DataManager.load('activities') || [];
    const activity = activities.find(a => a.id === activityId);

    if (!activity) {
      Utils.UI.showToast('活动不存在', 'error');
      return;
    }

    // 检查是否已经报名
    if (activity.participants && activity.participants.some(p => p.username === userInfo.username)) {
      Utils.UI.showToast('您已经报名过该活动', 'warning');
      return;
    }

    // 检查人数是否已满
    if (activity.currentParticipants >= activity.capacity) {
      Utils.UI.showToast('活动人数已满', 'warning');
      return;
    }

    // 检查是否已过报名截止时间
    const now = new Date();
    const deadline = new Date(activity.registrationDeadline);
    if (now > deadline) {
      Utils.UI.showToast('报名已截止', 'warning');
      return;
    }

    // 添加报名信息
    const participant = {
      username: userInfo.username,
      name: userDetails.name || userInfo.username,
      studentId: userDetails.studentId || '未填写',
      registerTime: new Date().toISOString()
    };

    if (!activity.participants) {
      activity.participants = [];
    }
    activity.participants.push(participant);
    activity.currentParticipants++;

    // 保存更新后的活动信息
    Utils.DataManager.save('activities', activities);

    Utils.UI.showToast('报名成功', 'success');
    loadActivities(); // 重新加载活动列表
  } catch (error) {
    console.error('报名失败:', error);
    Utils.UI.showToast('报名失败，请稍后重试', 'error');
  }
}

// 取消报名
async function cancelRegistration(activityId) {
  try {
    const userInfo = Utils.DataManager.load('userInfo');
    const activities = Utils.DataManager.load('activities') || [];
    const activity = activities.find(a => a.id === activityId);

    if (!activity) {
      Utils.UI.showToast('活动不存在', 'error');
      return;
    }

    // 检查是否已报名
    const participantIndex = activity.participants.findIndex(p => p.username === userInfo.username);
    if (participantIndex === -1) {
      Utils.UI.showToast('您未报名该活动', 'warning');
      return;
    }

    // 检查是否已过报名截止时间
    const now = new Date();
    const deadline = new Date(activity.registrationDeadline);
    if (now > deadline) {
      Utils.UI.showToast('报名已截止，无法取消报名', 'warning');
      return;
    }

    // 移除报名信息
    activity.participants.splice(participantIndex, 1);
    activity.currentParticipants--;

    // 保存更新后的活动信息
    Utils.DataManager.save('activities', activities);

    Utils.UI.showToast('已取消报名', 'success');
    loadActivities(); // 重新加载活动列表
  } catch (error) {
    console.error('取消报名失败:', error);
    Utils.UI.showToast('取消报名失败，请稍后重试', 'error');
  }
}

// 创建活动卡片
function createActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'activity-card';

  const userInfo = Utils.DataManager.load('userInfo');
  const isParticipant = activity.participants && activity.participants.some(p => p.username === userInfo.username);
  const now = new Date();
  const deadline = new Date(activity.registrationDeadline);
  const isRegistrationClosed = now > deadline;

  // 计算倒计时
  let countdownHtml = '';
  if (!isRegistrationClosed && activity.status === 'approved' && activity.currentParticipants < activity.capacity) {
    const timeLeft = deadline - now;
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      countdownHtml = `
        <div class="countdown-timer">
          <div class="countdown-label">
            <i class="ri-time-line"></i>
            报名截止倒计时
          </div>
          <div class="countdown-value">
            <div class="countdown-item">
              <span>${days}</span>
              <span>天</span>
            </div>
            <div class="countdown-item">
              <span>${hours}</span>
              <span>时</span>
            </div>
            <div class="countdown-item">
              <span>${minutes}</span>
              <span>分</span>
            </div>
            <div class="countdown-item">
              <span>${seconds}</span>
              <span>秒</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  card.innerHTML = `
    <div class="activity-image">
      <img src="${activity.image || 'images/default-activity.jpg'}" alt="${activity.name}">
    </div>
    <div class="activity-info">
      <h3>${activity.name}</h3>
      <div class="activity-meta">
        <span><i class="fas fa-user"></i> ${activity.publisherName}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${activity.location}</span>
        <span><i class="fas fa-calendar"></i> ${formatDate(activity.date)}</span>
        <span><i class="fas fa-clock"></i> 报名截止：${formatDate(activity.registrationDeadline)}</span>
        <span><i class="fas fa-users"></i> ${activity.currentParticipants}/${activity.capacity}</span>
        <span><i class="fas fa-star"></i> ${activity.points}积分</span>
      </div>
      ${countdownHtml}
      <p class="activity-description">${activity.description}</p>
      <div class="activity-actions">
        ${isParticipant ?
      (isRegistrationClosed ?
        `<button class="btn btn-secondary" disabled>
              <i class="fas fa-check"></i> 已报名
            </button>` :
        `<button class="btn btn-danger" onclick="cancelRegistration('${activity.id}')">
              <i class="fas fa-times"></i> 取消报名
            </button>`
      ) :
      `<button class="btn btn-primary" onclick="joinActivity('${activity.id}')" 
            ${activity.currentParticipants >= activity.capacity || isRegistrationClosed ? 'disabled' : ''}>
            <i class="fas fa-check"></i> ${isRegistrationClosed ? '报名已截止' : '立即报名'}
          </button>`
    }
      </div>
    </div>
  `;

  // 如果倒计时存在，启动倒计时更新
  if (countdownHtml) {
    const countdownElement = card.querySelector('.countdown-value');
    const updateCountdown = () => {
      const now = new Date();
      const deadline = new Date(activity.registrationDeadline);
      const timeLeft = deadline - now;
      if (timeLeft <= 0) {
        countdownElement.innerHTML = '<div class="countdown-item">报名已截止</div>';
        countdownElement.classList.remove('countdown-danger');
        return;
      }
      if (timeLeft < 3600000) {
        countdownElement.classList.add('countdown-danger');
      } else {
        countdownElement.classList.remove('countdown-danger');
      }
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      countdownElement.innerHTML = `
        <div class="countdown-item">
          <span>${days}</span>
          <span>天</span>
        </div>
        <div class="countdown-item">
          <span>${hours}</span>
          <span>时</span>
        </div>
        <div class="countdown-item">
          <span>${minutes}</span>
          <span>分</span>
        </div>
        <div class="countdown-item">
          <span>${seconds}</span>
          <span>秒</span>
        </div>
      `;
    };
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    // 当卡片被移除时清除定时器
    card.addEventListener('remove', () => clearInterval(countdownInterval));
  }

  return card;
}

// 加载活动列表
function loadActivities() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const now = new Date();
  // 默认只显示进行中的活动
  activitiesData = activities.filter(activity => {
    if (activity.status !== 'approved') return false;
    return now < new Date(activity.registrationDeadline);
  });
  activitiesLoadedCount = 0;
  renderActivitiesPage(true);
  updateActivityCounts();
}

// 新增懒加载渲染函数
function renderActivitiesPage(isFirstLoad = false) {
  const activitiesGrid = document.getElementById('activitiesGrid');
  if (!activitiesGrid) return;
  if (isFirstLoad) activitiesGrid.innerHTML = '';
  const nextCount = activitiesLoadedCount + ACTIVITIES_PAGE_SIZE;
  const activitiesToShow = activitiesData.slice(activitiesLoadedCount, nextCount);
  activitiesToShow.forEach(activity => {
    const card = createActivityCard(activity);
    activitiesGrid.appendChild(card);
  });
  activitiesLoadedCount = nextCount;
  // 控制"加载更多"按钮显示/隐藏
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    if (activitiesLoadedCount >= activitiesData.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'block';
    }
  }
}

// 修改displayActivities为兼容旧代码但不再直接用
function displayActivities(activities) {
  // 兼容旧代码，实际渲染已由renderActivitiesPage实现
  // 保留函数体防止报错
}

// 更新活动状态按钮上的数量
function updateActivityCounts() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const now = new Date();
  let allCount = 0, ongoingCount = 0, endedCount = 0;
  activities.forEach(activity => {
    if (activity.status === 'approved') {
      allCount++;
      if (now < new Date(activity.registrationDeadline)) {
        ongoingCount++;
      } else {
        endedCount++;
      }
    }
  });
  const allBtn = document.querySelector('.filter-btn[data-status="all"]');
  const ongoingBtn = document.querySelector('.filter-btn[data-status="ongoing"]');
  const endedBtn = document.querySelector('.filter-btn[data-status="ended"]');
  if (allBtn) allBtn.innerHTML = `全部 (${allCount})`;
  if (ongoingBtn) ongoingBtn.innerHTML = `进行中 (${ongoingCount})`;
  if (endedBtn) endedBtn.innerHTML = `已结束 (${endedCount})`;
} 