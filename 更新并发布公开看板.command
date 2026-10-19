#!/bin/zsh
# 双击运行：拉最新债券价格 -> 重新生成公开版看板 -> 推送到 GitHub
cd "$(dirname "$0")" && ./publish.sh
echo; read -s -k "?按任意键关闭窗口"
