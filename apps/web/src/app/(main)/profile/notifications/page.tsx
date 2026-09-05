"use client";

import { withAuthRedirect } from "@/modules/user/ui/withAuthRedirect";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default withAuthRedirect(NotificationCenter);
