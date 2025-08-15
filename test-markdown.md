# Shell脚本测试

这是一个测试Markdown文件，用于测试shell脚本执行功能。

## 测试脚本1

```shell
#!/bin/bash

# 这是一个测试shell脚本
echo "Hello from shell script!"
echo "Current date: $(date)"

# 列出当前目录内容
echo "\nListing current directory:"
ls -la

# 显示一些系统信息
echo "\nSystem information:"
echo "OS: $(uname -s)"
echo "Hostname: $(hostname)"

# 退出状态
exit 0
```

## 测试脚本2

```shell
# 简单的Windows命令测试
echo "Hello from Windows shell!"
echo "Current directory:"
dir
echo "Current date:"
date /t
echo "Current time:"
time /t
```