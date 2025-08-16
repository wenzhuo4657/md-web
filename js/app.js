// 日程记录应用
class MarkdownEditor {
  constructor() {
    this.editor = document.getElementById('markdown-editor');
    this.preview = document.getElementById('markdown-preview');
    this.toggleBtn = document.getElementById('toggle-btn');
    this.storageKey = 'schedule-record-content';
    this.isEditMode = false;
    this.init();
  }

  init() {
    // 从本地存储加载内容
    this.loadFromStorage();
    
    // 如果没有保存的内容，显示简单的欢迎信息
    if (!this.editor.value.trim()) {
      this.editor.value = '# 欢迎使用日程记录\n\n点击"编辑"按钮开始记录您的日程安排...';
    }
    
    // 默认显示预览模式
    this.switchToPreview();
    
    this.bindEvents();
    this.bindToolbarEvents();
  }

  bindEvents() {
    // 监听编辑器输入事件
    this.editor.addEventListener('input', () => {
      this.autoSave();
    });

    // 监听编辑器失去焦点事件，自动切换到预览
    this.editor.addEventListener('blur', () => {
      // 延迟执行，避免点击按钮时立即切换
      setTimeout(() => {
        if (this.isEditMode && !this.editor.matches(':focus')) {
          this.switchToPreview();
        }
      }, 100);
    });

    // 支持Tab键缩进
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        
        // 插入Tab字符（使用2个空格代替）
        this.editor.value = this.editor.value.substring(0, start) + 
                           '  ' + 
                           this.editor.value.substring(end);
        
        // 恢复光标位置
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
      }
    });

    // 监听Esc键切换到预览模式
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.switchToPreview();
      }
    });

    // 监听Ctrl+S保存快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveToStorage();
        this.showNotification('内容已保存', 'success');
      }
    });
  }

  bindToolbarEvents() {
    // 编辑/预览切换按钮
    this.toggleBtn.addEventListener('click', () => {
      if (this.isEditMode) {
        this.switchToPreview();
      } else {
        this.switchToEdit();
      }
    });

    // 导出为文件
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportToFile();
    });

    // 导入文件
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-input').click();
    });

    // 处理文件导入
    document.getElementById('import-input').addEventListener('change', (e) => {
      this.importFromFile(e.target.files[0]);
    });
  }

  // 切换到编辑模式
  switchToEdit() {
    this.isEditMode = true;
    this.editor.style.display = 'block';
    this.preview.style.display = 'none';
    this.toggleBtn.textContent = '预览';
    this.toggleBtn.className = 'btn btn-success';
    this.editor.focus();
  }

  // 切换到预览模式
  switchToPreview() {
    this.isEditMode = false;
    this.editor.style.display = 'none';
    this.preview.style.display = 'block';
    this.toggleBtn.textContent = '编辑';
    this.toggleBtn.className = 'btn btn-primary';
    
    // 更新预览内容并自动保存
    this.updatePreview();
    this.saveToStorage();
  }

  updatePreview() {
    const markdownText = this.editor.value;
    
    try {
      // 检查是否包含日期格式的标题
      if (this.hasDateHeaders(markdownText)) {
        this.renderDateTabs(markdownText);
      } else {
        // 使用marked库解析Markdown
        const htmlContent = marked.parse(markdownText);
        this.preview.innerHTML = htmlContent;
      }
    } catch (error) {
      console.error('Markdown解析错误:', error);
      this.preview.innerHTML = '<p style="color: red;">Markdown解析出错，请检查语法。</p>';
    }
  }

  // 检查是否包含任何#号标题
  hasDateHeaders(text) {
    const headerRegex = /^#\s+/gm;
    return headerRegex.test(text);
  }

  // 渲染日期标签页
  renderDateTabs(markdownText) {
    const sections = this.parseDateSections(markdownText);
    
    if (sections.length === 0) {
      const htmlContent = marked.parse(markdownText);
      this.preview.innerHTML = htmlContent;
      return;
    }

    // 创建标签页结构
    let tabsHtml = '<div class="date-tabs-container">';
    
    // 创建标签导航
    tabsHtml += '<div class="date-tabs-nav">';
    sections.forEach((section, index) => {
      const activeClass = index === 0 ? ' active' : '';
      tabsHtml += `<button class="date-tab-btn${activeClass}" data-tab="${index}">${section.date}</button>`;
    });
    tabsHtml += '</div>';
    
    // 创建标签内容
    tabsHtml += '<div class="date-tabs-content">';
    sections.forEach((section, index) => {
      const activeClass = index === 0 ? ' active' : '';
      const contentHtml = marked.parse(section.content);
      tabsHtml += `<div class="date-tab-panel${activeClass}" data-panel="${index}">${contentHtml}</div>`;
    });
    tabsHtml += '</div>';
    
    tabsHtml += '</div>';
    
    this.preview.innerHTML = tabsHtml;
    
    // 绑定标签切换事件
    this.bindTabEvents();
  }

  // 解析标题分组
  parseDateSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^# (.+)$/);
      
      if (headerMatch) {
        // 如果当前有未完成的section，先保存它
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // 开始新的section
        currentSection = {
          date: headerMatch[1].trim(),
          content: '',
          startLine: i
        };
      } else if (currentSection) {
        // 添加内容到当前section
        currentSection.content += line + '\n';
      }
    }
    
    // 保存最后一个section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  // 绑定标签切换事件
  bindTabEvents() {
    const tabBtns = this.preview.querySelectorAll('.date-tab-btn');
    const tabPanels = this.preview.querySelectorAll('.date-tab-panel');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabIndex = btn.getAttribute('data-tab');
        
        // 移除所有活动状态
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        
        // 激活当前标签
        btn.classList.add('active');
        const targetPanel = this.preview.querySelector(`[data-panel="${tabIndex}"]`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  // 保存到本地存储
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, this.editor.value);
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      this.showNotification('保存失败，可能是存储空间不足', 'error');
      return false;
    }
  }

  // 从本地存储加载
  loadFromStorage() {
    try {
      const savedContent = localStorage.getItem(this.storageKey);
      if (savedContent) {
        this.editor.value = savedContent;
        return true;
      }
    } catch (error) {
      console.error('加载失败:', error);
      this.showNotification('加载失败', 'error');
    }
    return false;
  }

  // 自动保存（防抖）
  autoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 1000); // 1秒后自动保存
  }

  // 导出为文件
  exportToFile() {
    const content = this.editor.value;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('文件已导出', 'success');
  }

  // 从文件导入
  importFromFile(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (confirm('确定要导入此文件吗？当前内容将被覆盖。')) {
        this.editor.value = e.target.result;
        this.updatePreview();
        this.saveToStorage();
        this.showNotification(`文件 "${file.name}" 已导入`, 'success');
      }
    };
    
    reader.onerror = () => {
      this.showNotification('文件读取失败', 'error');
    };
    
    reader.readAsText(file, 'UTF-8');
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '4px',
      color: 'white',
      fontWeight: '500',
      zIndex: '1000',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    });

    // 设置颜色
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }



  // 获取编辑器内容
  getContent() {
    return this.editor.value;
  }

  // 设置编辑器内容
  setContent(content) {
    this.editor.value = content;
    this.updatePreview();
    this.saveToStorage();
  }

  // 清空编辑器
  clear() {
    this.editor.value = '';
    this.updatePreview();
    this.saveToStorage();
  }
}

// 页面加载完成后初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
  // 检查marked库是否加载成功
  if (typeof marked === 'undefined') {
    console.error('marked库未能正确加载');
    document.getElementById('markdown-preview').innerHTML = 
      '<p style="color: red;">Markdown解析库加载失败，请检查网络连接。</p>';
    return;
  }

  // 配置marked选项
  marked.setOptions({
    breaks: true, // 支持换行
    gfm: true,    // 启用GitHub风格的Markdown
    sanitize: false, // 允许HTML标签
    smartLists: true,
    smartypants: true
  });

  // 初始化编辑器
  window.markdownEditor = new MarkdownEditor();
  
  // 初始化Shell模块
  new ShellModule();
  
  console.log('Markdown编辑器初始化完成');
});

// 全局导出，便于调试
window.MarkdownEditor = MarkdownEditor;
window.ShellModule = ShellModule;

// 导出编辑器类供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownEditor;
}