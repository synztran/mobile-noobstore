import Icon from "@/components/ui/Icon";

type PreOrderConfig = {
  estimate: string;
  available_date?: string | null;
  notes?: string | null;
};

type PreOrderBannerProps = {
  config: PreOrderConfig;
};

export function PreOrderBanner({ config }: PreOrderBannerProps) {
  const details = [
    {
      label: "Dự kiến có hàng",
      value: config.available_date,
      className: "text-[10px] text-on-surface-variant",
    },
    {
      label: null,
      value: config.notes,
      className: "text-[10px] text-on-surface-variant",
    },
    // {
    //   label: "Dự kiến",
    //   value: config.estimate,
    //   className: "text-xs font-bold text-on-surface",
    // },
  ];

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-2">
      <Icon name="schedule" className="mt-1 shrink-0 text-xl text-primary" />
      <div className="relative w-full">
        <div className="inline-flex w-full items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Sản phẩm đặt trước
          </span>
          {config.estimate ? (
            <span className="text-xs">
              Dự kiến: <strong>{config.estimate}</strong>
            </span>
          ) : null}
        </div>
        {details ? (
          details.map(
            (item, i) =>
              item.value && (
                <p key={i} className={item.className}>
                  {item.label ? `${item.label}: ${item.value}` : item.value}
                </p>
              )
          )
        ) : (
          <span>Đang cập nhật</span>
        )}
      </div>
    </div>
  );
}
