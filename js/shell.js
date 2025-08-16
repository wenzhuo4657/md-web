/**
 * Shell模块 - 独立的Shell脚本执行功能
 * 负责执行真实的shell.sh文件并显示输出
 */
class ShellModule {
  constructor() {
    this.shellOutput = document.getElementById('shell-output');
    this.shellResult = document.getElementById('shell-result');
    this.shellEditor = document.getElementById('shell-script-editor');
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.scriptStorageKey = 'shell-script-content';
    this.init();
  }

  init() {
    // 加载保存的脚本内容
    this.loadShellScript();
    
    // 保存脚本事件
    const saveScriptBtn = document.getElementById('save-shell-script-btn');
    if (saveScriptBtn) {
      saveScriptBtn.addEventListener('click', () => {
        this.saveShellScript();
      });
    }
    
    // Shell执行按钮
    const executeShellBtn = document.getElementById('execute-shell-btn');
    if (executeShellBtn) {
      executeShellBtn.addEventListener('click', () => {
        this.executeShellScript();
      });
    }

    // 关闭Shell输出
    document.getElementById('close-shell').addEventListener('click', () => {
      this.hideShellOutput();
    });
    
    // 保存Shell输出
    document.getElementById('save-shell').addEventListener('click', () => {
      this.saveShellOutput();
    });
  }

  // 加载脚本内容
  loadShellScript() {
    // 从localStorage加载保存的脚本内容
    const savedScript = localStorage.getItem(this.scriptStorageKey);
    if (savedScript && this.shellEditor) {
      this.shellEditor.value = savedScript;
    } else if (this.shellEditor && !this.shellEditor.value.trim()) {
      // 如果没有保存的内容，显示默认示例
      this.shellEditor.value = '#!/bin/bash\n\n# 在此编写您的shell脚本\necho "Hello World"\necho "当前时间: $(date)"\necho "当前目录: $(pwd)"';
    }
  }
  
  // 保存脚本内容
  saveShellScript() {
    if (!this.shellEditor) return;
    
    const scriptContent = this.shellEditor.value;
    
    // 保存到localStorage
    localStorage.setItem(this.scriptStorageKey, scriptContent);
    
    // 同时保存到服务器
    this.saveScriptToServer(scriptContent);
    
    this.showNotification('脚本已保存', 'success');
  }

  // 执行Shell脚本
  async executeShellScript() {
    if (!this.shellEditor) {
      this.showNotification('脚本编辑器未找到', 'error');
      return;
    }
    
    const scriptContent = this.shellEditor.value.trim();
    if (!scriptContent) {
      this.showNotification('请输入脚本内容', 'error');
      return;
    }

    try {
      // 先保存脚本到服务器
      await this.saveScriptToServer(scriptContent);
      
      // 显示正在执行的提示
      this.showShellOutput('正在执行脚本...\n');
      
      const result = await this.executeSourceCommand();
      this.displayExecutionResult(result);
     } catch (error) {
       this.showShellOutput(`执行错误: ${error.message}\n`);
       this.showNotification('Shell脚本执行失败', 'error');
     }
  }

  // 保存脚本到服务器
  async saveScriptToServer(scriptContent) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/save-shell-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: scriptContent })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('保存脚本到服务器失败:', error);
      throw error;
    }
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
  
  // 执行source命令
  async executeSourceCommand() {
    const response = await fetch(`${this.apiBaseUrl}/execute-shell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script: 'source shell.sh' })
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