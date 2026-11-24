# Report: `backendManager.js` renderer error

## Tóm tắt

Không tái hiện được lỗi hoặc chứng minh lỗi thuộc ứng dụng trong môi trường hiện có. Không thay đổi code production hay thêm guard suy đoán. Dấu vết `backendManager` duy nhất trong dependency source là backend manager của Playwright trong `node_modules/playwright-core/lib/coreBundle.js`; đoạn đó quản lý Playwright backend qua `createBackend`/`disposeBackend`, không chứa `registerRenderer` và không xác nhận stack `backendManager.js:1:13379`.

Task được đánh dấu `[!]`: thiếu browser stack/source map thực tế và không thể chạy kiểm tra với extensions/integrations bật/tắt tại đây. Không kết luận lỗi thuộc extension hay bên thứ ba khi chưa có reproduction.

## Files đã thay đổi

- `TASKS.md` — đánh dấu task `[!]`, chưa xác minh nguồn lỗi.
- `.night-runs/2026-11-25/task-backendmanager-renderer-error/REPORT.md` — chẩn đoán và giới hạn bằng chứng.
- `.night-runs/2026-11-25/task-backendmanager-renderer-error/evidences/` — logs kiểm chứng.

## Kết quả kiểm chứng

- **Source/lockfile search:** Không thấy `registerRenderer` trong source app hay dependency đã cài. Search toàn repo thấy cụm `backendManager` trong Playwright core; không khớp hàm/lỗi được báo.
- **Type-check: Fail (repo-wide, ngoài task):** `evidences/typecheck.log`. Các lỗi hiện có ở admin (generated route `THEMES`, unused imports/vars, vendors schema/types, crawling, warehouse-sync) và web (`email.service.ts` có unused functions), không liên quan renderer error.
- **Build: Pass:** `evidences/build.log` — `yarn build` exit code 0.
- **Diff stat:** `evidences/diff.stat`.

## Lưu ý cho Reviewer

- Cần browser console stack đầy đủ, URL/page và cách tái hiện; kiểm tra source map của chính script phát sinh `backendManager.js`.
- Mở cùng trang trên profile sạch/extension disabled rồi bật từng extension hoặc integration nghi ngờ. Nếu chỉ xảy ra khi extension bật, ghi extension/version và stack; không sửa app để né lỗi bên ngoài.
- Type-check hiện fail do lỗi repo-wide không thuộc task; build pass.
