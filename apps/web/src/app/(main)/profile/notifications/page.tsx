"use client";

import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default withAuthRedirect(NotificationCenter);
