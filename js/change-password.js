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
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = userInfo.username;
  }

  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    userAvatar.src = userDetails.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg';
  }

  // 处理导航栏事件
  const editProfileBtn = document.getElementById('editProfile');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('edit-profile.html');
    });
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (confirm('确定要退出登录吗？')) {
        Utils.DataManager.save('userInfo', null);
        Utils.Navigation.goto('index.html');
      }
    });
  }

  // 处理表单提交
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // 处理取消按钮
  const cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.addEventListener('click', function () {
    // 根据角色跳转到不同页面
    switch (userInfo.role) {
      case 'student':
        Utils.Navigation.goto('home.html');
        break;
      case 'club_leader':
        Utils.Navigation.goto('club-activity-manage.html');
        break;
      case 'admin':
        Utils.Navigation.goto('admin-review.html');
        break;
      default:
        Utils.Navigation.goto('index.html');
    }
  });

  // 添加密码显示/隐藏功能
  setupPasswordToggle('currentPassword');
  setupPasswordToggle('newPassword');
  setupPasswordToggle('confirmPassword');

  // 添加实时密码强度检查
  const newPassword = document.getElementById('newPassword');
  newPassword.addEventListener('input', checkPasswordStrength);

  // 添加实时密码匹配检查
  const confirmPassword = document.getElementById('confirmPassword');
  confirmPassword.addEventListener('input', checkPasswordMatch);
});

// 设置密码显示/隐藏功能
function setupPasswordToggle(inputId) {
  const input = document.getElementById(inputId);
  const toggleBtn = document.querySelector(`[data-for="${inputId}"]`);

  toggleBtn.addEventListener('click', function () {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    toggleBtn.innerHTML = type === 'password' ?
      '<i class="ri-eye-line"></i>' :
      '<i class="ri-eye-off-line"></i>';
  });
}

// 检查密码强度
function checkPasswordStrength() {
  const password = document.getElementById('newPassword').value;
  const strengthMeter = document.getElementById('strengthMeter');
  const strengthText = document.getElementById('strengthText');

  // 密码强度规则
  const rules = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };

  // 计算强度分数
  const score = Object.values(rules).filter(Boolean).length;

  // 更新强度条
  const strengthFill = strengthMeter.querySelector('.strength-fill');
  strengthFill.style.width = `${(score / 5) * 100}%`;
  strengthMeter.className = `strength-meter strength-${score}`;

  // 更新强度文本
  const strengthLabels = ['很弱', '弱', '中等', '强', '很强'];
  strengthText.textContent = `密码强度：${strengthLabels[score - 1] || '很弱'}`;
  strengthText.className = `strength-text strength-${score}`;

  return score;
}

// 检查密码匹配
function checkPasswordMatch() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const matchText = document.getElementById('passwordMatch');

  if (confirmPassword) {
    if (newPassword === confirmPassword) {
      matchText.textContent = '密码匹配';
      matchText.className = 'match-text match-success';
      return true;
    } else {
      matchText.textContent = '密码不匹配';
      matchText.className = 'match-text match-error';
      return false;
    }
  } else {
    matchText.textContent = '';
    return false;
  }
}

// 处理密码修改
async function handlePasswordChange(e) {
  e.preventDefault();

  try {
    // 验证表单
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!Utils.Validator.required(currentPassword)) {
      throw new Error('请输入当前密码');
    }

    if (!Utils.Validator.required(newPassword)) {
      throw new Error('请输入新密码');
    }

    if (!Utils.Validator.required(confirmPassword)) {
      throw new Error('请确认新密码');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('两次输入的密码不一致');
    }

    if (!Utils.Validator.isPasswordStrong(newPassword)) {
      throw new Error('新密码必须包含大小写字母、数字和特殊字符，且长度至少为8位');
    }

    Utils.UI.showLoading('正在修改密码...');

    // 获取用户信息
    const userInfo = Utils.DataManager.load('userInfo');
    if (!userInfo || !userInfo.username) {
      throw new Error('用户信息不存在');
    }

    // 获取所有用户数据
    let users = Utils.DataManager.load('users');
    if (!users) {
      users = {};
    }

    // 验证当前密码
    const user = users[userInfo.username];
    if (!user) {
      throw new Error('用户不存在');
    }

    // 如果是首次登录，使用默认密码验证
    if (userInfo.isFirstLogin) {
      if (currentPassword !== '123456') {
        throw new Error('当前密码错误');
      }
    } else {
      if (currentPassword !== user.password) {
        throw new Error('当前密码错误');
      }
    }

    // 更新密码
    user.password = newPassword;
    userInfo.isFirstLogin = false;
    users[userInfo.username] = user;
    Utils.DataManager.save('users', users);
    Utils.DataManager.save('userInfo', userInfo);

    Utils.UI.showToast('密码修改成功！', 'success');

    // 根据用户角色跳转到对应页面
    setTimeout(() => {
      switch (userInfo.role) {
        case 'student':
          Utils.Navigation.goto('home.html');
          break;
        case 'club_leader':
          Utils.Navigation.goto('club-activity-manage.html');
          break;
        case 'admin':
          Utils.Navigation.goto('admin-review.html');
          break;
        default:
          Utils.Navigation.goto('index.html');
      }
    }, 1500);
  } catch (error) {
    Utils.UI.showToast(error.message, 'error');
  } finally {
    Utils.UI.hideLoading();
  }
} 