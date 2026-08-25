import type {
	BookingSection,
	BookingService,
} from "@/app/api/services/booking-config/route";

export interface ServiceEntryDraft {
	entryId: string;
	selectedByOptionId: Record<string, number>;
	lineNote: string;
	// Stabilizer
	stabilizerType?: "clip-in" | "screw-in";
	stabilizerMode?: "bundle" | "individual";
	stabilizerBundle?: "6.25u" | "7u";
	stabilizerQuantities?: Record<string, number>;
	// Switch lubricant
	switchCount?: number;
	// Cleaning
	cleaningProductType?: "keyboard" | "keycap" | "switch";
	cleaningLayout?: string;
	cleaningKeycapQty?: number;
	cleaningSwitchQty?: number;
	cleaningSwitchBundle?: number;
	cleaningSwitchStatus?: string;
	// Switch section (lube, spring change, film)
	switchType?: "tactile" | "linear";
	switchStatus?: "new-unlube" | "new-factory-lube" | "used-lubed";
	// Keycap stem repair
	keycapStemGroups?: { unit: "1u" | "2u"; quantity: number }[];
	// Repair section
	repairIssue?: string;
	attachmentUploads?: Array<{ path: string; url: string }>;
}

export interface ServiceSectionCardProps {
	section: BookingSection;
	selections: Record<string, ServiceEntryDraft[]>;
	entryErrors?: Record<string, Record<string, string>>;
	onAddEntry: (service: BookingService) => void;
	onRemoveEntry: (serviceId: string, entryId: string) => void;
	onSelectOptionValue: (
		service: BookingService,
		entryId: string,
		optionId: number,
		valueId: number,
		isRequired: boolean,
	) => void;
	onChangeLineNote: (
		serviceId: string,
		entryId: string,
		note: string,
	) => void;
	onUpdateEntry: (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => void;
}
