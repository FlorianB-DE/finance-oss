<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { format } from 'date-fns';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';

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

	const {
		forecast,
		startingBalance = 0,
		height = 400
	}: { forecast: ForecastEntry[]; startingBalance?: number; height?: number } = $props();

	// Chart.js instance
	let chartCanvas: HTMLCanvasElement | null = $state(null);
	let chartInstance: Chart | null = $state(null);

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

	// Prepare chart data
	const chartData = $derived(() => {
		if (forecast.length === 0) {
			return {
				labels: [],
				datasets: []
			};
		}

		// Start from today (current date/time) - the starting balance is the balance RIGHT NOW
		const today = new Date();
		const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const todayTime = todayNormalized.getTime();

		// Build balance progression through all transactions
		// Start with current balance (starting balance is the balance RIGHT NOW)
		let runningBalance = startingBalance;
		const balanceData: Array<{ x: number; y: number }> = [
			{
				x: todayTime,
				y: runningBalance
			}
		];

		// Collect all transactions sorted by date, but only FUTURE transactions
		const allTransactions: Array<{
			date: number;
			amount: number;
			type: 'income' | 'expense';
			description: string;
		}> = [];

		forecast.forEach(entry => {
			entry.transactions.forEach(transaction => {
				// Normalize transaction date to midnight for consistent comparison
				const transactionDateObj = new Date(transaction.date);
				const transactionDateNormalized = new Date(
					transactionDateObj.getFullYear(),
					transactionDateObj.getMonth(),
					transactionDateObj.getDate()
				);
				const transactionDate = transactionDateNormalized.getTime();
				// Only include transactions from today onwards (future transactions)
				// Note: We use >= to include transactions happening today
				if (transactionDate >= todayTime) {
					allTransactions.push({
						date: transactionDate,
						amount: transaction.amount,
						type: transaction.type,
						description: transaction.description
					});
				}
			});
		});

		// Sort all transactions by date
		allTransactions.sort((a, b) => a.date - b.date);

		// Build balance line by processing each transaction
		// Track balance after each transaction for dot positioning
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const transactionBalanceMap = new Map<number, number>();

		allTransactions.forEach(transaction => {
			// Apply transaction to running balance
			if (transaction.type === 'income') {
				runningBalance += transaction.amount;
			} else {
				runningBalance -= transaction.amount;
			}

			// Store balance after this transaction for dot positioning
			transactionBalanceMap.set(transaction.date, runningBalance);

			// Add point at transaction date with balance after transaction
			balanceData.push({
				x: transaction.date,
				y: runningBalance
			});
		});

		// Sort balance data by date to ensure proper line drawing
		balanceData.sort((a, b) => a.x - b.x);

		// Remove duplicate points at the same date (keep the last one which has the correct balance)
		const finalBalanceData: Array<{ x: number; y: number }> = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const seenDates = new Set<number>();

		// Process in reverse to keep the last balance for each date
		for (let i = balanceData.length - 1; i >= 0; i--) {
			const point = balanceData[i];
			if (!seenDates.has(point.x)) {
				finalBalanceData.unshift(point);
				seenDates.add(point.x);
			}
		}

		// Ensure we have the starting point at today
		if (finalBalanceData.length === 0 || finalBalanceData[0].x !== todayTime) {
			finalBalanceData.unshift({
				x: todayTime,
				y: startingBalance
			});
		}

		// Sort again after adding starting point
		finalBalanceData.sort((a, b) => a.x - b.x);

		// Group transactions by date and combine them
		// This prevents overlapping dots and allows showing all transactions in tooltip
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const transactionsByDate = new Map<
			number,
			Array<{ type: 'income' | 'expense'; description: string; amount: number }>
		>();

		allTransactions.forEach(transaction => {
			if (transaction.date >= todayTime) {
				const existing = transactionsByDate.get(transaction.date) || [];
				existing.push({
					type: transaction.type,
					description: transaction.description,
					amount: transaction.amount
				});
				transactionsByDate.set(transaction.date, existing);
			}
		});

		// Collect income and expense transactions for dots
		// Combine transactions on the same date into a single dot
		const incomeTransactions: Array<{
			x: number;
			y: number;
			transactions: Array<{ description: string; amount: number }>;
			totalAmount: number;
			count: number;
		}> = [];
		const expenseTransactions: Array<{
			x: number;
			y: number;
			transactions: Array<{ description: string; amount: number }>;
			totalAmount: number;
			count: number;
		}> = [];

		transactionsByDate.forEach((transactions, date) => {
			// Get the balance after all transactions on this date
			// The balanceMap has the final balance after all transactions on this date
			const balanceAfter = transactionBalanceMap.get(date);
			if (balanceAfter === undefined) return;

			// Separate income and expense transactions
			const incomeOnDate = transactions.filter(t => t.type === 'income');
			const expenseOnDate = transactions.filter(t => t.type === 'expense');

			if (incomeOnDate.length > 0) {
				const totalAmount = incomeOnDate.reduce((sum, t) => sum + t.amount, 0);
				incomeTransactions.push({
					x: date,
					y: balanceAfter,
					transactions: incomeOnDate.map(t => ({
						description: t.description,
						amount: t.amount
					})),
					totalAmount,
					count: incomeOnDate.length
				});
			}

			if (expenseOnDate.length > 0) {
				const totalAmount = expenseOnDate.reduce((sum, t) => sum + t.amount, 0);
				expenseTransactions.push({
					x: date,
					y: balanceAfter,
					transactions: expenseOnDate.map(t => ({
						description: t.description,
						amount: t.amount
					})),
					totalAmount,
					count: expenseOnDate.length
				});
			}
		});

		return {
			datasets: [
				{
					label: 'Kontostand',
					data: finalBalanceData,
					borderColor: '#4c5a88',
					backgroundColor: 'rgba(76, 90, 136, 0.1)',
					tension: 0,
					fill: true,
					borderWidth: 2,
					pointRadius: 0,
					pointHoverRadius: 4,
					order: 3 // Render first (behind other datasets)
				},
				{
					label: 'Einnahmen',
					data: incomeTransactions,
					borderColor: '#10b981',
					backgroundColor: '#10b981',
					tension: 0,
					fill: false,
					borderWidth: 0,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointStyle: 'circle',
					showLine: false,
					order: 1 // Render last (on top)
				},
				{
					label: 'Ausgaben',
					data: expenseTransactions,
					borderColor: '#ef4444',
					backgroundColor: '#ef4444',
					tension: 0,
					fill: false,
					borderWidth: 0,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointStyle: 'circle',
					showLine: false,
					order: 2 // Render second (on top of balance line)
				}
			]
		};
	});

	const chartOptions = $derived(() => {
		// Calculate min/max for y-axis scaling from current data
		const data = chartData();
		if (!data || data.datasets.length === 0) {
			return {
				responsive: true,
				maintainAspectRatio: false
			};
		}

		// Calculate min/max from balance data only (not transaction amounts)
		// Transaction dots are for reference but shouldn't affect the scale
		const balanceDataset = data.datasets.find(d => d.label === 'Kontostand');
		const balanceValues: number[] = [];
		if (balanceDataset && Array.isArray(balanceDataset.data)) {
			balanceDataset.data.forEach((point: { x?: number; y?: number }) => {
				if (point.y !== undefined && !isNaN(point.y)) {
					balanceValues.push(point.y);
				}
			});
		}

		const minValue = balanceValues.length > 0 ? Math.min(...balanceValues) : 0;
		const maxValue = balanceValues.length > 0 ? Math.max(...balanceValues) : 0;

		// Add padding: 10% below min, 10% above max, but ensure we show zero line if balance goes negative
		const padding = Math.max(Math.abs(maxValue - minValue) * 0.1, 50);
		const yAxisMin = minValue < 0 ? minValue - padding : Math.min(0, minValue - padding);
		const yAxisMax = maxValue + padding;

		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top' as const,
					labels: {
						usePointStyle: true,
						padding: 15,
						font: {
							size: 12
						}
					}
				},
				tooltip: {
					mode: 'nearest' as const,
					intersect: true,
					callbacks: {
						title: function (this: never, tooltipItems: Array<{ raw?: unknown }>) {
							const raw = tooltipItems[0]?.raw as { x?: number } | undefined;
							if (raw?.x) {
								return format(new Date(raw.x), 'dd.MM.yyyy');
							}
							return '';
						},
						label: function (
							this: never,
							context: {
								dataset?: { label?: string };
								raw?: unknown;
								parsed?: { y: number | null };
							}
						) {
							let label = context.dataset?.label || '';
							if (label) {
								label += ': ';
							}

							const raw = context.raw as
								| {
										transactions?: Array<{ description: string; amount: number }>;
										totalAmount?: number;
										amount?: number;
										description?: string;
								  }
								| undefined;

							// For transactions, show all transactions for this date
							if (raw?.transactions !== undefined) {
								// Multiple transactions on the same date
								const transactions = raw.transactions;
								const totalAmount = raw.totalAmount ?? 0;

								if (transactions.length === 1) {
									// Single transaction
									label += formatCurrency(transactions[0].amount);
									label += ` (${transactions[0].description})`;
								} else {
									// Multiple transactions - show total and list all
									label += `Gesamt: ${formatCurrency(totalAmount)}`;
									label += `\n${transactions.length} Transaktionen:`;
									transactions.forEach(t => {
										label += `\n  • ${t.description}: ${formatCurrency(t.amount)}`;
									});
								}

								if (context.parsed?.y !== null && context.parsed?.y !== undefined) {
									label += `\nKontostand: ${formatCurrency(context.parsed.y)}`;
								}
							} else if (raw?.amount !== undefined) {
								// Legacy single transaction format (shouldn't happen with new code)
								label += formatCurrency(raw.amount);
								if (context.parsed?.y !== null && context.parsed?.y !== undefined) {
									label += ` → Balance: ${formatCurrency(context.parsed.y)}`;
								}
								if (raw?.description) {
									label += ` (${raw.description})`;
								}
							} else {
								// For balance line, just show the balance
								if (context.parsed?.y !== null && context.parsed?.y !== undefined) {
									label += formatCurrency(context.parsed.y);
								}
							}

							return label;
						}
					}
				}
			},
			scales: {
				x: {
					type: 'time' as const,
					display: true,
					title: {
						display: true,
						text: 'Datum',
						font: {
							size: 12,
							weight: 'bold' as const
						}
					},
					grid: {
						display: true,
						color: 'rgba(229, 231, 235, 0.5)'
					},
					time: {
						unit: 'month' as const,
						displayFormats: {
							month: 'MMM yyyy'
						}
					}
				},
				y: {
					display: true,
					title: {
						display: true,
						text: 'Betrag (€)',
						font: {
							size: 12,
							weight: 'bold' as const
						}
					},
					grid: {
						display: true,
						color: 'rgba(229, 231, 235, 0.5)'
					},
					ticks: {
						callback: function (value: number | string) {
							return formatCurrency(typeof value === 'number' ? value : parseFloat(value));
						}
					},
					beginAtZero: false,
					min: yAxisMin,
					max: yAxisMax
				}
			},
			interaction: {
				mode: 'nearest' as const,
				axis: 'x' as const,
				intersect: false
			}
		};
	});

	// Initialize Chart.js on mount
	onMount(() => {
		if (!browser || !chartCanvas) return;

		// Register Chart.js components (only on client side)
		Chart.register(...registerables);

		// Register custom count badge plugin
		const countBadgePlugin = {
			id: 'countBadge',
			afterDatasetsDraw: (chart: Chart) => {
				const ctx = chart.ctx;
				chart.data.datasets.forEach((dataset, datasetIndex: number) => {
					// Only draw badges for income and expense datasets
					if (dataset.label !== 'Einnahmen' && dataset.label !== 'Ausgaben') {
						return;
					}

					const meta = chart.getDatasetMeta(datasetIndex);
					if (!meta.data) return;

					meta.data.forEach((point: { x: number; y: number }, index: number) => {
						const rawData = dataset.data?.[index] as { count?: number } | undefined;
						// Only draw count if there are multiple transactions
						if (rawData?.count && rawData.count > 1) {
							// Get the exact center coordinates of the point
							const x = point.x;
							const y = point.y;
							const count = rawData.count.toString();

							// Draw small gray count number inside the dot
							ctx.save();
							ctx.fillStyle = '#6b7280'; // Gray color
							ctx.font = '7px sans-serif'; // Very small font
							ctx.textAlign = 'center';
							ctx.textBaseline = 'middle';
							ctx.fillText(count, x, y);
							ctx.restore();
						}
					});
				});
			}
		};

		Chart.register(countBadgePlugin);

		if (chartInstance) {
			chartInstance.destroy();
		}

		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			data: chartData(),
			options: chartOptions()
		});
	});

	// Update chart when data changes
	$effect(() => {
		if (chartInstance && chartData() && chartOptions()) {
			chartInstance.data = chartData();
			chartInstance.options = chartOptions();
			// Reset and update scales to properly handle new data range
			chartInstance.update('none'); // 'none' prevents animation on data updates
		}
	});

	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});
</script>

<div class="relative w-full" style="height: {height}px;">
	{#if browser}
		<canvas bind:this={chartCanvas}></canvas>
	{:else}
		<div class="flex h-full items-center justify-center text-sm text-gray-500">
			Lade Diagramm...
		</div>
	{/if}
</div>
