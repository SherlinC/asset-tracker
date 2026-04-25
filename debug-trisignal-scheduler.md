# [OPEN] trisignal-scheduler

## 问题
- 现象：电脑大约每隔 4 小时会运行一次 `trisignal` skill。
- 目标：确认触发源头，并给出可操作的关闭或修复建议。

## 初始假设
1. `launchd` 中存在按固定周期触发的 `trisignal` 相关任务。
2. 用户或系统 `crontab` 中存在每 4 小时执行一次的任务。
3. 某个 Trae/插件配置文件或脚本中写死了 `trisignal` 自动执行逻辑。
4. 某个常驻进程通过内部定时器触发，与系统计划任务无关。

## 计划
- 检查 `launchctl`、`LaunchAgents`、`LaunchDaemons`
- 检查用户 `crontab`
- 检查登录项与后台进程
- 搜索本机配置文件中 `trisignal` 关键字

## 证据
- 待收集
