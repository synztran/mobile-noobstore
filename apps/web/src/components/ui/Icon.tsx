"use client";

import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Bookmark,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Dumbbell,
  Edit,
  Eye,
  EyeOff,
  Gift,
  Heart,
  HelpCircle,
  History,
  Home,
  Hourglass,
  Image,
  ImageOff,
  Info,
  Leaf,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  QrCode,
  Search,
  Share,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Smartphone,
  Square,
  Star,
  Truck,
  User,
  X,
} from "lucide-react";

type IconProps = {
  name: string;
  className?: string;
  title?: string;
  fill?: string;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  X,
  Check,
  CheckCircle,
  ShoppingCart,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sliders,
  Clock,
  Search,
  AlertCircle,
  Menu,
  Heart,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ImageOff,
  Image,
  Plus,
  Leaf,
  Activity,
  Dumbbell,
  ChevronRight,
  LogOut,
  Edit,
  CreditCard,
  Bell,
  MapPin,
  HelpCircle,
  Bookmark,
  Copy,
  Gift,
  Smartphone,
  Star,
  History,
  Hourglass,
  Package,
  Home,
  MoreHorizontal,
  Info,
  Truck,
  QrCode,
  Share,
  Square,
};

const MANUAL_MAP: Record<string, string> = {
  close: "X",
  check: "Check",
  check_circle: "CheckCircle",
  shopping_cart: "ShoppingCart",
  add_shopping_cart: "ShoppingCart",
  shopping_bag: "ShoppingBag",
  arrow_forward: "ArrowRight",
  arrow_back: "ArrowLeft",
  arrow_upward: "ArrowUp",
  arrow_downward: "ArrowDown",
  swap_vert: "ArrowUpDown",
  tune: "Sliders",
  schedule: "Clock",
  search: "Search",
  search_off: "Search",
  error_outline: "AlertCircle",
  menu: "Menu",
  favorite: "Heart",
  person: "User",
  mail: "Mail",
  lock: "Lock",
  visibility: "Eye",
  visibility_off: "EyeOff",
  image_not_supported: "ImageOff",
  image: "Image",
  add: "Plus",
  eco: "Leaf",
  sprint: "Activity",
  directions_run: "Activity",
  fitness_center: "Dumbbell",
  chevron_right: "ChevronRight",
  logout: "LogOut",
  edit: "Edit",
  favorite_border: "Heart",
  shopping_basket: "ShoppingBag",
  payment: "CreditCard",
  notifications: "Bell",
  location_on: "MapPin",
  help: "HelpCircle",
  bookmark: "Bookmark",
  content_copy: "Copy",
  redeem: "Gift",
  hourglass_top: "Hourglass",
  inventory_2: "Package",
  more_horiz: "MoreHorizontal",
  local_shipping: "Truck",
  qr_code_2: "QrCode",
  share: "Share",
  stars: "Star",
};

function toPascalCase(name: string) {
  return name
    .split(/[_\-\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function Icon({ name, className, title, fill }: IconProps) {
  const lookup = MANUAL_MAP[name] ?? toPascalCase(name);
  const Comp = ICON_MAP[lookup] ?? ICON_MAP["Square"];

  return (
    <span
      className={className}
      aria-hidden={!!title ? undefined : true}
      title={title}>
      <Comp
        style={{
          width: "1em",
          height: "1em",
          fill: fill ?? "transparent",
        }}
      />
    </span>
  );
}

export default Icon;
