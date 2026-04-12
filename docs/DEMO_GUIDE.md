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
| `http://localhost:3000/entry-form.html` | 客户预约入口表单 | 模拟客户提交 |
| `http://localhost:3000/select-time?caseId=<id>` | 客户选择时间段页面 | 模拟客户选时间 |

---

## 3. 预置 Seed 数据

每次重启服务器后，以下 4 条案例自动存在：

| Case ID | 客户 | 当前状态 | 说明 |
|---|---|---|---|
| `case_001` | Jane Kim | `fit_review` | 有一条待审批的 `approve_fit` draft，适合演示 Draft 审批流 |
| `case_002` | Tom R. | `cancel_requested` | 已被 escalate 给你，适合演示 escalation 场景 |
| `case_003` | Marcus L. | `awaiting_client_confirmation` | 等客户选时间，适合演示时间选择流 |
| `case_004` | Sarah M. | `booked` | 已完成预订，用于展示最终状态 |

---

## 4. Owner Dashboard 操作说明

打开 `http://localhost:3000/dashboard`

### 4.1 界面布局

```
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

## 5. 完整 Happy Path 演示（新建一条案例到 booked）

这是核心演示流程，共 5 个阶段。

### 阶段 1 — 客户提交预约表单

1. 打开 `http://localhost:3000/entry-form.html`
2. 填写表单（任意内容）→ 点击提交
3. 成功提示："Got it — I'll take a look and follow up shortly."
4. 切回 Dashboard → 左侧出现新案例，状态 `intake_pending`（Awaiting intake）

**后台发生了什么：**
- Squarespace webhook 触发
- Harness 自动执行 `send_intake_email`（auto 级别，无需审批）
- 状态：`new_lead` → `intake_pending`

---

### 阶段 2 — 模拟客户完成 intake 表单

客户收到 intake 邮件后填写并回复。用 API 模拟这个事件：

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "case_005",
    "type": "intake_information_completed",
    "payload": {
      "responses": {
        "primary_concern": "Work stress and anxiety",
        "therapy_history": "None",
        "goals": "Build coping strategies"
      }
    }
  }'
```

> 把 `case_005` 替换成实际 case ID（从 Dashboard URL 或 API 获取）。

Dashboard 刷新后案例变为 `fit_review`（Ready for your review）。

**后台发生了什么：**
- 直接状态转换（SSOT 规定无 agent action）
- 状态：`intake_pending` → `fit_review`

---

### 阶段 3 — 你审批 fit

1. Dashboard 右侧出现 `approve_fit` Draft：
   - Subject: "Next steps for your session"
   - Body: 系统生成的 fit 确认邮件
2. 点击 **Approve**（或 Edit & Approve 修改正文）

**后台发生了什么：**
- Harness 接收 approved_draft_action
- 状态：`fit_review` → `fit_confirmed`
- 自动执行 `propose_time_slots`（auto 级别）
- 状态：`fit_confirmed` → `awaiting_client_confirmation`

Dashboard 立刻跳到 `awaiting_client_confirmation`（Waiting on client）——两步在一次审批后连续完成。

---

### 阶段 4 — 模拟客户选择时间段

**方式 A — 使用真实的选时间页面（推荐）：**

1. 打开 `http://localhost:3000/select-time?caseId=<case_id>`
2. 选择一个时间段 → 点击 Confirm
3. 成功页面："You're confirmed."

**方式 B — 直接 API：**

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "case_005",
    "type": "slot_selection_received",
    "payload": {
      "selection_type": "confirmed",
      "selected_slot": "Fri Apr 18 · 10:00 AM · 60 min"
    }
  }'
```

Dashboard 出现 `confirm_booking` Draft。

---

### 阶段 5 — 你审批 booking confirmation

1. Dashboard 右侧出现 `confirm_booking` Draft：
   - Subject: "Your session is confirmed"
   - Body: 确认邮件正文
2. 点击 **Approve**

案例变为 `booked`（Booked ✓）。演示完成。

---

## 6. 其他可演示的场景

### 6.1 客户没有合适的时间段

在 select-time 页面点击 **"None of these work"** → 触发 `needs_other_options`，Harness 重新执行 `propose_time_slots`，案例继续停在 `awaiting_client_confirmation`（实际产品中会发新一批时间选项）。

也可以用 case_003（Marcus L.，已在 `awaiting_client_confirmation`）直接演示这个场景。

### 6.2 Escalation / 手动接管

case_002（Tom R.）已处于 `cancel_requested` 且被 escalate：

1. Dashboard 点击 Tom R.
2. 右侧显示 escalation 提示
3. 点击 **Acknowledge** 清除提示
4. 你手动处理（系统不会继续自动化）

### 6.3 Draft 编辑后审批

任何出现 Draft 的节点都支持 Edit & Approve：

1. 点击 **Edit & Approve**
2. 弹出输入框，修改邮件正文
3. 确认后发出修改版本

### 6.4 使用已有的 seed 案例走完 happy path

不用从 entry form 开始，可以直接用 case_001（Jane Kim，已在 `fit_review`）：

1. Dashboard 点击 Jane Kim → 审批 `approve_fit` draft
2. 等 Dashboard 刷新 → 案例跳到 `awaiting_client_confirmation`
3. 打开 `http://localhost:3000/select-time?caseId=case_001` → 选时间
4. 回到 Dashboard → 审批 `confirm_booking` draft
5. 案例变为 `booked`

---

## 7. 重置数据

内存 store 在 server 重启时完全重置回 4 条 seed 案例：

```bash
# 停止当前 dev server（Ctrl+C）然后重启
npm run dev
```

---

## 8. 快速 API 参考

| 操作 | 命令 |
|---|---|
| 查看所有案例 | `curl http://localhost:3000/api/cases` |
| 查看单个案例 | `curl http://localhost:3000/api/cases/<id>` |
| 查看时间线 | `curl http://localhost:3000/api/cases/<id>/timeline` |
| 查看待审批 drafts | `curl http://localhost:3000/api/cases/<id>/drafts` |
| 审批 draft | `curl -X POST http://localhost:3000/api/drafts/<draftId>/approve` |
| 拒绝 draft | `curl -X POST http://localhost:3000/api/drafts/<draftId>/reject` |
| 触发事件 | `curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d '{"case_id":"...","type":"...","payload":{}}'` |
| 健康检查 | `curl http://localhost:3000/api/health` |

---

## 9. 状态机速查

```
entry-form → new_lead
  → [auto] send_intake_email → intake_pending
  → [event] intake_information_completed → fit_review
  → [draft] approve_fit → fit_confirmed
  → [auto] propose_time_slots → awaiting_client_confirmation
  → [draft] confirm_booking → booked
```

三种自动化级别：
- **auto** — Harness 直接执行，无需你介入
- **draft** — 系统生成草稿，等你在 Dashboard 审批
- **manual** — escalate 给你，系统退出，你全权处理
