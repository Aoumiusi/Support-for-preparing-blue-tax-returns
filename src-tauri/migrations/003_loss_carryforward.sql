-- 純損失の繰越控除（青色申告：最大3年繰越）
CREATE TABLE IF NOT EXISTS loss_carryforward (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loss_year INTEGER NOT NULL,
    loss_amount INTEGER NOT NULL,
    used_year_1 INTEGER NOT NULL DEFAULT 0,
    used_year_2 INTEGER NOT NULL DEFAULT 0,
    used_year_3 INTEGER NOT NULL DEFAULT 0,
    memo TEXT NOT NULL DEFAULT '',
    CHECK (loss_amount > 0),
    CHECK (used_year_1 >= 0),
    CHECK (used_year_2 >= 0),
    CHECK (used_year_3 >= 0),
    UNIQUE(loss_year)
);
