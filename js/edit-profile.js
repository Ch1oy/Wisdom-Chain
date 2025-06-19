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

  // 填充表单数据
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.value = userInfo.username;
  }

  const nameInput = document.getElementById('name');
  if (nameInput) {
    nameInput.value = userDetails.name || '';
  }

  // 自动设置性别select的值
  const genderSelect = document.getElementById('gender');
  if (genderSelect && userDetails.gender) {
    genderSelect.value = userDetails.gender;
  }

  const studentIdInput = document.getElementById('studentId');
  if (studentIdInput) {
    studentIdInput.value = userDetails.studentId || '';
  }

  const collegeInput = document.getElementById('college');
  if (collegeInput) {
    collegeInput.value = userDetails.college || '';
  }

  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.value = userDetails.email || '';
  }

  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.value = userDetails.phone || '';
  }

  const bioInput = document.getElementById('bio');
  if (bioInput) {
    bioInput.value = userDetails.bio || '';
  }

  // 显示当前头像预览
  const avatarPreview = document.getElementById('avatarPreview');
  if (avatarPreview) {
    avatarPreview.src = userDetails.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg';
  }

  // 处理导航栏事件
  const changePasswordBtn = document.getElementById('changePassword');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('change-password.html');
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

  // 处理头像上传
  const avatarPreviewContainer = document.querySelector('.avatar-preview');
  const avatarInput = document.getElementById('avatarInput');
  const uploadProgress = document.getElementById('avatarUploadProgress');
  const progressFill = uploadProgress?.querySelector('.progress-fill');
  const progressText = uploadProgress?.querySelector('.progress-text');

  if (avatarPreviewContainer) {
    // 点击上传
    avatarPreviewContainer.addEventListener('click', function () {
      if (avatarInput) {
        avatarInput.click();
      }
    });

    // 拖放上传
    avatarPreviewContainer.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });

    avatarPreviewContainer.addEventListener('dragleave', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
    });

    avatarPreviewContainer.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        Utils.UI.showToast('请上传图片文件！', 'error');
      }
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        handleImageUpload(file);
      }
    });
  }

  // 处理取消按钮
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      // 根据用户角色跳转到对应页面
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
  }

  // 处理表单提交
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }

  // 加载用户数据
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  if (userData) {
    document.getElementById('username').value = userData.username || '';
    document.getElementById('name').value = userData.name || '';
    document.getElementById('gender').value = userData.gender || '';
    document.getElementById('college').value = userData.college || '';
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('email').value = userData.email || '';
    document.getElementById('bio').value = userData.bio || '';

    if (userData.avatar) {
      document.getElementById('avatarPreview').src = userData.avatar;
    }
  }
});

// 处理图片上传
function handleImageUpload(file) {
  // 检查文件类型
  if (!file.type.match('image/jpeg|image/png|image/gif')) {
    Utils.UI.showToast('请上传 JPG、PNG 或 GIF 格式的图片！', 'error');
    return;
  }

  // 检查文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    Utils.UI.showToast('图片大小不能超过 2MB！', 'error');
    return;
  }

  const uploadProgress = document.getElementById('avatarUploadProgress');
  const progressFill = uploadProgress.querySelector('.progress-fill');
  const progressText = uploadProgress.querySelector('.progress-text');

  // 显示进度条
  uploadProgress.style.display = 'block';

  // 模拟上传进度
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        Utils.UI.showToast('头像上传成功！', 'success');
      }, 500);
    }
  }, 100);

  // 读取并压缩图片
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // 压缩图片
      const MAX_SIZE = 150; // 降低最大尺寸以减小文件大小
      let width = img.width;
      let height = img.height;
      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 使用更低的压缩质量
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);

      // 预览
      const avatarPreview = document.getElementById('avatarPreview');
      avatarPreview.src = compressedDataUrl;

      // 同步导航栏头像
      const userAvatar = document.getElementById('userAvatar');
      userAvatar.src = compressedDataUrl;

      // 标记已更换头像
      avatarPreview.dataset.changed = '1';

      // 立即保存到localStorage
      const userInfo = Utils.DataManager.load('userInfo');
      if (userInfo && userInfo.username) {
        let users = Utils.DataManager.load('users') || {};
        if (!users[userInfo.username]) {
          users[userInfo.username] = {};
        }
        users[userInfo.username].avatar = compressedDataUrl;
        Utils.DataManager.save('users', users);

        // 更新当前用户信息
        userInfo.avatar = compressedDataUrl;
        Utils.DataManager.save('userInfo', userInfo);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 处理表单提交
async function handleProfileSubmit(e) {
  e.preventDefault();

  try {
    // 验证表单
    const name = document.getElementById('name').value;
    const gender = document.getElementById('gender').value;
    const college = document.getElementById('college').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const bio = document.getElementById('bio').value;
    const avatarPreview = document.getElementById('avatarPreview');

    console.log('表单数据:', { name, gender, college, email, phone, bio });

    if (!Utils.Validator.required(name)) {
      throw new Error('请输入姓名');
    }

    if (!Utils.Validator.required(gender)) {
      throw new Error('请选择性别');
    }

    if (!Utils.Validator.required(college)) {
      throw new Error('请输入学院');
    }

    if (email && !Utils.Validator.isEmail(email)) {
      throw new Error('请输入正确的邮箱地址');
    }

    if (phone && !Utils.Validator.isPhone(phone)) {
      throw new Error('请输入正确的手机号码');
    }

    if (bio && bio.length > 200) {
      throw new Error('个人简介不能超过200字');
    }

    Utils.UI.showLoading('正在保存个人信息...');

    // 获取当前用户信息
    const userInfo = Utils.DataManager.load('userInfo');
    if (!userInfo || !userInfo.username) {
      throw new Error('用户信息不存在');
    }

    console.log('当前用户信息:', userInfo);

    // 获取所有用户数据
    let users = Utils.DataManager.load('users');
    if (!users) {
      users = {};
    }

    console.log('当前用户数据:', users[userInfo.username]);

    // 确保用户数据存在
    if (!users[userInfo.username]) {
      users[userInfo.username] = {};
    }

    // 获取当前头像
    let avatar = users[userInfo.username].avatar;
    const avatarPreviewEl = document.getElementById('avatarPreview');
    if (avatarPreviewEl && avatarPreviewEl.src && !avatarPreviewEl.src.includes('twemoji') && !avatarPreviewEl.src.includes('default-avatar')) {
      avatar = avatarPreviewEl.src;
    }

    // 更新用户信息
    const updatedUser = {
      ...users[userInfo.username],
      name: name,
      gender: gender,
      college: college,
      email: email,
      phone: phone,
      bio: bio,
      avatar: avatar // 优先用当前预览头像
    };

    console.log('更新后的用户数据:', updatedUser);

    // 保存更新后的用户信息
    users[userInfo.username] = updatedUser;
    Utils.DataManager.save('users', users);

    // 更新当前用户信息
    const updatedUserInfo = {
      ...userInfo,
      name: name
    };
    Utils.DataManager.save('userInfo', updatedUserInfo);

    console.log('保存后的数据:', {
      users: JSON.parse(localStorage.getItem('users')),
      userInfo: JSON.parse(localStorage.getItem('userInfo'))
    });

    Utils.UI.showToast('个人信息更新成功！', 'success');

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
    console.error('保存失败:', error);
    Utils.UI.showToast(error.message, 'error');
  } finally {
    Utils.UI.hideLoading();
  }
}