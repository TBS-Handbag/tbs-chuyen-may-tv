# TBS Chuyền May — dashboard TV

Link TV: https://tbs-handbag.github.io/tbs-chuyen-may-tv/?line=1 (đổi `line` theo chuyền).

```
web/  giao diện tĩnh trên GitHub Pages (ES5 thuần, chạy được trình duyệt TV cũ)
api/  Google Apps Script đọc sheet Report, trả JSON/JSONP
```

## Sửa giao diện (`web/`)

Sửa `web/index.html`, commit, push lên `main` → GitHub Actions tự deploy Pages.

## Sửa API (`api/`)

Cần [clasp](https://github.com/google/clasp) đã `clasp login` bằng tài khoản sở hữu script.

```bash
cd api
clasp push
clasp create-deployment -i AKfycbyd4ugLksm5y5o5tAAPwrKhFFT1ZBm72Erjq5ckG4tIvb3jAOe4bBgmfYer4PYBK-63 -d "mô tả"
```

Luôn deploy vào đúng ID trên để URL `/exec` không đổi (web đang trỏ vào nó trong `API_URL`).

API: `GET <exec>?line=1` → `{ "teams": [...] }` hoặc `{ "error": "..." }`; thêm `&callback=fn` để nhận JSONP.
