# Phase 4：Agent Orchestration Engine

建立 Agent registry、capability contract、provider allowlist、quota reservation、fallback 與 redacted audit。提供者 API key 只存在受保護環境；共享池成員只能看到能力與配額狀態，不會看到其他人的金鑰。

所有模型調用都要有輸入/輸出契約、逾時、有限重試、成本與 RPM/TPM 記錄。單一模型能完成的任務優先使用單一模型。
