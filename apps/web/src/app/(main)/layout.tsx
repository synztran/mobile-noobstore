import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartHydrator } from "@/components/ui/CartHydrator";
import { BottomNav } from "@/components/layout/BottomNav";
import { MainContent } from "@/components/layout/MainContent";
import { TopNav } from "@/components/layout/TopNav";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<CartHydrator />
			<TopNav />
			<MainContent>{children}</MainContent>
			<BottomNav />
			<CartDrawer />
			<PushNotificationPrompt />
		</>
	);
}
