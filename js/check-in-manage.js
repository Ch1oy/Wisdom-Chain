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
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = userInfo.username;
  }

  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar && userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 加载活动列表
  loadActivities();

  // 处理导航栏事件
  const homeLink = document.getElementById('homeLink');
  if (homeLink) {
    homeLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'club-activity-manage.html';
    });
  }

  const activitiesLink = document.getElementById('activitiesLink');
  if (activitiesLink) {
    activitiesLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'activities.html';
    });
  }

  // 处理筛选按钮点击事件
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        loadActivities(this.dataset.status);
      });
    });
  }

  // 处理模态框关闭按钮
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', function () {
      const checkInModal = document.getElementById('checkInModal');
      if (checkInModal) {
        checkInModal.style.display = 'none';
      }
    });
  }

  // 处理保存签到按钮
  const saveCheckInBtn = document.getElementById('saveCheckIn');
  if (saveCheckInBtn) {
    saveCheckInBtn.addEventListener('click', saveCheckIn);
  }
});

// 加载活动列表
function loadActivities(status = 'all') {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const now = new Date();

  // 筛选当前用户发布且已通过审核的活动
  let filteredActivities = activities.filter(activity =>
    activity.publisher === userInfo.username &&
    activity.status === 'approved'
  );

  // 根据状态筛选
  if (status !== 'all') {
    filteredActivities = filteredActivities.filter(activity => {
      const endTime = new Date(activity.endTime);
      if (status === 'ongoing') {
        return endTime > now;
      } else if (status === 'ended') {
        return endTime <= now;
      }
      return true;
    });
  }

  // 显示活动列表
  const activitiesGrid = document.getElementById('activitiesGrid');
  activitiesGrid.innerHTML = filteredActivities.map(activity => {
    // 获取活动结束时间
    let endTime = new Date(activity.endTime);
    // 如果结束时间无效，使用当前时间
    if (isNaN(endTime.getTime())) {
      endTime = new Date();
    }

    return `
      <div class="activity-card card animate-fade-in">
        <div class="activity-header">
          <h3>${activity.name}</h3>
          <span class="activity-status ${activity.endTime && new Date(activity.endTime) <= new Date() ? 'ended' : 'ongoing'}">
            ${activity.endTime && new Date(activity.endTime) <= new Date() ? '已结束' : '进行中'}
          </span>
        </div>
        <div class="activity-info">
          <p><i class="ri-time-line"></i> ${formatDate(activity.date)} - ${formatDate(activity.endTime)}</p>
          <p><i class="ri-map-pin-line"></i> ${activity.location}</p>
          <p><i class="ri-user-line"></i> 报名人数: ${activity.participants ? activity.participants.length : 0}</p>
          <div class="end-time-input">
            <input type="datetime-local" class="end-time-picker" data-activity-id="${activity.id}" 
                   value="${endTime.toISOString().slice(0, 16)}">
            <button class="btn btn-secondary update-end-time" data-activity-id="${activity.id}">
              <i class="ri-time-line"></i>
              设置完成时间
            </button>
          </div>
        </div>
        <div class="activity-actions">
          <button class="btn btn-primary check-in-btn" data-activity-id="${activity.id}">
            <i class="ri-checkbox-circle-line"></i>
            签到管理
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 添加签到按钮事件监听
  const checkInButtons = document.querySelectorAll('.check-in-btn');
  checkInButtons.forEach(button => {
    button.addEventListener('click', function () {
      const activityId = this.dataset.activityId;
      showCheckInModal(activityId);
    });
  });

  // 添加更新结束时间按钮事件监听
  document.querySelectorAll('.update-end-time').forEach(button => {
    button.addEventListener('click', function () {
      const activityId = this.dataset.activityId;
      const endTimeInput = document.querySelector(`.end-time-picker[data-activity-id="${activityId}"]`);
      const newEndTime = endTimeInput.value;

      if (!newEndTime) {
        Utils.UI.showToast('请选择完成时间', 'error');
        return;
      }

      updateActivityEndTime(activityId, newEndTime);
    });
  });
}

// 显示签到模态框
function showCheckInModal(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    Utils.UI.showToast('活动不存在', 'error');
    return;
  }

  // 检查活动是否已结束
  if (!activity.endTime || new Date(activity.endTime) > new Date()) {
    Utils.UI.showToast('活动尚未结束，无法进行签到', 'warning');
    return;
  }

  const modal = document.getElementById('checkInModal');
  if (!modal) {
    Utils.UI.showToast('无法找到签到模态框', 'error');
    return;
  }

  // 设置模态框显示样式
  modal.style.display = 'flex';
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.zIndex = '1000';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';

  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.width = '90%';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflowY = 'auto';
  }

  const modalActivityName = document.getElementById('modalActivityName');
  if (modalActivityName) {
    modalActivityName.textContent = activity.name;
  }

  // 获取所有用户信息
  const users = JSON.parse(localStorage.getItem('users')) || {};

  // 显示签到列表
  const checkInList = document.getElementById('checkInList');
  if (checkInList) {
    // 确保activity.participants是数组
    const participants = Array.isArray(activity.participants) ? activity.participants : [];

    if (participants.length === 0) {
      checkInList.innerHTML = '<div class="no-data">暂无报名用户</div>';
      return;
    }

    checkInList.innerHTML = participants.map(participant => {
      // 从participant对象中获取用户名
      const username = participant.username;
      // 从users中获取用户详细信息
      const user = users[username];

      if (!user) {
        return `
          <div class="check-in-item">
            <div class="check-in-info">
              <img src="images/default-avatar.png" alt="用户头像" class="avatar">
              <div>
                <h4>${username}</h4>
                <p>${participant.name || '未设置姓名'}</p>
                <p class="points-info">可获得积分：${activity.points || 0}</p>
              </div>
            </div>
            <div class="check-in-status">
              <label class="checkbox-container">
                <input type="checkbox" ${activity.checkedIn && activity.checkedIn.includes(username) ? 'checked' : ''} data-username="${username}">
                <span class="checkmark"></span>
              </label>
              <span class="status-text ${activity.checkedIn && activity.checkedIn.includes(username) ? 'checked-in' : ''}">
                ${activity.checkedIn && activity.checkedIn.includes(username) ? '已签到' : '未签到'}
              </span>
            </div>
          </div>
        `;
      }

      return `
        <div class="check-in-item">
          <div class="check-in-info">
            <img src="${user.avatar || 'images/default-avatar.png'}" alt="用户头像" class="avatar">
            <div>
              <h4>${username}</h4>
              <p>${participant.name || user.name || '未设置姓名'}</p>
              <p class="points-info">可获得积分：${activity.points || 0}</p>
            </div>
          </div>
          <div class="check-in-status">
            <label class="checkbox-container">
              <input type="checkbox" ${activity.checkedIn && activity.checkedIn.includes(username) ? 'checked' : ''} data-username="${username}">
              <span class="checkmark"></span>
            </label>
            <span class="status-text ${activity.checkedIn && activity.checkedIn.includes(username) ? 'checked-in' : ''}">
              ${activity.checkedIn && activity.checkedIn.includes(username) ? '已签到' : '未签到'}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 保存签到信息
function saveCheckIn() {
  // 修改20250701用户的总积分为30
  const users = JSON.parse(localStorage.getItem('users')) || {};
  if (users['20250701']) {
    users['20250701'].totalPoints = 30;
    localStorage.setItem('users', JSON.stringify(users));
  }

  const modal = document.getElementById('checkInModal');
  const activityName = document.getElementById('modalActivityName').textContent;
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.name === activityName);
  if (!activity) return;

  // 获取选中的用户
  const checkedUsers = Array.from(document.querySelectorAll('.check-in-item input[type="checkbox"]:checked'))
    .map(checkbox => checkbox.dataset.username);

  // 更新活动签到信息
  activity.checkedIn = checkedUsers;

  // 获取积分历史记录
  const pointsHistory = JSON.parse(localStorage.getItem('pointsHistory')) || {};
  const now = new Date();

  // 为每个签到的用户发放积分
  checkedUsers.forEach(username => {
    // 初始化用户的积分历史记录
    if (!pointsHistory[username]) {
      pointsHistory[username] = [];
    }

    // 检查是否已经发放过积分
    const hasPoints = pointsHistory[username].some(record =>
      record.activityId === activity.id
    );

    if (!hasPoints) {
      // 添加积分记录
      pointsHistory[username].push({
        activityId: activity.id,
        activityName: activity.name,
        points: activity.points || 0,
        date: now.toISOString(),
        type: 'earned',
        status: 'completed',
        checkInStatus: 'checked'
      });
    } else {
      // 更新已存在的积分记录的签到状态
      const record = pointsHistory[username].find(record => record.activityId === activity.id);
      if (record) {
        // 如果之前是未签到状态，现在更新积分
        if (record.checkInStatus === 'unchecked') {
          record.checkInStatus = 'checked';
          record.points = activity.points || 0;
        }
      }
    }
  });

  // 处理未签到的用户
  const allParticipants = activity.participants.map(p => p.username);
  allParticipants.forEach(username => {
    if (!checkedUsers.includes(username)) {
      // 初始化用户的积分历史记录
      if (!pointsHistory[username]) {
        pointsHistory[username] = [];
      }

      // 检查是否有该活动的记录
      const record = pointsHistory[username].find(record => record.activityId === activity.id);
      if (record) {
        // 更新签到状态和积分
        record.checkInStatus = 'unchecked';
        // 如果之前有积分，需要从总积分中扣除
        if (record.points > 0) {
          const users = JSON.parse(localStorage.getItem('users')) || {};
          if (users[username]) {
            users[username].totalPoints = Math.max(0, (users[username].totalPoints || 0) - record.points);
          }
          localStorage.setItem('users', JSON.stringify(users));
        }
        record.points = 0;
        record.status = 'pending';
      } else {
        // 添加未签到记录
        pointsHistory[username].push({
          activityId: activity.id,
          activityName: activity.name,
          points: 0,
          date: now.toISOString(),
          type: 'earned',
          status: 'pending',
          checkInStatus: 'unchecked'
        });
      }
    }
  });

  // 保存更新后的数据
  localStorage.setItem('activities', JSON.stringify(activities));
  localStorage.setItem('pointsHistory', JSON.stringify(pointsHistory));

  // 显示成功提示
  Utils.UI.showToast('签到信息已保存，积分已发放', 'success');
  modal.style.display = 'none';
  loadActivities(); // 刷新活动列表
}

// 格式化日期
function formatDate(date) {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }

    if (isNaN(date.getTime())) {
      return '未设置结束时间';
    }

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '无效日期';
  }
}

// 更新活动结束时间
function updateActivityEndTime(activityId, newEndTime) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!activity) {
    Utils.UI.showToast('活动不存在', 'error');
    return;
  }

  // 获取开始时间和新的结束时间
  const startTime = new Date(activity.date);
  const endTime = new Date(newEndTime);

  // 计算最小允许的结束时间（开始时间 + 1小时）
  const minEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  // 检查结束时间是否在最小允许时间之后
  if (endTime <= minEndTime) {
    Utils.UI.showToast('完成时间必须晚于活动开始时间至少1小时', 'error');
    return;
  }

  // 更新活动结束时间
  activity.endTime = newEndTime;
  localStorage.setItem('activities', JSON.stringify(activities));

  Utils.UI.showToast('活动完成时间已更新', 'success');
  loadActivities(); // 刷新活动列表
} 