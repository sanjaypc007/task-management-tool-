/**
 * TaskBoard.
 *
 * Main authenticated UI:
 * - Header with user avatar/name, API Docs toggle, and Sign out
 * - Task creation form
 * - Real-time task list with status summary, loading and empty states
 */

import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { Cell, Pie, PieChart } from "recharts";

import { auth } from "../firebase";
import { getUserTasks } from "../services/taskService";
import AddTask from "./AddTask";
import TaskCard from "./TaskCard";

const STATUS_FILTERS = ["All", "Planned", "In Progress", "Complete"];
const SORT_OPTIONS = [
	{ value: "newest", label: "Newest ↓" },
	{ value: "oldest", label: "Oldest ↑" },
	{ value: "priority", label: "Priority" },
	{ value: "az", label: "A→Z" },
];

const PRIORITY_RANK = {
	High: 0,
	Medium: 1,
	Low: 2,
};

const normalizePriority = (priority) =>
	priority === "High" || priority === "Medium" || priority === "Low" ? priority : "Medium";

const getCreatedAtMillis = (createdAt) => {
	if (!createdAt) return 0;

	if (typeof createdAt === "string") {
		const parsed = Date.parse(createdAt);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	if (typeof createdAt?.toMillis === "function") {
		return createdAt.toMillis();
	}

	if (typeof createdAt?.toDate === "function") {
		return createdAt.toDate().getTime();
	}

	if (typeof createdAt?.seconds === "number") {
		return createdAt.seconds * 1000;
	}

	return 0;
};

const formatFirebaseErrorMessage = (error, fallbackMessage) => {
	const errorCode =
		error && typeof error === "object" && "code" in error && typeof error.code === "string"
			? error.code
			: "";

	if (errorCode === "permission-denied") {
		return "Permission denied. Check your Firestore security rules for the tasks collection.";
	}

	if (errorCode === "failed-precondition") {
		return "This query requires a Firestore index. Create the suggested index in the Firebase console, then reload.";
	}

	if (errorCode === "unauthenticated") {
		return "You are not authenticated. Please sign in again.";
	}

	if (errorCode === "unavailable") {
		return "Firestore is unavailable (network issue). Check your connection and retry.";
	}

	const baseMessage = error instanceof Error ? error.message : fallbackMessage;
	return errorCode ? `${baseMessage} (${errorCode})` : baseMessage;
};

const countByStatus = (tasks) =>
	tasks.reduce(
		(counts, task) => {
			const nextCounts = { ...counts };
			nextCounts[task.status] = (nextCounts[task.status] ?? 0) + 1;
			return nextCounts;
		},
		{ Planned: 0, "In Progress": 0, Complete: 0 }
	);

export default function TaskBoard({ user }) {
	const [tasks, setTasks] = useState([]);
	const [isTasksLoading, setIsTasksLoading] = useState(true);
	const [tasksErrorMessage, setTasksErrorMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [filter, setFilter] = useState("All");
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState("newest");

	useEffect(() => {
		setTasksErrorMessage("");
		let hasReceivedSnapshot = false;

		const unsubscribe = getUserTasks(
			user.uid,
			(nextTasks) => {
				setTasks(nextTasks);
				if (!hasReceivedSnapshot) {
					hasReceivedSnapshot = true;
					setIsTasksLoading(false);
				}
			},
			(error) => {
				setTasksErrorMessage(
					formatFirebaseErrorMessage(
						error,
						"Failed to load tasks from Firestore."
					)
				);
				if (!hasReceivedSnapshot) {
					hasReceivedSnapshot = true;
					setIsTasksLoading(false);
				}
			}
		);

		return unsubscribe;
	}, [user.uid]);

	const statusCounts = useMemo(() => countByStatus(tasks), [tasks]);
	const totalTasks = tasks.length;
	const activeTasks = totalTasks - statusCounts.Complete;
	const completePercent = useMemo(() => {
		if (!totalTasks) return 0;
		return Math.round((statusCounts.Complete / totalTasks) * 100) || 0;
	}, [statusCounts.Complete, totalTasks]);

	const summaryText =
		`${statusCounts.Planned} Planned` +
		` · ${statusCounts["In Progress"]} In Progress` +
		` · ${statusCounts.Complete} Complete`;

	const visibleTasks = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		let nextTasks = tasks.map((task) => ({
			...task,
			priority: normalizePriority(task.priority),
		}));

		if (filter !== "All") {
			nextTasks = nextTasks.filter((task) => task.status === filter);
		}

		if (normalizedSearch) {
			nextTasks = nextTasks.filter((task) => {
				const title = typeof task.title === "string" ? task.title : "";
				return title.toLowerCase().includes(normalizedSearch);
			});
		}

		const sorted = [...nextTasks].sort((a, b) => {
			if (sort === "az") {
				return (a.title ?? "").localeCompare(b.title ?? "");
			}

			if (sort === "priority") {
				const rankA = PRIORITY_RANK[normalizePriority(a.priority)] ?? 999;
				const rankB = PRIORITY_RANK[normalizePriority(b.priority)] ?? 999;
				if (rankA !== rankB) return rankA - rankB;
				return getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt);
			}

			const diff = getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt);
			return sort === "newest" ? diff : -diff;
		});

		return sorted;
	}, [filter, search, sort, tasks]);

	const chartData = useMemo(
		() => [
			{
				name: "Planned",
				value: statusCounts.Planned,
				color: "var(--status-planned)",
			},
			{
				name: "In Progress",
				value: statusCounts["In Progress"],
				color: "var(--status-in-progress)",
			},
			{
				name: "Complete",
				value: statusCounts.Complete,
				color: "var(--status-complete)",
			},
		],
		[statusCounts]
	);

	const handleSignOut = async () => {
		try {
			setErrorMessage("");
			await signOut(auth);
		} catch (error) {
			setErrorMessage(
				formatFirebaseErrorMessage(error, "Failed to sign out. Please try again.")
			);
		}
	};

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					{user.photoURL ? (
						<img
							src={user.photoURL}
							alt={user.displayName ?? "User"}
							className="h-10 w-10 rounded-full border border-gray-200"
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="h-10 w-10 rounded-full bg-gray-200" aria-hidden="true" />
					)}

					<div className="min-w-0">
						<div className="text-lg font-bold truncate">Task Manager</div>
						<div className="text-sm text-gray-600 truncate">
							{user.displayName ?? "Signed in"}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<a
						href="/api-doc"
						className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
					>
						📄 API Docs
					</a>

					<button
						type="button"
						onClick={handleSignOut}
						className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
					>
						Sign out
					</button>
				</div>
			</header>

			{errorMessage ? (
				<div
					className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{errorMessage}
				</div>
			) : null}

			{tasksErrorMessage ? (
				<div
					className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{tasksErrorMessage}
				</div>
			) : null}


			<div className="mt-6 space-y-4">
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<div className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="text-xs font-semibold text-gray-500">📋 Total</div>
							<div className="mt-1 text-2xl font-bold text-gray-900">{totalTasks}</div>
							<div className="text-xs text-gray-600">tasks</div>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="text-xs font-semibold text-gray-500">🔥 Active</div>
							<div className="mt-1 text-2xl font-bold text-gray-900">{activeTasks}</div>
							<div className="text-xs text-gray-600">planned / in progress</div>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="text-xs font-semibold text-gray-500">✅ Done</div>
							<div className="mt-1 text-2xl font-bold text-gray-900">
								{statusCounts.Complete}
							</div>
							<div className="text-xs text-gray-600">complete</div>
						</div>
					</div>

					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<div className="flex items-center justify-between text-sm text-gray-700">
								<div className="font-semibold">Progress</div>
								<div className="text-gray-600">
									{statusCounts.Complete} of {totalTasks} Complete ({completePercent}%)
								</div>
							</div>
							<div className="mt-2 w-full rounded-full bg-gray-200 h-2">
								<div
									className="h-2 rounded-full bg-green-500 transition-all duration-500"
									style={{ width: `${completePercent}%` }}
								/>
							</div>
							<div className="mt-3 text-sm text-gray-600">{summaryText}</div>
						</div>

						<div className="flex items-center justify-center">
							{totalTasks ? (
								<PieChart width={200} height={200}>
									<Pie
										data={chartData}
										dataKey="value"
										innerRadius={60}
										outerRadius={80}
										paddingAngle={2}
									>
										{chartData.map((entry) => (
											<Cell key={entry.name} fill={entry.color} />
										))}
									</Pie>
								</PieChart>
							) : null}
						</div>
					</div>
				</div>

				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<AddTask userId={user.uid} />

					<div className="mt-4 flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							{STATUS_FILTERS.map((status) => {
								const isActive = filter === status;
								return (
									<button
										key={status}
										type="button"
										onClick={() => setFilter(status)}
										className={
											"rounded-lg border px-3 py-2 text-sm font-semibold " +
											(isActive
												? "border-gray-900 bg-gray-900 text-white"
												: "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")
										}
										aria-pressed={isActive}
									>
										{status}
									</button>
								);
							})}
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<input
								type="text"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="🔍 Search tasks…"
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
								aria-label="Search tasks"
							/>

							<select
								value={sort}
								onChange={(event) => setSort(event.target.value)}
								className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-gray-900"
								aria-label="Sort tasks"
							>
								{SORT_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										Sort by: {option.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			<section className="mt-6 space-y-3">
				{isTasksLoading ? (
					<div className="rounded-xl border border-gray-200 bg-white p-6">
						<div className="flex items-center gap-3 text-sm text-gray-700">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
							Loading tasks…
						</div>
					</div>
				) : null}

				{!isTasksLoading && tasks.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
						No tasks yet. Create your first task above.
					</div>
				) : null}

				{!isTasksLoading && tasks.length > 0 && visibleTasks.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
						No tasks match your current filter/search.
					</div>
				) : null}

				{!isTasksLoading
					? visibleTasks.map((task) => <TaskCard key={task.id} task={task} />)
					: null}
			</section>
		</div>
	);
}

