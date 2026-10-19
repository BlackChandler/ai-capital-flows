# AI 资金流量表（公开版）

Claude 看板「AI 资金流量表」的静态副本，由 GitHub Pages 托管（`docs/` 目录）。

- `build_site.py`：从 `_export/`（从 Claude 看板导出的页面和数据，不入库）和 `../bond_tracker/output/tv_bonds.csv` 生成 `docs/`。
- `src/runtime.js`：替代 Claude 看板运行环境的 `dash` 接口；`src/theme.css`：页面需要的样式变量。
- 更新并发布：`./publish.sh`（见脚本内说明）。
