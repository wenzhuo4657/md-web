/**
 * Shell模块 - 独立的Shell脚本执行功能
 * 负责执行真实的shell.sh文件并显示输出
 */
class ShellModule {
  constructor() {
    this.shellOutput = document.getElementById('shell-output');
    this.shellResult = document.getElementById('shell-result');
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.selectedFile = null;
    this.init();
  }

  init() {
    // 选择脚本文件按钮
    document.getElementById('select-shell-btn').addEventListener('click', () => {
      document.getElementById('shell-file-input').click();
    });

    // 文件选择器变化事件
    document.getElementById('shell-file-input').addEventListener('change', (e) => {
      this.handleFileSelection(e);
    });

    // Shell执行按钮
    document.getElementById('shell-btn').addEventListener('click', () => {
      this.executeSelectedShellFile();
    });

    // 关闭Shell输出
    document.getElementById('close-shell').addEventListener('click', () => {
      this.hideShellOutput();
    });
    
    // 保存Shell输出
    document.getElementById('save-shell').addEventListener('click', () => {
      this.saveShellOutput();
    });
  }

  // 处理文件选择
  handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // 检查文件扩展名
    const validExtensions = ['.sh', '.bat', '.cmd'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      this.showNotification('请选择有效的脚本文件 (.sh, .bat, .cmd)', 'warning');
      return;
    }

    this.selectedFile = file;
    
    // 更新UI显示选中的文件名
    document.getElementById('selected-file-name').textContent = file.name;
    
    // 启用执行按钮
    document.getElementById('shell-btn').disabled = false;
    
    this.showNotification(`已选择脚本文件: ${file.name}`, 'success');
  }

  // 执行选中的Shell文件
  async executeSelectedShellFile() {
    if (!this.selectedFile) {
      this.showNotification('请先选择一个脚本文件', 'warning');
      return;
    }

    try {
      // 读取文件内容
      const fileContent = await this.readFileContent(this.selectedFile);
      
      // 显示正在执行的提示
      this.showShellOutput(`正在执行脚本文件: ${this.selectedFile.name}\n`);
      
      const result = await this.executeShellScript(fileContent);
      this.displayExecutionResult(result);
     } catch (error) {
       this.showShellOutput(`执行错误: ${error.message}\n`);
       this.showNotification('Shell脚本执行失败', 'error');
     }
  }

  // 读取文件内容
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  // 提取shell脚本内容
  extractShellScript(content) {
    // 匹配shell代码块
    const patterns = [
      /```(?:bash|shell|sh)\n([\s\S]*?)```/g,
      /```\n([\s\S]*?)```/g
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  // 执行shell脚本
  async executeShellScript(shellScript) {
    const response = await fetch(`${this.apiBaseUrl}/execute-shell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: shellScript
    });
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    return await response.json();
  }
  
  // 显示执行结果
  displayExecutionResult(result) {
    let output = '';
    
    if (result.success) {
      output += `=== Shell脚本执行成功 ===\n`;
      output += `执行时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;
      
      if (result.stdout) {
        output += `标准输出:\n${result.stdout}\n`;
      }
      
      if (result.stderr) {
        output += `标准错误:\n${result.stderr}\n`;
      }
      
      this.showNotification('Shell脚本执行成功', 'success');
    } else {
      output += `=== Shell脚本执行失败 ===\n`;
      output += `错误信息: ${result.error}\n\n`;
      
      if (result.stdout) {
        output += `标准输出:\n${result.stdout}\n`;
      }
      
      if (result.stderr) {
        output += `标准错误:\n${result.stderr}\n`;
      }
      
      this.showNotification('Shell脚本执行失败', 'error');
    }
    
    this.showShellOutput(output);
  }



  showShellOutput(output) {
    this.shellResult.textContent = output;
    this.shellOutput.style.display = 'block';
  }

  hideShellOutput() {
    this.shellOutput.style.display = 'none';
  }
  
  saveShellOutput() {
    const shellResult = this.shellResult.textContent;
    if (!shellResult || shellResult.trim() === '') {
      this.showNotification('没有可保存的Shell输出内容', 'warning');
      return;
    }
    
    // 创建文件内容
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `shell-output-${timestamp}.txt`;
    
    // 添加文件头信息
    const fileContent = `Shell执行结果\n` +
                       `生成时间: ${new Date().toLocaleString()}\n` +
                       `${'='.repeat(50)}\n\n` +
                       shellResult;
    
    // 创建下载链接
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL对象
    URL.revokeObjectURL(url);
    
    this.showNotification(`Shell输出已保存为 ${filename}`, 'success');
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// 导出Shell模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShellModule;
}