import KeycapCheckClient from "@/components/keycap-check/KeycapCheckClient";
import ListHeader from "@/components/ui/ListHeader";

export const metadata = {
  title: "Keycap Check - NoobStore Admin",
};

export default function KeycapCheckPage() {
  return (
    <div className="space-y-6">
      <ListHeader
        title="Keycap Check"
        subtitle="Đối chiếu ảnh keycap khách gửi với render GMK và chỉ ra key thiếu, trùng hoặc cần xác nhận."
      />
      <KeycapCheckClient />
    </div>
  );
}
