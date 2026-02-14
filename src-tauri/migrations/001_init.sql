-- 勘定科目テーブル
CREATE TABLE IF NOT EXISTS accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            INTEGER NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    classification  TEXT    NOT NULL CHECK (
                        classification IN ('資産', '負債', '純資産', '収益', '費用')
                    )
);

-- 仕訳帳テーブル
CREATE TABLE IF NOT EXISTS journal_entries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    date                TEXT     NOT NULL,
    debit_account_id    INTEGER  NOT NULL,
    debit_amount        INTEGER  NOT NULL,
    credit_account_id   INTEGER  NOT NULL,
    credit_amount       INTEGER  NOT NULL,
    description         TEXT     NOT NULL DEFAULT '',
    created_at          TEXT     NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (debit_account_id)  REFERENCES accounts(id),
    FOREIGN KEY (credit_account_id) REFERENCES accounts(id),
    CHECK (debit_amount = credit_amount),
    CHECK (debit_amount > 0)
);

-- 初期勘定科目データ
INSERT OR IGNORE INTO accounts (code, name, classification) VALUES
    -- 資産
    (1111, '現金',       '資産'),
    (1112, '普通預金',   '資産'),
    (1113, '当座預金',   '資産'),
    (1131, '売掛金',     '資産'),
    (1141, '有価証券',   '資産'),
    (1151, '棚卸資産',   '資産'),
    (1200, '建物',       '資産'),
    (1300, '車両運搬具', '資産'),
    (1400, '工具器具備品','資産'),
    (1500, '土地',       '資産'),
    -- 負債
    (2111, '買掛金',     '負債'),
    (2112, '未払金',     '負債'),
    (2113, '未払費用',   '負債'),
    (2114, '前受金',     '負債'),
    (2200, '借入金',     '負債'),
    (2300, '預り金',     '負債'),
    -- 純資産
    (3100, '元入金',     '純資産'),
    (3200, '事業主貸',   '純資産'),
    (3300, '事業主借',   '純資産'),
    -- 収益
    (4100, '売上高',     '収益'),
    (4200, '雑収入',     '収益'),
    -- 費用
    (5100, '仕入高',     '費用'),
    (5200, '給料賃金',   '費用'),
    (5210, '外注工賃',   '費用'),
    (5300, '地代家賃',   '費用'),
    (5400, '通信費',     '費用'),
    (5500, '旅費交通費', '費用'),
    (5600, '消耗品費',   '費用'),
    (5700, '水道光熱費', '費用'),
    (5800, '接待交際費', '費用'),
    (5810, '広告宣伝費', '費用'),
    (5820, '損害保険料', '費用'),
    (5830, '修繕費',     '費用'),
    (5900, '減価償却費', '費用'),
    (5910, '租税公課',   '費用'),
    (5920, '荷造運賃',   '費用'),
    (5930, '新聞図書費', '費用'),
    (5940, '支払手数料', '費用'),
    (5950, '雑費',       '費用');
