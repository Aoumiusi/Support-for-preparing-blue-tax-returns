-- 固定資産台帳テーブル（減価償却費の計算用）
CREATE TABLE IF NOT EXISTS fixed_assets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,               -- 資産名称
    acquisition_date    TEXT    NOT NULL,               -- 取得年月日 (YYYY-MM-DD)
    acquisition_cost    INTEGER NOT NULL,               -- 取得価額（円）
    useful_life         INTEGER NOT NULL,               -- 耐用年数
    depreciation_method TEXT    NOT NULL DEFAULT '定額法', -- 償却方法 (定額法/定率法)
    depreciation_rate   INTEGER NOT NULL,               -- 償却率 (×10000, 例: 0.500 → 5000)
    accumulated_dep     INTEGER NOT NULL DEFAULT 0,     -- 前年末までの償却累計額
    memo                TEXT    NOT NULL DEFAULT '',     -- 備考
    is_active           INTEGER NOT NULL DEFAULT 1,     -- 有効フラグ (1=有効, 0=除却済み)
    CHECK (acquisition_cost > 0),
    CHECK (useful_life > 0),
    CHECK (depreciation_rate > 0)
);

-- 地代家賃の内訳テーブル（決算書 第3面用）
CREATE TABLE IF NOT EXISTS rent_details (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    payee_address   TEXT    NOT NULL DEFAULT '',  -- 支払先の住所
    payee_name      TEXT    NOT NULL,             -- 支払先の氏名
    rent_type       TEXT    NOT NULL,             -- 賃借物件 (事務所/店舗/駐車場 等)
    monthly_rent    INTEGER NOT NULL,             -- 月額家賃（円）
    annual_total    INTEGER NOT NULL,             -- 年間支払額（円）
    business_ratio  INTEGER NOT NULL DEFAULT 100, -- 事業割合 (%, 1-100)
    memo            TEXT    NOT NULL DEFAULT '',
    CHECK (monthly_rent >= 0),
    CHECK (annual_total >= 0),
    CHECK (business_ratio > 0 AND business_ratio <= 100)
);
