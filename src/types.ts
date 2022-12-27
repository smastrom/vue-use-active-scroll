export type UseHighlightOptions = {
	topOffset?: number;
	debounce?: number;
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
};

export type HighlightResult = {
	value: string;
	index: number;
	dataset: Record<string, string>;
};
