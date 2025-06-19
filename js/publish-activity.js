document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是社团负责人
  const userInfo = Utils.DataManager.load('userInfo');
  if (!userInfo || userInfo.role !== 'club_leader') {
    Utils.Navigation.goto('index.html');
    return;
  }

  // 获取用户详细信息
  const users = Utils.DataManager.load('users') || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  document.getElementById('userName').textContent = userInfo.username;
  const userAvatar = document.getElementById('userAvatar');
  if (userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 处理导航栏事件
  document.getElementById('editProfile').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('edit-profile.html');
  });

  document.getElementById('changePassword').addEventListener('click', function (e) {
    e.preventDefault();
    Utils.Navigation.goto('change-password.html');
  });

  document.getElementById('logout').addEventListener('click', async function (e) {
    e.preventDefault();
    const confirmed = await Utils.UI.confirm('确定要退出登录吗？');
    if (confirmed) {
      Utils.DataManager.save('userInfo', null);
      Utils.Navigation.goto('index.html');
    }
  });

  // 图片上传相关元素
  const imageInput = document.getElementById('image');
  const imagePreview = document.getElementById('imagePreview');
  const previewImage = document.getElementById('previewImage');
  const uploadHint = document.querySelector('.upload-hint');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');

  // 点击预览区域触发文件选择
  imagePreview.addEventListener('click', function (e) {
    if (e.target === imagePreview || e.target.closest('.upload-hint')) {
      imageInput.click();
    }
  });

  // 处理文件选择
  imageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const uploadHint = document.querySelector('.upload-hint');

    if (file) {
      handleFileUpload(file);
      // 显示预览区域，隐藏提示文字
      imagePreview.style.display = 'block';
      uploadHint.style.display = 'none';

    } else {
      // 没有选择文件，隐藏预览，显示提示文字和上传按钮
      previewImage.src = '';
      previewImage.style.display = 'none';
      imagePreview.style.display = 'block'; // 即使没有图片，外层容器还是显示，但内部提示会显示
      uploadHint.style.display = 'block';
    }
  });

  // 拖拽上传功能
  imagePreview.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.classList.add('dragover');
  });

  imagePreview.addEventListener('dragleave', function (e) {
    e.preventDefault();
    this.classList.remove('dragover');
  });

  imagePreview.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      Utils.UI.showToast('请上传图片文件！', 'error');
    }
  });

  // 处理表单提交
  document.getElementById('publishForm').addEventListener('submit', handleSubmit);
});

// 处理文件上传
function handleFileUpload(file) {
  // 检查文件类型
  if (!file.type.match('image/jpeg|image/png|image/gif')) {
    Utils.UI.showToast('请上传 JPG、PNG 或 GIF 格式的图片！', 'error');
    return;
  }

  // 检查文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    Utils.UI.showToast('图片大小不能超过 5MB！', 'error');
    return;
  }

  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  const uploadHint = document.querySelector('.upload-hint');

  // 显示进度条
  uploadProgress.style.display = 'block';
  uploadHint.style.display = 'none';

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
        Utils.UI.showToast('图片上传成功！', 'success');
      }, 500);
    }
  }, 100);

  // 读取并压缩图片
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // 压缩图片
      const MAX_SIZE = 400;
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
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      // 预览
      const previewImage = document.getElementById('previewImage');
      previewImage.src = compressedDataUrl;
      previewImage.style.display = 'block';
      // 确保预览区域可见，提示文字隐藏
      const imagePreview = document.getElementById('imagePreview');
      imagePreview.style.display = 'block';
      uploadHint.style.display = 'none';
      // 存储压缩后的图片数据，便于后续保存
      previewImage.dataset.compressed = '1';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 处理活动发布
async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  // 获取当前用户信息
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo) {
    Utils.UI.showToast('请先登录', 'error');
    return;
  }

  // 获取用户详细信息
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const userDetails = users[userInfo.username] || {};

  // 验证报名截止时间不能晚于活动时间
  const activityDate = new Date(formData.get('activityDate'));
  const registrationDeadline = new Date(formData.get('registrationDeadline'));
  if (registrationDeadline >= activityDate) {
    Utils.UI.showToast('报名截止时间必须早于活动时间', 'error');
    return;
  }

  // 创建活动对象
  const activity = {
    id: Date.now().toString(),
    name: formData.get('name'),
    description: formData.get('description'),
    date: formData.get('activityDate'),
    registrationDeadline: formData.get('registrationDeadline'),
    location: formData.get('location'),
    capacity: parseInt(formData.get('capacity')),
    points: parseInt(formData.get('points')),
    image: document.getElementById('previewImage').src,
    publisher: userInfo.username,
    publisherName: userDetails.name || userInfo.username,
    status: 'pending',
    createTime: new Date().toISOString(),
    currentParticipants: 0,
    participants: []
  };

  // 获取现有活动列表
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  activities.push(activity);
  localStorage.setItem('activities', JSON.stringify(activities));

  Utils.UI.showToast('活动发布成功，等待管理员审核', 'success');
  setTimeout(() => {
    window.location.href = 'my-activities.html';
  }, 1500);
} 