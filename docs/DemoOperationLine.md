好，我先把系统的实际状态确认一下，然后给你一个清晰的"操作地图"。好，全貌看清楚了。现在直接给你一个可以实际操作的"地图"，把所有线串起来。

---

## 你的 Demo 有三条操作线

把它想成三个不同的"角色视角"，每条线对应一个操作场景：

---

### 线 A — 快速核心展示（2分钟，最推荐）

**适合：** 给客户第一次看，想快速展示系统最核心的价值——Harness 自动执行 + owner 审批控制

**你的操作路径：**

```
/dashboard
  → 点击 Jane Kim（已在 fit_review，amber 点）
  → 右侧看到 Draft 卡片："Next steps for your session"
  → 点 Approve
  → 看 Dashboard 自动刷新：case 跳到 awaiting_client_confirmation
  → Timeline 新增两条 AUTO 条目（propose_time_slots 自动执行了）

另开一个 tab：/select-time?case_id=case_001
  → 选一个时间段 → 点 Confirm

回到 /dashboard
  → 右侧新 Draft："Your session is confirmed"
  → 点 Approve
  → case 变成 booked ✓
```

**这条线展示了什么：**
- 系统自动执行（AUTO）
- Owner 审批控制（DRAFT）
- 一次审批触发两步自动推进（approve_fit → fit_confirmed → auto propose_time_slots → awaiting）
- 客户选时间是真实可交互的

---

### 线 B — 完整端到端（5-7分钟）

**适合：** 想展示完整流程，从客户第一次接触到最终预约完成

**你的操作路径：**

```
第一步：客户视角入口
/entry-form.html
  → 填写名字 + 邮件 + 随便写点什么
  → 点 Send
  → 看到："Got it — I'll take a look..."

第二步：切回 Owner 视角
/dashboard
  → 左侧出现新 case，状态 "Awaiting intake"
  → Timeline 里有一条 AUTO：系统已发了 intake 邮件

第三步：模拟客户回复
方式 A（推荐）：
  /inbox → 找到 intake 邮件 → 点 Simulate Client Reply → 填表 → 提交

方式 B（降级备用）：
  终端预备好这条命令，替换 case_id 后执行：
  curl -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -d '{"case_id":"这里换成实际ID","type":"intake_information_completed","payload":{"responses":{"primary_concern":"Work stress","goals":"Build resilience"}}}'

第四步：回到 /dashboard
  → case 变成 "Ready for your review"，有新 Draft
  → 审批 → 自动推进（同线A后半段）
```

**这条线展示了什么：**
- 完整的两端交互（客户提交 → 系统处理 → Owner 介入 → 客户选时间 → 完成）
- "系统在后台运作，Owner 只在关键节点介入"这个核心价值

---

### 线 C — 展示 Escalation（1分钟，单独展示）

**适合：** 展示系统的边界意识——遇到高风险情况系统主动退出

**你的操作路径：**

```
/dashboard
  → 点击 Tom R.（红点，cancel_requested）
  → 右侧是 Escalation Notice（红色边框，没有邮件预览）
  → 说："取消请求涉及关系管理，系统判断这超出了它的自动化边界，主动把控制权还给你"
  → 点 "I'll handle this" → notice 消失，你接管
```

**这条线展示了什么：**
- 系统的自我约束（不是什么都自动化）
- MANUAL 和 DRAFT 的区别
- Owner 信任层的核心设计理念

---

### 线 D — 展示系统自主运行（30秒，对比用）

**适合：** 和需要 Owner 介入的 case 做对比，展示"系统处理中"的状态

```
/dashboard
  → 点击 Marcus L.（"Waiting on client"，无 dot）
  → 右侧没有任何 Draft 或 Escalation
  → Timeline 里没有等待你处理的项目
  → 说："这个 case 系统在自主处理，你不需要做任何事"
```

---

## 把这几条线串成一个 demo 叙事

最自然的顺序是：

1. **开场**：PPT 讲问题（30秒）
2. **线D（30秒）**：先给观众看一个"系统自主运行"的 case，建立"系统在帮你工作"的感知
3. **线A（2分钟）**：核心展示，从 fit_review 开始，审批 → 自动推进 → 客户选时间 → booked
4. **线C（1分钟）**：展示 escalation，说明系统有边界，不会越权
5. **收尾**：说一句"这只是 happy path，取消、改期等流程系统也定义好了"

总时长约 4 分钟，不需要从 entry form 开始，用 seed case 直接跳进核心。

---
