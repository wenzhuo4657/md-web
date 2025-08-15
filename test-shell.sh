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