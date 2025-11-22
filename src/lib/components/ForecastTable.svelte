<script lang="ts">
	import { format } from 'date-fns';

	type ForecastEntry = {
		date: string;
		balance: number;
		income: number;
		expenses: number;
		transactions: Array<{
			date: string;
			description: string;
			amount: number;
			type: 'income' | 'expense';
		}>;
	};

	const { forecast }: { forecast: ForecastEntry[] } = $props();

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

	const formatDate = (dateString: string) => {
		return format(new Date(dateString), 'MMMM yyyy');
	};
</script>

<div class="overflow-x-auto">
	<table class="w-full border-collapse">
		<thead>
			<tr class="border-b border-gray-200">
				<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"> Monat </th>
				<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
					Einnahmen
				</th>
				<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
					Ausgaben
				</th>
				<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
					Kontostand
				</th>
			</tr>
		</thead>
		<tbody>
			{#each forecast as entry (entry.date)}
				<tr class="border-b border-gray-100 hover:bg-gray-50">
					<td class="px-4 py-3 text-sm font-medium text-gray-900">
						{formatDate(entry.date)}
					</td>
					<td class="px-4 py-3 text-right text-sm text-green-600">
						{formatCurrency(entry.income)}
					</td>
					<td class="px-4 py-3 text-right text-sm text-red-600">
						{formatCurrency(entry.expenses)}
					</td>
					<td
						class="px-4 py-3 text-right text-sm font-semibold {entry.balance < 0
							? 'text-red-600'
							: 'text-gray-900'}"
					>
						{formatCurrency(entry.balance)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
