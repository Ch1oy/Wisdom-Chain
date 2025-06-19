// js/my-registrations.js

document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo) {
    window.location.href = 'index.html';
    return;
  }

  // 获取用户详细信息 (用于显示用户名等)
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = userInfo.username;
  }
  const userAvatarElement = document.getElementById('userAvatar');
  if (userAvatarElement && userDetails.avatar) {
    userAvatarElement.src = userDetails.avatar;
  }

  // 处理用户菜单事件 (如果navbar.js没有处理的话)
  // 这里假设navbar.js处理了，所以不需要重复添加事件监听器

  // 加载用户报名参加的活动
  loadRegisteredActivities(userInfo.username, 'unsigned'); // 默认加载未签到的活动
});

// 加载用户报名参加的活动
function loadRegisteredActivities(username, filter = 'all') {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activityList = document.getElementById('activityList');

  // 过滤出用户报名参加的活动
  let userRegisteredActivities = activities.filter(activity =>
    activity.participants && activity.participants.some(participant => participant.username === username)
  );

  // 更新活动数量
  updateActivityCounts(userRegisteredActivities, username);

  // 根据筛选条件过滤活动
  if (filter !== 'all') {
    userRegisteredActivities = userRegisteredActivities.filter(activity => {
      const hasCheckedIn = activity.checkIns &&
        activity.checkIns.some(checkIn => checkIn.username === username);
      return filter === 'signed' ? hasCheckedIn : !hasCheckedIn;
    });
  }

  if (userRegisteredActivities.length === 0) {
    activityList.innerHTML = `
      <div class="no-data">
        <i class="ri-calendar-event-line"></i>
        <p>暂无${filter === 'all' ? '报名参加' : filter === 'signed' ? '已签到' : '未签到'}的活动</p>
        <p>去"所有活动"页面看看有没有感兴趣的活动吧！</p>
      </div>
    `;
    return;
  }

  // 显示活动列表
  activityList.innerHTML = userRegisteredActivities.map(activity => createActivityCard(activity)).join('');
}

// 添加更新活动数量的函数
function updateActivityCounts(activities, username) {
  const allCount = activities.length;
  const signedCount = activities.filter(activity =>
    activity.checkIns && activity.checkIns.some(checkIn => checkIn.username === username)
  ).length;
  const unsignedCount = allCount - signedCount;

  document.getElementById('allCount').textContent = allCount;
  document.getElementById('signedCount').textContent = signedCount;
  document.getElementById('unsignedCount').textContent = unsignedCount;
}

// 创建活动卡片 (可以根据需要在my-registrations.js中定义，或者复用activities.js中的函数)
// 为了简单，这里先定义一个简化的createActivityCard函数
function createActivityCard(activity) {
  const now = new Date();
  const activityDate = new Date(activity.startTime || activity.date);
  const deadline = new Date(activity.registrationDeadline);
  const isRegistrationClosed = now > deadline;
  const isActivityStarted = now >= activityDate;

  // 检查是否已经签到
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const hasCheckedIn = activity.checkIns && activity.checkIns.some(checkIn => checkIn.username === userInfo.username);

  return `
    <div class="activity-card">
      <div class="activity-image">
        <img src="${activity.image || 'images/default-activity.jpg'}" alt="${activity.name}">
        <div class="activity-status-badge ${getStatusClass(activity.status)}">
          ${getStatusText(activity.status)}
        </div>
      </div>
      <div class="activity-content">
        <h3 class="activity-title">${activity.name || activity.title}</h3>
        <div class="activity-meta">
          <div class="meta-item">
            <i class="fas fa-user"></i>
            <span>发布者：${activity.publisherName || '未知'}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>活动时间：${new Date(activity.startTime || activity.date).toLocaleString()}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>活动地点：${activity.location || '未设置'}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-users"></i>
            <span>报名人数：${activity.participants ? activity.participants.length : 0}/${activity.capacity}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>报名截止：${new Date(activity.registrationDeadline).toLocaleString()}</span>
          </div>
          <div class="meta-item points">
            <i class="fas fa-star"></i>
            <span>活动积分：${activity.points || 0}</span>
          </div>
        </div>
        ${activity.description ? `
          <div class="activity-description">
            <p>${activity.description}</p>
          </div>
        ` : ''}
        <div class="activity-actions">
          ${isActivityStarted ?
      (hasCheckedIn ?
        '<button class="btn btn-success" disabled><i class="fas fa-check"></i> 已签到</button>' :
        '<button class="btn btn-primary" onclick="showCheckInModal(\'' + activity.id + '\')"><i class="fas fa-camera"></i> 去签到</button>'
      ) :
      (isRegistrationClosed ?
        '<button class="btn btn-secondary" disabled><i class="fas fa-check"></i> 报名已截止</button>' :
        '<button class="btn btn-danger" onclick="cancelRegistration(\'' + activity.id + '\')"><i class="fas fa-times"></i> 取消报名</button>'
      )
    }
        </div>
      </div>
    </div>
  `;
}

// 获取状态文本 (如果activities.js中没有全局函数，这里需要定义)
function getStatusText(status) {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || status;
}

// 获取状态类 (如果activities.js中没有全局函数，这里需要定义)
function getStatusClass(status) {
  const statusClass = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  };
  return statusClass[status] || 'status-unknown';
}

// 显示Toast提示 (复用activities.js或style.css中的样式)
// 假设style.css中定义了.toast样式，这里不需要定义showToast函数 

// 显示签到模态框
function showCheckInModal(activityId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>活动签到</h2>
        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="checkInForm" onsubmit="handleCheckIn(event, '${activityId}')">
          <div class="form-group">
            <label for="checkInImage">上传活动照片</label>
            <div class="image-upload-container">
              <input type="file" id="checkInImage" name="checkInImage" accept="image/*" required>
              <div class="upload-hint">
                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                <p>点击或拖拽图片到此处</p>
                <p class="upload-tip">支持jpg、png格式，大小不超过5MB</p>
              </div>
              <div class="image-preview"></div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
            <button type="submit" class="btn btn-primary">提交签到</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 添加图片预览功能
  const imageInput = modal.querySelector('#checkInImage');
  const imagePreview = modal.querySelector('.image-preview');
  const uploadHint = modal.querySelector('.upload-hint');

  imageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Utils.UI.showToast('图片大小不能超过5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="预览图">`;
        uploadHint.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });
}

// 处理签到提交
async function handleCheckIn(event, activityId) {
  event.preventDefault();

  const imageInput = document.getElementById('checkInImage');
  const file = imageInput.files[0];

  if (!file) {
    Utils.UI.showToast('请选择活动照片', 'error');
    return;
  }

  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const activity = activities.find(a => a.id === activityId);

    if (!activity) {
      Utils.UI.showToast('活动不存在', 'error');
      return;
    }

    // 检查是否已经签到
    if (activity.checkIns && activity.checkIns.some(checkIn => checkIn.username === userInfo.username)) {
      Utils.UI.showToast('您已经签到过了', 'warning');
      return;
    }

    // 读取图片文件并转换为base64
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imageData = e.target.result;

      // 添加签到记录
      if (!activity.checkIns) {
        activity.checkIns = [];
      }

      activity.checkIns.push({
        username: userInfo.username,
        name: userInfo.name || userInfo.username,
        checkInTime: new Date().toISOString()
        // 不存图片数据
      });

      // 更新用户积分
      const users = JSON.parse(localStorage.getItem('users')) || {};
      const userDetails = users[userInfo.username] || {};
      userDetails.points = (userDetails.points || 0) + (activity.points || 0);
      users[userInfo.username] = userDetails;

      // 保存更新
      localStorage.setItem('activities', JSON.stringify(activities));
      localStorage.setItem('users', JSON.stringify(users));

      // 关闭模态框
      document.querySelector('.modal').remove();

      // 显示成功提示
      Utils.UI.showToast('签到成功！积分已添加到您的账户', 'success');

      // 重新加载活动列表
      loadRegisteredActivities(userInfo.username);
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error('签到失败:', error);
    Utils.UI.showToast('签到失败，请稍后重试', 'error');
  }
}

// 取消报名
async function cancelRegistration(activityId) {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')); // 获取当前用户信息
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const activity = activities.find(a => a.id === activityId);

    if (!activity) {
      // 使用my-registrations.js中的showToast或Utils.UI.showToast
      Utils.UI.showToast('活动不存在', 'error');
      return;
    }

    // 检查是否已报名
    const participantIndex = activity.participants.findIndex(p => p.username === userInfo.username);
    if (participantIndex === -1) {
      Utils.UI.showToast('您未报名该活动', 'warning');
      return;
    }

    // 检查是否已过报名截止时间 (这里与activities.js中的逻辑一致)
    const now = new Date();
    const deadline = new Date(activity.registrationDeadline);
    if (now > deadline) {
      Utils.UI.showToast('报名已截止，无法取消报名', 'warning');
      return;
    }

    // 移除报名信息
    activity.participants.splice(participantIndex, 1);
    activity.currentParticipants--; // 报名人数减一

    // 保存更新后的活动信息
    localStorage.setItem('activities', JSON.stringify(activities));

    Utils.UI.showToast('已取消报名', 'success');
    // 刷新当前页面的活动列表
    loadRegisteredActivities(userInfo.username); // 调用my-registrations.js中的加载函数
  } catch (error) {
    console.error('取消报名失败:', error);
    Utils.UI.showToast('取消报名失败，请稍后重试', 'error');
  }
}

// 添加筛选功能
document.addEventListener('DOMContentLoaded', function () {
  const filterButtons = document.querySelectorAll('.anniu .btn');
  const activityList = document.getElementById('activityList');

  filterButtons.forEach(button => {
    button.addEventListener('click', function () {
      // 移除所有按钮的active类
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // 为当前点击的按钮添加active类
      this.classList.add('active');

      const filter = this.getAttribute('data-filter');
      const activities = JSON.parse(localStorage.getItem('activities')) || [];
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));

      // 重新加载活动列表，根据筛选条件显示
      loadRegisteredActivities(userInfo.username, filter);
    });
  });
}); 