const HID = require('node-hid');
const robot = require('robotjs');

// 任天堂 / WiiバランスボードのHIDデバイス情報
const WII_VENDOR_ID = 1406;  // 0x057e (Nintendo)
const WII_PRODUCT_ID = 774;  // 0x0306 (Wii Balance Board)

// ⚙️ イベント用の感度調整パラメーター
const THRESHOLD = 8.0;      // どれくらい体重を傾けたら反応するか（デッドゾーン設定）
const CHECK_INTERVAL = 50;  // センサーの監視間隔 (ミリ秒)

let device = null;

function connectBalanceBoard() {
    const devices = HID.devices();
    const boardInfo = devices.find(d => d.vendorId === WII_VENDOR_ID && d.productId === WII_PRODUCT_ID);

    if (!boardInfo) {
        console.log("❌ Wiiバランスボードが見つかりません。MacとBluetoothペアリングされているか確認してください。");
        console.log("🔄 5秒後に再試行します...");
        setTimeout(connectBalanceBoard, 5000);
        return;
    }

    try {
        // デバイスへの接続（Macのセキュリティを仲介）
        device = new HID.HID(boardInfo.path);
        console.log(" can🎉 Wiiバランスボードに正常に接続しました！");
        console.log("--------------------------------------------------");
        console.log(`【イベント運用中】左右に体重をかけてバーを動かそう！（閾値: ${THRESHOLD}）`);
        console.log("--------------------------------------------------");

        // ボール落下の衝撃を検知するためにLEDをONにするコマンドを送る（初期化処理）
        // Wiiボードへレポートモード（0x12）とライトON（0x11）の命令
        device.write([0x11, 0x10]); 
        device.write([0x12, 0x00, 0x34]); // 拡張部分のデータ読み込み要求

        // データ受信時のイベント
        device.on("data", handleBoardData);
        
        device.on("error", (err) => {
            console.error("⚠️ 通信エラーが発生しました:", err);
            reconnect();
        });

    } catch (e) {
        console.error("❌ 接続に失敗しました:", e.message);
        reconnect();
    }
}

// 🦶 センサーデータから重心を解析してキーボードに変換するロジック
function handleBoardData(data) {
    // Wiiバランスボードのデータフォーマット（17-24バイト付近に4隅の重さが入る）
    // ※オープンソースの解析仕様に基づき、簡易的な生データ（バッファ）から算出
    if (data.length < 22) return;

    // 4隅のセンサー値（生データ）の抽出
    const topLeft     = (data[17] << 8) | data[18];
    const topRight    = (data[19] << 8) | data[20];
    const bottomLeft  = (data[21] << 8) | data[22];
    const bottomRight = (data[23] << 8) | data[24];

    // 左側と右側の合計重量を計算
    const leftTotal  = topLeft + bottomLeft;
    const rightTotal = topRight + bottomRight;

    // 左右のバランス差分
    const balanceDelta = rightTotal - leftTotal;

    // デバッグ用にターミナルに重心状況をリアルタイム表示（イベント時の生存確認用）
    process.stdout.write(`\r[センサーログ] 左: ${leftTotal} | 右: ${rightTotal} | 差分: ${balanceDelta.toFixed(1)}   `);

    // 🏎 体重移動に応じてMacのシステムキー（← / →）を発火
    if (balanceDelta > THRESHOLD) {
        // 右に傾いている場合
        robot.keyToggle("arrow_right", "down");
        robot.keyToggle("arrow_left", "up");
    } else if (balanceDelta < -THRESHOLD) {
        // 左に傾いている場合
        robot.keyToggle("arrow_left", "down");
        robot.keyToggle("arrow_right", "up");
    } else {
        // 中央（不感帯）にいる場合はキーを離す
        robot.keyToggle("arrow_right", "up");
        robot.keyToggle("arrow_left", "up");
    }
}

function reconnect() {
    if (device) {
        try { device.close(); } catch(e){}
        device = null;
    }
    setTimeout(connectBalanceBoard, 3000);
}

// アプリの起動
console.log("🚀 DOTS 体感アトラクション・ブリッジアプリを起動しています...");
connectBalanceBoard();
