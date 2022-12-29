export type UseHighlightOptions = {
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	debounce?: number;
	topOffset?: number;
	bottomOffset?: number;
};

export type HighlightResult = {
	value: string;
	index: number;
	dataset: Record<string, string>;
};
