# Tend Demo — Local Usage Guide

A complete walkthrough for running and manually operating the Tend demo system on your machine. Covers startup, every interface, and all demo scenarios.

---

## 1. 启动

```bash
cd /Users/zaynw/Documents/Projects/tend-wellness
npm run dev
```

服务跑在 `http://localhost:3000`。启动后内存 store 会自动用 4 条 seed 数据初始化，**每次重启都会重置**。

### 可选：接入真实 AI

不设置 API key 也能完整运行——系统会用 heuristic fallback 决策。如果想让 MiniMax-M2.5 真正驱动 Harness：

```bash
# .env.local（项目根目录）
MINIMAX_API_KEY=your_key_here
```

重启 dev server 后生效。

---

## 2. 界面一览

| 路径 | 是什么 | 谁用 |
|---|---|---|
| `http://localhost:3000/dashboard` | Owner Dashboard — 案例管理主界面 | 你（practitioner）|
| `http://localhost:3000/inbox` | Mock Inbox — 查看系统发出的邮件 + 模拟客户回复 | 你（模拟客户侧）|
| `http://localhost:3000/entry-form.html` | 客户预约入口表单 | 模拟客户提交 |
| `http://localhost:3000/select-time?case_id=<id>` | 客户选择时间段页面 | 模拟客户选时间 |

Dashboard 和 Inbox 顶部共享同一个导航栏（`Tend · Dashboard · Inbox`），可直接切换。

---

## 3. 预置 Seed 数据

每次重启服务器后，以下 4 条案例自动存在：

| Case ID | 客户 | 当前状态 | 说明 |
|---|---|---|---|
| `case_001` | Jane Kim | `fit_review` | 有一条待审批的 `approve_fit` draft，适合演示 Draft 审批流 |
| `case_002` | Tom R. | `cancel_requested` | 已被 escalate 给你，适合演示 escalation 场景 |
| `case_003` | Marcus L. | `awaiting_client_confirmation` | 等客户选时间，适合演示时间选择流 |
| `case_004` | Sarah M. | `booked` | 已完成预订，用于展示最终状态 |

Inbox 启动后同样预填充了对应的 seed 邮件（intake、fit confirmation、booking confirmation），可直接看到邮件历史。

---

## 4. Owner Dashboard 操作说明

打开 `http://localhost:3000/dashboard`

### 4.1 界面布局

```
[ 顶部导航：Tend · Dashboard · Inbox ]
[ 左侧案例列表 ]  [ 右侧案例详情 ]
  Jane Kim          状态 + 时间线
  Tom R.            待审批 Draft（如有）
  Marcus L.         Escalation 提示（如有）
  Sarah M.
```

- 左侧点击案例切换详情
- 右侧详情每 3 秒自动刷新（polling）
- 状态下方的小字是 `paused_reason`（系统暂停原因）或 `current_step`

### 4.2 Draft 审批

当系统生成了需要你确认的草稿（如 `approve_fit`、`confirm_booking`），右侧详情区会出现 Draft 卡片，包含：

- **邮件主题 + 正文预览**
- 三个操作按钮：

| 按钮 | 行为 |
|---|---|
| **Approve** | 直接发出，Harness 继续执行下一步 |
| **Edit & Approve** | 弹出编辑框修改正文后发出 |
| **Reject** | 丢弃该 draft，案例保持当前状态（你需手动处理） |

### 4.3 Escalation 确认

当 Harness 判断超出自动化范围（如 cancel_requested），会把案例 escalate 给你，右侧显示 escalation 提示。点击 **Acknowledge** 清除提示，表示你已接手处理。

---

## 5. Mock Inbox 操作说明

打开 `http://localhost:3000/inbox`

### 5.1 界面布局

```
[ 顶部导航：Tend · Dashboard · Inbox ]
[ 左侧邮件列表 ]       [ 右侧邮件详情 ]
  Jane Kim               To / Subject / Sent
    ↳ Tell us about...   Body（全文）
  Marcus L.              Action badge（邮件类型）
    ↳ Tell us about...   [Simulate Client Reply — 仅 intake 邮件且案例在 intake_pending 时出现]
    ↳ Next steps...
  Sarah M.
    ↳ ...
```

- 左侧按客户分组，点击邮件切换详情
- 每 3 秒自动刷新，新邮件实时出现
- Action badge 显示邮件类型（Intake / Fit Confirmation / Booking Confirmation 等）

### 5.2 Simulate Client Reply

当案例处于 `intake_pending` 状态时，对应的 intake 邮件右侧会出现 **"Simulate Client Reply"** 按钮：

1. 点击按钮 → 弹出 modal
2. 两个字段已预填默认值（可直接使用或修改）：
   - What brings you here? → `"Work stress and anxiety"`
   - What are you hoping to work on? → `"Build coping strategies and find more balance"`
3. 点击 **Send Reply** → 触发 `intake_information_completed` 事件
4. 成功后 modal 关闭，显示确认文字："Reply sent — case advancing to fit review."
5. 切到 Dashboard → 案例已进入 `fit_review`，draft 等待审批

---

## 6. 完整 Happy Path 演示（全 UI，无 curl）

这是推荐的核心演示流程，**全程不需要任何命令行操作**。

### 阶段 1 — 客户提交预约表单

1. 打开 `http://localhost:3000/entry-form.html`
2. 填写表单 → 点击提交
3. 成功提示："Got it — I'll take a look and follow up shortly."

**后台：** `new_lead` → [auto] `send_intake_email` → `intake_pending`

---

### 阶段 2 — 在 Inbox 模拟客户回复

1. 打开 `http://localhost:3000/inbox`
2. 左侧出现新客户的 intake 邮件（"Tell us about yourself"）
3. 点击该邮件 → 右侧出现 **"Simulate Client Reply"** 按钮
4. 点击 → 确认默认内容 → **Send Reply**

**后台：** `intake_pending` → `fit_review`（直接转换，无 agent action）

---

### 阶段 3 — Dashboard 审批 fit

1. 切到 `http://localhost:3000/dashboard`
2. 右侧出现 `approve_fit` Draft
3. 点击 **Approve**

**后台：** `fit_review` → `fit_confirmed` → [auto] `propose_time_slots` → `awaiting_client_confirmation`（一次审批，两步连续完成）

---

### 阶段 4 — 客户选择时间段

1. 打开 `http://localhost:3000/select-time?case_id=<case_id>`（case ID 从 Dashboard URL 获取）
2. 选择一个时间段 → 点击 **Confirm**

**后台：** Harness 生成 `confirm_booking` draft

---

### 阶段 5 — Dashboard 审批 booking confirmation

1. 切回 Dashboard → 右侧出现 `confirm_booking` Draft
2. 点击 **Approve**

案例变为 `booked`（Booked ✓）。

---

### 阶段 6 — 在 Inbox 查看 booking confirmation 邮件

1. 切到 Inbox → 左侧出现 "Your session is confirmed" 邮件
2. 展示系统自动发出的完整确认邮件

**演示完成。**

---

## 7. 其他可演示的场景

### 7.1 客户没有合适的时间段

在 select-time 页面点击 **"None of these work"** → Harness 重新执行 `propose_time_slots`，案例继续停在 `awaiting_client_confirmation`。也可直接用 case_003（Marcus L.）演示。

### 7.2 Escalation / 手动接管

case_002（Tom R.）已在 `cancel_requested` 且被 escalate：

1. Dashboard 点击 Tom R. → 右侧显示 escalation 提示
2. 点击 **Acknowledge** 清除提示
3. 你手动处理（系统不再自动化）

### 7.3 Draft 编辑后审批

任何 Draft 节点都支持 Edit & Approve：点击 → 弹出编辑框修改正文 → 发出修改版本。

### 7.4 从 seed 案例直接走完 happy path

不从 entry form 开始，直接用 case_001（Jane Kim，已在 `fit_review`）：

1. Dashboard 点击 Jane Kim → 审批 `approve_fit` draft
2. 案例跳到 `awaiting_client_confirmation`
3. 打开 `http://localhost:3000/select-time?case_id=case_001` → 选时间
4. 回 Dashboard → 审批 `confirm_booking` draft → `booked`

---

## 8. 重置数据

内存 store 在 server 重启时完全重置回 4 条 seed 案例（含对应邮件）：

```bash
# 停止当前 dev server（Ctrl+C）然后重启
npm run dev
```

---

## 9. 快速 API 参考

| 操作 | 命令 |
|---|---|
| 查看所有案例 | `curl http://localhost:3000/api/cases` |
| 查看单个案例 | `curl http://localhost:3000/api/cases/<id>` |
| 查看时间线 | `curl http://localhost:3000/api/cases/<id>/timeline` |
| 查看待审批 drafts | `curl http://localhost:3000/api/cases/<id>/drafts` |
| 查看所有邮件（分组） | `curl http://localhost:3000/api/inbox` |
| 审批 draft | `curl -X POST http://localhost:3000/api/drafts/<draftId>/approve` |
| 拒绝 draft | `curl -X POST http://localhost:3000/api/drafts/<draftId>/reject` |
| 触发事件 | `curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d '{"case_id":"...","type":"...","payload":{}}'` |
| 健康检查 | `curl http://localhost:3000/api/health` |

---

## 10. 状态机速查

```
entry-form → new_lead
  → [auto]  send_intake_email → intake_pending
  → [event] intake_information_completed → fit_review   ← inbox "Simulate Client Reply"
  → [draft] approve_fit → fit_confirmed
  → [auto]  propose_time_slots → awaiting_client_confirmation
  → [draft] confirm_booking → booked
```

三种自动化级别：
- **auto** — Harness 直接执行，无需你介入
- **draft** — 系统生成草稿，等你在 Dashboard 审批
- **manual** — escalate 给你，系统退出，你全权处理
