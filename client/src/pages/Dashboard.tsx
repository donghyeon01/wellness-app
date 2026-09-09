import { Link } from "react-router-dom";
import { useTodos } from "@/api/todos";
import { useEvents } from "@/api/events";
import { usePomodoroStats } from "@/api/pomodoro";
import { useDiaries } from "@/api/diary";
import {
  CheckCircle,
  Circle,
  Calendar,
  Clock,
  BookOpen,
  NotebookPen,
  Timer,
} from "lucide-react";

function formatDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function formatMonth(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export default function Dashboard() {
  const today = formatDate();
  const month = formatMonth();

  const { data: todos = [] } = useTodos({
    completed: "active",
    priority: "all",
  });
  const { data: events = [] } = useEvents({
    start: today,
    end: today,
  });
  const { data: pomodoroStats } = usePomodoroStats("day", new Date());
  const { data: diaries = [] } = useDiaries(month);

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);
  const todayDiary = diaries.find((d) => d.date === today);

  const cards = [
    {
      to: "/todos",
      icon: CheckCircle,
      title: "TODO",
      value: `${activeTodos.length}개 남음`,
      sub: `${completedTodos.length}개 완료`,
      color: "text-blue-500",
    },
    {
      to: "/calendar",
      icon: Calendar,
      title: "오늘 일정",
      value: `${events.length}개`,
      sub: events[0]?.title ?? "일정 없음",
      color: "text-green-500",
    },
    {
      to: "/pomodoro",
      icon: Timer,
      title: "뽀모도로",
      value: `${pomodoroStats?.count ?? 0}세션`,
      sub: `${Math.round((pomodoroStats?.totalSeconds ?? 0) / 60)}분 집중`,
      color: "text-orange-500",
    },
    {
      to: "/diary",
      icon: BookOpen,
      title: "오늘 일기",
      value: todayDiary ? "작성됨" : "미작성",
      sub: todayDiary?.mood ?? "—",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
              <div className="flex items-center gap-3">
                <Icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-lg font-bold text-card-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.sub}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-bold text-card-foreground">
          오늘의 TODO
        </h2>
        {activeTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">남은 TODO가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {activeTodos.slice(0, 5).map((todo) => (
              <li key={todo.id} className="flex items-center gap-2 text-sm">
                <Circle
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-foreground">{todo.title}</span>
                {todo.priority > 0 && (
                  <span className="ml-auto rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    우선순위 {todo.priority}
                  </span>
                )}
              </li>
            ))}
            {activeTodos.length > 5 && (
              <li className="text-xs text-muted-foreground">
                외 {activeTodos.length - 5}개 —{" "}
                <Link to="/todos" className="underline">
                  전체 보기
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/memos"
          className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
          <div className="flex items-center gap-3">
            <NotebookPen className="h-6 w-6 text-cyan-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">메모</p>
              <p className="text-lg font-bold text-card-foreground">바로가기</p>
            </div>
          </div>
        </Link>
        <Link
          to="/pomodoro"
          className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-rose-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                뽀모도로 타이머
              </p>
              <p className="text-lg font-bold text-card-foreground">시작하기</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
