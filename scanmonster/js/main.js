async function uploadMonsterData(payload) {
  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.status === "success") {
      // 成功時：返ってきたバーコード番号を表示する
      const generatedBarcode = result.barcode; // 例: "4900008392014"
      const monsterName = result.monster_name;

      // 画面上の完了表示エリアへ反映
      showCompletionScreen(monsterName, generatedBarcode);
    } else {
      alert("送信に失敗しました: " + result.message);
    }
  } catch (err) {
    console.error("通信エラー:", err);
  }
}

// 完了画面・ダイアログの表示処理（例）
function showCompletionScreen(name, barcode) {
  // 例: HTML内の特定の要素へ挿入
  document.getElementById("res-monster-name").innerText = name;
  document.getElementById("res-barcode-number").innerText = barcode;
  
  // モーダルや完了エリアを表示
  document.getElementById("completion-modal").style.display = "block";
}
