// API Apps Script của dashboard chuyền may: đọc sheet Report, trả dữ liệu cho web/
var SHEET_ID = '1LNilrTradKhZRsruTpcJqQrS_p8i0Oz56fBNDnPChLE';
var SHEET_NAME = 'Report';
var FIRST_ROW = 7; // dòng tiêu đề khung giờ, dữ liệu bắt đầu từ dòng 8

// Cột 0-based của sheet Report
var COL = {
  factory: 0, // A: "NM1" ở dòng tổng line, STT ở dòng nhóm
  line: 1, // B
  team: 2, // C
  group: 13, // N: NHÓM
  laborIe: 16, // Q: LĐ IE
  laborActual: 17, // R: LĐ THỰC TẾ
  hourPlan: 19, // T: Kế hoạch / giờ
  firstHour: 20, // U..AF: thực hiện theo khung giờ
  lastHour: 31,
  accActual: 32, // AG: LKTH giờ
  accPlan: 33, // AH: Tổng KH
  groupPct: 35, // AJ: % Nhóm
  filter: 40 // AO: LỌC (Y = hiển thị)
};

// API cho web/ trên GitHub Pages: ?line=1 → { teams } hoặc { error }.
// Có &callback=fn thì trả JSONP để trình duyệt TV cũ đọc được không cần CORS.
function doGet(e) {
  var p = (e && e.parameter) || {};
  var line = String(p.line || '1');
  var body;
  if (!/^\d+$/.test(line)) {
    body = { error: 'Tham số line phải là số.' };
  } else {
    try {
      body = { teams: getLineTeams(line) };
    } catch (err) {
      body = { error: err.message || String(err) };
    }
  }
  var json = JSON.stringify(body);
  // Chỉ cho tên hàm hợp lệ, chặn chèn script qua callback
  if (p.callback && /^[A-Za-z_$][\w$.]{0,63}$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function cellValue(value) {
  if (typeof value === 'string') {
    var text = value.trim();
    // Bỏ qua lỗi công thức (#VALUE!, #REF!, #N/A...)
    return text && text.charAt(0) !== '#' ? text : null;
  }
  if (typeof value === 'number') return isFinite(value) ? value : null;
  return null;
}

function toText(value) {
  var cell = cellValue(value);
  return cell === null ? null : String(cell);
}

function toNumber(value) {
  var cell = cellValue(value);
  if (typeof cell === 'number') return cell;
  if (cell === null) return null;
  var parsed = Number(cell.replace(',', '.'));
  return isFinite(parsed) ? parsed : null;
}

function normalize(value) {
  return (toText(value) || '').toLocaleUpperCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function round(value) {
  var n = toNumber(value);
  return n === null ? null : Math.round(n);
}

// "9h30  10h30" → "10:30" (giờ kết thúc khung)
function hourLabel(header) {
  var parts = (toText(header) || '').split(/\s+/);
  return parts[parts.length - 1].replace('h', ':');
}

function toTeam(lineRow, block, hours) {
  var teamRow = block[0];
  return {
    factory: toText(lineRow[COL.factory]) || '',
    // "Line 04" → "LINE 4"
    line: (toText(lineRow[COL.line]) || '').toUpperCase().replace(/\b0+(\d)/, '$1'),
    team: toText(teamRow[COL.team]) || '',
    layout: round(teamRow[COL.laborIe]),
    present: round(teamRow[COL.laborActual]),
    hours: hours,
    groups: block.slice(1).map(function (row) {
      var pct = toNumber(row[COL.groupPct]);
      return {
        name: toText(row[COL.group]) || '',
        layout: round(row[COL.laborIe]),
        present: round(row[COL.laborActual]),
        hourPlan: round(row[COL.hourPlan]),
        hours: hours.map(function (_, i) { return round(row[COL.firstHour + i]); }),
        accPlan: round(row[COL.accPlan]),
        accActual: round(row[COL.accActual]),
        pct: pct === null ? null : Math.round(pct * 100)
      };
    })
  };
}

// Mỗi tổ (dòng có cột TỔ, không có STT) + các dòng nhóm bên dưới → một màn hình.
// Web gọi lại qua doGet khi tới tổ cuối.
function getLineTeams(lineNumber) {
  lineNumber = String(lineNumber);
  var line = normalize('Line ' + (lineNumber.length < 2 ? '0' + lineNumber : lineNumber));
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet "' + SHEET_NAME + '".');
  var lastRow = sheet.getLastRow();
  if (lastRow < FIRST_ROW) return [];
  var values = sheet.getRange(FIRST_ROW, 1, lastRow - FIRST_ROW + 1, COL.filter + 1).getValues();

  var hours = values[0].slice(COL.firstHour, COL.lastHour + 1).map(hourLabel);
  var visible = values.slice(1).filter(function (row) {
    return normalize(row[COL.line]) === line && normalize(row[COL.filter]) === 'Y';
  });
  var lineRow = null;
  for (var i = 0; i < visible.length; i++) {
    if (!toText(visible[i][COL.team])) { lineRow = visible[i]; break; }
  }
  if (!lineRow) return [];

  var blocks = [];
  visible.forEach(function (row) {
    if (row === lineRow) return;
    if (toNumber(row[COL.factory]) === null) blocks.push([row]);
    else if (blocks.length) blocks[blocks.length - 1].push(row);
  });
  return blocks.map(function (block) { return toTeam(lineRow, block, hours); });
}
