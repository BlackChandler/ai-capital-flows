#!/bin/zsh
# 更新并发布公开版看板：
#   1. 跑债券脚本，拉最新价格（加 --skip-bonds 跳过）
#   2. 由 _export/ 和最新债券数据重新生成 docs/
#   3. 提交并推送到 GitHub，约 1 分钟后 https://blackchandler.github.io/ai-capital-flows/ 更新
# Claude 看板上改过的研究内容（结论、合同等），要先让 Claude 重新导出到 _export/ 再运行本脚本。
set -e
cd "$(dirname "$0")"
if [[ "$1" != "--skip-bonds" ]]; then
  python3 ../bond_tracker/bond_tracker.py
fi
python3 build_site.py
git add -A docs
if git diff --cached --quiet; then
  echo "没有变化，无需发布。"
  exit 0
fi
git commit -q -m "Update dashboard data $(date '+%Y-%m-%d %H:%M')"
git push -q
echo "已推送。约 1 分钟后生效：https://blackchandler.github.io/ai-capital-flows/"
