document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo) {
    window.location.href = 'index.html';
    return;
  }

  // 加载活动列表
  loadActivities();
});

// 加载活动列表
function loadActivities() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activityList = document.getElementById('activityList');

  // 根据用户角色筛选活动
  let filteredActivities = activities;
  if (userInfo.role === 'student') {
    // 学生用户只能看到已通过审核的活动
    filteredActivities = activities.filter(activity => activity.status === 'approved');
  } else if (userInfo.role === 'club_leader') {
    // 社团负责人可以看到自己创建的所有活动
    filteredActivities = activities.filter(activity => activity.creator === userInfo.username);
  }

  if (filteredActivities.length === 0) {
    activityList.innerHTML = '<p class="no-data">暂无活动</p>';
    return;
  }

  activityList.innerHTML = filteredActivities.map(activity => `
    <div class="activity-card">
      <div class="activity-image">
        <img src="${activity.image || 'images/default-activity.jpg'}" alt="${activity.name}">
      </div>
      <div class="activity-info">
        <h3>${activity.name}</h3>
        <p class="activity-description">${activity.description}</p>
        <div class="activity-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(activity.date)}</span>
          <span><i class="fas fa-map-marker-alt"></i> ${activity.location}</span>
          <span><i class="fas fa-users"></i> ${activity.participants ? activity.participants.length : 0}/${activity.maxParticipants}</span>
        </div>
        <div class="activity-status">
          <span class="status-badge ${getStatusClass(activity.status)}">${getStatusText(activity.status)}</span>
        </div>
        <div class="activity-actions">
          ${getActivityActions(activity, userInfo)}
        </div>
      </div>
    </div>
  `).join('');
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

// 获取状态样式类
function getStatusClass(status) {
  const classes = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  };
  return classes[status] || '';
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return texts[status] || status;
}

// 获取活动操作按钮
function getActivityActions(activity, userInfo) {
  let actions = '';

  if (userInfo.role === 'student') {
    // 学生用户的操作
    if (activity.status === 'approved') {
      if (activity.participants && activity.participants.includes(userInfo.username)) {
        actions = `
          <button class="btn btn-secondary" onclick="cancelRegistration('${activity.id}')">取消报名</button>
        `;
      } else if (activity.participants.length < activity.maxParticipants) {
        actions = `
          <button class="btn btn-primary" onclick="registerActivity('${activity.id}')">报名参加</button>
        `;
      } else {
        actions = '<span class="text-danger">名额已满</span>';
      }
    }
  } else if (userInfo.role === 'club_leader' && activity.creator === userInfo.username) {
    // 社团负责人的操作
    if (activity.status === 'pending') {
      actions = `
        <button class="btn btn-primary" onclick="editActivity('${activity.id}')">编辑</button>
        <button class="btn btn-danger" onclick="cancelActivity('${activity.id}')">取消</button>
      `;
    } else if (activity.status === 'approved') {
      actions = `
        <button class="btn btn-primary" onclick="manageParticipants('${activity.id}')">管理报名</button>
        <button class="btn btn-secondary" onclick="completeActivity('${activity.id}')">完成活动</button>
      `;
    }
  }

  return actions;
}

// 报名参加活动
function registerActivity(activityId) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    alert('活动不存在！');
    return;
  }

  if (activity.participants && activity.participants.includes(userInfo.username)) {
    alert('您已经报名参加该活动！');
    return;
  }

  if (activity.participants.length >= activity.maxParticipants) {
    alert('活动名额已满！');
    return;
  }

  if (!activity.participants) {
    activity.participants = [];
  }

  activity.participants.push(userInfo.username);
  localStorage.setItem('activities', JSON.stringify(activities));
  alert('报名成功！');
  loadActivities();
}

// 取消报名
function cancelRegistration(activityId) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    alert('活动不存在！');
    return;
  }

  if (!activity.participants || !activity.participants.includes(userInfo.username)) {
    alert('您未报名参加该活动！');
    return;
  }

  activity.participants = activity.participants.filter(p => p !== userInfo.username);
  localStorage.setItem('activities', JSON.stringify(activities));
  alert('已取消报名！');
  loadActivities();
}

// 编辑活动
function editActivity(activityId) {
  window.location.href = `edit-activity.html?id=${activityId}`;
}

// 取消活动
function cancelActivity(activityId) {
  if (!confirm('确定要取消该活动吗？')) {
    return;
  }

  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    alert('活动不存在！');
    return;
  }

  activity.status = 'cancelled';
  localStorage.setItem('activities', JSON.stringify(activities));
  alert('活动已取消！');
  loadActivities();
}

// 管理报名
function manageParticipants(activityId) {
  window.location.href = `manage-participants.html?id=${activityId}`;
}

// 完成活动
function completeActivity(activityId) {
  if (!confirm('确定要完成该活动吗？')) {
    return;
  }

  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    alert('活动不存在！');
    return;
  }

  activity.status = 'completed';
  localStorage.setItem('activities', JSON.stringify(activities));
  alert('活动已完成！');
  loadActivities();
} 