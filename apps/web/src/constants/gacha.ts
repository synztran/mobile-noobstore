export const BALL_PALETTE = [
  { top: "#FF6B6B", bottom: "#FF3A1A", name: "Flame", glow: "#FF6B6B" },
  { top: "#4ECDC4", bottom: "#1A8FD1", name: "Ocean", glow: "#4ECDC4" },
  { top: "#C084FC", bottom: "#EC4899", name: "Cosmic", glow: "#C084FC" },
  { top: "#34D399", bottom: "#047857", name: "Forest", glow: "#34D399" },
  {
    top: "#FFE566",
    bottom: "#F59E0B",
    name: "Gold",
    glow: "#FFE566",
    isGolden: true,
  },
  { top: "#F9A8D4", bottom: "#A855F7", name: "Rose", glow: "#F9A8D4" },
  { top: "#93C5FD", bottom: "#2563EB", name: "Sky", glow: "#93C5FD" },
  { top: "#FB923C", bottom: "#DC2626", name: "Lava", glow: "#FB923C" },
  { top: "#F0ABFC", bottom: "#7C3AED", name: "Mystic", glow: "#F0ABFC" },
  { top: "#6EE7B7", bottom: "#0891B2", name: "Aqua", glow: "#6EE7B7" },
  { top: "#FCD34D", bottom: "#EF4444", name: "Solar", glow: "#FCD34D" },
];

export const REWARD_TYPE_LABEL: Record<string, string> = {
  product: "Sản phẩm",
  point: "Điểm",
  puzzle: "Mảnh ghép",
  lucky_text: "Tin nhắn may mắn",
};

export const MISSION_TYPE_LABEL: Record<string, string> = {
  first_login: "Đăng nhập lần đầu",
  login_count: "Đăng nhập lần đầu",
  order_min_price: "Đơn hàng tối thiểu",
  spend_amount: "Đơn hàng tối thiểu",
  order_count: "Hoàn thành đơn hàng",
  purchase: "Mua hàng",
  spin: "Quay thưởng",
  login: "Đăng nhập",
  referral: "Giới thiệu bạn",
  review: "Đánh giá",
};

export const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  product: { label: "Sản phẩm", color: "badge-primary" },
  point: { label: "Điểm", color: "badge-success" },
  puzzle: { label: "Câu đố", color: "badge-info" },
  lucky_text: { label: "Lời chúc", color: "badge-secondary" },
};

export const RULES = [
  {
    title: "Cách chơi",
    body: "Bỏ token vào máy, sau đó xoay núm điều khiển đủ 360° để quay. Núm sẽ bật trở lại nếu bạn thả tay trước khi hoàn thành vòng xoay.",
  },
  {
    title: "Token",
    body: "Token được nhận khi hoàn thành nhiệm vụ hoặc mua thêm. Mỗi lượt chơi tốn 1 token. Số token được cập nhật ngay sau mỗi lượt quay.",
  },
  {
    title: "Phần thưởng",
    body: "Mỗi viên nang chứa một phần thưởng được chọn ngẫu nhiên. Phần thưởng có nhiều độ hiếm khác nhau — viên nang vàng chứa những giải thưởng hiếm nhất. Tỉ lệ trúng của từng phần thưởng được hiển thị trong danh sách Phần Thưởng.",
  },
  {
    title: "Phần thưởng giới hạn",
    body: 'Một số phần thưởng có số lượng tối đa (hiển thị là "Còn X" trong danh sách). Khi hết số lượng, phần thưởng đó sẽ không thể trúng nữa và được thay thế bởi vật phẩm khác theo tỉ lệ.',
  },
  {
    title: "Nhiệm vụ",
    body: "Hoàn thành các nhiệm vụ trong ứng dụng để nhận thêm token. Nhiệm vụ làm mới theo lịch sự kiện. Kiểm tra tab Nhiệm Vụ để xem các nhiệm vụ hiện tại.",
  },
  {
    title: "Công bằng",
    body: "Mỗi lượt quay là hoàn toàn độc lập. Kết quả trước không ảnh hưởng đến lượt sau. Tỉ lệ phần trăm hiển thị phản ánh đúng trọng số quay được hệ thống sử dụng.",
  },
];
