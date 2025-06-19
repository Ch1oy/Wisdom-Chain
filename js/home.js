document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录
  const userInfo = Utils.DataManager.load('userInfo');
  if (!userInfo) {
    Utils.Navigation.goto('index.html');
    return;
  }

  // 获取用户详细信息
  const users = Utils.DataManager.load('users') || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  document.getElementById('userName').textContent = userInfo.username;
  document.getElementById('welcomeUserName').textContent = userDetails.name || userInfo.username;

  // 获取用户头像
  const userAvatar = document.getElementById('userAvatar');
  if (userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 获取用户积分
  const pointsHistory = Utils.DataManager.load('pointsHistory') || {};
  const userPoints = pointsHistory[userInfo.username] || [];
  const totalPoints = userPoints.reduce((sum, record) => sum + record.points, 0);
  document.getElementById('currentPoints').textContent = totalPoints;

  // 加载活动列表
  loadActivities();

  // 处理导航栏事件
  document.getElementById('activitiesLink').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('activities.html');
  });

  document.getElementById('myPointsLink').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('points-history.html');
  });

  // 处理用户菜单事件
  document.getElementById('editProfile').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('edit-profile.html');
  });

  document.getElementById('changePassword').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('change-password.html');
  });

  // 处理退出登录
  document.getElementById('logout').addEventListener('click', async function (e) {
    e.preventDefault();
    const confirmed = await Utils.UI.confirm('确定要退出登录吗？');
    if (confirmed) {
      Utils.DataManager.save('userInfo', null);
      Utils.Navigation.goto('index.html');
    }
  });
});

// 加载活动列表
function loadActivities() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activityList = document.getElementById('activityList');

  // 只显示已审核通过的活动
  const approvedActivities = activities.filter(activity => activity.status === 'approved');

  if (approvedActivities.length === 0) {
    activityList.innerHTML = '<p class="no-data">暂无活动</p>';
    return;
  }

  activityList.innerHTML = approvedActivities.map(activity => `
    <div class="activity-card" data-id="${activity.id}">
      <div class="activity-image">
        <img src="${activity.image}" alt="${activity.title}">
      </div>
      <div class="activity-info">
        <h3>${activity.title}</h3>
        <p>${activity.description}</p>
        <div class="activity-meta">
          <span><i class="ri-calendar-line"></i> ${activity.date}</span>
          <span><i class="ri-time-line"></i> ${activity.time}</span>
          <span><i class="ri-map-pin-line"></i> ${activity.location}</span>
          <span><i class="ri-user-line"></i> ${activity.publisherName}</span>
          <span><i class="ri-coins-line"></i> ${activity.points}积分</span>
        </div>
        <button class="btn-primary join-btn" onclick="joinActivity('${activity.id}')">
          报名参加
        </button>
      </div>
    </div>
  `).join('');
}

// 参加活动
async function joinActivity(activityId) {
  const userInfo = Utils.DataManager.load('userInfo');
  const activities = Utils.DataManager.load('activities') || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    Utils.UI.showToast('活动不存在！', 'error');
    return;
  }

  // 检查是否已经报名
  const userActivities = Utils.DataManager.load('userActivities') || {};
  if (userActivities[userInfo.username] && userActivities[userInfo.username].includes(activityId)) {
    Utils.UI.showToast('您已经报名过这个活动了！', 'warning');
    return;
  }

  // 检查活动人数是否已满
  if (activity.currentParticipants >= activity.capacity) {
    Utils.UI.showToast('活动人数已满！', 'warning');
    return;
  }

  // 确认报名
  const confirmed = await Utils.UI.confirm('确定要报名参加这个活动吗？');
  if (!confirmed) return;

  Utils.UI.showLoading('正在报名...');

  try {
    // 更新活动参与人数
    activity.currentParticipants++;
    Utils.DataManager.save('activities', activities);

    // 记录用户参与的活动
    if (!userActivities[userInfo.username]) {
      userActivities[userInfo.username] = [];
    }
    userActivities[userInfo.username].push(activityId);
    Utils.DataManager.save('userActivities', userActivities);

    // 记录积分历史
    const pointsHistory = Utils.DataManager.load('pointsHistory') || {};
    if (!pointsHistory[userInfo.username]) {
      pointsHistory[userInfo.username] = [];
    }

    pointsHistory[userInfo.username].push({
      activityId: activityId,
      activityName: activity.name,
      points: activity.points,
      date: new Date().toISOString()
    });

    Utils.DataManager.save('pointsHistory', pointsHistory);

    Utils.UI.showToast('报名成功！', 'success');
    loadActivities(); // 刷新活动列表
  } catch (error) {
    Utils.UI.showToast('报名失败，请重试', 'error');
  } finally {
    Utils.UI.hideLoading();
  }
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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