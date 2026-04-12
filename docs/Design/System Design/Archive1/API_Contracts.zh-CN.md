下面给出一版可作为当前 **正式 API 文档 v0.1** 的中文版本。它基于你们已经确认的 Harness SSOT Blueprint 所收束出的接口层整理而成，后续工作默认以这份为准。核心约束、状态、事件、动作、policy、execution contract 都与当前 SSOT 保持一致。

---

# Tend API 规范

## 版本

**v0.1**

## 状态

**权威版本**

## 目的

本文档定义 Tend v0.1 的官方 API 表面。

它是以下协作对象之间的协调契约：

* Harness 实现
* Squarespace / demo 页面集成
* Owner dashboard 集成
* Mock email / scheduler / calendar 集成
* 草稿审批工作流

这个 API 被刻意设计为 **event-first**，而不是 CRUD-first。

系统模型如下：

```txt
External input → Event ingress → Harness execution → Action / Policy / Transition → Case read models
```

这遵循当前的 SSOT blueprint，其中：

* 状态迁移由确定性的 Harness 逻辑控制
* 外部系统不能直接修改 case 状态
* UI 读取 case 状态和时间线，并且只通过已批准的 owner actions 介入

---

# 1. 设计原则

## 1.1 Event-first

所有外部触发都应以事件形式进入系统。

客户端和 UI 不应直接 patch booking state。

## 1.2 Read / Act 分离

API 将以下内容分开：

* 用于 case 视图、时间线、草稿、可用动作的 **read endpoints**
* 用于事件接入和 owner actions 的 **act endpoints**

## 1.3 由 Harness 控制状态迁移

任何公开 API 都不得直接设置：

* `case.state`
* transition history
* action outcome

这些都由 Harness runtime 持有。

## 1.4 Draft / manual control 是一等能力

对于 `draft` 和 `manual` policy 路径，面向 owner 的 endpoints 是官方 API 的组成部分。

---

# 2. 规范域类型

## 2.1 BookingState

```ts
type BookingState =
  | "new_lead"
  | "intake_pending"
  | "fit_review"
  | "fit_confirmed"
  | "awaiting_client_confirmation"
  | "booked"
  | "cancel_requested"
  | "cancelled"
  | "reschedule_requested"
  | "reschedule_in_progress"
  | "completed"
```

这份状态列表是 v0.1 的权威定义。

---

## 2.2 EventType

```ts
type EventType =
  | "booking_inquiry_submitted"
  | "client_message_received"
  | "slot_selection_received"
  | "cancel_request_received"
  | "reschedule_request_received"
  | "reschedule_slot_selection_received"
  | "intake_information_completed"
  | "fit_review_completed"
  | "reminder_time_reached"
  | "session_marked_completed"
```

这份事件列表是 v0.1 的权威定义。

---

## 2.3 ActionType

```ts
type ActionType =
  | "send_intake_email"
  | "request_more_info"
  | "approve_fit"
  | "propose_time_slots"
  | "confirm_booking"
  | "schedule_reminder"
  | "send_cancellation_reply"
  | "confirm_cancellation"
  | "offer_reschedule"
  | "propose_reschedule_slots"
  | "escalate_to_owner"
  | "mark_session_completed"
```

这份动作列表是 v0.1 的权威定义。

---

## 2.4 AutomationLevel

```ts
type AutomationLevel = "auto" | "draft" | "manual"
```

---

# 3. 规范资源结构

## 3.1 BookingCase

```ts
type BookingCase = {
  id: string
  state: BookingState
  client_email: string
  client_name?: string
  source?: "squarespace_form" | "web_form" | "email"
  is_returning_hint?: boolean

  created_at: string
  updated_at: string

  current_step?: string
  paused_reason?: string | null
}
```

---

## 3.2 EventEnvelope

```ts
type EventEnvelope = {
  id?: string
  type: EventType
  case_id?: string
  payload: Record<string, any>
  created_at?: string
}
```

---

## 3.3 ActionRequest

```ts
type ActionRequest = {
  action: ActionType
  params?: Record<string, any>
}
```

---

## 3.4 AvailableAction

```ts
type AvailableAction = {
  action: ActionType
  policy: AutomationLevel
}
```

---

## 3.5 TimelineEntry

```ts
type TimelineEntry = {
  id: string
  timestamp: string
  type: "event" | "action" | "state_change" | "draft" | "system_note"
  content: string
  metadata?: Record<string, any>
}
```

---

## 3.6 Draft

```ts
type Draft = {
  id: string
  case_id: string
  action: ActionType
  status: "pending" | "approved" | "rejected" | "sent"
  channel?: "email"
  subject?: string
  body?: string
  created_at: string
  updated_at: string
}
```

---

# 4. API 表面概览

## 4.1 Event ingress

* `POST /events`
* `POST /webhooks/squarespace`
* `POST /webhooks/email`
* `POST /webhooks/scheduler`

## 4.2 Read models

* `GET /cases`
* `GET /cases/:caseId`
* `GET /cases/:caseId/timeline`
* `GET /cases/:caseId/available-actions`
* `GET /cases/:caseId/drafts`

## 4.3 Owner actions

* `POST /cases/:caseId/actions`
* `POST /drafts/:draftId/approve`
* `POST /drafts/:draftId/reject`
* `POST /drafts/:draftId/edit-and-approve`

## 4.4 可选的 debug / demo endpoints

* `POST /cases`
* `GET /health`

---

# 5. Event Ingress APIs

## 5.1 POST /events

### 目的

规范事件接入 endpoint。

所有基于事件的触发都可以发送到这里，而不论其原始来源是什么。

### 请求体

```json
{
  "type": "booking_inquiry_submitted",
  "case_id": "case_123",
  "payload": {
    "source": "squarespace_form",
    "client_email": "jane@example.com",
    "client_name": "Jane",
    "message": "I’d like to book a 1:1 session",
    "submitted_at": "2026-04-05T21:30:00Z"
  }
}
```

### 响应

```json
{
  "accepted": true,
  "event_id": "evt_001",
  "case_id": "case_123",
  "status": "queued"
}
```

### 说明

* `case_id` 只有在 `booking_inquiry_submitted` 场景下才是可选的
* 对于其他所有事件，在 v0.1 中都应提供 `case_id`
* 系统会先验证该事件在当前 case 状态下是否合法，然后才处理

---

## 5.2 POST /webhooks/squarespace

### 目的

Squarespace demo 表单接入 endpoint。

该 endpoint 会把原始的 Squarespace 表单数据转换成规范的 `booking_inquiry_submitted` 事件。

### 请求体

```json
{
  "email": "jane@example.com",
  "name": "Jane",
  "message": "I want to book a private yoga session",
  "is_returning": false
}
```

### 内部映射

```json
{
  "type": "booking_inquiry_submitted",
  "payload": {
    "source": "squarespace_form",
    "client_email": "jane@example.com",
    "client_name": "Jane",
    "message": "I want to book a private yoga session",
    "is_returning_hint": false
  }
}
```

### 响应

```json
{
  "accepted": true,
  "case_id": "case_123"
}
```

---

## 5.3 POST /webhooks/email

### 目的

用于 mock 或真实入站邮件处理的 email ingress endpoint。

这个 endpoint 会将入站邮件转换为以下事件之一：

* `client_message_received`
* `cancel_request_received`
* `reschedule_request_received`
* `slot_selection_received`
* `reschedule_slot_selection_received`

具体取决于上游路由或简化后的 demo 逻辑。

### 请求体

```json
{
  "case_id": "case_123",
  "from": "jane@example.com",
  "subject": "Re: Your session",
  "body": "Wednesday works for me",
  "received_at": "2026-04-05T22:00:00Z"
}
```

### 响应

```json
{
  "accepted": true,
  "normalized_event_type": "slot_selection_received",
  "case_id": "case_123"
}
```

### 说明

在 v0.1 demo 模式下，上游归一化逻辑可以做得更简化、更显式。

---

## 5.4 POST /webhooks/scheduler

### 目的

Scheduler / timer ingress endpoint。

用于 reminder 触发这类时间驱动事件。

### 请求体

```json
{
  "type": "reminder_time_reached",
  "case_id": "case_123",
  "payload": {
    "scheduled_for": "2026-04-06T16:00:00Z",
    "triggered_at": "2026-04-06T16:00:00Z"
  }
}
```

### 响应

```json
{
  "accepted": true,
  "event_id": "evt_900",
  "case_id": "case_123"
}
```

---

# 6. Read APIs

## 6.1 GET /cases

### 目的

为 owner dashboard 列出 cases。

### 查询参数

* `state` 可选
* `limit` 可选
* `cursor` 可选

### 响应

```json
{
  "items": [
    {
      "id": "case_123",
      "state": "fit_review",
      "client_email": "jane@example.com",
      "client_name": "Jane",
      "created_at": "2026-04-05T21:30:00Z",
      "updated_at": "2026-04-05T21:45:00Z"
    }
  ],
  "next_cursor": null
}
```

### 说明

在 v0.1 中，分页可以保持轻量化。

---

## 6.2 GET /cases/:caseId

### 目的

获取当前 case 的 read model。

### 响应

```json
{
  "id": "case_123",
  "state": "awaiting_client_confirmation",
  "client_email": "jane@example.com",
  "client_name": "Jane",
  "source": "squarespace_form",
  "created_at": "2026-04-05T21:30:00Z",
  "updated_at": "2026-04-05T22:15:00Z",
  "current_step": "Waiting for client to confirm slot",
  "paused_reason": null
}
```

---

## 6.3 GET /cases/:caseId/timeline

### 目的

获取同时适用于 owner UI 和调试的人类可读、系统可读时间线。

### 响应

```json
{
  "items": [
    {
      "id": "tl_001",
      "timestamp": "2026-04-05T21:30:00Z",
      "type": "event",
      "content": "Booking inquiry submitted from Squarespace form"
    },
    {
      "id": "tl_002",
      "timestamp": "2026-04-05T21:31:00Z",
      "type": "action",
      "content": "System sent intake email",
      "metadata": {
        "action": "send_intake_email",
        "policy": "auto"
      }
    },
    {
      "id": "tl_003",
      "timestamp": "2026-04-05T21:31:00Z",
      "type": "state_change",
      "content": "Case moved from new_lead to intake_pending"
    }
  ]
}
```

### 说明

这个 endpoint 是一等能力。demo 和 owner trust layer 都依赖它。这与 blueprint 对 traceability 和 visibility 的要求一致。

---

## 6.4 GET /cases/:caseId/available-actions

### 目的

在完成状态和 policy 过滤后，返回当前 case 合法可执行的 actions。

### 响应

```json
{
  "case_id": "case_123",
  "state": "fit_review",
  "actions": [
    {
      "action": "approve_fit",
      "policy": "draft"
    },
    {
      "action": "request_more_info",
      "policy": "draft"
    },
    {
      "action": "escalate_to_owner",
      "policy": "manual"
    }
  ]
}
```

### 说明

这个 endpoint 应当反映 SSOT 中按 state 列出的 allowed action table。

---

## 6.5 GET /cases/:caseId/drafts

### 目的

获取某个 case 的待处理草稿和历史草稿。

### 响应

```json
{
  "items": [
    {
      "id": "draft_001",
      "case_id": "case_123",
      "action": "approve_fit",
      "status": "pending",
      "channel": "email",
      "subject": "Next steps for your session",
      "body": "Thanks for sharing more about your goals...",
      "created_at": "2026-04-05T22:20:00Z",
      "updated_at": "2026-04-05T22:20:00Z"
    }
  ]
}
```

---

# 7. Owner Action APIs

## 7.1 POST /cases/:caseId/actions

### 目的

执行由 owner 触发的 action 或手动 override。

适用场景：

* manual actions
* debug/demo control
* v0.1 中的 owner takeover

### 请求体

```json
{
  "action": "mark_session_completed",
  "params": {}
}
```

### 响应

```json
{
  "case_id": "case_123",
  "action": "mark_session_completed",
  "result": "executed",
  "state": "completed"
}
```

### 规则

* action 必须在当前状态下有效
* action 必须遵守 policy
* 对于 `draft` actions，这个 endpoint 通常应创建 draft，而不是绕过 policy
* `manual` actions 可由 owner 通过这个 endpoint 执行

---

## 7.2 POST /drafts/:draftId/approve

### 目的

批准并执行一个待处理 draft。

### 请求体

```json
{
  "approved_by": "owner_001"
}
```

### 响应

```json
{
  "draft_id": "draft_001",
  "status": "sent",
  "case_id": "case_123"
}
```

---

## 7.3 POST /drafts/:draftId/reject

### 目的

拒绝一个待处理 draft。

### 请求体

```json
{
  "rejected_by": "owner_001",
  "reason": "Need different tone"
}
```

### 响应

```json
{
  "draft_id": "draft_001",
  "status": "rejected"
}
```

---

## 7.4 POST /drafts/:draftId/edit-and-approve

### 目的

编辑 draft 内容，然后批准执行。

### 请求体

```json
{
  "approved_by": "owner_001",
  "subject": "Updated subject",
  "body": "Edited message body"
}
```

### 响应

```json
{
  "draft_id": "draft_001",
  "status": "sent",
  "case_id": "case_123"
}
```

---

# 8. 可选的 Debug / Demo APIs

## 8.1 POST /cases

### 目的

直接创建一个 case，用于测试或 demo 初始化。

### 请求体

```json
{
  "client_email": "seed@example.com",
  "client_name": "Seed User",
  "source": "web_form"
}
```

### 响应

```json
{
  "id": "case_seed_001",
  "state": "new_lead"
}
```

### 说明

这是一个方便 demo 和开发者工作流使用的便捷 endpoint。在真实运行场景中，外部系统应优先通过 event ingress 进入系统。

---

## 8.2 GET /health

### 响应

```json
{
  "status": "ok"
}
```

---

# 9. 规范事件 Payload 契约

## 9.1 booking_inquiry_submitted

```json
{
  "type": "booking_inquiry_submitted",
  "payload": {
    "source": "squarespace_form",
    "client_email": "jane@example.com",
    "client_name": "Jane",
    "message": "I’d like to book a session",
    "is_returning_hint": false,
    "submitted_at": "2026-04-05T21:30:00Z"
  }
}
```

## 9.2 client_message_received

```json
{
  "type": "client_message_received",
  "case_id": "case_123",
  "payload": {
    "channel": "email",
    "message_text": "Can you tell me a bit more about the class?",
    "received_at": "2026-04-05T22:00:00Z"
  }
}
```

## 9.3 fit_review_completed

```json
{
  "type": "fit_review_completed",
  "case_id": "case_123",
  "payload": {
    "outcome": "confirmed",
    "review_notes": "Client goals and modality fit well",
    "completed_at": "2026-04-05T22:10:00Z"
  }
}
```

v0.1 中允许的 `outcome` 值：

* `confirmed`
* `needs_more_info`
* `rejected`

这与当前 SSOT 保持一致。

## 9.4 slot_selection_received

```json
{
  "type": "slot_selection_received",
  "case_id": "case_123",
  "payload": {
    "selection_type": "confirmed",
    "selected_slot": "2026-04-10T15:00:00Z",
    "message_text": "Wednesday 3pm works for me",
    "received_at": "2026-04-05T22:15:00Z"
  }
}
```

## 9.5 cancel_request_received

```json
{
  "type": "cancel_request_received",
  "case_id": "case_123",
  "payload": {
    "channel": "email",
    "message_text": "I need to cancel",
    "received_at": "2026-04-05T22:20:00Z"
  }
}
```

## 9.6 reschedule_request_received

```json
{
  "type": "reschedule_request_received",
  "case_id": "case_123",
  "payload": {
    "channel": "email",
    "message_text": "Can I move this to next week?",
    "received_at": "2026-04-05T22:20:00Z"
  }
}
```

## 9.7 reschedule_slot_selection_received

```json
{
  "type": "reschedule_slot_selection_received",
  "case_id": "case_123",
  "payload": {
    "selection_type": "needs_other_options",
    "message_text": "None of those work",
    "received_at": "2026-04-05T22:30:00Z"
  }
}
```

## 9.8 reminder_time_reached

```json
{
  "type": "reminder_time_reached",
  "case_id": "case_123",
  "payload": {
    "scheduled_for": "2026-04-06T16:00:00Z",
    "triggered_at": "2026-04-06T16:00:00Z"
  }
}
```

## 9.9 session_marked_completed

```json
{
  "type": "session_marked_completed",
  "case_id": "case_123",
  "payload": {
    "marked_by": "owner_001",
    "completed_at": "2026-04-06T20:00:00Z"
  }
}
```

---

# 10. State-to-Action 契约

该 API 必须强制执行以下 state-to-action 可用性：

| State                          | Allowed Actions                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `new_lead`                     | `send_intake_email`                                                                        |
| `intake_pending`               | `request_more_info`, `escalate_to_owner`                                                   |
| `fit_review`                   | `approve_fit`, `request_more_info`, `escalate_to_owner`                                    |
| `fit_confirmed`                | `propose_time_slots`                                                                       |
| `awaiting_client_confirmation` | `propose_time_slots`, `confirm_booking`, `escalate_to_owner`                               |
| `booked`                       | `schedule_reminder`, `mark_session_completed`                                              |
| `cancel_requested`             | `send_cancellation_reply`, `confirm_cancellation`, `offer_reschedule`, `escalate_to_owner` |
| `cancelled`                    | none                                                                                       |
| `reschedule_requested`         | `offer_reschedule`, `propose_reschedule_slots`, `escalate_to_owner`                        |
| `reschedule_in_progress`       | `propose_reschedule_slots`, `request_more_info`, `confirm_booking`, `escalate_to_owner`    |
| `completed`                    | none                                                                                       |

这张表来自当前 SSOT，在 v0.1 中必须被视为权威定义。

---

# 11. 错误模型

## 11.1 通用错误响应

```json
{
  "error": {
    "code": "INVALID_EVENT_FOR_STATE",
    "message": "Event cancel_request_received is not valid for state completed"
  }
}
```

## 11.2 错误码

* `INVALID_EVENT_FOR_STATE`
* `INVALID_ACTION_FOR_STATE`
* `POLICY_BLOCKED`
* `CASE_NOT_FOUND`
* `DRAFT_NOT_FOUND`
* `VALIDATION_ERROR`
* `UNSUPPORTED_EVENT`
* `INTERNAL_ERROR`

---

# 12. 协调规则

这些规则是官方契约的一部分。

## 12.1 Frontend / UI

* UI 从 `/cases`、`/cases/:id`、`/timeline`、`/available-actions`、`/drafts` 读取数据
* UI 不直接 patch case state
* owner intervention 通过 `/cases/:id/actions` 或 `/drafts/...` 进行

## 12.2 Squarespace 集成

* Squarespace 提交到 `/webhooks/squarespace`
* backend 归一化为规范的 `booking_inquiry_submitted`

## 12.3 Harness runtime

* Harness 消费规范事件
* Harness 是唯一允许应用状态迁移的层
* policy gating 在任何会产生副作用的执行之前发生

## 12.4 Mock services

* email、scheduler、calendar 可以在 API 背后使用假的实现
* 即使底层实现是 mocked，公开 API 结构也应保持稳定

---

# 13. v0.1 实现指导

对于 hack/demo 版本，这个 API 可以使用以下技术实现：

* TypeScript
* Express 或 Next.js route handlers
* in-memory store 或简单的 JSON/SQLite
* mocked email/calendar providers

推荐的内部架构：

* `routes/` 用于 HTTP transport
* `services/events.ts` 用于 event normalization
* `harness/onEvent.ts` 用于 execution loop entry
* `services/cases.ts` 用于 case store
* `services/drafts.ts` 用于 draft lifecycle
* `services/timeline.ts` 用于 timeline append/read

---

# 14. 最终立场

这份 API 规范是 Tend v0.1 的官方协调契约。

如果后续实现细节发生偏离，正确的处理路径应当是：

1. 如果系统语义发生变化，先更新 SSOT blueprint
2. 然后更新这份 API spec
3. 最后再更新实现

实现不应静默偏离这份规范，也不应静默偏离当前的 Harness SSOT Blueprint。

如果你要，我下一步可以继续把这份文档压成更工程化的版本：**OpenAPI 风格的 endpoint spec + TypeScript types**。
