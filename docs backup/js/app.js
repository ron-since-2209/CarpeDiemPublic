// ===============================
// GitHub Private Repo JSON 取得
// ===============================
async function fetchPrivateJSON(path) {
    if (!window.accessToken) {
        throw new Error("未認証です。GitHub OAuth 認証を行ってください。");
    }

    const url = `https://api.github.com/repos/ron-since-2209/CarpeDiem/contents/data/${path}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${window.accessToken}`,
            "Accept": "application/vnd.github.v3.raw"
        }
    });

    if (!res.ok) {
        throw new Error(`GitHub API エラー: ${res.status}`);
    }

    return await res.json();
}

// ===============================
// データ取得ボタン
// ===============================
document.getElementById("loadBtn").addEventListener("click", loadMGCData);

async function loadMGCData() {
    if (!window.accessToken) {
        alert("GitHub OAuth 認証が必要です");
        return;
    }

    const season = document.getElementById("season").value;
    const section = document.getElementById("section").value;

    if (!season || !section) {
        alert("シーズンと節を入力してください");
        return;
    }

    const mgcPath = `mgc/mgc${season}-${section}.json`;

    try {
        const mgcData = await fetchPrivateJSON(mgcPath);

        const mgcHoles = [...mgcData.out, ...mgcData.in];
        const rows = [];

        for (const h of mgcHoles) {
            const courseId = h.course_id;   // 例: "03"
            const holeId = h.hole_id;       // 例: "03-02"
            const conditionId = h.condition_id;

            // course ファイル名は「先頭2桁一致」で検索する
            const courseFile = await resolveCourseFile(courseId);

            const courseData = await fetchPrivateJSON(`course/${courseFile}`);

            const hole = courseData.holes.find(x => x.hole_id === holeId);
            if (!hole) continue;

            const env = hole.environment.find(e => e.condition_id === conditionId);
            const pins = hole.pins.filter(p => p.is_mgc_pin);

            for (const p of pins) {
                rows.push({
                    mgcHoleId: h.mgc_hole_id,
                    courseId,
                    courseName: courseData.name,
                    holeId,
                    holeNo: hole.hole_no,
                    par: hole.par,
                    conditionId,
                    windMin: env.wind_min,
                    windMax: env.wind_max,
                    windDir: env.wind_dir,
                    weather: env.weather,
                    pinId: p.pin_id,
                    distance: p.distance_yd,
                    position: p.position
                });
            }
        }

        renderMGCTable(rows);

    } catch (e) {
        console.error(e);
        alert("データ取得に失敗しました: " + e.message);
    }
}

// ===============================
// コースファイル名を course_id から解決
// ===============================
async function resolveCourseFile(courseId) {
    const list = await fetchPrivateJSON("course"); // ディレクトリ一覧取得

    const prefix = courseId; // "03" など

    const match = list.find(f => f.name.startsWith(prefix));
    if (!match) throw new Error(`course_id=${courseId} に一致するコースファイルがありません`);

    return match.name; // 例: "03Ocean.json"
}

// ===============================
// 表描画
// ===============================
function renderMGCTable(rows) {
    let html = "<table><tr>"
        + "<th>ショット</th>"
        + "<th>MGCホール</th>"
        + "<th>コースID</th><th>コース名</th>"
        + "<th>ホールID</th><th>ホール番号</th><th>PAR</th>"
        + "<th>条件ID</th><th>風速</th><th>風向</th><th>天候</th>"
        + "<th>ピンID</th><th>距離(yd)</th><th>位置</th>"
        + "</tr>";

    rows.forEach(r => {
        html += `<tr>
            <td><button onclick="loadShotData('${r.courseId}','${r.pinId}','${r.conditionId}')">取得</button></td>
            <td>${r.mgcHoleId}</td>
            <td>${r.courseId}</td>
            <td>${r.courseName}</td>
            <td>${r.holeId}</td>
            <td>${r.holeNo}</td>
            <td>${r.par}</td>
            <td>${r.conditionId}</td>
            <td>${r.windMin}〜${r.windMax}</td>
            <td>${r.windDir}</td>
            <td>${r.weather}</td>
            <td>${r.pinId}</td>
            <td>${r.distance}</td>
            <td>${r.position}</td>
        </tr>`;
    });

    html += "</table>";
    document.getElementById("mgcTableContainer").innerHTML = html;
}

// ===============================
// ショットデータ取得
// ===============================
async function loadShotData(courseId, pinId, conditionId) {
    if (!window.accessToken) {
        alert("GitHub OAuth 認証が必要です");
        return;
    }

    const shotFile = await resolveShotFile(courseId);

    const shotData = await fetchPrivateJSON(`shot/${shotFile}`);

    const filtered = shotData.shots.filter(s =>
        s.pin_id === pinId &&
        s.condition_id === conditionId
    );

    renderShotTable(filtered);
}

// ===============================
// shot ファイル名も course_id 先頭一致で解決
// ===============================
async function resolveShotFile(courseId) {
    const list = await fetchPrivateJSON("shot");

    const prefix = courseId; // "03"

    const match = list.find(f => f.name.startsWith(prefix));
    if (!match) throw new Error(`course_id=${courseId} に一致するショットファイルがありません`);

    return match.name; // 例: "03Ocean.shot.json"
}

// ===============================
// ショット表描画
// ===============================
function renderShotTable(rows) {
    if (rows.length === 0) {
        document.getElementById("shotTableContainer").innerHTML = "<p>該当ショットデータなし</p>";
        return;
    }

    let html = "<table><tr>"
        + "<th>ショットID</th><th>ピンID</th><th>条件ID</th>"
        + "<th>縦/横</th><th>スピン</th><th>フリック</th>"
        + "<th>低反発</th><th>飛距離UP</th><th>番手</th>"
        + "<th>左右補正</th><th>power/INT</th>"
        + "<th>OG使用</th><th>OGスキル</th><th>備考</th>"
        + "</tr>";

    rows.forEach(s => {
        html += `<tr>
            <td>${s.shot_id}</td>
            <td>${s.pin_id}</td>
            <td>${s.condition_id}</td>
            <td>${s.device_orientation}</td>
            <td>${s.spin_direction}</td>
            <td>${s.flick}</td>
            <td>${s.low_rebound}</td>
            <td>${s.distance_up}</td>
            <td>${s.club}</td>
            <td>${s.lr_adjust}</td>
            <td>${s.power_or_int}</td>
            <td>${s.og_use}</td>
            <td>${JSON.stringify(s.og_skill || {})}</td>
            <td>${s.note || ""}</td>
        </tr>`;
    });

    html += "</table>";
    document.getElementById("shotTableContainer").innerHTML = html;
}
