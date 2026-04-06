# Tend — Harness SSOT Design Blueprint
### Version: v0.1 | Status: Authoritative

> 本文档是 Tend 系统 Harness 层的单一事实来源（Single Source of Truth）。
> 所有 Layer 1 设计决策均已收束于此，可直接用于 Layer 2 Harness Skeleton 的实现。

---

## 0. 设计原则

```
Agent     推理    — 理解意图，在约束内选择动作，生成回复
Harness   控制    — 执行循环，上下文注入，状态转换，policy 执行
Application 定义  — 状态机、策略、数据模型
```

**核心约束：**
1. 状态转换由 **Harness 中的确定性代码** 驱动，不由 Agent 驱动
2. Agent 只能选择当前 state 下 **allowed actions** 中的动作
3. 任何有外部副作用的动作都经过 **policy_check** 拦截
4. 不确定时默认 `create_draft + notify_owner`，不猜测，不自行执行
5. 任何用户可见的状态变化必须有对应的 communication（draft 或 auto）

---

## 1. 状态机

### 1.1 Final State List（11个）

| State | 含义 | 类型 |
|---|---|---|
| `new_lead` | 新 inquiry 刚进入系统 | 初始 |
| `intake_pending` | 正在收集 / 等待客户信息 | 活跃 |
| `fit_review` | 已有足够信息，评估 practitioner-client fit | 活跃 |
| `fit_confirmed` | Fit 成立，进入具体 booking | 活跃 |
| `awaiting_client_confirmation` | 已发出时间选项，等待客户确认 | 等待 |
| `booked` | 预约已确认（含 reminder 已安排） | 稳定 |
| `cancel_requested` | 客户提出取消，处理中 | 活跃 |
| `cancelled` | 预约已取消 | 终态 |
| `reschedule_requested` | 客户提出改期，待处理 | 活跃 |
| `reschedule_in_progress` | 正在为改期发送新时间选项 | 活跃 |
| `completed` | Session 已完成 | 终态 |

**已移除：** `slot_proposal_sent`（合并入 `awaiting_client_confirmation`）、`reminder_scheduled`（合并入 `booked`）

---

### 1.2 Transition Table

#### A. Initial Booking Flow

| From | Trigger | To | Notes |
|---|---|---|---|
| `new_lead` | `booking_inquiry_submitted` | `intake_pending` | action: `send_intake_email` |
| `intake_pending` | `intake_information_completed` | `fit_review` | — |
| `fit_review` | `fit_review_completed {confirmed}` | `fit_confirmed` | action: `approve_fit` (draft) |
| `fit_review` | `fit_review_completed {needs_more_info}` | `intake_pending` | action: `request_more_info` (draft) |
| `fit_review` | `fit_review_completed {rejected}` | — (escalated) | ⚠️ 见 §1.3 特殊路径 |
| `fit_confirmed` | action: `propose_time_slots` 完成 | `awaiting_client_confirmation` | action-driven transition |
| `awaiting_client_confirmation` | `slot_selection_received {confirmed}` | `booked` | action: `confirm_booking` (draft) |
| `awaiting_client_confirmation` | `slot_selection_received {needs_other_options}` | `awaiting_client_confirmation` | action: `propose_time_slots` (auto)，留在同状态 |
| `booked` | `reminder_time_reached` | `booked` | action: `schedule_reminder` (auto)，**不改变状态** |
| `booked` | `session_marked_completed` | `completed` | action: `mark_session_completed` (manual) |

#### B. Cancellation Flow

| From | Trigger | To | Notes |
|---|---|---|---|
| `awaiting_client_confirmation` | `cancel_request_received` | `cancelled` | 直接终止，无需走 cancel 流程（无实质承诺） |
| `booked` | `cancel_request_received` | `cancel_requested` | 进入完整 cancel 流程 |
| `cancel_requested` | `cancellation_confirmed` | `cancelled` | action: `confirm_cancellation` (manual) |
| `cancel_requested` | `reschedule_offered_and_accepted` | `reschedule_requested` | action: `offer_reschedule` (draft) |

#### C. Reschedule Flow

| From | Trigger | To | Notes |
|---|---|---|---|
| `booked` | `reschedule_request_received` | `reschedule_requested` | — |
| `reschedule_requested` | action: `propose_reschedule_slots` 完成 | `reschedule_in_progress` | action-driven transition |
| `reschedule_in_progress` | `reschedule_slot_selection_received {confirmed}` | `booked` | action: `confirm_booking` (draft) |
| `reschedule_in_progress` | `reschedule_slot_selection_received {needs_other_options}` | `reschedule_in_progress` | action: `propose_reschedule_slots` (auto)，留在同状态 |
| `reschedule_in_progress` | `cancel_request_received` | escalated | v0.1 fallback: `escalate_to_owner` |

---

### 1.3 特殊路径

#### `fit_review_completed {rejected}`

```
fit_review_completed(rejected) 到达
    ↓
Harness 直接触发 escalate_to_owner（不经过 Agent 决策）
    ↓
Case 暂停，通知 owner
    ↓
Owner 亲自与客户沟通，手动将 case 关闭为 cancelled
```

**原因：** rejected 是高关系敏感节点，沟通方式完全由 practitioner 掌控，不应由系统起草。

#### `cancel_requested` + `client_message_received`（结构化意图接口）

```
client_message_received 到达（case 处于 cancel_requested 状态）
    ↓
Harness 调用 Agent 进行意图分类（special classification step）
    ↓
Agent 返回结构化意图：
  { "intent": "confirm_cancel" | "reschedule" | "unclear" }
    ↓
Harness 将 intent 映射为 system event：
  confirm_cancel  → 内部触发 cancellation_confirmed
  reschedule      → 内部触发 reschedule_offered_and_accepted
  unclear         → 执行 request_more_info action（draft）
    ↓
正常执行循环继续
```

**注意：** 这是 `client_message_received` 的唯一使用结构化意图输出的场景。其他状态下的 `client_message_received` 不使用此模式，Agent 直接从 allowed actions 中选择动作。

---

## 2. Event Model

### 2.1 Final Event List（10个）

#### User-originated Events

| Event | 含义 | 触发来源 |
|---|---|---|
| `booking_inquiry_submitted` | 新预约 inquiry 进入系统 | Squarespace form / web form |
| `client_message_received` | 客户发来自由文本消息 | Email reply |
| `slot_selection_received` | 客户回复时间选项 | Email（payload 含 selection_type） |
| `cancel_request_received` | 客户明确提出取消 | Email / UI |
| `reschedule_request_received` | 客户明确提出改期 | Email / UI |
| `reschedule_slot_selection_received` | 客户回复改期时间选项 | Email（payload 含 selection_type） |

#### System / Workflow Events

| Event | 含义 | 触发来源 |
|---|---|---|
| `intake_information_completed` | 系统判断已收集到足够 intake 信息 | Harness / Agent 判断 |
| `fit_review_completed` | Fit review 结束，带 outcome 字段 | Harness（owner 审批或系统判断） |

#### Time-based Events

| Event | 含义 | 触发来源 |
|---|---|---|
| `reminder_time_reached` | 到达预设的 reminder 时间点 | Scheduler |

#### Owner / Admin Events

| Event | 含义 | 触发来源 |
|---|---|---|
| `session_marked_completed` | Owner 手动标记 session 完成 | Admin UI |

---

### 2.2 Key Event Payloads

```typescript
booking_inquiry_submitted: {
  source: "squarespace_form" | "web_form"
  client_email: string
  client_name?: string
  message?: string
  is_returning_hint?: boolean
  submitted_at: string
}

client_message_received: {
  case_id: string
  channel: "email"
  message_text: string
  received_at: string
}

fit_review_completed: {
  case_id: string
  outcome: "confirmed" | "needs_more_info" | "rejected"
  review_notes?: string
  completed_at: string
}

slot_selection_received: {
  case_id: string
  selection_type: "confirmed" | "needs_other_options"
  selected_slot?: string
  message_text?: string
  received_at: string
}
```

---

### 2.3 Event Routing

**创建新 case：**
- `booking_inquiry_submitted` → 若无匹配活跃 case → 创建新 case，初始状态 `new_lead`

**路由到已有 case（v0.1 优先级）：**
```
1. payload 中的 case_id（v0.1 demo 中所有事件显式携带）
2. 已知 client email 匹配
3. fallback: owner 手动指定
```

---

## 3. Action Schema

### 3.1 Final Action List（12个）

| Action | Allowed States | Automation Level |
|---|---|---|
| `send_intake_email` | `new_lead` | **auto** |
| `request_more_info` | `intake_pending`, `fit_review`, `reschedule_in_progress` | **draft** |
| `approve_fit` | `fit_review` | **draft** |
| `propose_time_slots` | `fit_confirmed`, `awaiting_client_confirmation` | **auto** |
| `confirm_booking` | `awaiting_client_confirmation`, `reschedule_in_progress` | **draft** |
| `schedule_reminder` | `booked` | **auto**（无状态变更） |
| `send_cancellation_reply` | `cancel_requested` | **draft** |
| `confirm_cancellation` | `cancel_requested` | **manual** |
| `offer_reschedule` | `cancel_requested`, `reschedule_requested` | **draft** |
| `propose_reschedule_slots` | `reschedule_requested`, `reschedule_in_progress` | **auto** |
| `escalate_to_owner` | `intake_pending`, `fit_review`, `awaiting_client_confirmation`, `cancel_requested`, `reschedule_requested`, `reschedule_in_progress` | **manual** |
| `mark_session_completed` | `booked` | **manual** |

---

### 3.2 State-by-State Allowed Actions

| State | Allowed Actions |
|---|---|
| `new_lead` | `send_intake_email` |
| `intake_pending` | `request_more_info`, `escalate_to_owner` |
| `fit_review` | `approve_fit`, `request_more_info`, `escalate_to_owner` |
| `fit_confirmed` | `propose_time_slots` |
| `awaiting_client_confirmation` | `propose_time_slots`, `confirm_booking`, `escalate_to_owner` |
| `booked` | `schedule_reminder`, `mark_session_completed` |
| `cancel_requested` | `send_cancellation_reply`, `confirm_cancellation`, `offer_reschedule`, `escalate_to_owner` |
| `cancelled` | _(none)_ |
| `reschedule_requested` | `offer_reschedule`, `propose_reschedule_slots`, `escalate_to_owner` |
| `reschedule_in_progress` | `propose_reschedule_slots`, `request_more_info`, `confirm_booking`, `escalate_to_owner` |
| `completed` | _(none)_ |

---

## 4. Policy / Guardrails

### 4.1 Automation Level 定义

| Level | 含义 | Owner 操作 |
|---|---|---|
| **auto** | 系统直接执行，记录日志 | Timeline 可见，无需操作 |
| **draft** | 系统生成草稿，owner 审批后执行 | 查看 → 编辑（可选）→ Approve / Reject |
| **manual** | 系统不执行，owner 完全接管 | 自行决定并操作 |

### 4.2 Policy Execution Flow

```typescript
// Harness 执行循环中的 policy gate
decision = agent(context)  // { action, params }

policy_result = policy_check(decision.action, case.state)

switch policy_result:
  "auto":
    result = execute_tool(decision.action, decision.params)
    log_trace(case, decision, result)
    next_state = transition_table.lookup(case.state, decision.action)
    if next_state: case.state = next_state

  "draft":
    draft = create_draft(decision)
    notify_owner(case, draft)
    pause_case(case)
    // 等待 owner approve 后继续

  "manual":
    escalate_to_owner(case, decision)
    pause_case(case)
```

### 4.3 Guardrails

**Guardrail 1 — Missing critical info**
```
IF required fields missing for current action
→ block action
→ fallback to request_more_info
```

**Guardrail 2 — Agent uncertainty**
```
IF agent selects escalate_to_owner → Harness 暂停 case，通知 owner
IF agent 无法从 allowed actions 中匹配有效动作 → create_draft + notify_owner
（不猜测，不自行执行）
```

**Guardrail 3 — High-risk state transitions**
以下转换必须经过 draft 或 manual：
- `fit_review → fit_confirmed`（approve_fit: draft）
- `awaiting_client_confirmation → booked`（confirm_booking: draft）
- `cancel_requested → cancelled`（confirm_cancellation: manual）

**Guardrail 4 — Cancellation ordering**
```
IF cancel_request_received (from booked)
→ MUST execute send_cancellation_reply BEFORE confirm_cancellation
```

**Guardrail 5 — No silent transitions**
```
ANY user-visible state change
→ must have a corresponding communication (draft or auto)
```
例外：`awaiting_client_confirmation → cancelled`（直接路径，无承诺，无需通知）

---

## 5. Harness Execution Contract

### 5.1 核心循环

```typescript
function on_event(event: Event): void {
  const case = load_case(event.case_id)

  // 校验 event 在当前状态下是否合法
  validate_event_for_state(event, case.state)

  // 特殊路径：rejected 直接 escalate，不经 Agent
  if (event.type === "fit_review_completed" && event.outcome === "rejected") {
    escalate_to_owner(case, reason: "fit_rejected")
    pause_case(case)
    return
  }

  // 构建上下文（见 §5.2）
  const context = build_context(case, event)

  // 主执行循环
  let iterations = 0
  while (iterations < MAX_ITERATIONS) {
    iterations++

    const decision = agent(context)

    // 特殊路径：cancel_requested 下的意图分类
    if (is_intent_classification_needed(case.state, event)) {
      handle_intent_classification(case, decision.intent)
      break
    }

    const policy_result = policy_check(decision.action, case.state)

    if (policy_result === "auto") {
      const result = execute_tool(decision.action, decision.params)
      log_trace(case, decision, result, policy_result)
      apply_transition(case, decision.action)
      update_context(context, result)
      if (!has_more_actions(decision)) break

    } else if (policy_result === "draft") {
      create_draft(case, decision)
      notify_owner(case)
      pause_case(case)
      break

    } else if (policy_result === "manual") {
      escalate_to_owner(case, decision)
      pause_case(case)
      break
    }
  }
}
```

### 5.2 Context 构建（三层注入）

```
[Tier 1 — 始终完整注入]
  BookingCase 所有字段（state, client info, policy_ref, timestamps）
  当前 state 的 allowed_actions 列表
  PolicyConfig 相关规则

[Tier 2 — 近期消息完整保留]
  最近 3-5 条 Interaction 的完整内容

[Tier 3 — 较早历史压缩为摘要]
  "N 次历史交互，关键节点：..."

[Task]
  当前需要处理的 event 描述
```

**永不压缩：**
- BookingCase 结构化字段
- 当前生效的 policy 约束
- 任何尚未完成的 in-flight 动作

### 5.3 Agent ↔ Harness 接口

**标准场景（Agent 选择 action）：**
```typescript
// Agent 输出
{
  action: ActionName,       // 必须在 allowed_actions 内
  params: Record<string, any>,
  reasoning?: string        // 用于 trace log
}
```

**特殊场景（cancel_requested 下的意图分类）：**
```typescript
// Agent 输出
{
  intent: "confirm_cancel" | "reschedule" | "unclear"
}

// Harness 映射
confirm_cancel → emit cancellation_confirmed → confirm_cancellation action
reschedule     → emit reschedule_offered_and_accepted → offer_reschedule action
unclear        → execute request_more_info action (draft)
```

### 5.4 Trace Log Schema

每次循环迭代产生一条记录：

```typescript
CaseTrace {
  case_id: string
  iteration: number
  timestamp: string

  context_snapshot: {
    case_state: string
    allowed_actions: string[]
    messages_in_context: number
    tokens_used: number
  }

  agent_decision: {
    action_selected: string
    params: Record<string, any>
    reasoning_summary?: string
  }

  harness_execution: {
    pre_hook_result: "allow" | "block" | "draft" | "manual"
    automation_level: "auto" | "draft" | "manual"
    tool_called?: string
    tool_result?: string
    state_transition?: { from: string, to: string }
  }

  outcome: string
  duration_ms: number
}
```

---

## 6. Demo Flow Summary

### Flow A — First-time booking
```
new_lead → intake_pending → fit_review → fit_confirmed
→ awaiting_client_confirmation → booked → completed
```

### Flow B — Returning user
```
new_lead → intake_pending (lightweight) → fit_review → fit_confirmed
→ awaiting_client_confirmation → booked
```

### Flow C — Cancellation
```
booked → cancel_requested → cancelled
         ↘ reschedule_requested（如接受改期建议）
```

### Flow D — Reschedule
```
booked → reschedule_requested → reschedule_in_progress → booked
```

### Flow E — Fit rejected
```
fit_review → escalate_to_owner → [owner handles] → cancelled
```

---

## 7. 设计决策记录（Decision Log）

| 决策 | 内容 | 原因 |
|---|---|---|
| 移除 `slot_proposal_sent` | 合并入 `awaiting_client_confirmation`，由 action 完成驱动转换 | 该状态只是 action 副产品，不等待外部输入 |
| 移除 `reminder_scheduled` | 合并入 `booked`，reminder 记录在 timeline 而非状态 | 同上 |
| Fit approval 命名统一 | action: `approve_fit` / event: `fit_review_completed` | 消除三份文档的命名歧义 |
| Reschedule 阶段不复用 `slot_proposal_sent` | `reschedule_in_progress` 留在同状态 | 状态代表阶段，不代表最近动作 |
| Cancel from `awaiting_client_confirmation` 走直接路径 | 直接 → `cancelled`，不进 cancel flow | 此阶段无实质承诺，无需 policy review |
| `fit_review(rejected)` → `escalate_to_owner` | 不走 Agent，Harness 直接 escalate | Relationship-sensitive，practitioner 全权处理 |
| 结构化意图仅限 `cancel_requested` | `{ intent: ... }` 只在此状态使用 | 其他状态 Agent 直接选 allowed action |
| Guardrail 2 改为可操作形式 | 从"confidence score"改为"action 映射失败时"的行为 | Claude 无原生 confidence 输出 |

---

## 8. Known Out-of-Scope（v0.1）

- `reschedule_in_progress` 中客户放弃改期 → `escalate_to_owner` fallback
- 客户在 `cancelled` / `completed` 后再次联系 → 作为新 case 处理
- 多 practitioner 调度
- 支付 / 退款流程
- 等候列表
- 高并发 event queue
- 多渠道（SMS / WhatsApp）
