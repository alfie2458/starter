# Phase 6：整合與跨引擎協調

所有引擎透過 versioned coordination event 互通，不直接讀取彼此內部資料。整合層負責 workspace 權限、correlation id、審計、重試與事件去重。外部內容與 webhook 都必須先驗證與脫敏。
