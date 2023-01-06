<script lang="ts" setup>
import { inject, watch, Ref } from 'vue';

const { shiftSection, pushSection } = inject('DemoButtons') as {
	shiftSection: () => void;
	pushSection: () => void;
};

const { scrollBehavior, clickType } = inject('DemoRadios') as {
	scrollBehavior: Ref<'smooth' | 'auto'>;
	clickType: Ref<'native' | 'custom'>;
};

watch(
	[scrollBehavior, () => clickType.value === 'custom'],
	([newBehavior, isCustom]) => {
		document.documentElement.style.setProperty('--ScrollBehavior', isCustom ? 'auto' : newBehavior);
	},
	{
		immediate: true,
	}
);
</script>

<template>
	<div class="Controls">
		<fieldset>
			<legend>Click</legend>
			<div>
				<label for="Native">
					<input type="radio" id="Native" name="clickType" value="native" v-model="clickType" />
					Native
				</label>
				<label for="Custom">
					<input type="radio" id="Custom" name="clickType" value="custom" v-model="clickType" />
					Custom JS Scroll
				</label>
			</div>
		</fieldset>

		<fieldset :disabled="clickType === 'custom'">
			<legend>CSS scroll-behavior</legend>
			<div>
				<label for="Auto">
					<input
						type="radio"
						id="Auto"
						name="scrollBehavior"
						value="auto"
						v-model="scrollBehavior"
					/>
					auto
				</label>
				<label for="Smooth">
					<input
						type="radio"
						id="Smooth"
						name="scrollBehavior"
						value="smooth"
						v-model="scrollBehavior"
					/>
					smooth
				</label>
			</div>
		</fieldset>

		<div class="Buttons">
			<button @click="shiftSection">Shift</button>
			<button @click="pushSection">Push</button>
		</div>
	</div>
</template>

<style scoped>
.Controls {
	display: flex;
	flex-direction: column;
	gap: 20px;
	margin-bottom: 20px;
}

.Buttons {
	display: flex;
	column-gap: 10px;
	row-gap: 20px;
}

legend {
	font-weight: bold;
	margin: 0 0 5px;
	padding: 0;
}

fieldset {
	font-size: 90%;
	padding: 0;
	border: none;
	margin: 0;
	padding-block: 0;
}

fieldset:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

fieldset div {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

button {
	padding: 0.4em 0.6em;
	border: 1px solid #ffffff36;
	background-color: #393e46;
	border-radius: 5px;
	font-weight: 600;
	cursor: pointer;
	color: white;
	transition: border 100ms ease-in-out, background-color 100ms ease-in-out;
}

button:hover {
	border: 1px solid white;
	background-color: #4a5463;
}

label {
	cursor: pointer;
	padding: 0;
}
</style>
