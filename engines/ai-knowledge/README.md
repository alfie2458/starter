# AI Knowledge Publisher

Publisher 目前只定義候選輸出與發布狀態，不呼叫真實模型。每個候選結果必須記錄 publisher kind/version/confidence，並在不確定時使用 `needs_review`。發布前要保留 source_id 與版本鏈。
